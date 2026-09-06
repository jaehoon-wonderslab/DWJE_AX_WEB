/**
 * 페이징 — 목록이 잘려 보이지 않는가
 *
 * 이전에는 서버 기본값(50건)만 받아 놓고 화면에 아무 표시가 없었습니다.
 * 1,331건 중 50건이 보이는데 사용자는 그게 전부인 줄 알았습니다.
 *
 * 확인하는 것
 *  · 서버가 page·size 를 실제로 반영하는가
 *  · 쪽마다 다른 내용이 오는가 (같은 내용이면 파라미터가 무시된 것입니다)
 *  · meta 의 total·totalPages 가 앞뒤가 맞는가
 *  · 화면에 전체 건수와 현재 범위가 보이는가
 */
const { suite, test, beforeAll, afterAll, eq, ok, skip } = require('../lib/runner');
const api = require('../lib/api');
const { fixtures } = require('../lib/fixtures');
const { open, visit } = require('../lib/browser');

/**
 * 페이징을 확인할 목록 — [이름, 경로, 기본 파라미터, 목록이 담긴 키]
 * 응답의 목록 키는 엔드포인트마다 다릅니다 (`items` · `products` 등).
 */
const LISTS = (f) => [
  ['설비 현황', '/production/monitor/equipments', {}, 'items'],
  ['감사 로그', '/audit-logs', {}, 'items'],
  ['계정', '/system/users', {}, 'items'],
  ['연동 작업', '/sync/jobs', {}, 'items'],
  ['실적 집계', '/production/results', { from: f.monthFrom, to: f.monthTo, unit: 'day' }, 'items'],
  ['제품 마스터', '/common/masters/products', {}, 'products'],
  // 아래 둘은 페이징 추가 요청분입니다 (API 세션 작업 중)
  ['라인별 현황', '/dashboard/ai/lines', { date: f.baseDate }, 'lines'],
  ['제품별 수율 행', '/reports/yield-by-model', { yearMonth: f.yearMonth }, 'rows'],
];

/** size=0 이면 전량 — 서버와 정한 규약입니다 */
const ALL_SUPPORTED = (f) => [
  ['라인별 현황', '/dashboard/ai/lines', { date: f.baseDate }, 'lines'],
  ['제품별 수율 행', '/reports/yield-by-model', { yearMonth: f.yearMonth }, 'rows'],
];

/** 응답에서 목록을 꺼냅니다 */
const listOf = (body, key) => body?.data?.[key] || [];

