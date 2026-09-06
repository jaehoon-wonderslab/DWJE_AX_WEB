const assert = require('node:assert/strict');
const { open } = require('../lib/browser');
(async () => {
  const { browser, page } = await open();
  const errors = [], summaries = [], aiRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('/dashboard/ai/summary?')) summaries.push(r.url());
    if (/dashboard\/ai\/(briefing|cause-prescription)/.test(r.url())) aiRequests.push(r.url());
  });
  await page.route('**/dashboard/ai/briefing?**', (r) => r.fulfill({ status: 503, json: { success: false, message: 'AI service offline' } }));
  await page.route('**/dashboard/ai/cause-prescription?**', (r) => r.fulfill({ status: 503, json: { success: false, message: 'AI service offline' } }));
  const ready = () => page.getByText('총 생산 수량', { exact: true }).waitFor({ timeout: 60000 });
  async function query() {
    const pending = page.waitForResponse((r) => r.url().includes('/dashboard/ai/summary?'), { timeout: 60000 });
    await page.getByText('조회', { exact: true }).click();
    const response = await pending;
    assert.equal(response.status(), 200);
    await ready();
    return (await response.json()).data;
  }
  try {
    await page.goto('http://localhost:8081/dashboard/ai'); await ready();
    assert.equal(aiRequests.length, 0, 'normal page load must not invoke the model');
    for (const [previous, next] of [['최근 7일', '최근 4주'], ['최근 4주', '최근 3개월'], ['최근 3개월', '직접 선택']]) {
      const count = summaries.length;
      await page.getByText(previous, { exact: true }).click();
      await page.getByText(next, { exact: true }).click();
      assert.equal(summaries.length, count, 'period editing is a draft');
      await query();
      assert.deepEqual(errors, []);
      await page.getByText('일 단위 불량률 추이', { exact: true }).waitFor();
      assert.ok((await page.locator('body').innerText()).includes('긴 기간은 일 단위로 묶어 표시합니다.'));
    }
    const dates = page.getByPlaceholder('YYYY-MM-DD');
    await dates.nth(0).fill('2026-09-05');
    await dates.nth(1).fill('2026-09-04');
    const count = summaries.length;
    await page.getByText('조회', { exact: true }).click();
    await page.getByText('시작일은 종료일보다 늦을 수 없습니다.', { exact: true }).waitFor();
    assert.equal(summaries.length, count);
    await dates.nth(0).fill('2026-09-04');
    const day = await query();
    assert.equal(day.todayQty, 15899217);
    await page.getByText('일자 × 시간대별 불량률 매트릭스', { exact: true }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('4.11'), 'single-day hourly data must occupy real matrix cells');
    assert.equal(aiRequests.length, 0);
    await page.getByText('AI 분석 요청', { exact: true }).click();
    await page.getByText('현재 AI 분석 결과가 없습니다.', { exact: true }).first().waitFor();
    assert.equal(aiRequests.length, 1, 'offline briefing must not trigger another model request');
    assert.ok(await page.getByText('총 생산 수량', { exact: true }).isVisible());
    await query();
    assert.equal(aiRequests.length, 1, 'regular requery must not restart AI');
    await page.getByText('AI 분석을 요청하지 않았습니다.', { exact: true }).first().waitFor();
    await page.screenshot({ path: '/tmp/dwje-ai-range-fixed.png' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, presets: ['4 weeks', '3 months', 'custom'], dayQty: day.todayQty, modelOfflineAllowed: true, errors }));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
