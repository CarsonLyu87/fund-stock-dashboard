# OpenClaw 构建问题解决方案

## 问题描述
OpenClaw控制UI报告构建错误：
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## 问题原因
OpenClaw执行环境中，`node_modules/.bin`目录不在PATH环境变量中，导致直接调用`vite`命令失败。

## 解决方案

### 方案1: 使用npm脚本（推荐）
OpenClaw控制UI应该调用：
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
npm run build
```

### 方案2: 使用npx
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
npx vite build
```

### 方案3: 使用包装脚本
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./build-wrapper.sh
```

## 已创建的解决方案文件

### 1. `build-wrapper.sh` - 通用构建包装脚本
- 自动检测环境
- 尝试多种构建方法
- 提供详细的错误信息
- 适用于所有环境

### 2. `vite` - vite命令包装器
- 在项目根目录的可执行文件
- 当直接调用`vite`命令时自动处理PATH问题
- 回退到npx或安装依赖

### 3. `package.json`更新
- `build`脚本现在使用`./build-wrapper.sh`
- 保留了`build:direct`脚本用于直接调用vite

### 4. `build-for-openclaw.sh` - OpenClaw专用脚本
- 专门处理OpenClaw环境问题
- 详细的调试信息

## 如何配置OpenClaw控制UI

### 选项A: 修改OpenClaw配置
如果OpenClaw控制UI有配置界面，将构建命令从：
```
vite build
```
改为：
```
npm run build
```
或：
```
./build-wrapper.sh
```

### 选项B: 使用项目根目录的vite包装器
确保OpenClaw在当前项目目录执行命令，这样会使用我们的`vite`包装器。

### 选项C: 设置环境变量
在OpenClaw环境中设置PATH：
```bash
export PATH=/Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin:$PATH
```

## 测试验证

### 测试1: 本地构建
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./build-wrapper.sh
```

### 测试2: 直接vite命令
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./vite build
```

### 测试3: npm脚本
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
npm run build
```

## 故障排除

### 如果仍然失败：
1. **检查依赖**：
   ```bash
   npm install
   ```

2. **检查权限**：
   ```bash
   chmod +x build-wrapper.sh vite
   ```

3. **检查路径**：
   ```bash
   pwd
   ls -la node_modules/.bin/vite
   ```

4. **手动设置PATH**：
   ```bash
   export PATH=$(pwd)/node_modules/.bin:$PATH
   vite build
   ```

## 技术细节

### 为什么`vite`命令找不到？
- 在Unix/Linux系统中，可执行文件需要在PATH环境变量中
- `node_modules/.bin/vite`是本地安装的vite命令
- npm运行时自动将`node_modules/.bin`添加到PATH
- 直接执行`vite`命令时，PATH中没有这个目录

### 解决方案原理
1. **npx**: 自动查找本地node_modules中的命令
2. **npm脚本**: npm运行时自动处理PATH
3. **包装脚本**: 手动设置PATH后执行命令
4. **直接包装器**: 替代vite命令，处理环境问题

## 相关提交
- 提交哈希: `a4f55a06` (调试日志)
- 提交哈希: `1937fbf5` (构建环境修复)
- GitHub: https://github.com/CarsonLyu87/fund-stock-show

## 联系信息
如果问题仍然存在，请提供：
1. OpenClaw控制UI的完整错误信息
2. 执行的完整命令
3. 当前工作目录
4. 环境信息