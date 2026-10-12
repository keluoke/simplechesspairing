#!/usr/bin/env python3
"""
极简本地 Web 服务器 (用于运行国际象棋编排系统)
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    port = PORT
    for _ in range(10):
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                url = f"http://localhost:{port}/index.html"
                print(f"==================================================")
                print(f"♟️ 国际象棋俱乐部瑞士制编排系统已启动！")
                print(f"🌐 访问地址: {url}")
                print(f"💡 按 Ctrl+C 可停止服务器")
                print(f"==================================================")
                try:
                    webbrowser.open(url)
                except Exception:
                    pass
                httpd.serve_forever()
        except OSError:
            port += 1
            continue

if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n服务器已停止。")
        sys.exit(0)
