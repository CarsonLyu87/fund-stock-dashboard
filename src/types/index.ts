export interface Fund {
  id: string
  name: string
  code: string
  currentPrice: number
  changePercent: number
  changeAmount: number
  volume: number
  timestamp: string
  
  // 新增字段 - 官方净值相关
  accumulatedValue?: number      // 累计净值
  netValueDate?: string          // 净值日期
  
  // 新增字段 - 实时估值相关
  estimatedValue?: number        // 实时估值
  estimatedChangePercent?: number // 实时估值涨跌幅
  
  // 新增字段 - 持仓估值相关
  portfolioCalculatedValue?: number      // 持仓计算净值
  portfolioCalculatedChangePercent?: number // 持仓计算涨跌幅
  portfolioConfidence?: number           // 持仓计算置信度 (0-1)
  portfolioStockCount?: number           // 持仓股票数量
  valuationDifference?: number           // 估值差异 (持仓 vs API)
  
  // 数据来源标记
  dataSources?: string[]         // 数据来源列表
}

export interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
  history?: {
    time: string
    price: number
  }[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}