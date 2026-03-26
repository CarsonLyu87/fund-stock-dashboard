# 快速部署指南

## 🚀 一键部署选项

### 选项1: Vercel (最简单，推荐)
```bash
# 确保已安装Node.js和npm
./deploy.sh vercel
```

### 选项2: Netlify
```bash
./deploy.sh netlify
```

### 选项3: 推送到GitHub
```bash
# 首先在GitHub创建仓库，然后添加远程仓库
git remote add origin https://github.com/你的用户名/fund-stock-show.git
./deploy.sh github
```

### 选项4: 手动部署
```bash
./deploy.sh manual
```

## 📋 部署前准备

### 1. 检查项目状态
```bash
# 确保项目可以正常构建
npm run build
```

### 2. 配置环境变量 (可选)
```bash
# 复制环境变量模板
cp .env.example .env.local
# 编辑.env.local文件，添加API密钥
```

### 3. 选择部署平台

| 平台 | 优点 | 缺点 | 适合场景 |
|------|------|------|----------|
| **Vercel** | 部署最快，自动SSL，全球CDN | 免费版有带宽限制 | 个人项目、演示 |
| **Netlify** | 功能丰富，CI/CD集成 | 配置稍复杂 | 企业项目、团队协作 |
| **GitHub Pages** | 完全免费，与GitHub集成 | 功能有限，无服务器端 | 开源项目、文档 |
| **手动部署** | 完全控制，无平台限制 | 需要服务器知识 | 自有服务器、定制需求 |

## 🔧 详细部署步骤

### Vercel 部署
1. 注册 Vercel 账号 (https://vercel.com)
2. 安装 Vercel CLI: `npm i -g vercel`
3. 运行: `vercel`
4. 按照提示完成部署

### Netlify 部署
1. 注册 Netlify 账号 (https://netlify.com)
2. 安装 Netlify CLI: `npm i -g netlify-cli`
3. 运行: `netlify deploy --prod`
4. 按照提示完成部署

### GitHub Pages 部署
1. 在GitHub创建新仓库
2. 添加远程仓库:
   ```bash
   git remote add origin https://github.com/你的用户名/仓库名.git
   git branch -M main
   git push -u origin main
   ```
3. 在仓库设置中启用 GitHub Pages
4. 选择 `dist` 目录作为源

## 🌐 部署后访问

部署成功后，你会获得一个URL，例如:
- Vercel: `https://fund-stock-show.vercel.app`
- Netlify: `https://fund-stock-show.netlify.app`
- GitHub Pages: `https://你的用户名.github.io/fund-stock-show`

## 🛠️ 故障排除

### 构建失败
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 部署失败
1. 检查网络连接
2. 确认平台账号权限
3. 查看部署日志
4. 确保 `dist/` 目录存在

### API数据不显示
1. 检查浏览器控制台错误
2. 确认网络请求正常
3. 如果是API限制，等待一段时间再试

## 📞 支持

如果遇到问题:
1. 查看 `README.md` 和 `REAL_TIME_UPDATE.md`
2. 检查部署日志
3. 在项目Issue中提问

---

**项目已准备好部署！** 选择适合你的平台，运行对应的部署命令即可。

**最后检查清单:**
- [ ] 项目可以正常构建 (`npm run build`)
- [ ] 选择了合适的部署平台
- [ ] 配置了必要的环境变量
- [ ] 测试了本地运行 (`npm run dev`)

**部署命令示例:**
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./deploy.sh vercel  # 部署到Vercel
```