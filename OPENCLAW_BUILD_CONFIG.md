# OpenClaw控制UI构建配置

## 紧急问题修复

OpenClaw控制UI报告：
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## 问题原因

OpenClaw执行环境中，`node_modules/.bin`目录不在PATH环境变量中，导致直接调用`vite`命令失败。

## 解决方案

### 方案A: 修改OpenClaw构建命令（立即生效）

**在OpenClaw控制UI中，将构建命令从：**
```
vite build
```

**改为以下任一选项：**

#### 选项1: 使用项目构建包装器（推荐）
```
cd /Users/carson/.openclaw/workspace/fund-stock-show && ./build
```
或
```
/Users/carson/.openclaw/workspace/fund-stock-show/build
```

#### 选项2: 使用npm脚本
```
cd /Users/carson/.openclaw/workspace/fund-stock-show && npm run build
```

#### 选项3: 使用npx
```
cd /Users/carson/.openclaw/workspace/fund-stock-show && npx vite build
```

#### 选项4: 使用绝对路径
```
/Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin/vite build
```

### 方案B: 创建OpenClaw配置文件

如果OpenClaw支持配置文件，请创建以下配置：

```yaml
# openclaw-project-config.yaml
project:
  name: fund-stock-show
  path: /Users/carson/.openclaw/workspace/fund-stock-show
  build_command: "./build"
  # 或使用:
  # build_command: "npm run build"
  # build_command: "npx vite build"
```

### 方案C: 环境变量设置

在OpenClaw环境中设置：
```bash
export PATH=/Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin:$PATH
```
然后执行：`vite build`

## 已创建的构建解决方案

### 1. `build` - 构建命令包装器
```bash
# 位置: /Users/carson/.openclaw/workspace/fund-stock-show/build
# 权限: 可执行 (chmod +x build)
# 功能: 自动处理所有构建方法
```

### 2. `vite` - vite命令包装器
```bash
# 位置: /Users/carson/.openclaw/workspace/fund-stock-show/vite
# 功能: 当直接调用vite时自动处理PATH问题
```

### 3. `build-wrapper.sh` - 通用构建脚本
```bash
# 位置: /Users/carson/.openclaw/workspace/fund-stock-show/build-wrapper.sh
# 功能: 详细的构建过程和错误处理
```

## 如何找到OpenClaw构建配置

### 步骤1: 登录OpenClaw控制UI
1. 打开OpenClaw控制UI Web界面
2. 导航到项目设置

### 步骤2: 查找构建配置
在项目设置中查找以下字段：
- `build_command`
- `build_script`
- `build_cmd`
- `command`
- `script`
- `build`

### 步骤3: 修改配置
将现有的`vite build`改为：
```
cd /Users/carson/.openclaw/workspace/fund-stock-show && ./build
```

## 测试验证

### 测试1: 本地测试构建
```bash
cd /Users/carson/.openclaw/workspace/fund-stock-show
./build
```

### 测试2: 测试所有构建方法
```bash
# 方法1: 使用包装器
./build

# 方法2: 使用npm
npm run build

# 方法3: 使用npx
npx vite build

# 方法4: 直接调用
./node_modules/.bin/vite build
```

## 故障排除

### 如果仍然失败：
1. **检查权限**：
   ```bash
   chmod +x /Users/carson/.openclaw/workspace/fund-stock-show/build
   chmod +x /Users/carson/.openclaw/workspace/fund-stock-show/vite
   ```

2. **检查依赖**：
   ```bash
   cd /Users/carson/.openclaw/workspace/fund-stock-show
   npm install
   ```

3. **检查路径**：
   ```bash
   ls -la /Users/carson/.openclaw/workspace/fund-stock-show/build
   ls -la /Users/carson/.openclaw/workspace/fund-stock-show/node_modules/.bin/vite
   ```

4. **查看详细错误**：
   ```bash
   cd /Users/carson/.openclaw/workspace/fund-stock-show
   ./build-wrapper.sh
   ```

## 技术说明

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
- 最新提交: https://github.com/CarsonLyu87/fund-stock-show/commit/e4ac45ff

## 更新历史
- 2026-03-26: 创建OpenClaw专用构建配置说明
- 2026-03-26: 添加CORS代理支持，解决API跨域问题
- 2026-03-26: 修复基金添加状态同步问题
- 2026-03-26: 解决HTTP头安全问题