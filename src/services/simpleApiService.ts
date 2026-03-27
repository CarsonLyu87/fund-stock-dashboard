/**
 * 简化API服务
 * 使用Vercel代理解决CORS问题
 */

import { proxyRequest, getFundNetValue, getFundEstimate, getStockPrice, getMultipleFundsData } from './vercelProxyService'

// 缓存配置
const CACHE_CONFIG = {
  fundNetValue: 5 * 60 * 1000, // 5分钟
  fundEstimate: 30 * 1000,     // 30秒
  stockPrice: 30 * 1000        // 30秒
}

// 内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()

/**
 * 从缓存获取数据
 */
function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG[key.split(':')[0] as keyof typeof CACHE_CONFIG]) {
    return cached.data as T
  }
  return null
}

/**
 * 设置缓存数据
 */
function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  cache.clear()
  console.log('🧹 缓存已清除')
}

/**
 * 获取基金净值数据（带缓存）
 */
export async function fetchFundNetValue(code: string): Promise<any> {
  const cacheKey = `fundNetValue:${code}`
  
  // 检查缓存
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log(`📦 从缓存获取基金 ${code} 净值`)
    return cached
  }
  
  // 获取新数据
  console.log(`📡 获取基金 ${code} 净值数据`)
  const result = await getFundNetValue(code)
  
  if (result.success) {
    setCache(cacheKey, result)
  }
  
  return result
}

/**
 * 获取基金实时估值（带缓存）
 */
export async function fetchFundEstimate(code: string): Promise<any> {
  const cacheKey = `fundEstimate:${code}`
  
  // 检查缓存
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log(`📦 从缓存获取基金 ${code} 估值`)
    return cached
  }
  
  // 获取新数据
  console.log(`📡 获取基金 ${code} 实时估值`)
  const result = await getFundEstimate(code)
  
  if (result.success) {
    setCache(cacheKey, result)
  }
  
  return result
}

/**
 * 获取股票价格（带缓存）
 */
export async function fetchStockPrice(symbol: string): Promise<any> {
  const cacheKey = `stockPrice:${symbol}`
  
  // 检查缓存
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log(`📦 从缓存获取股票 ${symbol} 价格`)
    return cached
  }
  
  // 获取新数据
  console.log(`📡 获取股票 ${symbol} 实时价格`)
  const result = await getStockPrice(symbol)
  
  if (result.success) {
    setCache(cacheKey, result)
  }
  
  return result
}

/**
 * 获取基金完整数据
 */
export async function fetchFundData(code: string): Promise<any> {
  try {
    const [netValueResult, estimateResult] = await Promise.allSettled([
      fetchFundNetValue(code),
      fetchFundEstimate(code)
    ])
    
    const netValue = netValueResult.status === 'fulfilled' ? netValueResult.value : null
    const estimate = estimateResult.status === 'fulfilled' ? estimateResult.value : null
    
    return {
      code,
      netValue,
      estimate,
      hasData: !!(netValue?.success || estimate?.success),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error(`获取基金 ${code} 数据失败:`, error)
    return {
      code,
      netValue: null,
      estimate: null,
      hasData: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 批量获取基金数据
 */
export async function fetchMultipleFundsData(codes: string[]): Promise<any[]> {
  console.log(`📊 批量获取 ${codes.length} 只基金数据`)
  
  const results = await Promise.allSettled(
    codes.map(code => fetchFundData(code))
  )
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        code: codes[index],
        netValue: null,
        estimate: null,
        hasData: false,
        error: result.reason?.message || '未知错误',
        timestamp: new Date().toISOString()
      }
    }
  })
}

/**
 * 获取股票列表数据
 */
export async function fetchStocksData(symbols: string[]): Promise<any[]> {
  console.log(`📈 批量获取 ${symbols.length} 只股票数据`)
  
  const results = await Promise.allSettled(
    symbols.map(symbol => fetchStockPrice(symbol))
  )
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        symbol: symbols[index],
        ...result.value
      }
    } else {
      return {
        symbol: symbols[index],
        success: false,
        error: result.reason?.message || '未知错误',
        data: null,
        timestamp: new Date().toISOString()
      }
    }
  })
}

/**
 * 获取市场状态
 */
export function getMarketStatus(): {
  isOpen: boolean
  openTime: string
  closeTime: string
  nextOpenTime: string
} {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  
  // A股交易时间：周一至周五 9:30-11:30, 13:00-15:00
  const isTradingHours = !isWeekend && (
    (hour === 9 && minute >= 30) ||
    (hour === 10) ||
    (hour === 11 && minute < 30) ||
    (hour === 13 || hour === 14) ||
    (hour === 15 && minute === 0)
  )
  
  return {
    isOpen: isTradingHours,
    openTime: '09:30',
    closeTime: '15:00',
    nextOpenTime: isWeekend ? '下周一 09:30' : '明日 09:30'
  }
}

/**
 * 获取服务状态
 */
export async function getServiceStatus(): Promise<{
  timestamp: string
  marketStatus: ReturnType<typeof getMarketStatus>
  cacheSize: number
  cacheKeys: string[]
  proxyStatus: 'unknown' | 'testing' | 'available' | 'unavailable'
}> {
  const cacheKeys = Array.from(cache.keys())
  
  return {
    timestamp: new Date().toISOString(),
    marketStatus: getMarketStatus(),
    cacheSize: cache.size,
    cacheKeys: cacheKeys.slice(0, 10), // 只显示前10个
    proxyStatus: 'unknown' // 实际应该测试代理状态
  }
}

/**
 * 初始化数据服务
 */
export async function initDataService(): Promise<void> {
  console.log('🚀 初始化数据服务')
  
  // 预热缓存
  const defaultFunds = ['003095', '110022', '161725']
  const defaultStocks = ['sh000001', 'sz399001'] // 上证指数、深证成指
  
  try {
    await Promise.allSettled([
      fetchMultipleFundsData(defaultFunds),
      fetchStocksData(defaultStocks)
    ])
    
    console.log('✅ 数据服务初始化完成')
  } catch (error) {
    console.warn('数据服务初始化警告:', error)
  }
}

// 导出主要函数
export {
  proxyRequest,
  getFundNetValue,
  getFundEstimate,
  getStockPrice,
  getMultipleFundsData
}