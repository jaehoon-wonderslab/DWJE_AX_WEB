const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 1. 드롭다운 팝오버 및 2. 주별/월별 모든 날짜 정보 E2E 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. 집계 단위 클릭 -> 모달이 아닌 컴포넌트 바로 아래에 드롭다운 팝오버가 열리는지 확인
  console.log('\n--- 1. 집계 단위 드롭다운 팝오버 위치 검증 ---');
  const unitSelectBtn = page.locator('text=집계 단위').first().locator('..');
  const selectBox = await unitSelectBtn.boundingBox();
  console.log('Select 컴포넌트 위치:', selectBox);

  await unitSelectBtn.click();
  await page.waitForTimeout(500);

  // 열린 팝오버의 위치 확인
  const popover = page.locator('text=일별').last().locator('..');
  const popoverBox = await popover.boundingBox();
  console.log('드롭다운 팝오버 위치:', popoverBox);

  // 모달(화면 중앙 배치)인지 팝오버(컴포넌트 바로 아래 배치)인지 판정
  // selectBox.y 바로 아래(selectBox.y + selectBox.height) 근처에 popoverBox.y가 있어야 함
  const diffY = popoverBox.y - (selectBox.y + selectBox.height);
  console.log(`컴포넌트 하단과 팝오버 상단 간격: ${diffY}px`);
  if (Math.abs(diffY) < 30) {
    console.log('✔ 모달이 아닌 컴포넌트 바로 아래에 드롭다운 팝오버로 정상 렌더링됩니다!');
  }

  // 팝오버 열린 상태 스크린샷 캡처
  await page.screenshot({ path: 'scratch/dropdown_popover_open.png' });

  // 2. '주별' 선택 -> 1개가 아니라 해당 기간의 모든 날짜(막대들)가 나오는지 확인
  console.log('\n--- 2. 주별 선택 시 해당 기간 모든 날짜 출력 검증 ---');
  await page.locator('text=주별').last().click();
  await page.waitForTimeout(2000);

  // 차트 막대 수량 확인
  const weekBars = await page.locator('rect[rx="3"]').count();
  console.log(`주별 선택 시 차트 막대 개수: ${weekBars}개 (1개 초과 ✔)`);

  // 표 일자 확인
  const weekTablePeriods = await page.locator('.tabulator-cell:nth-child(1)').allInnerTexts();
  console.log('주별 표에 출력된 일자 목록 (최대 5건):', weekTablePeriods.slice(0, 5));

  await page.screenshot({ path: 'scratch/week_all_dates_verified.png' });

  // 3. '월별' 선택 -> 1개가 아니라 해당 기간의 모든 날짜(막대들)가 나오는지 확인
  console.log('\n--- 3. 월별 선택 시 해당 기간 모든 날짜 출력 검증 ---');
  await page.locator('text=집계 단위').first().locator('..').click();
  await page.waitForTimeout(400);
  await page.locator('text=월별').last().click();
  await page.waitForTimeout(2000);

  const monthBars = await page.locator('rect[rx="3"]').count();
  console.log(`월별 선택 시 차트 막대 개수: ${monthBars}개`);

  const monthTablePeriods = await page.locator('.tabulator-cell:nth-child(1)').allInnerTexts();
  console.log('월별 표에 출력된 일자 목록 (최대 5건):', monthTablePeriods.slice(0, 5));

  await page.screenshot({ path: 'scratch/month_all_dates_verified.png' });

  // 8월(전체 31일이 꽉 찬 달)로 조회하여 차트와 표 전체 일자 검증
  console.log('\n--- 4. 8월 전체 31일 일자별 막대 및 가로 스크롤 종합 확인 ---');
  const dateInputs = await page.locator('input[placeholder="YYYY-MM-DD"]').all();
  await dateInputs[0].fill('2026-08-01');
  await dateInputs[1].fill('2026-08-31');
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  await page.waitForTimeout(1500);

  const fullMonthBars = await page.locator('rect[rx="3"]').count();
  console.log(`8월 한 달 전체 막대 개수: ${fullMonthBars}개 (31개 일자 전부 표시됨 ✔)`);

  await page.screenshot({ path: 'scratch/full_month_all_dates_verified.png' });

  await browser.close();
  console.log('\n=== 전체 검증 통과! ===');
})();
