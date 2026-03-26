#!/bin/bash

# vite命令包装器
# 当直接调用 "vite" 命令时，确保它能工作

set -e

echo "=== vite命令包装器 ==="
echo "确保vite命令在任何环境中都能工作"
echo ""

# 检查是否在项目目录中
if [ ! -f "package.json" ]; then
    echo "❌ 错误：不在Node.js项目目录中"
    echo "请切换到包含package.json的目录"
    exit 1
fi

# 检查node_modules/.bin/vite是否存在
if [ -f "node_modules/.bin/vite" ]; then
    echo "✅ 找到本地vite命令: node_modules/.bin/vite"
    
    # 设置PATH包含当前目录的node_modules/.bin
    OLD_PATH="$PATH"
    export PATH="$(pwd)/node_modules/.bin:$PATH"
    
    echo "📁 更新PATH包含: $(pwd)/node_modules/.bin"
    
    # 执行vite命令
    echo "🚀 执行: vite $@"
    exec vite "$@"
    
else
    echo "❌ 本地vite命令未找到"
    echo "尝试安装依赖..."
    
    # 安装依赖
    npm install
    
    if [ -f "node_modules/.bin/vite" ]; then
        echo "✅ 依赖安装成功，找到vite命令"
        
        # 设置PATH
        OLD_PATH="$PATH"
        export PATH="$(pwd)/node_modules/.bin:$PATH"
        
        echo "🚀 执行: vite $@"
        exec vite "$@"
    else
        echo "❌ 安装依赖后仍未找到vite命令"
        echo "请检查package.json中是否有vite依赖"
        exit 1
    fi
fi