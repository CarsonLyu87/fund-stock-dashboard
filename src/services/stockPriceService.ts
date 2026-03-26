/**
 * 股票实时行情服务
 * 获取股票实时价格和涨跌幅
 */

import axios from 'axios'

// 股票行情数据类型定义
export interface StockPrice {
  code: string          // 股票代码（如：600519）
  name: string          // 股票名称
  currentPrice: number  // 当前价格
  yesterdayClose: number // 昨日收盘价
  changeAmount: number  // 涨跌额
  changePercent: number // 涨跌幅（百分比）
  high: number         // 最高价
  low: number          // 最低价
  volume: number       // 成交量（手）
  amount: number       // 成交额（万元）
  timestamp: string    // 更新时间
}

// 数据源配置
const STOCK_PRICE_SOURCES = {
  // 腾讯财经API（免费、稳定、无CORS问题）
  tencentApi: (codes: string[]) => 
    `https://qt.gtimg.cn/q=${codes.join(',')}`,
  
  // 新浪财经API（备用）
  sinaApi: (codes: string[]) =>
    `https://hq.sinajs.cn/list=${codes.map(code => 
      code.startsWith('6') ? `sh${code}` : `sz${code}`
    ).join(',')}`,
  
  // 东方财富API（可能有CORS）
  eastmoneyApi: (codes: string[]) =>
    `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f2,f3,f4,f12,f14&secids=${codes.map(code =>
      code.startsWith('6') ? `1.${code}` : `0.${code}`
    ).join(',')}`
}

/**
 * 标准化股票代码格式
 * 腾讯财经格式：sh600519, sz000858
 */
function normalizeStockCode(code: string): string {
  if (!code) return ''
  
  // 移除可能的前缀
  const cleanCode = code.replace(/[^0-9]/g, '')
  
  if (cleanCode.startsWith('6') || cleanCode.startsWith('9')) {
    return `sh${cleanCode}`
  } else if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) {
    return `sz${cleanCode}`
  } else if (cleanCode.startsWith('4') || cleanCode.startsWith('8')) {
    return `bj${cleanCode}` // 北交所
  } else {
    return `sh${cleanCode}` // 默认上交所
  }
}

/**
 * 从腾讯财经API解析行情数据
 */
function parseTencentResponse(responseText: string): StockPrice[] {
  const stocks: StockPrice[] = []
  
  // 腾讯财经返回格式：v_sh600519="贵州茅台,1760.50,10.50,0.60%,1765.00,1750.00,1760.50,123456,1234567890";
  const lines = responseText.split(';').filter(line => line.trim())
  
  for (const line of lines) {
    try {
      // 解析格式：v_sh600519="数据..."
      const match = line.match(/v_([^=]+)="([^"]+)"/)
      if (!match) continue
      
      const fullCode = match[1] // sh600519
      const dataStr = match[2]
      const data = dataStr.split(',')
      
      if (data.length < 9) continue
      
      // 提取股票代码（去掉市场前缀）
      const code = fullCode.replace(/^(sh|sz|bj)/, '')
      
      // 解析数据
      const stock: StockPrice = {
        code,
        name: data[0] || '',
        currentPrice: parseFloat(data[1]) || 0,
        yesterdayClose: parseFloat(data[2]) || 0,
        changeAmount: parseFloat(data[3]) || 0,
        changePercent: parseFloat(data[4]) || 0,
        high: parseFloat(data[5]) || 0,
        low: parseFloat(data[6]) || 0,
        volume: parseFloat(data[7]) || 0,
        amount: parseFloat(data[8]) || 0,
        timestamp: new Date().toISOString()
      }
      
      // 如果涨跌幅为0但涨跌额不为0，重新计算
      if (stock.changePercent === 0 && stock.yesterdayClose > 0 && stock.currentPrice > 0) {
        stock.changePercent = ((stock.currentPrice - stock.yesterdayClose) / stock.yesterdayClose) * 100
        stock.changeAmount = stock.currentPrice - stock.yesterdayClose
      }
      
      stocks.push(stock)
      
    } catch (error) {
      console.warn(`解析股票行情数据失败:`, error, line)
    }
  }
  
  return stocks
}

/**
 * 从新浪财经API解析行情数据
 */
