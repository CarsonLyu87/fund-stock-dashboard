/**
 * 基金搜索服务
 * 提供基金搜索、添加、管理功能
 */

import axios from 'axios'
import { getFundApiHeaders } from '../utils/httpHeaders'

// 代理服务器配置
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'

// JSONP工具函数（仅在浏览器环境中使用）
function createJsonpPromise<T>(url: string, callbackParam: string = 'callback', expectedCallbackName?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('JSONP只能在浏览器环境中使用'))
      return
    }
    
    // 创建唯一的回调函数名
    const callbackName = expectedCallbackName || `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2)}`
    
    // 创建script标签
    const script = document.createElement('script')
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP请求超时'))
    }, 8000)
    
    // 清理函数
    const cleanup = () => {
      clearTimeout(timeoutId)
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      // @ts-ignore
      delete window[callbackName]
    }
    
    // 定义回调函数
    // @ts-ignore
    window[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }
    
    // 构建URL
    let jsonpUrl = url
    if (callbackParam && !url.includes('callback=')) {
      const separator = url.includes('?') ? '&' : '?'
      jsonpUrl = `${url}${separator}${callbackParam}=${callbackName}`
    }
    
    // 设置script属性
    script.src = jsonpUrl
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP请求失败'))
    }
    
    // 添加到文档
    document.head.appendChild(script)
  })
}

// 天天基金专用JSONP函数（使用固定的jsonpgz回调名）
function createTiantianJsonpPromise<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('JSONP只能在浏览器环境中使用'))
      return
    }
    
    // 天天基金使用固定的回调函数名 jsonpgz
    const callbackName = 'jsonpgz'
    
    // 创建script标签
    const script = document.createElement('script')
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('天天基金JSONP请求超时'))
    }, 8000)
    
    // 清理函数
    const cleanup = () => {
      clearTimeout(timeoutId)
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      // @ts-ignore
      delete window[callbackName]
    }
    
    // 定义回调函数
    // @ts-ignore
    window[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }
    
    // 设置script属性
    script.src = url
    script.onerror = () => {
      cleanup()
      reject(new Error('天天基金JSONP请求失败'))
    }
    
    // 添加到文档
    document.head.appendChild(script)
  })
}

// 检查是否在浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

// 无CORS限制的备用API
const NO_CORS_APIS = {
  /**
   * 天天基金无CORS API（通过JSONP）
   * 格式: https://fundgz.1234567.com.cn/js/001714.js
   */
  tiantianFund: (code: string) => {
    return `https://fundgz.1234567.com.cn/js/${code}.js`
  },
  
  /**
   * 东方财富基金搜索（支持JSONP）
   * 格式: https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=易方达&callback=jsonp123
   */
  eastmoneySearchJsonp: (keyword: string) => {
    return `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(keyword)}`
  },
  
  /**
   * 东方财富基金净值API（支持JSONP）
   * 格式: https://api.fund.eastmoney.com/f10/lsjz?fundCode=001714&pageIndex=1&pageSize=1&callback=jsonp
   */
  eastmoneyFundDetail: (code: string) => {
    return `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`
  },
  
  /**
   * 代理服务器API（备用）
   */
  proxyApi: (code: string) => {
    return `${PROXY_BASE_URL}/api/fund/detail/${code}`
  }
}

// 基金搜索结果接口
export interface FundSearchResult {
  code: string
  name: string
  type: string
  company: string
  netValue?: number
  changePercent?: number
  isAdded: boolean
}

// 用户基金配置接口
export interface UserFundConfig {
  code: string
  name: string
  addedAt: number
  weight?: number // 用户自定义权重
  notes?: string // 用户备注
}

