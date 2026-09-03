const { open, visit } = require('../tests/lib/browser');
(async () => {
  const { browser, page } = await open('admin');
  await visit(page, '/production/monitor');
  await page.waitForTimeout(2000);

  // Pagination 위치 찾기
  const paginationEl = await page.locator('text=페이지당').first();
  await paginationEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/pagination_perfect.png' });

  console.log('Pagination 스크린샷 캡처 완료');
  await browser.close();
})();
