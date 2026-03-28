/**
 * 统一 AKShare 数据服务
 * 替换所有旧的数据服务，提供统一的 AKShare 数据访问接口
 */

import type { Fund, StockData } from '../types'

// AKShare API 基础URL
const AKSHARE_BASE_URL = 'http://localhost:3002'

// 数据缓存
const cache = {
  funds: new Map<string, { data: Fund[], timestamp: number }>(),
  stocks: new Map<string, { data: StockData[], timestamp: number }>(),
  fundDetails: new Map<string, { data: any, timestamp: number }>(),
  fundSearch: new Map<string, { data: any[], timestamp: number }>()
}

// 缓存配置
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

/**
 * 调用 AKShare 桥接服务
 */
async function callAkshareBridge(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  try {
    const url = new URL(`${AKSHARE_BASE_URL}/${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        url.searchParams.set(key, JSON.stringify(value))
      } else if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15秒超时
    })

    if (!response.ok) {
      throw new Error(`AKShare服务错误: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`AKShare服务返回错误: ${data.error || '未知错误'}`)
    }

    return data.data
  } catch (error) {
    console.error(`调用AKShare桥接服务失败 (${endpoint}):`, error)
    throw error
  }
}

/**
 * 获取基金实时净值数据
 */
export async function fetchFundData(fundCodes?: string[]): Promise<Fund[]> {
  const cacheKey = fundCodes ? fundCodes.join(',') : 'default'
  const now = Date.now()
  
  // 检查缓存
  const cached = cache.funds.get(cacheKey)
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`使用缓存的基金数据 (${cached.data.length} 只基金)`)
    return cached.data
  }

  try {
    console.log('通过AKShare获取基金数据...')
    
    // 如果没有指定基金代码，使用默认列表
    const codesToFetch = fundCodes || [
      '005827', '161725', '003095', '110022', '519674',
      '260108', '000404', '001714', '000248', '001475'
    ]

    const fundData = await callAkshareBridge('funds', { codes: codesToFetch })
    
    // 转换数据格式
    const funds: Fund[] = fundData.map((item: any, index: number) => ({
      id: `fund_${item.code}_${index}`,
      name: item.name,
      code: item.code,
      currentPrice: item.latest_price || item.current_price || 0,
      changePercent: item.change_percent || 0,
      changeAmount: item.change || 0,
      volume: item.volume || 0,
      timestamp: item.timestamp || new Date().toISOString(),
      estimatedValue: item.estimated_value,
      estimatedChangePercent: item.estimated_change_percent,
      dataSources: ['akshare']
    }))

    // 更新缓存
    cache.funds.set(cacheKey, { data: funds, timestamp: now })
    
    console.log(`成功获取 ${funds.length} 只基金数据`)
    return funds
    
  } catch (error) {
    console.error('获取基金数据失败:', error)
    
    // 如果缓存中有数据，返回缓存数据
    const cached = cache.funds.get(cacheKey)
    if (cached) {
      console.warn('使用缓存的基金数据（降级模式）')
      return cached.data
    }
    
    // 返回空数组
    return []
  }
}

/**
 * 获取股票实时行情数据
 */
export async function fetchStockData(stockCodes?: string[]): Promise<StockData[]> {
  const cacheKey = stockCodes ? stockCodes.join(',') : 'default'
  const now = Date.now()
  
  // 检查缓存
  const cached = cache.stocks.get(cacheKey)
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`使用缓存的股票数据 (${cached.data.length} 只股票)`)
    return cached.data
  }

  try {
    console.log('通过AKShare获取股票数据...')
    
    // 如果没有指定股票代码，使用默认列表
    const codesToFetch = stockCodes || [
      '600519', '000858', '000333', '000001', '600036',
      '000002', '601318', '600276', '600887', '000651'
    ]

    const stockData = await callAkshareBridge('stocks', { codes: codesToFetch })
    
    // 转换数据格式
    const stocks: StockData[] = stockData.map((item: any, index: number) => ({
      id: `stock_${item.code}_${index}`,
      symbol: item.code,
      name: item.name,
      price: item.latest_price || item.price || 0,
      change: item.change || 0,
      changePercent: item.change_percent || 0,
      volume: item.volume || 0,
      timestamp: item.timestamp || new Date().toISOString(),
      history: generateHourlyHistory(item.latest_price || item.price || 0)
    }))

    // 更新缓存
    cache.stocks.set(cacheKey, { data: stocks, timestamp: now })
    
    console.log(`成功获取 ${stocks.length} 只股票数据`)
    return stocks
    
  } catch (error) {
    console.error('获取股票数据失败:', error)
    
    // 如果缓存中有数据，返回缓存数据
    const cached = cache.stocks.get(cacheKey)
    if (cached) {
      console.warn('使用缓存的股票数据（降级模式）')
      return cached.data
    }
    
    // 返回空数组
    return []
  }
}

