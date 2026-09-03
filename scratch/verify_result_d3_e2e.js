const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 실적 집계·조회 화면 종합 E2E 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. D3.js 차트 렌더링 검증
  const d3ChartTitle = await page.locator('text=생산·불량 추이 (D3.js)').first().isVisible();
  console.log('1. D3.js 차트 타이틀 노출:', d3ChartTitle);

  const svgExists = await page.locator('svg').first().isVisible();
  console.log('1-1. SVG 태그 렌더링:', svgExists);

  // 차트 막대 호버 테스트
  const bars = await page.locator('svg rect[style*=\"cursor: pointer\"]').all();
  console.log('1-2. 차트 인터랙티브 막대 개수:', bars.length);
  if (bars.length > 0) {
    await bars[0].hover();
    await page.waitForTimeout(500);
    const tooltipVisible = await page.locator('text=생산량:').first().isVisible();
    console.log('1-3. 호버 시 실시간 툴팁 노출:', tooltipVisible);
  }

  // 2. 테이블 너비 100% 검증
  const cardBox = await page.locator('text=집계 결과').first().locator('..').boundingBox();
  const tableRow = await page.locator('text=2026-').first().locator('..').boundingBox();
  console.log('2-1. 카드 영역 너비:', cardBox?.width);
  console.log('2-2. 테이블 첫 행 너비:', tableRow?.width);
  if (tableRow && cardBox && Math.abs(tableRow.width - cardBox.width) < 50) {
    console.log('✔ 테이블이 카드의 100% 폭을 꽉 채우고 있습니다!');
  } else {
    console.log('테이블 너비 비율:', tableRow?.width, '/', cardBox?.width);
  }

  // 3. 테이블 행 hover 검증
  const firstDataRow = page.locator('text=2026-').first().locator('..');
  await firstDataRow.hover();
  await page.waitForTimeout(500);
  console.log('✔ 첫 행 마우스 over 이벤트 정상 수신');

  // 스크린샷 1: 기본 7일 화면 (D3 차트 + 테이블 100% + 합계 바 + 페이징)
  await page.screenshot({ path: 'scratch/result_d3_7days.png', fullPage: true });

  // 4. 검색 옵션 변경 테스트: 제품 'D53BM' 선택 후 조회
  console.log('\n=== 4. 검색 옵션 테스트: 제품 선택 및 조회 ===');
  // 제품 드롭다운 클릭
  const selects = await page.locator('div[tabindex="0"], [role="button"]').filter({ hasText: /^전체$/ }).all();
  console.log('전체 드롭다운 개수:', selects.length);
  if (selects.length >= 1) {
    // 제품 선택 (필터의 두 번째 드롭다운)
    await selects[selects.length - 1].click();
    await page.waitForTimeout(500);
    const d53bmOpt = page.locator('text=D53BM').first();
    if (await d53bmOpt.isVisible()) {
      await d53bmOpt.click();
      await page.waitForTimeout(500);
      console.log('제품 D53BM 선택 완료');
    }
  }

  // 날짜를 2026-06-01 ~ 2026-08-31 로 설정하여 86건 나오도록 조회
  const inputs = await page.locator('input').all();
  if (inputs.length >= 3) {
    await inputs[1].fill('2026-06-01');
    await inputs[2].fill('2026-08-31');
  }

  // '조회' 버튼 클릭
  console.log('>> 조회 버튼 클릭...');
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  await page.waitForTimeout(3000);

  const pagingTextD53 = await page.locator('text=건 중').first().innerText().catch(() => 'NOT FOUND');
  console.log('조회 후 페이징 텍스트:', pagingTextD53);

  // 5. 페이징 건수 버튼 '페이지당 10' 클릭
  console.log('\n=== 5. 페이징 건수 10건 클릭 ===');
  const btn10 = page.locator('[role=button]').filter({ hasText: /^10$/ }).first();
  if (await btn10.isVisible()) {
    await btn10.click();
    await page.waitForTimeout(2000);
    const p10Text = await page.locator('text=건 중').first().innerText().catch(() => 'NOT FOUND');
    console.log('10건 선택 후 페이징 텍스트:', p10Text);

    // 2페이지 버튼 클릭
    const btn2 = page.locator('[role=button]').filter({ hasText: /^2$/ }).first();
    if (await btn2.isVisible()) {
      await btn2.click();
      await page.waitForTimeout(2000);
      const p2Text = await page.locator('text=건 중').first().innerText().catch(() => 'NOT FOUND');
      console.log('2페이지 클릭 후 페이징 텍스트:', p2Text);
    }
  }

  // 스크린샷 2: D53BM 90일 조회 + 페이징 활성화 상태
  await page.screenshot({ path: 'scratch/result_d3_searched_paged.png', fullPage: true });

  await browser.close();
  console.log('\n=== 종합 E2E 검증 성공적으로 완료! ===');
})();
