#!/bin/bash

# GitHub Pages 部署脚本
# 自动构建项目并部署到GitHub Pages

set -e  # 遇到错误时退出

echo "🚀 开始部署到 GitHub Pages..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo "🔍 检查依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安装${NC}"
        exit 1
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 构建项目
build_project() {
    echo "🔨 构建项目..."
    
    # 安装依赖
    echo "📦 安装依赖..."
    npm install
    
    # 构建
    echo "🏗️  构建生产版本..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 构建成功${NC}"
        echo "📁 构建文件位于: dist/"
    else
        echo -e "${RED}❌ 构建失败${NC}"
        exit 1
    fi
}

# 部署到GitHub Pages
deploy_to_github_pages() {
    echo "🌐 部署到 GitHub Pages..."
    
    # 检查是否在Git仓库中
    if [ ! -d ".git" ]; then
        echo -e "${RED}❌ 当前目录不是Git仓库${NC}"
        exit 1
    fi
    
    # 创建gh-pages分支或切换到现有分支
    echo "🌿 准备gh-pages分支..."
    
    # 保存当前分支
    CURRENT_BRANCH=$(git branch --show-current)
    
    # 尝试切换到gh-pages分支，如果不存在则创建
    if git show-ref --quiet refs/heads/gh-pages; then
        echo "📂 切换到现有gh-pages分支"
        git checkout gh-pages
    else
        echo "🌱 创建新的gh-pages分支"
        git checkout --orphan gh-pages
        git reset --hard
    fi
    
    # 清理分支内容（除了.git目录）
    echo "🧹 清理分支内容..."
    find . -maxdepth 1 ! -name '.' ! -name '.git' ! -name 'dist' ! -name 'node_modules' -exec rm -rf {} + 2>/dev/null || true
    
    # 复制构建文件到根目录
    echo "📋 复制构建文件..."
    if [ -d "dist" ]; then
        cp -r dist/* . 2>/dev/null || true
        # 确保有index.html文件
        if [ ! -f "index.html" ]; then
            echo -e "${RED}❌ 构建文件不包含index.html${NC}"
            git checkout $CURRENT_BRANCH
            exit 1
        fi
    else
        echo -e "${RED}❌ dist目录不存在${NC}"
        git checkout $CURRENT_BRANCH
        exit 1
    fi
    
    # 添加所有文件
    echo "💾 添加文件到Git..."
    git add .
    
    # 提交更改
    echo "📝 提交更改..."
    git commit -m "部署到GitHub Pages: $(date '+%Y-%m-%d %H:%M:%S')" || true
    
    # 推送到GitHub
    echo "📤 推送到GitHub..."
    git push origin gh-pages --force
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ GitHub Pages 部署成功${NC}"
    else
        echo -e "${RED}❌ GitHub Pages 部署失败${NC}"
        git checkout $CURRENT_BRANCH
        exit 1
    fi
    
    # 切换回原分支
    echo "↩️  切换回原分支..."
    git checkout $CURRENT_BRANCH
    
    echo -e "${GREEN}✅ 部署流程完成！${NC}"
}

# 显示GitHub Pages URL
show_github_pages_url() {
    echo ""
    echo "🌐 GitHub Pages 访问地址:"
    echo "   https://CarsonLyu87.github.io/fund-stock-show/"
    echo ""
    echo "📋 需要在GitHub仓库设置中启用GitHub Pages:"
    echo "   1. 访问 https://github.com/CarsonLyu87/fund-stock-show/settings/pages"
    echo "   2. 选择 'gh-pages' 分支作为源"
    echo "   3. 选择 '/ (root)' 文件夹"
    echo "   4. 点击 'Save'"
    echo ""
    echo "⏱️  部署后可能需要几分钟才能访问"
}

# 主函数
main() {
    echo "========================================="
    echo "    Fund Stock Show - GitHub Pages 部署   "
    echo "========================================="
    echo ""
    
    check_dependencies
    build_project
    deploy_to_github_pages
    show_github_pages_url
    
    echo ""
    echo "🎉 部署完成！"
    echo ""
    echo "项目信息:"
    echo "  - 仓库: https://github.com/CarsonLyu87/fund-stock-show"
    echo "  - 分支: main (源代码), gh-pages (部署)"
    echo "  - 访问: https://CarsonLyu87.github.io/fund-stock-show/"
    echo ""
    echo "下一步:"
    echo "  1. 在GitHub仓库设置中启用GitHub Pages"
    echo "  2. 等待几分钟让部署生效"
    echo "  3. 访问上面的URL测试功能"
    echo ""
}

# 运行主函数
main "$@"