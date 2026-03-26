/**
 * 持仓表格组件
 * 展示基金持仓股票的详细信息
 */

import React from 'react'
import { Table, Progress, Tag } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { ValuationUtils } from '../../utils/valuationCalculator'

interface HoldingsTableProps {
  holdings: Array<{
    stockCode: string
    stockName: string
    weight: number
    stockChange: number
    contribution: number
  }>
  loading?: boolean
}

const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, loading = false }) => {
  
  // 表格列定义
  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: '股票',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 150,
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
      width: 120,
      sorter: (a: any, b: any) => a.weight - b.weight,
      render: (weight: number) => (
        <div>
          <div style={{ textAlign: 'right', marginBottom: 4 }}>
            {weight.toFixed(2)}%
          </div>
          <Progress 
            percent={weight} 
            size="small" 
            showInfo={false}
            strokeColor="#1890ff"
            style={{ margin: 0 }}
          />
        </div>
      )
    },
    {
      title: '股票涨跌',
      dataIndex: 'stockChange',
      key: 'stockChange',
      width: 120,
      sorter: (a: any, b: any) => a.stockChange - b.stockChange,
      render: (change: number) => {
        const color = ValuationUtils.getChangeColor(change)
        const icon = change > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
        return (
          <div style={{ color, textAlign: 'right', fontWeight: 'bold' }}>
            {icon} {ValuationUtils.formatPercent(change)}
          </div>
        )
      }
    },
    {
      title: '贡献度',
      dataIndex: 'contribution',
      key: 'contribution',
      width: 120,
      sorter: (a: any, b: any) => a.contribution - b.contribution,
      render: (contribution: number) => {
        const color = contribution > 0 ? '#cf1322' : '#3f8600'
        const icon = contribution > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />
        return (
          <div style={{ color, textAlign: 'right', fontWeight: 'bold' }}>
            {icon} {ValuationUtils.formatPercent(contribution, 3)}
          </div>
        )
      }
    },
    {
      title: '影响程度',
      key: 'impact',
      width: 100,
      render: (_: any, record: any) => {
        const absContribution = Math.abs(record.contribution)
        if (absContribution >= 0.1) {
          return <Tag color="red">高影响</Tag>
        } else if (absContribution >= 0.05) {
          return <Tag color="orange">中影响</Tag>
        } else if (absContribution >= 0.01) {
          return <Tag color="blue">低影响</Tag>
        } else {
          return <Tag color="default">微影响</Tag>
        }
      }
    }
  ]

  // 计算统计信息
  const getStatistics = () => {
    if (holdings.length === 0) {
      return {
        totalWeight: 0,
        avgChange: 0,
        positiveCount: 0,
        negativeCount: 0
      }
    }

    const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0)
    const avgChange = holdings.reduce((sum, h) => sum + h.stockChange * h.weight, 0) / totalWeight
    const positiveCount = holdings.filter(h => h.stockChange > 0).length
    const negativeCount = holdings.filter(h => h.stockChange < 0).length

    return {
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      avgChange: parseFloat(avgChange.toFixed(2)),
      positiveCount,
      negativeCount
    }
  }

  const stats = getStatistics()

  return (
    <div>
      {/* 统计信息 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: 16,
        padding: '12px',
        background: '#fafafa',
        borderRadius: 4
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>总持仓比例</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.totalWeight}%</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>平均涨跌</div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: ValuationUtils.getChangeColor(stats.avgChange)
          }}>
            {ValuationUtils.formatPercent(stats.avgChange)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>上涨股票</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#cf1322' }}>
            {stats.positiveCount}只
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>下跌股票</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3f8600' }}>
            {stats.negativeCount}只
          </div>
        </div>
      </div>

      {/* 持仓表格 */}
      <Table
        dataSource={holdings}
        columns={columns}
        rowKey="stockCode"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 只持仓股票`
        }}
        size="middle"
        scroll={{ x: 800 }}
      />

      {/* 说明 */}
      <div style={{ 
        marginTop: 16, 
        padding: '12px', 
        background: '#e6f7ff', 
        borderRadius: 4,
        fontSize: '12px',
        color: '#1890ff'
      }}>
        <div>说明：</div>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>持仓比例：该股票在基金总资产中的占比</li>
          <li>股票涨跌：该股票相对于昨日收盘价的涨跌幅</li>
          <li>贡献度：持仓比例 × 股票涨跌，表示该股票对基金净值变化的贡献</li>
          <li>影响程度：根据贡献度绝对值划分，≥0.1%为高影响，≥0.05%为中影响，≥0.01%为低影响</li>
        </ul>
      </div>
    </div>
  )
}

export default HoldingsTable