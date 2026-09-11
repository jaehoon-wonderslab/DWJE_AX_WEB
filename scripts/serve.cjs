/**
 * 덕우전자 AX 시스템 — Web 정적 서빙 및 연결 관리 서버
 * 
 * 외부 의존성(npm) 없이 Node.js 표준 라이브러리(http, fs, path, url)만으로 동작합니다.
 * Expo Web 빌드 산출물(dist/)을 서빙하며, Graceful Shutdown(SIGTERM/SIGINT) 시
 * 연결된 HTTP keep-alive 소켓을 안전하게 정리합니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 설정값 파싱
const args = process.argv.slice(2);
let port = parseInt(process.env.PORT || '8081', 10);
let distDir = path.resolve(__dirname, '..', 'dist');

for (const arg of args) {
  if (arg.startsWith('--port=')) {
    port = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--dir=')) {
    distDir = path.resolve(arg.split('=')[1]);
  }
}

// 배포 경로 자동 탐색 (루트 실행 또는 dist 폴더 단독 실행 모두 지원)
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  if (fs.existsSync(path.resolve(__dirname, '..', 'index.html'))) {
    distDir = path.resolve(__dirname, '..');
  } else if (fs.existsSync(path.resolve(__dirname, 'index.html'))) {
    distDir = path.resolve(__dirname);
  } else if (fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))) {
    distDir = path.resolve(__dirname, 'dist');
  }
}

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`[오류] 정적 배포 산출물(index.html)을 찾을 수 없습니다. (${distDir}) 'npm run build:web' 을 먼저 실행하십시오.`);
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

// 활성 소켓 추적 (Graceful Shutdown 용)
const activeSockets = new Set();

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Method Not Allowed');
    return;
  }

  // 헬스체크 엔드포인트
  const parsedUrl = url.parse(req.url);
  const pathname = decodeURIComponent(parsedUrl.pathname || '/');

  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ status: 'UP', service: 'dwje-ax-web', port }));
    return;
  }

  // 요청 경로를 dist 내 파일 경로로 매핑
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(distDir, safePath);

  // 1. 디렉토리 요청 -> index.html 확인
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const candidate = path.join(filePath, 'index.html');
    if (fs.existsSync(candidate)) {
      filePath = candidate;
    }
  }

  // 2. 파일이 없는 경우 확장자 .html 시도 (Expo Static Routing 처리: /login -> /login.html)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }
  }

  // 3. 여전히 파일이 없는 경우 SPA fallback (index.html)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // 정적 리소스 캐싱 정책 (HTML은 no-cache, 해시된 static 번들은 max-age=1년)
  const headers = { 'Content-Type': contentType };
  if (ext === '.html') {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  } else if (pathname.includes('/static/') || pathname.includes('_expo/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['Cache-Control'] = 'public, max-age=3600';
  }

  try {
    const stat = fs.statSync(filePath);
    headers['Content-Length'] = stat.size;

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('500 Internal Server Error');
  }
});

// 클라이언트 소켓 수명주기 추적
server.on('connection', (socket) => {
  activeSockets.add(socket);
  socket.on('close', () => {
    activeSockets.delete(socket);
  });
});

let isShuttingDown = false;
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Web Server] ${signal} 수신: 신규 요청 차단 및 Graceful Shutdown 시작...`);

  // 1. 신규 연결 차단 및 진행 중인 요청 완료 대기
  server.close(() => {
    console.log('[Web Server] 모든 클라이언트 요청 완료 및 서버 소켓 정상 종료.');
    process.exit(0);
  });

  // 2. 유휴 keep-alive 소켓 정리 (최대 3초 후 안전하게 소켓 닫기)
  setTimeout(() => {
    if (activeSockets.size > 0) {
      console.log(`[Web Server] 유휴 커넥션 ${activeSockets.size}건을 안전하게 해제합니다.`);
      for (const socket of activeSockets) {
        socket.end();
      }
    }
  }, 3000);

  // 3. 최후 타임아웃 10초 후 강제 종료
  setTimeout(() => {
    console.error('[Web Server] Graceful 종료 제한 시간 초과. 강제 종료합니다.');
    for (const socket of activeSockets) {
      socket.destroy();
    }
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(port, '0.0.0.0', () => {
  console.log(`[Web Server] 덕우전자 AX Web 서비스 시작 완료`);
  console.log(`  · 서비스 URL : http://localhost:${port}`);
  console.log(`  · 서빙 디렉토리 : ${distDir}`);
  console.log(`  · 헬스체크 : http://localhost:${port}/health`);
});