/**
 * 获取基金详细信息
 */
export async function getFundDetail(fundCode: string): Promise<any> {
  const cacheKey = fundCode
  const now = Date.now()
  
  // 检查缓存
  const cached = cache.fundDetails.get(cacheKey)
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`使用缓存的基金详情数据: ${fundCode}`)
    return cached.data
  }

  try {
    console.log(`通过AKShare获取基金详情: ${fundCode}`)
    
    const detailData = await callAkshareBridge('fund-detail', { code: fundCode })
    
    // 更新缓存
    cache.fundDetails.set(cacheKey, { data: detailData, timestamp: now })
    
    return detailData
    
  } catch (error) {
    console.error(`获取基金详情失败 (${fundCode}):`, error)
    
    // 如果缓存中有数据，返回缓存数据
    const cached = cache.fundDetails.get(cacheKey)
    if (cached) {
      console.warn(`使用缓存的基金详情数据（降级模式）: ${fundCode}`)
      return cached.data
    }
    
    // 返回空对象
    return {}
  }
}

/**
 * 搜索基金
 */
export async function searchFunds(keyword: string): Promise<any[]> {
  const cacheKey = keyword.toLowerCase()
  const now = Date.now()
  
  // 检查缓存
  const cached = cache.fundSearch.get(cacheKey)
  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`使用缓存的基金搜索结果: ${keyword}`)
    return cached.data
  }

  try {
    console.log(`通过AKShare搜索基金: ${keyword}`)
    
    const searchResults = await callAkshareBridge('search-funds', { keyword })
    
    // 更新缓存
    cache.fundSearch.set(cacheKey, { data: searchResults, timestamp: now })
    
    return searchResults
    
  } catch (error) {
    console.error('搜索基金失败:', error)
    
    // 如果缓存中有数据，返回缓存数据
    const cached = cache.fundSearch.get(cacheKey)
    if (cached) {
      console.warn(`使用缓存的基金搜索结果（降级模式）: ${keyword}`)
      return cached.data
    }
    
    return []
  }
}

/**
 * 获取基金持仓信息
 */
export async function getFundHoldings(fundCode: string): Promise<any[]> {
  try {
    console.log(`通过AKShare获取基金持仓: ${fundCode}`)
    
    const detailData = await getFundDetail(fundCode)
    
    // 从详情数据中提取持仓信息
    const positions = detailData.positions || []
    
    return positions.map((position: any) => ({
      stockCode: position.stock_code || position.code || '',
      stockName: position.stock_name || position.name || '',
      holdingAmount: position.holding_amount || position.amount || 0,
      holdingValue: position.holding_value || position.value || 0,
      proportion: position.proportion || position.weight || 0
    }))
    
  } catch (error) {
    console.error(`获取基金持仓失败 (${fundCode}):`, error)
    return []
  }
}

/**
 * 获取股票价格
 */
export async function getStockPrice(stockCode: string): Promise<number | null> {
  try {
    console.log(`通过AKShare获取股票价格: ${stockCode}`)
    
    const stockData = await fetchStockData([stockCode])
    
    if (stockData.length > 0) {
      return stockData[0].price
    }
    
    return null
    
  } catch (error) {
    console.error(`获取股票价格失败 (${stockCode}):`, error)
    return null
  }
}

