/**
 * 真实基金持仓数据服务
 * 使用天天基金API获取真实持仓数据
 * 使用新浪股票数据估算基金估值
 */

import { proxyRequest } from './vercelProxyService'

// 数据类型定义
export interface StockHolding {
  code: string      // 股票代码（如：600519）
  name: string      // 股票名称
  weight: number    // 持仓比例（百分比，如：10.5表示10.5%）
  shares: number    // 持股数量（万股）
  marketValue: number // 持仓市值（万元）
}

export interface FundHoldings {
  fundCode: string      // 基金代码
  fundName: string      // 基金名称
  reportDate: string    // 报告日期（YYYY-MM-DD）
  totalStocks: number   // 持仓股票总数
  totalWeight: number   // 股票总持仓比例
  stockList: StockHolding[] // 持仓股票列表
  cashWeight: number    // 现金比例
  otherWeight: number   // 其他资产比例
}

export interface StockPriceData {
  symbol: string        // 股票代码（带市场前缀，如：sh600519）
  name: string          // 股票名称
  price: number         // 当前价格
  change: number        // 涨跌额
  changePercent: number // 涨跌幅（百分比）
  volume: number        // 成交量（手）
  amount: number        // 成交额（万元）
  high: number          // 最高价
  low: number           // 最低价
  open: number          // 开盘价
  lastClose: number     // 昨收价
  timestamp: string     // 时间戳
}

export interface FundValuation {
  fundCode: string
  fundName: string
  reportDate: string
  estimatedChange: number  // 估算涨跌幅（百分比）
  weightedChange: number   // 加权涨跌幅
  cashContribution: number // 现金贡献
  otherContribution: number // 其他资产贡献
  stockContributions: Array<{
    code: string
    name: string
    weight: number
    changePercent: number
    contribution: number
  }>
  timestamp: string
}

/**
 * 从天天基金获取真实持仓数据
 */
export async function getRealFundHoldings(code: string, name: string): Promise<FundHoldings | null> {
  try {
    console.log(`📊 获取基金 ${code} 真实持仓数据`)
    
    // 天天基金持仓API
    const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=50&year=&month=&rt=${Date.now()}`
    
    const response = await proxyRequest(url)
    
    if (typeof response === 'string') {
      // 解析HTML响应
      return parseTiantianHoldingsHTML(code, name, response)
    } else {
      console.warn('持仓API返回非文本响应')
      return null
    }
    
  } catch (error) {
    console.error(`获取基金 ${code} 持仓数据失败:`, error)
    return null
  }
}

/**
 * 解析天天基金HTML持仓数据
 */
function parseTiantianHoldingsHTML(code: string, name: string, html: string): FundHoldings | null {
  try {
    // 提取JSON数据（天天基金返回的是包含JSON的JavaScript）
    const jsonMatch = html.match(/var apidata=\s*({.*?});/)
    
    if (!jsonMatch) {
      console.warn('未找到持仓数据')
      return null
    }
    
    const data = JSON.parse(jsonMatch[1])
    
    if (!data || !data.quarterInfos || data.quarterInfos.length === 0) {
      console.warn('持仓数据为空')
      return null
    }
    
    // 获取最新季度的持仓数据
    const latestQuarter = data.quarterInfos[0]
    const stockList = latestQuarter.stockList || []
    
    if (stockList.length === 0) {
      console.warn('股票持仓列表为空')
      return null
    }
    
    // 转换为标准格式
    const holdings: StockHolding[] = stockList.map((stock: any) => ({
      code: stock.stockCode,
      name: stock.stockName,
      weight: parseFloat(stock.percent) || 0,
      shares: parseFloat(stock.haveNum) || 0,
      marketValue: parseFloat(stock.haveMoney) || 0
    })).filter((stock: StockHolding) => stock.weight > 0)
    
    // 计算总权重
    const totalWeight = holdings.reduce((sum, stock) => sum + stock.weight, 0)
    
    return {
      fundCode: code,
      fundName: name,
      reportDate: latestQuarter.reportDate || new Date().toISOString().split('T')[0],
      totalStocks: holdings.length,
      totalWeight,
      stockList: holdings,
      cashWeight: Math.max(0, 100 - totalWeight - 5), // 估算现金比例
      otherWeight: 5 // 估算其他资产比例
    }
    
  } catch (error) {
    console.error('解析持仓HTML失败:', error)
    return null
  }
}

/**
 * 从新浪获取股票实时数据
 */
export async function getSinaStockPrice(symbol: string): Promise<StockPriceData | null> {
  try {
    // 新浪股票API
    const sinaSymbol = symbol.startsWith('6') ? `sh${symbol}` : `sz${symbol}`
    const url = `https://hq.sinajs.cn/list=${sinaSymbol}`
    
    const response = await proxyRequest(url)
    
    if (typeof response === 'string') {
      return parseSinaStockData(sinaSymbol, response)
    }
    
    return null
    
  } catch (error) {
    console.error(`获取股票 ${symbol} 数据失败:`, error)
    return null
  }
}

