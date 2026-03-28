import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Tag, Button, Space, Input, Modal, 
  message, Tooltip, Typography, Spin, Alert, Row, Col,
  Statistic, Popover, Divider, Empty, List
} from 'antd'
import { 
  SearchOutlined, PlusOutlined, DeleteOutlined, 
  ReloadOutlined, StarFilled, StarOutlined,
  ArrowUpOutlined, ArrowDownOutlined, EditOutlined,
  ExportOutlined, ImportOutlined, HistoryOutlined,
  LineChartOutlined
} from '@ant-design/icons'
import type { Fund } from '../types/index'
import type { FundSearchResult, UserFundConfig } from "../services/unifiedAkshareService"'
import { 
  searchFunds, addFundToUserList, removeFundFromUserList, 
  getUserFunds, getSearchHistory, clearSearchHistory,
  exportUserFunds, importUserFunds, updateFundNote, getFundNote
} from "../services/unifiedAkshareService"'
import { fetchFundData } from '../utils/api'
import FundDetail from './FundDetail/FundDetail'

const { Text } = Typography
const { Search } = Input

interface UnifiedFundManagerProps {
  onDataReload?: () => void
  onFundsUpdated?: () => void
}

const UnifiedFundManager: React.FC<UnifiedFundManagerProps> = ({ onDataReload, onFundsUpdated }) => {
  // 状态管理
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [funds, setFunds] = useState<Fund[]>([])
  const [fundsLoading, setFundsLoading] = useState(false)
  const [userFunds, setUserFunds] = useState<UserFundConfig[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code')
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [noteFundCode, setNoteFundCode] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  
  // 基金详情相关状态
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedFund, setSelectedFund] = useState<{ code: string; name: string } | null>(null)

  // 初始化
  useEffect(() => {
    loadUserFunds()
    loadSearchHistory()
    loadFundData()
  }, [])

  // 加载用户基金配置
  const loadUserFunds = () => {
    setUserFunds(getUserFunds())
  }

  // 加载搜索历史
  const loadSearchHistory = () => {
    setSearchHistory(getSearchHistory())
  }

  // 加载基金数据
  const loadFundData = async () => {
    console.log('🔄 UnifiedFundManager: 开始加载基金数据...')
    console.log('📋 当前用户基金配置:', userFunds.map(f => f.code).join(', '))
    setFundsLoading(true)
    try {
      const data = await fetchFundData()
      console.log(`✅ UnifiedFundManager: 加载完成，获取 ${data.length} 只基金数据`)
      console.log('📊 基金列表:', data.map(f => `${f.code}: ${f.name} (${f.changePercent}%)`))
      setFunds(data)
      setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
      
      // 检查是否所有用户基金都在数据中
      const userFundCodes = userFunds.map(f => f.code)
      const loadedFundCodes = data.map(f => f.code)
      const missingFunds = userFundCodes.filter(code => !loadedFundCodes.includes(code))
      
      if (missingFunds.length > 0) {
        console.warn(`⚠️ 以下用户基金未在数据中找到: ${missingFunds.join(', ')}`)
      } else {
        console.log('✅ 所有用户基金都在数据中')
      }
    } catch (error) {
      message.error('加载基金数据失败')
      console.error('❌ UnifiedFundManager: 加载基金数据失败:', error)
    } finally {
      setFundsLoading(false)
    }
  }

  // 处理搜索
  const handleSearch = async () => {
    const query = searchQuery.trim()
    
    if (!query) {
      message.warning('请输入基金代码或名称')
      return
    }

    setSearchLoading(true)
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
      setSearchLoading(false)
    }
  }

  // 处理添加基金
  const handleAddFund = (fund: FundSearchResult) => {
    console.log('🔍 开始添加基金:', fund.code, fund.name)
    console.log('📝 调用 addFundToUserList...')
    const success = addFundToUserList(fund)
    
    if (success) {
      console.log('✅ 添加基金成功:', fund.code)
      console.log('🔄 更新用户基金列表状态...')
      message.success(`已添加基金: ${fund.name}`)
      
      // 立即更新用户基金列表
      const updatedUserFunds = getUserFunds()
      console.log(`📋 更新后用户基金列表: ${updatedUserFunds.length} 只基金`)
      updatedUserFunds.forEach(f => console.log(`   - ${f.code}: ${f.name}`))
      
      setUserFunds(updatedUserFunds)
      
      // 更新搜索结果状态
      setSearchResults(prev => 
        prev.map(item => 
          item.code === fund.code ? { ...item, isAdded: true } : item
        )
      )
      
      // 触发基金更新回调
      console.log('📢 触发 onFundsUpdated 回调...')
      onFundsUpdated?.()
      
      // 重新加载基金数据
      setTimeout(() => {
        console.log('🔄 重新加载基金数据...')
        loadFundData()
        onDataReload?.()
      }, 500)
    } else {
      console.log('⚠️ 基金已添加:', fund.code)
      message.warning('该基金已添加')
    }
  }

  // 处理移除基金
  const handleRemoveFund = (fundCode: string, fundName: string) => {
    console.log('🔍 开始移除基金:', fundCode, fundName)
    Modal.confirm({
      title: '确认移除',
      content: `确定要移除基金 "${fundName}" 吗？`,
      okText: '移除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        const success = removeFundFromUserList(fundCode)
        
        if (success) {
          console.log('✅ 移除基金成功:', fundCode)
          message.success(`已移除基金: ${fundName}`)
          loadUserFunds()
          setSearchResults(prev => 
            prev.map(item => 
              item.code === fundCode ? { ...item, isAdded: false } : item
            )
          )
          
          // 触发基金更新回调
          onFundsUpdated?.()
          
          // 重新加载基金数据
          setTimeout(() => {
            console.log('🔄 重新加载基金数据...')
            loadFundData()
            onDataReload?.()
          }, 500)
        }
      }
    })
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
        loadUserFunds()
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
        loadUserFunds()
        setImportModalVisible(false)
        setImportText('')
        
        // 触发基金更新回调
        onFundsUpdated?.()
        
        // 重新加载基金数据
        setTimeout(() => {
          loadFundData()
          onDataReload?.()
        }, 500)
      } else {
        message.error('导入失败，请检查JSON格式')
      }
    } catch (error) {
      message.error('导入失败，请检查JSON格式')
    } finally {
      setImportLoading(false)
    }
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

  // 处理历史搜索点击
  const handleHistoryClick = (historyItem: string) => {
    setSearchQuery(historyItem)
    // 延迟执行搜索，让输入框先更新
    setTimeout(() => {
      handleSearch()
    }, 100)
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

  // 渲染涨跌幅
  const renderChangePercent = (changePercent?: number) => {
    if (changePercent === undefined) return null
    
    const isPositive = changePercent >= 0
    return (
      <span style={{ 
        color: isPositive ? '#f5222d' : '#52c41a',
        fontWeight: 'bold',
        fontSize: 14
      }}>
        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      </span>
    )
  }

  // 表格列定义
  const columns = [
    {
      title: '基金代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Text strong style={{ color: '#1890ff' }}>{code}</Text>
          {userFunds.some(f => f.code === code) && (
            <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
          )}
        </div>
      )
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, record: Fund) => {
        const userFund = userFunds.find(f => f.code === record.code)
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{name}</Text>
            <Space wrap>
              {renderFundTypeTag(record.type)}
              <Tag color="geekblue">{record.company}</Tag>
            </Space>
            {userFund?.notes && (
              <div style={{ fontSize: 12, color: '#666', maxWidth: 200 }}>
                <Text type="secondary" ellipsis={{ tooltip: userFund.notes }}>
                  备注: {userFund.notes}
                </Text>
              </div>
            )}
          </Space>
        )
      }
    },
    {
      title: '单位净值',
      dataIndex: 'netValue',
      key: 'netValue',
      width: 100,
      render: (value: number) => (
        <Text strong>¥{value?.toFixed(4) || '--'}</Text>
      )
    },
    {
      title: '涨跌幅',
      dataIndex: 'changePercent',
      key: 'changePercent',
      width: 100,
      render: renderChangePercent
    },
    {
      title: '持仓估值',
      dataIndex: 'portfolioValue',
      key: 'portfolioValue',
      width: 100,
      render: (value: number) => (
        <Text type="secondary">¥{value?.toFixed(4) || '--'}</Text>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 100,
      render: (time: string) => (
        <Text type="secondary">{time || '--:--'}</Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Fund) => {
        const isAdded = userFunds.some(fund => fund.code === record.code)
        
        return (
          <Space>
            <Tooltip title="查看估值详情">
              <Button
                type="text"
                icon={<LineChartOutlined />}
                size="small"
                onClick={() => {
                  console.log('查看基金详情:', record.code, record.name)
                  setSelectedFund({ code: record.code, name: record.name })
                  setDetailModalVisible(true)
                }}
              >
                详情
              </Button>
            </Tooltip>
            
            <Tooltip title={isAdded ? "从关注列表移除" : "添加到关注列表"}>
              <Button
                type={isAdded ? "primary" : "default"}
                danger={isAdded}
                icon={isAdded ? <DeleteOutlined /> : <PlusOutlined />}
                size="small"
                onClick={() => {
                  console.log('🔍 监控表格 - 点击操作按钮:', record.code, record.name, 'isAdded:', isAdded)
                  if (isAdded) {
                    handleRemoveFund(record.code, record.name)
                  } else {
                    // 创建一个 FundSearchResult 对象
                    const fundSearchResult: FundSearchResult = {
                      code: record.code,
                      name: record.name,
                      type: record.type,
                      company: record.company,
                      netValue: record.netValue,
                      changePercent: record.changePercent,
                      isAdded: false
                    }
                    handleAddFund(fundSearchResult)
                  }
                }}
              >
                {isAdded ? '已关注' : '关注'}
              </Button>
            </Tooltip>
          </Space>
        )
      }
    }
  ]

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
      title={
        <Space>
          <Text strong>💰 基金监控与管理</Text>
          <Tag color="blue">{funds.length} 只基金</Tag>
          <Tag color="green">{userFunds.length} 只关注</Tag>
        </Space>
      }
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
      style={{ marginBottom: 24 }}
    >
      {/* 搜索区域 */}
      <div style={{ marginBottom: 24 }}>
        <Alert
          message="基金搜索与添加"
          description="搜索基金并添加到关注列表，已关注的基金将自动出现在下方监控表格中"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Row gutter={16}>
          <Col span={18}>
            <Space.Compact style={{ width: '100%' }}>
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
                loading={searchLoading}
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
          </Col>
          <Col span={6}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { code: '005827', name: '易方达蓝筹' },
                { code: '161725', name: '招商白酒' },
                { code: '003095', name: '中欧医疗' },
                { code: '110022', name: '易方达消费' }
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
                  {fund.code}
                </Button>
              ))}
            </div>
          </Col>
        </Row>
      </div>

      {/* 搜索结果 */}
      {searchResults.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Divider orientation="left">
            <Text strong>搜索结果 ({searchResults.length})</Text>
          </Divider>
          <List
            dataSource={searchResults}
            renderItem={(fund) => (
              <List.Item
                actions={[
                  fund.isAdded ? (
                    <Tooltip title="从关注列表移除">
                      <Button 
                        type="primary" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          console.log('🔍 搜索结果列表 - 点击已关注按钮:', fund.code, fund.name)
                          handleRemoveFund(fund.code, fund.name)
                        }}
                      >
                        已关注
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip title="添加到关注列表">
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => {
                          console.log('🔍 搜索结果列表 - 点击关注按钮:', fund.code, fund.name)
                          handleAddFund(fund)
                        }}
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
            )}
            rowKey="code"
            style={{ maxHeight: 200, overflow: 'auto' }}
          />
        </div>
      )}

      {/* 统一的基金监控与关注列表 */}
      <div style={{ marginBottom: 24 }}>
        <Card 
          title={
            <Space>
              <Text strong>⭐ 我的基金监控列表</Text>
              <Tag color="blue">{funds.length} 只</Tag>
              <Tag color="green">{userFunds.length} 只关注</Tag>
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
                        loadUserFunds()
                        setSearchResults(prev => 
                          prev.map(item => ({ ...item, isAdded: false }))
                        )
                        message.success('已清空所有关注的基金')
                        
                        // 触发基金更新回调
                        onFundsUpdated?.()
                        
                        // 重新加载基金数据
                        setTimeout(() => {
                          loadFundData()
                          onDataReload?.()
                        }, 500)
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
            <Space>
              <Button 
                type="link" 
                size="small" 
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadUserFunds()
                  loadFundData()
                  message.success('基金列表已刷新')
                }}
              >
                刷新
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                更新: {lastUpdate}
              </Text>
            </Space>
          }
        >
          {fundsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="加载基金数据中..." />
            </div>
          ) : funds.length > 0 ? (
            <>
              <Alert
                message="操作说明"
                description="此列表显示所有你关注的基金。点击'关注'按钮添加新基金，点击'已关注'按钮从列表中移除。已关注的基金会持续监控并显示实时数据。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Table
                dataSource={funds}
                columns={columns}
                rowKey="code"
                pagination={{ pageSize: 10 }}
                size="middle"
                scroll={{ x: 800 }}
                loading={fundsLoading}
                expandable={{
                  expandedRowRender: (record: Fund) => {
                    const userFund = userFunds.find(f => f.code === record.code)
                    return (
                      <div style={{ padding: '16px 24px', background: '#fafafa' }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <div style={{ marginBottom: 8 }}>
                              <Text strong>基金信息:</Text>
                            </div>
                            <div>
                              <Text type="secondary">基金代码: </Text>
                              <Text strong>{record.code}</Text>
                            </div>
                            <div>
                              <Text type="secondary">基金类型: </Text>
                              <Tag color="blue">{record.type}</Tag>
                            </div>
                            <div>
                              <Text type="secondary">基金公司: </Text>
                              <Text strong>{record.company}</Text>
                            </div>
                            {userFund?.addedAt && (
                              <div>
                                <Text type="secondary">关注时间: </Text>
                                <Text>{new Date(userFund.addedAt).toLocaleString('zh-CN')}</Text>
                              </div>
                            )}
                          </Col>
                          <Col span={12}>
                            <div style={{ marginBottom: 8 }}>
                              <Text strong>个人备注:</Text>
                            </div>
                            {userFund?.notes ? (
                              <div style={{ background: '#fff', padding: 12, borderRadius: 4, border: '1px solid #d9d9d9' }}>
                                <Text>{userFund.notes}</Text>
                              </div>
                            ) : (
                              <div style={{ color: '#999', fontStyle: 'italic' }}>
                                暂无备注
                              </div>
                            )}
                            <div style={{ marginTop: 12 }}>
                              <Button 
                                type="link" 
                                size="small" 
                                icon={<EditOutlined />}
                                onClick={() => handleEditNote(record.code, record.name)}
                              >
                                编辑备注
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    )
                  },
                  rowExpandable: (record: Fund) => true
                }}
              />
            </>
          ) : (
            <Empty
              description={
                <div>
                  <div>暂无关注的基金</div>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                    请先搜索并添加基金到关注列表
                  </Text>
                </div>
              }
              style={{ padding: '40px 0' }}
            />
          )}
        </Card>
      </div>

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

      {/* 基金详情模态框 */}
      <Modal
        title="基金估值详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 1200 }}
        destroyOnClose
      >
        {selectedFund && (
          <FundDetail
            fundCode={selectedFund.code}
            fundName={selectedFund.name}
            onClose={() => setDetailModalVisible(false)}
          />
        )}
      </Modal>
    </Card>
  )
}

export default UnifiedFundManager