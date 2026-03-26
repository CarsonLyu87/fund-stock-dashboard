import React from 'react'
import { Card, Typography, Progress, Tag, Tooltip } from 'antd'
import { BarChartOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { Fund } from '../types'

const { Text, Paragraph } = Typography

interface PortfolioValuationInfoProps {
  fund: Fund & {
    portfolioCalculatedValue?: number
    portfolioCalculatedChangePercent?: number
    portfolioConfidence?: number
    portfolioStockCount?: number
    valuationDifference?: number
  }
}

const PortfolioValuationInfo: React.FC<PortfolioValuationInfoProps> = ({ fund }) => {
  // 检查是否有持仓估值数据
  const hasPortfolioValuation = 
    fund.portfolioCalculatedValue !== undefined && 
    fund.portfolioCalculatedChangePercent !== undefined
  
  if (!hasPortfolioValuation) {
    return null
  }
  
  const confidence = fund.portfolioConfidence || 0
  const stockCount = fund.portfolioStockCount || 0
  const valuationDiff = fund.valuationDifference || 0
  
  // 置信度颜色
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return '#52c41a' // 高置信度
    if (conf >= 0.6) return '#faad14' // 中置信度
    return '#ff4d4f' // 低置信度
  }
  
  // 差异评估
  const getDifferenceLevel = (diff: number) => {
    if (diff < 0.3) return { text: '基本一致', color: '#52c41a', icon: <CheckCircleOutlined /> }
    if (diff < 0.8) return { text: '较小差异', color: '#faad14', icon: <InfoCircleOutlined /> }
    return { text: '差异较大', color: '#ff4d4f', icon: <WarningOutlined /> }
  }
  
  const diffLevel = getDifferenceLevel(valuationDiff)
  
  return (
    <Card 
      size="small" 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChartOutlined />
          <span>持仓估值分析</span>
          <Tag color="blue" style={{ marginLeft: 'auto' }}>
            基于{stockCount}只持仓股票
          </Tag>
        </div>
      }
      style={{ marginTop: 16, background: '#fafafa' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 左侧：估值数据 */}
        <div>
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>持仓计算净值:</Text>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
              {fund.portfolioCalculatedValue?.toFixed(4)}
            </div>
          </Paragraph>
          
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>持仓计算涨跌:</Text>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 'bold',
              color: (fund.portfolioCalculatedChangePercent || 0) >= 0 ? '#3f8600' : '#cf1322'
            }}>
              {(fund.portfolioCalculatedChangePercent || 0) >= 0 ? '+' : ''}
              {fund.portfolioCalculatedChangePercent?.toFixed(2)}%
            </div>
          </Paragraph>
        </div>
        
        {/* 右侧：质量评估 */}
        <div>
          <Paragraph style={{ marginBottom: 12 }}>
            <Text strong>数据置信度:</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Progress 
                percent={Math.round(confidence * 100)} 
                size="small" 
                strokeColor={getConfidenceColor(confidence)}
                style={{ flex: 1 }}
              />
              <Text style={{ color: getConfidenceColor(confidence), minWidth: 40 }}>
                {Math.round(confidence * 100)}%
              </Text>
            </div>
          </Paragraph>
          
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>与API估值对比:</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {diffLevel.icon}
              <Text style={{ color: diffLevel.color }}>
                {diffLevel.text} ({valuationDiff.toFixed(2)}%)
              </Text>
            </div>
          </Paragraph>
        </div>
      </div>
      
      {/* 数据来源说明 */}
      <div style={{ 
        marginTop: 12, 
        padding: 8, 
        background: '#f0f9ff', 
        borderRadius: 4,
        fontSize: 12 
      }}>
        <Text type="secondary">
          📊 <strong>计算方法:</strong> 根据基金持仓股票实时涨跌，按持仓比例加权计算。
          {stockCount > 0 && ` 覆盖前${stockCount}大重仓股。`}
          {confidence < 0.8 && ' 注：持仓数据可能已过期，建议参考官方净值。'}
        </Text>
      </div>
      
      {/* 估值对比表格 */}
      {fund.estimatedValue && fund.estimatedChangePercent !== undefined && (
        <div style={{ marginTop: 16 }}>
          <Paragraph strong style={{ marginBottom: 8 }}>估值对比:</Paragraph>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            fontSize: 12 
          }}>
            <div style={{ textAlign: 'center', padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold' }}>官方净值</div>
              <div>{fund.currentPrice.toFixed(4)}</div>
              <div style={{ 
                color: fund.changePercent >= 0 ? '#3f8600' : '#cf1322',
                fontSize: 11
              }}>
                {fund.changePercent >= 0 ? '+' : ''}{fund.changePercent.toFixed(2)}%
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: 8, background: '#e6f7ff', borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold' }}>持仓计算</div>
              <div>{fund.portfolioCalculatedValue?.toFixed(4)}</div>
              <div style={{ 
                color: (fund.portfolioCalculatedChangePercent || 0) >= 0 ? '#3f8600' : '#cf1322',
                fontSize: 11
              }}>
                {(fund.portfolioCalculatedChangePercent || 0) >= 0 ? '+' : ''}
                {fund.portfolioCalculatedChangePercent?.toFixed(2)}%
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: 8, background: '#f6ffed', borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold' }}>API估值</div>
              <div>{fund.estimatedValue.toFixed(4)}</div>
              <div style={{ 
                color: fund.estimatedChangePercent >= 0 ? '#3f8600' : '#cf1322',
                fontSize: 11
              }}>
                {fund.estimatedChangePercent >= 0 ? '+' : ''}{fund.estimatedChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PortfolioValuationInfo