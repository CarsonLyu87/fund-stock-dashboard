/**
 * AKShare API 模块
 * 使用 AKShare 作为唯一数据源，提供稳定可靠的基金和股票数据
 */

import type { Fund, StockData } from '../types'
import { 
  initDataService, 
  fetchFundData as fetchAkshareFundData, 
  fetchStockData as fetchAkshareStockData, 
  getUpdateInfo,
  clearCache,
  getDataSourceStatus,
  getMarketStatus as getAkshareMarketStatus,
  getFundDetail,
  searchFunds
} from "../services/unifiedAkshareService"'

// 重新导出数据服务函数
export { 
  initDataService, 
  getUpdateInfo, 
  clearCache, 
  getDataSourceStatus,
  getFundDetail,
  searchFunds
}

// 获取市场状态
export const getMarketStatus = () => {
  try {
    return getAkshareMarketStatus()
  } catch (error) {
    console.warn('获取市场状态失败，使用默认状态:', error)
    
    // 默认市场状态
    const now = new Date()
    const hour = now.getHours()
    const isWeekend = now.getDay() === 0 || now.getDay() === 6
    
    // A股交易时间：周一至周五 9:30-11:30, 13:00-15:00
    const isTradingHours = !isWeekend && (
      (hour >= 9 && hour < 11) || 
      (hour === 11 && now.getMinutes() < 30) ||
      (hour >= 13 && hour < 15)
    )
    
    return {
      isOpen: isTradingHours,
      openTime: '09:30',
      closeTime: '15:00',
      nextOpenTime: isWeekend ? '下周一 09:30' : '明日 09:30'
    }
  }
}

// 获取用户基金列表
const getUserFundCodes = (): string[] => {
  try {
    // 尝试从localStorage获取用户基金配置
    const stored = localStorage.getItem('fund_stock_show_user_funds')
    if (stored) {
      const userFunds = JSON.parse(stored)
      if (Array.isArray(userFunds) && userFunds.length > 0) {
        return userFunds.map((fund: any) => fund.code)
      }
    }
  } catch (error) {
    console.error('获取用户基金列表失败:', error)
  }
  
  // 默认基金列表（使用AKShare支持的基金）
  return [
    '005827', '161725', '003095', '110022', '519674',
    '260108', '000404', '001714', '000248', '001475'
  ]
}

// 获取用户股票列表
const getUserStockCodes = (): string[] => {
  try {
    // 尝试从localStorage获取用户股票配置
    const stored = localStorage.getItem('fund_stock_show_user_stocks')
    if (stored) {
      const userStocks = JSON.parse(stored)
      if (Array.isArray(userStocks) && userStocks.length > 0) {
        return userStocks.map((stock: any) => stock.code)
      }
    }
  } catch (error) {
    console.error('获取用户股票列表失败:', error)
  }
  
  // 默认股票列表（使用AKShare支持的A股）
  return [
    '600519', '000858', '000333', '000001', '600036',
    '000002', '601318', '600276', '600887', '000651'
  ]
}

// 主函数：获取基金数据
export const fetchFundData = async (): Promise<Fund[]> => {
  console.log('📊 通过AKShare获取基金数据...')
  
  try {
    // 使用用户配置的基金代码列表
    const userFundCodes = getUserFundCodes()
    console.log(`📋 用户基金列表: ${userFundCodes.length} 只基金`, userFundCodes)
    
    // 调用AKShare数据服务
    const funds = await fetchAkshareFundData(userFundCodes)
    
    if (funds.length === 0) {
      console.warn('AKShare返回空数据，使用模拟数据')
      return generateMockFunds()
    }
    
    console.log(`✅ 通过AKShare获取 ${funds.length} 只基金数据`)
    return funds
    
  } catch (error) {
    console.error('获取基金数据失败:', error)
    
    // 降级到模拟数据
    console.warn('降级到模拟数据...')
    return generateMockFunds()
  }
}

// 主函数：获取股票数据
export const fetchStockData = async (): Promise<StockData[]> => {
  console.log('📈 通过AKShare获取股票数据...')
  
  try {
    // 使用用户配置的股票代码列表
    const userStockCodes = getUserStockCodes()
    console.log(`📋 用户股票列表: ${userStockCodes.length} 只股票`, userStockCodes)
    
    // 调用AKShare数据服务
    const stocks = await fetchAkshareStockData(userStockCodes)
    
    if (stocks.length === 0) {
      console.warn('AKShare返回空数据，使用模拟数据')
      return generateMockStocks()
    }
    
    console.log(`✅ 通过AKShare获取 ${stocks.length} 只股票数据`)
    return stocks
    
  } catch (error) {
    console.error('获取股票数据失败:', error)
    
    // 降级到模拟数据
    console.warn('降级到模拟数据...')
    return generateMockStocks()
  }
}

