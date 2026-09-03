const { open, visit } = require('../tests/lib/browser');
(async () => {
  const { browser, page } = await open('admin');
  await visit(page, '/production/monitor');
  await page.waitForTimeout(2000);

  // 상단 스크린샷
  await page.screenshot({ path: 'scratch/monitor_redesign_top.png' });

  // 첫 번째 페이지 데이터 확인
  const page1FirstRow = (await page.locator('text=AT-').first().innerText()).trim();
  const page1Info = (await page.locator('text=전체').first().innerText()).trim();
  console.log('1페이지 첫 행 설비코드:', page1FirstRow);
  console.log('1페이지 정보 텍스트:', page1Info);

  // 하단 스크롤 후 스크린샷
  await page.locator('text=전체').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/monitor_redesign_bottom.png' });

  // 2페이지 버튼 클릭
  console.log('>>> 2페이지 버튼 클릭');
  await page.locator('[role=button]').filter({ hasText: /^2$/ }).first().click();
  await page.waitForTimeout(2500);

  const page2FirstRow = (await page.locator('text=AT-').first().innerText()).trim();
  const page2Info = (await page.locator('text=전체').first().innerText()).trim();
  console.log('2페이지 첫 행 설비코드:', page2FirstRow);
  console.log('2페이지 정보 텍스트:', page2Info);

  if (page1FirstRow === page2FirstRow) {
    console.error('ERROR: 2페이지로 넘어갔는데 데이터가 바뀌지 않았습니다!');
  } else {
    console.log('SUCCESS: 2페이지 이동 시 데이터가 올바르게 갱신되었습니다!');
  }

  // 페이지당 25건 버튼 클릭
  console.log('>>> 페이지당 25건 클릭');
  await page.locator('[role=button]').filter({ hasText: /^25$/ }).first().click();
  await page.waitForTimeout(2500);

  const rows25 = await page.locator('div[style*=\"flex-direction: row\"]').filter({ hasText: /AT-/ }).count();
  const size25Info = (await page.locator('text=전체').first().innerText()).trim();
  console.log('25건 선택 시 행 개수:', rows25);
  console.log('25건 선택 시 정보 텍스트:', size25Info);

  await browser.close();
})();