/**
 * 解析新浪股票数据
 */
function parseSinaStockData(symbol: string, data: string): StockPriceData | null {
  try {
    // 新浪数据格式: var hq_str_sh600519="贵州茅台,1925.50,1930.00,1920.50,1935.00,1915.00,1925.50,1926.00,12345678,1234567890,100,1925.50,200,1925.40,300,...";
    const match = data.match(/="(.+?)"/)
    
    if (!match) {
      console.warn('新浪股票数据格式错误')
      return null
    }
    
    const parts = match[1].split(',')
    
    if (parts.length < 30) {
      console.warn('新浪股票数据字段不足')
      return null
    }
    
    const name = parts[0]
    const open = parseFloat(parts[1])        // 开盘价
    const lastClose = parseFloat(parts[2])   // 昨收价
    const price = parseFloat(parts[3])       // 当前价
    const high = parseFloat(parts[4])        // 最高价
    const low = parseFloat(parts[5])         // 最低价
    
    // 计算涨跌
    const change = price - lastClose
    const changePercent = lastClose > 0 ? (change / lastClose) * 100 : 0
    
    // 成交量和成交额
    const volume = parseFloat(parts[8])      // 成交量（手）
    const amount = parseFloat(parts[9])      // 成交额（万元）
    
    return {
      symbol,
      name,
      price,
      change,
      changePercent,
      volume,
      amount,
      high,
      low,
      open,
      lastClose,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('解析新浪股票数据失败:', error)
    return null
  }
}

/**
 * 批量获取股票数据
 */
export async function getBatchStockPrices(symbols: string[]): Promise<Record<string, StockPriceData>> {
  console.log(`📈 批量获取 ${symbols.length} 只股票数据`)
  
  const results: Record<string, StockPriceData> = {}
  const batchSize = 10 // 新浪API支持批量，但限制数量
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    
    try {
      // 转换为新浪格式
      const sinaSymbols = batch.map(s => s.startsWith('6') ? `sh${s}` : `sz${s}`)
      const url = `https://hq.sinajs.cn/list=${sinaSymbols.join(',')}`
      
      const response = await proxyRequest(url)
      
      if (typeof response === 'string') {
        // 新浪批量返回是多行数据
        const lines = response.split('\n')
        
        for (let j = 0; j < Math.min(lines.length, sinaSymbols.length); j++) {
          const line = lines[j]
          const symbol = sinaSymbols[j]
          
          if (line && line.includes('=')) {
            const stockData = parseSinaStockData(symbol, line)
            if (stockData) {
              results[batch[j]] = stockData
            }
          }
        }
      }
      
      // 避免请求过快
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
    } catch (error) {
      console.error(`批量获取股票数据失败（批次 ${i / batchSize + 1}）:`, error)
    }
  }
  
  return results
}

/**
 * 估算基金估值涨跌
 */