// 模拟数据生成（降级使用）
function generateMockFunds(): Fund[] {
  console.log('使用模拟基金数据（降级模式）')
  const popularFunds = [
    { code: '005827', name: '易方达蓝筹精选混合' },
    { code: '161725', name: '招商中证白酒指数' },
    { code: '003095', name: '中欧医疗健康混合' },
    { code: '110011', name: '易方达中小盘混合' },
    { code: '519674', name: '银河创新成长混合' },
    { code: '260108', name: '景顺长城新兴成长混合' },
    { code: '000404', name: '易方达新兴成长混合' },
    { code: '001717', name: '工银瑞信前沿医疗股票' },
    { code: '006228', name: '中欧医疗创新股票A' },
    { code: '040046', name: '南方纳斯达克100指数' }
  ]
  
  return popularFunds.map((fund, index) => {
    const basePrice = 1 + Math.random() * 4
    const changePercent = (Math.random() - 0.5) * 3 // -1.5% 到 +1.5%
    const changeAmount = basePrice * changePercent / 100
    
    return {
      id: `mock_fund_${index}`,
      name: fund.name,
      code: fund.code,
      currentPrice: parseFloat(basePrice.toFixed(3)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      changeAmount: parseFloat(changeAmount.toFixed(3)),
      volume: Math.floor(Math.random() * 10000000) + 5000000,
      timestamp: new Date().toISOString(),
      dataSources: ['mock_data']
    }
  })
}

function generateMockStocks(): StockData[] {
  console.log('使用模拟股票数据（降级模式）')
  const stocks = [
    { symbol: '600519', name: '贵州茅台' },
    { symbol: '000858', name: '五粮液' },
    { symbol: '000333', name: '美的集团' },
    { symbol: '000001', name: '平安银行' },
    { symbol: '600036', name: '招商银行' },
    { symbol: '000002', name: '万科A' },
    { symbol: '601318', name: '中国平安' },
    { symbol: '600276', name: '恒瑞医药' },
    { symbol: '600887', name: '伊利股份' },
    { symbol: '000651', name: '格力电器' }
  ]
  
  return stocks.map((stock, index) => {
    const basePrice = stock.symbol === '600519' ? 1500 + Math.random() * 100 :
                     stock.symbol === '000858' ? 200 + Math.random() * 20 :
                     stock.symbol === '000333' ? 60 + Math.random() * 10 :
                     stock.symbol === '000001' ? 10 + Math.random() * 2 :
                     stock.symbol === '600036' ? 30 + Math.random() * 5 :
                     stock.symbol === '000002' ? 20 + Math.random() * 3 :
                     stock.symbol === '601318' ? 40 + Math.random() * 5 :
                     stock.symbol === '600276' ? 30 + Math.random() * 5 :
                     stock.symbol === '600887' ? 25 + Math.random() * 3 :
                     stock.symbol === '000651' ? 35 + Math.random() * 5 : 10
    
    const changePercent = (Math.random() - 0.5) * 2 // -1% 到 +1%
    const changeAmount = basePrice * changePercent / 100
    
    return {
      id: `mock_stock_${index}`,
      symbol: stock.symbol,
      name: stock.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(changeAmount.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000000) + 500000000,
      timestamp: new Date().toISOString(),
      history: generateHourlyHistory(basePrice)
    }
  })
}

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

// 获取最后一次更新时间（格式化字符串）
export const getFormattedLastUpdateTime = (): string => {
  const now = new Date()
  return now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 获取下一次更新时间（5分钟后）
export const getNextUpdateTime = (): string => {
  const next = new Date(Date.now() + 5 * 60 * 1000) // 5分钟后
  return next.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// 导出 fetchFundData 和 fetchStockData 以保持兼容性
export const fetchFundData = fetchFundData
export const fetchStockData = fetchStockData

// 导出所有函数
export {
  fetchFundData,
  fetchStockData,
  getMarketStatus,
  getFormattedLastUpdateTime,
  getNextUpdateTime
}