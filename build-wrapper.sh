#!/bin/bash

# 通用构建包装脚本
# 解决 "vite: command not found" 问题
# 适用于所有环境：OpenClaw、CI/CD、本地终端

set -e

echo "=== 通用构建包装脚本 ==="
echo "解决 'vite: command not found' 问题"
echo "工作目录: $(pwd)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境
check_environment() {
    echo "🔍 检查环境..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ npm 版本: $(npm --version)${NC}"
    
    # 检查npx
    if ! command -v npx &> /dev/null; then
        echo -e "${YELLOW}⚠️  npx 不可用，将尝试其他方法${NC}"
    else
        echo -e "${GREEN}✅ npx 可用${NC}"
    fi
    
    # 检查当前目录
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ 当前目录不是Node.js项目（缺少package.json）${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 在Node.js项目目录中${NC}"
}

# 检查依赖
check_dependencies() {
    echo ""
    echo "📦 检查依赖..."
    
    # 检查node_modules是否存在
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules目录不存在，安装依赖...${NC}"
        npm install
    else
        echo -e "${GREEN}✅ node_modules目录存在${NC}"
    fi
    
    # 检查vite是否安装
    if [ -f "node_modules/.bin/vite" ]; then
        echo -e "${GREEN}✅ vite 已安装在 node_modules/.bin/vite${NC}"
    else
        echo -e "${YELLOW}⚠️  vite 未在node_modules中找到，安装依赖...${NC}"
        npm install
    fi
}

# 方法1: 使用npx构建（最可靠）
build_with_npx() {
    echo ""
    echo "🛠️  方法1: 使用 npx vite build..."
    
    if command -v npx &> /dev/null; then
        echo "执行: npx vite build"
        if npx vite build; then
            echo -e "${GREEN}✅ npx vite build 成功${NC}"
            return 0
        else
            echo -e "${RED}❌ npx vite build 失败${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  npx 不可用，跳过此方法${NC}"
        return 1
    fi
}

# 方法2: 使用npm脚本构建
build_with_npm() {
    echo ""
    echo "🛠️  方法2: 使用 npm run build..."
    
    echo "执行: npm run build"
    if npm run build; then
        echo -e "${GREEN}✅ npm run build 成功${NC}"
        return 0
    else
        echo -e "${RED}❌ npm run build 失败${NC}"
        return 1
    fi
}

# 方法3: 直接调用vite（需要正确PATH）
build_with_vite() {
    echo ""
    echo "🛠️  方法3: 直接调用 vite build..."
    
    # 设置PATH包含node_modules/.bin
    OLD_PATH="$PATH"
    export PATH="$(pwd)/node_modules/.bin:$PATH"
    
    echo "更新PATH包含: $(pwd)/node_modules/.bin"
    
    if command -v vite &> /dev/null; then
        echo "vite路径: $(which vite)"
        echo "执行: vite build"
        if vite build; then
            echo -e "${GREEN}✅ vite build 成功${NC}"
            export PATH="$OLD_PATH"
            return 0
        else
            echo -e "${RED}❌ vite build 失败${NC}"
            export PATH="$OLD_PATH"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  vite 命令仍然找不到${NC}"
        export PATH="$OLD_PATH"
        return 1
    fi
}

# 方法4: 直接运行vite.js
build_with_node() {
    echo ""
    echo "🛠️  方法4: 使用 node 直接运行 vite.js..."
    
    if [ -f "node_modules/vite/bin/vite.js" ]; then
        echo "执行: node node_modules/vite/bin/vite.js build"
        if node node_modules/vite/bin/vite.js build; then
            echo -e "${GREEN}✅ node运行vite成功${NC}"
            return 0
        else
            echo -e "${RED}❌ node运行vite失败${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  vite.js 文件未找到${NC}"
        return 1
    fi
}

# 主构建函数
main_build() {
    echo ""
    echo "🚀 开始构建..."
    
    # 尝试方法1: npx
    if build_with_npx; then
        return 0
    fi
    
    # 尝试方法2: npm
    if build_with_npm; then
        return 0
    fi
    
    # 尝试方法3: 直接vite
    if build_with_vite; then
        return 0
    fi
    
    # 尝试方法4: node运行vite.js
    if build_with_node; then
        return 0
    fi
    
    # 所有方法都失败
    echo -e "${RED}❌ 所有构建方法都失败了${NC}"
    echo ""
    echo "故障排除建议:"
    echo "1. 检查 node_modules 目录是否存在"
    echo "2. 运行 'npm install' 安装依赖"
    echo "3. 检查 package.json 中的 scripts.build 配置"
    echo "4. 检查是否有权限问题"
    echo "5. 查看详细错误日志"
    
    return 1
}

# 显示构建结果
show_build_result() {
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 构建成功完成！"
        echo ""
        echo "构建文件位于: dist/"
        echo "主要文件:"
        echo "  - dist/index.html"
        echo "  - dist/assets/index-*.js"
        echo "  - dist/assets/index-*.css"
        echo ""
        echo "下一步:"
        echo "  1. 部署到 GitHub Pages: npx gh-pages -d dist"
        echo "  2. 本地预览: npx vite preview"
        echo "  3. 开发模式: npm run dev"
    else
        echo ""
        echo "💥 构建失败，请检查以上错误信息"
        exit 1
    fi
}

# 主函数
main() {
    echo "========================================="
    echo "    通用构建包装脚本 - 解决vite问题      "
    echo "========================================="
    echo ""
    
    check_environment
    check_dependencies
    main_build
    show_build_result
}

# 运行主函数
main "$@"