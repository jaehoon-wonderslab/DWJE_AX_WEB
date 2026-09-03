/**
 * 엔드포인트 계약 — 카탈로그와 서버 구현이 어긋나지 않는지
 *
 * 여기서 잡으려는 것
 *  · 카탈로그에 있는데 서버에 없는 경로 (화면이 404 를 맞습니다)
 *  · 서버에 있는데 카탈로그에 없는 경로 (웹이 못 쓰고 있는 기능)
 *  · 웹이 보내는 파라미터 이름이 서버와 다른 것 (400 의 주된 원인)
 *  · 메서드가 합쳐진 정의 (`GET/PUT` 같은 값은 실제 호출에서 깨집니다)
 */
const { suite, test, beforeAll, ok, eq } = require('../lib/runner');
const api = require('../lib/api');
const meta = require('../lib/appmeta');

const norm = (p) => p.replace(/\{\w+\}/g, '{}');

suite('엔드포인트 계약', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.spec = await api.openApi();
    ctx.catalog = meta.endpoints();
    ctx.server = new Set();
    ctx.serverParams = {};
    for (const [p, ops] of Object.entries(ctx.spec.paths)) {
      for (const [m, o] of Object.entries(ops)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(m)) continue;
        ctx.server.add(`${m.toUpperCase()} ${norm(p)}`);
        if (m === 'get') {
          ctx.serverParams[norm(p)] = {
            names: new Set((o.parameters || []).map((x) => x.name)),
            required: (o.parameters || []).filter((x) => x.required).map((x) => x.name),
          };
        }
      }
    }
  });

  test('메서드가 하나로 정해져 있다 (GET/PUT 같은 합성 값 없음)', () => {
    const bad = ctx.catalog.filter((e) => /\//.test(e.method || ''));
    eq(bad.map((e) => `${e.key}=${e.method}`), [], '합성 메서드는 request() 에서 그대로 소문자 HTTP 메서드가 되어 호출이 깨집니다');
  });

  test('카탈로그의 모든 경로가 서버에 구현되어 있다', () => {
    const missing = ctx.catalog
      .filter((e) => !ctx.server.has(`${e.method} ${norm(e.path)}`))
      .map((e) => `${e.method} ${e.path} (${e.key})`);
    eq(missing, [], '화면이 부르면 404 가 됩니다');
  });

  test('서버 구현 중 카탈로그에 빠진 것이 없다', () => {
    const mine = new Set(ctx.catalog.map((e) => `${e.method} ${norm(e.path)}`));
    const extra = [...ctx.server].filter((x) => !mine.has(x) && !x.includes('/health'));
    eq(extra, [], '웹이 쓰지 못하고 있는 서버 기능입니다 — 카탈로그에 추가하세요');
  });

  test('GET 파라미터 이름이 서버와 일치한다', async () => {
    const calls = meta.repositoryCalls();
    const byKey = Object.fromEntries(ctx.catalog.map((e) => [e.key, e]));
    const problems = [];
    // 리포지토리가 쓰는 키만 검사합니다 (카탈로그에만 있고 안 쓰는 것은 제외)
    for (const key of new Set(Object.values(calls).flat())) {
      const e = byKey[key];
      if (!e || e.method !== 'GET') continue;
      const sp = ctx.serverParams[norm(e.path)];
      if (!sp) continue;
      // 요청 바디 모양을 적어 둔 항목은 쿼리 파라미터가 아닙니다
      if (/[{}]/.test(e.params || '')) continue;
      const declared = (e.params || '').split(',').map((x) => x.trim()).filter(Boolean);
      for (const p of declared) {
        // 'productCodes[]' 처럼 배열임을 나타낸 표기는 이름만 씁니다
        const name = p.split('(')[0].trim().replace(/\[\]$/, '');
        if (!name || name === '동일' || /^\d/.test(name)) continue;
        if (!sp.names.has(name) && !norm(e.path).includes('{}')) {
          problems.push(`${key}: '${name}' 은 서버가 받지 않습니다 (받는 값: ${[...sp.names].join(', ')})`);
        }
      }
    }
    eq(problems, [], '파라미터 이름이 다르면 400 이거나 조건이 무시됩니다');
  });

  test('인증 API 는 live 로 표시되어 있다', () => {
    const authNotLive = ctx.catalog.filter((e) => e.path.startsWith('/api/v1/auth/') && !e.live).map((e) => e.key);
    eq(authNotLive, [], '목 모드에서도 실 서버로 나가야 합니다');
  });
});
