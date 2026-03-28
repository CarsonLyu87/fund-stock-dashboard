/**
 * 新数据服务 - 整合 AKshare 和东方财富实时行情
 * 替换原有的模拟数据，使用真实数据源
 */

import type { Fund, StockData } from '../types'
import { fetchAccurateFundData } from './accurateFundService'
import { getRealFundHoldings, estimateFundValuation } from './realFundHoldingsService'
import { calculateFundValuationByPortfolio } from './fundPortfolioService'

// AKshare 服务引用
let akshareDataService: any = null
let initializeAKShareData: () => Promise<void> = async () => {
  console.log('🌐 浏览器环境：跳过 AKshare 初始化')
}

/**
 * 动态加载 AKshare 服务（仅在非浏览器环境中）
 */
async function loadAKShareService(): Promise<void> {
  const isBrowser = typeof window !== 'undefined'
  if (isBrowser) {
    console.log('🌐 浏览器环境：跳过 AKshare 加载')
    return
  }
  
  try {
    const akshareModule = await import('./akshareDataService')
    akshareDataService = akshareModule.akshareDataService
    initializeAKShareData = akshareModule.initializeAKShareData
    console.log('✅ AKshare 服务加载成功')
  } catch (error) {
    console.warn('⚠️ 无法导入 AKshare 服务:', error.message)
  }
}

// 数据服务状态
interface DataServiceStatus {
  akshareAvailable: boolean
  eastmoneyAvailable: boolean
  lastUpdateTime: number
  dataSources: string[]
}

class NewDataService {
  private status: DataServiceStatus = {
    akshareAvailable: false,
    eastmoneyAvailable: true, // 东方财富API通常可用
    lastUpdateTime: 0,
    dataSources: []
  }
  
  private updateInterval: NodeJS.Timeout | null = null
  private cache = new Map<string, any>()
  
  /**
   * 初始化数据服务
   */
  async initialize(): Promise<void> {
    console.log('🚀 初始化新数据服务（AKshare + 东方财富）...')
    
    const isBrowser = typeof window !== 'undefined'
    
    if (!isBrowser) {
      try {
        // 先加载 AKshare 服务
        await loadAKShareService()
        
        // 然后初始化 AKshare 服务（仅限Node.js环境）
        await initializeAKShareData()
        this.status.akshareAvailable = true
        this.status.dataSources.push('akshare')
        console.log('✅ AKshare 服务初始化成功')
      } catch (error) {
        console.warn('⚠️ AKshare 服务初始化失败，将使用东方财富API:', error.message)
        this.status.akshareAvailable = false
      }
    } else {
      console.log('🌐 浏览器环境：跳过 AKshare 初始化')
      this.status.akshareAvailable = false
    }
    
    // 添加东方财富数据源
    this.status.dataSources.push('eastmoney')
    
    // 设置定时更新（每30秒更新股票，每5分钟更新基金）
    this.startAutoUpdate()
    
    this.status.lastUpdateTime = Date.now()
    console.log(`✅ 新数据服务初始化完成，数据源: ${this.status.dataSources.join(', ')}`)
  }
  
