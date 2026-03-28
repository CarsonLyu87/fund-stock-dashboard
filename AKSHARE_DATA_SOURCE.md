# AKShare 数据源配置指南

## 概述

本项目已将所有数据源替换为 **AKShare**，这是一个稳定、可靠的开源金融数据接口库。AKShare 提供了丰富的中国金融市场数据，包括基金、股票、债券、期货等。

## 主要特点

1. **稳定可靠**: AKShare 基于公开数据接口，稳定性高
2. **数据丰富**: 支持基金净值、股票行情、基金持仓等数据
3. **本地运行**: 数据服务在本地运行，无需依赖外部API密钥
4. **自动缓存**: 内置5分钟数据缓存，减少重复请求
5. **优雅降级**: 当AKShare服务不可用时，自动降级到模拟数据

## 快速开始

### 1. 启动 AKShare 服务器

```bash
# 确保已安装 Python3 和 pip
python3 --version
pip3 --version

# 安装 AKShare
pip3 install akshare --upgrade

# 启动 AKShare 服务器
./start_akshare_server.sh
```

服务器将在 `http://localhost:3002` 启动，提供以下端点：

- `GET /stocks?codes=[...]` - 获取股票数据
- `GET /funds?codes=[...]` - 获取基金数据
- `GET /fund-detail?code=...` - 获取基金详情
- `GET /search-funds?keyword=...` - 搜索基金
- `GET /status` - 服务状态

### 2. 配置项目使用 AKShare

项目已自动配置为使用 AKShare 数据源。主要配置文件：

- `src/config/dataSources.ts` - 数据源配置
- `src/services/akshareDataService.ts` - AKShare 数据服务
- `src/utils/api.ts` - 主 API 接口

### 3. 验证数据源

打开项目后，检查控制台输出：

```
📊 通过AKShare获取基金数据...
📋 用户基金列表: 10 只基金
✅ 通过AKShare获取 10 只基金数据
```

## 数据源架构

### 1. AKShare 服务器 (`akshare_server.py`)

- 基于 Python 的 HTTP 服务器
- 提供 RESTful API 接口
- 内置数据缓存（5分钟TTL）
- 支持多种数据获取方法

### 2. TypeScript 数据服务 (`akshareDataService.ts`)

- 调用 AKShare 服务器 API
- 数据格式转换
- 客户端缓存管理
- 错误处理和降级

### 3. 主 API 接口 (`api.ts`)

- 统一的数据获取接口
- 用户配置管理
- 模拟数据降级
- 兼容现有组件

## 支持的基金列表

默认支持的基金代码：

| 代码 | 名称 | 类型 |
|------|------|------|
| 005827 | 易方达蓝筹精选混合 | 混合型 |
| 161725 | 招商中证白酒指数A | 指数型 |
| 003095 | 中欧医疗健康混合A | 混合型 |
| 260108 | 景顺长城新兴成长混合 | 混合型 |
| 110011 | 易方达中小盘混合 | 混合型 |
| 000404 | 易方达新兴成长混合 | 混合型 |
| 519674 | 银河创新成长混合 | 混合型 |
| 001714 | 工银瑞信前沿医疗股票 | 股票型 |
| 000248 | 汇添富中证主要消费ETF联接 | 指数型 |
| 001475 | 易方达国防军工混合 | 混合型 |

## 支持的股票列表

默认支持的股票代码：

| 代码 | 名称 | 行业 |
|------|------|------|
| 600519 | 贵州茅台 | 白酒 |
| 000858 | 五粮液 | 白酒 |
| 000333 | 美的集团 | 家电 |
| 000001 | 平安银行 | 银行 |
| 600036 | 招商银行 | 银行 |
| 000002 | 万科A | 房地产 |
| 601318 | 中国平安 | 保险 |
| 600276 | 恒瑞医药 | 医药 |
| 600887 | 伊利股份 | 食品饮料 |
| 000651 | 格力电器 | 家电 |

## 自定义配置

### 1. 修改默认基金/股票列表

编辑 `src/config/dataSources.ts` 中的 `supportedFunds` 和 `supportedStocks` 数组。

### 2. 调整缓存时间

修改 `defaultConfig.cache.ttl`（单位：毫秒）：
```typescript
cache: {
  enabled: true,
  ttl: 300000, // 5分钟，可调整为 600000（10分钟）等
},
```

### 3. 调整更新频率

修改 `defaultConfig.updateFrequency`：
```typescript
updateFrequency: {
  stock: 300000, // 5分钟更新一次股票数据
  fund: 300000,  // 5分钟更新一次基金数据
},
```

### 4. 用户自定义列表

用户可以通过界面添加/删除基金和股票，数据会保存在 `localStorage` 中：
- `fund_stock_show_user_funds` - 用户基金列表
- `fund_stock_show_user_stocks` - 用户股票列表

## 故障排除

### 1. AKShare 服务器无法启动

**问题**: `ModuleNotFoundError: No module named 'akshare'`
**解决**: 安装 AKShare
```bash
pip3 install akshare --upgrade
```

**问题**: 端口 3002 被占用
**解决**: 停止占用端口的进程或修改端口
```bash
# 修改 akshare_server.py 中的端口
server_address = ('', 3003)  # 改为 3003
```

### 2. 数据获取失败

**问题**: 控制台显示 "获取基金数据失败"
**解决**: 
1. 检查 AKShare 服务器是否运行：`curl http://localhost:3002/status`
2. 检查网络连接
3. 查看 AKShare 服务器日志

### 3. 数据更新延迟

**问题**: 数据不是最新的
**解决**:
1. 清除缓存：在控制台执行 `clearCache()`
2. 调整缓存时间（见"自定义配置"部分）
3. 手动刷新页面

## 性能优化建议

1. **合理设置缓存时间**: 根据需求调整缓存TTL
2. **批量获取数据**: AKShare 支持批量获取，减少请求次数
3. **使用用户自定义列表**: 只获取用户关注的基金/股票
4. **定期清理缓存**: 长时间运行后手动清理缓存

## 与其他数据源的对比

| 特性 | AKShare | 东方财富API | 新浪财经API | 模拟数据 |
|------|---------|------------|------------|----------|
| 稳定性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 数据完整性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 更新频率 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| 易用性 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 依赖性 | Python环境 | 网络API | 网络API | 无 |

## 未来扩展

1. **更多数据源**: 可以添加其他AKShare支持的数据类型
2. **数据持久化**: 将用户配置保存到数据库
3. **实时推送**: 使用WebSocket实现实时数据更新
4. **数据分析**: 基于AKShare数据提供更多分析功能

## 相关链接

- [AKShare GitHub](https://github.com/akfamily/akshare)
- [AKShare 文档](https://www.akshare.xyz/)
- [项目GitHub](https://github.com/CarsonLyu87/fund-stock-dashboard)

---

**最后更新**: 2026-03-28  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