/**
 * 基金详情组件
 * 展示基金实时估值、持仓数据、计算过程
 */

import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Progress, Alert, Button, Spin } from 'antd'
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { ValuationResult, calculateFundValuation, ValuationUtils } from '../../utils/valuationCalculator'
import { StockHolding } from '../../services/fundHoldingsService'

interface FundDetailProps {
  fundCode: string
  fundName: string
  onClose?: () => void
}

const FundDetail: React.FC<FundDetailProps> = ({ fundCode, fundName, onClose }) => {
  const [valuation, setValuation] = useState<ValuationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)

  // 加载估值数据
  const loadValuation = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log(`加载基金详情: ${fundCode} ${fundName}`)
      const result = await calculateFundValuation(fundCode, fundName, useMockData)
      setValuation(result)
    } catch (err) {
      console.error('加载估值失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadValuation()
    
    // 每30秒自动刷新
    const intervalId = setInterval(() => {
      if (!loading) {
        loadValuation()
      }
    }, 30000)
    
    return () => clearInterval(intervalId)
  }, [fundCode, fundName, useMockData])

  // 手动刷新
  const handleRefresh = () => {
    loadValuation()
  }

  // 切换数据源
  const toggleDataMode = () => {
    setUseMockData(!useMockData)
  }

  if (loading && !valuation) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>正在计算基金估值...</div>
      </div>
    )
  }

  if (error && !valuation) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadValuation}>
            重试
          </Button>
        }
      />
    )
  }

  if (!valuation) {
    return null
  }

  // 表格列定义
  const stockColumns = [
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 120,
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.stockCode}</div>
        </div>
      )
    },
    {
      title: '持仓比例',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight: number) => (
        <div style={{ textAlign: 'right' }}>
          <div>{(weight || 0).toFixed(2)}%</div>
          <Progress 
            percent={weight} 
            size="small" 
            showInfo={false}
            strokeColor="#1890ff"
          />
        </div>
      )
    },
    {
      title: '股票涨跌',
      dataIndex: 'stockChange',
      key: 'stockChange',
      width: 100,
      render: (change: number) => {
        const color = ValuationUtils.getChangeColor(change)
        const icon = change > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
        return (
          <div style={{ color, textAlign: 'right' }}>
            {icon} {ValuationUtils.formatPercent(change)}
          </div>
        )
      }
    },
    {
      title: '贡献度',
      dataIndex: 'contribution',
      key: 'contribution',
      width: 100,
      render: (contribution: number) => {
        const color = contribution > 0 ? '#cf1322' : '#3f8600'
        return (
          <div style={{ color, textAlign: 'right', fontWeight: 'bold' }}>
            {ValuationUtils.formatPercent(contribution, 3)}
          </div>
        )
      }
    }
  ]

  return (
    <div style={{ padding: '16px' }}>
      {/* 头部信息 */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>{valuation.fundName}</h2>
              <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                代码：{valuation.fundCode} | 持仓报告：{valuation.reportDate}
              </div>
            </div>
            <div>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={loading}
                style={{ marginRight: 8 }}
              >
                刷新
              </Button>
              <Button 
                type={useMockData ? 'primary' : 'default'}
                onClick={toggleDataMode}
              >
                {useMockData ? '使用模拟数据' : '使用真实数据'}
              </Button>
            </div>
          </div>
        }
        extra={onClose && <Button onClick={onClose}>关闭</Button>}
      >
        {/* 估值概览 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="昨日净值"
                value={valuation.yesterdayNetValue}
                precision={4}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="估算净值"
                value={valuation.estimatedNetValue}
                precision={4}
                valueStyle={{ 
                  color: ValuationUtils.getChangeColor(valuation.estimatedChangePercent),
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="估算涨跌"
                value={valuation.estimatedChangePercent}
                precision={2}
                prefix={valuation.estimatedChangePercent > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix="%"
                valueStyle={{ 
                  color: ValuationUtils.getChangeColor(valuation.estimatedChangePercent),
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 数据质量指示器 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small" title="置信度">
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={valuation.confidence}
                  width={80}
                  strokeColor={ValuationUtils.getConfidenceColor(valuation.confidence)}
                />
                <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
                  {valuation.confidence >= 80 ? '高' : valuation.confidence >= 60 ? '中' : '低'}
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" title="持仓覆盖率">
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={valuation.stockCoverage}
                  width={80}
                  strokeColor="#1890ff"
                />
                <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
                  {ValuationUtils.getCoverageDescription(valuation.stockCoverage)}
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" title="数据新鲜度">
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  color: ValuationUtils.getFreshnessColor(valuation.dataFreshness)
                }}>
                  {valuation.dataFreshness}
                </div>
                <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
                  持仓报告时间
                </div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" title="数据来源">
              <div style={{ padding: '10px 0' }}>
                {valuation.dataSources.map((source, index) => (
                  <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                    {source}
                  </Tag>
                ))}
                {useMockData && (
                  <Tag color="orange" style={{ marginBottom: 4 }}>
                    模拟数据
                  </Tag>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 计算详情 */}
        <Card 
          title="估值计算详情" 
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ color: '#8c8c8c', fontSize: '12px' }}>股票加权涨跌</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {ValuationUtils.formatPercent(valuation.weightedChange, 3)}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ color: '#8c8c8c', fontSize: '12px' }}>现金贡献</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {ValuationUtils.formatPercent(valuation.cashContribution, 3)}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ color: '#8c8c8c', fontSize: '12px' }}>其他资产贡献</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {ValuationUtils.formatPercent(valuation.otherContribution, 3)}
                </div>
              </div>
            </Col>
          </Row>
          <div style={{ marginTop: 16, padding: '12px', background: '#f6ffed', borderRadius: 4 }}>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            总涨跌幅 = 股票加权涨跌({ValuationUtils.formatPercent(valuation.weightedChange, 3)}) + 
            现金贡献({ValuationUtils.formatPercent(valuation.cashContribution, 3)}) + 
            其他资产贡献({ValuationUtils.formatPercent(valuation.otherContribution, 3)}) = 
            <strong>{ValuationUtils.formatPercent(valuation.estimatedChangePercent)}</strong>
          </div>
        </Card>

        {/* 持仓股票贡献表 */}
        <Card 
          title={`持仓股票贡献 (${valuation.stockContributions.length}只)`}
          size="small"
        >
          <Table
            dataSource={valuation.stockContributions}
            columns={stockColumns}
            rowKey="stockCode"
            pagination={{ 
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 只股票`
            }}
            size="small"
          />
        </Card>

        {/* 底部信息 */}
        <div style={{ 
          marginTop: 24, 
          padding: '12px', 
          background: '#fafafa', 
          borderRadius: 4,
          fontSize: '12px',
          color: '#8c8c8c'
        }}>
          <div>计算时间：{new Date(valuation.calculationTime).toLocaleString('zh-CN')}</div>
          <div style={{ marginTop: 4 }}>
            说明：本估值基于基金最新持仓报告和股票实时行情计算，仅供参考。实际净值以基金公司公布为准。
          </div>
        </div>
      </Card>
    </div>
  )
}

export default FundDetail