#!/usr/bin/env python3
"""
AKShare HTTP 服务器
为 TypeScript 应用提供稳定的 AKShare 数据访问接口
"""

import json
import sys
import akshare as ak
from datetime import datetime, timedelta
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

# 数据缓存
data_cache = {}
CACHE_TTL = 300  # 5分钟

class AKShareHandler(BaseHTTPRequestHandler):
    """处理 AKShare API 请求"""
    
    def do_GET(self):
        """处理 GET 请求"""
        try:
            # 解析 URL
            parsed_url = urlparse(self.path)
            path = parsed_url.path.strip('/')
            query_params = parse_qs(parsed_url.query)
            
            # 设置响应头
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # 处理 OPTIONS 预检请求
            if self.command == 'OPTIONS':
                return
            
            # 路由处理
            response = {}
            
            if path == 'stocks':
                codes = json.loads(query_params.get('codes', ['[]'])[0])
                response = self.handle_stocks(codes)
                
            elif path == 'funds':
                codes = json.loads(query_params.get('codes', ['[]'])[0])
                response = self.handle_funds(codes)
                
            elif path == 'fund-detail':
                code = query_params.get('code', [''])[0]
                response = self.handle_fund_detail(code)
                
            elif path == 'search-funds':
                keyword = query_params.get('keyword', [''])[0]
                response = self.handle_search_funds(keyword)
                
            elif path == 'status':
                response = self.handle_status()
                
            else:
                response = {
                    'success': False,
                    'error': f'未知端点: {path}',
                    'available_endpoints': ['stocks', 'funds', 'fund-detail', 'search-funds', 'status']
                }
            
            # 发送响应
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            error_response = {
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }
            self.wfile.write(json.dumps(error_response, ensure_ascii=False).encode('utf-8'))
    
    def handle_stocks(self, codes):
        """处理股票数据请求"""
        cache_key = f'stocks_{"_".join(sorted(codes))}'
        cached_data = self.get_cached_data(cache_key)
        
        if cached_data:
            print(f"使用缓存的股票数据: {len(codes)} 只股票")
            return {
                'success': True,
                'data': cached_data,
                'cached': True,
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            print(f"获取股票数据: {len(codes)} 只股票")
            all_stocks = []
            
            # 方法1: 使用新浪财经接口（最快）
            for code in codes:
                try:
                    print(f"  获取股票 {code} 数据（新浪接口）...")
                    
                    # 确定市场前缀
                    if code.startswith('6'):
                        sina_code = f'sh{code}'
                    elif code.startswith('0') or code.startswith('3'):
                        sina_code = f'sz{code}'
                    else:
                        sina_code = code
                    
                    # 获取数据
                    stock_df = ak.stock_zh_a_spot_sina(symbol=sina_code)
                    
                    if not stock_df.empty:
                        stock = stock_df.iloc[0]
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
                        print(f"  股票 {code} 数据获取成功")
                        continue
                        
                except Exception as e:
                    print(f"  股票 {code} 新浪接口失败: {e}")
            
            # 方法2: 如果新浪接口失败，尝试其他方法
            if len(all_stocks) < len(codes):
                print(f"部分股票新浪接口失败，尝试其他方法... ({len(all_stocks)}/{len(codes)})")
                
                try:
                    # 获取所有A股实时数据
                    print("正在获取A股实时数据...")
                    all_a_stocks_df = ak.stock_zh_a_spot_em()
                    print(f"获取到 {len(all_a_stocks_df)} 只A股数据")
                    
                    for code in codes:
                        # 如果已经获取到，跳过
                        if any(stock['code'] == code for stock in all_stocks):
                            continue
                        
                        # 查找特定股票
                        stock_data = all_a_stocks_df[all_a_stocks_df['代码'] == code]
                        
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
                            print(f"找到股票 {code}: {stock['名称']}")
                            
                except Exception as e:
                    print(f"方法2失败: {e}")
            
            # 缓存数据
            self.cache_data(cache_key, all_stocks)
            
            return {
                'success': True,
                'data': all_stocks,
                'cached': False,
                'count': len(all_stocks),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"获取股票数据失败: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'data': []
            }
    
    def handle_funds(self, codes):
        """处理基金数据请求"""
        cache_key = f'funds_{"_".join(sorted(codes))}'
        cached_data = self.get_cached_data(cache_key)
        
        if cached_data:
            print(f"使用缓存的基金数据: {len(codes)} 只基金")
            return {
                'success': True,
                'data': cached_data,
                'cached': True,
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            print(f"获取基金数据: {len(codes)} 只基金")
            all_funds = []
            
            for code in codes:
                try:
                    print(f"  获取基金 {code} 数据...")
                    
                    # 方法1: 使用 fund_em_open_fund_info 获取基金信息
                    fund_info_df = ak.fund_em_open_fund_info(fund=code, indicator="单位净值走势")
                    
                    if not fund_info_df.empty:
                        # 获取最新净值
                        latest_row = fund_info_df.iloc[-1]
                        
                        # 计算涨跌幅（如果有前一日数据）
                        change_percent = 0
                        change = 0
                        
                        if len(fund_info_df) > 1:
                            prev_row = fund_info_df.iloc[-2]
                            prev_value = float(prev_row['单位净值'])
                            current_value = float(latest_row['单位净值'])
                            
                            if prev_value > 0:
                                change = current_value - prev_value
                                change_percent = (change / prev_value) * 100
                        
                        # 获取基金名称
                        fund_name = ""
                        try:
                            fund_basic_info = ak.fund_em_fund_name()
                            fund_info = fund_basic_info[fund_basic_info['基金代码'] == code]
                            if not fund_info.empty:
                                fund_name = str(fund_info.iloc[0]['基金简称'])
                        except:
                            fund_name = f"基金{code}"
                        
                        fund_data = {
                            'code': code,
                            'name': fund_name,
                            'latest_price': float(latest_row['单位净值']),
                            'change': float(change),
                            'change_percent': float(change_percent),
                            'volume': 0,  # 基金没有成交量概念
                            'timestamp': str(latest_row['净值日期']),
                            'estimated_value': float(latest_row['单位净值']),
                            'estimated_change_percent': float(change_percent)
                        }
                        
                        all_funds.append(fund_data)
                        print(f"  基金 {code} 数据获取成功: {fund_name}")
                        
                except Exception as e:
                    print(f"  基金 {code} 获取失败: {e}")
            
            # 缓存数据
            self.cache_data(cache_key, all_funds)
            
            return {
                'success': True,
                'data': all_funds,
                'cached': False,
                'count': len(all_funds),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"获取基金数据失败: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'data': []
            }
    
    def handle_fund_detail(self, code):
        """处理基金详情请求"""
        cache_key = f'fund_detail_{code}'
        cached_data = self.get_cached_data(cache_key)
        
        if cached_data:
            print(f"使用缓存的基金详情数据: {code}")
            return {
                'success': True,
                'data': cached_data,
                'cached': True,
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            print(f"获取基金详情: {code}")
            
            detail_data = {}
            
            # 1. 获取基金基本信息
            try:
                fund_basic_info = ak.fund_em_fund_name()
                fund_info = fund_basic_info[fund_basic_info['基金代码'] == code]
                if not fund_info.empty:
                    detail_data['basic_info'] = {
                        'code': code,
                        'name': str(fund_info.iloc[0]['基金简称']),
                        'full_name': str(fund_info.iloc[0]['基金简称']),
                        'type': str(fund_info.iloc[0]['基金类型']),
                        'company': str(fund_info.iloc[0]['基金管理人'])
                    }
            except Exception as e:
                print(f"获取基金基本信息失败: {e}")
            
            # 2. 获取净值走势
            try:
                fund_value_df = ak.fund_em_open_fund_info(fund=code, indicator="单位净值走势")
                if not fund_value_df.empty:
                    detail_data['value_history'] = fund_value_df.tail(30).to_dict('records')  # 最近30天
            except Exception as e:
                print(f"获取净值走势失败: {e}")
            
            # 3. 获取分红信息
            try:
                fund_dividend_df = ak.fund_em_open_fund_info(fund=code, indicator="分红送配")
                if not fund_dividend_df.empty:
                    detail_data['dividend_history'] = fund_dividend_df.tail(10).to_dict('records')  # 最近10次分红
            except Exception as e:
                print(f"获取分红信息失败: {e}")
            
            # 4. 获取持仓信息（季度报告）
            try:
                fund_position_df = ak.fund_em_portfolio_hold(code=code)
                if not fund_position_df.empty:
                    detail_data['positions'] = fund_position_df.tail(20).to_dict('records')  # 最近20个持仓
            except Exception as e:
                print(f"获取持仓信息失败: {e}")
            
            # 缓存数据
            self.cache_data(cache_key, detail_data)
            
            return {
                'success': True,
                'data': detail_data,
                'cached': False,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"获取基金详情失败: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'data': {}
            }
    
    def handle_search_funds(self, keyword):
        """处理基金搜索请求"""
        cache_key = f'search_{keyword}'
        cached_data = self.get_cached_data(cache_key)
        
        if cached_data:
            print(f"使用缓存的基金搜索结果: {keyword}")
            return {
                'success': True,
                'data': cached_data,
                'cached': True,
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            print(f"搜索基金: {keyword}")
            
            # 获取所有基金
            all_funds_df = ak.fund_em_fund_name()
            
            # 搜索基金
            if keyword:
                search_results = all_funds_df[
                    all_funds_df['基金简称'].str.contains(keyword, case=False, na=False) |
                    all_funds_df['基金代码'].str.contains(keyword, na=False)
                ]
            else:
                search_results = all_funds_df.head(50)  # 默认返回前50只
            
            # 转换为列表
            results = []
            for _, row in search_results.head(20).iterrows():  # 最多返回20条
                results.append({
                    'code': str(row['基金代码']),
                    'name': str(row['基金简称']),
                    'type': str(row['基金类型']),
                    'company': str(row['基金管理人'])
                })
            
            # 缓存数据
            self.cache_data(cache_key, results)
            
            return {
                'success': True,
                'data': results,
                'cached': False,
                'count': len(results),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"搜索基金失败: {e}")
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'data': []
            }
    
    def handle_status(self):
        """处理状态检查请求"""
        return {
            'success': True,
            'data': {
                'service': 'akshare-server',
                'version': '1.0.0',
                'status': 'running',
                'cache_size': len(data_cache),
                'timestamp': datetime.now().isoformat(),
                'endpoints': [
                    {'path': '/stocks', 'method': 'GET', 'description': '获取股票数据'},
                    {'path': '/funds', 'method': 'GET', 'description': '获取基金数据'},
                    {'path': '/fund-detail', 'method': 'GET', 'description': '获取基金详情'},
                    {'path': '/search-funds', 'method': 'GET', 'description': '搜索基金'},
                    {'path': '/status', 'method': 'GET', 'description': '服务状态'}
                ]
            }
        }
    
    def get_cached_data(self, key):
        """获取缓存数据"""
        if key in data_cache:
            cached_item = data_cache[key]
            if time.time() - cached_item['timestamp'] < CACHE_TTL:
                return cached_item['data']
            else:
                # 缓存过期，删除
                del data_cache[key]
        return None
    
    def cache_data(self, key, data):
        """缓存数据"""
        data_cache[key] = {
            'data': data,
            'timestamp': time.time()
        }
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

def cleanup_cache():
    """定期清理过期缓存"""
    while True:
        time.sleep(60)  # 每分钟检查一次
        current_time = time.time()
        expired_keys = []
        
        for key, item in data_cache.items():
            if current_time - item['timestamp'] > CACHE_TTL:
                expired_keys.append(key)
        
        for key in expired_keys:
            del data_cache[key]
        
        if expired_keys:
            print(f"清理了 {len(expired_keys)} 个过期缓存")

def main():
    """主函数"""
    print("=" * 60)
    print("AKShare HTTP 服务器")
    print("=" * 60)
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"服务地址: http://localhost:3002")
    print(f"缓存TTL: {CACHE_TTL} 秒")
    print("=" * 60)
    
    # 启动缓存清理线程
    cleanup_thread = threading.Thread(target=cleanup_cache, daemon=True)
    cleanup_thread.start()
    
    # 启动HTTP服务器
    server_address = ('', 3002)
    httpd = HTTPServer(server_address, AKShareHandler)
    
    print("服务器已启动，按 Ctrl+C 停止")
    print("可用端点:")
    print("  GET /stocks?codes=[...]      - 获取股票数据")
    print