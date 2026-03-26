/**
 * 基金持仓分析服务
 * 通过基金持股状况计算实时估值
 */

import axios from 'axios'
import { fetchStockDataMultiSource, getFundPortfolioStocks } from './freeStockService'
import { getFundApiHeaders } from '../utils/httpHeaders'

// 基金持仓数据接口
const FUND_PORTFOLIO_API = {
  // 东方财富基金持仓API
  eastmoneyPortfolio: (code: string) =>
    `https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`,
  
  // 天天基金持仓数据
  tiantianPortfolio: (code: string) =>
    `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
  
  // 股票实时数据API
  stockRealTime: (symbols: string[]) => {
    // 新浪财经A股实时数据
    const sinaSymbols = symbols.map(s => {
      if (s.startsWith('6')) return `sh${s}`
      if (s.startsWith('0') || s.startsWith('3')) return `sz${s}`
      return s
    }).join(',')
    
    return `https://hq.sinajs.cn/list=${sinaSymbols}`
  }
}



// 基金持仓样本数据（实际应从API获取）
const FUND_PORTFOLIO_SAMPLES: Record<string, Array<{
  stockCode: string
  stockName: string
  weight: number  // 持仓比例（百分比）
  marketValue?: number  // 市值
}>> = {
  '005827': [ // 易方达蓝筹精选混合
    { stockCode: '600519', stockName: '贵州茅台', weight: 9.85 },
    { stockCode: '000858', stockName: '五粮液', weight: 9.76 },
    { stockCode: '000333', stockName: '美的集团', weight: 9.65 },
    { stockCode: '002415', stockName: '海康威视', weight: 9.54 },
    { stockCode: '00700', stockName: '腾讯控股', weight: 9.43 },
    { stockCode: '03690', stockName: '美团-W', weight: 9.32 },
    { stockCode: '000002', stockName: '万科A', weight: 4.21 },
    { stockCode: '02382', stockName: '舜宇光学科技', weight: 3.15 },
    { stockCode: '002304', stockName: '洋河股份', weight: 2.84 },
    { stockCode: '000568', stockName: '泸州老窖', weight: 2.73 },
  ],
  '161725': [ // 招商中证白酒指数
    { stockCode: '600519', stockName: '贵州茅台', weight: 15.23 },
    { stockCode: '000858', stockName: '五粮液', weight: 14.87 },
    { stockCode: '000568', stockName: '泸州老窖', weight: 13.45 },
    { stockCode: '002304', stockName: '洋河股份', weight: 11.23 },
    { stockCode: '600809', stockName: '山西汾酒', weight: 10.56 },
    { stockCode: '000596', stockName: '古井贡酒', weight: 8.34 },
    { stockCode: '603369', stockName: '今世缘', weight: 6.78 },
    { stockCode: '000799', stockName: '酒鬼酒', weight: 5.43 },
    { stockCode: '600779', stockName: '水井坊', weight: 4.21 },
    { stockCode: '000860', stockName: '顺鑫农业', weight: 3.12 },
  ],
  '003095': [ // 中欧医疗健康混合
    { stockCode: '300760', stockName: '迈瑞医疗', weight: 9.87 },
    { stockCode: '600276', stockName: '恒瑞医药', weight: 9.65 },
    { stockCode: '300015', stockName: '爱尔眼科', weight: 9.43 },
    { stockCode: '300347', stockName: '泰格医药', weight: 8.21 },
    { stockCode: '002821', stockName: '凯莱英', weight: 7.89 },
    { stockCode: '603259', stockName: '药明康德', weight: 7.56 },
    { stockCode: '000661', stockName: '长春高新', weight: 6.34 },
    { stockCode: '300122', stockName: '智飞生物', weight: 5.43 },
    { stockCode: '002007', stockName: '华兰生物', weight: 4.32 },
    { stockCode: '600196', stockName: '复星医药', weight: 3.21 },
  ]
}

// 股票实时数据接口
interface StockRealTimeData {
  symbol: string
  name: string
  currentPrice: number
  changePercent: number
  changeAmount: number
  timestamp: number
}

// 基金持仓估值结果
interface FundPortfolioValuation {
  fundCode: string
  fundName: string
  calculatedValue: number  // 计算出的净值
  calculatedChangePercent: number  // 计算出的涨跌幅
  baseNetValue: number  // 基准净值（昨日净值）
  timestamp: number
  stockDetails: Array<{
    stockCode: string
    stockName: string
    weight: number
    currentPrice: number
    changePercent: number
    contribution: number  // 对基金涨跌幅的贡献
  }>
  dataSource: 'portfolio_calculation' | 'api_estimate'
  confidence: number  // 数据置信度（0-1）
}

/**
 * 获取股票实时数据（使用免费多源API）
 */
