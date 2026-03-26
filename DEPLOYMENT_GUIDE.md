# 部署指南 - Fund Stock Show

## 问题诊断

根据错误日志，当前Vercel部署遇到以下问题：
1. **CORS错误**：前端直接调用外部API被浏览器阻止
2. **403 Forbidden**：新浪财经API有安全限制
3. **代理服务器未配置**：前端没有使用代理服务器

## 解决方案

已实现完整的代理服务器架构，需要正确部署和配置。

## 部署步骤

### 步骤1：部署代理服务器

代理服务器代码在 `proxy-server.js`，需要单独部署：

#### 选项A：部署到Vercel（推荐）
```bash
# 1. 创建一个新的Vercel项目用于代理服务器
vercel login
vercel --prod

# 2. 选择当前目录
# 3. 设置项目名称为：fund-stock-proxy
# 4. 部署完成后，记下部署URL
```

#### 选项B：部署到其他平台
- **Railway**: 支持Node.js，免费额度充足
- **Render**: 免费Web服务
- **Heroku**: 需要信用卡验证

### 步骤2：配置环境变量

在 **前端项目** 的Vercel设置中（`fund-stock-show`项目）：

1. 进入Vercel Dashboard
2. 选择 `fund-stock-show` 项目
3. 进入 Settings → Environment Variables
4. 添加以下变量：

```
VITE_PROXY_URL=https://your-proxy-server-url.vercel.app
VITE_API_BASE_URL=https://your-proxy-server-url.vercel.app
```

### 步骤3：重新部署前端

环境变量设置后，Vercel会自动重新构建和部署。

## 本地开发

### 启动完整开发环境
```bash
# 同时启动前端和代理服务器
npm run dev:full

# 或者分别启动
npm run dev      # 前端 (http://localhost:3000)
npm run proxy    # 代理服务器 (http://localhost:3001)
```

### 环境变量配置
创建 `.env` 文件：
```env
VITE_PROXY_URL=http://localhost:3001
VITE_API_BASE_URL=http://localhost:3001
```

## 架构说明

### 数据流
```
前端 (Vercel) → 代理服务器 (单独部署) → 外部API
```

### 代理服务器功能
1. **处理CORS**：添加正确的响应头
2. **添加请求头**：Referer, User-Agent等
3. **批量请求**：优化API调用
4. **错误处理**：降级和重试机制

### 支持的API
- 东方财富基金净值API
- 天天基金实时估值API  
- 新浪财经股票实时数据API

## 故障排除

### 常见问题

#### 1. 仍然看到CORS错误
- 检查代理服务器是否正常运行
- 检查环境变量 `VITE_PROXY_URL` 是否正确设置
- 查看浏览器控制台网络请求，确认请求是否发送到代理服务器

#### 2. 代理服务器返回错误
- 检查代理服务器日志
- 确认外部API是否可访问
- 检查请求频率是否过高

#### 3. 数据不更新
- 检查缓存设置
- 确认API响应正常
- 查看前端控制台调试日志

### 调试命令
```bash
# 测试代理服务器
curl http://localhost:3001/health
curl http://localhost:3001/api/fund/netvalue/005827

# 构建检查
npm run build
```

## 性能优化

### 缓存策略
- 基金净值数据：缓存1小时
- 实时估值：缓存5分钟
- 股票数据：缓存1分钟

### 请求优化
- 批量获取基金数据
- 并行请求股票数据
- 错误降级机制

## 安全考虑

### 代理服务器安全
1. **速率限制**：防止滥用
2. **请求验证**：验证请求来源
3. **错误处理**：不暴露敏感信息

### 环境变量安全
- 不要提交 `.env` 文件到Git
- 使用Vercel环境变量管理
- 定期轮换配置

## 监控和维护

### 健康检查
- 代理服务器：`GET /health`
- 前端应用：控制台调试日志

### 日志监控
- 代理服务器访问日志
- 错误率和响应时间
- API调用成功率

## 扩展计划

### 短期改进
1. 添加更多基金的持仓数据
2. 实现历史数据图表
3. 添加用户自定义基金列表

### 长期规划
1. 实现用户账户系统
2. 添加实时通知功能
3. 集成更多数据源

---

**最后更新**: 2026-03-25  
**状态**: ✅ 代理服务器架构已实现，需要正确部署