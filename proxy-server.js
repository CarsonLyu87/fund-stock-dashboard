import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 启用CORS
app.use(cors())
app.use(express.json())

// 代理配置
const PROXY_CONFIG = {
  // 东方财富基金净值API
  '/api/eastmoney/fund': {
    baseUrl: 'https://api.fund.eastmoney.com/f10/lsjz',
    requiredHeaders: {
      'Referer': 'https://fund.eastmoney.com/'
    }
  },
  
  // 天天基金实时估值API
  '/api/tiantian/fund': {
    baseUrl: 'https://fundgz.1234567.com.cn/js',
    requiredHeaders: {
      'Referer': 'https://fund.eastmoney.com/'
    }
  },
  
  // 新浪财经股票API
  '/api/sina/stock': {
    baseUrl: 'https://hq.sinajs.cn/list',
    requiredHeaders: {
      'Referer': 'https://finance.sina.com.cn/'
    }
  }
}

// 通用代理路由
app.get('/proxy/*', async (req, res) => {
  try {
    const targetUrl = req.params[0]
    
    if (!targetUrl) {
      return res.status(400).json({ error: '缺少目标URL' })
    }
    
    console.log(`🔗 代理请求: ${targetUrl}`)
    
    // 构建请求配置
    const config = {
      method: 'get',
      url: targetUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000
    }
    
    // 根据目标URL添加特定的Referer头
    if (targetUrl.includes('fund.eastmoney.com')) {
      config.headers.Referer = 'https://fund.eastmoney.com/'
    } else if (targetUrl.includes('sinajs.cn')) {
      config.headers.Referer = 'https://finance.sina.com.cn/'
    } else if (targetUrl.includes('1234567.com.cn')) {
      config.headers.Referer = 'https://fund.eastmoney.com/'
    }
    
    // 发送请求
    const response = await axios(config)
    
    // 设置响应头
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Content-Type', response.headers['content-type'] || 'application/json')
    
    // 返回响应
    res.send(response.data)
    
  } catch (error) {
    console.error('❌ 代理请求失败:', error.message)
    
    res.status(error.response?.status || 500).json({
      error: '代理请求失败',
      message: error.message,
      url: req.params[0]
    })
  }
})

// 专门的基金净值代理
app.get('/api/fund/netvalue/:code', async (req, res) => {
  try {
    const { code } = req.params
    const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`
    
    console.log(`📊 获取基金净值: ${code}`)
    
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 8000
    })
    
    res.json(response.data)
    
  } catch (error) {
    console.error('获取基金净值失败:', error.message)
    res.status(500).json({ error: '获取基金净值失败' })
  }
})

// 专门的基金实时估值代理
app.get('/api/fund/estimate/:code', async (req, res) => {
  try {
    const { code } = req.params
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
    
    console.log(`📈 获取基金实时估值: ${code}`)
    
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      responseType: 'text',
      timeout: 5000
    })
    
    // 解析JSONP响应
    const jsonStr = response.data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
    res.json(JSON.parse(jsonStr))
    
  } catch (error) {
    console.error('获取基金实时估值失败:', error.message)
    res.status(500).json({ error: '获取基金实时估值失败' })
  }
})

// 专门的股票数据代理
app.get('/api/stock/:symbols', async (req, res) => {
  try {
    const { symbols } = req.params
    const url = `https://hq.sinajs.cn/list=${symbols}`
    
    console.log(`📈 获取股票数据: ${symbols}`)
    
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      responseType: 'text',
      timeout: 5000
    })
    
    res.set('Content-Type', 'text/plain; charset=GB2312')
    res.send(response.data)
    
  } catch (error) {
    console.error('获取股票数据失败:', error.message)
    res.status(500).json({ error: '获取股票数据失败' })
  }
})

