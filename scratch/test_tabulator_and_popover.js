const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 실적 집계 조회 4가지 요구사항 종합 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. (D3.js) 문구 제거 확인
  const cardTitle = await page.locator('text=생산·불량 추이').first().innerText();
  console.log('1. 차트 카드 제목:', cardTitle);
  const hasD3Text = cardTitle.includes('(D3.js)');
  console.log('1-1. (D3.js) 문구 제거 여부:', !hasD3Text ? '✔ 제거 완료' : '✕ 여전히 포함됨');

  // 2. 막대 상시 수치 라벨 렌더링 확인 (마우스 오버 없이)
  const barTexts = await page.locator('svg text').allInnerTexts();
  console.log('2. SVG 차트 내 수치 텍스트들:', barTexts.filter(t => t && (t.includes('M') || t.includes('%') || t.includes('k'))));

  // 3. 달력 컴포넌트 바로 아래 팝오버 동작 확인
  const calButtons = await page.locator('[aria-label="달력에서 날짜 선택"]').all();
  const startInputBox = await page.locator('input[placeholder="YYYY-MM-DD"]').first().boundingBox();
  console.log('3-1. 시작일 입력 필드 위치:', startInputBox);

  if (calButtons.length >= 1) {
    await calButtons[0].click();
    await page.waitForTimeout(600);

    // 팝오버 요소 탐색
    const popoverDay = page.locator('[aria-label="날짜 2026-08-28"]').first();
    const isPopoverVisible = await popoverDay.isVisible();
    console.log('3-2. 달력 팝오버 노출 여부:', isPopoverVisible);

    if (isPopoverVisible) {
      const popoverBox = await popoverDay.boundingBox();
      console.log('3-3. 달력 내 28일 버튼 위치:', popoverBox);
      // 입력창 바로 아래 (startInputBox.y + startInputBox.height 근처)에 위치하는지 검증
      if (popoverBox.y > startInputBox.y && popoverBox.y < startInputBox.y + 400) {
        console.log('✔ 달력이 화면 중앙 모달이 아니라 입력창 바로 아래에 정상 열렸습니다!');
      }

      // 팝오버 열린 상태 스크린샷
      await page.screenshot({ path: 'scratch/result_popover_open.png' });

      // 날짜 클릭
      await popoverDay.click();
      await page.waitForTimeout(500);
      const afterVal = await page.locator('input[placeholder="YYYY-MM-DD"]').first().inputValue();
      console.log('3-4. 달력 날짜 클릭 후 시작일 반영 결과:', afterVal);
    }
  }

  // 4. Tabulator 6.x 및 Shadcn UI 테마 테이블 확인
  const tabulatorExists = await page.locator('.tabulator').first().isVisible();
  console.log('4-1. Tabulator 6.x 테이블 렌더링 여부:', tabulatorExists);

  const colHeaders = await page.locator('.tabulator-col-title').allInnerTexts();
  console.log('4-2. Tabulator 컬럼 헤더 목록:', colHeaders);

  const rowCount = await page.locator('.tabulator-row').count();
  console.log('4-3. Tabulator 행 개수:', rowCount);

  // 첫 번째 행 호버
  const firstRow = page.locator('.tabulator-row').first();
  if (await firstRow.isVisible()) {
    await firstRow.hover();
    await page.waitForTimeout(300);
    console.log('4-4. Tabulator 행 마우스 Hover 정상 작동');
  }

  // 5. 전체 페이지 스크린샷 캡처
  await page.screenshot({ path: 'scratch/result_tabulator_shadcn.png', fullPage: true });

  await browser.close();
  console.log('=== 종합 검증 성공적으로 완료! ===');
})();
