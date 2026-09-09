"""정적 파일만 제공: python3 proto/serve.py (API/DB 없음)."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

os.chdir(Path(__file__).resolve().parent)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path.startswith('/api/'):
            self.send_error(404)
            return
        if path != '/' and not Path('.' + path).exists():
            if Path('.' + path + '.html').is_file():
                self.path = path + '.html'
            else:
                self.path = '/index.html'
        super().do_GET()

print('프로토타입: http://localhost:8765 · 관리자 admin / Demo!2026', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
