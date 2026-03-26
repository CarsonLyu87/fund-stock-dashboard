#!/bin/bash

echo "=== 修复构建环境 ==="
echo "问题: 'vite: command not found'"
echo "原因: node_modules/.bin 不在 PATH 中"
echo ""

# 检查当前目录
echo "当前目录: $(pwd)"
echo ""

# 检查 node_modules/.bin 是否存在
if [ -d "node_modules/.bin" ]; then
    echo "✅ node_modules/.bin 目录存在"
    echo "vite 可执行文件: $(ls -la node_modules/.bin/vite 2>/dev/null || echo '未找到')"
else
    echo "❌ node_modules/.bin 目录不存在"
    echo "尝试安装依赖..."
    npm install
fi

echo ""
echo "=== 解决方案 ==="
echo "1. 使用 npx 运行 vite:"
echo "   npx vite build"
echo ""
echo "2. 或者将 node_modules/.bin 添加到 PATH:"
echo "   export PATH=\$(pwd)/node_modules/.bin:\$PATH"
echo "   vite build"
echo ""
echo "3. 或者使用 npm run build (应该可以工作):"
echo "   npm run build"
echo ""
echo "=== 测试构建 ==="

# 测试方法1: npx
echo "测试 npx vite build..."
if npx vite build 2>&1 | grep -q "built in"; then
    echo "✅ npx vite build 成功"
else
    echo "❌ npx vite build 失败"
fi

echo ""
# 测试方法2: 修改PATH后
echo "测试修改PATH后..."
OLD_PATH=$PATH
export PATH="$(pwd)/node_modules/.bin:$PATH"
if which vite > /dev/null 2>&1; then
    echo "✅ vite 命令现在可以在 PATH 中找到"
    if vite build 2>&1 | grep -q "built in"; then
        echo "✅ vite build 成功"
    else
        echo "❌ vite build 失败"
    fi
else
    echo "❌ vite 命令仍然找不到"
fi
export PATH=$OLD_PATH

echo ""
echo "=== 推荐解决方案 ==="
echo "在 OpenClaw 环境中，使用:"
echo "cd /Users/carson/.openclaw/workspace/fund-stock-show && npx vite build"
echo ""
echo "或者更新部署脚本使用 npx"