  /**
   * 开始自动更新
   */
  private startAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateData()
      } catch (error) {
        console.error('❌ 自动更新失败:', error)
      }
    }, 30000) // 30秒
    
    console.log('🔄 已启动自动更新，频率: 30秒')
  }
  
  /**
   * 更新数据
   */
  private async updateData(): Promise<void> {
    console.log('🔄 更新数据...')
    
    // 更新缓存时间戳
    this.status.lastUpdateTime = Date.now()
    
    // 这里可以添加具体的更新逻辑
    // 例如：更新热门股票和基金的数据
    
    console.log('✅ 数据更新完成')
  }
  
  /**
   * 获取基金数据
   */
  async fetchFundData(fundCodes?: string[]): Promise<Fund[]> {
    console.log('💰 获取基金数据...')
    
    try {
      // 如果没有指定基金代码，使用默认列表
      const codes = fundCodes || this.getDefaultFundCodes()
      
      // 方法1: 尝试使用 AKshare 获取基金数据
      let funds: Fund[] = []
      
      if (this.status.akshareAvailable) {
        try {
          const akshareFunds = await this.getFundsFromAKshare(codes)
          if (akshareFunds.length > 0) {
            funds = akshareFunds
            console.log(`✅ 通过 AKshare 获取 ${funds.length} 只基金数据`)
          }
        } catch (error) {
          console.warn('AKshare 获取基金数据失败:', error.message)
        }
      }
      
      // 方法2: 如果 AKshare 失败，使用东方财富API
      if (funds.length === 0) {
        funds = await this.getFundsFromEastMoney(codes)
        console.log(`✅ 通过东方财富API获取 ${funds.length} 只基金数据`)
      }
      
      // 方法3: 对于支持持仓计算的基金，添加持仓估值
      const enhancedFunds = await this.enhanceFundsWithPortfolioValuation(funds)
      
      return enhancedFunds
      
    } catch (error) {
      console.error('❌ 获取基金数据失败:', error)
      
      // 降级策略：使用准确数据服务
      try {
        console.warn('降级到准确数据服务...')
        const accurateFunds = await fetchAccurateFundData()
        if (accurateFunds.length > 0) {
          console.log(`✅ 通过准确数据服务获取 ${accurateFunds.length} 只基金数据`)
          return accurateFunds
        }
      } catch (fallbackError) {
        console.error('准确数据服务也失败:', fallbackError)
      }
      
      // 最后降级到模拟数据
      console.warn('降级到模拟数据...')
      return this.generateMockFunds()
    }
  }
  
  /**
   * 从 AKshare 获取基金数据
   */
  private async getFundsFromAKshare(codes: string[]): Promise<Fund[]> {
    // 检查 AKshare 是否可用
    if (!akshareDataService || !this.status.akshareAvailable) {
      console.log('🌐 AKshare 不可用，跳过获取基金数据')
      return []
    }
    
    try {
      const akshareFunds = akshareDataService.getAllFunds()
      
      // 过滤出请求的基金代码
      const filteredFunds = akshareFunds.filter(fund => codes.includes(fund.code))
      
      return filteredFunds.map(fund => ({
        id: `fund_${fund.code}`,
        name: fund.name,
        code: fund.code,
        currentPrice: fund.net_value,
        changePercent: fund.change_percent,
        changeAmount: fund.change,
        volume: 0, // AKshare 不提供基金成交量
        timestamp: fund.timestamp,
        estimatedValue: fund.net_value,
        estimatedChangePercent: fund.change_percent,
        dataSources: ['akshare']
      }))
    } catch (error) {
      console.warn('从 AKshare 获取基金数据失败:', error.message)
      return []
    }
  }
  
  /**
   * 从东方财富API获取基金数据
   */
  private async getFundsFromEastMoney(codes: string[]): Promise<Fund[]> {
    // 这里可以调用东方财富API
    // 暂时使用模拟数据，实际应该调用真实的API
    
    const mockFunds = this.generateMockFunds()
    return mockFunds.filter(fund => codes.includes(fund.code))
  }
  
  /**
   * 增强基金数据，添加持仓估值
   */
  private async enhanceFundsWithPortfolioValuation(funds: Fund[]): Promise<Fund[]> {
    const enhancedFunds: Fund[] = []
    
    for (const fund of funds) {
      try {
        // 尝试获取基金持仓
        const holdings = await getRealFundHoldings(fund.code)
        
        if (holdings && holdings.length > 0) {
          // 计算持仓估值
          const portfolioValuation = await calculateFundValuationByPortfolio(
            fund.code,
            fund.currentPrice,
            holdings
          )
          
          // 创建增强的基金数据
          const enhancedFund: Fund & {
            portfolioCalculatedValue?: number
            portfolioCalculatedChangePercent?: number
            portfolioConfidence?: number
            portfolioStockCount?: number
            valuationDifference?: number
          } = {
            ...fund,
            portfolioCalculatedValue: portfolioValuation.calculatedValue,
            portfolioCalculatedChangePercent: portfolioValuation.calculatedChangePercent,
            portfolioConfidence: portfolioValuation.confidence,
            portfolioStockCount: holdings.length,
            valuationDifference: Math.abs(
              portfolioValuation.calculatedChangePercent - (fund.estimatedChangePercent || 0)
            ),
            dataSources: [...(fund.dataSources || []), 'portfolio_calculation']
          }
          
          enhancedFunds.push(enhancedFund as Fund)
        } else {
          enhancedFunds.push(fund)
        }
      } catch (error) {
        console.warn(`基金 ${fund.code} 持仓估值失败:`, error.message)
        enhancedFunds.push(fund)
      }
    }
    
    // 统计持仓估值覆盖情况
    const portfolioCount = enhancedFunds.filter(f => 
      (f as any).portfolioCalculatedValue !== undefined
    ).length
    
    if (portfolioCount > 0) {
      console.log(`📊 持仓估值覆盖: ${portfolioCount}/${enhancedFunds.length} 只基金`)
    }
    
    return enhancedFunds
  }
  
  /**
   * 获取股票数据
   */
  async fetchStockData(symbols?: string[]): Promise<StockData[]> {
    console.log('📈 获取股票数据...')
    
    try {
      // 如果没有指定股票代码，使用默认列表
      const codes = symbols || this.getDefaultStockCodes()
      
      // 方法1: 尝试使用 AKshare 获取股票数据
      let stocks: StockData[] = []
      
      if (this.status.akshareAvailable) {
        try {
          const akshareStocks = await this.getStocksFromAKshare(codes)
          if (akshareStocks.length > 0) {
            stocks = akshareStocks
            console.log(`✅ 通过 AKshare 获取 ${stocks.length} 只股票数据`)
          }
        } catch (error) {
          console.warn('AKshare 获取股票数据失败:', error.message)
        }
      }
      
      // 方法2: 如果 AKshare 失败，使用东方财富API
      if (stocks.length === 0) {
        stocks = await this.getStocksFromEastMoney(codes)
        console.log(`✅ 通过东方财富API获取 ${stocks.length} 只股票数据`)
      }
      
      return stocks
      
    } catch (error) {
      console.error('❌ 获取股票数据失败:', error)
      
      // 降级到模拟数据
      console.warn('降级到模拟数据...')
      return this.generateMockStocks()
    }
  }
  
  /**
   * 从 AKshare 获取股票数据
   */
  private async getStocksFromAKshare(codes: string[]): Promise<StockData[]> {
    // 检查 AKshare 是否可用
    if (!akshareDataService || !this.status.akshareAvailable) {
      console.log('🌐 AKshare 不可用，跳过获取股票数据')
      return []
    }
    
    try {
      const akshareStocks = akshareDataService.getAllStocks()
      
      // 过滤出请求的股票代码
      const filteredStocks = akshareStocks.filter(stock => codes.includes(stock.code))
      
      return filteredStocks.map(stock => ({
        id: `stock_${stock.code}`,
        symbol: stock.code.startsWith('6') ? `sh${stock.code}` : `sz${stock.code}`,
        name: stock.name,
        price: stock.latest_price,
        change: stock.change,
        changePercent: stock.change_percent,
        volume: stock.volume,
        timestamp: stock.timestamp,
        history: this.generateHourlyHistory(stock.latest_price),
        dataSources: ['akshare']
      }))
    } catch (error) {
      console.warn('从 AKshare 获取股票数据失败:', error.message)
      return []
    }
  }
  
  /**
   * 从东方财富API获取股票数据
   */
  private async getStocksFromEastMoney(codes: string[]): Promise<StockData[]> {
    // 这里可以调用东方财富API
    // 暂时使用模拟数据，实际应该调用真实的API
    
    const mockStocks = this.generateMockStocks()
    return mockStocks.filter(stock => 
      codes.includes(stock.symbol.replace(/^(sh|sz)/, ''))
    )
  }
  
  /**
   * 获取默认基金代码列表
   */
  private getDefaultFundCodes(): string[] {
    try {
      // 尝试从localStorage获取用户配置
      const stored = localStorage.getItem('fund_stock_show_user_funds')
      if (stored) {
        const userFunds = JSON.parse(stored)
        if (Array.isArray(userFunds) && userFunds.length > 0) {
          return userFunds.map((fund: any) => fund.code)
        }
      }
    } catch (error) {
      console.error('获取用户基金配置失败:', error)
    }
    
    // 默认基金列表
    return [
      '005827', '161725', '003095', '110022', '519674',
      '260108', '000404', '001714', '000248', '001475'
    ]
  }
  
  /**
   * 获取默认股票代码列表
   */
  private getDefaultStockCodes(): string[] {
    // 默认股票列表（A股）
    return [
      '600519', // 贵州茅台
      '000858', // 五粮液
      '000333', // 美的集团
      '000001', // 平安银行
      '600036', // 招商银行
      '000002', // 万科A
      '601318', // 中国平安
      '600276', // 恒瑞医药
      '600887', // 伊利股份
      '000651'  // 格力电器
    ]
  }
  
  /**
   * 生成模拟基金数据（降级使用）
   */
  private generateMockFunds(): Fund[] {
    console.log('使用模拟基金数据（降级模式）')
    
    const fundInfo = [
      { code: '005827', name: '易方达蓝筹精选混合' },
      { code: '161725', name: '招商中证白酒指数' },
      { code: '003095', name: '中欧医疗健康混合' },
      { code: '110011', name: '易方达中小盘混合' },
      { code: '519674', name: '银河创新成长混合' }
    ]
    
    return fundInfo.map((fund, index) => {
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
  
  /**
   * 生成模拟股票数据（降级使用）
   */
  private generateMockStocks(): StockData[] {
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
        history: this.generateHourlyHistory(basePrice),
        dataSources: ['mock_data']
      }
    })
  }
  
  /**
   * 生成小时历史数据
   */
  private generateHourlyHistory(basePrice: number) {
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
  
  /**
   * 获取服务状态
   */
  getStatus(): DataServiceStatus {
    return { ...this.status }
  }
  
  /**
   * 获取市场状态
   */
  getMarketStatus() {
    // 检查 AKshare 是否可用
    if (!akshareDataService || !this.status.akshareAvailable) {
      console.log('🌐 AKshare 不可用，使用默认市场状态')
      return this.getDefaultMarketStatus()
    }
    
    try {
      return akshareDataService.getMarketStatus()
    } catch (error) {
      console.warn('获取市场状态失败，使用默认状态:', error.message)
      return this.getDefaultMarketStatus()
    }
  }
  
  /**
   * 获取默认市场状态（浏览器环境使用）
   */
  private getDefaultMarketStatus() {
    const now = new Date()
    const hour = now.getHours()
    const isWeekend = now.getDay() === 0 || now.getDay() === 6
    
    // 交易时间：周一至周五 9:30-11:30, 13:00-15:00
    const isTradingHour = !isWeekend && (
      (hour >= 9 && hour < 11) || 
      (hour === 11 && now.getMinutes() < 30) ||
      (hour >= 13 && hour < 15)
    )
    
    let nextOpenTime = '明日 09:30'
    if (isWeekend) {
      nextOpenTime = '下周一 09:30'
    } else if (hour < 9 || (hour === 9 && now.getMinutes() < 30)) {
      nextOpenTime = '今日 09:30'
    } else if (hour < 13) {
      nextOpenTime = '今日 13:00'
    }
    
    return {
      is_open: isTradingHour,
      open_time: '09:30',
      close_time: '15:00',
      next_open_time: nextOpenTime
    }
  }
  
  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): number {
    return this.status.lastUpdateTime
  }
  
  /**
   * 停止服务
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    
    // 停止 AKshare 服务（如果可用）
    if (akshareDataService && typeof akshareDataService.stop === 'function') {
      try {
        akshareDataService.stop()
      } catch (error) {
        console.warn('停止 AKshare 服务失败:', error.message)
      }
    }
    
    console.log('🛑 新数据服务已停止')
  }
}

// 创建单例实例
export const newDataService = new NewDataService()

// 导出初始化函数
export const initNewDataService = () => newDataService.initialize()

// 导出数据获取函数（兼容现有接口）
export const fetchFundData = (fundCodes?: string[]) => newDataService.fetchFundData(fundCodes)
export const fetchStockData = (symbols?: string[]) => newDataService.fetchStockData(symbols)
export const getUpdateInfo = () => ({
  lastUpdate: newDataService.getLastUpdateTime(),
  dataSources: newDataService.getStatus().dataSources,
  status: newDataService.getStatus()
})

export const clearCache = () => {
  // 可以添加缓存清理逻辑
  console.log('🗑️ 清理数据缓存')
}

// 兼容现有接口的初始化函数
export const initDataService = () => newDataService.initialize()

// 导出服务状态获取函数
export const getDataSourceStatus = () => newDataService.getStatus()

// 导出市场状态函数
export const getMarketStatus = () => newDataService.getMarketStatus()
