'use strict';

// 로컬 전용 LLM 게이트웨이 브리지 — gateway key 를 Node 프로세스 안에만 두고,
// Expo/브라우저 번들 밖에서만 원격 gateway 에 붙입니다.
//
// ★ UPSTREAM 의 기본값(192.168.2.8:11436)은 사내 실서버 경로입니다.
//   VPN 이 활성화되어 있어야 연결됩니다. 켜지지 않으면 프록시 UI 에서 연결 실패로 보입니다.
//   사내망 LLM 이 아닌 다른 주소를 쓸 때만 DWJE_GATEWAY_BASE_URL 로 바꿉니다.
const http = require('node:http');
const { Readable } = require('node:stream');

const HOST = '127.0.0.1';
const PORT = Number(process.env.LOCAL_GATEWAY_PROXY_PORT || 8787);
const UPSTREAM = (process.env.DWJE_GATEWAY_BASE_URL || 'http://192.168.2.8:11436').replace(/\/$/, '');
const ALLOWED_ORIGINS = new Set([
  'http://localhost:8081', 'http://127.0.0.1:8081',
  'http://localhost:8787', 'http://127.0.0.1:8787',
]);

const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DWJE LLM 로컬 연결 확인</title><style>
body{font:16px system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 18px;color:#172033}h1{font-size:24px}button{padding:10px 16px;margin:8px 8px 8px 0;cursor:pointer}textarea{box-sizing:border-box;width:100%;min-height:90px;padding:12px}pre{white-space:pre-wrap;background:#f3f5f8;padding:14px;border-radius:8px;min-height:70px}.status{padding:10px;background:#f3f5f8;border-radius:8px}
</style><h1>DWJE LLM 연결 확인</h1><p>브라우저에는 인증키를 입력하거나 저장하지 않습니다. 채팅은 로컬 프록시가 서버 전용 환경변수를 사용합니다.</p>
<p><button id="health">헬스 확인</button><button id="models">모델 목록</button></p><div id="status" class="status">대기 중</div>
<h2>채팅</h2><textarea id="prompt">안녕하세요</textarea><p><button id="chat">dwje-ax에 보내기</button></p><pre id="answer"></pre>
<script>
const statusEl=document.querySelector('#status'), answerEl=document.querySelector('#answer');
async function get(path){statusEl.textContent=path+' 요청 중…';try{const r=await fetch(path);const t=await r.text();statusEl.textContent=path+' → HTTP '+r.status+(t?' · '+t.slice(0,700):'');}catch{statusEl.textContent=path+' 연결 실패';}}
document.querySelector('#health').onclick=()=>get('/health');document.querySelector('#models').onclick=()=>get('/v1/models');
document.querySelector('#chat').onclick=async()=>{answerEl.textContent='요청 중…';try{const r=await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'dwje-ax',messages:[{role:'user',content:document.querySelector('#prompt').value}],stream:false,dwje:{rag:false,tools:false}})});const t=await r.text();if(!r.ok){answerEl.textContent='HTTP '+r.status+' · '+t;return;}const j=JSON.parse(t);answerEl.textContent=j.choices?.[0]?.message?.content||t;}catch{answerEl.textContent='요청 실패';}};
</script></html>`;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  }
}

async function readBody(req, limit = 1024 * 1024) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw Object.assign(new Error('too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html);
    return;
  }
  const healthPath = req.method === 'GET' && path === '/health';
  const modelsPath = req.method === 'GET' && path === '/v1/models';
  const chatPath = req.method === 'POST' && path === '/v1/chat/completions';
  if (!healthPath && !modelsPath && !chatPath) { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":{"code":"E_NOT_FOUND"}}'); return; }
  if (chatPath && !process.env.DWJE_GATEWAY_API_KEY) {
    res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":{"code":"E_GATEWAY_KEY_UNSET"}}');
    return;
  }
  try {
    const headers = { Accept: req.headers.accept || 'application/json' };
    let body;
    if (modelsPath && process.env.DWJE_GATEWAY_API_KEY) {
      headers.Authorization = `Bearer ${process.env.DWJE_GATEWAY_API_KEY}`;
    }
    if (chatPath) {
      headers['Content-Type'] = 'application/json';
      headers.Authorization = `Bearer ${process.env.DWJE_GATEWAY_API_KEY}`;
      body = await readBody(req);
    }
    const upstream = await fetch(`${UPSTREAM}${path}`, { method: req.method, headers, body, signal: AbortSignal.timeout(120000) });
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      ...(upstream.headers.get('cache-control') ? { 'Cache-Control': upstream.headers.get('cache-control') } : {}),
      'Cache-Control': 'no-store',
    });
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res); else res.end();
  } catch (error) {
    if (!res.headersSent) res.writeHead(error.status || 502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: error.status === 413 ? 'E_REQUEST_TOO_LARGE' : 'E_GATEWAY_UNAVAILABLE' } }));
  }
});

server.listen(PORT, HOST, () => process.stdout.write(`Local gateway proxy listening at http://${HOST}:${PORT}\n`));
