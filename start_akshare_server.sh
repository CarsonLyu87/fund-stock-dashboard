#!/bin/bash

# AKShare 服务器启动脚本

echo "================================================"
echo "启动 AKShare 数据服务器"
echo "================================================"

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3，请先安装 Python3"
    exit 1
fi

# 检查 AKShare 是否安装
echo "检查 AKShare 安装..."
if ! python3 -c "import akshare" 2>/dev/null; then
    echo "AKShare 未安装，正在安装..."
    pip3 install akshare --upgrade
    if [ $? -ne 0 ]; then
        echo "错误: AKShare 安装失败"
        exit 1
    fi
    echo "AKShare 安装成功"
else
    echo "AKShare 已安装"
fi

# 检查端口是否被占用
PORT=3002
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "端口 $PORT 已被占用，尝试停止现有服务..."
    PID=$(lsof -ti:$PORT)
    if [ ! -z "$PID" ]; then
        kill -9 $PID
        echo "已停止进程 $PID"
        sleep 2
    fi
fi

# 启动服务器
echo "启动 AKShare HTTP 服务器 (端口: $PORT)..."
python3 akshare_server.py &

# 等待服务器启动
echo "等待服务器启动..."
sleep 3

# 检查服务器是否运行
if curl -s http://localhost:$PORT/status > /dev/null; then
    echo "✅ AKShare 服务器启动成功!"
    echo "服务地址: http://localhost:$PORT"
    echo ""
    echo "可用端点:"
    echo "  GET /stocks?codes=[...]      - 获取股票数据"
    echo "  GET /funds?codes=[...]       - 获取基金数据"
    echo "  GET /fund-detail?code=...    - 获取基金详情"
    echo "  GET /search-funds?keyword=... - 搜索基金"
    echo "  GET /status                  - 服务状态"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo "================================================"
    
    # 保持脚本运行
    wait
else
    echo "❌ AKShare 服务器启动失败"
    exit 1
fi