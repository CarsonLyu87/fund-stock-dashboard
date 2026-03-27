import { useState, useEffect } from 'react'
import { Layout, Card, Row, Col, Statistic, Alert, Spin, Tag, Button } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined } from '@ant-design/icons'
import './App.css'
import UnifiedFundManager from './components/UnifiedFundManager'
import StockChart from './components/StockChart'
import DataAccuracyInfo from './components/DataAccuracyInfo'
import type { Fund, StockData } from './types/index'
import { fetchFundData, fetchStockData, initDataService, getMarketStatus, getFormattedLastUpdateTime } from './utils/api'

const { Header, Content } = Layout

function App() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, openTime: '', closeTime: '', nextOpenTime: '' })
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshCount, setRefreshCount] = useState(0)
  const [fundsUpdated, setFundsUpdated] = useState(0) // 用于触发基金数据重新加载

  // 初始化数据服务
  useEffect(() => {
    const dataService = initDataService()
    
    // 组件卸载时清理
    return () => {
      // 如果有清理方法，可以在这里调用
    }
  }, [])

  // 加载数据
  const loadData = async () => {
    try {
      console.log('🚀 开始加载数据...')
      setLoading(true)
      setError(null)
      
      console.log('📡 获取基金数据...')
      const fundsData = await fetchFundData()
      console.log(`✅ 基金数据获取完成: ${fundsData.length} 只基金`)
      
      console.log('📡 获取股票数据...')
      const stocksData = await fetchStockData()
      console.log(`✅ 股票数据获取完成: ${stocksData.length} 只股票`)
      
      setFunds(fundsData)
      setStocks(stocksData)
      setMarketStatus(getMarketStatus())
      setLastUpdate(getFormattedLastUpdateTime())
      setRefreshCount(prev => prev + 1)
      
      console.log('🎉 数据加载完成，更新UI')
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误'
      setError(`加载数据失败: ${errorMsg}`)
      console.error('❌ 加载数据失败:', err)
      
      // 尝试使用模拟数据作为最后手段
      console.log('🔄 尝试使用模拟数据...')
      try {
        const mockFunds = generateMockFunds()
        const mockStocks = generateMockStocks()
        setFunds(mockFunds)
        setStocks(mockStocks)
        setLastUpdate(getFormattedLastUpdateTime())
        console.log(`✅ 使用模拟数据: ${mockFunds.length} 只基金, ${mockStocks.length} 只股票`)
      } catch (mockError) {
        console.error('❌ 模拟数据也失败:', mockError)
      }
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadData()
  }, [])

  // 当基金列表更新时重新加载数据
  useEffect(() => {
    if (fundsUpdated > 0) {
      console.log('🔄 基金列表已更新，重新加载数据...')
      loadData()
    }
  }, [fundsUpdated])

  // 自动刷新 - 每15分钟更新一次
  useEffect(() => {
    if (!autoRefresh) return
    
    const intervalId = setInterval(() => {
      loadData()
    }, 900000) // 每15分钟（900000毫秒）刷新一次
    
    return () => clearInterval(intervalId)
  }, [autoRefresh])

  // 处理基金更新
  const handleFundsUpdated = () => {
    console.log('📝 基金列表已更新，触发数据重新加载')
    setFundsUpdated(prev => prev + 1)
  }

  // 计算统计数据
  const totalFunds = funds.length
  const totalStocks = stocks.length
  
  const avgFundChange = funds.length > 0 
    ? funds.reduce((sum, fund) => sum + fund.changePercent, 0) / funds.length 
    : 0
  
  const avgStockChange = stocks.length > 0 
    ? stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length 
    : 0

  const risingFunds = funds.filter(fund => fund.changePercent > 0).length
  const risingStocks = stocks.filter(stock => stock.changePercent > 0).length

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <h1>📈 基金股票实时看板</h1>
          <div className="header-controls">
            <Tag color={marketStatus.isOpen ? 'green' : 'red'}>
              {marketStatus.isOpen ? '🟢 交易中' : '🔴 已闭市'}
            </Tag>
            <Tag color="blue">
              更新: {lastUpdate ? formatTime(lastUpdate) : '--:--:--'}
            </Tag>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadData}
              loading={loading}
              size="small"
            >
              刷新
            </Button>
            <Button 
              type={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="small"
            >
              {autoRefresh ? '🔄 自动刷新中' : '⏸️ 暂停刷新'}
            </Button>
            <Tag color="cyan">刷新次数: {refreshCount}</Tag>
          </div>
        </div>
      </Header>

      <Content className="app-content">
        {error && (
          <Alert
            message="数据加载错误"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 市场状态提示 */}
        {!marketStatus.isOpen && (
          <Alert
            message="市场已闭市"
            description={`当前为闭市时间，数据为模拟更新。开市时间：${marketStatus.openTime} - ${marketStatus.closeTime}`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 统计数据 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="基金总数"
                value={totalFunds}
                valueStyle={{ color: '#1890ff' }}
                prefix="💰"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均涨跌"
                value={avgFundChange}
                precision={2}
                valueStyle={{ color: avgFundChange >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={avgFundChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="股票总数"
                value={totalStocks}
                valueStyle={{ color: '#1890ff' }}
                prefix="📊"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均涨跌"
                value={avgStockChange}
                precision={2}
                valueStyle={{ color: avgStockChange >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={avgStockChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title={`📈 上涨基金 (${risingFunds}/${totalFunds})`}>
              <div style={{ fontSize: 24, textAlign: 'center' }}>
                <span style={{ color: '#3f8600' }}>{risingFunds}</span>
                <span style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                  ({totalFunds > 0 ? ((risingFunds / totalFunds) * 100).toFixed(1) + '%' : '0%'})
                </span>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title={`📈 上涨股票 (${risingStocks}/${totalStocks})`}>
              <div style={{ fontSize: 24, textAlign: 'center' }}>
                <span style={{ color: '#3f8600' }}>{risingStocks}</span>
                <span style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                  ({totalStocks > 0 ? ((risingStocks / totalStocks) * 100).toFixed(1) + '%' : '0%'})
                </span>
              </div>
            </Card>
          </Col>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" tip="加载实时数据中..." />
          </div>
        ) : (
          <>
            {/* 数据准确性说明 */}
            <DataAccuracyInfo showDetails={false} />
            
            {/* 统一的基金监控与管理 */}
            <div style={{ marginBottom: 24 }}>
              <UnifiedFundManager onDataReload={loadData} onFundsUpdated={handleFundsUpdated} />
            </div>

            {/* 股票图表 */}
            <div style={{ marginBottom: 24 }}>
              <Card 
                title={`📊 股票走势 (${stocks.length})`}
                extra={
                  <span style={{ fontSize: 12, color: '#666' }}>
                    实时更新中...
                  </span>
                }
              >
                <StockChart stocks={stocks} />
              </Card>
            </div>
          </>
        )}

        {/* 页脚信息 */}
        <div style={{ textAlign: 'center', marginTop: 24, color: '#666', fontSize: 12 }}>
          <p>
            💡 数据每15分钟自动更新一次 | 
            {marketStatus.isOpen ? ' 🟢 实时市场数据' : ' ⚠️ 闭市时间模拟数据'} |
            最后刷新: {refreshCount} 次 | 下次更新: {formatTime(Date.now() + 900000)}
          </p>
          <p>
            📊 <strong>基金数据准确性说明:</strong> 单位净值为官方准确数据（每日更新） | 
            实时估值为参考值（根据持仓估算） | 
            数据来源: 东方财富官方API/天天基金
          </p>
          <p>股票数据来源: 新浪财经/雅虎财经 | 数据缓存: 15分钟</p>
        </div>
      </Content>
    </Layout>
  )
}

export default App