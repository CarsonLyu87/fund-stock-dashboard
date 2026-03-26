/**
 * 数据源配置
 * 配置实时基金和股票数据的API源
 */

export interface DataSourceConfig {
  // 股票数据源
  stock: {
    provider: 'yahoo' | 'alphaVantage' | 'twelveData' | 'polygon';
    apiKey?: string;
    baseUrl: string;
    rateLimit: number; // 每分钟请求限制
  };
  
  // 基金数据源
  fund: {
    provider: 'eastmoney' | 'tianTian' | 'morningstar';
    baseUrl: string;
    rateLimit: number;
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
}

// 默认配置 - 使用免费API源，每小时更新一次
export const defaultConfig: DataSourceConfig = {
  stock: {
    provider: 'yahoo',
    baseUrl: 'https://query1.finance.yahoo.com',
    rateLimit: 100, // Yahoo Finance免费版限制
  },
  fund: {
    provider: 'eastmoney',
    baseUrl: 'https://fund.eastmoney.com',
    rateLimit: 50,
  },
  updateFrequency: {
    stock: 900000, // 15分钟更新一次股票数据
    fund: 900000,  // 15分钟更新一次基金数据
  },
  cache: {
    enabled: true,
    ttl: 900000, // 缓存15分钟
  },
};

// 支持的股票代码列表
export const supportedStocks = [
  'AAPL', // 苹果
  'TSLA', // 特斯拉
  'NVDA', // 英伟达
  'MSFT', // 微软
  'GOOGL', // 谷歌
  'AMZN', // 亚马逊
  'META', // Meta
  'NFLX', // Netflix
  'BABA', // 阿里巴巴
  'TSM',  // 台积电
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
];

// API端点配置
export const apiEndpoints = {
  yahoo: {
    quote: '/v8/finance/chart/{symbol}',
    summary: '/v10/finance/quoteSummary/{symbol}',
  },
  eastmoney: {
    fundDetail: '/api/fund/detail/{code}',
    fundNetValue: '/api/fund/netvalue/{code}',
  },
};

/**
 * 获取完整的API URL
 */
export function getApiUrl(
  provider: 'yahoo' | 'eastmoney',
  endpoint: string,
  params: Record<string, string>
): string {
  const config = defaultConfig;
  let baseUrl = '';
  let path = '';
  
  if (provider === 'yahoo') {
    baseUrl = config.stock.baseUrl;
    path = apiEndpoints.yahoo[endpoint as keyof typeof apiEndpoints.yahoo] || endpoint;
  } else if (provider === 'eastmoney') {
    baseUrl = config.fund.baseUrl;
    path = apiEndpoints.eastmoney[endpoint as keyof typeof apiEndpoints.eastmoney] || endpoint;
  }
  
  // 替换路径参数
  let finalPath = path;
  Object.keys(params).forEach(key => {
    finalPath = finalPath.replace(`{${key}}`, params[key]);
  });
  
  return `${baseUrl}${finalPath}`;
}