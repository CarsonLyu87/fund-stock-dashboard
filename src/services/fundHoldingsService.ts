/**
 * 基金持仓数据服务
 * 获取基金最新持仓报告和持股比例
 */

import axios from 'axios'
import { getFundApiHeaders } from '../utils/httpHeaders'
import { getRealFundHoldings } from './realFundHoldingsService'

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
    const response = await axios.get(url, {
      headers: getFundApiHeaders(),
      timeout: 10000
    })
    
    if (response.status !== 200 || !response.data) {
      console.warn(`获取持仓数据失败: HTTP ${response.status}`)
      return null
    }
    
    // 提取JSON数据
    const jsonMatch = response.data.match(/var apidata=\s*({.*?});/)
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
      cashWeight: Math.max(0, 100 - totalWeight - 5),
      otherWeight: 5
    }
    
  } catch (error) {
    console.error(`解析持仓数据失败:`, error)
    return null
  }
}

/**
 * 获取基金持仓数据
 * @param code 基金代码
 * @param name 基金名称
 */
export async function getFundHoldings(
  code: string, 
  name: string
): Promise<FundHoldings | null> {
  
  console.log(`📊 获取基金 ${code} 持仓数据`)
  
  try {
    // 优先使用真实数据服务
    const realHoldings = await getRealFundHoldings(code, name)
    if (realHoldings) {
      return realHoldings
    }
    
    // 备用方案：使用原解析方法
    return await parseEastmoneyHoldings(code, name)
    
  } catch (error) {
    console.error(`获取基金 ${code} 持仓数据失败:`, error)
    return null
  }
}

/**
 * 批量获取基金持仓数据
 */
export async function getMultipleFundHoldings(
  fundList: Array<{code: string, name: string}>
): Promise<Array<FundHoldings | null>> {
  
  console.log(`📦 批量获取 ${fundList.length} 只基金持仓数据`)
  
  const promises = fundList.map(fund => 
    getFundHoldings(fund.code, fund.name)
  )
  
  const results = await Promise.allSettled(promises)
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : null
  )
}

/**
 * 测试持仓数据服务
 */
export async function testHoldingsService(): Promise<boolean> {
  try {
    const holdings = await getFundHoldings('003095', '中欧医疗健康混合A')
    return !!holdings && holdings.stockList.length > 0
  } catch (error) {
    console.error('持仓数据服务测试失败:', error)
    return false
  }
}
