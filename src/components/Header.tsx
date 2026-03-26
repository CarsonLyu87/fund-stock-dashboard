import React from 'react'

interface HeaderProps {
  lastUpdated: string
}

const Header: React.FC<HeaderProps> = ({ lastUpdated }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>📈 基金股票实时展示系统</h1>
          <p className="subtitle">实时监控基金与股票市场动态</p>
        </div>
        
        <div className="header-info">
          <div className="update-info">
            <span className="update-label">最后更新:</span>
            <span className="update-time">{lastUpdated || '正在加载...'}</span>
          </div>
          <div className="status-indicator">
            <span className="status-dot active"></span>
            <span className="status-text">数据连接正常</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header