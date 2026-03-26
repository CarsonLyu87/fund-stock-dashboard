/**
 * HTTP头工具函数
 * 处理浏览器和Node.js环境中的HTTP头设置差异
 */

// 检查是否在浏览器环境
export const isBrowser = typeof window !== 'undefined'

/**
 * 获取安全的HTTP头配置
 * 在浏览器环境中，某些头（如User-Agent、Accept-Encoding、Connection）会被拒绝设置
 * 在Node.js环境中可以设置所有头
 */
export function getSafeHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const baseHeaders = isBrowser ? {
    // 浏览器环境中只设置安全的头
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  } : {
    // Node.js环境中可以设置所有头
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
  
  return { ...baseHeaders, ...additionalHeaders }
}

/**
 * 获取基金API专用的HTTP头
 */
export function getFundApiHeaders(): Record<string, string> {
  const headers = getSafeHeaders()
  
  if (!isBrowser) {
    // 只在Node.js环境中设置Referer
    headers['Referer'] = 'https://fund.eastmoney.com/'
  }
  
  return headers
}

/**
 * 获取股票API专用的HTTP头
 */
export function getStockApiHeaders(): Record<string, string> {
  const headers = getSafeHeaders()
  
  if (!isBrowser) {
    // 只在Node.js环境中设置Referer
    headers['Referer'] = 'http://qt.gtimg.cn/'
  }
  
  return headers
}

/**
 * 检查HTTP头是否安全（不会在浏览器中被拒绝）
 */
export function isHeaderSafe(headerName: string): boolean {
  const unsafeHeaders = [
    'User-Agent',
    'Accept-Encoding',
    'Connection',
    'Content-Length',
    'Host',
    'Origin'
  ]
  
  return !unsafeHeaders.includes(headerName)
}

/**
 * 过滤不安全的HTTP头（用于浏览器环境）
 */
export function filterUnsafeHeaders(headers: Record<string, string>): Record<string, string> {
  if (!isBrowser) {
    return headers // Node.js环境中不需要过滤
  }
  
  const safeHeaders: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(headers)) {
    if (isHeaderSafe(key)) {
      safeHeaders[key] = value
    }
  }
  
  return safeHeaders
}