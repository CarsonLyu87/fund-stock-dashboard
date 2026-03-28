/**
 * AKshare 和东方财富实时行情数据服务
 * 替换原有的模拟数据，使用真实数据源
 */

import axios from 'axios';

// 股票行情数据类型
export interface AKShareStockData {
  code: string;           // 股票代码
  name: string;           // 股票名称
  latest_price: number;   // 最新价
  change: number;         // 涨跌额
  change_percent: number; // 涨跌幅
  volume: number;         // 成交量（手）
  amount: number;         // 成交额（万元）
  open: number;          // 开盘价
  high: number;          // 最高价
  low: number;           // 最低价
  previous_close: number; // 前收盘价
  timestamp: string;      // 时间戳
}

// 基金净值数据类型
export interface AKShareFundData {
  code: string;           // 基金代码
  name: string;           // 基金名称
  net_value: number;      // 单位净值
  accumulated_value: number; // 累计净值
  change: number;         // 日涨跌额
  change_percent: number; // 日增长率
  date: string;           // 净值日期
  timestamp: string;      // 更新时间
}

// 市场状态类型
export interface MarketStatus {
  is_open: boolean;       // 是否开市
  open_time: string;      // 开市时间
  close_time: string;     // 收市时间
  next_open_time: string; // 下次开市时间
}

class AKShareDataService {
  private stockCache: Map<string, AKShareStockData> = new Map();
  private fundCache: Map<string, AKShareFundData> = new Map();
  private lastUpdateTime: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private isAKShareAvailable: boolean = false;

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    console.log('📊 初始化 AKshare 数据服务...');
    
    // 检查 AKshare 是否可用
    this.isAKShareAvailable = await this.checkAKShareAvailability();
    
    if (this.isAKShareAvailable) {
      console.log('✅ AKshare 可用，将使用真实数据');
    } else {
      console.log('⚠️ AKshare 不可用，将使用东方财富API作为后备');
    }
    
    // 初始加载数据
    await this.loadAllData();
    
    // 设置定时更新
    this.startAutoUpdate();
    
