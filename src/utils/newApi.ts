/**
 * 新API模块 - 使用 AKshare 和东方财富实时行情
 * 替换原有的模拟数据，使用真实数据源
 */

import type { Fund, StockData } from '../types'
import { 
  initDataService, 
  fetchFundData, 
  fetchStockData, 
  getUpdateInfo,
  clearCache,
  getDataSourceStatus,
  getMarketStatus as getNewMarketStatus
} from '../services/newDataService'

// 重新导出数据服务函数
export { 
  initDataService, 
  fetchFundData, 
  fetchStockData, 
  getUpdateInfo, 
  clearCache, 
  getDataSourceStatus 
}

// 获取市场状态
export const getMarketStatus = () => {
  try {
    return getNewMarketStatus()
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
  
  // 默认基金列表
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
  
  // 默认股票列表
  return [
    '600519', '000858', '000333', '000001', '600036',
    '000002', '601318', '600276', '600887', '000651'
  ]
}

// 主函数：获取基金数据（兼容现有接口）
export const getFundData = async (): Promise<Fund[]> => {
  console.log('💰 获取基金数据（新数据服务）...')
  
  try {
    const userFundCodes = getUserFundCodes()
    console.log(`📋 用户基金列表: ${userFundCodes.length} 只基金`)
    
    const funds = await fetchFundData(userFundCodes)
    console.log(`✅ 获取 ${funds.length} 只基金数据`)
    
    return funds
    
  } catch (error) {
    console.error('❌ 获取基金数据失败:', error)
    
    // 降级到模拟数据
    console.warn('降级到模拟数据...')
    return generateMockFunds()
  }
}

// 主函数：获取股票数据（兼容现有接口）
export const getStockData = async (): Promise<StockData[]> => {
  console.log('📈 获取股票数据（新数据服务）...')
  
  try {
    const userStockCodes = getUserStockCodes()
    console.log(`📋 用户股票列表: ${userStockCodes.length} 只股票`)
    
    const stocks = await fetchStockData(userStockCodes)
    console.log(`✅ 获取 ${stocks.length} 只股票数据`)
    
    return stocks
    
  } catch (error) {
    console.error('❌ 获取股票数据失败:', error)
    
    // 降级到模拟数据
    console.warn('降级到模拟数据...')
    return generateMockStocks()
  }
}

// 获取最后一次更新时间（格式化字符串）
export const getFormattedLastUpdateTime = (): string => {
  const updateInfo = getUpdateInfo()
  const lastUpdate = new Date(updateInfo.lastUpdate)
  
  return lastUpdate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 获取下一次更新时间（30分钟后）
export const getNextUpdateTime = (): string => {
  const next = new Date(Date.now() + 30 * 60 * 1000) // 30分钟后
  return next.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// 模拟数据生成（降级使用）
function generateMockFunds(): Fund[] {
  console.log('使用模拟基金数据（降级模式）')
  
  const popularFunds = [
    { code: '005827', name: '易方达蓝筹精选混合' },
    { code: '161725', name: '招商中证白酒指数' },
    { code: '003095', name: '中欧医疗健康混合' },
    { code: '110011', name: '易方达中小盘混合' },
    { code: '519674', name: '银河创新成长混合' }
  ]
  
  return popularFunds.map((fund, index) => {
    const basePrice = 1 + Math.random() * 4
    const changePercent = (Math.random() - 0.5) * 3
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
    { code: '600519', name: '贵州茅台', symbol: 'sh600519' },
    { code: '000858', name: '五粮液', symbol: 'sz000858' },
    { code: '000333', name: '美的集团', symbol: 'sz000333' },
    { code: '000001', name: '平安银行', symbol: 'sz000001' },
    { code: '600036', name: '招商银行', symbol: 'sh600036' }
  ]
  
  return stocks.map((stock, index) => {
    const basePrice = stock.code === '600519' ? 1760 + Math.random() * 20 :
                     stock.code === '000858' ? 145 + Math.random() * 5 :
                     stock.code === '000333' ? 58 + Math.random() * 2 :
                     stock.code === '000001' ? 12 + Math.random() * 0.5 :
                     stock.code === '600036' ? 35 + Math.random() * 1 : 10
    
    const changePercent = (Math.random() - 0.5) * 2
    const changeAmount = basePrice * changePercent / 100
    
    return {
      id: `mock_stock_${index}`,
      symbol: stock.symbol,
      name: stock.name,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(changeAmount.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 100000000) + 50000000,
      timestamp: new Date().toISOString(),
      history: generateHourlyHistory(basePrice),
      dataSources: ['mock_data']
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

// 兼容现有接口的别名
// 注意：fetchFundData 和 fetchStockData 已经在顶部从 newDataService 导出
// 这里不再重复导出，避免冲突