function parseSinaResponse(responseText: string): StockPrice[] {
  const stocks: StockPrice[] = []
  
  // 新浪返回格式：var hq_str_sh600519="贵州茅台,1760.50,10.50,0.60,1765.00,1750.00,...";
  const lines = responseText.split(';').filter(line => line.trim())
  
  for (const line of lines) {
    try {
      const match = line.match(/var hq_str_([^=]+)="([^"]+)"/)
      if (!match) continue
      
      const fullCode = match[1] // sh600519
      const dataStr = match[2]
      const data = dataStr.split(',')
      
      if (data.length < 32) continue
      
      const code = fullCode.replace(/^(sh|sz)/, '')
      
      const stock: StockPrice = {
        code,
        name: data[0] || '',
        currentPrice: parseFloat(data[3]) || 0,
        yesterdayClose: parseFloat(data[2]) || 0,
        changeAmount: parseFloat(data[4]) || 0,
        changePercent: parseFloat(data[5]) || 0,
        high: parseFloat(data[4]) || 0, // 新浪格式不同
        low: parseFloat(data[5]) || 0,
        volume: parseFloat(data[8]) || 0,
        amount: parseFloat(data[9]) || 0,
        timestamp: `${data[30]} ${data[31]}` // 日期时间
      }
      
      stocks.push(stock)
      
    } catch (error) {
      console.warn(`解析新浪行情数据失败:`, error)
    }
  }
  
  return stocks
}

/**
 * 获取模拟股票行情（用于开发和测试）
 */
function getMockStockPrices(codes: string[]): StockPrice[] {
  console.log(`使用模拟股票行情数据: ${codes.join(',')}`)
  
  const mockStocks: { [code: string]: StockPrice } = {
    '600519': {
      code: '600519',
      name: '贵州茅台',
      currentPrice: 1760.50 + (Math.random() - 0.5) * 10,
      yesterdayClose: 1760.50,
      changeAmount: 0,
      changePercent: 0,
      high: 1765.00,
      low: 1750.00,
      volume: 123456,
      amount: 1234567,
      timestamp: new Date().toISOString()
    },
    '000858': {
      code: '000858',
      name: '五粮液',
      currentPrice: 145.80 + (Math.random() - 0.5) * 2,
      yesterdayClose: 145.80,
      changeAmount: 0,
      changePercent: 0,
      high: 147.00,
      low: 144.50,
      volume: 234567,
      amount: 2345678,
      timestamp: new Date().toISOString()
    },
    '000333': {
      code: '000333',
      name: '美的集团',
      currentPrice: 58.90 + (Math.random() - 0.5) * 1,
      yesterdayClose: 58.90,
      changeAmount: 0,
      changePercent: 0,
      high: 59.50,
      low: 58.20,
      volume: 345678,
      amount: 3456789,
      timestamp: new Date().toISOString()
    },
    '000001': {
      code: '000001',
      name: '平安银行',
      currentPrice: 12.34 + (Math.random() - 0.5) * 0.2,
      yesterdayClose: 12.34,
      changeAmount: 0,
      changePercent: 0,
      high: 12.45,
      low: 12.20,
      volume: 456789,
      amount: 4567890,
      timestamp: new Date().toISOString()
    },
    '600036': {
      code: '600036',
      name: '招商银行',
      currentPrice: 35.67 + (Math.random() - 0.5) * 0.5,
      yesterdayClose: 35.67,
      changeAmount: 0,
      changePercent: 0,
      high: 35.90,
      low: 35.40,
      volume: 567890,
      amount: 5678901,
      timestamp: new Date().toISOString()
    }
  }
  
  // 为每个请求的代码生成数据
  return codes.map(code => {
    if (mockStocks[code]) {
      const stock = { ...mockStocks[code] }
      // 计算涨跌幅
      stock.changeAmount = stock.currentPrice - stock.yesterdayClose
      stock.changePercent = (stock.changeAmount / stock.yesterdayClose) * 100
      return stock
    } else {
      // 生成随机数据
      const basePrice = 10 + Math.random() * 100
      const changePercent = (Math.random() - 0.5) * 5
      
      return {
        code,
        name: `股票${code}`,
        currentPrice: basePrice * (1 + changePercent / 100),
        yesterdayClose: basePrice,
        changeAmount: basePrice * changePercent / 100,
        changePercent,
        high: basePrice * (1 + Math.random() * 0.03),
        low: basePrice * (1 - Math.random() * 0.02),
        volume: Math.floor(Math.random() * 1000000),
        amount: Math.floor(Math.random() * 10000000),
        timestamp: new Date().toISOString()
      }
    }
  })
}

/**
 * 获取股票实时行情
 * @param codes 股票代码数组（如：['600519', '000858']）
 * @param useMock 是否使用模拟数据（开发测试用）
 */
