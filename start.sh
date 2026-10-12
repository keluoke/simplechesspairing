#!/usr/bin/env bash
# 启动棋弈排阵 Web 应用
cd "$(dirname "$0")"

echo "正在启动 棋弈排阵 Web 软件..."

if command -v python3 &>/dev/null; then
    python3 server.py
elif command -v open &>/dev/null; then
    open index.html
else
    echo "请直接在浏览器中打开 index.html 文件。"
fi
