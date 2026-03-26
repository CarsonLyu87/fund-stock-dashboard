// 测试基金持仓估值计算问题
// 问题：昨晚的版本可以计算，今天的版本不行

console.log("=== 测试基金持仓估值计算 ===");

// 模拟问题分析
console.log("\n1. 问题分析：");
console.log("   - 昨晚版本：可以按基金持股比例估算估值");
console.log("   - 今天版本：计算不出来");
console.log("   - 可能原因：HTTP头修复引入的bug或数据格式问题");

console.log("\n2. 检查股票代码格式不一致问题：");

// 检查 freeStockService.ts 中的样本数据格式
const freeStockServiceFormat = [
  { stockCode: 'sh600519', stockName: '贵州茅台', weight: 15.2 },
  { stockCode: 'sz000858', stockName: '五粮液', weight: 14.8 }
];

// 检查 fundPortfolioService.ts 中的样本数据格式  
const fundPortfolioServiceFormat = [
  { stockCode: '600519', stockName: '贵州茅台', weight: 9.85 },
  { stockCode: '000858', stockName: '五粮液', weight: 9.76 }
];

console.log("   freeStockService.ts 格式:", freeStockServiceFormat.map(s => s.stockCode));
console.log("   fundPortfolioService.ts 格式:", fundPortfolioServiceFormat.map(s => s.stockCode));

console.log("\n3. 检查数据匹配逻辑：");

// 模拟 fetchStockDataMultiSource 返回的数据
const mockStockData = [
  { symbol: 'sh600519', name: '贵州茅台', currentPrice: 1700.50, changePercent: 1.5 },
  { symbol: 'sz000858', name: '五粮液', currentPrice: 145.30, changePercent: -0.8 }
];

console.log("   股票数据返回格式:", mockStockData.map(s => s.symbol));

// 模拟 fundPortfolioService.ts 中的处理逻辑
console.log("\n4. 模拟 fundPortfolioService.ts 处理逻辑：");

// 第241行：标准化股票代码（移除sh/sz前缀）
const stockDataMap = new Map();
mockStockData.forEach(stock => {
  const cleanSymbol = stock.symbol.replace(/^(sh|sz)/, '');
  console.log(`   原始: ${stock.symbol} -> 清理后: ${cleanSymbol}`);
  stockDataMap.set(cleanSymbol, stock);
});

// 第250行：使用 holding.stockCode 查找
const holding = { stockCode: '600519', stockName: '贵州茅台', weight: 9.85 };
const stock = stockDataMap.get(holding.stockCode);

console.log(`\n   查找持仓股票 ${holding.stockCode}:`, stock ? "找到" : "未找到");

if (stock) {
  console.log(`   股票数据: ${stock.name}, 价格: ${stock.currentPrice}, 涨跌幅: ${stock.changePercent}%`);
} else {
  console.log("   ❌ 问题：股票数据未找到！");
  console.log("   原因：stockDataMap 中的键是清理后的代码，但查找可能有问题");
}

console.log("\n5. 可能的解决方案：");
console.log("   a) 统一股票代码格式（都使用带前缀或都不带）");
console.log("   b) 修复数据匹配逻辑");
console.log("   c) 添加调试日志查看实际数据流");

console.log("\n6. 测试腾讯财经API转换逻辑：");

// 模拟 FREE_STOCK_APIS.tencent 转换
function convertToTencentFormat(symbols) {
  return symbols.map(symbol => {
    if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
      return symbol;
    } else if (symbol.startsWith('6')) {
      return `sh${symbol}`;
    } else {
      return `sz${symbol}`;
    }
  });
}

const testSymbols = ['600519', '000858', 'sh600519', 'sz000858'];
console.log("   输入:", testSymbols);
console.log("   转换后:", convertToTencentFormat(testSymbols));

console.log("\n=== 测试完成 ===");
console.log("\n建议：");
console.log("1. 检查实际调用 fetchStockDataMultiSource 时传入的股票代码格式");
console.log("2. 检查返回的股票数据格式");
console.log("3. 添加详细调试日志");