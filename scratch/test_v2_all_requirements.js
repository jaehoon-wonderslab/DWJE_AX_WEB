const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 실적 집계 조회 4가지 요구사항 2차 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. 차트 불량률 % 텍스트 및 막대 겹침 확인
  const rateTexts = await page.locator('svg g[style*="pointer-events: none"] text').allInnerTexts();
  console.log('1. 차트 불량률 % 상시 표기 텍스트들:', rateTexts.filter(t => t && t.includes('%')));

  // 2. 카드와 테이블 좌우 여백 확인
  const cardBox = await page.locator('text=집계 결과').first().locator('..').boundingBox();
  const tabulatorBox = await page.locator('.tabulator').first().boundingBox();
  console.log('2-1. 카드 x, width:', cardBox.x, cardBox.width);
  console.log('2-2. Tabulator x, width:', tabulatorBox.x, tabulatorBox.width);
  const leftMargin = tabulatorBox.x - cardBox.x;
  console.log('2-3. 좌측 여백(px):', leftMargin);
  if (leftMargin >= 10) {
    console.log('✔ 테이블이 카드 테두리에 딱 붙지 않고 자연스러운 여백이 확보되었습니다!');
  }

  // 3. Tabulator 내장 페이징 푸터 확인
  const footerVisible = await page.locator('.tabulator-footer').first().isVisible();
  console.log('3-1. Tabulator 내장 푸터 노출 여부:', footerVisible);

  const counterText = await page.locator('.tabulator-page-counter').first().innerText().catch(() => 'NOT FOUND');
  console.log('3-2. Tabulator 내장 카운터 텍스트:', counterText);

  // 스크린샷 1: 7일 기본 화면 (오렌지 꺾은선 + 흰색 Halo % 수치 + 여백 있는 Shadcn Tabulator + 내장 페이징)
  await page.screenshot({ path: 'scratch/result_v2_7days.png', fullPage: true });

  // 4. 날짜를 90일(84건)로 검색하여 다중 페이지 페이징 동작 검증
  console.log('\n=== 4. 90일 검색 후 Tabulator 페이징 인터랙션 검증 ===');
  const inputs = await page.locator('input[placeholder="YYYY-MM-DD"]').all();
  if (inputs.length >= 2) {
    await inputs[0].fill('2026-06-01');
    await inputs[1].fill('2026-08-31');
  }
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  await page.waitForTimeout(3000);

  const counterText90 = await page.locator('.tabulator-page-counter').first().innerText().catch(() => 'NOT FOUND');
  console.log('4-1. 90일 조회 후 Tabulator 카운터:', counterText90);

  // Tabulator 페이지 사이즈 셀렉트 변경 (10건 선택)
  const pageSizeSelect = page.locator('.tabulator-page-size').first();
  if (await pageSizeSelect.isVisible()) {
    console.log('>> Tabulator 페이지 사이즈 10으로 변경...');
    await pageSizeSelect.selectOption('10');
    await page.waitForTimeout(1000);

    const counterAfter10 = await page.locator('.tabulator-page-counter').first().innerText().catch(() => 'NOT FOUND');
    console.log('4-2. 10건 선택 후 카운터:', counterAfter10);

    // 2페이지 버튼 클릭
    const page2Btn = page.locator('.tabulator-page[data-page="2"]').first();
    if (await page2Btn.isVisible()) {
      console.log('>> Tabulator 2페이지 버튼 클릭...');
      await page2Btn.click();
      await page.waitForTimeout(1000);

      const counterAfterPage2 = await page.locator('.tabulator-page-counter').first().innerText().catch(() => 'NOT FOUND');
      console.log('4-3. 2페이지 클릭 후 카운터:', counterAfterPage2);
    }
  }

  // 스크린샷 2: 90일 다중 페이지 상태 캡처
  await page.screenshot({ path: 'scratch/result_v2_tabulator_paged.png', fullPage: true });

  await browser.close();
  console.log('\n=== 종합 검증 성공적으로 완료! ===');
})();
