/**
 * 估值图表组件
 * 可视化展示估值计算过程和结果
 */

import React from 'react'
import { Card, Row, Col } from 'antd'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LabelList
} from 'recharts'

interface ValuationChartProps {
  valuation: {
    weightedChange: number
    cashContribution: number
    otherContribution: number
    estimatedChangePercent: number
    stockContributions: Array<{
      stockName: string
      contribution: number
    }>
  }
}

const ValuationChart: React.FC<ValuationChartProps> = ({ valuation }) => {
  
  // 准备贡献度饼图数据
  const contributionData = [
    { name: '股票贡献', value: Math.abs(valuation.weightedChange), type: 'stock' },
    { name: '现金贡献', value: Math.abs(valuation.cashContribution), type: 'cash' },
    { name: '其他贡献', value: Math.abs(valuation.otherContribution), type: 'other' }
  ].filter(item => item.value > 0.001)

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28']

  // 准备股票贡献柱状图数据（前10只）
  const topStocks = [...valuation.stockContributions]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)
    .map(stock => ({
      name: stock.stockName.length > 4 ? stock.stockName.substring(0, 4) + '...' : stock.stockName,
      contribution: stock.contribution,
      absContribution: Math.abs(stock.contribution)
    }))

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.name}</p>
          <p style={{ margin: 0, color: payload[0].value > 0 ? '#cf1322' : '#3f8600' }}>
            贡献度: {payload[0].value > 0 ? '+' : ''}{payload[0].value !== undefined ? payload[0].value.toFixed(3) + '%' : 'N/A'}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Row gutter={[16, 16]}>
      {/* 贡献度分布饼图 */}
      <Col span={12}>
        <Card title="贡献度分布" size="small">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent !== undefined ? (percent * 100).toFixed(1) + '%' : 'N/A'}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value !== undefined ? value.toFixed(3) + '%' : 'N/A'}`, '贡献度']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ 
            marginTop: 16, 
            padding: '8px', 
            background: '#f6ffed', 
            borderRadius: 4,
            fontSize: '12px'
          }}>
            总涨跌幅: 
            <span style={{ 
              fontWeight: 'bold',
              color: valuation.estimatedChangePercent > 0 ? '#cf1322' : '#3f8600',
              marginLeft: 8
            }}>
              {valuation.estimatedChangePercent > 0 ? '+' : ''}{valuation.estimatedChangePercent !== undefined ? valuation.estimatedChangePercent.toFixed(2) + '%' : 'N/A'}
            </span>
          </div>
        </Card>
      </Col>

      {/* 股票贡献排名柱状图 */}
      <Col span={12}>
        <Card title="股票贡献排名 (前10)" size="small">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topStocks}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  label={{ 
                    value: '贡献度 (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="contribution" 
                  name="贡献度"
                  fill="#8884d8"
                >
                  <LabelList 
                    dataKey="contribution" 
                    position="top"
                    formatter={(value: number) => value !== undefined ? value.toFixed(2) : "N/A"}
                    style={{ fontSize: '10px' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ 
            marginTop: 16, 
            padding: '8px', 
            background: '#e6f7ff', 
            borderRadius: 4,
            fontSize: '12px'
          }}>
            注：柱状图高度表示该股票对基金净值变化的贡献程度，正值表示推动上涨，负值表示导致下跌。
          </div>
        </Card>
      </Col>

      {/* 详细数据表格 */}
      <Col span={24}>
        <Card title="详细贡献数据" size="small">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #d9d9d9' }}>项目</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #d9d9d9' }}>贡献度 (%)</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #d9d9d9' }}>占比</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #d9d9d9' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>股票加权贡献</td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'right', 
                    border: '1px solid #d9d9d9',
                    color: valuation.weightedChange > 0 ? '#cf1322' : '#3f8600',
                    fontWeight: 'bold'
                  }}>
                    {valuation.weightedChange > 0 ? '+' : ''}{valuation.weightedChange !== undefined ? valuation.weightedChange.toFixed(3) + '%' : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #d9d9d9' }}>
                    {Math.abs(valuation.weightedChange) > 0 ? 
                      (valuation.estimatedChangePercent !== undefined ? (Math.abs(valuation.weightedChange) / Math.abs(valuation.estimatedChangePercent) * 100).toFixed(1) : "N/A" + '%' : 
                      '0%'
                    }
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                    基于持仓股票实时涨跌加权计算
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>现金贡献</td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'right', 
                    border: '1px solid #d9d9d9',
                    color: valuation.cashContribution > 0 ? '#cf1322' : '#3f8600'
                  }}>
                    {valuation.cashContribution > 0 ? '+' : ''}{valuation.cashContribution !== undefined ? valuation.cashContribution.toFixed(3) + '%' : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #d9d9d9' }}>
                    {Math.abs(valuation.cashContribution) > 0 ? 
                      (valuation.estimatedChangePercent !== undefined ? (Math.abs(valuation.cashContribution) / Math.abs(valuation.estimatedChangePercent) * 100).toFixed(1) : "N/A" + '%' : 
                      '0%'
                    }
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                    假设现金年化收益率2%，按日折算
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>其他资产贡献</td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'right', 
                    border: '1px solid #d9d9d9',
                    color: valuation.otherContribution > 0 ? '#cf1322' : '#3f8600'
                  }}>
                    {valuation.otherContribution > 0 ? '+' : ''}{valuation.otherContribution !== undefined ? valuation.otherContribution.toFixed(3) + '%' : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #d9d9d9' }}>
                    {Math.abs(valuation.otherContribution) > 0 ? 
                      (valuation.estimatedChangePercent !== undefined ? (Math.abs(valuation.otherContribution) / Math.abs(valuation.estimatedChangePercent) * 100).toFixed(1) : "N/A" + '%' : 
                      '0%'
                    }
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                    债券、存款等其他资产，假设无日收益
                  </td>
                </tr>
                <tr style={{ background: '#f6ffed' }}>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>总计</td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'right', 
                    border: '1px solid #d9d9d9',
                    color: valuation.estimatedChangePercent > 0 ? '#cf1322' : '#3f8600',
                    fontWeight: 'bold'
                  }}>
                    {valuation.estimatedChangePercent > 0 ? '+' : ''}{valuation.estimatedChangePercent !== undefined ? valuation.estimatedChangePercent.toFixed(3) + '%' : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>
                    100%
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #d9d9d9', fontWeight: 'bold' }}>
                    基金估算总涨跌幅
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </Col>
    </Row>
  )
}

export default ValuationChart