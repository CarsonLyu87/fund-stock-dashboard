import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import type { StockData } from '../types'

interface StockChartProps {
  stocks: StockData[]
}

const StockChart: React.FC<StockChartProps> = ({ stocks }) => {
  // 准备图表数据
  const chartData = stocks.map(stock => ({
    name: stock.symbol,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    volume: stock.volume / 1000000, // 转换为百万
    fullName: stock.name
  }))

  // 获取第一个股票的历史数据用于展示
  const firstStock = stocks[0]
  const historyData = firstStock?.history || []

  return (
    <div className="stock-chart-container">
      <div className="chart-grid">
        <div className="chart-card">
          <h3>📊 股票价格对比</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: '价格 (USD)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'price') return [`$${value}`, '价格']
                    if (name === 'changePercent') return [`${value}%`, '涨跌幅']
                    return [value, name]
                  }}
                  labelFormatter={(label) => `股票: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="价格"
                />
                <Line 
                  type="monotone" 
                  dataKey="changePercent" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="涨跌幅%"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>📈 {firstStock?.name} ({firstStock?.symbol}) 24小时走势</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" />
                <YAxis 
                  label={{ value: '价格 (USD)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => [`$${value}`, '价格']}
                  labelFormatter={(label) => `时间: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#ff7300" 
                  fill="#ff7300" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="stock-stats">
        <h3>📋 股票统计</h3>
        <div className="stats-grid">
          {stocks.map((stock) => (
            <div key={stock.symbol} className="stock-stat-card">
              <div className="stock-header">
                <span className="stock-symbol">{stock.symbol}</span>
                <span className="stock-name">{stock.name}</span>
              </div>
              <div className="stock-price">${stock.price.toFixed(2)}</div>
              <div className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} 
                <span className="change-percent">
                  ({stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="stock-volume">
                成交量: {(stock.volume / 1000000).toFixed(2)}M
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StockChart