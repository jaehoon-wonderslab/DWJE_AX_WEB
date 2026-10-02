'use strict';

// 로컬 전용 LLM 프록시 — 브라우저 번들 밖(Node 프로세스)에서만 GPU 서버 vLLM 에 붙습니다.
//
// ★ UPSTREAM 의 기본값은 scripts/targets.cjs 의 사내 실서버 vLLM(채팅 포트 SERVER_LLM_PORT)입니다.
//   VPN 이 활성화되어 있어야 연결됩니다. 켜지지 않으면 프록시 UI 에서 연결 실패로 보입니다.
//   다른 주소를 쓸 때만 DWJE_GATEWAY_BASE_URL 로 바꿉니다.
// ★ 2026-10-02 게이트웨이(:11436)에서 vLLM 으로 옮겼습니다.
//   - vLLM 은 인증 키를 받지 않습니다. DWJE_GATEWAY_API_KEY 가 있으면 그대로 붙이고, 없어도 보냅니다.
//   - vLLM LoRA(dwje-ax)는 예전 Ollama 모델과 달리 내장 지시문이 없습니다.
//     요청에 system 이 없으면 학습 데이터의 문서 어시스턴트 지시문을 맨 앞에 넣습니다.
//     API 의 app.llm.system-prompt 와 같은 원문이어야 합니다.
const http = require('node:http');
const { Readable } = require('node:stream');
const { SERVER_HOST, SERVER_LLM_PORT } = require('./targets.cjs');

const HOST = '127.0.0.1';
const PORT = Number(process.env.LOCAL_GATEWAY_PROXY_PORT || 8787);
const UPSTREAM = (process.env.DWJE_GATEWAY_BASE_URL || `http://${SERVER_HOST}:${SERVER_LLM_PORT}`).replace(/\/$/, '');
const API_KEY = process.env.DWJE_GATEWAY_API_KEY || '';

/** 학습 데이터(sllm_fine_tuning v2 train.jsonl) 문서 어시스턴트 system 원문 — 한 글자도 바꾸지 않습니다 */
const DEFAULT_SYSTEM_PROMPT = [
  '당신은 덕우전자(정밀 프레스·도금 부품 제조)의 품질·생산 문서를 다루는 AI 어시스턴트다. 한국어로 답한다.',
  "- 주어진 [근거]에 있는 내용만 쓴다. 근거에 없으면 '사내 문서에서 확인할 수 없습니다'라고 답한다.",
  '- 사실·수치를 인용한 문장 끝에 [1], [2] 처럼 근거 번호를 붙인다.',
  '- 원문을 인용할 때는 한 글자도 바꾸지 않는다.',
  '- 단가·금액·사번·개인정보는 언급하지 않는다.',
  '- 결론부터 쓴다. 추측하지 않는다.',
].join('\n');
const SYSTEM_PROMPT = process.env.DWJE_LLM_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;

const ALLOWED_ORIGINS = new Set([
  'http://localhost:8081', 'http://127.0.0.1:8081',
  'http://localhost:8787', 'http://127.0.0.1:8787',
]);

const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DWJE LLM 로컬 연결 확인</title><style>
body{font:16px system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 18px;color:#172033}h1{font-size:24px}button{padding:10px 16px;margin:8px 8px 8px 0;cursor:pointer}textarea{box-sizing:border-box;width:100%;min-height:90px;padding:12px}pre{white-space:pre-wrap;background:#f3f5f8;padding:14px;border-radius:8px;min-height:70px}.status{padding:10px;background:#f3f5f8;border-radius:8px}
</style><h1>DWJE LLM 연결 확인</h1><p>GPU 서버 vLLM(VPN 필요)에 로컬 프록시가 대신 붙습니다. 브라우저에는 서버 주소·인증키를 두지 않습니다.</p>
<p><button id="health">헬스 확인</button><button id="models">모델 목록</button></p><div id="status" class="status">대기 중</div>
<h2>채팅</h2><textarea id="prompt">안녕하세요</textarea><p><button id="chat">dwje-ax에 보내기</button></p><pre id="answer"></pre>
<script>
const statusEl=document.querySelector('#status'), answerEl=document.querySelector('#answer');
async function get(path){statusEl.textContent=path+' 요청 중…';try{const r=await fetch(path);const t=await r.text();statusEl.textContent=path+' → HTTP '+r.status+(t?' · '+t.slice(0,700):'');}catch{statusEl.textContent=path+' 연결 실패';}}
document.querySelector('#health').onclick=()=>get('/health');document.querySelector('#models').onclick=()=>get('/v1/models');
document.querySelector('#chat').onclick=async()=>{answerEl.textContent='요청 중…';try{const r=await fetch('/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'dwje-ax',messages:[{role:'user',content:document.querySelector('#prompt').value}],stream:false,dwje:{rag:false,tools:false}})});const t=await r.text();if(!r.ok){answerEl.textContent='HTTP '+r.status+' · '+t;return;}const j=JSON.parse(t);answerEl.textContent=j.choices?.[0]?.message?.content||t;}catch{answerEl.textContent='요청 실패';}};
</script></html>`;

/** system 이 없는 채팅 요청에 문서 어시스턴트 지시문을 넣습니다. JSON 이 아니면 그대로 보냅니다(서버가 400 을 냅니다) */
function withSystemPrompt(raw) {
  if (!SYSTEM_PROMPT) return raw;
  let request;
  try { request = JSON.parse(raw.toString('utf8')); } catch { return raw; }
  const messages = Array.isArray(request.messages) ? request.messages : [];
  if (messages.some((m) => m?.role === 'system')) return raw;
  const prompt = request.model === 'google/gemma-4-26B-A4B-it'
    ? '당신은 친절한 한국어 대화 도우미다. 인사와 일반 지식 질문에 자연스럽고 간결하게 답한다. 사내 규정·실적·품질 데이터는 근거 없이 추측하지 않는다.'
    : SYSTEM_PROMPT;
  request.messages = [{ role: 'system', content: prompt }, ...messages];
  return Buffer.from(JSON.stringify(request));
}

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
  try {
    const headers = { Accept: req.headers.accept || 'application/json' };
    let body;
    if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
    if (chatPath) {
      headers['Content-Type'] = 'application/json';
      body = withSystemPrompt(await readBody(req));
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

server.listen(PORT, HOST, () => {
  process.stdout.write(`Local LLM proxy listening at http://${HOST}:${PORT} → vLLM ${UPSTREAM.replace(/\/\/[^/:]+/, '//<사내 실서버>')}\n`);
  process.send?.({ ready: true });
});
