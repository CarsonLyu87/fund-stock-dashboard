#!/bin/bash

echo "🚀 开始部署到 GitHub Pages..."

# 构建项目
echo "📦 构建项目..."
npm run build

# 创建临时目录
echo "📁 准备部署文件..."
rm -rf /tmp/gh-pages-deploy
mkdir -p /tmp/gh-pages-deploy

# 复制构建文件
cp -r dist/* /tmp/gh-pages-deploy/

# 切换到gh-pages分支
echo "🌐 切换到gh-pages分支..."
git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages

# 清空分支内容
echo "🧹 清空分支内容..."
git rm -rf . 2>/dev/null || true

# 复制文件
echo "📁 复制构建文件..."
cp -r /tmp/gh-pages-deploy/* .

# 添加并提交
echo "💾 提交更改..."
git add -A
git commit -m "deploy: 基金实时估值系统部署 $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到远程
echo "🚀 推送到远程仓库..."
git push origin gh-pages --force

# 切换回main分支
echo "↩️ 切换回main分支..."
git checkout main

echo "🎉 部署完成！"
echo "🌐 访问地址: https://CarsonLyu87.github.io/fund-stock-dashboard/"