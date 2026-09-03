/**
 * API 호출 헬퍼
 *
 * 테스트는 화면과 같은 서버를 그대로 씁니다. 목(mock)을 쓰지 않습니다 —
 * "API 결과와 화면 내용이 맞는가" 를 확인하는 것이 목적이기 때문입니다.
 */
const BASE = process.env.API_URL || 'http://localhost:8080';
const PASSWORD = process.env.TEST_PASSWORD || 'Dwje!2026';

/** 시드 계정 — 부서별 권한 차이를 확인하는 데 씁니다 */
const ACCOUNTS = {
  admin: { empNo: '10000', name: '관리자', dept: '통합관리자' },
  qa: { empNo: '10001', name: '김품질', dept: '품질보증팀' },
  prod: { empNo: '10002', name: '박생산', dept: '생산관리팀' },
  mfg: { empNo: '10003', name: '이제조', dept: '제조팀' },
  it: { empNo: '10004', name: '최전산', dept: '전산팀' },
  exec: { empNo: '10005', name: '정경영', dept: '경영진' },
};

const tokenCache = new Map();

/** 로그인해서 토큰을 얻습니다 (계정별로 한 번만) */
async function login(who = 'admin') {
  const acc = ACCOUNTS[who] || { empNo: who };
  if (tokenCache.has(acc.empNo)) return tokenCache.get(acc.empNo);

  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: acc.empNo, password: PASSWORD }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`로그인 실패 [${acc.empNo}] ${body.message}`);

  const session = { ...body.data, empNo: acc.empNo };
  tokenCache.set(acc.empNo, session);
  return session;
}

/**
 * 인증이 필요한 GET 호출.
 * @param {string} path `/api/v1` 뒤의 경로 (예: '/quality/defects/summary')
 * @param {object} [params] 쿼리 파라미터 (배열은 같은 키를 반복합니다)
 * @param {string} [who] 계정 키
 * @returns {Promise<{status:number, body:object}>}
 */
async function get(path, params = {}, who = 'admin') {
  const { accessToken } = await login(who);
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else qs.append(k, v);
  });
  const url = `${BASE}/api/v1${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, url };
}

/** 성공 응답의 data 만 꺼냅니다. 실패하면 예외를 던집니다 */
async function data(path, params, who) {
  const { status, body, url } = await get(path, params, who);
  if (!body?.success) throw new Error(`${path} 실패 (HTTP ${status}) ${body?.message || ''}\n      ${url}`);
  return body.data;
}

/**
 * 인증이 필요한 쓰기 호출 (POST · PUT · PATCH · DELETE).
 *
 * 조회와 달리 실패를 예외로 바꾸지 않습니다 — 400·403·404 를 확인하는 것이
 * 쓰기 테스트의 목적이기 때문입니다.
 *
 * @param {string} method
 * @param {string} path `/api/v1` 뒤의 경로
 * @param {object|null} [body] 요청 본문 (null 이면 본문 없이 보냅니다)
 * @param {string|null} [who] 계정 키. null 이면 토큰 없이 보냅니다 (401 확인용)
 */
async function send(method, path, body = null, who = 'admin') {
  const headers = { 'Content-Type': 'application/json' };
  if (who) headers.Authorization = `Bearer ${(await login(who)).accessToken}`;
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  return { status: res.status, body: out, ok: !!out?.success };
}

/**
 * 테스트가 만든 것을 지웁니다.
 *
 * `send()` 는 4xx 에 예외를 던지지 않으므로 `.catch()` 로는 실패가 잡히지 않습니다.
 * 그래서 정리 실패가 통째로 묻혔고, 인증 테스트가 만든 계정이 18건까지 쌓인 적이 있습니다.
 * 못 지운 것은 화면에 남겨 다음 실행 전에 사람이 알 수 있게 합니다.
 *
 * @param {Array<[string, string]>} items [method, path] 목록 (역순으로 지웁니다)
 * @param {string} label 무엇을 정리하는지 (출력용)
 */
async function cleanup(items, label = '테스트 데이터') {
  const failed = [];
  for (const [method, path] of [...items].reverse()) {
    try {
      const r = await send(method, path);
      if (r.status >= 400 && r.status !== 404) failed.push(`${path} → HTTP ${r.status} ${r.body?.message || ''}`);
    } catch (e) {
      failed.push(`${path} → ${e.message}`);
    }
  }
  if (failed.length) {
    console.log(`  \x1b[33m정리 실패 — ${label} 이 로컬에 남았습니다\x1b[0m`);
    failed.forEach((f) => console.log(`    \x1b[90m${f}\x1b[0m`));
  }
  return failed;
}

/** 서버가 살아 있는지 확인합니다 */
async function ping() {
  const res = await fetch(`${BASE}/api/v1/common/data-range?plantCd=PL01`, {
    headers: { Authorization: `Bearer ${(await login()).accessToken}` },
  });
  if (!res.ok) throw new Error(`API 서버 응답 없음 (HTTP ${res.status})`);
  return true;
}

/** OpenAPI 문서 (서버가 실제로 구현한 경로 목록) */
async function openApi() {
  const res = await fetch(`${BASE}/v3/api-docs`);
  if (!res.ok) throw new Error(`OpenAPI 문서를 읽지 못했습니다 (HTTP ${res.status})`);
  return res.json();
}

module.exports = {
  send, cleanup, BASE, PASSWORD, ACCOUNTS, login, get, data, ping, openApi };
