# 📈 基金股票实时展示系统

一个现代化的基金和股票实时监控展示网站，使用 React + TypeScript + Vite 构建。

## ✨ 功能特性

- **实时数据展示**：基金和股票实时行情
- **自动更新**：每30秒自动刷新数据
- **数据可视化**：使用 Recharts 绘制精美图表
- **响应式设计**：完美适配桌面和移动设备
- **多数据源支持**：AKshare + 东方财富API双数据源
- **自动降级机制**：API失败时自动使用模拟数据
- **部署友好**：支持 Vercel、Netlify、GitHub Pages 等平台

## 🚀 快速开始

### 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/CarsonLyu87/fund-stock-show.git
cd fund-stock-show
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 打开浏览器访问：http://localhost:3000

### 构建生产版本

```bash
npm run build
```

构建产物位于 `dist` 目录。

## 📊 项目结构

```
fund-stock-show/
├── src/
│   ├── components/     # React组件
│   │   ├── Header.tsx      # 页面头部
│   │   ├── FundTable.tsx   # 基金表格
│   │   └── StockChart.tsx  # 股票图表
│   ├── types/         # TypeScript类型定义
│   ├── utils/         # 工具函数和API
│   ├── App.tsx        # 主应用组件
│   ├── main.tsx       # 应用入口
│   └── index.css      # 全局样式
├── public/            # 静态资源
├── index.html         # HTML入口
├── package.json       # 项目配置
├── vite.config.ts     # Vite配置
└── README.md          # 项目说明
```

## 🔧 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **图表库**: Recharts
- **HTTP客户端**: Axios
- **日期处理**: date-fns
- **样式**: CSS Modules + 自定义CSS变量

## 🌐 部署

### Vercel（推荐）

1. 访问 [Vercel](https://vercel.com)
2. 导入 GitHub 仓库
3. 自动部署完成

### GitHub Pages

1. 修改 `vite.config.ts` 中的 `base` 为仓库名：
```typescript
base: '/fund-stock-show/'
```

2. 构建并部署：
```bash
npm run build
npm run deploy
```

### Netlify

1. 访问 [Netlify](https://netlify.com)
2. 拖拽 `dist` 文件夹到部署区域
3. 自动部署完成

## 📱 接入真实数据

项目目前使用模拟数据。要接入真实数据：

1. 修改 `src/utils/api.ts` 中的 API 函数
2. 配置环境变量（可选）：
```env
VITE_API_BASE_URL=https://your-api-server.com
```

3. 更新类型定义以匹配真实API响应

## 🎨 自定义样式

项目使用 CSS 变量进行主题定制。修改 `src/index.css` 中的变量：

```css
:root {
  --primary-color: #2563eb;    /* 主色调 */
  --success-color: #10b981;    /* 成功色 */
  --danger-color: #ef4444;     /* 危险色 */
  --bg-primary: #ffffff;       /* 背景色 */
  --text-primary: #1e293b;     /* 文字色 */
}
```

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系

如有问题或建议，请通过 GitHub Issues 联系。

## 📊 数据源架构

项目采用多数据源架构，确保数据的高可用性：

### 数据源优先级

1. **AKshare数据源**（基金数据优先）
   - 通过Python桥接脚本调用akshare库
   - 提供准确的基金净值数据
   - 需要安装：`pip install akshare pandas`

2. **东方财富API**（股票数据优先）
   - 实时股票行情数据
   - 基金实时估算数据
   - 免费无限制使用

3. **模拟数据**（降级方案）
   - API失败时自动切换
   - 确保应用始终可用

### 自动降级机制

系统会自动检测数据源可用性，按以下顺序降级：

**基金数据**：AKshare → 东方财富API → 模拟数据  
**股票数据**：东方财富API → 模拟数据

### 验证数据源

```bash
# 测试AKshare是否可用
python3 test_akshare.py

# 测试桥接脚本
python3 akshare_bridge.py funds '{"codes": ["005827"]}'
```

### 技术架构

- `akshare_bridge.py` - Python桥接脚本
- `src/services/akshareDataService.ts` - AKshare数据服务
- `src/services/newDataService.ts` - 主数据服务（整合多数据源）
- `src/utils/newApi.ts` - 兼容现有接口

---

**数据仅供参考，投资需谨慎**
## 数据源说明

本项目使用 **AKShare** 作为唯一数据源，提供稳定可靠的金融数据。

### AKShare 特点
- ✅ 稳定可靠的开源金融数据接口
- ✅ 丰富的中国金融市场数据
- ✅ 本地运行，无需API密钥
- ✅ 5分钟数据缓存
- ✅ 优雅降级到模拟数据

### 快速开始
1. 安装 Python 和 AKShare: `pip install akshare`
2. 启动 AKShare 服务器: `./start_akshare_server.sh`
3. 运行项目: `npm run dev`

详细配置请参考 [AKSHARE_DATA_SOURCE.md](AKSHARE_DATA_SOURCE.md)
