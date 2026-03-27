#!/bin/bash
# vite命令包装器，用于OpenClaw环境
# 当控制UI调用"vite build"时，实际执行"./build"

echo "⚠️  OpenClaw环境: 重定向 'vite build' 到 './build'"
echo "   原因: vite命令在OpenClaw PATH中不可用"
echo ""

# 执行真正的构建脚本
exec ./build "$@"