/**
 * 批量获取股票价格
 */
export async function getStockPrices(stockCodes: string[]): Promise<Record<string, number>> {
  try {
    console.log(`通过AKShare批量获取股票价格: ${stockCodes.length} 只股票`)
    
    const stockData = await fetchStockData(stockCodes)
    
    const prices: Record<string, number> = {}
    stockData.forEach(stock => {
      prices[stock.symbol] = stock.price
    })
    
    return prices
    
  } catch (error) {
    console.error('批量获取股票价格失败:', error)
    return {}
  }
}

/**
 * 获取数据源状态
 */
export function getDataSourceStatus() {
  const now = new Date()
  
  return {
    provider: 'akshare',
    status: 'active',
    baseUrl: AKSHARE_BASE_URL,
    cache: {
      funds: cache.funds.size,
      stocks: cache.stocks.size,
      details: cache.fundDetails.size,
      search: cache.fundSearch.size
    },
    lastUpdate: now.toISOString(),
    nextUpdate: new Date(now.getTime() + CACHE_TTL).toISOString(),
    features: [
      '基金实时净值',
      '股票实时行情',
      '基金详情信息',
      '基金持仓数据',
      '基金搜索功能',
      '数据缓存'
    ]
  }
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  cache.funds.clear()
  cache.stocks.clear()
  cache.fundDetails.clear()
  cache.fundSearch.clear()
  console.log('AKShare数据缓存已清除')
}

/**
 * 初始化数据服务
 */
export function initDataService(): void {
  console.log('初始化统一AKShare数据服务')
  console.log('服务特点:')
  console.log('- 使用AKShare作为唯一数据源')
  console.log('- 统一的API接口')
  console.log('- 5分钟数据缓存')
  console.log('- 支持所有数据需求')
}

/**
 * 获取市场状态
 */
export function getMarketStatus() {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  
  // A股交易时间：周一至周五 9:30-11:30, 13:00-15:00
  const isTradingHours = !isWeekend && (
    (hour === 9 && minute >= 30) ||
    (hour >= 10 && hour < 11) ||
    (hour === 11 && minute < 30) ||
    (hour >= 13 && hour < 15)
  )
  
  return {
    isOpen: isTradingHours,
    openTime: '09:30',
    closeTime: '15:00',
    nextOpenTime: isWeekend ? '下周一 09:30' : '明日 09:30',
    currentTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
}

/**
 * 获取更新信息
 */
export function getUpdateInfo() {
  const now = new Date()
  const nextUpdate = new Date(now.getTime() + CACHE_TTL)
  
  return {
    lastUpdate: now.toISOString(),
    nextUpdate: nextUpdate.toISOString(),
    updateInterval: '5分钟',
    cacheStatus: {
      funds: cache.funds.size,
      stocks: cache.stocks.size,
      details: cache.fundDetails.size,
      search: cache.fundSearch.size
    }
  }
}

/**
 * 检查服务状态
 */
export async function checkServiceStatus(): Promise<{
  available: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const url = `${AKSHARE_BASE_URL}/status`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })
    
    if (!response.ok) {
      return {
        available: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    const data = await response.json()
    
    return {
      available: data.success === true,
      status: data.data?.status || 'unknown'
    }
    
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 生成小时历史数据（模拟）
 */
function generateHourlyHistory(basePrice: number) {
  const history = []
  let currentPrice = basePrice
  
  for (let i = 0; i < 24; i++) {
    const hourFactor = i < 9 || i > 15 ? 0.1 : 0.3
    const change = (Math.random() - 0.5) * hourFactor
    currentPrice = currentPrice * (1 + change / 100)
    
    history.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      price: parseFloat(currentPrice.toFixed(2))
    })
  }
  
  return history
}

// 导出所有函数
export {
  fetchFundData,
  fetchStockData,
  getFundDetail,
  searchFunds,
  getFundHoldings,
  getStockPrice,
  getStockPrices,
  getDataSourceStatus,
  clearCache,
  initDataService,
  getMarketStatus,
  getUpdateInfo,
  checkServiceStatus
}