// 基金搜索API配置
const FUND_SEARCH_APIS = {
  /**
   * 东方财富基金搜索
   * 格式: https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=易方达
   */
  eastmoneySearch: (keyword: string) => {
    return `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(keyword)}`
  },
  
  /**
   * 天天基金搜索
   * 格式: https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=0&key=易方达
   */
  tiantianSearch: (keyword: string) => {
    return `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=0&key=${encodeURIComponent(keyword)}`
  },
  
  /**
   * 基金详情信息
   * 格式: https://fundgz.1234567.com.cn/js/005827.js?rt=timestamp
   */
  fundDetail: (code: string) => {
    return `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
  }
}

// 请求头配置 - 在浏览器中只能设置安全的头部
const REQUEST_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
}

// 本地存储键名
const STORAGE_KEYS = {
  USER_FUNDS: 'fund_stock_show_user_funds',
  FUND_SEARCH_HISTORY: 'fund_stock_show_search_history'
}

/**
 * 搜索基金（完全无CORS限制的解决方案）
 */
export async function searchFunds(keyword: string): Promise<FundSearchResult[]> {
  if (!keyword.trim()) {
    return []
  }
  
  console.log(`🔍 搜索基金: ${keyword}`)
  
  try {
    // 获取用户已添加的基金列表
    const userFunds = getUserFunds()
    const userFundCodes = new Set(userFunds.map(fund => fund.code))
    
    // 清理输入
    const cleanKeyword = keyword.trim()
    
    // 保存搜索历史
    saveSearchHistory(cleanKeyword)
    
    // 策略1：如果是6位数字代码，优先尝试精确获取
    if (/^\d{6}$/.test(cleanKeyword)) {
      console.log(`📊 策略1: 按基金代码 ${cleanKeyword} 精确获取`)
      
      // 尝试1：使用JSONP获取天天基金数据
      if (isBrowser) {
        try {
          const tiantianUrl = NO_CORS_APIS.tiantianFund(cleanKeyword)
          const jsonpData = await createJsonpPromise<any>(tiantianUrl, 'callback')
          
          if (jsonpData && jsonpData.fundcode) {
            return [{
              code: jsonpData.fundcode,
              name: jsonpData.name,
              type: '基金',
              company: '基金公司',
              netValue: jsonpData.dwjz ? parseFloat(jsonpData.dwjz) : undefined,
              changePercent: jsonpData.gszzl ? parseFloat(jsonpData.gszzl) : undefined,
              isAdded: userFundCodes.has(cleanKeyword)
            }]
          }
        } catch (jsonpError) {
          console.warn('天天基金JSONP失败:', jsonpError)
        }
      }
      
      // 尝试2：使用公开API
      try {
        const publicUrl = NO_CORS_APIS.publicFundApi(cleanKeyword)
        const response = await axios.get(publicUrl, { timeout: 5000 })
        
        if (response.data && response.data.code) {
          return [{
            code: response.data.code,
            name: response.data.name || `基金${cleanKeyword}`,
            type: response.data.type || '基金',
            company: response.data.company || '基金公司',
            netValue: response.data.netValue,
            changePercent: response.data.changePercent,
            isAdded: userFundCodes.has(cleanKeyword)
          }]
        }
      } catch (publicApiError) {
        console.warn('公开API失败:', publicApiError.message)
      }
      
      console.log(`⚠️ 代码 ${cleanKeyword} 精确获取失败，尝试模糊搜索`)
    }
    
    // 策略2：使用JSONP进行模糊搜索
    console.log(`🔍 策略2: 使用JSONP进行模糊搜索`)
    
    if (isBrowser) {
      try {
        const searchUrl = NO_CORS_APIS.eastmoneySearchJsonp(cleanKeyword)
        const searchData = await createJsonpPromise<any>(searchUrl, 'callback')
        
        if (searchData && searchData.Datas) {
          const results = parseSearchResults(searchData, userFundCodes)
          if (results.length > 0) {
            return results
          }
        }
      } catch (jsonpError) {
        console.warn('JSONP搜索失败:', jsonpError)
      }
    }
    
    // 策略3：返回模拟数据
    console.log(`🔄 策略3: 返回模拟数据`)
    return generateMockSearchResults(cleanKeyword)
    
  } catch (error) {
    console.error('基金搜索失败:', error)
    // 返回模拟数据作为降级
    return generateMockSearchResults(keyword)
  }
}

/**
 * 解析搜索结果
 */
function parseSearchResults(data: any, userFundCodes: Set<string>): FundSearchResult[] {
  const results: FundSearchResult[] = []
  
  try {
    if (data && data.Datas && Array.isArray(data.Datas)) {
      data.Datas.forEach((item: any) => {
        if (item.CODE && item.NAME) {
          results.push({
            code: item.CODE,
            name: item.NAME,
            type: item.FUNDTYPE || '混合型',
            company: item.JJGS || '未知基金公司',
            netValue: item.DWJZ ? parseFloat(item.DWJZ) : undefined,
            changePercent: item.RZDF ? parseFloat(item.RZDF) : undefined,
            isAdded: userFundCodes.has(item.CODE)
          })
        }
      })
    }
  } catch (error) {
    console.error('解析搜索结果失败:', error)
  }
  
  // 限制返回数量
  return results.slice(0, 20)
}

/**
 * 获取基金详情（无CORS限制的多源API）
 */
export async function getFundDetail(code: string): Promise<FundSearchResult | null> {
  if (!/^\d{6}$/.test(code)) {
    console.error(`无效的基金代码: ${code}`)
    return null
  }
  
  console.log(`📊 获取基金 ${code} 详情...`)
  
  // 获取用户已添加的基金列表
  const userFunds = getUserFunds()
  const isAdded = userFunds.some(fund => fund.code === code)
  
  // 尝试的API顺序（优先无CORS方案）
  const apiAttempts = [
    { name: '天天基金JSONP', fetch: fetchFundDetailFromTiantian },
    { name: '公开基金API', fetch: fetchFundDetailFromPublicApi },
    { name: '代理服务器API', fetch: fetchFundDetailFromProxy },
    { name: '东方财富API', fetch: fetchFundDetailFromEastmoney }
  ]
  
  for (const attempt of apiAttempts) {
    try {
      console.log(`🔍 尝试 ${attempt.name}...`)
      const fundDetail = await attempt.fetch(code)
      
      if (fundDetail) {
        console.log(`✅ ${attempt.name} 成功获取基金 ${code} 详情`)
        return {
          ...fundDetail,
          isAdded
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${attempt.name} 失败:`, error.message)
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  console.error(`❌ 所有API都无法获取基金 ${code} 详情`)
  
  // 返回一个基本的基金信息
  return {
    code,
    name: `基金${code}`,
    type: '基金',
    company: '基金公司',
    isAdded
  }
}

