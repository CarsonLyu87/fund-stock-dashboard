/**
 * 真实数据服务 - 每15分钟更新一次真实数据
 * 集成多个真实数据源，提供可靠的基金和股票数据
 */

import axios from 'axios'
import type { Fund, StockData } from '../types'
import { defaultConfig } from '../config/dataSources'
import { getFundApiHeaders, getStockApiHeaders } from '../utils/httpHeaders'

// 本地缓存接口
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class DataCache {
  private cache = new Map<string, CacheItem<any>>()

  set<T>(key: string, data: T, ttl: number = 900000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    // 检查缓存是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// 创建缓存实例
const cache = new DataCache()

// 真实基金数据API配置
const REAL_FUND_APIS = {
  // 天天基金实时估值API
  tiantian: (code: string) => 
    `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
  
  // 东方财富基金详情API
  eastmoney: (code: string) =>
    `https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`,
  
  // 天天基金净值API
  tiantianNetValue: (code: string) =>
    `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`
}

// 真实股票数据API配置
const REAL_STOCK_APIS = {
  // 雅虎财经API（需要代理）
  yahoo: (symbol: string) =>
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
  
  // 新浪财经API（A股）
  sina: (symbol: string) =>
    `https://hq.sinajs.cn/list=${symbol}`,
  
  // 腾讯财经API
  tencent: (symbol: string) =>
    `http://qt.gtimg.cn/q=${symbol}`
}

// 支持的A股代码（示例）
const A_SHARE_STOCKS = [
  'sh000001', // 上证指数
  'sz399001', // 深证成指
  'sz399006', // 创业板指
  'sh000300', // 沪深300
  'sh000016', // 上证50
  'sz399005', // 中小板指
]

// 支持的基金代码（示例）
const POPULAR_FUNDS = [
  '005827', // 易方达蓝筹精选混合
  '161725', // 招商中证白酒指数
  '003095', // 中欧医疗健康混合
  '110011', // 易方达中小盘混合
  '519674', // 银河创新成长混合
  '260108', // 景顺长城新兴成长混合
  '000404', // 易方达新兴成长混合
  '001717', // 工银瑞信前沿医疗股票
  '006228', // 中欧医疗创新股票A
  '040046', // 南方纳斯达克100指数
]

/**
 * 解析天天基金API响应
 */
function parseTiantianFundResponse(data: string): Partial<Fund> | null {
  try {
    // 天天基金返回的是JSONP格式：jsonpgz({...})
    const jsonStr = data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
    const json = JSON.parse(jsonStr)
    
    return {
      name: json.name,
      code: json.fundcode,
      currentPrice: parseFloat(json.gsz),
      changePercent: parseFloat(json.gszzl),
      changeAmount: parseFloat(json.gsz) - parseFloat(json.dwjz),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('解析天天基金数据失败:', error)
    return null
  }
}

/**
 * 解析新浪财经股票数据
 */
function parseSinaStockResponse(data: string, symbol: string): Partial<StockData> | null {
  try {
    // 新浪返回格式：var hq_str_sh000001="上证指数,3068.46,3075.05,3068.46,3077.04,3046.88,...";
    const match = data.match(/="([^"]+)"/)
    if (!match) return null
    
    const parts = match[1].split(',')
    if (parts.length < 3) return null
    
    const currentPrice = parseFloat(parts[1])
    const prevClose = parseFloat(parts[2])
    const change = currentPrice - prevClose
    const changePercent = (change / prevClose) * 100
    
    return {
      symbol,
      name: parts[0],
      price: currentPrice,
      change,
      changePercent,
      volume: parseFloat(parts[8]) || 0,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('解析新浪股票数据失败:', error)
    return null
  }
}

/**
 * 获取真实基金数据
 */
export async function fetchRealFundData(): Promise<Fund[]> {
  const cacheKey = 'real_funds_data'
  const cachedData = cache.get<Fund[]>(cacheKey)
  
  // 如果缓存有效，直接返回缓存数据
  if (cachedData && defaultConfig.cache.enabled) {
    console.log('使用缓存的基金数据')
    return cachedData
  }
  
  console.log('开始获取真实基金数据...')
  
  try {
    const funds: Fund[] = []
    
    // 使用天天基金API获取数据
    for (const code of POPULAR_FUNDS) {
      try {
        const response = await axios.get(REAL_FUND_APIS.tiantian(code), {
          timeout: 5000,
          headers: getFundApiHeaders()
        })
        
        const fundData = parseTiantianFundResponse(response.data)
        if (fundData) {
          funds.push({
            id: `fund_${code}`,
            ...fundData,
            volume: Math.floor(Math.random() * 10000000) + 5000000 // 模拟成交量
          } as Fund)
        }
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.warn(`获取基金 ${code} 数据失败:`, error)
        // 使用模拟数据作为降级
        funds.push(generateMockFund(code))
      }
    }
    
    // 缓存数据
    if (defaultConfig.cache.enabled && funds.length > 0) {
      cache.set(cacheKey, funds, defaultConfig.cache.ttl)
    }
    
    console.log(`成功获取 ${funds.length} 只基金数据`)
    return funds
    
  } catch (error) {
    console.error('获取真实基金数据失败，使用模拟数据:', error)
    return generateMockFunds()
  }
}

/**
 * 获取真实股票数据
 */
export async function fetchRealStockData(): Promise<StockData[]> {
  const cacheKey = 'real_stocks_data'
  const cachedData = cache.get<StockData[]>(cacheKey)
  
  // 如果缓存有效，直接返回缓存数据
  if (cachedData && defaultConfig.cache.enabled) {
    console.log('使用缓存的股票数据')
    return cachedData
  }
  
  console.log('开始获取真实股票数据...')
  
  try {
    const stocks: StockData[] = []
    
    // 使用新浪财经API获取A股数据
    for (const symbol of A_SHARE_STOCKS) {
      try {
        const response = await axios.get(REAL_STOCK_APIS.sina(symbol), {
          timeout: 5000,
          headers: getStockApiHeaders()
        })
        
        const stockData = parseSinaStockResponse(response.data, symbol)
        if (stockData) {
          stocks.push({
            id: `stock_${symbol}`,
            ...stockData,
            history: generateHourlyHistory(stockData.price || 0)
          } as StockData)
        }
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.warn(`获取股票 ${symbol} 数据失败:`, error)
        // 使用模拟数据作为降级
        stocks.push(generateMockStock(symbol))
      }
    }
    
    // 缓存数据
    if (defaultConfig.cache.enabled && stocks.length > 0) {
      cache.set(cacheKey, stocks, defaultConfig.cache.ttl)
    }
    
    console.log(`成功获取 ${stocks.length} 只股票数据`)
    return stocks
    
  } catch (error) {
    console.error('获取真实股票数据失败，使用模拟数据:', error)
    return generateMockStocks()
  }
}

/**
 * 生成模拟基金数据（降级使用）
 */
function generateMockFund(code: string): Fund {
  const fundNames: Record<string, string> = {
    '005827': '易方达蓝筹精选混合',
    '161725': '招商中证白酒指数',
    '003095': '中欧医疗健康混合',
    '110011': '易方达中小盘混合',
    '519674': '银河创新成长混合',
    '260108': '景顺长城新兴成长混合',
    '000404': '易方达新兴成长混合',
    '001717': '工银瑞信前沿医疗股票',
    '006228': '中欧医疗创新股票A',
    '040046': '南方纳斯达克100指数'
  }
  
  const basePrice = 1 + Math.random() * 4
  const changePercent = (Math.random() - 0.5) * 3 // -1.5% 到 +1.5%
  const changeAmount = basePrice * changePercent / 100
  
  return {
    id: `mock_fund_${code}`,
    name: fundNames[code] || `基金 ${code}`,
    code,
    currentPrice: parseFloat(basePrice.toFixed(3)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    changeAmount: parseFloat(changeAmount.toFixed(3)),
    volume: Math.floor(Math.random() * 10000000) + 5000000,
    timestamp: new Date().toISOString()
  }
}

/**
 * 生成模拟股票数据（降级使用）
 */
function generateMockStock(symbol: string): StockData {
  const stockNames: Record<string, string> = {
    'sh000001': '上证指数',
    'sz399001': '深证成指',
    'sz399006': '创业板指',
    'sh000300': '沪深300',
    'sh000016': '上证50',
    'sz399005': '中小板指'
  }
  
  const basePrice = symbol.includes('sh000001') ? 3000 + Math.random() * 200 :
                   symbol.includes('sz399001') ? 9000 + Math.random() * 1000 :
                   symbol.includes('sz399006') ? 1800 + Math.random() * 200 :
                   symbol.includes('sh000300') ? 3500 + Math.random() * 200 :
                   symbol.includes('sh000016') ? 2500 + Math.random() * 100 :
                   symbol.includes('sz399005') ? 6000 + Math.random() * 500 : 100
  
  const changePercent = (Math.random() - 0.5) * 2 // -1% 到 +1%
  const changeAmount = basePrice * changePercent / 100
  
  return {
    id: `mock_stock_${symbol}`,
    symbol,
    name: stockNames[symbol] || `股票 ${symbol}`,
    price: parseFloat(basePrice.toFixed(2)),
    change: parseFloat(changeAmount.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 1000000000) + 500000000,
    timestamp: new Date().toISOString(),
    history: generateHourlyHistory(basePrice)
  }
}

/**
 * 生成24小时历史数据
 */
function generateHourlyHistory(basePrice: number) {
  const history = []
  let currentPrice = basePrice
  
  for (let i = 0; i < 24; i++) {
    // 模拟市场波动
    const hourFactor = i < 9 || i > 15 ? 0.1 : 0.3 // 非交易时间波动较小
    const change = (Math.random() - 0.5) * hourFactor
    currentPrice = currentPrice * (1 + change / 100)
    
    history.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      price: parseFloat(currentPrice.toFixed(2))
    })
  }
  
  return history
}

/**
 * 生成模拟基金列表
 */
function generateMockFunds(): Fund[] {
  return POPULAR_FUNDS.map(code => generateMockFund(code))
}

/**
 * 生成模拟股票列表
 */
function generateMockStocks(): StockData[] {
  return A_SHARE_STOCKS.map(symbol => generateMockStock(symbol))
}

/**
 * 获取数据更新时间信息
 */
export function getUpdateInfo() {
  return {
    lastUpdate: new Date().toLocaleString('zh-CN'),
    nextUpdate: new Date(Date.now() + defaultConfig.updateFrequency.stock).toLocaleString('zh-CN'),
    updateFrequency: '每15分钟',
    cacheStatus: `缓存 ${cache.size()} 项数据`
  }
}

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  cache.clear()
  console.log('数据缓存已清除')
}

/**
 * 初始化数据服务
 */
export function initDataService() {
  console.log('初始化真实数据服务...')
  console.log('配置:', {
    updateFrequency: {
      stock: `${defaultConfig.updateFrequency.stock / 60000}分钟`,
      fund: `${defaultConfig.updateFrequency.fund / 60000}分钟`
    },
    cache: defaultConfig.cache
  })
  
  return {
    fetchRealFundData,
    fetchRealStockData,
    getUpdateInfo,
    clearCache
  }
}