import React, { useState } from 'react'
import { Input, Button, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

interface SearchBarProps {
  onSearch: (query: string) => void
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        placeholder="搜索基金或股票代码..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        size="large"
        allowClear
      />
      <Button 
        type="primary" 
        icon={<SearchOutlined />} 
        onClick={handleSearch}
        size="large"
      >
        搜索
      </Button>
    </Space.Compact>
  )
}

export default SearchBar