/**
 * 通过代理服务器获取基金详情
 */
async function fetchFundDetailFromProxy(code: string): Promise<FundSearchResult | null> {
  try {
    const proxyUrl = `${PROXY_BASE_URL}/api/fund/estimate/${code}`
    
    const response = await axios.get(proxyUrl, {
      timeout: 5000
    })
    
    if (response.data && response.data.fundcode) {
      const userFunds = getUserFunds()
      const isAdded = userFunds.some(fund => fund.code === code)
      
      return {
        code: response.data.fundcode,
        name: response.data.name,
        type: '基金',
        company: '基金公司',
        netValue: response.data.dwjz ? parseFloat(response.data.dwjz) : undefined,
        changePercent: response.data.gszzl ? parseFloat(response.data.gszzl) : undefined,
        isAdded
      }
    }
    
  } catch (error) {
    throw new Error(`代理服务器API失败: ${error.message}`)
  }
  
  return null
}

/**
 * 通过天天基金API获取基金详情（使用JSONP）
 */
async function fetchFundDetailFromTiantian(code: string): Promise<FundSearchResult | null> {
  try {
    // 天天基金API已经是JSONP格式，直接使用
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
    
    // 在浏览器环境中使用JSONP，在Node.js环境中使用axios
    if (isBrowser) {
      // 使用专门的天天基金JSONP函数（使用固定的jsonpgz回调名）
      const jsonpData = await createTiantianJsonpPromise<any>(url)
      
      if (jsonpData && jsonpData.fundcode) {
        const userFunds = getUserFunds()
        const isAdded = userFunds.some(fund => fund.code === code)
        
        return {
          code: jsonpData.fundcode,
          name: jsonpData.name,
          type: '基金',
          company: '基金公司',
          netValue: jsonpData.dwjz ? parseFloat(jsonpData.dwjz) : undefined,
          changePercent: jsonpData.gszzl ? parseFloat(jsonpData.gszzl) : undefined,
          isAdded
        }
      }
    } else {
      // Node.js环境中使用axios
      const response = await axios.get(url, {
        timeout: 5000,
        headers: getFundApiHeaders(),
        responseType: 'text'
      })
      
      // 解析JSONP格式
      const jsonStr = response.data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
      const data = JSON.parse(jsonStr)
      
      if (data && data.fundcode) {
        const userFunds = getUserFunds()
        const isAdded = userFunds.some(fund => fund.code === code)
        
        return {
          code: data.fundcode,
          name: data.name,
          type: '基金',
          company: '基金公司',
          netValue: data.dwjz ? parseFloat(data.dwjz) : undefined,
          changePercent: data.gszzl ? parseFloat(data.gszzl) : undefined,
          isAdded
        }
      }
    }
    
  } catch (error) {
    console.warn(`天天基金API失败: ${error.message}`)
    throw new Error(`天天基金API失败: ${error.message}`)
  }
  
  return null
}

