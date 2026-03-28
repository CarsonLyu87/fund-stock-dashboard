/**
 * AKShare 数据源配置
 * 使用 AKShare 作为唯一数据源，提供稳定可靠的基金和股票数据
 */

export interface DataSourceConfig {
  // 数据源提供商
  provider: 'akshare';
  
  // AKShare 服务器配置
  akshare: {
    baseUrl: string;
    timeout: number; // 请求超时时间（毫秒）
    retryCount: number; // 重试次数
  };
  
  // 更新频率配置
  updateFrequency: {
    stock: number; // 股票数据更新频率（毫秒）
    fund: number;  // 基金数据更新频率（毫秒）
  };
  
  // 缓存配置
  cache: {
    enabled: boolean;
    ttl: number; // 缓存存活时间（毫秒）
  };
  
  // 降级配置
  fallback: {
    enabled: boolean;
    mockData: boolean; // 是否使用模拟数据降级
  };
}

// 默认配置 - 使用 AKShare 数据源
export const defaultConfig: DataSourceConfig = {
  provider: 'akshare',
  akshare: {
    baseUrl: 'http://localhost:3002',
    timeout: 15000, // 15秒超时
    retryCount: 2,  // 重试2次
  },
  updateFrequency: {
    stock: 300000, // 5分钟更新一次股票数据
    fund: 300000,  // 5分钟更新一次基金数据
  },
  cache: {
    enabled: true,
    ttl: 300000, // 缓存5分钟
  },
  fallback: {
    enabled: true,
    mockData: true, // 允许使用模拟数据降级
  },
};

// 支持的股票代码列表（A股）
export const supportedStocks = [
  '600519', // 贵州茅台
  '000858', // 五粮液
  '000333', // 美的集团
  '000001', // 平安银行
  '600036', // 招商银行
  '000002', // 万科A
  '601318', // 中国平安
  '600276', // 恒瑞医药
  '600887', // 伊利股份
  '000651', // 格力电器
  '300750', // 宁德时代
  '002415', // 海康威视
  '000725', // 京东方A
  '002594', // 比亚迪
  '600030', // 中信证券
];

// 支持的基金代码列表
export const supportedFunds = [
  '005827', // 易方达蓝筹精选混合
  '161725', // 招商中证白酒指数A
  '003095', // 中欧医疗健康混合A
  '260108', // 景顺长城新兴成长混合
  '110011', // 易方达中小盘混合
  '000404', // 易方达新兴成长混合
  '519674', // 银河创新成长混合
  '001714', // 工银瑞信前沿医疗股票
  '000248', // 汇添富中证主要消费ETF联接
  '001475', // 易方达国防军工混合
  '110022', // 易方达消费行业股票
  '001410', // 信达澳银新能源产业股票
  '002190', // 农银汇理新能源主题灵活配置混合
  '005669', // 前海开源公用事业股票
  '519736', // 交银施罗德新成长混合
];

// AKShare API端点配置
export const apiEndpoints = {
  stocks: '/stocks',
  funds: '/funds',
  fundDetail: '/fund-detail',
  searchFunds: '/search-funds',
  status: '/status',
};

/**
 * 获取完整的API URL
 */
export function getApiUrl(
  endpoint: keyof typeof apiEndpoints,
  params: Record<string, string> = {}
): string {
  const config = defaultConfig
  const path = apiEndpoints[endpoint]
  
  if (!path) {
    throw new Error(`未知的API端点: ${endpoint}`)
  }
  
  const url = new URL(`${config.akshare.baseUrl}${path}`)
  
  // 添加查询参数
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  
  return url.toString()
}

/**
 * 检查AKShare服务状态
 */
export async function checkAkshareService(): Promise<{
  available: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const config = defaultConfig
    const url = getApiUrl('status')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: config.akshare.timeout
    })
    
    if (!response.ok) {
      return {
        available: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    const data = await response.json()
    
    return {
      available: data.success === true,
      status: data.data?.status || 'unknown'
    }
    
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取数据源信息
 */
export function getDataSourceInfo() {
  const config = defaultConfig
  
  return {
    provider: config.provider,
    name: 'AKShare',
    description: '基于AKShare的稳定数据源，提供基金和股票实时数据',
    features: [
      '基金实时净值数据',
      '股票实时行情数据',
      '基金详情信息（持仓、历史净值）',
      '基金搜索功能',
      '数据缓存机制',
      '自动降级到模拟数据'
    ],
    limitations: [
      '需要本地Python环境运行AKShare服务器',
      '数据更新频率受AKShare接口限制',
      '部分数据可能需要网络访问权限'
    ],
    configuration: {
      baseUrl: config.akshare.baseUrl,
      updateFrequency: {
        stock: `${config.updateFrequency.stock / 60000}分钟`,
        fund: `${config.updateFrequency.fund / 60000}分钟`
      },
      cache: {
        enabled: config.cache.enabled,
        ttl: `${config.cache.ttl / 60000}分钟`
      },
      fallback: config.fallback
    }
  }
}

/**
 * 初始化数据源
 */
export async function initDataSource(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  console.log('初始化AKShare数据源...')
  
  // 检查服务状态
  const serviceStatus = await checkAkshareService()
  
  if (!serviceStatus.available) {
    console.warn('AKShare服务不可用:', serviceStatus.error)
    
    return {
      success: false,
      message: 'AKShare服务不可用',
      details: serviceStatus
    }
  }
  
  console.log('✅ AKShare数据源初始化成功')
  
  return {
    success: true,
    message: 'AKShare数据源已就绪',
    details: {
      provider: 'akshare',
      status: 'active',
      serviceUrl: defaultConfig.akshare.baseUrl,
      features: ['基金数据', '股票数据', '基金搜索', '数据缓存']
    }
  }
}

// 导出所有配置和函数
export {
  defaultConfig,
  supportedStocks,
  supportedFunds,
  apiEndpoints,
  getApiUrl,
  checkAkshareService,
  getDataSourceInfo,
  initDataSource
}