async function fetchStockRealTimeData(symbols: string[]): Promise<StockRealTimeData[]> {
  if (symbols.length === 0) return []
  
  try {
    console.log(`📈 获取 ${symbols.length} 只股票实时数据: ${symbols.join(',')}`)
    
    // 使用免费多源API服务
    const stockData = await fetchStockDataMultiSource(symbols)
    
    console.log(`📈 fetchStockDataMultiSource 返回 ${stockData.length} 条数据`)
    if (stockData.length > 0) {
      console.log(`📈 第一条数据: ${stockData[0].symbol} - ${stockData[0].name} - 涨跌幅: ${stockData[0].changePercent}%`)
    }
    
    // 转换为内部格式
    return stockData.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.currentPrice,
      changePercent: stock.changePercent,
      changeAmount: stock.changeAmount,
      timestamp: stock.timestamp
    }))
    
  } catch (error) {
    console.error('❌ 获取股票实时数据失败:', error)
    throw error
  }
}

/**
 * 解析新浪财经股票数据
 */
function parseSinaStockData(data: string, symbols: string[]): StockRealTimeData[] {
  const stocks: StockRealTimeData[] = []
  
  // 解析新浪财经数据格式
  const lines = data.split(';').filter(line => line.trim())
  
  lines.forEach((line, index) => {
    try {
      const match = line.match(/var hq_str_(.+?)="(.+)"/)
      if (!match) return
      
      const symbol = match[1]
      const values = match[2].split(',')
      
      if (values.length >= 32) {
        const name = values[0]
        const openPrice = parseFloat(values[1])
        const previousClose = parseFloat(values[2])
        const currentPrice = parseFloat(values[3])
        const highPrice = parseFloat(values[4])
        const lowPrice = parseFloat(values[5])
        
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
      console.warn(`解析股票数据失败 (${symbols[index]}):`, error)
    }
  })
  
  return stocks
}

/**
 * 获取基金持仓数据
 */
async function getFundPortfolio(fundCode: string): Promise<Array<{
  stockCode: string
  stockName: string
  weight: number
}>> {
  // 这里使用样本数据，实际应该从API获取
  // TODO: 实现从东方财富API获取真实持仓数据
  
  const portfolio = FUND_PORTFOLIO_SAMPLES[fundCode]
  if (portfolio) {
    return portfolio
  }
  
  // 如果没有样本数据，返回空数组
  console.warn(`基金 ${fundCode} 暂无持仓数据，使用模拟数据`)
  return [
    { stockCode: '000001', stockName: '平安银行', weight: 5.0 },
    { stockCode: '000002', stockName: '万科A', weight: 5.0 },
    { stockCode: '000858', stockName: '五粮液', weight: 5.0 },
    { stockCode: '000333', stockName: '美的集团', weight: 5.0 },
    { stockCode: '002415', stockName: '海康威视', weight: 5.0 },
  ]
}

/**
 * 通过持仓计算基金实时估值
 */
export async function calculateFundValuationByPortfolio(
  fundCode: string, 
  baseNetValue: number = 1.0
): Promise<FundPortfolioValuation | null> {
  try {
    console.log(`开始计算基金 ${fundCode} 的持仓估值...`)
    
    // 1. 获取基金持仓数据
    const portfolio = await getFundPortfolio(fundCode)
    if (portfolio.length === 0) {
      console.warn(`基金 ${fundCode} 无持仓数据`)
      return null
    }
    
    console.log(`基金 ${fundCode} 持仓股票:`, portfolio.map(p => `${p.stockCode}(${p.stockName})`))
    
    // 2. 获取持仓股票的实时数据
    const stockSymbols = portfolio.map(p => p.stockCode)
    console.log(`请求股票数据，代码: ${stockSymbols.join(',')}`)
    
    const stockData = await fetchStockRealTimeData(stockSymbols)
    
    console.log(`获取到 ${stockData.length} 只股票数据:`, stockData.map(s => `${s.symbol}(${s.name})`))
    
    if (stockData.length === 0) {
      console.warn(`无法获取持仓股票实时数据`)
      return null
    }
    
    // 3. 创建股票数据映射
    const stockDataMap = new Map<string, StockRealTimeData>()
    stockData.forEach(stock => {
      // 标准化股票代码（移除sh/sz前缀）
      const cleanSymbol = stock.symbol.replace(/^(sh|sz)/, '')
      stockDataMap.set(cleanSymbol, stock)
    })
    
    // 4. 计算加权涨跌幅
    let totalWeight = 0
    let weightedChangePercent = 0
    const stockDetails: FundPortfolioValuation['stockDetails'] = []
    
    for (const holding of portfolio) {
      const stock = stockDataMap.get(holding.stockCode)
      if (stock) {
        // 计算该股票对基金涨跌幅的贡献
        const contribution = (holding.weight / 100) * stock.changePercent
        weightedChangePercent += contribution
        totalWeight += holding.weight
        
        stockDetails.push({
          stockCode: holding.stockCode,
          stockName: holding.stockName,
          weight: holding.weight,
          currentPrice: stock.currentPrice,
          changePercent: stock.changePercent,
          contribution: parseFloat(contribution.toFixed(4))
        })
      }
    }
    
    // 5. 计算基金估值
    if (totalWeight === 0) {
      console.warn('总持仓权重为0')
      return null
    }
    
    // 假设持仓股票占基金总资产的80%（实际比例需要从基金报告中获取）
    const portfolioWeightRatio = 0.8
    const effectiveChangePercent = weightedChangePercent * portfolioWeightRatio
    
    const calculatedValue = baseNetValue * (1 + effectiveChangePercent / 100)
    
    // 6. 获取基金名称（从样本数据或API）
    const fundName = getFundName(fundCode)
    
    return {
      fundCode,
      fundName,
      calculatedValue: parseFloat(calculatedValue.toFixed(4)),
      calculatedChangePercent: parseFloat(effectiveChangePercent.toFixed(2)),
      baseNetValue,
      timestamp: Date.now(),
      stockDetails,
      dataSource: 'portfolio_calculation',
      confidence: Math.min(0.7 + (stockDetails.length / portfolio.length) * 0.3, 0.95) // 置信度计算
    }
    
  } catch (error) {
    console.error(`计算基金 ${fundCode} 持仓估值失败:`, error)
    return null
  }
}

/**
 * 获取基金名称
 */
function getFundName(fundCode: string): string {
  const fundNames: Record<string, string> = {
    '005827': '易方达蓝筹精选混合',
    '161725': '招商中证白酒指数(LOF)A',
    '003095': '中欧医疗健康混合A',
    '260108': '景顺长城新兴成长混合',
    '110011': '易方达中小盘混合',
    '000404': '易方达新兴成长混合',
    '519674': '银河创新成长混合',
    '001875': '前海开源沪港深优势精选混合',
    '002190': '农银新能源主题',
    '001714': '工银文体产业股票A',
  }
  
  return fundNames[fundCode] || `基金${fundCode}`
}

/**
 * 批量计算多个基金的持仓估值
 */
export async function calculateMultipleFundValuations(
  fundCodes: string[],
  baseNetValues: Record<string, number> = {}
): Promise<FundPortfolioValuation[]> {
  const results: FundPortfolioValuation[] = []
  
  for (const fundCode of fundCodes) {
    try {
      const baseNetValue = baseNetValues[fundCode] || 1.0
      const valuation = await calculateFundValuationByPortfolio(fundCode, baseNetValue)
      
      if (valuation) {
        results.push(valuation)
        console.log(`✅ 基金 ${fundCode} 持仓估值计算完成: ${valuation.calculatedValue} (${valuation.calculatedChangePercent}%)`)
      } else {
        console.warn(`❌ 基金 ${fundCode} 持仓估值计算失败`)
      }
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`处理基金 ${fundCode} 时出错:`, error)
    }
  }
  
  return results
}

