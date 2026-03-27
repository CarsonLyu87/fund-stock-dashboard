# OpenClaw构建配置指南

## 问题
OpenClaw控制UI报告构建错误：
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## 原因分析
OpenClaw执行环境中，`node_modules/.bin`目录不在PATH环境变量中，导致直接调用`vite`命令失败。

## 解决方案

### 方案1：使用专用构建脚本（推荐）
```
cd /Users/carson/.openclaw/workspace/fund-stock-dashboard && ./build
```

或直接使用绝对路径：
```
/Users/carson/.openclaw/workspace/fund-stock-dashboard/build
```

### 方案2：使用npm脚本
```
cd /Users/carson/.openclaw/workspace/fund-stock-dashboard && npm run build
```

### 方案3：使用npx
```
cd /Users/carson/.openclaw/workspace/fund-stock-dashboard && npx vite build
```

## 可用的构建命令

### 1. 主构建脚本 (`./build`)
```bash
# 多方法构建包装器，自动处理环境问题
./build
```

### 2. 简化构建脚本 (`./openclaw-build`)
```bash
# 专为OpenClaw优化的构建脚本
./openclaw-build
```

### 3. 通用构建包装器 (`./build-wrapper.sh`)
```bash
# 详细的构建脚本，包含环境检查和错误处理
./build-wrapper.sh
```

## OpenClaw控制UI配置建议

### 推荐配置
```
工作目录: /Users/carson/.openclaw/workspace/fund-stock-dashboard
构建命令: ./build
```

### 备选配置
```
工作目录: /Users/carson/.openclaw/workspace/fund-stock-dashboard
构建命令: npm run build
```

### 绝对路径配置
```
工作目录: /Users/carson/.openclaw/workspace/fund-stock-dashboard
构建命令: /Users/carson/.openclaw/workspace/fund-stock-dashboard/build
```

## 构建脚本功能

### `./build` 脚本特性：
1. **环境检测**: 自动检查Node.js、npm、npx可用性
2. **依赖检查**: 自动安装缺失的node_modules
3. **多方法尝试**: 依次尝试多种构建方法直到成功
4. **错误处理**: 详细的错误信息和解决方案
5. **路径处理**: 自动处理PATH环境变量问题

### 构建方法优先级：
1. `npm run build` (最可靠，npm自动处理PATH)
2. `npx vite build` (npx自动查找本地依赖)
3. 直接调用本地vite (处理PATH问题后)

## 验证构建

### 1. 本地测试
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-dashboard
./build
```

### 2. 检查构建结果
```bash
ls -la dist/
```

### 3. 验证构建文件
```bash
# 检查HTML文件
head -5 dist/index.html

# 检查JavaScript文件
ls -lh dist/assets/*.js | head -3
```

## 故障排除

### 问题1: "vite: command not found"
**原因**: PATH环境变量中缺少`node_modules/.bin`
**解决方案**: 使用`./build`或`npm run build`

### 问题2: 构建超时
**原因**: 依赖安装或构建过程耗时过长
**解决方案**: 确保网络连接正常，或使用已有node_modules

### 问题3: 权限问题
**原因**: 脚本没有执行权限
**解决方案**: 
```bash
chmod +x build openclaw-build build-wrapper.sh
```

### 问题4: 依赖缺失
**原因**: node_modules目录不存在或损坏
**解决方案**: 构建脚本会自动安装依赖

## 部署到GitHub Pages

### 方法1: 使用gh-pages
```bash
npx gh-pages -d dist
```

### 方法2: 手动部署
```bash
# 创建gh-pages分支
git checkout --orphan gh-pages
git rm -rf .
cp -r dist/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages --force
```

## 监控构建状态

### 成功标志
- ✅ 构建完成无错误
- ✅ dist/目录包含index.html和assets/
- ✅ 控制台显示"构建成功完成"

### 失败处理
1. 检查错误信息
2. 验证node_modules是否存在
3. 检查网络连接
4. 查看详细日志

## 联系支持

如果构建问题持续存在，请：
1. 提供完整的错误信息
2. 说明使用的构建命令
3. 提供项目目录结构
4. 检查OpenClaw控制UI的构建配置

## 更新记录

### 2026-03-27
- 创建OpenClaw专用构建脚本
- 解决"vite: command not found"问题
- 添加多方法构建策略
- 完善错误处理和日志

---

**重要**: 在OpenClaw控制UI中，请将构建命令配置为`./build`而不是`vite build`。