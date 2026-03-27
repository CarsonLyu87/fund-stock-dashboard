#!/usr/bin/env python3
"""
测试 AKshare 是否正常工作
"""

import akshare as ak
import json
from datetime import datetime

print("测试 AKshare 功能...")

# 测试1: 检查 AKshare 版本
print(f"AKshare 版本: {ak.__version__}")

# 测试2: 尝试获取基金数据
print("\n测试基金数据获取...")
try:
    # 获取基金实时估算
    fund_code = "005827"  # 易方达蓝筹精选混合
    fund_value_estimation_em_df = ak.fund_value_estimation_em(symbol=fund_code)
    
    if not fund_value_estimation_em_df.empty:
        latest = fund_value_estimation_em_df.iloc[-1]
        print(f"基金 {fund_code} 数据:")
        print(f"  名称: {latest['基金名称']}")
        print(f"  单位净值: {latest['单位净值']}")
        print(f"  累计净值: {latest['累计净值']}")
        print(f"  日增长率: {latest['日增长率']}%")
        print(f"  净值日期: {latest['净值日期']}")
    else:
        print(f"未找到基金 {fund_code} 的实时估算数据")
        
except Exception as e:
    print(f"基金数据获取失败: {e}")

# 测试3: 尝试获取股票数据
print("\n测试股票数据获取...")
try:
    # 获取A股实时数据
    stock_code = "600519"  # 贵州茅台
    stock_zh_a_spot_em_df = ak.stock_zh_a_spot_em()
    
    if not stock_zh_a_spot_em_df.empty:
        # 查找特定股票
        stock_data = stock_zh_a_spot_em_df[stock_zh_a_spot_em_df['代码'] == stock_code]
        
        if not stock_data.empty:
            stock = stock_data.iloc[0]
            print(f"股票 {stock_code} 数据:")
            print(f"  名称: {stock['名称']}")
            print(f"  最新价: {stock['最新价']}")
            print(f"  涨跌额: {stock['涨跌额']}")
            print(f"  涨跌幅: {stock['涨跌幅']}%")
            print(f"  成交量: {stock['成交量']}")
            print(f"  成交额: {stock['成交额']}")
        else:
            print(f"未找到股票 {stock_code}")
    else:
        print("未获取到A股数据")
        
except Exception as e:
    print(f"股票数据获取失败: {e}")

# 测试4: 检查可用函数
print("\n检查可用函数...")
try:
    # 列出所有以"fund_"开头的函数
    fund_functions = [func for func in dir(ak) if func.startswith('fund_')]
    print(f"找到 {len(fund_functions)} 个基金相关函数")
    
    # 列出所有以"stock_"开头的函数
    stock_functions = [func for func in dir(ak) if func.startswith('stock_')]
    print(f"找到 {len(stock_functions)} 个股票相关函数")
    
except Exception as e:
    print(f"检查函数失败: {e}")

print("\n测试完成!")