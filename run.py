"""Chạy AI Usage Guardian trên máy (dùng trong PyCharm: chuột phải run.py → Run).

Chỉ dùng thư viện chuẩn của Python, không cần cài thêm gì.
Mở trình duyệt tại http://localhost:8000. Dừng bằng nút Stop trong PyCharm (hoặc Ctrl+C).
"""
import http.server
import os
import socketserver
import threading
import webbrowser

PORT = int(os.environ.get("PORT", "8000"))
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Luôn tải bản mới nhất khi đang chỉnh sửa code
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


Handler.extensions_map.update({".woff2": "font/woff2", ".js": "text/javascript"})


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/"
        print(f"AI Usage Guardian đang chạy tại {url}")
        print("Bấm Stop (hoặc Ctrl+C) để dừng.")
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng.")


if __name__ == "__main__":
    main()
