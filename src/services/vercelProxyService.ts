/**
 * Vercel代理服务
 * 用于解决生产环境CORS问题
 */

// 判断当前环境
const isProduction = import.meta.env.PROD
const isVercel = window.location.hostname.includes('vercel.app')

// 代理配置
const PROXY_CONFIG = {
  // Vercel函数代理端点
  vercelProxy: '/api/proxy',
  
  // 备用公共CORS代理
  publicProxies: [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
  ],
  
  // 直接请求（仅开发环境）
  direct: true
}

/**
 * 通用代理请求函数
 */
export async function proxyRequest(url: string, options: RequestInit = {}): Promise<any> {
  const startTime = Date.now()
  
  try {
    // 方法1: 优先使用Vercel函数代理
    if (isVercel) {
      try {
        const encodedUrl = encodeURIComponent(url)
        const proxyUrl = `${PROXY_CONFIG.vercelProxy}?url=${encodedUrl}`
        
        console.log(`🔗 使用Vercel代理: ${proxyUrl}`)
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          ...options
        })
        
        if (!response.ok) {
          throw new Error(`Vercel代理失败: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success) {
          console.log(`✅ Vercel代理成功 (${Date.now() - startTime}ms)`)
          return data.data
        } else {
          throw new Error(data.error || 'Vercel代理返回错误')
        }
      } catch (vercelError) {
        console.warn('Vercel代理失败，尝试备用方案:', vercelError)
      }
    }
    
    // 方法2: 尝试公共CORS代理
    for (const proxy of PROXY_CONFIG.publicProxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url)
        console.log(`🔄 尝试公共代理: ${proxy}`)
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          ...options,
          signal: AbortSignal.timeout(10000) // 10秒超时
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ 公共代理成功 (${Date.now() - startTime}ms)`)
          return data
        }
      } catch (proxyError) {
        console.warn(`代理 ${proxy} 失败:`, proxyError)
        continue
      }
    }
    
    // 方法3: 开发环境直接请求
    if (!isProduction) {
      try {
        console.log(`🚀 开发环境直接请求: ${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Referer': 'https://fund.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          ...options,
          signal: AbortSignal.timeout(10000)
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ 直接请求成功 (${Date.now() - startTime}ms)`)
          return data
        }
      } catch (directError) {
        console.warn('直接请求失败:', directError)
      }
    }
    
    throw new Error('所有代理方法都失败了')
    
  } catch (error) {
    console.error(`❌ 代理请求失败 (${Date.now() - startTime}ms):`, error)
    throw error
  }
}

/**
 * 获取基金净值数据
 */
export async function getFundNetValue(code: string): Promise<any> {
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1&startDate=&endDate=&_=${Date.now()}`
  
  try {
    const data = await proxyRequest(url)
    
    if (data.ErrCode === 0 && data.Data?.LSJZList?.length > 0) {
      return {
        success: true,
        data: data.Data.LSJZList[0],
        source: '天天基金'
      }
    } else {
      return {
        success: false,
        error: '无净值数据',
        data: null
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * 获取基金实时估值
 */
export async function getFundEstimate(code: string): Promise<any> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
  
  try {
    const response = await proxyRequest(url)
    
    // 处理JSONP响应
    if (typeof response === 'string') {
      const jsonpMatch = response.match(/jsonpgz\((.+)\)/)
      if (jsonpMatch) {
        const data = JSON.parse(jsonpMatch[1])
        return {
          success: true,
          data: {
            fundcode: data.fundcode,
            name: data.name,
            jzrq: data.jzrq,
            dwjz: data.dwjz,
            gsz: data.gsz,
            gszzl: data.gszzl,
            gztime: data.gztime
          },
          source: '天天基金估值'
        }
      }
    }
    
    return {
      success: false,
      error: '估值数据格式错误',
      data: null
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * 获取股票实时价格
 */
export async function getStockPrice(symbol: string): Promise<any> {
  // 腾讯财经API
  const url = `https://qt.gtimg.cn/q=${symbol}`
  
  try {
    const response = await proxyRequest(url)
    
    if (typeof response === 'string') {
      const parts = response.split('~')
      if (parts.length > 30) {
        return {
          success: true,
          data: {
            symbol: parts[2],
            name: parts[1],
            price: parseFloat(parts[3]),
            change: parseFloat(parts[4]),
            changePercent: parseFloat(parts[5]),
            volume: parseFloat(parts[6]),
            amount: parseFloat(parts[37]),
            high: parseFloat(parts[33]),
            low: parseFloat(parts[34]),
            open: parseFloat(parts[5]),
            lastClose: parseFloat(parts[4]),
            timestamp: new Date().toISOString()
          },
          source: '腾讯财经'
        }
      }
    }
    
    return {
      success: false,
      error: '股票数据格式错误',
      data: null
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * 批量获取基金数据
 */
export async function getMultipleFundsData(codes: string[]): Promise<any[]> {
  const promises = codes.map(code => 
    Promise.allSettled([
      getFundNetValue(code),
      getFundEstimate(code)
    ]).then(results => {
      const netValueResult = results[0]
      const estimateResult = results[1]
      
      return {
        code,
        netValue: netValueResult.status === 'fulfilled' ? netValueResult.value : null,
        estimate: estimateResult.status === 'fulfilled' ? estimateResult.value : null,
        timestamp: new Date().toISOString()
      }
    })
  )
  
  return Promise.all(promises)
}

/**
 * 测试代理连接
 */
export async function testProxyConnection(): Promise<{
  vercelProxy: boolean
  publicProxies: boolean[]
  direct: boolean
}> {
  const testUrl = 'https://api.fund.eastmoney.com/f10/lsjz?fundCode=003095&pageIndex=1&pageSize=1'
  
  const results = {
    vercelProxy: false,
    publicProxies: [] as boolean[],
    direct: false
  }
  
  // 测试Vercel代理
  if (isVercel) {
    try {
      const encodedUrl = encodeURIComponent(testUrl)
      const response = await fetch(`${PROXY_CONFIG.vercelProxy}?url=${encodedUrl}`, {
        signal: AbortSignal.timeout(5000)
      })
      results.vercelProxy = response.ok
    } catch (error) {
      results.vercelProxy = false
    }
  }
  
  // 测试公共代理
  for (const proxy of PROXY_CONFIG.publicProxies) {
    try {
      const response = await fetch(proxy + encodeURIComponent(testUrl), {
        signal: AbortSignal.timeout(5000)
      })
      results.publicProxies.push(response.ok)
    } catch (error) {
      results.publicProxies.push(false)
    }
  }
  
  // 测试直接连接
  if (!isProduction) {
    try {
      const response = await fetch(testUrl, {
        headers: {
          'Referer': 'https://fund.eastmoney.com/'
        },
        signal: AbortSignal.timeout(5000)
      })
      results.direct = response.ok
    } catch (error) {
      results.direct = false
    }
  }
  
  return results
}

/**
 * 获取最佳可用代理
 */
export async function getBestProxy(): Promise<string> {
  const testResults = await testProxyConnection()
  
  if (testResults.vercelProxy) {
    return 'vercel'
  }
  
  const workingPublicProxyIndex = testResults.publicProxies.findIndex(result => result)
  if (workingPublicProxyIndex !== -1) {
    return `public-${workingPublicProxyIndex}`
  }
  
  if (testResults.direct) {
    return 'direct'
  }
  
  return 'none'
}