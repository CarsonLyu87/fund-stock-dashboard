/**
 * 实时数据服务
 * 获取和处理真实的基金和股票市场数据
 */

import { defaultConfig, supportedStocks, supportedFunds, getApiUrl } from '../config/dataSources';

export interface RealTimeStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
}

export interface RealTimeFundData {
  code: string;
  name: string;
  netValue: number; // 单位净值
  accumulatedValue: number; // 累计净值
  change: number;
  changePercent: number;
  date: string; // 净值日期
  timestamp: number;
}

export interface MarketStatus {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  nextOpenTime: string;
}

class RealTimeDataService {
  private stockCache: Map<string, RealTimeStockData> = new Map();
  private fundCache: Map<string, RealTimeFundData> = new Map();
  private lastUpdateTime: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化实时数据服务
   */
  async initialize(): Promise<void> {
    console.log('📊 初始化实时数据服务...');
    
    // 初始加载数据
    await this.loadAllData();
    
    // 设置定时更新
    this.startAutoUpdate();
    
    console.log('✅ 实时数据服务初始化完成');
  }

  /**
   * 加载所有数据
   */
  private async loadAllData(): Promise<void> {
    try {
      await Promise.all([
        this.loadStockData(),
        this.loadFundData(),
      ]);
      this.lastUpdateTime = Date.now();
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      // 使用模拟数据作为后备
      await this.loadMockData();
    }
  }

  /**
   * 加载股票数据
   */
  private async loadStockData(): Promise<void> {
    console.log('📈 加载股票数据...');
    
    // 由于API限制，这里先使用模拟数据
    // 实际项目中应该调用真实的API
    const mockStocks = this.generateMockStockData();
    
    mockStocks.forEach(stock => {
      this.stockCache.set(stock.symbol, stock);
    });
    
    console.log(`✅ 加载了 ${mockStocks.length} 只股票数据`);
  }

  /**
   * 加载基金数据
   */
  private async loadFundData(): Promise<void> {
    console.log('💰 加载基金数据...');
    
    // 由于API限制，这里先使用模拟数据
    // 实际项目中应该调用真实的API
    const mockFunds = this.generateMockFundData();
    
    mockFunds.forEach(fund => {
      this.fundCache.set(fund.code, fund);
    });
    
    console.log(`✅ 加载了 ${mockFunds.length} 只基金数据`);
  }

  /**
   * 生成模拟股票数据（用于开发和测试）
   */
  private generateMockStockData(): RealTimeStockData[] {
    const basePrices: Record<string, number> = {
      'AAPL': 175.25,
      'TSLA': 245.80,
      'NVDA': 890.50,
      'MSFT': 415.30,
      'GOOGL': 150.75,
      'AMZN': 180.20,
      'META': 500.45,
      'NFLX': 650.90,
      'BABA': 85.60,
      'TSM': 145.30,
    };
    
    const names: Record<string, string> = {
      'AAPL': '苹果公司',
      'TSLA': '特斯拉',
      'NVDA': '英伟达',
      'MSFT': '微软',
      'GOOGL': '谷歌',
      'AMZN': '亚马逊',
      'META': 'Meta Platforms',
      'NFLX': 'Netflix',
      'BABA': '阿里巴巴',
      'TSM': '台积电',
    };
    
    return supportedStocks.map(symbol => {
      const basePrice = basePrices[symbol] || 100;
      const changePercent = (Math.random() * 6 - 3); // -3% 到 +3%
      const change = basePrice * changePercent / 100;
      const price = basePrice + change;
      
      return {
        symbol,
        name: names[symbol] || symbol,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
        timestamp: Date.now(),
        previousClose: basePrice,
        open: basePrice * (1 + (Math.random() * 0.02 - 0.01)),
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
      };
    });
  }