    console.log('✅ AKshare 数据服务初始化完成');
  }

  /**
   * 检查 AKshare 是否可用
   */
  private async checkAKShareAvailability(): Promise<boolean> {
    // 检查是否在浏览器环境中
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      console.log('🌐 浏览器环境检测：跳过 AKshare 检查');
      return false;
    }
    
    try {
      // 尝试导入 AKshare（仅限Node.js环境）
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // 检查 Python 环境
      const { stdout } = await execAsync('python3 -c "import akshare; print(\'OK\')"');
      return stdout.trim() === 'OK';
    } catch (error) {
      console.warn('❌ AKshare 检查失败:', error.message);
      return false;
    }
  }

  /**
   * 通过 Python 桥接脚本调用 AKshare
   */
  private async callAKShareBridge(command: string, data: any): Promise<any> {
    // 检查是否在浏览器环境中
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      console.log('🌐 浏览器环境检测：跳过 AKshare 桥接调用');
      throw new Error('AKshare 在浏览器环境中不可用');
    }
    
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const jsonData = JSON.stringify(data);
      const scriptPath = `${__dirname}/../../akshare_bridge.py`;
      
      // 使用桥接脚本
      const commandStr = `python3 "${scriptPath}" ${command} '${jsonData}'`;
      
      execAsync(commandStr, { maxBuffer: 1024 * 1024 * 10 }) // 10MB buffer
        .then(({ stdout, stderr }: { stdout: string; stderr: string }) => {
          if (stderr) {
            console.warn('AKshare 桥接警告:', stderr);
          }
          
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (parseError: any) {
            reject(new Error(`解析 AKshare 响应失败: ${parseError.message}`));
          }
        })
        .catch((error: any) => {
          reject(new Error(`AKshare 桥接调用失败: ${error.message}`));
        });
    });
  }

  /**
   * 使用 AKshare 获取股票实时行情
   */
  private async getStockDataAKShare(codes: string[]): Promise<AKShareStockData[]> {
    if (!this.isAKShareAvailable) {
      throw new Error('AKshare 不可用');
    }
    
    try {
      const result = await this.callAKShareBridge('stocks', { codes });
      return result as AKShareStockData[];
    } catch (error) {
      console.error('AKshare 股票数据获取失败:', error);
      throw error;
    }
  }

  /**
   * 使用东方财富API获取股票实时行情（后备方案）
   */
  private async getStockDataEastMoney(codes: string[]): Promise<AKShareStockData[]> {
    try {
      // 东方财富实时行情API
      const secids = codes.map(code => 
        code.startsWith('6') ? `1.${code}` : `0.${code}`
      ).join(',');
      
      const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f2,f3,f4,f12,f14,f6,f7,f15,f16,f17,f18&secids=${secids}`;
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      const stocks: AKShareStockData[] = [];
      
      if (response.data.data && response.data.data.diff) {
        const diff = response.data.data.diff;
        
        for (const key in diff) {
          const item = diff[key];
          const code = item.f12 || key.replace(/^[0-9]\./, '');
          
          stocks.push({
            code,
            name: item.f14 || `股票${code}`,
            latest_price: item.f2 || 0,
            change: item.f4 || 0,
            change_percent: item.f3 || 0,
            volume: item.f6 || 0,
            amount: item.f7 || 0,
            open: item.f17 || 0,
            high: item.f15 || 0,
            low: item.f16 || 0,
            previous_close: item.f18 || 0,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return stocks;
    } catch (error) {
      console.error('东方财富API失败:', error.message);
      throw error;
    }
  }

  /**
   * 使用 AKshare 获取基金净值数据
   */
  private async getFundDataAKShare(codes: string[]): Promise<AKShareFundData[]> {
    if (!this.isAKShareAvailable) {
      throw new Error('AKshare 不可用');
    }
    
    try {
      const result = await this.callAKShareBridge('funds', { codes });
      return result as AKShareFundData[];
    } catch (error) {
      console.error('AKshare 基金数据获取失败:', error);
      throw error;
    }
  }

  /**
   * 使用东方财富API获取基金净值数据（后备方案）
   */
  private async getFundDataEastMoney(codes: string[]): Promise<AKShareFundData[]> {
    try {
      const funds: AKShareFundData[] = [];
      
      for (const code of codes) {
        try {
          // 东方财富基金API
          const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
          
          const response = await axios.get(url, {
            timeout: 8000,
            headers: {
              'Accept': '*/*',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });
          
          // 解析JSONP响应
          const jsonpText = response.data;
          const jsonMatch = jsonpText.match(/jsonpgz\((.+)\)/);
          
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            
            funds.push({
              code,
              name: data.name || `基金${code}`,
              net_value: parseFloat(data.dwjz) || 0,
              accumulated_value: parseFloat(data.ljjz) || 0,
              change: parseFloat(data.gsz) - parseFloat(data.dwjz) || 0,
              change_percent: parseFloat(data.gszzl) || 0,
              date: data.jzrq || new Date().toISOString().split('T')[0],
              timestamp: data.gztime || new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn(`获取基金 ${code} 数据失败:`, error.message);
          // 继续尝试下一个基金
          continue;
        }
      }
      
      return funds;
    } catch (error) {
      console.error('东方财富基金API失败:', error.message);
      throw error;
    }
  }

  /**
   * 加载所有数据
   */
  private async loadAllData(): Promise<void> {
    try {
      // 加载股票数据
      await this.loadStockData();
      
      // 加载基金数据
      await this.loadFundData();
      
      this.lastUpdateTime = Date.now();
      console.log('✅ 所有数据加载完成');
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      // 使用模拟数据作为最后的后备
      await this.loadMockData();
    }
  }

  /**
   * 加载股票数据
   */
  private async loadStockData(): Promise<void> {
    console.log('📈 加载股票数据...');
    
    const stockCodes = ['600519', '000858', '000333', '000001', '600036']; // 示例股票代码
    
    try {
      let stocks: AKShareStockData[] = [];
      
      // 优先使用 AKshare
      if (this.isAKShareAvailable) {
        stocks = await this.getStockDataAKShare(stockCodes);
      }
      
      // 如果 AKshare 失败或不可用，使用东方财富API
      if (stocks.length === 0) {
        stocks = await this.getStockDataEastMoney(stockCodes);
      }
      
      // 更新缓存
      stocks.forEach(stock => {
        this.stockCache.set(stock.code, stock);
      });
      
      console.log(`✅ 加载了 ${stocks.length} 只股票数据`);
    } catch (error) {
      console.error('❌ 加载股票数据失败:', error);
      throw error;
    }
  }

  /**
   * 加载基金数据
   */
  private async loadFundData(): Promise<void> {
    console.log('💰 加载基金数据...');
    
    const fundCodes = ['005827', '161725', '003095', '260108', '110011']; // 示例基金代码
    
    try {
      let funds: AKShareFundData[] = [];
      
      // 优先使用 AKshare
      if (this.isAKShareAvailable) {
        funds = await this.getFundDataAKShare(fundCodes);
      }
      
      // 如果 AKshare 失败或不可用，使用东方财富API
      if (funds.length === 0) {
        funds = await this.getFundDataEastMoney(fundCodes);
      }
      
      // 更新缓存
      funds.forEach(fund => {
        this.fundCache.set(fund.code, fund);
      });
      
      console.log(`✅ 加载了 ${funds.length} 只基金数据`);
    } catch (error) {
      console.error('❌ 加载基金数据失败:', error);
      throw error;
    }
  }

  /**
   * 加载模拟数据（最后的后备方案）
   */
  private async loadMockData(): Promise<void> {
    console.log('⚠️ 使用模拟数据作为后备方案');
    
    // 生成模拟股票数据
    const mockStocks: AKShareStockData[] = [
      {
        code: '600519',
        name: '贵州茅台',
        latest_price: 1760.50,
        change: 10.50,
        change_percent: 0.60,
        volume: 123456,
        amount: 1234567,
        open: 1755.00,
        high: 1765.00,
        low: 1750.00,
        previous_close: 1750.00,
        timestamp: new Date().toISOString()
      },
      {
        code: '000858',
        name: '五粮液',
        latest_price: 145.80,
        change: 1.20,
        change_percent: 0.83,
        volume: 234567,
        amount: 2345678,
        open: 144.50,
        high: 147.00,
        low: 144.00,
        previous_close: 144.60,
        timestamp: new Date().toISOString()
      }
    ];
    
    // 生成模拟基金数据
    const mockFunds: AKShareFundData[] = [
      {
        code: '005827',
        name: '易方达蓝筹精选混合',
        net_value: 2.8567,
        accumulated_value: 3.4280,
        change: 0.0294,
        change_percent: 1.04,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      },
      {
        code: '161725',
        name: '招商中证白酒指数A',
        net_value: 1.2532,
        accumulated_value: 3.7589,
        change: 0.0155,
        change_percent: 1.25,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      }
    ];
    
    mockStocks.forEach(stock => {
      this.stockCache.set(stock.code, stock);
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
    
    // 每30秒更新一次股票数据，每5分钟更新一次基金数据
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateData();
      } catch (error) {
        console.error('❌ 自动更新失败:', error);
      }
    }, 30000); // 30秒
    
    console.log('🔄 已启动自动更新，频率: 30秒');
  }

  /**
   * 更新数据
   */
  private async updateData(): Promise<void> {
    console.log('🔄 更新实时数据...');
    
    try {
      // 更新股票数据
      const stockCodes = Array.from(this.stockCache.keys());
      if (stockCodes.length > 0) {
        let updatedStocks: AKShareStockData[] = [];
        
        if (this.isAKShareAvailable) {
          updatedStocks = await this.getStockDataAKShare(stockCodes);
        } else {
          updatedStocks = await this.getStockDataEastMoney(stockCodes);
        }
        
        updatedStocks.forEach(stock => {
          this.stockCache.set(stock.code, stock);
        });
        
        console.log(`✅ 更新了 ${updatedStocks.length} 只股票数据`);
      }
      
      // 每5分钟更新一次基金数据（基金数据变化较慢）
      if (Date.now() - this.lastUpdateTime > 300000) {
        const fundCodes = Array.from(this.fundCache.keys());
        if (fundCodes.length > 0) {
          let updatedFunds: AKShareFundData[] = [];
          
          if (this.isAKShareAvailable) {
            updatedFunds = await this.getFundDataAKShare(fundCodes);
          } else {
            updatedFunds = await this.getFundDataEastMoney(fundCodes);
          }
          
          updatedFunds.forEach(fund => {
            this.fundCache.set(fund.code, fund);
          });
          
          console.log(`✅ 更新了 ${updatedFunds.length} 只基金数据`);
        }
      }
      
      this.lastUpdateTime = Date.now();
    } catch (error) {
      console.error('❌ 更新数据失败:', error);
    }
  }

  /**
   * 获取所有股票数据
   */
  getAllStocks(): AKShareStockData[] {
    return Array.from(this.stockCache.values());
  }

  /**
   * 获取所有基金数据
   */
  getAllFunds(): AKShareFundData[] {
    return Array.from(this.fundCache.values());
  }

  /**
   * 获取特定股票数据
   */
  getStock(code: string): AKShareStockData | undefined {
    return this.stockCache.get(code);
  }

  /**
   * 获取特定基金数据
   */
  getFund(code: string): AKShareFundData | undefined {
    return this.fundCache.get(code);
  }

  /**
   * 获取市场状态
   */
  getMarketStatus(): MarketStatus {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // A股交易时间：工作日 9:30-11:30, 13:00-15:00
    const isMorningSession = !isWeekend && hour >= 9 && (hour < 11 || (hour === 11 && minute <= 30));
    const isAfternoonSession = !isWeekend && hour >= 13 && hour < 15;
    const isOpen = isMorningSession || isAfternoonSession;
    
    let nextOpenTime = '明日 09:30';
    if (!isWeekend) {
      if (hour < 9 || (hour === 9 && minute < 30)) {
        nextOpenTime = '今日 09:30';
      } else if (hour < 13) {
        nextOpenTime = '今日 13:00';
      }
    }
    
    return {
      is_open: isOpen,
      open_time: '09:30',
      close_time: '15:00',
      next_open_time: nextOpenTime
    };
  }

  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * 添加监控股票
   */
  addStock(code: string): void {
    if (!this.stockCache.has(code)) {
      console.log(`📈 添加监控股票: ${code}`);
      // 异步获取该股票数据
      this.updateStockData([code]).catch(error => {
        console.error(`❌ 获取股票 ${code} 数据失败:`, error);
      });
    }
  }

  /**
   * 添加监控基金
   */
  addFund(code: string): void {
    if (!this.fundCache.has(code)) {
      console.log(`💰 添加监控基金: ${code}`);
      // 异步获取该基金数据
      this.updateFundData([code]).catch(error => {
        console.error(`❌ 获取基金 ${code} 数据失败:`, error);
      });
    }
  }

  /**
   * 更新特定股票数据
   */
  private async updateStockData(codes: string[]): Promise<void> {
    try {
      let stocks: AKShareStockData[] = [];
      
      if (this.isAKShareAvailable) {
        stocks = await this.getStockDataAKShare(codes);
      } else {
        stocks = await this.getStockDataEastMoney(codes);
      }
      
      stocks.forEach(stock => {
        this.stockCache.set(stock.code, stock);
      });
    } catch (error) {
      console.error('❌ 更新股票数据失败:', error);
    }
  }

  /**
   * 更新特定基金数据
   */
  private async updateFundData(codes: string[]): Promise<void> {
    try {
      let funds: AKShareFundData[] = [];
      
      if (this.isAKShareAvailable) {
        funds = await this.getFundDataAKShare(codes);
      } else {
        funds = await this.getFundDataEastMoney(codes);
      }
      
      funds.forEach(fund => {
        this.fundCache.set(fund.code, fund);
      });
    } catch (error) {
      console.error('❌ 更新基金数据失败:', error);
    }
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('🛑 AKshare 数据服务已停止');
  }
}

// 创建单例实例
export const akshareDataService = new AKShareDataService();

// 导出初始化函数
export const initializeAKShareData = () => akshareDataService.initialize();