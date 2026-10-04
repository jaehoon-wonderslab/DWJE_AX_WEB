/*
 * 시스템 팝업 알림 토스트 시험 (2026-10-04)
 *
 * 발송 채널 「시스템 팝업」 으로 나에게 온 알림이 화면 오른쪽 위에 5초 동안 뜨는지 봅니다.
 * /alerts · /alerts/popups 응답은 page.route 로 흉내 냅니다(팝업 확인 주기 20초를 한 번 기다립니다).
 *   WEB_URL=<로컬 대상 개발 서버> node tests/system/alert-popup-browser.cjs
 *
 * 확인하는 것
 *  · 첫 호출은 after 없이 기준점만 — 지난 팝업은 띄우지 않음
 *  · 다음 주기에 after=기준점 → 새 팝업 토스트(등급 · 제목 · 테스트 표시) + 진행 막대가 줄어듦
 *  · 5초 뒤 저절로 닫힘, 「이상 알림」 모달에도 그 알림(테스트 표시)이 보임
 *  · 토스트를 누르면 /alert/list?alertId=…&includeTest=true 로 가서 그 알림을 엶
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

(async () => {
  const { page, browser } = await open('it');
  const errors = [];
  const popupQueries = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ok = (route, data, meta) => route.fulfill({ json: { success: true, code: 'SUCCESS', message: '정상', data, meta } });
  const alert = { alertId: 91, level: 'CRIT', levelNm: '위험', title: '[위험] 불량률 10% 초과 — MS-015', eqptCd: 'MS-015', eqptNm: '용접기 01호기', condNm: '불량률 10% 초과', occurredAt: '2026-10-04 09:00:00', ackState: 'OPEN', test: true, desc: '테스트 발송입니다' };
  let served = false;
  await page.route('**/api/v1/alerts**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1/alerts', '');
    if (path === '/popups') {
      popupQueries.push(Object.fromEntries(url.searchParams));
      if (!url.searchParams.get('after')) return ok(route, { items: [], lastSendId: 100 });
      if (url.searchParams.get('after') === '100' && !served) {
        served = true;
        return ok(route, { items: [{ sendId: 101, ...alert }], lastSendId: 101 });
      }
      return ok(route, { items: [], lastSendId: Number(url.searchParams.get('after')) });
    }
    if (path === '') {
      const p = url.searchParams;
      const rows = p.get('alertId') === '91' || p.get('ackState') === 'OPEN' ? [alert] : [];
      return ok(route, { items: rows }, { page: 1, size: Number(p.get('size') || 50), total: rows.length, totalPages: 1 });
    }
    if (path === '/91') return ok(route, alert);
    if (path.startsWith('/send-logs')) return ok(route, { items: [] }, { page: 1, size: 50, total: 0 });
    return route.continue();
  });
  try {
    await page.goto(`${WEB}/dashboard/ai`);
    await page.getByRole('button', { name: '이상 알림' }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
    assert.equal(popupQueries[0]?.after, undefined, '첫 호출은 기준점만');
    assert.equal(await page.getByTestId('alert-popup-toast').count(), 0, '지난 팝업은 띄우지 않음');

    // 다음 주기(20초)에 새 팝업
    const toast = page.getByTestId('alert-popup-toast');
    await toast.waitFor({ timeout: 30000 }).catch((e) => { console.log('popup queries', JSON.stringify(popupQueries), errors); throw e; });
    assert.equal(popupQueries.at(-1).after, '100', 'after = 기준점');
    assert(await toast.getByText('[위험] 불량률 10% 초과 — MS-015', { exact: true }).count(), '제목');
    assert(await toast.getByText('테스트', { exact: true }).count(), '테스트 표시');
    const box = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="alert-popup-toast"]').getBoundingClientRect();
      return { right: window.innerWidth - t.right, top: t.top };
    });
    assert(box.right < 60 && box.top < 140, `오른쪽 위 (${JSON.stringify(box)})`);
    const w1 = await page.getByTestId('alert-popup-progress').evaluate((el) => el.getBoundingClientRect().width);
    await page.waitForTimeout(1500);
    const w2 = await page.getByTestId('alert-popup-progress').evaluate((el) => el.getBoundingClientRect().width);
    assert(w2 < w1, `진행 막대가 줄어듦 ${w1} → ${w2}`);
    // 5초 뒤 저절로 닫힘
    await toast.waitFor({ state: 'detached', timeout: 6000 });

    // 「이상 알림」 모달에 그 알림(테스트 표시)
    await page.getByRole('button', { name: '이상 알림' }).first().click();
    await page.getByText('[위험] 불량률 10% 초과 — MS-015', { exact: true }).first().waitFor();
    await page.getByText('[위험] 불량률 10% 초과 — MS-015', { exact: true }).first().click();
    await page.waitForURL(/\/alert\/list\?.*alertId=91/);
    assert(/includeTest=true/.test(page.url()), '테스트 알림은 includeTest');
    await page.getByText('테스트 발송입니다', { exact: false }).last().waitFor({ timeout: 30000 });
    assert.deepEqual(errors, []);
    console.log('PASS: alert popup — baseline only on first call, toast top-right (title·level·test) with shrinking progress bar, auto-close after 5s, bell modal shows it (test), click → /alert/list?alertId&includeTest detail');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