  /**
   * 生成模拟基金数据（用于开发和测试）
   */
  private generateMockFundData(): RealTimeFundData[] {
    const fundInfo: Record<string, { name: string; baseValue: number }> = {
      '005827': { name: '易方达蓝筹精选混合', baseValue: 2.85 },
      '161725': { name: '招商中证白酒指数A', baseValue: 1.25 },
      '003095': { name: '中欧医疗健康混合A', baseValue: 3.45 },
      '260108': { name: '景顺长城新兴成长混合', baseValue: 2.15 },
      '110011': { name: '易方达中小盘混合', baseValue: 5.80 },
      '000404': { name: '易方达新兴成长混合', baseValue: 4.25 },
      '519674': { name: '银河创新成长混合', baseValue: 6.35 },
    };
    
    return supportedFunds.map(code => {
      const info = fundInfo[code] || { name: `基金${code}`, baseValue: 1.0 };
      const changePercent = (Math.random() * 4 - 2); // -2% 到 +2%
      const change = info.baseValue * changePercent / 100;
      const netValue = info.baseValue + change;
      
      return {
        code,
        name: info.name,
        netValue: parseFloat(netValue.toFixed(4)),
        accumulatedValue: parseFloat((netValue * 1.2).toFixed(4)), // 假设累计净值是单位净值的1.2倍
        change: parseFloat(change.toFixed(4)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      };
    });
  }

  /**
   * 加载模拟数据（后备方案）
   */
  private async loadMockData(): Promise<void> {
    console.log('⚠️ 使用模拟数据作为后备方案');
    
    const mockStocks = this.generateMockStockData();
    const mockFunds = this.generateMockFundData();
    
    mockStocks.forEach(stock => {
      this.stockCache.set(stock.symbol, stock);
    });
    
    mockFunds.forEach(fund => {
      this.fundCache.set(fund.code, fund);
    });
    
    this.lastUpdateTime = Date.now();
  }

  /**
   * 开始自动更新
   */
  private startAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateData();
      } catch (error) {
        console.error('❌ 自动更新失败:', error);
      }
    }, defaultConfig.updateFrequency.stock);
    
    console.log(`🔄 已启动自动更新，频率: ${defaultConfig.updateFrequency.stock}ms`);
  }

  /**
   * 更新数据
   */
  private async updateData(): Promise<void> {
    console.log('🔄 更新实时数据...');
    
    // 更新股票数据
    const updatedStocks = this.generateMockStockData();
    updatedStocks.forEach(stock => {
      this.stockCache.set(stock.symbol, stock);
    });
    
    // 每两次更新一次基金数据（基金数据变化较慢）
    if (Date.now() - this.lastUpdateTime > defaultConfig.updateFrequency.fund) {
      const updatedFunds = this.generateMockFundData();
      updatedFunds.forEach(fund => {
        this.fundCache.set(fund.code, fund);
      });
    }
    
    this.lastUpdateTime = Date.now();
    console.log(`✅ 数据更新完成，股票: ${updatedStocks.length} 只`);
  }

  /**
   * 获取所有股票数据
   */
  getAllStocks(): RealTimeStockData[] {
    return Array.from(this.stockCache.values());
  }

  /**
   * 获取所有基金数据
   */
  getAllFunds(): RealTimeFundData[] {
    return Array.from(this.fundCache.values());
  }

  /**
   * 获取特定股票数据
   */
  getStock(symbol: string): RealTimeStockData | undefined {
    return this.stockCache.get(symbol.toUpperCase());
  }

  /**
   * 获取特定基金数据
   */
  getFund(code: string): RealTimeFundData | undefined {
    return this.fundCache.get(code);
  }

  /**
   * 获取市场状态
   */
  getMarketStatus(): MarketStatus {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // 简单判断：工作日9:30-16:00为开市时间
    const isOpen = !isWeekend && hour >= 9 && hour < 16;
    
    return {
      isOpen,
      openTime: '09:30',
      closeTime: '16:00',
      nextOpenTime: isOpen ? '明日 09:30' : '09:30',
    };
  }

  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('🛑 实时数据服务已停止');
  }
}

// 创建单例实例
export const realTimeDataService = new RealTimeDataService();

// 导出初始化函数
export const initializeRealTimeData = () => realTimeDataService.initialize();