// 批量基金数据接口
app.get('/api/funds/batch', async (req, res) => {
  try {
    const { codes } = req.query
    const fundCodes = codes ? codes.split(',') : []
    
    if (fundCodes.length === 0) {
      return res.status(400).json({ error: '请提供基金代码' })
    }
    
    console.log(`📊 批量获取基金数据: ${fundCodes.length} 只基金`)
    
    const results = []
    
    for (const code of fundCodes) {
      try {
        // 获取净值数据
        const netValueUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`
        const netValueResponse = await axios.get(netValueUrl, {
          headers: {
            'Referer': 'https://fund.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 5000
        })
        
        // 获取实时估值
        const estimateUrl = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
        const estimateResponse = await axios.get(estimateUrl, {
          headers: {
            'Referer': 'https://fund.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          responseType: 'text',
          timeout: 3000
        })
        
        // 解析数据
        const netValueData = netValueResponse.data
        const estimateJsonStr = estimateResponse.data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
        const estimateData = JSON.parse(estimateJsonStr)
        
        results.push({
          code,
          netValue: netValueData,
          estimate: estimateData
        })
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (fundError) {
        console.warn(`基金 ${code} 数据获取失败:`, fundError.message)
        results.push({
          code,
          error: fundError.message
        })
      }
    }
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('批量获取基金数据失败:', error.message)
    res.status(500).json({ 
      error: '批量获取基金数据失败',
      message: error.message 
    })
  }
})

// 基金详情API（用于搜索功能）
app.get('/api/fund/detail/:code', async (req, res) => {
  try {
    const { code } = req.params
    
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ 
        success: false,
        error: '无效的基金代码',
        message: '基金代码必须是6位数字'
      })
    }
    
    console.log(`获取基金详情: ${code}`)
    
    // 尝试多个API源
    const apiSources = [
      // 天天基金JSONP API
      {
        url: `https://fundgz.1234567.com.cn/js/${code}.js`,
        method: 'jsonp',
        parser: (data) => {
          if (data && data.fundcode) {
            return {
              code: data.fundcode,
              name: data.name,
              netValue: data.dwjz ? parseFloat(data.dwjz) : null,
              changePercent: data.gszzl ? parseFloat(data.gszzl) : null,
              updateTime: data.gztime,
              source: 'tiantian'
            }
          }
          return null
        }
      },
      // 东方财富基金净值API
      {
        url: `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`,
        method: 'http',
        headers: {
          'Referer': 'https://fund.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        parser: (data) => {
          if (data && data.ErrCode === 0 && data.Data && data.Data.LSJZList) {
            const latest = data.Data.LSJZList[0]
            return {
              code,
              name: data.Data.FundName || `基金${code}`,
              netValue: latest ? parseFloat(latest.DWJZ) : null,
              changePercent: latest && latest.JZZZL ? parseFloat(latest.JZZZL) : null,
              updateTime: latest ? latest.FSRQ : null,
              source: 'eastmoney'
            }
          }
          return null
        }
      }
    ]
    
    // 按顺序尝试API源
    for (const source of apiSources) {
      try {
        console.log(`尝试API源: ${source.url}`)
        
        if (source.method === 'jsonp') {
          // JSONP请求
          const response = await axios.get(source.url, {
            timeout: 5000,
            responseType: 'text'
          })
          
          // 解析JSONP响应
          const jsonStr = response.data.replace(/^jsonpgz\(/, '').replace(/\);$/, '')
          const data = JSON.parse(jsonStr)
          
          const result = source.parser(data)
          if (result) {
            return res.json({
              success: true,
              data: result
            })
          }
        } else {
          // HTTP请求
          const response = await axios.get(source.url, {
            headers: source.headers,
            timeout: 5000
          })
          
          const result = source.parser(response.data)
          if (result) {
            return res.json({
              success: true,
              data: result
            })
          }
        }
      } catch (apiError) {
        console.log(`API源 ${source.url} 失败:`, apiError.message)
        // 继续尝试下一个源
        continue
      }
    }
    
    // 所有API源都失败，返回模拟数据
    console.log(`所有API源都失败，返回模拟数据: ${code}`)
    res.json({
      success: true,
      data: {
        code,
        name: `基金${code}`,
        netValue: 1.0 + Math.random() * 0.5,
        changePercent: (Math.random() - 0.5) * 5,
        updateTime: new Date().toISOString(),
        source: 'mock'
      }
    })
    
  } catch (error) {
    console.error('基金详情API错误:', error.message)
    res.status(500).json({
      success: false,
      error: '服务器错误',
      message: error.message
    })
  }
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'fund-stock-proxy-server'
  })
})

// 静态文件服务（用于开发）
app.use(express.static(join(__dirname, 'dist')))

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 代理服务器运行在 http://localhost:${PORT}`)
  console.log(`📊 可用接口:`)
  console.log(`   GET /proxy/{url} - 通用代理`)
  console.log(`   GET /api/fund/netvalue/{code} - 基金净值`)
  console.log(`   GET /api/fund/estimate/{code} - 基金实时估值`)
  console.log(`   GET /api/fund/detail/{code} - 基金详情（用于搜索）`)
  console.log(`   GET /api/stock/{symbols} - 股票数据`)
  console.log(`   GET /api/funds/batch?codes=code1,code2 - 批量基金数据`)
  console.log(`   GET /health - 健康检查`)
})