#!/bin/bash

# OpenClaw环境专用构建脚本
# 解决 "vite: command not found" 问题

set -e

echo "=== OpenClaw环境构建脚本 ==="
echo "解决 'vite: command not found' 问题"
echo ""

# 设置正确的PATH
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$SCRIPT_DIR/node_modules/.bin:$PATH"

echo "当前目录: $SCRIPT_DIR"
echo "更新后的PATH包含: $SCRIPT_DIR/node_modules/.bin"
echo ""

# 检查vite是否可用
if command -v vite &> /dev/null; then
    echo "✅ vite命令可用"
    echo "vite路径: $(which vite)"
else
    echo "❌ vite命令不可用，尝试安装依赖..."
    npm install
    export PATH="$SCRIPT_DIR/node_modules/.bin:$PATH"
    
    if command -v vite &> /dev/null; then
        echo "✅ vite命令现在可用"
    else
        echo "❌ 仍然找不到vite命令，使用npx"
    fi
fi

echo ""
echo "=== 开始构建 ==="

# 方法1: 使用npx（最可靠）
echo "方法1: 使用npx vite build..."
if npx vite build 2>&1; then
    echo "✅ npx vite build 成功"
    exit 0
else
    echo "❌ npx vite build 失败"
fi

echo ""
echo "方法2: 使用npm run build..."
if npm run build 2>&1; then
    echo "✅ npm run build 成功"
    exit 0
else
    echo "❌ npm run build 失败"
fi

echo ""
echo "方法3: 直接调用vite..."
if vite build 2>&1; then
    echo "✅ vite build 成功"
    exit 0
else
    echo "❌ vite build 失败"
fi

echo ""
echo "❌ 所有构建方法都失败了"
echo "请检查:"
echo "1. node_modules目录是否存在"
echo "2. vite是否在node_modules中"
echo "3. 是否有足够的权限"
exit 1