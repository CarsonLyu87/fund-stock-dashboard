#!/usr/bin/env node

// 基金问题诊断脚本
// 诊断基金添加和持仓估值计算问题

console.log('🔍 基金问题诊断脚本');
console.log('===================\n');

// 模拟浏览器环境
global.localStorage = {
  _data: {},
  getItem(key) {
    return this._data[key] || null;
  },
  setItem(key, value) {
    this._data[key] = value;
  },
  removeItem(key) {
    delete this._data[key];
  },
  clear() {
    this._data = {};
  }
};

// 模拟window对象
global.window = { localStorage: global.localStorage };

console.log('1. 测试localStorage操作...');
try {
  // 测试添加基金
  const testFund = {
    code: '005827',
    name: '易方达蓝筹精选混合',
    addedAt: new Date().toISOString(),
    notes: '测试基金'
  };
  
  const userFunds = [testFund];
  localStorage.setItem('fund_stock_show_user_funds', JSON.stringify(userFunds));
  
  const stored = localStorage.getItem('fund_stock_show_user_funds');
  const parsed = JSON.parse(stored);
  
  console.log('✅ localStorage操作正常');
  console.log(`   存储了 ${parsed.length} 只基金: ${parsed.map(f => f.code).join(', ')}`);
} catch (error) {
  console.log('❌ localStorage操作失败:', error.message);
}

console.log('\n2. 测试getUserFundCodes函数...');
try {
  // 复制项目中的getUserFundCodes函数
  function getUserFundCodes() {
    try {
      // 尝试从localStorage获取用户基金配置
      const stored = localStorage.getItem('fund_stock_show_user_funds');
      if (stored) {
        const userFunds = JSON.parse(stored);
        if (Array.isArray(userFunds) && userFunds.length > 0) {
          return userFunds.map((fund) => fund.code);
        }
      }
    } catch (error) {
      console.error('获取用户基金列表失败:', error);
    }
    
    // 默认基金列表
    return [
      '005827', '161725', '003095', '110022', '519674',
      '260108', '000404', '001714', '000248', '001475'
    ];
  }
  
  const fundCodes = getUserFundCodes();
  console.log(`✅ 获取到 ${fundCodes.length} 只基金代码`);
  console.log(`   基金代码: ${fundCodes.join(', ')}`);
} catch (error) {
  console.log('❌ getUserFundCodes失败:', error.message);
}

console.log('\n3. 测试HTTP头工具...');
try {
  // 模拟httpHeaders.ts中的函数
  function getFundApiHeaders() {
    const isBrowser = typeof window !== 'undefined';
    
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    // 只在Node.js环境中设置Referer
    if (!isBrowser) {
      headers['Referer'] = 'https://fund.eastmoney.com/';
    }
    
    return headers;
  }
  
  const headers = getFundApiHeaders();
  console.log('✅ HTTP头工具正常');
  console.log(`   生成的HTTP头: ${JSON.stringify(headers, null, 2)}`);
  
  // 检查是否有不安全的头
  const unsafeHeaders = ['User-Agent', 'Accept-Encoding', 'Connection', 'Referer'];
  let hasUnsafeHeader = false;
  
  for (const header of unsafeHeaders) {
    if (headers[header]) {
      console.log(`   ⚠️  包含不安全的头: ${header}`);
      hasUnsafeHeader = true;
    }
  }
  
  if (!hasUnsafeHeader) {
    console.log('   ✅ 所有HTTP头都是浏览器安全的');
  }
} catch (error) {
  console.log('❌ HTTP头工具失败:', error.message);
}

console.log('\n4. 分析可能的问题...');
console.log('   📌 问题1: 基金添加后不显示在列表中');
console.log('       可能原因:');
console.log('       - localStorage更新后，UI没有重新渲染');
console.log('       - fetchFundData没有读取最新的localStorage');
console.log('       - React状态没有正确更新');
console.log('');
console.log('   📌 问题2: 持仓估值计算失败');
console.log('       可能原因:');
console.log('       - 股票数据API调用失败（HTTP头问题）');
console.log('       - 基金持仓数据获取失败');
console.log('       - 数据匹配逻辑问题');
console.log('');
console.log('   📌 问题3: 整体功能退化');
console.log('       可能原因:');
console.log('       - HTTP头修复影响了某些API调用');
console.log('       - 环境检测逻辑有问题');
console.log('       - 构建过程中引入了错误');

console.log('\n5. 建议的解决方案...');
console.log('   🔧 方案A: 修复基金添加状态同步');
console.log('       1. 确保addFundToUserList正确更新localStorage');
console.log('       2. 确保UnifiedFundManager的loadUserFunds被调用');
console.log('       3. 确保fetchFundData读取正确的基金列表');
console.log('');
console.log('   🔧 方案B: 修复持仓估值计算');
console.log('       1. 检查股票数据API是否可访问');
console.log('       2. 检查HTTP头设置是否正确');
console.log('       3. 添加调试日志定位失败环节');
console.log('');
console.log('   🔧 方案C: 创建测试页面验证功能');
console.log('       1. 使用test-fund-add-flow.html测试基金添加');
console.log('       2. 使用test-fund-valuation.html测试持仓计算');
console.log('       3. 使用test-http-headers.html测试HTTP头');

console.log('\n6. 测试链接...');
console.log('   🌐 主应用: https://CarsonLyu87.github.io/fund-stock-show/');
console.log('   🔍 基金添加测试: https://CarsonLyu87.github.io/fund-stock-show/test-fund-add-flow.html');
console.log('   📊 持仓估值测试: https://CarsonLyu87.github.io/fund-stock-show/test-fund-valuation.html');
console.log('   🔧 HTTP头测试: https://CarsonLyu87.github.io/fund-stock-show/test-http-headers.html');

console.log('\n7. 诊断完成');
console.log('   请根据以上分析检查具体问题环节。');
console.log('   如果需要进一步诊断，请提供具体的错误信息。');