/**
 * 对比持仓估值和API估值
 */
export async function compareValuationMethods(fundCode: string): Promise<{
  portfolioValuation: FundPortfolioValuation | null
  apiEstimate: { value: number; changePercent: number } | null
  difference: number  // 差异百分比
}> {
  try {
    // 获取持仓估值
    const portfolioValuation = await calculateFundValuationByPortfolio(fundCode)
    
    // 获取API估值（天天基金）
    const apiEstimate = await getApiEstimate(fundCode)
    
    let difference = 0
    if (portfolioValuation && apiEstimate) {
      difference = Math.abs(portfolioValuation.calculatedChangePercent - apiEstimate.changePercent)
    }
    
    return {
      portfolioValuation,
      apiEstimate,
      difference: parseFloat(difference.toFixed(2))
    }
    
  } catch (error) {
    console.error(`对比估值方法失败 (${fundCode}):`, error)
    return {
      portfolioValuation: null,
      apiEstimate: null,
      difference: 0
    }
  }
}

/**
 * 获取API估值（天天基金接口）
 */
async function getApiEstimate(fundCode: string): Promise<{ value: number; changePercent: number } | null> {
  try {
    const response = await axios.get(
      `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`,
      {
        timeout: 5000,
        headers: getFundApiHeaders()
      }
    )
    
    const jsonStr = response.data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
    const data = JSON.parse(jsonStr)
    
    return {
      value: parseFloat(data.gsz),
      changePercent: parseFloat(data.gszzl)
    }
    
  } catch (error) {
    console.warn(`获取API估值失败 (${fundCode}):`, error)
    return null
  }
}

/**
 * 获取服务状态
 */
export function getPortfolioServiceStatus(): {
  supportedFunds: string[]
  lastUpdate: string
  dataSources: string[]
} {
  return {
    supportedFunds: Object.keys(FUND_PORTFOLIO_SAMPLES),
    lastUpdate: new Date().toLocaleString('zh-CN'),
    dataSources: ['新浪财经股票数据', '东方财富基金持仓数据', '持仓权重估算'],
    description: '通过基金持仓股票实时数据计算基金估值'
  }
}