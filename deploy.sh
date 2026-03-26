#!/bin/bash

# Fund Stock Show 部署脚本
# 使用方法: ./deploy.sh [平台]

set -e  # 遇到错误时退出

echo "🚀 开始部署 Fund Stock Show..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 平台选择
PLATFORM=${1:-"vercel"}

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
        ls -la dist/
    else
        echo -e "${RED}❌ 构建失败${NC}"
        exit 1
    fi
}

# 部署到Vercel
deploy_vercel() {
    echo "☁️  部署到 Vercel..."
    
    # 检查Vercel CLI
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}⚠️  Vercel CLI 未安装，正在安装...${NC}"
        npm install -g vercel
    fi
    
    # 部署
    echo "🚀 开始部署..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Vercel 部署成功${NC}"
    else
        echo -e "${RED}❌ Vercel 部署失败${NC}"
        exit 1
    fi
}

# 部署到Netlify
deploy_netlify() {
    echo "☁️  部署到 Netlify..."
    
    # 检查Netlify CLI
    if ! command -v netlify &> /dev/null; then
        echo -e "${YELLOW}⚠️  Netlify CLI 未安装，正在安装...${NC}"
        npm install -g netlify-cli
    fi
    
    # 部署
    echo "🚀 开始部署..."
    netlify deploy --prod
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Netlify 部署成功${NC}"
    else
        echo -e "${RED}❌ Netlify 部署失败${NC}"
        exit 1
    fi
}

# 推送到GitHub
deploy_github() {
    echo "🐙 推送到 GitHub..."
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git 未安装${NC}"
        exit 1
    fi
    
    # 检查是否有远程仓库
    if ! git remote -v | grep -q "origin"; then
        echo -e "${YELLOW}⚠️  未配置Git远程仓库${NC}"
        echo "请先添加远程仓库:"
        echo "  git remote add origin <仓库URL>"
        exit 1
    fi
    
    # 提交更改
    echo "💾 提交更改..."
    git add .
    git commit -m "部署更新 $(date '+%Y-%m-%d %H:%M:%S')" || true
    
    # 推送到GitHub
    echo "📤 推送到GitHub..."
    git push origin main || git push origin master
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ GitHub 推送成功${NC}"
    else
        echo -e "${RED}❌ GitHub 推送失败${NC}"
        exit 1
    fi
}

# 手动部署
deploy_manual() {
    echo "👨‍💻 手动部署选项"
    echo ""
    echo "项目已构建完成，文件位于: dist/"
    echo ""
    echo "可选部署方式:"
    echo "1. 上传 dist/ 目录到静态托管服务"
    echo "2. 使用SFTP上传到服务器"
    echo "3. 使用云存储服务（如AWS S3、阿里云OSS）"
    echo ""
    echo "部署命令示例:"
    echo "  # 使用scp上传到服务器"
    echo "  scp -r dist/* user@server:/var/www/html/"
    echo ""
    echo "  # 使用aws-cli上传到S3"
    echo "  aws s3 sync dist/ s3://your-bucket/ --delete"
    echo ""
    ls -la dist/
}

# 显示帮助
show_help() {
    echo "Fund Stock Show 部署脚本"
    echo ""
    echo "使用方法: $0 [平台]"
    echo ""
    echo "可用平台:"
    echo "  vercel    部署到 Vercel (默认)"
    echo "  netlify   部署到 Netlify"
    echo "  github    推送到 GitHub"
    echo "  manual    显示手动部署选项"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 vercel    # 部署到Vercel"
    echo "  $0 github    # 推送到GitHub"
    echo ""
}

# 主函数
main() {
    case $PLATFORM in
        "vercel")
            check_dependencies
            build_project
            deploy_vercel
            ;;
        "netlify")
            check_dependencies
            build_project
            deploy_netlify
            ;;
        "github")
            check_dependencies
            build_project
            deploy_github
            ;;
        "manual")
            check_dependencies
            build_project
            deploy_manual
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知平台: $PLATFORM${NC}"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 部署流程完成！${NC}"
    echo ""
    echo "项目信息:"
    echo "  - 名称: Fund Stock Show"
    echo "  - 版本: v0.2.0"
    echo "  - 功能: 实时基金股票数据展示"
    echo "  - 技术栈: React + TypeScript + Vite"
    echo ""
    echo "文档:"
    echo "  - README.md - 项目说明"
    echo "  - REAL_TIME_UPDATE.md - 实时数据功能"
    echo ""
}

# 运行主函数
main "$@"