#!/usr/bin/env python3
"""
AKshare 数据桥接服务
为 TypeScript 应用提供 AKshare 数据访问接口
"""

import json
import sys
import akshare as ak
from datetime import datetime
import traceback

def get_stock_data(codes):
    """获取股票实时行情数据"""
    try:
        all_stocks = []
        
        # 方法1: 直接使用新浪财经接口（最快）
        for code in codes:
            try:
                print(f"获取股票 {code} 数据（新浪接口）...", file=sys.stderr)
                # 新浪财经接口
                if code.startswith('6'):
                    sina_code = f'sh{code}'
                else:
                    sina_code = f'sz{code}'
                
                stock_zh_a_spot_sina_df = ak.stock_zh_a_spot_sina(symbol=sina_code)
                if not stock_zh_a_spot_sina_df.empty:
                    stock = stock_zh_a_spot_sina_df.iloc[0]
                    stock_info = {
                        'code': code,
                        'name': str(stock['name']),
                        'latest_price': float(stock['price']),
                        'change': float(stock['change']),
                        'change_percent': float(stock['changepercent']),
                        'volume': int(stock['volume']),
                        'amount': float(stock['amount']),
                        'open': float(stock['open']),
                        'high': float(stock['high']),
                        'low': float(stock['low']),
                        'previous_close': float(stock['settlement']),
                        'timestamp': str(stock['time'])
                    }
                    all_stocks.append(stock_info)
                    print(f"股票 {code} 数据获取成功", file=sys.stderr)
                    continue
            except Exception as e:
                print(f"股票 {code} 新浪接口失败: {e}", file=sys.stderr)
        
        # 如果新浪接口失败，尝试其他方法
        if len(all_stocks) < len(codes):
            print("部分股票新浪接口失败，尝试其他方法...", file=sys.stderr)
            
            # 方法2: 使用 stock_zh_a_spot_em 获取所有A股实时数据
            try:
                print("正在获取A股实时数据...", file=sys.stderr)
                stock_zh_a_spot_em_df = ak.stock_zh_a_spot_em()
                print(f"获取到 {len(stock_zh_a_spot_em_df)} 只A股数据", file=sys.stderr)
                
                for code in codes:
                    # 如果已经获取到，跳过
                    if any(stock['code'] == code for stock in all_stocks):
                        continue
                    
                    # 查找特定股票
                    stock_data = stock_zh_a_spot_em_df[stock_zh_a_spot_em_df['代码'] == code]
                    
                    if not stock_data.empty:
                        stock = stock_data.iloc[0]
                        stock_info = {
                            'code': code,
                            'name': str(stock['名称']),
                            'latest_price': float(stock['最新价']),
                            'change': float(stock['涨跌额']),
                            'change_percent': float(stock['涨跌幅']),
                            'volume': int(stock['成交量']),
                            'amount': float(stock['成交额']),
                            'open': float(stock['今开']),
                            'high': float(stock['最高']),
                            'low': float(stock['最低']),
                            'previous_close': float(stock['昨收']),
                            'timestamp': str(stock['时间'])
                        }
                        all_stocks.append(stock_info)
                        print(f"找到股票 {code}: {stock['名称']}", file=sys.stderr)
                        
            except Exception as e:
                print(f"方法2失败: {e}", file=sys.stderr)
        
        return all_stocks
        
    except Exception as e:
        print(f"获取股票数据失败: {e}", file=sys.stderr)
        traceback.print_exc()
        return []

def get_fund_data(codes):
    """获取基金净值数据"""
    try:
        all_funds = []
        
        for code in codes:
            try:
                print(f"获取基金 {code} 数据...", file=sys.stderr)
                
                # 方法1: 使用 fund_open_fund_info_em 获取基金净值走势
                fund_open_fund_info_em_df = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")
                
                if not fund_open_fund_info_em_df.empty:
                    # 获取基金名称（从第一行获取）
                    fund_name = str(fund_open_fund_info_em_df.iloc[0]['基金简称']) if '基金简称' in fund_open_fund_info_em_df.columns else f"基金{code}"
                    
                    # 获取最新净值数据
                    latest = fund_open_fund_info_em_df.iloc[-1]
                    
                    # 计算涨跌
                    change = 0
                    change_percent = 0
                    if len(fund_open_fund_info_em_df) >= 2:
                        prev = fund_open_fund_info_em_df.iloc[-2]
                        change = float(latest['单位净值']) - float(prev['单位净值'])
                        if float(prev['单位净值']) > 0:
                            change_percent = (change / float(prev['单位净值'])) * 100
                    
                    fund_info = {
                        'code': code,
                        'name': fund_name,
                        'net_value': float(latest['单位净值']),
                        'accumulated_value': float(latest['累计净值']) if '累计净值' in latest else float(latest['单位净值']),
                        'change': change,
                        'change_percent': change_percent,
                        'date': str(latest['净值日期']),
                        'timestamp': datetime.now().isoformat()
                    }
                    all_funds.append(fund_info)
                    print(f"基金 {code} 数据获取成功", file=sys.stderr)
                    continue
                
                # 方法2: 尝试使用其他函数
                try:
                    # 获取基金基本信息
                    fund_open_fund_daily_em_df = ak.fund_open_fund_daily_em()
                    if not fund_open_fund_daily_em_df.empty:
                        # 在列表中查找特定基金
                        fund_data = fund_open_fund_daily_em_df[fund_open_fund_daily_em_df['基金代码'] == code]
                        if not fund_data.empty:
                            fund_row = fund_data.iloc[0]
                            fund_info = {
                                'code': code,
                                'name': str(fund_row['基金简称']),
                                'net_value': float(fund_row['单位净值']),
                                'accumulated_value': float(fund_row['累计净值']),
                                'change': float(fund_row['日增长率']),
                                'change_percent': float(fund_row['日增长率']),
                                'date': str(fund_row['净值日期']),
                                'timestamp': datetime.now().isoformat()
                            }
                            all_funds.append(fund_info)
                            print(f"基金 {code} 通过方法2获取成功", file=sys.stderr)
                            continue
                except Exception as e2:
                    print(f"基金 {code} 方法2失败: {e2}", file=sys.stderr)
                
                print(f"基金 {code} 未找到数据", file=sys.stderr)
                
            except Exception as e:
                print(f"基金 {code} 获取失败: {e}", file=sys.stderr)
                continue
        
        return all_funds
        
    except Exception as e:
        print(f"获取基金数据失败: {e}", file=sys.stderr)
        traceback.print_exc()
        return []

def main():
    """主函数：处理命令行参数"""
    if len(sys.argv) < 3:
        print("Usage: python akshare_bridge.py <command> <json_data>", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    json_data = sys.argv[2]
    
    try:
        data = json.loads(json_data)
        
        if command == 'stocks':
            codes = data.get('codes', [])
            result = get_stock_data(codes)
            print(json.dumps(result, ensure_ascii=False))
            
        elif command == 'funds':
            codes = data.get('codes', [])
            result = get_fund_data(codes)
            print(json.dumps(result, ensure_ascii=False))
            
        else:
            print(f"未知命令: {command}", file=sys.stderr)
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(f"JSON解析失败: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"处理失败: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()