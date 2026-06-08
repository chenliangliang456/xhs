#!/bin/bash
# 一键启动（自动清理旧进程）
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🔄 停止旧进程..."
for port in 3000 3001 3002 5173 5174 5175 5176 5177 5178; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done
sleep 1

echo "📦 构建前端..."
cd "$ROOT/frontend" && npm run build
sleep 1

echo "🚀 启动后端 (端口 3002，含前端页面)..."
cd "$ROOT/backend" && node src/app.js &
sleep 2

echo "🚀 启动前端开发服务 (端口 5173，热更新)..."
cd "$ROOT/frontend" && npm run dev &
sleep 2

echo ""
echo "=========================================="
echo "  ✅ 主入口: http://localhost:3002  （推荐，含最新 UI）"
echo "  ✅ 开发模式: http://localhost:5173"
echo "  👤 账号: admin / admin123"
echo "  📁 素材库支持：单张删除 / 批量删除 / 删除整套"
echo "=========================================="
echo "按 Ctrl+C 停止"

wait
