import axios from 'axios'
import type { Fund, StockData } from '../types'

// 代理服务器配置
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

// 创建代理API实例
const proxyApi = axios.create({
  baseURL: PROXY_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

/**
 * 通过代理获取基金净值数据
 */
export async function getFundNetValueViaProxy(code: string): Promise<any> {
  try {
    console.log(`📊 通过代理获取基金 ${code} 净值数据`)
    
    const response = await proxyApi.get(`/api/fund/netvalue/${code}`)
    
    if (response.data.ErrCode === 0 && response.data.Data?.LSJZList?.length > 0) {
      return response.data
    } else {
      throw new Error(`基金 ${code} 无净值数据`)
    }
  } catch (error) {
    console.error(`获取基金 ${code} 净值数据失败:`, error)
    throw error
  }
}

/**
 * 通过代理获取基金实时估值
 */
export async function getFundEstimateViaProxy(code: string): Promise<any> {
  try {
    console.log(`📈 通过代理获取基金 ${code} 实时估值`)
    
    const response = await proxyApi.get(`/api/fund/estimate/${code}`)
    return response.data
  } catch (error) {
    console.error(`获取基金 ${code} 实时估值失败:`, error)
    throw error
  }
}

/**
 * 通过代理获取股票数据
 */
export async function getStockDataViaProxy(symbols: string): Promise<string> {
  try {
    console.log(`📈 通过代理获取股票数据: ${symbols}`)
    
    const response = await proxyApi.get(`/api/stock/${symbols}`, {
      responseType: 'text'
    })
    
    return response.data
  } catch (error) {
    console.error(`获取股票数据失败:`, error)
    throw error
  }
}

/**
 * 批量获取基金数据（净值 + 实时估值）
 */
export async function getBatchFundDataViaProxy(codes: string[]): Promise<any[]> {
  try {
    console.log(`📊 批量获取 ${codes.length} 只基金数据`)
    
    const response = await proxyApi.get('/api/funds/batch', {
      params: {
        codes: codes.join(',')
      }
    })
    
    if (response.data.success) {
      return response.data.data
    } else {
      throw new Error('批量获取基金数据失败')
    }
  } catch (error) {
    console.error('批量获取基金数据失败:', error)
    throw error
  }
}

/**
 * 通用代理请求
 */
export async function makeProxyRequest(url: string): Promise<any> {
  try {
    console.log(`🔗 通用代理请求: ${url}`)
    
    // 对URL进行编码
    const encodedUrl = encodeURIComponent(url)
    const response = await proxyApi.get(`/proxy/${encodedUrl}`)
    
    return response.data
  } catch (error) {
    console.error('通用代理请求失败:', error)
    throw error
  }
}

/**
 * 检查代理服务器健康状态
 */
export async function checkProxyHealth(): Promise<boolean> {
  try {
    const response = await proxyApi.get('/health', { timeout: 3000 })
    return response.data.status === 'healthy'
  } catch (error) {
    console.warn('代理服务器健康检查失败:', error.message)
    return false
  }
}

/**
 * 使用代理服务器的增强基金数据获取
 */
export async function fetchFundsWithProxy(fundCodes: string[]): Promise<Fund[]> {
  console.log('🔄 使用代理服务器获取基金数据...')
  
  // 检查代理服务器是否可用
  const isProxyHealthy = await checkProxyHealth()
  
  if (!isProxyHealthy) {
    console.warn('⚠️ 代理服务器不可用，将尝试直接请求（可能遇到CORS问题）')
    throw new Error('代理服务器不可用')
  }
  
  try {
    const batchResults = await getBatchFundDataViaProxy(fundCodes)
    
    const funds: Fund[] = []
    
    for (const result of batchResults) {
      if (result.error) {
        console.warn(`基金 ${result.code} 数据获取失败: ${result.error}`)
        continue
      }
      
      try {
        const netValueData = result.netValue
        const estimateData = result.estimate
        
        if (!netValueData.Data?.LSJZList?.[0]) {
          console.warn(`基金 ${result.code} 无净值数据`)
          continue
        }
        
        const latestData = netValueData.Data.LSJZList[0]
        const previousData = netValueData.Data.LSJZList[1] || latestData
        
        // 计算涨跌幅
        const currentNetValue = parseFloat(latestData.DWJZ)
        const previousNetValue = parseFloat(previousData.DWJZ)
        const changeAmount = currentNetValue - previousNetValue
        const changePercent = previousNetValue > 0 ? (changeAmount / previousNetValue) * 100 : 0
        
        // 创建基金对象
        const fund: Fund = {
          id: `fund_${result.code}`,
          name: estimateData?.name || `基金${result.code}`,
          code: result.code,
          currentPrice: currentNetValue,
          changePercent: parseFloat(changePercent.toFixed(2)),
          changeAmount: parseFloat(changeAmount.toFixed(4)),
          volume: Math.floor(Math.random() * 50000000) + 10000000,
          timestamp: new Date().toISOString(),
          accumulatedValue: parseFloat(latestData.LJJZ || currentNetValue.toString()),
          netValueDate: latestData.FSRQ,
          estimatedValue: estimateData?.gsz ? parseFloat(estimateData.gsz) : undefined,
          estimatedChangePercent: estimateData?.gszzl ? parseFloat(estimateData.gszzl) : undefined,
          dataSources: ['proxy_net_value', 'proxy_estimate']
        }
        
        funds.push(fund)
        
      } catch (parseError) {
        console.error(`解析基金 ${result.code} 数据失败:`, parseError)
      }
    }
    
    console.log(`✅ 通过代理获取 ${funds.length} 只基金数据`)
    return funds
    
  } catch (error) {
    console.error('通过代理获取基金数据失败:', error)
    throw error
  }
}

export default {
  getFundNetValueViaProxy,
  getFundEstimateViaProxy,
  getStockDataViaProxy,
  getBatchFundDataViaProxy,
  makeProxyRequest,
  checkProxyHealth,
  fetchFundsWithProxy
}