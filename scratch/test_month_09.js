const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 월별 선택 시 9월 실적 노출 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. 집계 단위 드롭다운 열기
  await page.locator('text=집계 단위').first().locator('..').click();
  await page.waitForTimeout(400);

  // 2. '월별' 클릭
  await page.locator('text=월별').last().click();
  await page.waitForTimeout(2000);

  // 3. 입력된 날짜 확인
  const fromVal = await page.locator('input[placeholder="YYYY-MM-DD"]').first().inputValue();
  const toVal = await page.locator('input[placeholder="YYYY-MM-DD"]').last().inputValue();
  console.log(`- 월별 선택 후 설정된 날짜: ${fromVal} ~ ${toVal}`);

  // 4. 차트 및 표 제목 확인
  const chartTitle = await page.locator('text=생산·불량 추이').first().innerText().catch(() => '');
  const chartSub = await page.locator('text=~ 2026-').first().innerText().catch(() => '');
  console.log(`- 차트 제목/기간: ${chartTitle} (${chartSub})`);

  // 5. 표에 나온 첫 행의 period 확인
  const firstRowPeriod = await page.locator('.tabulator-cell').first().innerText().catch(() => 'NOT FOUND');
  console.log(`- 집계 결과 표 첫 번째 기간: ${firstRowPeriod}`);

  // 스크린샷 캡처
  await page.screenshot({ path: 'scratch/month_09_verified.png', fullPage: true });

  await browser.close();
  console.log('=== 검증 완료 ===');
})();
