/**
 * GET 전수 호출 — 화면이 부르는 모든 조회가 실제로 응답하는지
 *
 * 경로 변수가 있는 것은 실제 id 를 넣어 부르고, id 를 구할 수 없으면 건너뜁니다.
 * 여기서 5xx 나 400 이 나오면 그 화면은 반드시 비어 보입니다.
 */
const { suite, test, beforeAll, eq, ok } = require('../lib/runner');
const api = require('../lib/api');
const meta = require('../lib/appmeta');
const { fixtures, sampleId } = require('../lib/fixtures');

suite('GET 전수 호출', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.f = await fixtures();
    ctx.used = new Set(Object.values(meta.repositoryCalls()).flat());
    ctx.gets = meta.endpoints().filter((e) => e.method === 'GET' && ctx.used.has(e.key));

    // 서버가 요구하는 파라미터를 그대로 읽어 옵니다 (카탈로그 문구보다 정확합니다)
    const spec = await api.openApi();
    ctx.required = {};
    for (const [p, ops] of Object.entries(spec.paths)) {
      if (!ops.get) continue;
      ctx.required[p.replace(/\{\w+\}/g, '{}')] = (ops.get.parameters || [])
        .filter((x) => x.required && x.in === 'query')
        .map((x) => x.name);
    }
  });

  /** 엔드포인트가 요구하는 파라미터를 fixtures 에서 채웁니다 */
  async function paramsFor(e) {
    const f = ctx.f;
    const p = {};
    // 카탈로그에 적힌 값 + 서버가 필수로 요구하는 값을 함께 채웁니다
    const fromCatalog = (e.params || '').split(',').map((x) => x.trim().split('(')[0].trim()).filter(Boolean);
    const fromServer = ctx.required[e.path.replace(/\{\w+\}/g, '{}')] || [];
    const declared = [...new Set([...fromCatalog, ...fromServer])];
    const fill = {
      date: f.baseDate, from: f.monthFrom, to: f.monthTo,
      fromDate: f.monthFrom, toDate: f.monthTo,
      plantCd: f.plantCd, processId: f.processId, productCodes: f.productCodes,
      yearMonth: f.yearMonth, planYear: f.year, baseYear: f.year,
      unit: 'day', interval: '2h', size: 5, page: 1, hours: 24, sort: 'rank',
      purpose: 'SIGNUP', empNo: '10000', eqptCd: f.eqptCd, lineCd: f.eqptCd,
      itemCd: undefined, keyword: undefined, state: undefined,
    };
    declared.forEach((k) => {
      if (fill[k] !== undefined) p[k] = fill[k];
    });
    // 명세에 안 적혀 있어도 필요한 공통 값
    if (/\/dashboard\//.test(e.path) && !p.date) p.date = f.baseDate;
    return p;
  }

  /** 경로 변수를 실제 값으로 채웁니다. 못 채우면 null */
  async function resolvePath(e) {
    const vars = [...e.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    let out = e.path.replace('/api/v1', '');
    for (const v of vars) {
      const val = await sampleId(v);
      if (val === null || val === undefined) return null;
      out = out.replace(`{${v}}`, encodeURIComponent(val));
    }
    return out;
  }

  test('모든 GET 이 5xx 없이 응답한다', async () => {
    const bad = [];
    ctx.skipped = [];
    for (const e of ctx.gets) {
      const path = await resolvePath(e);
      if (!path) { ctx.skipped.push(e.key); continue; }
      const { status, body } = await api.get(path, await paramsFor(e));
      if (status >= 500) bad.push(`${e.key} → HTTP ${status} ${body?.message || ''}`);
    }
    eq(bad, [], '서버 오류가 있으면 화면이 비어 보입니다');
  });

  test('필수 조회에 400(파라미터 오류)이 없다', async () => {
    const bad = [];
    for (const e of ctx.gets) {
      const path = await resolvePath(e);
      if (!path) continue;
      const { status, body } = await api.get(path, await paramsFor(e));
      if (status === 400) bad.push(`${e.key} → ${body?.message || '400'}`);
    }
    eq(bad, [], '보내는 파라미터 이름·형식이 서버와 다릅니다');
  });

  test('응답이 표준 형식({success, code, message, data})이다', async () => {
    const bad = [];
    for (const e of ctx.gets.slice(0, 60)) {
      const path = await resolvePath(e);
      if (!path) continue;
      const { body } = await api.get(path, await paramsFor(e));
      if (typeof body?.success !== 'boolean' || !('code' in body)) bad.push(e.key);
    }
    eq(bad, [], '표준 응답 껍데기가 아니면 unwrap() 이 처리하지 못합니다');
  });

  test('경로 변수 때문에 건너뛴 조회가 과하지 않다', () => {
    ok((ctx.skipped || []).length <= 40,
      `건너뛴 조회가 ${ctx.skipped.length}건입니다 — fixtures.sampleId 에 값을 추가하세요\n      ${(ctx.skipped || []).slice(0, 10).join(', ')}`);
  });
});
