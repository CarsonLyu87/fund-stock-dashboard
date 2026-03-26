import React, { useState } from 'react'
import { Table, Tag, Tooltip, Progress, Collapse } from 'antd'
import { 
  CaretDownOutlined, 
  CaretUpOutlined, 
  InfoCircleOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons'
import type { Fund } from '../types'
import PortfolioValuationInfo from './PortfolioValuationInfo'

const { Panel } = Collapse

interface EnhancedFundTableProps {
  funds: Fund[]
  loading?: boolean
}

const EnhancedFundTable: React.FC<EnhancedFundTableProps> = ({ funds, loading = false }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  // 检查基金是否有持仓估值数据
  const hasPortfolioValuation = (fund: Fund) => {
    return fund.portfolioCalculatedValue !== undefined && 
           fund.portfolioCalculatedChangePercent !== undefined
  }

  // 检查基金是否有实时估值数据
  const hasEstimateData = (fund: Fund) => {
    return fund.estimatedValue !== undefined && 
           fund.estimatedChangePercent !== undefined
  }

  // 获取数据来源标签
  const getDataSourceTags = (fund: Fund) => {
    const tags: React.ReactNode[] = []
    
    if (fund.dataSources?.includes('official_net_value')) {
      tags.push(
        <Tag key="official" color="green" style={{ fontSize: 11 }}>
          官方净值
        </Tag>
      )
    }
    
    if (fund.dataSources?.includes('api_estimate')) {
      tags.push(
        <Tag key="api" color="blue" style={{ fontSize: 11 }}>
          API估值
        </Tag>
      )
    }
    
    if (fund.dataSources?.includes('portfolio_calculation')) {
      tags.push(
        <Tag key="portfolio" color="orange" style={{ fontSize: 11 }}>
          持仓计算
        </Tag>
      )
    }
    
    return tags
  }

  // 表格列定义
  const columns = [
    {
      title: '基金信息',
      key: 'info',
      width: 250,
      render: (_: any, record: Fund) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {record.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="default" style={{ fontSize: 11 }}>
              {record.code}
            </Tag>
            {getDataSourceTags(record)}
          </div>
        </div>
      ),
    },
    {
      title: '官方净值',
      key: 'official',
      width: 120,
      render: (_: any, record: Fund) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>
            {record.currentPrice.toFixed(4)}
          </div>
          {record.netValueDate && (
            <div style={{ fontSize: 11, color: '#666' }}>
              {record.netValueDate}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '涨跌幅',
      key: 'change',
      width: 120,
      render: (_: any, record: Fund) => {
        const isPositive = record.changePercent >= 0
        return (
          <div style={{ 
            color: isPositive ? '#3f8600' : '#cf1322',
            fontWeight: 'bold',
            fontSize: 16
          }}>
            {isPositive ? <CaretUpOutlined /> : <CaretDownOutlined />}
            {isPositive ? '+' : ''}{record.changePercent.toFixed(2)}%
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {record.changeAmount >= 0 ? '+' : ''}{record.changeAmount.toFixed(4)}
            </div>
          </div>
        )
      },
    },
    {
      title: '实时估值',
      key: 'estimate',
      width: 140,
      render: (_: any, record: Fund) => {
        if (!hasEstimateData(record)) {
          return <span style={{ color: '#999', fontSize: 12 }}>暂无数据</span>
        }
        
        const isPositive = (record.estimatedChangePercent || 0) >= 0
        return (
          <div>
            <div style={{ 
              color: isPositive ? '#3f8600' : '#cf1322',
              fontWeight: 'bold'
            }}>
              {record.estimatedValue?.toFixed(4)}
            </div>
            <div style={{ 
              color: isPositive ? '#3f8600' : '#cf1322',
              fontSize: 12
            }}>
              {isPositive ? '+' : ''}{record.estimatedChangePercent?.toFixed(2)}%
            </div>
          </div>
        )
      },
    },
    {
      title: '持仓估值',
      key: 'portfolio',
      width: 150,
      render: (_: any, record: Fund) => {
        if (!hasPortfolioValuation(record)) {
          return <span style={{ color: '#999', fontSize: 12 }}>未计算</span>
        }
        
        const isPositive = (record.portfolioCalculatedChangePercent || 0) >= 0
        const confidence = record.portfolioConfidence || 0
        
        return (
          <div>
            <div style={{ 
              color: isPositive ? '#3f8600' : '#cf1322',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {record.portfolioCalculatedValue?.toFixed(4)}
              <Tooltip title={`置信度: ${Math.round(confidence * 100)}%`}>
                <Progress 
                  percent={Math.round(confidence * 100)} 
                  size="small" 
                  strokeWidth={8}
                  strokeColor={confidence >= 0.8 ? '#52c41a' : confidence >= 0.6 ? '#faad14' : '#ff4d4f'}
                  style={{ width: 40 }}
                  showInfo={false}
                />
              </Tooltip>
            </div>
            <div style={{ 
              color: isPositive ? '#3f8600' : '#cf1322',
              fontSize: 12
            }}>
              {isPositive ? '+' : ''}{record.portfolioCalculatedChangePercent?.toFixed(2)}%
            </div>
          </div>
        )
      },
    },
    {
      title: '成交量',
      key: 'volume',
      width: 100,
      render: (_: any, record: Fund) => {
        const formatVolume = (volume: number) => {
          if (volume >= 100000000) {
            return (volume / 100000000).toFixed(2) + '亿'
          } else if (volume >= 10000) {
            return (volume / 10000).toFixed(2) + '万'
          }
          return volume.toString()
        }
        
        return (
          <div style={{ textAlign: 'right' }}>
            {formatVolume(record.volume)}
          </div>
        )
      },
    },
  ]

  // 可展开的行配置
  const expandedRowRender = (record: Fund) => {
    return (
      <div style={{ padding: '16px 24px', background: '#fafafa' }}>
        <PortfolioValuationInfo fund={record} />
        
        {/* 数据来源说明 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined />
            <span>数据来源说明</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {record.dataSources?.includes('official_net_value') && (
              <div style={{ padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                <div style={{ fontWeight: 'bold', color: '#52c41a' }}>官方净值</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  基金公司公告的准确净值，每日收盘后更新
                </div>
              </div>
            )}
            
            {record.dataSources?.includes('api_estimate') && (
              <div style={{ padding: 8, background: '#e6f7ff', borderRadius: 4 }}>
                <div style={{ fontWeight: 'bold', color: '#1890ff' }}>API估值</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  天天基金实时估值，基于持仓估算，交易时间更新
                </div>
              </div>
            )}
            
            {record.dataSources?.includes('portfolio_calculation') && (
              <div style={{ padding: 8, background: '#fff7e6', borderRadius: 4 }}>
                <div style={{ fontWeight: 'bold', color: '#fa8c16' }}>持仓计算</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  根据基金持仓股票实时涨跌加权计算
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 行展开配置
  const expandable = {
    expandedRowRender,
    expandIcon: ({ expanded, onExpand, record }: any) => {
      const hasDetails = hasPortfolioValuation(record) || hasEstimateData(record)
      
      if (!hasDetails) {
        return null
      }
      
      return (
        <Tooltip title={expanded ? "收起详情" : "展开详情"}>
          <span onClick={e => onExpand(record, e)} style={{ cursor: 'pointer' }}>
            {expanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
          </span>
        </Tooltip>
      )
    },
    rowExpandable: (record: Fund) => hasPortfolioValuation(record) || hasEstimateData(record),
    expandedRowKeys: expandedRows,
    onExpandedRowsChange: setExpandedRows,
  }

  // 统计数据
  const stats = {
    total: funds.length,
    rising: funds.filter(f => f.changePercent > 0).length,
    falling: funds.filter(f => f.changePercent < 0).length,
    withPortfolio: funds.filter(hasPortfolioValuation).length,
    withEstimate: funds.filter(hasEstimateData).length,
  }

  return (
    <div>
      {/* 统计信息 */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ padding: '8px 16px', background: '#f0f9ff', borderRadius: 4 }}>
          <div style={{ fontSize: 12, color: '#666' }}>总计</div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>{stats.total} 只</div>
        </div>
        
        <div style={{ padding: '8px 16px', background: '#f6ffed', borderRadius: 4 }}>
          <div style={{ fontSize: 12, color: '#666' }}>上涨</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#3f8600' }}>
            {stats.rising} 只
          </div>
        </div>
        
        <div style={{ padding: '8px 16px', background: '#fff2f0', borderRadius: 4 }}>
          <div style={{ fontSize: 12, color: '#666' }}>下跌</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#cf1322' }}>
            {stats.falling} 只
          </div>
        </div>
        
        {stats.withPortfolio > 0 && (
          <div style={{ padding: '8px 16px', background: '#fff7e6', borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: '#666' }}>持仓估值</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
              {stats.withPortfolio} 只
            </div>
          </div>
        )}
        
        {stats.withEstimate > 0 && (
          <div style={{ padding: '8px 16px', background: '#e6f7ff', borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: '#666' }}>实时估值</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
              {stats.withEstimate} 只
            </div>
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={funds.map(fund => ({ ...fund, key: fund.id }))}
        loading={loading}
        expandable={expandable}
        pagination={false}
        size="middle"
        rowClassName={(record) => hasPortfolioValuation(record) ? 'has-portfolio-data' : ''}
      />

      {/* 表格说明 */}
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        background: '#fafafa', 
        borderRadius: 4,
        fontSize: 12,
        color: '#666'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <InfoCircleOutlined />
          <span style={{ fontWeight: 'bold' }}>数据说明</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>官方净值：基金公司公告的准确数据，每日更新一次</li>
          <li>实时估值：天天基金API提供的估算数据，交易时间实时更新</li>
          <li>持仓估值：根据基金持仓股票实时涨跌加权计算，更准确但依赖持仓数据</li>
          <li>点击每行前面的箭头可以查看详细估值分析</li>
        </ul>
      </div>
    </div>
  )
}

export default EnhancedFundTable