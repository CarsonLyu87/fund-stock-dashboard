/**
 * 免费股票数据服务
 * 使用腾讯财经、网易财经等免费API获取股票数据
 */

import axios from 'axios'
import { getStockApiHeaders } from '../utils/httpHeaders'

// 代理服务器配置
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

// 股票数据接口
export interface StockData {
  symbol: string
  name: string
  currentPrice: number
  changePercent: number
  changeAmount: number
  timestamp: number
}

// 免费股票数据API配置
const FREE_STOCK_APIS = {
  /**
   * 腾讯财经股票数据（最稳定）
   * 格式: http://qt.gtimg.cn/q=sh600519,sz000858
   * 响应: v_sh600519="1~贵州茅台~600519~1410.27~...";
   */
  tencent: (symbols: string[]) => {
    const tencentSymbols = symbols.map(symbol => {
      // 转换为腾讯财经格式
      if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
        return symbol
      } else if (symbol.startsWith('6')) {
        return `sh${symbol}`
      } else {
        return `sz${symbol}`
      }
    })
    return `http://qt.gtimg.cn/q=${tencentSymbols.join(',')}`
  },
  
  /**
   * 东方财富股票数据（备用）
   * 格式: https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=1.600519,0.000858
   * 响应: JSON格式，更友好
   */
  eastmoney: (symbols: string[]) => {
    const eastmoneySymbols = symbols.map(symbol => {
      const code = symbol.replace(/^(sh|sz)/, '')
      // 东方财富格式: 1.600519 (上海), 0.000858 (深圳)
      return symbol.startsWith('sh') ? `1.${code}` : `0.${code}`
    })
    return `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f14&secids=${eastmoneySymbols.join(',')}`
  },
  
  /**
   * 新浪财经备用接口（通过代理）
   * 格式: https://hq.sinajs.cn/list=sh600519,sz000858
   */
  sina: (symbols: string[]) => {
    return `https://hq.sinajs.cn/list=${symbols.join(',')}`
  }
}

/**
 * 尝试多个免费API获取股票数据
 */
export async function fetchStockDataMultiSource(symbols: string[]): Promise<StockData[]> {
  if (symbols.length === 0) return []
  
  console.log(`📈 尝试获取 ${symbols.length} 只股票数据: ${symbols.join(',')}`)
  
  // 尝试的API顺序（腾讯财经最稳定）
  const apiAttempts = [
    { name: '腾讯财经', fetch: fetchFromTencent },
    { name: '东方财富', fetch: fetchFromEastmoney },
    { name: '新浪财经（通过代理）', fetch: fetchFromSinaViaProxy },
    { name: '模拟数据', fetch: generateMockStockData }
  ]
  
  for (const attempt of apiAttempts) {
    try {
      console.log(`🔍 尝试 ${attempt.name}...`)
      const stocks = await attempt.fetch(symbols)
      
      if (stocks.length > 0) {
        console.log(`✅ ${attempt.name} 成功获取 ${stocks.length} 只股票数据`)
        console.log(`✅ 示例数据: ${stocks[0].symbol} - ${stocks[0].name} - ${stocks[0].currentPrice}`)
        return stocks
      } else {
        console.log(`⚠️ ${attempt.name} 返回空数据`)
      }
    } catch (error) {
      console.warn(`⚠️ ${attempt.name} 失败:`, error.message)
      // 继续尝试下一个API
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.error('❌ 所有股票数据API都失败了')
  return []
}

/**
 * 从腾讯财经获取股票数据
 */
async function fetchFromTencent(symbols: string[]): Promise<StockData[]> {
  try {
    const url = FREE_STOCK_APIS.tencent(symbols)
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: getStockApiHeaders(),
      responseType: 'text'
    })
    
    return parseTencentStockData(response.data, symbols)
    
  } catch (error) {
    console.error('腾讯财经API失败:', error.message)
    throw error
  }
}

/**
 * 解析腾讯财经股票数据
 */
