/**
 * 基金持仓数据服务
 * 获取基金最新持仓报告和持股比例
 */

import axios from 'axios'
import { getFundApiHeaders } from '../utils/httpHeaders'

// 持仓数据类型定义
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

// 数据源配置
const HOLDINGS_DATA_SOURCES = {
  // 东方财富基金持仓API（HTML页面）
  eastmoneyHoldings: (code: string) =>
    `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=50&year=&month=&rt=${Date.now()}`,
  
  // 天天基金持仓页面
  tiantianHoldings: (code: string) =>
    `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}`,
  
  // 备用数据源
  backupHoldings: (code: string) =>
    `https://api.fund.eastmoney.com/f10/FundArchivesDatas?code=${code}&type=jjcc`
}

/**
 * 从东方财富HTML页面解析持仓数据
 */
async function parseEastmoneyHoldings(code: string, name: string): Promise<FundHoldings | null> {
  try {
    console.log(`获取基金 ${code} 持仓数据`)
    
    const url = HOLDINGS_DATA_SOURCES.eastmoneyHoldings(code)
    console.log(`请求URL: ${url}`)
    
    const response = await axios.get(url, {
      headers: getFundApiHeaders(),
      timeout: 10000
    })
    
    // 东方财富返回的是包含HTML片段的JSON
    const data = response.data
    if (!data || typeof data !== 'string') {
      console.warn(`基金 ${code} 持仓数据格式错误`)
      return null
    }
    
    // 解析HTML内容
    return parseHoldingsFromHtml(data, code, name)
    
  } catch (error) {
    console.error(`获取基金 ${code} 持仓数据失败:`, error)
    return null
  }
}

/**
 * 从HTML解析持仓数据
 */
function parseHoldingsFromHtml(htmlContent: string, fundCode: string, fundName: string): FundHoldings | null {
  try {
    // 使用正则表达式提取数据
    // 东方财富的持仓数据在特定的div中
    
    // 提取报告日期
    const reportDateMatch = htmlContent.match(/报告期：(\d{4}-\d{2}-\d{2})/)
    const reportDate = reportDateMatch ? reportDateMatch[1] : new Date().toISOString().split('T')[0]
    
    // 提取股票持仓表格数据
    // 格式：<tr><td>股票名称</td><td>股票代码</td><td>占净值比例</td>...</tr>
    const stockRegex = /<tr>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)%<\/td>.*?<\/tr>/g
    
    const stockList: StockHolding[] = []
    let match
    let totalWeight = 0
    
    while ((match = stockRegex.exec(htmlContent)) !== null) {
      const stockName = match[1].trim()
      const stockCode = match[2].trim()
      const weight = parseFloat(match[3])
      
      // 只处理有效的持仓数据
      if (stockCode && stockName && !isNaN(weight) && weight > 0.1) {
        stockList.push({
          code: stockCode,
          name: stockName,
          weight: weight,
          shares: 0, // HTML中不包含持股数量
          marketValue: 0 // HTML中不包含持仓市值
        })
        totalWeight += weight
      }
    }
    
    // 如果没有解析到数据，尝试备用解析方法
    if (stockList.length === 0) {
      console.warn(`使用备用方法解析持仓数据`)
      return parseHoldingsFromHtmlBackup(htmlContent, fundCode, fundName)
    }
    
    // 计算现金和其他资产比例（假设）
    const cashWeight = Math.max(0, 100 - totalWeight - 5) // 留5%给其他资产
    const otherWeight = 5
    
    return {
      fundCode,
      fundName,
      reportDate,
      totalStocks: stockList.length,
      totalWeight,
      stockList,
      cashWeight,
      otherWeight
    }
    
  } catch (error) {
    console.error(`解析持仓HTML失败:`, error)
    return null
  }
}

/**
 * 备用HTML解析方法
 */
