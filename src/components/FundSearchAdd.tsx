import React, { useState, useEffect } from 'react'
import { 
  Input, Button, Space, List, Card, Tag, Modal, 
  message, Popover, Divider, Empty, Spin, Tooltip,
  Typography, Alert
} from 'antd'
import { 
  SearchOutlined, PlusOutlined, DeleteOutlined, 
  HistoryOutlined, ExportOutlined, ImportOutlined,
  StarOutlined, StarFilled, InfoCircleOutlined,
  ReloadOutlined, EditOutlined
} from '@ant-design/icons'
import type { FundSearchResult } from '../services/fundSearchService'
import { 
  searchFunds, addFundToUserList, removeFundFromUserList, 
  getUserFunds, getSearchHistory, clearSearchHistory,
  exportUserFunds, importUserFunds, updateFundNote, getFundNote
} from '../services/fundSearchService'

const { Text } = Typography

interface FundSearchAddProps {
  onFundsUpdated?: () => void
  onFundAdded?: (fundCode: string) => void
  onFundRemoved?: (fundCode: string) => void
}

const FundSearchAdd: React.FC<FundSearchAddProps> = ({
  onFundsUpdated,
  onFundAdded,
  onFundRemoved
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [userFunds, setUserFunds] = useState(getUserFunds())
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code') // 搜索模式：代码或名称
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [noteFundCode, setNoteFundCode] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  // 加载搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory())
  }, [])

  // 处理搜索
  const handleSearch = async () => {
    const query = searchQuery.trim()
    
    if (!query) {
      message.warning('请输入基金代码或名称')
      return
    }

    setLoading(true)
    try {
      const results = await searchFunds(query)
      setSearchResults(results)
      
      if (results.length === 0) {
        message.info(`未找到相关基金: ${query}`)
      } else {
        const exactMatch = results.find(r => r.code === query)
        if (exactMatch) {
          message.success(`找到基金: ${exactMatch.name}`)
        } else {
          message.success(`找到 ${results.length} 条相关结果`)
        }
      }
    } catch (error) {
      message.error('搜索失败，请稍后重试')
      console.error('搜索失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 处理添加基金
  const handleAddFund = (fund: FundSearchResult) => {
    const success = addFundToUserList(fund)
    
    if (success) {
      message.success(`已添加基金: ${fund.name}`)
      setUserFunds(getUserFunds())
      setSearchResults(prev => 
        prev.map(item => 
          item.code === fund.code ? { ...item, isAdded: true } : item
        )
      )
      
      // 触发回调
      onFundsUpdated?.()
      onFundAdded?.(fund.code)
    } else {
      message.warning('该基金已添加')
    }
  }

  // 处理移除基金
  const handleRemoveFund = (fundCode: string, fundName: string) => {
    Modal.confirm({
      title: '确认移除',
      content: `确定要移除基金 "${fundName}" 吗？`,
      okText: '移除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        const success = removeFundFromUserList(fundCode)
        
        if (success) {
          message.success(`已移除基金: ${fundName}`)
          setUserFunds(getUserFunds())
          setSearchResults(prev => 
            prev.map(item => 
              item.code === fundCode ? { ...item, isAdded: false } : item
            )
          )
          
          // 触发回调
          onFundsUpdated?.()
          onFundRemoved?.(fundCode)
        }
      }
    })
  }

  // 处理历史搜索点击
  const handleHistoryClick = (historyItem: string) => {
    setSearchQuery(historyItem)
    // 延迟执行搜索，让输入框先更新
    setTimeout(() => {
      handleSearch()
    }, 100)
  }

  // 清空搜索历史
  const handleClearHistory = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空搜索历史吗？',
      okText: '清空',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        clearSearchHistory()
        setSearchHistory([])
        message.success('搜索历史已清空')
      }
    })
  }

  // 导出基金配置
  const handleExport = () => {
    const config = exportUserFunds()
    
    // 创建下载链接
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fund-stock-show-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    message.success('基金配置已导出')
  }

  // 导入基金配置
  const handleImport = () => {
    if (!importText.trim()) {
      message.warning('请输入要导入的配置JSON')
      return
    }

    setImportLoading(true)
    try {
      const success = importUserFunds(importText)
      
      if (success) {
        message.success('基金配置导入成功')
        setUserFunds(getUserFunds())
        setImportModalVisible(false)
        setImportText('')
        
        // 触发回调
        onFundsUpdated?.()
      } else {
        message.error('导入失败，请检查JSON格式')
      }
    } catch (error) {
      message.error('导入失败，请检查JSON格式')
    } finally {
      setImportLoading(false)
    }
  }

  // 处理编辑备注
  const handleEditNote = (fundCode: string, fundName: string) => {
    setNoteFundCode(fundCode)
    setNoteText(getFundNote(fundCode) || '')
    setNoteModalVisible(true)
  }

  // 处理保存备注
  const handleSaveNote = () => {
    if (!noteFundCode) return
    
    setNoteLoading(true)
    try {
      const success = updateFundNote(noteFundCode, noteText.trim())
      
      if (success) {
        message.success('备注已保存')
        setUserFunds(getUserFunds())
        setNoteModalVisible(false)
        setNoteFundCode('')
        setNoteText('')
      } else {
        message.error('保存备注失败')
      }
    } catch (error) {
      message.error('保存备注失败')
    } finally {
      setNoteLoading(false)
    }
  }

  // 渲染基金类型标签
  const renderFundTypeTag = (type: string) => {
    const typeColors: Record<string, string> = {
      '股票型': 'red',
      '混合型': 'blue',
      '指数型': 'green',
      '债券型': 'orange',
      '货币型': 'purple',
      'QDII': 'cyan'
    }
    
    return (
      <Tag color={typeColors[type] || 'default'} style={{ marginRight: 4 }}>
        {type}
      </Tag>
    )
  }

  // 渲染搜索结果项
  const renderSearchResultItem = (fund: FundSearchResult) => (
    <List.Item
      actions={[
        fund.isAdded ? (
          <Tooltip title="从关注列表移除">
            <Button 
              type="primary" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveFund(fund.code, fund.name)}
            >
              已关注
            </Button>
          </Tooltip>
        ) : (
          <Tooltip title="添加到关注列表">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleAddFund(fund)}
            >
              关注
            </Button>
          </Tooltip>
        )
      ]}
    >
      <List.Item.Meta
        avatar={
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
              {fund.code}
            </div>
            {fund.changePercent !== undefined && (
              <div style={{ 
                fontSize: 12, 
                color: fund.changePercent >= 0 ? '#f5222d' : '#52c41a',
                fontWeight: 'bold'
              }}>
                {fund.changePercent >= 0 ? '+' : ''}{fund.changePercent.toFixed(2)}%
              </div>
            )}
          </div>
        }
        title={
          <Space>
            <Text strong>{fund.name}</Text>
            {fund.isAdded && <StarFilled style={{ color: '#faad14' }} />}
          </Space>
        }
        description={
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space wrap>
              {renderFundTypeTag(fund.type)}
              <Tag color="geekblue">{fund.company}</Tag>
            </Space>
            {fund.netValue !== undefined && (
              <Text type="secondary">
                净值: <Text strong>¥{fund.netValue.toFixed(4)}</Text>
              </Text>
            )}
          </Space>
        }
      />
    </List.Item>
  )

  // 搜索历史内容
  const historyContent = searchHistory.length > 0 ? (
    <div style={{ maxWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>搜索历史</Text>
        <Button 
          type="link" 
          size="small" 
          danger 
          onClick={handleClearHistory}
        >
          清空
        </Button>
      </div>
      <List
        size="small"
        dataSource={searchHistory}
        renderItem={(item) => (
          <List.Item>
            <Button 
              type="text" 
              block 
              style={{ textAlign: 'left' }}
              onClick={() => handleHistoryClick(item)}
            >
              {item}
            </Button>
          </List.Item>
        )}
      />
    </div>
  ) : (
    <div style={{ padding: '8px 0', textAlign: 'center' }}>
      <Text type="secondary">暂无搜索历史</Text>
    </div>
  )

  return (
    <Card 
      title="基金搜索与添加" 
      extra={
        <Space>
          <Popover content={historyContent} title={null} trigger="click">
            <Button icon={<HistoryOutlined />} size="small">
              历史
            </Button>
          </Popover>
          <Button 
            icon={<ExportOutlined />} 
            size="small"
            onClick={handleExport}
          >
            导出
          </Button>
          <Button 
            icon={<ImportOutlined />} 
            size="small"
            onClick={() => setImportModalVisible(true)}
          >
            导入
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {/* 搜索框 */}
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder={searchMode === 'code' 
            ? "输入6位基金代码，如：005827" 
            : "输入基金名称，如：易方达、白酒"}
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value
            if (searchMode === 'code') {
              // 代码模式：只允许数字，最多6位
              setSearchQuery(value.replace(/\D/g, '').slice(0, 6))
            } else {
              // 名称模式：允许任何字符
              setSearchQuery(value)
            }
          }}
          onPressEnter={handleSearch}
          size="large"
          allowClear
        />
        <Button 
          type="primary" 
          icon={<SearchOutlined />} 
          onClick={handleSearch}
          size="large"
          loading={loading}
        >
          搜索
        </Button>
        <Button 
          type={searchMode === 'code' ? 'primary' : 'default'}
          onClick={() => {
            const newMode = searchMode === 'code' ? 'name' : 'code'
            setSearchMode(newMode)
            setSearchQuery('')
            message.info(`切换到${newMode === 'code' ? '代码' : '名称'}搜索模式`)
          }}
          size="large"
        >
          {searchMode === 'code' ? '🔢 代码' : '📝 名称'}
        </Button>
      </Space.Compact>

      {/* 热门基金快捷选择 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ marginRight: 12 }}>热门基金:</Text>
        <Space wrap>
          {[
            { code: '005827', name: '易方达蓝筹' },
            { code: '161725', name: '招商白酒' },
            { code: '003095', name: '中欧医疗' },
            { code: '110022', name: '易方达消费' },
            { code: '519674', name: '银河创新' },
            { code: '260108', name: '景顺长城' },
            { code: '000404', name: '易方达新兴' },
            { code: '001714', name: '工银文体' }
          ].map(fund => (
            <Button
              key={fund.code}
              size="small"
              type="dashed"
              onClick={() => {
                setSearchQuery(fund.code)
                setTimeout(() => handleSearch(), 100)
              }}
            >
              {fund.code} ({fund.name})
            </Button>
          ))}
        </Space>
      </div>

      {/* 用户基金列表 */}
      <Card 
        title={
          <Space>
            <Text strong>我的关注列表</Text>
            <Tag color="blue">{userFunds.length} 只</Tag>
            {userFunds.length > 0 && (
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: '确认清空',
                    content: '确定要清空所有关注的基金吗？',
                    okText: '清空',
                    cancelText: '取消',
                    okType: 'danger',
                    onOk: () => {
                      // 清空所有基金
                      userFunds.forEach(fund => {
                        removeFundFromUserList(fund.code)
                      })
                      setUserFunds([])
                      setSearchResults(prev => 
                        prev.map(item => ({ ...item, isAdded: false }))
                      )
                      message.success('已清空所有关注的基金')
                      onFundsUpdated?.()
                    }
                  })
                }}
              >
                清空全部
              </Button>
            )}
          </Space>
        }
        extra={
          <Button 
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={() => {
              setUserFunds(getUserFunds())
              message.success('基金列表已刷新')
            }}
          >
            刷新
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {userFunds.length > 0 ? (
          <List
            dataSource={userFunds}
            renderItem={(fund) => (
              <List.Item
                actions={[
                  <Tooltip title="编辑备注">
                    <Button 
                      type="text" 
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEditNote(fund.code, fund.name)}
                    >
                      备注
                    </Button>
                  </Tooltip>,
                  <Tooltip title="从关注列表移除">
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => handleRemoveFund(fund.code, fund.name)}
                    >
                      移除
                    </Button>
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                        {fund.code}
                      </div>
                      <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
                    </div>
                  }
                  title={<Text strong>{fund.name}</Text>}
                  description={
                    <Text type="secondary">
                      添加时间: {new Date(fund.addedAt).toLocaleString('zh-CN')}
                      {fund.notes && (
                        <>
                          <br />
                          备注: {fund.notes}
                        </>
                      )}
                    </Text>
                  }
                />
              </List.Item>
            )}
            rowKey="code"
            style={{ maxHeight: 200, overflow: 'auto' }}
          />
        ) : (
          <Empty
            description={
              <div>
                <div>暂无关注的基金</div>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                  搜索基金并点击"添加"按钮添加到关注列表
                </Text>
              </div>
            }
            style={{ padding: '20px 0' }}
          />
        )}
      </Card>

      {/* 搜索结果 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在搜索基金...</Text>
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <>
          <Divider orientation="left">
            <Text strong>搜索结果 ({searchResults.length})</Text>
          </Divider>
          <List
            dataSource={searchResults}
            renderItem={renderSearchResultItem}
            rowKey="code"
            style={{ maxHeight: 400, overflow: 'auto' }}
          />
        </>
      ) : searchQuery ? (
        <Empty
          description={
            <div>
              <div>未找到相关基金: {searchQuery}</div>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                请尝试：
                <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                  <li>确认基金代码是否正确（6位数字）</li>
                  <li>使用基金名称搜索（如：易方达、白酒）</li>
                  <li>点击下方热门基金快捷按钮</li>
                </ul>
              </Text>
            </div>
          }
          style={{ padding: '40px 0' }}
        />
      ) : (
        <Empty
          description={
            <div>
              <div>输入基金代码或名称搜索</div>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                示例：
                <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                  <li>代码：005827 (易方达蓝筹精选混合)</li>
                  <li>名称：易方达、白酒、医疗、新能源</li>
                </ul>
              </Text>
            </div>
          }
          style={{ padding: '40px 0' }}
        />
      )}

      {/* 导入模态框 */}
      <Modal
        title="导入基金配置"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setImportModalVisible(false)
          setImportText('')
        }}
        okText="导入"
        cancelText="取消"
        confirmLoading={importLoading}
      >
        <Alert
          message="导入说明"
          description="请粘贴之前导出的JSON配置。导入会替换当前所有基金配置。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Input.TextArea
          placeholder="粘贴JSON配置..."
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>

      {/* 备注编辑模态框 */}
      <Modal
        title="编辑基金备注"
        open={noteModalVisible}
        onOk={handleSaveNote}
        onCancel={() => {
          setNoteModalVisible(false)
          setNoteFundCode('')
          setNoteText('')
        }}
        okText="保存"
        cancelText="取消"
        confirmLoading={noteLoading}
      >
        <Alert
          message="备注说明"
          description="为基金添加个人备注，方便记忆和管理。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Input.TextArea
          placeholder="输入基金备注..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={4}
          maxLength={200}
          showCount
        />
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          提示：备注仅保存在本地浏览器中
        </div>
      </Modal>
    </Card>
  )
}

export default FundSearchAdd