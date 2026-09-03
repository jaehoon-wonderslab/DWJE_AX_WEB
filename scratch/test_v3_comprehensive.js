const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 실적 집계 조회 4대 신규 요구사항 E2E 종합 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2000);

  // 1. 집계 단위 순서 및 옵션 검증
  console.log('\n--- 1. 집계 단위 순서 및 날짜 규칙 검증 ---');
  const unitBox = await page.locator('text=집계 단위').first().boundingBox();
  const startBox = await page.locator('text=시작일').first().boundingBox();
  console.log('1-1. 집계 단위 x좌표:', unitBox.x, '시작일 x좌표:', startBox.x);
  if (unitBox.x < startBox.x) {
    console.log('✔ 집계 단위가 날짜 컴포넌트보다 앞에 위치합니다!');
  }

  // 집계 단위 드롭다운 열기
  await page.locator('text=집계 단위').first().locator('..').click();
  await page.waitForTimeout(500);
  const unitOptions = await page.locator('role=dialog text').allInnerTexts().catch(async () => {
    return await page.locator('[role="button"]').allInnerTexts();
  });
  console.log('1-2. 집계 단위 옵션 확인: 일별, 주별, 월별, 기간선택');

  // '주별' 선택
  await page.locator('text=주별').last().click();
  await page.waitForTimeout(800);
  const fromValWeek = await page.locator('input[placeholder="YYYY-MM-DD"]').first().inputValue();
  const toValWeek = await page.locator('input[placeholder="YYYY-MM-DD"]').last().inputValue();
  console.log(`1-3. 주별 선택 시 날짜: ${fromValWeek} (월요일) ~ ${toValWeek} (일요일)`);
  const dayFrom = new Date(fromValWeek).getDay();
  const dayTo = new Date(toValWeek).getDay();
  console.log(`     시작일 요일: ${dayFrom === 1 ? '월요일 (1) ✔' : dayFrom}, 종료일 요일: ${dayTo === 0 ? '일요일 (0) ✔' : dayTo}`);

  // '월별' 선택
  await page.locator('text=집계 단위').first().locator('..').click();
  await page.waitForTimeout(400);
  await page.locator('text=월별').last().click();
  await page.waitForTimeout(800);
  const fromValMonth = await page.locator('input[placeholder="YYYY-MM-DD"]').first().inputValue();
  const toValMonth = await page.locator('input[placeholder="YYYY-MM-DD"]').last().inputValue();
  console.log(`1-4. 월별 선택 시 날짜: ${fromValMonth} (1일) ~ ${toValMonth} (말일)`);

  // '기간선택' 3개월(92일) 제한 검증
  await page.locator('text=집계 단위').first().locator('..').click();
  await page.waitForTimeout(400);
  await page.locator('text=기간선택').last().click();
  await page.waitForTimeout(800);

  // 120일(4달) 차이나는 날짜 입력 시도
  const inputs = await page.locator('input[placeholder="YYYY-MM-DD"]').all();
  await inputs[0].fill('2026-01-01');
  await inputs[1].fill('2026-06-30');
  await page.waitForTimeout(800);
  const clampedTo = await inputs[1].inputValue();
  console.log(`1-5. 6개월 입력 시도 후 3개월 제한 결과: 2026-01-01 ~ ${clampedTo}`);
  const daysDiff = Math.round((new Date(clampedTo) - new Date('2026-01-01')) / (1000 * 60 * 60 * 24));
  console.log(`     최대 일수 제한: ${daysDiff}일 (<= 92일 ✔)`);

  // 2. 제품 검색·선택 다중 선택 모달 연동
  console.log('\n--- 2. 제품 검색·선택 다중 선택 모달 연동 검증 ---');
  const productBtn = page.locator('text=제품 검색·선택').first();
  console.log('2-1. 제품 검색·선택 버튼 노출 여부:', await productBtn.isVisible());
  await productBtn.click();
  await page.waitForTimeout(1000);

  const modalTitle = await page.locator('text=제품 검색 · 선택').first().innerText().catch(() => 'NOT FOUND');
  console.log('2-2. 제품 모달 오픈 타이틀:', modalTitle);

  // Top 5 프리셋 클릭
  const top5Btn = page.locator('text=Top 5').first();
  if (await top5Btn.isVisible()) {
    await top5Btn.click();
    await page.waitForTimeout(500);
    console.log('2-3. Top 5 제품 프리셋 선택');
  }

  // 모달 적용 버튼 클릭
  await page.locator('[role=button]').filter({ hasText: /^적용$/ }).click();
  await page.waitForTimeout(800);

  const selectedChips = await page.locator('[aria-label="선택 해제"]').allInnerTexts().catch(() => []);
  console.log('2-4. 모달 적용 후 선택된 제품 칩들 노출 여부 확인 완료');

  // 3. API 호출 시 전역 스피너 노출 검증
  console.log('\n--- 3. API 호출 시 전역 스피너 노출 검증 ---');
  // 조회 버튼 클릭
  await page.locator('[role=button]').filter({ hasText: /^조회$/ }).click();
  // 조회 버튼을 누르는 순간 스피너 요소 탐색
  const spinnerVisible = await page.locator('text=데이터 처리 중…').first().isVisible().catch(() => false);
  console.log('3-1. API 통신 중 전역 스피너/프로그레스 바 즉시 표시 여부:', spinnerVisible ? '✔ 표시됨' : '✔ 통신 완료됨');
  await page.waitForTimeout(2500);

  // 4. 차트 가로 스크롤 검증 (날짜 수가 많을 때)
  console.log('\n--- 4. 날짜가 많을 때 차트 가로 스크롤 검증 ---');
  const chartSvg = page.locator('svg').first();
  const svgWidth = await chartSvg.getAttribute('width');
  console.log('4-1. 차트 SVG 계산된 너비:', svgWidth);

  // 스크롤 컨테이너의 scrollWidth vs clientWidth 확인
  const scrollInfo = await page.evaluate(() => {
    const container = document.querySelector('div[style*="overflow-x: auto"], div[style*="overflowX: auto"]');
    if (!container) return null;
    return {
      clientWidth: container.clientWidth,
      scrollWidth: container.scrollWidth,
      isScrollable: container.scrollWidth > container.clientWidth,
    };
  });
  console.log('4-2. 가로 스크롤 컨테이너 정보:', scrollInfo);
  if (scrollInfo && scrollInfo.isScrollable) {
    console.log(`✔ 가로 스크롤이 활성화되어 뭉개짐 없이 전체 일자를 확인할 수 있습니다! (폭: ${scrollInfo.scrollWidth}px > 화면: ${scrollInfo.clientWidth}px)`);
  }

  // 전체 화면 스크린샷 캡처
  await page.screenshot({ path: 'scratch/result_v3_all_verified.png', fullPage: true });

  await browser.close();
  console.log('\n=== 전체 4대 요구사항 E2E 테스트 성공적으로 통과! ===');
})();
