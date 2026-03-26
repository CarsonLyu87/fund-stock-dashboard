#!/bin/bash

# OpenClaw构建环境设置脚本
# 在OpenClaw控制UI中，在构建命令前执行此脚本

set -e

echo "=== 设置OpenClaw构建环境 ==="
echo "解决 'vite: command not found' 问题"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 项目目录: $PROJECT_DIR"

# 检查当前环境
echo ""
echo "🔍 当前环境检查:"
echo "当前目录: $(pwd)"
echo "原始PATH: $PATH"
echo ""

# 添加项目node_modules/.bin到PATH
export PATH="$PROJECT_DIR/node_modules/.bin:$PATH"
echo "✅ 更新PATH:"
echo "新PATH: $PATH"
echo ""

# 检查vite是否现在可用
if command -v vite &> /dev/null; then
    echo "✅ vite命令现在可用: $(which vite)"
    echo "vite版本: $(vite --version 2>/dev/null || echo '无法获取版本')"
else
    echo "❌ vite命令仍然不可用"
    echo "检查本地vite:"
    ls -la "$PROJECT_DIR/node_modules/.bin/vite" 2>/dev/null || echo "本地vite不存在"
    echo ""
    echo "🔄 安装依赖..."
    cd "$PROJECT_DIR" && npm install
    echo ""
    echo "✅ 依赖安装完成"
fi

echo ""
echo "=== 构建命令测试 ==="
echo ""

# 测试构建命令
echo "测试构建命令:"
cd "$PROJECT_DIR"

echo "1. 测试 npm run build..."
if npm run build 2>&1 | grep -q "error\|Error\|failed\|Failed"; then
    echo "❌ npm run build 失败"
else
    echo "✅ npm run build 成功"
fi

echo ""
echo "2. 测试 vite build..."
if vite build 2>&1 | grep -q "error\|Error\|failed\|Failed"; then
    echo "❌ vite build 失败"
else
    echo "✅ vite build 成功"
fi

echo ""
echo "3. 测试 npx vite build..."
if npx vite build 2>&1 | grep -q "error\|Error\|failed\|Failed"; then
    echo "❌ npx vite build 失败"
else
    echo "✅ npx vite build 成功"
fi

echo ""
echo "=== 使用说明 ==="
echo ""
echo "在OpenClaw控制UI中，有两种配置方式:"
echo ""
echo "方式1: 设置环境变量后执行构建"
echo "--------------------------------"
echo "构建前脚本: source $PROJECT_DIR/setup-build-env.sh"
echo "构建命令: vite build"
echo ""
echo "方式2: 直接使用包装器"
echo "--------------------------------"
echo "构建命令: $PROJECT_DIR/build"
echo "或"
echo "构建命令: cd $PROJECT_DIR && ./build"
echo ""
echo "方式3: 使用npm脚本"
echo "--------------------------------"
echo "构建命令: cd $PROJECT_DIR && npm run build"
echo ""
echo "=== 推荐配置 ==="
echo ""
echo "最简单可靠的配置:"
echo "构建命令: $PROJECT_DIR/build"
echo ""
echo "或"
echo ""
echo "构建命令: cd $PROJECT_DIR && npm run build"

echo ""
echo "✅ 环境设置完成"