const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 날짜 직접 입력 및 Datepicker 달력 모달 동작 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. 키보드로 날짜 직접 입력 테스트
  const inputs = await page.locator('input[placeholder="YYYY-MM-DD"]').all();
  console.log('날짜 입력창 개수:', inputs.length);
  if (inputs.length >= 2) {
    const startInput = inputs[0];
    await startInput.click();
    await startInput.fill('');
    await startInput.fill('2026-08-10');
    console.log('1. 시작일 직접 타이핑 완료:', await startInput.inputValue());
  }

  // 2. 우측 달력 아이콘 버튼 클릭하여 Datepicker 달력 열기
  const calButtons = await page.locator('[aria-label="달력에서 날짜 선택"]').all();
  console.log('달력 아이콘 버튼 개수:', calButtons.length);
  if (calButtons.length >= 1) {
    console.log('>> 시작일 달력 아이콘 클릭...');
    await calButtons[0].click();
    await page.waitForTimeout(600);

    // 달력 모달 노출 확인
    const modalVisible = await page.locator('text=년').first().isVisible();
    console.log('2. 달력 모달 노출 여부:', modalVisible);

    // 달력 모달 스크린샷 캡처
    await page.screenshot({ path: 'scratch/datepicker_modal_open.png' });
    console.log('달력 모달 스크린샷 캡처 완료');

    // 달력에서 '2026-08-25'일 클릭
    const day25 = page.locator('[aria-label="날짜 2026-08-25"]').first();
    if (await day25.isVisible()) {
      console.log('>> 달력에서 2026-08-25 클릭...');
      await day25.click();
      await page.waitForTimeout(600);

      const updatedVal = await inputs[0].inputValue();
      console.log('3. 달력 클릭 후 시작일 반영 결과:', updatedVal);
    }
  }

  // 3. 종료일 달력 열고 '오늘' 버튼 클릭 테스트
  if (calButtons.length >= 2) {
    console.log('>> 종료일 달력 아이콘 클릭...');
    await calButtons[1].click();
    await page.waitForTimeout(600);

    const todayBtn = page.locator('text=오늘').first();
    if (await todayBtn.isVisible()) {
      console.log('>> 달력에서 [오늘] 버튼 클릭...');
      await todayBtn.click();
      await page.waitForTimeout(600);

      const updatedToVal = await inputs[1].inputValue();
      console.log('4. [오늘] 클릭 후 종료일 반영 결과:', updatedToVal);
    }
  }

  // 4. '조회' 버튼 클릭하여 선택된 날짜로 정상 조회되는지 확인
  console.log('>> 조회 버튼 클릭...');
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  await page.waitForTimeout(2500);

  const pagingText = await page.locator('text=건 중').first().innerText().catch(() => 'NOT FOUND');
  console.log('5. 조회 후 페이징 결과:', pagingText);

  // 최종 스크린샷
  await page.screenshot({ path: 'scratch/datepicker_applied_result.png', fullPage: true });

  await browser.close();
  console.log('=== Datepicker 검증 완료! ===');
})();
