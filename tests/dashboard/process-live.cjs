const assert = require('node:assert/strict');
const { open } = require('../lib/browser');
(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const response = () => page.waitForResponse((r) => r.url().includes('/dashboard/process/period?'), { timeout: 60000 });
  async function ready(pending) {
    const r = await pending;
    const body = await r.json();
    assert.equal(body.success, true);
    await page.getByText('제품별 상세 실적', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(body.data.periods.reduce((n, p) => n + (p.qty || 0), 0), body.data.summary.qty);
    return { ...body.data, url: r.url() };
  }
  try {
    let pending = response();
    await page.goto('http://localhost:8081/dashboard/process');
    const daily = await ready(pending);
    assert.equal(daily.periods.length, 7);
    assert.ok((await page.locator('body').innerText()).includes(daily.summary.qty.toLocaleString('ko-KR')));
    for (const [previous, next, count] of [['일별', '주별', 4], ['주별', '월별', 3]]) {
      pending = response();
      await page.getByText(previous, { exact: true }).click();
      await page.getByText(next, { exact: true }).click();
      assert.equal((await ready(pending)).periods.length, count);
    }
    await page.getByText('제품 선택 (전체)', { exact: true }).click();
    await page.getByText('Top 5', { exact: true }).click({ timeout: 60000 });
    await page.getByText('적용', { exact: true }).click();
    pending = response();
    await page.getByText('조회', { exact: true }).click();
    const selected = await ready(pending);
    assert.ok(selected.products.length <= 5);
    assert.ok(new URL(selected.url).searchParams.has('productCodes[]'));
    if (await page.getByText('이 공정 조회', { exact: true }).count()) {
      pending = response();
      await page.getByText('이 공정 조회', { exact: true }).click();
      const scoped = await ready(pending);
      assert.ok(new URL(scoped.url).searchParams.get('processId'));
      assert.deepEqual(scoped.processes, selected.processes);
    }
    await page.getByPlaceholder('YYYY-MM-DD').nth(0).fill('1900-01-01');
    await page.getByPlaceholder('YYYY-MM-DD').nth(1).fill('1900-01-01');
    pending = response();
    await page.getByText('조회', { exact: true }).click();
    const empty = await ready(pending);
    assert.equal(empty.summary.qty, 0);
    assert.equal(empty.summary.yieldRate, null);
    assert.ok((await page.locator('body').innerText()).includes('생산 실적 없음'));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, dailyQty: daily.summary.qty, weeklyBuckets: 4, monthlyBuckets: 3, selectedProducts: selected.products.length, emptyValuesExplained: true, browserErrors: errors }));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