suite('페이징 — API', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.f = await fixtures();
  });

  test('목록 응답에 meta 가 온다', async () => {
    const bad = [];
    for (const [name, path, params, key] of LISTS(ctx.f)) {
      const { body } = await api.get(path, params);
      const m = body.meta;
      if (!m || typeof m.total !== 'number' || typeof m.totalPages !== 'number') {
        bad.push(`${name} (${path}) — meta: ${JSON.stringify(m)}`);
      }
    }
    eq(bad, [], 'meta 가 없으면 화면이 전체 건수를 알 수 없습니다');
  });

  test('size 를 주면 그만큼만 온다', async () => {
    const bad = [];
    for (const [name, path, params, key] of LISTS(ctx.f)) {
      const { body } = await api.get(path, { ...params, page: 1, size: 5 });
      const items = listOf(body, key);
      if (body.meta?.total > 5 && items.length !== 5) bad.push(`${name}: size=5 인데 ${items.length}건`);
    }
    eq(bad, [], 'size 가 무시되면 큰 목록이 통째로 내려와 화면이 느려집니다');
  });

  test('쪽마다 다른 내용이 온다', async () => {
    const bad = [];
    for (const [name, path, params, key] of LISTS(ctx.f)) {
      const p1 = await api.get(path, { ...params, page: 1, size: 5 });
      if ((p1.body.meta?.totalPages || 0) < 2) continue;
      const p2 = await api.get(path, { ...params, page: 2, size: 5 });
      const a = JSON.stringify(listOf(p1.body, key));
      const b = JSON.stringify(listOf(p2.body, key));
      if (a === b) bad.push(`${name}: 1쪽과 2쪽 내용이 같습니다 (page 가 무시됨)`);
      if (p2.body.meta?.page !== 2) bad.push(`${name}: meta.page 가 ${p2.body.meta?.page} 입니다`);
    }
    eq(bad, []);
  });

  test('마지막 쪽을 넘어가면 빈 목록이 온다 (오류가 아니라)', async () => {
    const bad = [];
    for (const [name, path, params, key] of LISTS(ctx.f)) {
      const { status, body } = await api.get(path, { ...params, page: 9999, size: 5 });
      if (status >= 400) bad.push(`${name}: HTTP ${status}`);
      else if (listOf(body, key).length) bad.push(`${name}: 범위를 넘었는데 항목이 옵니다`);
    }
    eq(bad, [], '범위를 넘은 쪽은 빈 목록이어야 화면이 "마지막 쪽" 으로 처리할 수 있습니다');
  });

  test('size=0 이면 전량이 온다', async () => {
    const bad = [];
    for (const [name, path, params, key] of ALL_SUPPORTED(ctx.f)) {
      const { body } = await api.get(path, { ...params, size: 0 });
      const items = listOf(body, key);
      const total = body.meta?.total;
      if (typeof total !== 'number') { bad.push(`${name}: meta.total 이 없습니다`); continue; }
      if (items.length !== total) bad.push(`${name}: 전체 ${total}건인데 ${items.length}건만 왔습니다`);
      if (body.meta?.totalPages !== 1) bad.push(`${name}: size=0 이면 totalPages 가 1 이어야 합니다 (${body.meta?.totalPages})`);
    }
    eq(bad, [], '인쇄·내려받기가 전량을 받으려면 size=0 이 필요합니다');
  });

  test('제품별 수율의 합계는 쪽과 무관하게 전체 기준이다', async () => {
    const f = ctx.f;
    const all = await api.data('/reports/yield-by-model', { yearMonth: f.yearMonth, size: 0 });
    const one = await api.data('/reports/yield-by-model', { yearMonth: f.yearMonth, page: 1, size: 5 });
    eq(one.summary?.inputQty, all.summary?.inputQty, 'summary 는 쪽을 나눠도 전체 기준이어야 합니다');
    eq(one.lossTypes, all.lossTypes, 'lossTypes 도 전체 기준이어야 합니다');

    // 화면의 '합계 ▶' 행과 'Loss 비중' 표가 쓰는 값입니다
    const types = all.lossTypes || [];
    if (!types.length) skip('lossTypes 가 비어 합계를 확인할 수 없습니다');
    ok(one.lossTotals, 'lossTotals 가 없으면 화면이 한 쪽만 더해 합계를 잘못 냅니다');
    const fromRows = Object.fromEntries(
      types.map((t) => [t, (all.rows || []).reduce((acc, r) => acc + (Number(r?.loss?.[t]) || 0), 0)])
    );
    const gap = types.filter((t) => Number(one.lossTotals?.[t] || 0) !== fromRows[t]);
    eq(gap, [], 'lossTotals 가 전체 행의 합과 다릅니다');
  });

  test('totalPages 가 total 과 size 로 계산한 값과 같다', async () => {
    const bad = [];
    for (const [name, path, params, key] of LISTS(ctx.f)) {
      const { body } = await api.get(path, { ...params, page: 1, size: 7 });
      const m = body.meta || {};
      if (!m.total) continue;
      const expected = Math.ceil(m.total / 7);
      if (m.totalPages !== expected) bad.push(`${name}: total ${m.total}, size 7 → ${expected} 쪽이어야 하는데 ${m.totalPages}`);
    }
    eq(bad, []);
  });
});

