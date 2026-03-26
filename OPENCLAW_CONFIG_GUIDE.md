# OpenClaw控制UI构建配置指南

## 问题描述
OpenClaw控制UI报告构建错误：
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## 问题原因
OpenClaw执行环境中，`node_modules/.bin`目录不在PATH环境变量中，导致直接调用`vite`命令失败。

## 解决方案

### 方案A: 修改OpenClaw构建命令配置（推荐）

在OpenClaw控制UI的构建配置中，将构建命令从：
```
vite build
```
改为以下任一选项：

#### 选项1: 使用npm脚本（最简单）
```
cd /Users/carson/.openclaw/workspace/fund-stock-show && npm run build
```

#### 选项2: 使用构建包装器
```
/Users/carson/.openclaw/workspace/fund-stock-show/build
```

#### 选项3: 使用绝对路径
```
/Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin/vite build
```

#### 选项4: 使用npx
```
cd /Users/carson/.openclaw/workspace/fund-stock-show && npx vite build
```

### 方案B: 设置环境变量

在OpenClaw环境中设置PATH：
```bash
export PATH=/Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin:$PATH
```
然后执行：`vite build`

### 方案C: 创建全局符号链接（需要管理员权限）

```bash
sudo ln -sf /Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin/vite /usr/local/bin/vite
```
或
```bash
sudo ln -sf /Users/carson/.openclaw/workspace/fund-stock-show/vite /usr/local/bin/vite
```

## 已创建的解决方案文件

### 1. `build` - 构建命令包装器
```bash
# 使用方法
/Users/carson/.openclaw/workspace/fund-stock-show/build
```
这个脚本会自动处理所有构建方法，是最可靠的解决方案。

### 2. `vite` - vite命令包装器
```bash
# 使用方法
/Users/carson/.openclaw/workspace/fund-stock-show/vite build
```
当直接调用`vite`命令时使用。

### 3. `build-wrapper.sh` - 通用构建脚本
```bash
# 使用方法
cd /Users/carson/.openclaw/workspace/fund-stock-show && ./build-wrapper.sh
```
提供详细的构建过程和错误处理。

### 4. `package.json`更新
- `build`脚本现在使用`./build-wrapper.sh`
- 保留了`build:direct`脚本用于直接调用vite

## 如何找到OpenClaw构建配置

### 步骤1: 登录OpenClaw控制UI
1. 打开OpenClaw控制UI Web界面
2. 找到项目设置或构建配置

### 步骤2: 查找构建命令配置
在配置中查找以下字段：
- `build_command`
- `build_script`
- `build_cmd`
- `command`
- `script`

### 步骤3: 修改配置
将现有的`vite build`改为上述推荐方案之一。

## 测试验证

### 测试1: 本地测试构建
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./build
```

### 测试2: 测试npm脚本
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
npm run build
```

### 测试3: 测试直接vite命令
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./vite build
```

## 故障排除

### 如果仍然失败：
1. **检查依赖**：
   ```bash
   cd /Users/carson/.openclaw/workspace/fund-stock-show
   npm install
   ```

2. **检查权限**：
   ```bash
   chmod +x /Users/carson/.openclaw/workspace/fund-stock-show/build
   chmod +x /Users/carson/.openclaw/workspace/fund-stock-show/vite
   ```

3. **检查路径**：
   ```bash
   ls -la /Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin/vite
   ```

4. **查看详细错误**：
   ```bash
   cd /Users/carson/.openclaw/workspace/fund-stock-show
   ./build-wrapper.sh
   ```

## 技术细节

### 为什么`vite`命令找不到？
- 在Unix/Linux系统中，可执行文件需要在PATH环境变量中
- `node_modules/.bin/vite`是本地安装的vite命令
- npm运行时自动将`node_modules/.bin`添加到PATH
- 直接执行`vite`命令时，PATH中没有这个目录

### OpenClaw环境特点
- 可能在不同的用户或环境上下文中执行
- PATH环境变量可能不包含用户本地目录
- 可能需要绝对路径或环境设置

## 联系支持

如果问题仍然存在，请提供：
1. OpenClaw控制UI的完整错误信息
2. 当前配置的构建命令
3. OpenClaw版本信息
4. 操作系统和环境信息

## 相关链接
- GitHub仓库: https://github.com/CarsonLyu87/fund-stock-show
- GitHub Pages: https://CarsonLyu87.github.io/fund-stock-show/
- 最新提交: https://github.com/CarsonLyu87/fund-stock-show/commit/376116f3

## 更新历史
- 2026-03-26: 创建全面的构建环境解决方案
- 2026-03-26: 添加基金添加功能调试日志
- 2026-03-26: 修复HTTP头安全问题
- 2026-03-26: 解决基金持仓估值计算问题