export async function estimateFundValuation(
  fundCode: string,
  fundName: string,
  holdings: FundHoldings
): Promise<FundValuation | null> {
  try {
    console.log(`📊 估算基金 ${fundCode} 估值涨跌`)
    
    // 获取所有持仓股票的实时数据
    const stockSymbols = holdings.stockList.map(stock => stock.code)
    const stockPrices = await getBatchStockPrices(stockSymbols)
    
    // 计算股票贡献
    const stockContributions = holdings.stockList.map(stock => {
      const priceData = stockPrices[stock.code]
      const changePercent = priceData ? priceData.changePercent : 0
      const contribution = (stock.weight / 100) * changePercent
      
      return {
        code: stock.code,
        name: stock.name,
        weight: stock.weight,
        changePercent,
        contribution
      }
    })
    
    // 计算加权涨跌幅
    const weightedChange = stockContributions.reduce((sum, sc) => sum + sc.contribution, 0)
    
    // 估算现金和其他资产贡献（假设不变）
    const cashContribution = 0 // 现金不涨跌
    const otherContribution = 0 // 其他资产假设不变
    
    // 总估算涨跌
    const estimatedChange = weightedChange + cashContribution + otherContribution
    
    return {
      fundCode,
      fundName,
      reportDate: holdings.reportDate,
      estimatedChange,
      weightedChange,
      cashContribution,
      otherContribution,
      stockContributions,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error(`估算基金 ${fundCode} 估值失败:`, error)
    return null
  }
}

/**
 * 获取基金完整数据（持仓 + 估值）
 */
export async function getCompleteFundData(code: string, name: string): Promise<{
  holdings: FundHoldings | null
  valuation: FundValuation | null
  success: boolean
  error?: string
}> {
  try {
    // 1. 获取真实持仓数据
    const holdings = await getRealFundHoldings(code, name)
    
    if (!holdings) {
      return {
        holdings: null,
        valuation: null,
        success: false,
        error: '获取持仓数据失败'
      }
    }
    
    // 2. 估算估值涨跌
    const valuation = await estimateFundValuation(code, name, holdings)
    
    return {
      holdings,
      valuation,
      success: true
    }
    
  } catch (error) {
    console.error(`获取基金 ${code} 完整数据失败:`, error)
    return {
      holdings: null,
      valuation: null,
      success: false,
      error: error.message
    }
  }
}

/**
 * 批量获取基金数据
 */
export async function getBatchFundData(fundList: Array<{code: string, name: string}>): Promise<Array<{
  code: string
  name: string
  holdings: FundHoldings | null
  valuation: FundValuation | null
  success: boolean
  error?: string
}>> {
  console.log(`📦 批量获取 ${fundList.length} 只基金数据`)
  
  const results = await Promise.allSettled(
    fundList.map(fund => getCompleteFundData(fund.code, fund.name))
  )
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        code: fundList[index].code,
        name: fundList[index].name,
        ...result.value
      }
    } else {
      return {
        code: fundList[index].code,
        name: fundList[index].name,
        holdings: null,
        valuation: null,
        success: false,
        error: result.reason?.message || '未知错误'
      }
    }
  })
}

/**
 * 测试服务连接
 */
export async function testServiceConnection(): Promise<{
  tiantianApi: boolean
  sinaApi: boolean
  proxyStatus: boolean
}> {
  const testResults = {
    tiantianApi: false,
    sinaApi: false,
    proxyStatus: false
  }
  
  try {
    // 测试天天基金API
    const tiantianUrl = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=003095'
    const tiantianResponse = await proxyRequest(tiantianUrl)
    testResults.tiantianApi = typeof tiantianResponse === 'string' && tiantianResponse.includes('apidata')
    
    // 测试新浪API
    const sinaUrl = 'https://hq.sinajs.cn/list=sh600519'
    const sinaResponse = await proxyRequest(sinaUrl)
    testResults.sinaApi = typeof sinaResponse === 'string' && sinaResponse.includes('贵州茅台')
    
    // 测试代理状态
    testResults.proxyStatus = testResults.tiantianApi || testResults.sinaApi
    
  } catch (error) {
    console.error('服务连接测试失败:', error)
  }
  
  return testResults
}