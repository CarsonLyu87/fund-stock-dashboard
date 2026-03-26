#!/bin/bash

# OpenClaw构建环境设置脚本
# 这个脚本确保OpenClaw控制UI可以正确构建项目

set -e

echo "=== OpenClaw构建环境设置 ==="
echo "解决 'vite: command not found' 问题"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 项目目录: $PROJECT_DIR"

# 检查当前环境
echo ""
echo "🔍 检查当前环境..."
echo "当前目录: $(pwd)"
echo "PATH: $PATH"
echo ""

# 检查vite是否可用
if command -v vite &> /dev/null; then
    echo "✅ vite命令在PATH中: $(which vite)"
else
    echo "❌ vite命令不在PATH中"
fi

# 检查本地vite
if [ -f "$PROJECT_DIR/node_modules/.bin/vite" ]; then
    echo "✅ 本地vite存在: $PROJECT_DIR/node_modules/.bin/vite"
else
    echo "❌ 本地vite不存在，安装依赖..."
    cd "$PROJECT_DIR" && npm install
fi

echo ""
echo "=== 解决方案 ==="

# 方案1: 创建全局符号链接（需要sudo权限）
echo "🔧 方案1: 创建全局符号链接"
echo "    sudo ln -sf $PROJECT_DIR/node_modules/.bin/vite /usr/local/bin/vite"
echo "    或"
echo "    sudo ln -sf $PROJECT_DIR/vite /usr/local/bin/vite"
echo ""

# 方案2: 更新PATH环境变量
echo "🔧 方案2: 更新PATH环境变量"
echo "    在OpenClaw配置中设置:"
echo "    export PATH=$PROJECT_DIR/node_modules/.bin:\$PATH"
echo "    然后执行: vite build"
echo ""

# 方案3: 使用绝对路径
echo "🔧 方案3: 使用绝对路径"
echo "    在OpenClaw中配置构建命令为:"
echo "    $PROJECT_DIR/node_modules/.bin/vite build"
echo "    或"
echo "    $PROJECT_DIR/build"
echo ""

# 方案4: 使用npm脚本
echo "🔧 方案4: 使用npm脚本"
echo "    在OpenClaw中配置构建命令为:"
echo "    cd $PROJECT_DIR && npm run build"
echo ""

# 方案5: 创建包装脚本
echo "🔧 方案5: 创建包装脚本"
echo "    已创建以下包装脚本:"
echo "    - $PROJECT_DIR/build - 构建包装器"
echo "    - $PROJECT_DIR/vite - vite命令包装器"
echo "    - $PROJECT_DIR/build-wrapper.sh - 通用构建脚本"
echo ""

echo "=== 推荐的OpenClaw配置 ==="
echo ""
echo "📋 配置1（最简单）:"
echo "   构建命令: cd $PROJECT_DIR && npm run build"
echo ""
echo "📋 配置2（使用包装器）:"
echo "   构建命令: $PROJECT_DIR/build"
echo ""
echo "📋 配置3（直接调用）:"
echo "   构建命令: $PROJECT_DIR/node_modules/.bin/vite build"
echo ""

echo "=== 测试当前配置 ==="
echo ""
echo "测试当前目录的构建:"
cd "$PROJECT_DIR" && ./build

echo ""
echo "✅ 设置完成"
echo ""
echo "如果OpenClaw控制UI仍然报告 'vite: command not found'，"
echo "请检查OpenClaw的构建命令配置，确保使用上述方案之一。"