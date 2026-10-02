/*
 * 알림 목록(/alert/list) 주소 파라미터 시험 — 기획 05 ALC-03 · ALC-08 (4단계)
 *
 * 발송 조건 화면의 「최근 7일」(condId)과 테스트 결과의 「알림 목록에서 보기」(alertId · includeTest)가
 * 알림 목록의 조회 조건으로 쓰이는지 봅니다. /alerts 응답은 page.route 로 흉내 냅니다.
 *   API_URL=http://localhost:18081 WEB_URL=<로컬 대상 개발 서버> node tests/system/alert-list-params-browser.cjs
 *
 * 확인하는 것
 *  · ?condId=5 → GET /alerts 에 condId=5 · period=7d · ackState 없음(전체), 안내 문구, 「모든 알림 보기」 로 풀림
 *  · ?alertId=77&includeTest=true → alertId=77 · includeTest=true, 그 한 건의 상세가 바로 열림, 「테스트」 배지
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

(async () => {
  const { page, browser } = await open('it');
  const errors = [];
  const queries = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const apiBase = process.env.API_URL || 'http://localhost:8080';
  if (!apiBase.includes('localhost:8080')) {
    await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('http://localhost:8080', apiBase) }));
  }
  const ok = (route, data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '정상', data, meta } });
  const alert = { alertId: 77, level: 'CRIT', levelNm: '위험', title: '[테스트] 시험 조건', condId: 5, condNm: '시험 조건', occurredAt: '2026-10-01 10:00:00', ackState: 'CLOSED', test: true, desc: '테스트 발송입니다' };
  await page.route('**/api/v1/alerts**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1/alerts', '');
    if (path === '') {
      queries.push(Object.fromEntries(url.searchParams));
      const p = url.searchParams;
      const rows = p.get('alertId') === '77' ? [alert] : p.get('condId') === '5' ? [{ ...alert, alertId: 78, test: false, title: '운영 알림' }] : [];
      return ok(route, { items: rows }, { page: 1, size: Number(p.get('size') || 50), total: rows.length, totalPages: 1 });
    }
    if (path === '/77') return ok(route, alert);
    if (path.startsWith('/escalation-targets')) return ok(route, { items: [] });
    if (path.startsWith('/send-logs')) return ok(route, { items: [] }, { page: 1, size: 50, total: 0 });
    return route.continue();
  });
  try {
    // ── condId (최근 7일 링크) ──
    await page.goto(`${WEB}/alert/list?condId=5`);
    await page.getByText('발송 조건 #5 의 알림만 보고 있습니다', { exact: false }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(800);
    const listQ = queries.filter((q) => q.size !== '1');
    const q = listQ.at(-1);
    assert.equal(q.condId, '5'); assert.equal(q.period, '7d', 'condId link uses last 7 days');
    assert.equal(q.ackState, undefined, 'all ack states');
    assert(await page.getByText('운영 알림', { exact: true }).count());
    await page.getByRole('button', { name: '모든 알림 보기', exact: true }).click();
    await page.waitForTimeout(1200);
    assert.equal(queries.at(-1).condId, undefined, 'clearing the link drops condId');

    // ── alertId + includeTest (테스트 결과 링크) ──
    await page.goto(`${WEB}/alert/list?alertId=77&includeTest=true`);
    await page.getByText('알림 #77 한 건을 보고 있습니다 · 테스트 알림 포함', { exact: true }).waitFor({ timeout: 90000 });
    await page.getByText('테스트 발송입니다', { exact: false }).last().waitFor();
    const q2 = queries.filter((x) => x.alertId).at(-1);
    assert.equal(q2.alertId, '77'); assert.equal(q2.includeTest, 'true');
    assert(await page.getByText('[테스트] 시험 조건', { exact: true }).count() >= 1, 'detail opened for the linked alert');
    assert(await page.getByText('테스트', { exact: true }).count(), 'test badge');
    assert.deepEqual(errors, []);
    console.log('PASS: alert-list — condId(7d, all states, clear link), alertId+includeTest(one row, detail auto-open, test badge)');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