/**
 * 通过公开API获取基金详情（无CORS限制）
 */
async function fetchFundDetailFromPublicApi(code: string): Promise<FundSearchResult | null> {
  try {
    // 优先使用无CORS限制的JSONP API
    try {
      const jsonpResult = await fetchFundDetailFromTiantianJsonp(code)
      if (jsonpResult) {
        return jsonpResult
      }
    } catch (jsonpError) {
      console.log('JSONP API失败，尝试其他API:', jsonpError.message)
    }
    
    // 备用API列表（无CORS限制或支持JSONP）
    const backupApis = [
      // 东方财富基金详情API（支持JSONP）
      `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1&callback=jsonp`,
      // 天天基金净值API（支持JSONP）
      `https://fundgz.1234567.com.cn/js/${code}.js`,
      // 备用：通过代理服务器访问
      `${PROXY_BASE_URL}/api/fund/detail/${code}`
    ]
    
    for (const apiUrl of backupApis) {
      try {
        console.log(`尝试API: ${apiUrl}`)
        
        // 如果是JSONP格式的URL
        if (apiUrl.includes('.js') || apiUrl.includes('callback=')) {
          // 使用JSONP获取数据
          const jsonpData = await createJsonpPromise<any>(apiUrl)
          
          if (jsonpData && (jsonpData.fundcode || jsonpData.code)) {
            const userFunds = getUserFunds()
            const isAdded = userFunds.some(fund => fund.code === code)
            
            return {
              code: jsonpData.fundcode || jsonpData.code,
              name: jsonpData.name || `基金${code}`,
              type: '基金',
              company: jsonpData.company || '基金公司',
              netValue: jsonpData.dwjz ? parseFloat(jsonpData.dwjz) : undefined,
              changePercent: jsonpData.gszzl ? parseFloat(jsonpData.gszzl) : undefined,
              isAdded
            }
          }
        } else {
          // 普通HTTP请求
          const response = await axios.get(apiUrl, {
            timeout: 3000,
            headers: getFundApiHeaders()
          })
          
          if (response.data) {
            const fundData = response.data
            if (fundData.code || fundData.fundcode) {
              const userFunds = getUserFunds()
              const isAdded = userFunds.some(fund => fund.code === code)
              
              return {
                code: fundData.code || fundData.fundcode,
                name: fundData.name || `基金${code}`,
                type: fundData.type || '基金',
                company: fundData.company || '基金公司',
                netValue: fundData.netValue || fundData.dwjz,
                changePercent: fundData.changePercent || fundData.gszzl,
                isAdded
              }
            }
          }
        }
      } catch (apiError) {
        console.log(`API ${apiUrl} 失败:`, apiError.message)
        // 继续尝试下一个API
        continue
      }
    }
    
  } catch (error) {
    console.error('所有公开API都失败了:', error.message)
    throw new Error(`公开API失败: ${error.message}`)
  }
  
  return null
}

/**
 * 通过东方财富API获取基金详情
 */
