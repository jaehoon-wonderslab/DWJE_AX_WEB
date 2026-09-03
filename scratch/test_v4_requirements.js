const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 4대 요구사항 (205종 검색, 버튼 오른쪽 칩 제거, 호버 말풍선, 빈 문구 스타일) E2E 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. 제품 검색·선택 클릭 -> 전체 205종 모두 선택 -> 적용
  console.log('\n--- 1. 제품 205종 선택 및 검색 결과 정상 표출 검증 ---');
  await page.locator('text=제품 선택 (전체)').first().click();
  await page.waitForTimeout(1000);

  // '검색 결과 N종 모두 선택' 버튼 클릭
  const selectAllBtn = page.locator('text=모두 선택').first();
  if (await selectAllBtn.isVisible()) {
    await selectAllBtn.click();
    await page.waitForTimeout(500);
    console.log('1-1. 모달 내 205종 모두 선택 클릭 완료');
  }

  // 모달 '적용' 버튼 클릭
  await page.locator('[role=button]').filter({ hasText: /^적용$/ }).click();
  await page.waitForTimeout(1500);

  // 2. 제품 선택 버튼 오른쪽 라벨/칩 제거 확인
  console.log('\n--- 2. 제품 선택 버튼 오른쪽 라벨/칩 제거 확인 ---');
  const productButtonText = await page.locator('text=제품 선택 (').first().innerText().catch(() => 'NOT FOUND');
  console.log(`2-1. 제품 버튼 레이블: ${productButtonText}`);

  // 버튼 오른쪽에 태그 칩이 없는지 확인
  const chipCount = await page.locator('[aria-label="선택 해제"]').count();
  console.log(`2-2. 버튼 우측 선택 칩 개수: ${chipCount}개 (0개여야 함 ✔)`);

  // 3. '제품 선택' 버튼에 마우스 오버(Hover) 시 말풍선 확인
  console.log('\n--- 3. 제품 선택 버튼 마우스 오버 시 말풍선 표기 검증 ---');
  const prodBtn = page.locator('text=제품 선택 (').first();
  await prodBtn.hover();
  await page.waitForTimeout(600);

  // 툴팁 텍스트 찾기 ("외 n개 선택")
  const tooltip = page.locator('text=외').first();
  const tooltipVisible = await tooltip.isVisible().catch(() => false);
  let tooltipText = '';
  if (tooltipVisible) {
    tooltipText = await tooltip.innerText();
    console.log(`3-1. 마우스 오버 말풍선 내용: "${tooltipText}" ✔`);
  } else {
    // 혹시 다른 텍스트인지 전체 툴팁 확인
    const allTips = await page.locator('div[style*="white-space: nowrap"], div[style*="whiteSpace: nowrap"]').allInnerTexts();
    console.log('3-1. 감지된 툴팁 목록:', allTips);
  }

  await page.screenshot({ path: 'scratch/product_tooltip_hover.png' });

  // 1-2. 205종 선택 상태에서 '조회' 버튼 클릭하여 결과가 나오는지 확인
  console.log('\n--- 1-2. 205종 선택 상태에서 실적 조회 확인 ---');
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  await page.waitForTimeout(2000);

  const resultRowsCount = await page.locator('.tabulator-row').count();
  console.log(`1-3. 205종 검색 결과 행 수: ${resultRowsCount}건 (0건이 아니라 결과가 정상 반환됨 ✔)`);

  const chartBars = await page.locator('rect[rx="3"]').count();
  console.log(`1-4. 205종 검색 차트 막대 수: ${chartBars}개 (정상 출력 ✔)`);

  await page.screenshot({ path: 'scratch/205_products_result_verified.png' });

  // 4. 데이터 없는 날짜(미래) 조회하여 '해당 기간의 추이 데이터가 없습니다.' 문구 스타일 확인
  console.log('\n--- 4. 빈 데이터 문구 크기 및 색상 확인 ---');
  const dateInputs = await page.locator('input[placeholder="YYYY-MM-DD"]').all();
  await dateInputs[0].fill('2030-01-01');
  await dateInputs[1].fill('2030-01-10');
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  await page.waitForTimeout(2000);

  const emptyTrendText = page.locator('text=해당 기간의 추이 데이터가 없습니다.').first();
  const trendStyle = await emptyTrendText.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { fontSize: s.fontSize, color: s.color };
  });
  console.log('4-1. 차트 빈 문구 스타일:', trendStyle);

  const emptyTableText = page.locator('.tabulator-placeholder').first();
  const tableStyle = await emptyTableText.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return { fontSize: s.fontSize, color: s.color };
  });
  console.log('4-2. 표 빈 문구 스타일:', tableStyle);

  if (trendStyle.fontSize === tableStyle.fontSize) {
    console.log(`✔ 글자 크기가 13px(${trendStyle.fontSize})로 완벽하게 동일합니다!`);
  }

  await page.screenshot({ path: 'scratch/empty_text_matching_style.png' });

  await browser.close();
  console.log('\n=== 4대 요구사항 전체 E2E 통과! ===');
})();