suite('페이징 — 화면', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    const b = await open('admin');
    ctx.browser = b.browser;
    ctx.page = b.page;
  });

  afterAll(async () => {
    if (ctx.browser) await ctx.browser.close();
  });

  /** 화면에서 '전체 N건 중 A–B' 를 읽습니다 */
  const readRange = (text) => {
    const m = text.match(/전체 ([\d,]+)건 중 ([\d,]+)[–-]([\d,]+)/);
    if (!m) return null;
    const n = (v) => Number(v.replace(/,/g, ''));
    return { total: n(m[1]), first: n(m[2]), last: n(m[3]) };
  };

  test('설비 현황이 전체 건수와 현재 범위를 보여 준다', async () => {
    const want = await api.data('/production/monitor/equipments', { page: 1, size: 50 });
    const { body } = await api.get('/production/monitor/equipments', { page: 1, size: 50 });
    const r = await visit(ctx.page, '/production/monitor');
    const shown = readRange(r.text);
    ok(shown, '화면에 "전체 N건 중 A–B" 표시가 없습니다 — 목록이 잘린 사실을 알 수 없습니다');
    eq(shown.total, body.meta.total, '전체 건수');
    eq(shown.first, 1, '첫 쪽의 시작 번호');
  });

  test('다음 쪽을 누르면 범위와 내용이 바뀐다', async () => {
    const r1 = await visit(ctx.page, '/production/monitor');
    const before = readRange(r1.text);
    if (!before || before.total <= before.last) skip('한 쪽에 다 들어가는 목록이라 쪽 이동을 확인할 수 없습니다');

    await ctx.page.getByRole('button', { name: '다음 쪽' }).click();
    await ctx.page.waitForTimeout(3000);
    const text = await ctx.page.evaluate(() => document.body.innerText);
    const after = readRange(text);
    ok(after, '쪽을 옮긴 뒤 범위 표시가 사라졌습니다');
    eq(after.first, before.last + 1, '다음 쪽의 시작 번호');
    eq(after.total, before.total, '전체 건수는 그대로여야 합니다');
  });

  test('한 쪽 건수를 바꾸면 범위가 따라간다', async () => {
    await visit(ctx.page, '/production/monitor');
    await ctx.page.getByRole('button', { name: '한 쪽에 100건' }).click();
    await ctx.page.waitForTimeout(3500);
    const text = await ctx.page.evaluate(() => document.body.innerText);
    const r = readRange(text);
    ok(r, '범위 표시가 없습니다');
    eq(r.first, 1, '쪽 크기를 바꾸면 1쪽으로 돌아가야 합니다');
    eq(r.last, Math.min(100, r.total), '한 쪽에 100건');
  });

  test('공정 대시보드 설비별 불량률이 생산한 설비 수를 보여 준다', async () => {
    // 라인별 현황 목록(1,331대 쪽 단위)을 설비별 불량률 표로 바꾸고(2026-09-05),
    // 설비·제품을 들여다보는 화면이라 공정 대시보드로 옮겼습니다(2026-09-06).
    // 쪽을 넘겨 읽을 자료가 아니라 한 판으로 봐야 하는 자료라, 페이징 대신 전량을 그립니다.
    const d = (await fixtures()).baseDate;
    const { body } = await api.get('/dashboard/ai/lines', { date: d, size: 0 });
    // 줄 수가 아니라 서로 다른 설비 대수입니다 — 서버가 설비 × 제품으로 줄을 나눠도 이 수는 같습니다
    const produced = (body.data?.lines || body.data?.items || []).filter((x) => (x.qty || 0) > 0);
    const want = new Set(produced.map((x) => x.eqptCd).filter(Boolean)).size;

    const r = await visit(ctx.page, '/dashboard/process');
    const m = r.text.match(/생산한 설비 ([\d,]+)대/);
    /**
     * 공정 및 제품 대시보드 개편(2026-09-07)으로 설비별 불량률 카드가 화면에서 빠졌습니다.
     * 지우지 않고 건너뜁니다 — 카드가 어느 화면으로든 돌아오면 이 검사가 다시 돕니다.
     */
    if (!m) skip('개편으로 설비별 불량률 카드가 화면에 없습니다');
    eq(Number(m[1].replace(/,/g, '')), want, '생산한 설비 수');
  });

  test('제품별 수율에 전체 보기 선택지가 있다', async () => {
    await visit(ctx.page, '/report/yield-by-model');
    const count = await ctx.page.getByRole('button', { name: '전체 보기' }).count();
    ok(count > 0, '인쇄·내려받기를 위해 전체 보기(size=0)가 필요합니다');
  });

  test('전체 보기를 고르면 모든 행이 나온다', async () => {
    await visit(ctx.page, '/report/yield-by-model');
    await ctx.page.getByRole('button', { name: '전체 보기' }).first().click();
    await ctx.page.waitForTimeout(4000);
    const text = await ctx.page.evaluate(() => document.body.innerText);
    const m = text.match(/전체 ([\d,]+)건(?! 중)/);
    ok(m, '전체 보기인데 건수 표시가 없습니다');
    ok(!/전체 [\d,]+건 중/.test(text), '전체 보기인데 아직 쪽 범위가 표시됩니다');
  });

  test('제품별 수율의 합계 행은 쪽을 넘겨도 그대로다', async () => {
    /** '합계 ▶' 행 한 줄만 뽑습니다 (다음 줄부터는 쪽마다 다른 데이터입니다) */
    const totalRow = async () => {
      const t = await ctx.page.evaluate(() => document.body.innerText);
      const line = t.split('\n').find((x) => x.includes('합계 ▶'));
      if (line) return line.trim();
      // 셀이 줄마다 끊어져 나오는 경우 — 합계 다음 8개 값만 봅니다
      const i = t.indexOf('합계 ▶');
      return i < 0 ? null : t.slice(i, i + 80).split('\n').slice(0, 9).join('|');
    };

    const r = await visit(ctx.page, '/report/yield-by-model');
    const before = await totalRow();
    ok(before, '합계 행을 찾지 못했습니다');

    // 이관이 돌면 행 수가 바뀝니다. 한 쪽에 다 들어가면 쪽 이동을 확인할 수 없습니다
    if (!/전체 [\d,]+건 중/.test(r.text)) skip('한 쪽에 다 들어가는 분량이라 쪽 이동을 확인할 수 없습니다');

    await ctx.page.getByRole('button', { name: '다음 쪽' }).first().click();
    await ctx.page.waitForTimeout(3000);
    const after = await totalRow();
    eq(after, before, '합계는 전체 기준이어야 합니다 — 쪽마다 바뀌면 한 쪽만 더한 것입니다');
  });

  test('감사 로그도 쪽 이동이 된다', async () => {
    const r = await visit(ctx.page, '/system/audit-log');
    const shown = readRange(r.text);
    if (!shown) skip('조회 기간에 감사 로그가 없어 쪽 이동을 확인할 수 없습니다');
    ok(shown.total > 0);
    eq(shown.first, 1);
  });
});
