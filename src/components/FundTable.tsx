import React from 'react'
import type { Fund } from '../types'

interface FundTableProps {
  funds: Fund[]
}

const FundTable: React.FC<FundTableProps> = ({ funds }) => {
  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatVolume = (volume: number) => {
    if (volume >= 100000000) {
      return (volume / 100000000).toFixed(2) + '亿'
    } else if (volume >= 10000) {
      return (volume / 10000).toFixed(2) + '万'
    }
    return volume.toString()
  }

  return (
    <div className="fund-table-container">
      <div className="table-responsive">
        <table className="fund-table">
          <thead>
            <tr>
              <th>基金名称</th>
              <th>代码</th>
              <th>当前净值</th>
              <th>涨跌幅</th>
              <th>涨跌额</th>
              <th>成交量</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((fund) => (
              <tr key={fund.id} className="fund-row">
                <td className="fund-name">
                  <div className="fund-name-content">
                    <span className="fund-icon">📊</span>
                    <span>{fund.name}</span>
                  </div>
                </td>
                <td className="fund-code">{fund.code}</td>
                <td className="fund-price">{formatNumber(fund.currentPrice)}</td>
                <td className={`fund-change ${fund.changePercent >= 0 ? 'positive' : 'negative'}`}>
                  {fund.changePercent >= 0 ? '+' : ''}{fund.changePercent.toFixed(2)}%
                </td>
                <td className={`fund-change-amount ${fund.changeAmount >= 0 ? 'positive' : 'negative'}`}>
                  {fund.changeAmount >= 0 ? '+' : ''}{fund.changeAmount.toFixed(3)}
                </td>
                <td className="fund-volume">{formatVolume(fund.volume)}</td>
                <td>
                  <span className={`status-badge ${fund.changePercent >= 0 ? 'status-up' : 'status-down'}`}>
                    {fund.changePercent >= 0 ? '上涨' : '下跌'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="table-summary">
        <div className="summary-item">
          <span className="summary-label">总计:</span>
          <span className="summary-value">{funds.length} 只基金</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">上涨:</span>
          <span className="summary-value positive">
            {funds.filter(f => f.changePercent > 0).length} 只
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">下跌:</span>
          <span className="summary-value negative">
            {funds.filter(f => f.changePercent < 0).length} 只
          </span>
        </div>
      </div>
    </div>
  )
}

export default FundTable