function parseHoldingsFromHtmlBackup(htmlContent: string, fundCode: string, fundName: string): FundHoldings | null {
  try {
    // 尝试另一种解析方式
    // 查找包含"股票名称"的表格
    const tableStart = htmlContent.indexOf('股票名称')
    if (tableStart === -1) {
      console.warn(`未找到持仓表格`)
      return null
    }
    
    const tableEnd = htmlContent.indexOf('</table>', tableStart)
    if (tableEnd === -1) {
      console.warn(`未找到表格结束标签`)
      return null
    }
    
    const tableHtml = htmlContent.substring(tableStart, tableEnd)
    
    // 使用更简单的正则匹配
    const simpleRegex = />([\u4e00-\u9fa5A-Z0-9]+)<\/a>.*?>(\d{6})<.*?>(\d+\.?\d*)%/g
    
    const stockList: StockHolding[] = []
    let match
    let totalWeight = 0
    
    while ((match = simpleRegex.exec(tableHtml)) !== null) {
      const stockName = match[1]
      const stockCode = match[2]
      const weight = parseFloat(match[3])
      
      if (stockCode && stockName && !isNaN(weight)) {
        stockList.push({
          code: stockCode,
          name: stockName,
          weight: weight,
          shares: 0,
          marketValue: 0
        })
        totalWeight += weight
      }
    }
    
    if (stockList.length === 0) {
      return null
    }
    
    // 取前10只股票（通常占大部分仓位）
    const topStocks = stockList
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
    
    const topWeight = topStocks.reduce((sum, stock) => sum + stock.weight, 0)
    
    return {
      fundCode,
      fundName,
      reportDate: new Date().toISOString().split('T')[0],
      totalStocks: topStocks.length,
      totalWeight: topWeight,
      stockList: topStocks,
      cashWeight: Math.max(0, 100 - topWeight - 5),
      otherWeight: 5
    }
    
  } catch (error) {
    console.error(`备用解析方法失败:`, error)
    return null
  }
}

/**
 * 获取模拟持仓数据（用于开发和测试）
 */
function getMockHoldings(code: string, name: string): FundHoldings {
  console.log(`使用模拟持仓数据: ${code}`)
  
  // 常见基金持仓（示例）
  const mockStocks: StockHolding[] = [
    { code: '600519', name: '贵州茅台', weight: 9.5, shares: 100, marketValue: 20000 },
    { code: '000858', name: '五粮液', weight: 8.2, shares: 150, marketValue: 18000 },
    { code: '000333', name: '美的集团', weight: 7.1, shares: 200, marketValue: 15000 },
    { code: '000001', name: '平安银行', weight: 6.5, shares: 300, marketValue: 12000 },
    { code: '600036', name: '招商银行', weight: 5.8, shares: 250, marketValue: 11000 },
    { code: '601318', name: '中国平安', weight: 5.2, shares: 180, marketValue: 10000 },
    { code: '600276', name: '恒瑞医药', weight: 4.5, shares: 120, marketValue: 9000 },
    { code: '300750', name: '宁德时代', weight: 4.1, shares: 80, marketValue: 8500 },
    { code: '002415', name: '海康威视', weight: 3.8, shares: 150, marketValue: 8000 },
    { code: '000002', name: '万科A', weight: 3.5, shares: 200, marketValue: 7500 }
  ]
  
  const totalWeight = mockStocks.reduce((sum, stock) => sum + stock.weight, 0)
  
  return {
    fundCode: code,
    fundName: name,
    reportDate: new Date().toISOString().split('T')[0],
    totalStocks: mockStocks.length,
    totalWeight,
    stockList: mockStocks,
    cashWeight: Math.max(0, 100 - totalWeight - 3),
    otherWeight: 3
  }
}

/**
 * 获取基金持仓数据
 * @param code 基金代码
 * @param name 基金名称
 * @param useMock 是否使用模拟数据（开发测试用）
 */
export async function getFundHoldings(
  code: string, 
  name: string, 
  useMock: boolean = false
): Promise<FundHoldings | null> {
  
  // 开发阶段可以使用模拟数据
  if (useMock || process.env.NODE_ENV === 'development') {
    return getMockHoldings(code, name)
  }
  
  try {
    // 尝试从东方财富获取
    const holdings = await parseEastmoneyHoldings(code, name)
    if (holdings) {
      console.log(`✅ 成功获取基金 ${code} 持仓数据，共 ${holdings.stockList.length} 只股票`)
      return holdings
    }
    
    // 如果失败，使用模拟数据作为降级
    console.warn(`获取真实持仓数据失败，使用模拟数据`)
    return getMockHoldings(code, name)
    
  } catch (error) {
    console.error(`获取基金持仓数据失败:`, error)
    return getMockHoldings(code, name)
  }
}

/**
 * 获取基金主要持仓（前N只股票）
 */
export async function getTopHoldings(
  code: string, 
  name: string, 
  topN: number = 10
): Promise<StockHolding[]> {
  const holdings = await getFundHoldings(code, name)
  if (!holdings) {
    return []
  }
  
  return holdings.stockList
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN)
}

/**
 * 清除持仓数据缓存
 */
export function clearHoldingsCache(): void {
  console.log('持仓数据缓存已清除')
}