function parseTencentStockData(data: string, symbols: string[]): StockData[] {
  const stocks: StockData[] = []
  
  // 腾讯财经格式: v_sh600519="1~贵州茅台~600519~1410.27~...";
  const lines = data.split(';').filter(line => line.trim())
  
  lines.forEach((line, index) => {
    try {
      const match = line.match(/v_(sh\d+|sz\d+)="(.+)"/)
      if (!match) return
      
      const symbol = match[1]
      const values = match[2].split('~')
      
      if (values.length >= 40) {
        const name = values[1]
        const currentPrice = parseFloat(values[3]) || 0
        const changePercent = parseFloat(values[32]) || 0  // 涨跌幅
        const changeAmount = parseFloat(values[31]) || 0   // 涨跌额
        
        stocks.push({
          symbol,
          name,
          currentPrice,
          changePercent,
          changeAmount,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.warn(`解析腾讯股票数据失败 (${symbols[index]}):`, error)
    }
  })
  
  return stocks
}

/**
 * 从东方财富获取股票数据
 */
async function fetchFromEastmoney(symbols: string[]): Promise<StockData[]> {
  try {
    const url = FREE_STOCK_APIS.eastmoney(symbols)
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: getStockApiHeaders()
    })
    
    return parseEastmoneyStockData(response.data, symbols)
    
  } catch (error) {
    console.error('东方财富股票API失败:', error.message)
    throw error
  }
}

/**
 * 解析东方财富股票数据（JSON格式）
 */
function parseEastmoneyStockData(data: any, symbols: string[]): StockData[] {
  const stocks: StockData[] = []
  
  try {
    if (data.data && data.data.diff && Array.isArray(data.data.diff)) {
      data.data.diff.forEach((item: any) => {
        try {
          // 东方财富字段说明:
          // f2: 当前价格, f3: 涨跌幅(%), f4: 涨跌额, f12: 股票代码, f14: 股票名称
          if (item.f12 && item.f2 !== undefined) {
            const code = item.f12.toString()
            const symbol = code.startsWith('6') ? `sh${code}` : `sz${code}`
            
            stocks.push({
              symbol,
              name: item.f14 || `股票${code}`,
              currentPrice: item.f2 || 0,
              changePercent: item.f3 || 0,
              changeAmount: item.f4 || 0,
              timestamp: Date.now()
            })
          }
        } catch (parseError) {
          console.warn('解析东方财富单条数据失败:', parseError)
        }
      })
    }
    
  } catch (error) {
    console.error('解析东方财富数据失败:', error)
  }
  
  return stocks
}

/**
 * 通过代理服务器从新浪财经获取股票数据
 */
async function fetchFromSinaViaProxy(symbols: string[]): Promise<StockData[]> {
  try {
    const proxyUrl = `${PROXY_BASE_URL}/api/stock/${symbols.join(',')}`
    
    const response = await axios.get(proxyUrl, {
      timeout: 10000,
      responseType: 'text'
    })
    
    return parseSinaStockData(response.data, symbols)
    
  } catch (error) {
    console.error('新浪财经代理API失败:', error.message)
    throw error
  }
}

/**
 * 解析新浪财经股票数据
 */
function parseSinaStockData(data: string, symbols: string[]): StockData[] {
  const stocks: StockData[] = []
  
  // 新浪财经格式: var hq_str_sh600519="贵州茅台,1410.27,...";
  const lines = data.split(';').filter(line => line.trim())
  
  lines.forEach((line, index) => {
    try {
      const match = line.match(/var hq_str_(sh\d+|sz\d+)="(.+)"/)
      if (!match) return
      
      const symbol = match[1]
      const values = match[2].split(',')
      
      if (values.length >= 32) {
        const name = values[0]
        const previousClose = parseFloat(values[2]) || 0
        const currentPrice = parseFloat(values[3]) || 0
        
        // 计算涨跌幅
        const changeAmount = currentPrice - previousClose
        const changePercent = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0
        
        stocks.push({
          symbol,
          name,
          currentPrice,
          changePercent: parseFloat(changePercent.toFixed(2)),
          changeAmount: parseFloat(changeAmount.toFixed(2)),
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.warn(`解析新浪股票数据失败 (${symbols[index]}):`, error)
    }
  })
  
  return stocks
}

/**
 * 生成模拟股票数据（最后降级方案）
 */
function generateMockStockData(symbols: string[]): StockData[] {
  console.log('🔄 生成模拟股票数据...')
  
  return symbols.map(symbol => {
    const basePrice = 10 + Math.random() * 100
    const changePercent = (Math.random() - 0.5) * 10 // -5% 到 +5%
    const changeAmount = basePrice * changePercent / 100
    
    // 根据股票代码猜测名称
    let name = `股票${symbol}`
    if (symbol.includes('600519')) name = '贵州茅台'
    if (symbol.includes('000858')) name = '五粮液'
    if (symbol.includes('000333')) name = '美的集团'
    if (symbol.includes('300760')) name = '迈瑞医疗'
    if (symbol.includes('600276')) name = '恒瑞医药'
    
    return {
      symbol,
      name,
      currentPrice: parseFloat(basePrice.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      changeAmount: parseFloat(changeAmount.toFixed(2)),
      timestamp: Date.now()
    }
  })
}

/**
 * 获取单个股票数据
 */
export async function getStockData(symbol: string): Promise<StockData | null> {
  const stocks = await fetchStockDataMultiSource([symbol])
  return stocks[0] || null
}

/**
 * 批量获取股票数据
 */
export async function getBatchStockData(symbols: string[]): Promise<StockData[]> {
  return await fetchStockDataMultiSource(symbols)
}

/**
 * 获取基金持仓股票的实时数据
 */
export async function getFundPortfolioStocks(fundCode: string): Promise<StockData[]> {
  // 根据基金代码获取持仓股票列表
  const portfolio = getSamplePortfolio(fundCode)
  
  if (!portfolio || portfolio.length === 0) {
    return []
  }
  
  const symbols = portfolio.map(stock => stock.stockCode)
  return await fetchStockDataMultiSource(symbols)
}

/**
 * 样本持仓数据（与fundPortfolioService.ts保持一致）
 */
function getSamplePortfolio(fundCode: string): Array<{stockCode: string, stockName: string, weight: number}> {
  const portfolios: Record<string, Array<{stockCode: string, stockName: string, weight: number}>> = {
    '161725': [ // 招商中证白酒指数(LOF)A
      { stockCode: 'sh600519', stockName: '贵州茅台', weight: 15.2 },
      { stockCode: 'sz000858', stockName: '五粮液', weight: 14.8 },
      { stockCode: 'sz000568', stockName: '泸州老窖', weight: 13.5 },
      { stockCode: 'sz002304', stockName: '洋河股份', weight: 11.2 },
      { stockCode: 'sh600809', stockName: '山西汾酒', weight: 9.8 },
      { stockCode: 'sz000596', stockName: '古井贡酒', weight: 6.5 },
      { stockCode: 'sh603369', stockName: '今世缘', weight: 5.2 },
      { stockCode: 'sz000799', stockName: '酒鬼酒', weight: 4.8 },
      { stockCode: 'sh600779', stockName: '水井坊', weight: 4.5 },
      { stockCode: 'sz000860', stockName: '顺鑫农业', weight: 4.1 }
    ],
    '005827': [ // 易方达蓝筹精选混合
      { stockCode: 'sh600519', stockName: '贵州茅台', weight: 9.85 },
      { stockCode: 'sz000858', stockName: '五粮液', weight: 9.76 },
      { stockCode: 'sz000333', stockName: '美的集团', weight: 9.65 },
      { stockCode: 'sz002415', stockName: '海康威视', weight: 9.54 },
      { stockCode: 'sz000002', stockName: '万科A', weight: 4.21 },
      { stockCode: 'sz002304', stockName: '洋河股份', weight: 2.84 },
      { stockCode: 'sz000568', stockName: '泸州老窖', weight: 2.73 }
    ],
    '003095': [ // 中欧医疗健康混合A
      { stockCode: 'sz300760', stockName: '迈瑞医疗', weight: 9.8 },
      { stockCode: 'sh600276', stockName: '恒瑞医药', weight: 9.5 },
      { stockCode: 'sz300015', stockName: '爱尔眼科', weight: 8.2 },
      { stockCode: 'sz300347', stockName: '泰格医药', weight: 7.8 },
      { stockCode: 'sz002821', stockName: '凯莱英', weight: 6.5 },
      { stockCode: 'sh603259', stockName: '药明康德', weight: 6.2 },
      { stockCode: 'sz000661', stockName: '长春高新', weight: 5.8 },
      { stockCode: 'sz300122', stockName: '智飞生物', weight: 5.5 },
      { stockCode: 'sz002007', stockName: '华兰生物', weight: 4.8 },
      { stockCode: 'sh600196', stockName: '复星医药', weight: 4.5 }
    ]
  }
  
  return portfolios[fundCode] || []
}

export default {
  fetchStockDataMultiSource,
  getStockData,
  getBatchStockData,
  getFundPortfolioStocks
}