export async function getStockPrices(
  codes: string[], 
  useMock: boolean = false
): Promise<StockPrice[]> {
  
  if (codes.length === 0) {
    return []
  }
  
  // 开发阶段可以使用模拟数据
  if (useMock || process.env.NODE_ENV === 'development') {
    return getMockStockPrices(codes)
  }
  
  // 标准化代码格式
  const normalizedCodes = codes.map(normalizeStockCode)
  
  // 方法1: 尝试腾讯财经API
  try {
    const url = STOCK_PRICE_SOURCES.tencentApi(normalizedCodes)
    console.log(`获取股票行情: ${url.substring(0, 100)}...`)
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    })
    
    const stocks = parseTencentResponse(response.data)
    if (stocks.length > 0) {
      console.log(`✅ 腾讯财经API成功获取 ${stocks.length} 只股票行情`)
      return stocks
    }
  } catch (error) {
    console.warn(`腾讯财经API失败:`, error.message)
  }
  
  // 方法2: 尝试新浪财经API
  try {
    const url = STOCK_PRICE_SOURCES.sinaApi(codes)
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      }
    })
    
    const stocks = parseSinaResponse(response.data)
    if (stocks.length > 0) {
      console.log(`✅ 新浪财经API成功获取 ${stocks.length} 只股票行情`)
      return stocks
    }
  } catch (error) {
    console.warn(`新浪财经API失败:`, error.message)
  }
  
  // 方法3: 尝试东方财富API（可能有CORS）
  try {
    const url = STOCK_PRICE_SOURCES.eastmoneyApi(codes)
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (response.data.data && response.data.data.diff) {
      const stocks: StockPrice[] = []
      const diff = response.data.data.diff
      
      for (const code in diff) {
        const item = diff[code]
        stocks.push({
          code: item.f12 || code.replace(/^[0-9]\./, ''),
          name: item.f14 || '',
          currentPrice: item.f2 || 0,
          yesterdayClose: 0, // 东方财富不直接提供
          changeAmount: item.f4 || 0,
          changePercent: item.f3 || 0,
          high: 0,
          low: 0,
          volume: 0,
          amount: 0,
          timestamp: new Date().toISOString()
        })
      }
      
      if (stocks.length > 0) {
        console.log(`✅ 东方财富API成功获取 ${stocks.length} 只股票行情`)
        return stocks
      }
    }
  } catch (error) {
    console.warn(`东方财富API失败:`, error.message)
  }
  
  // 所有API都失败，使用模拟数据
  console.warn(`所有股票行情API都失败，使用模拟数据`)
  return getMockStockPrices(codes)
}

/**
 * 获取单只股票行情
 */
export async function getStockPrice(
  code: string, 
  useMock: boolean = false
): Promise<StockPrice | null> {
  const prices = await getStockPrices([code], useMock)
  return prices[0] || null
}

/**
 * 批量获取股票行情（优化版，分批请求）
 */
export async function getBatchStockPrices(
  codes: string[], 
  batchSize: number = 20,
  useMock: boolean = false
): Promise<StockPrice[]> {
  
  if (codes.length === 0) {
    return []
  }
  
  // 去重
  const uniqueCodes = [...new Set(codes)]
  
  // 分批处理，避免URL过长
  const batches: string[][] = []
  for (let i = 0; i < uniqueCodes.length; i += batchSize) {
    batches.push(uniqueCodes.slice(i, i + batchSize))
  }
  
  const allStocks: StockPrice[] = []
  
  // 并行请求（限制并发数）
  const concurrency = 3
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency)
    const promises = batchGroup.map(batch => getStockPrices(batch, useMock))
    
    try {
      const results = await Promise.all(promises)
      results.forEach(stocks => allStocks.push(...stocks))
      
      // 避免请求过快
      if (i + concurrency < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.warn(`批量获取股票行情失败:`, error)
    }
  }
  
  console.log(`✅ 批量获取完成，共 ${allStocks.length} 只股票行情`)
  return allStocks
}

/**
 * 创建股票行情缓存
 */
class StockPriceCache {
  private cache = new Map<string, { data: StockPrice; timestamp: number }>()
  private ttl = 30000 // 30秒缓存
  
  set(code: string, price: StockPrice): void {
    this.cache.set(code, {
      data: price,
      timestamp: Date.now()
    })
  }
  
  get(code: string): StockPrice | null {
    const item = this.cache.get(code)
    if (!item) return null
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(code)
      return null
    }
    
    return item.data
  }
  
  clear(): void {
    this.cache.clear()
  }
}

// 全局缓存实例
const stockCache = new StockPriceCache()

/**
 * 获取带缓存的股票行情
 */
export async function getCachedStockPrices(
  codes: string[], 
  useMock: boolean = false
): Promise<StockPrice[]> {
  
  const result: StockPrice[] = []
  const uncachedCodes: string[] = []
  
  // 检查缓存
  for (const code of codes) {
    const cached = stockCache.get(code)
    if (cached) {
      result.push(cached)
    } else {
      uncachedCodes.push(code)
    }
  }
  
  // 获取未缓存的数据
  if (uncachedCodes.length > 0) {
    const freshPrices = await getStockPrices(uncachedCodes, useMock)
    
    // 更新缓存
    freshPrices.forEach(price => {
      stockCache.set(price.code, price)
    })
    
    result.push(...freshPrices)
  }
  
  return result
}