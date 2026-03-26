import React from 'react'
import { Alert, Collapse, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

const { Panel } = Collapse
const { Text, Paragraph } = Typography

interface DataAccuracyInfoProps {
  showDetails?: boolean
}

const DataAccuracyInfo: React.FC<DataAccuracyInfoProps> = ({ showDetails = false }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            <span>基金数据准确性说明</span>
          </div>
        }
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              <Text strong>单位净值</Text>: 官方每日更新的准确净值数据，来自基金公司公告
            </Paragraph>
            <Paragraph style={{ marginBottom: 8 }}>
              <Text strong>实时估值</Text>: 根据基金持仓估算的参考值，非官方数据，仅供参考
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              <Text strong>数据来源</Text>: 东方财富官方API（准确净值） + 天天基金（实时估值）
            </Paragraph>
          </div>
        }
        type="info"
        showIcon={false}
        style={{ background: '#f0f9ff', border: '1px solid #91d5ff' }}
      />
      
      {showDetails && (
        <Collapse ghost style={{ marginTop: 8 }}>
          <Panel header="📋 详细数据源信息" key="1">
            <div style={{ paddingLeft: 16 }}>
              <Paragraph>
                <Text strong>1. 官方净值数据（高准确性）</Text>
              </Paragraph>
              <ul>
                <li>来源: 东方财富基金官方API</li>
                <li>更新频率: 每日收盘后更新（约15:00后）</li>
                <li>数据类型: 单位净值、累计净值</li>
                <li>准确性: ⭐⭐⭐⭐⭐（官方数据）</li>
              </ul>
              
              <Paragraph>
                <Text strong>2. 实时估值数据（参考性）</Text>
              </Paragraph>
              <ul>
                <li>来源: 天天基金实时估值API</li>
                <li>更新频率: 交易时间实时更新（约每10秒）</li>
                <li>数据类型: 估算净值、估算涨跌幅</li>
                <li>准确性: ⭐⭐⭐（基于持仓估算，可能有误差）</li>
              </ul>
              
              <Paragraph>
                <Text strong>3. 数据更新策略</Text>
              </Paragraph>
              <ul>
                <li>优先使用官方净值数据</li>
                <li>实时估值作为参考显示</li>
                <li>数据缓存15分钟，避免频繁请求</li>
                <li>自动降级机制：官方数据失败时使用实时估值</li>
              </ul>
              
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                注：基金净值以基金公司公告为准，实时估值仅供参考，不构成投资建议。
              </Paragraph>
            </div>
          </Panel>
        </Collapse>
      )}
    </div>
  )
}

export default DataAccuracyInfo