const assert = require('node:assert/strict');
const { open } = require('../lib/browser');
(async () => {
  const { browser, page } = await open();
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const fixture = {
    summary: { qty: 1000, okQty: 970, ngQty: 30, defectRate: 3, yieldRate: 97 },
    periods: [{ period: '2026-09-04', qty: 1000, okQty: 970, ngQty: 30, defectRate: 3, yieldRate: 97 }],
    products: [
      { code: 'D62', productNm: '주력 제품', qty: 500, okQty: 470, ngQty: 30, defectRate: 6, yieldRate: 94 },
      { code: 'MISSING', productNm: null, qty: null, okQty: 500, ngQty: null, defectRate: null, yieldRate: null },
    ],
    processes: [{ processId: 'W110', process: '프레스', qty: 1000, okQty: 970, ngQty: 30, defectRate: 3, yieldRate: 97 }],
  };
  await page.route('**/api/v1/dashboard/process/period?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(Object.fromEntries(params));
    if (params.get('from') === '2026-08-01') {
      await route.fulfill({ status: 500, json: { success: false, message: 'test error' } }); return;
    }
    await route.fulfill({ json: { success: true, data: fixture } });
  });
  try {
    await page.goto('http://localhost:8081/dashboard/process');
    await page.getByText('제품별 상세 실적', { exact: true }).waitFor();
    assert.equal(await page.locator('.tabulator').count(), 2);
    assert.ok(await page.getByText('제품 1종 집계 확인 필요', { exact: true }).isVisible());
    const table = page.locator('#process-product-detail .tabulator');
    assert.ok((await table.innerText()).includes('수량 미집계'));
    assert.ok((await table.innerText()).includes('산출 자료 부족'));
    assert.ok((await table.innerText()).includes('제품명 미등록'));
    await page.getByText('미집계 제품 확인', { exact: true }).click();
    assert.equal(await table.locator('.tabulator-row').count(), 1);
    await page.getByText('상세 필터 해제', { exact: true }).click();
    await page.getByText('이 제품 상세 보기', { exact: true }).click();
    assert.equal(await page.getByPlaceholder('제품 코드 또는 제품명').inputValue(), 'D62');
    assert.equal(await table.locator('.tabulator-row').count(), 1);
    await page.getByText('상세 필터 해제', { exact: true }).click();
    await page.getByText('이 공정 조회', { exact: true }).click();
    await page.getByText('제품별 상세 실적', { exact: true }).waitFor();
    assert.equal(requests.at(-1).processId, 'W110');
    const dates = page.getByPlaceholder('YYYY-MM-DD');
    await dates.nth(0).fill('2026-09-05');
    const count = requests.length;
    await page.getByText('조회', { exact: true }).click();
    await page.getByText('시작일은 종료일보다 늦을 수 없습니다.', { exact: true }).waitFor();
    assert.equal(requests.length, count);
    await dates.nth(0).fill('2026-09-01');
    await page.getByText('일별', { exact: true }).click();
    await page.getByText('주별', { exact: true }).click();
    await page.getByText('제품별 상세 실적', { exact: true }).waitFor();
    assert.equal(requests.at(-1).unit, 'week');
    const download = page.waitForEvent('download');
    await page.getByText('엑셀 다운로드', { exact: true }).click();
    assert.match((await download).suggestedFilename(), /공정_제품_실적/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('기본값 복원', { exact: true }).click();
    await page.getByText('제품별 상세 실적', { exact: true }).waitFor();
    await page.screenshot({ path: '/tmp/dwje-process-issues-mobile.png' });
    await dates.nth(0).fill('2026-08-01');
    await page.getByText('조회', { exact: true }).click();
    await page.getByText('실적을 불러오지 못했습니다', { exact: true }).waitFor();
    assert.equal(await page.locator('.tabulator').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: null explanations, issue drill-down, filters, date validation, week query, export, mobile and error state');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