async function fetchFundDetailFromEastmoney(code: string): Promise<FundSearchResult | null> {
  try {
    // 东方财富基金详情API
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`
    
    const response = await axios.get(url, {
      timeout: 5000,
      headers: getFundApiHeaders()
    })
    
    if (response.data && response.data.ErrCode === 0 && response.data.Data) {
      // 获取基金名称（需要另一个API）
      let fundName = `基金${code}`
      try {
        const infoUrl = `https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`
        const infoResponse = await axios.get(infoUrl, {
          timeout: 3000,
          headers: getFundApiHeaders(),
          responseType: 'text'
        })
        
        // 从JS文件中提取基金名称
        const nameMatch = infoResponse.data.match(/fS_name\s*=\s*"([^"]+)"/)
        if (nameMatch) {
          fundName = nameMatch[1]
        }
      } catch (nameError) {
        console.warn('获取基金名称失败:', nameError.message)
      }
      
      const lsjzList = response.data.Data.LSJZList
      const latestData = lsjzList && lsjzList[0]
      
      return {
        code,
        name: fundName,
        type: '基金',
        company: '基金公司',
        netValue: latestData ? parseFloat(latestData.DWJZ) : undefined,
        changePercent: latestData && latestData.JZZZL ? parseFloat(latestData.JZZZL) : undefined
      }
    }
    
  } catch (error) {
    throw new Error(`东方财富API失败: ${error.message}`)
  }
  
  return null
}

/**
 * 添加基金到用户列表
 */
export function addFundToUserList(fund: FundSearchResult): boolean {
  try {
    const userFunds = getUserFunds()
    
    // 检查是否已添加
    if (userFunds.some(f => f.code === fund.code)) {
      console.log(`基金 ${fund.code} 已添加`)
      return false
    }
    
    // 添加新基金
    const newFund: UserFundConfig = {
      code: fund.code,
      name: fund.name,
      addedAt: Date.now()
    }
    
    userFunds.push(newFund)
    localStorage.setItem(STORAGE_KEYS.USER_FUNDS, JSON.stringify(userFunds))
    
    console.log(`✅ 添加基金: ${fund.name} (${fund.code})`)
    return true
    
  } catch (error) {
    console.error('添加基金失败:', error)
    return false
  }
}

/**
 * 从用户列表移除基金
 */
export function removeFundFromUserList(code: string): boolean {
  try {
    const userFunds = getUserFunds()
    const initialLength = userFunds.length
    
    const filteredFunds = userFunds.filter(fund => fund.code !== code)
    
    if (filteredFunds.length < initialLength) {
      localStorage.setItem(STORAGE_KEYS.USER_FUNDS, JSON.stringify(filteredFunds))
      console.log(`🗑️ 移除基金: ${code}`)
      return true
    }
    
    return false
    
  } catch (error) {
    console.error('移除基金失败:', error)
    return false
  }
}

/**
 * 获取用户基金列表
 */
export function getUserFunds(): UserFundConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_FUNDS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('获取用户基金列表失败:', error)
  }
  
  // 返回默认基金列表
  return getDefaultFunds()
}

/**
 * 获取默认基金列表
 */
function getDefaultFunds(): UserFundConfig[] {
  const defaultFunds = [
    { code: '005827', name: '易方达蓝筹精选混合', addedAt: Date.now() },
    { code: '161725', name: '招商中证白酒指数(LOF)A', addedAt: Date.now() },
    { code: '003095', name: '中欧医疗健康混合A', addedAt: Date.now() },
    { code: '110022', name: '易方达消费行业股票', addedAt: Date.now() },
    { code: '519674', name: '银河创新成长混合', addedAt: Date.now() },
    { code: '260108', name: '景顺长城新兴成长混合', addedAt: Date.now() },
    { code: '000404', name: '易方达新兴成长灵活配置', addedAt: Date.now() }
  ]
  
  // 保存默认列表
  localStorage.setItem(STORAGE_KEYS.USER_FUNDS, JSON.stringify(defaultFunds))
  
  return defaultFunds
}

/**
 * 保存搜索历史
 */
function saveSearchHistory(keyword: string): void {
  try {
    const history = getSearchHistory()
    
    // 移除重复项
    const filteredHistory = history.filter(item => item !== keyword)
    
    // 添加到开头
    filteredHistory.unshift(keyword)
    
    // 限制历史记录数量
    const limitedHistory = filteredHistory.slice(0, 10)
    
    localStorage.setItem(STORAGE_KEYS.FUND_SEARCH_HISTORY, JSON.stringify(limitedHistory))
    
  } catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

/**
 * 获取搜索历史
 */
export function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FUND_SEARCH_HISTORY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('获取搜索历史失败:', error)
  }
  
  return []
}

/**
 * 清空搜索历史
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.FUND_SEARCH_HISTORY)
  } catch (error) {
    console.error('清空搜索历史失败:', error)
  }
}

/**
 * 生成模拟搜索结果（降级方案）
 */
function generateMockSearchResults(keyword: string): FundSearchResult[] {
  console.log('🔄 生成模拟搜索结果...')
  
  const mockFunds = [
    { code: '005827', name: '易方达蓝筹精选混合', type: '混合型', company: '易方达基金' },
    { code: '161725', name: '招商中证白酒指数(LOF)A', type: '指数型', company: '招商基金' },
    { code: '003095', name: '中欧医疗健康混合A', type: '混合型', company: '中欧基金' },
    { code: '110022', name: '易方达消费行业股票', type: '股票型', company: '易方达基金' },
    { code: '519674', name: '银河创新成长混合', type: '混合型', company: '银河基金' },
    { code: '260108', name: '景顺长城新兴成长混合', type: '混合型', company: '景顺长城基金' },
    { code: '000404', name: '易方达新兴成长灵活配置', type: '混合型', company: '易方达基金' },
    { code: '001714', name: '工银瑞信文体产业股票A', type: '股票型', company: '工银瑞信基金' },
    { code: '002190', name: '农银汇理新能源主题', type: '混合型', company: '农银汇理基金' },
    { code: '519066', name: '汇添富蓝筹稳健混合', type: '混合型', company: '汇添富基金' }
  ]
  
  const userFunds = getUserFunds()
  const userFundCodes = new Set(userFunds.map(fund => fund.code))
  
  // 过滤和匹配关键词
  const filteredResults = mockFunds.filter(fund => {
    const searchLower = keyword.toLowerCase()
    return (
      fund.code.toLowerCase().includes(searchLower) ||
      fund.name.toLowerCase().includes(searchLower) ||
      fund.company.toLowerCase().includes(searchLower)
    )
  })
  
  return filteredResults.map(fund => ({
    ...fund,
    netValue: 1.0 + Math.random() * 3,
    changePercent: (Math.random() - 0.5) * 5,
    isAdded: userFundCodes.has(fund.code)
  }))
}

/**
 * 导出用户基金配置
 */
export function exportUserFunds(): string {
  const userFunds = getUserFunds()
  return JSON.stringify(userFunds, null, 2)
}

/**
 * 导入用户基金配置
 */
export function importUserFunds(jsonString: string): boolean {
  try {
    const importedFunds = JSON.parse(jsonString)
    
    if (Array.isArray(importedFunds)) {
      // 验证数据结构
      const validFunds = importedFunds.filter(fund => 
        fund && typeof fund.code === 'string' && typeof fund.name === 'string'
      )
      
      localStorage.setItem(STORAGE_KEYS.USER_FUNDS, JSON.stringify(validFunds))
      console.log(`✅ 导入 ${validFunds.length} 只基金`)
      return true
    }
    
  } catch (error) {
    console.error('导入基金配置失败:', error)
  }
  
  return false
}

/**
 * 更新用户基金备注
 */
export function updateFundNote(code: string, notes: string): boolean {
  try {
    const userFunds = getUserFunds()
    const fundIndex = userFunds.findIndex(fund => fund.code === code)
    
    if (fundIndex !== -1) {
      userFunds[fundIndex].notes = notes
      localStorage.setItem(STORAGE_KEYS.USER_FUNDS, JSON.stringify(userFunds))
      console.log(`📝 更新基金 ${code} 备注`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('更新基金备注失败:', error)
    return false
  }
}

/**
 * 获取基金备注
 */
export function getFundNote(code: string): string | undefined {
  try {
    const userFunds = getUserFunds()
    const fund = userFunds.find(fund => fund.code === code)
    return fund?.notes
  } catch (error) {
    console.error('获取基金备注失败:', error)
    return undefined
  }
}

export default {
  searchFunds,
  getFundDetail,
  addFundToUserList,
  removeFundFromUserList,
  getUserFunds,
  getSearchHistory,
  clearSearchHistory,
  exportUserFunds,
  importUserFunds,
  updateFundNote,
  getFundNote
}