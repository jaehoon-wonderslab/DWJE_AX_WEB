const { open, visit } = require('../tests/lib/browser');
(async () => {
  const { browser, page } = await open('admin');
  await visit(page, '/system/product-rank');
  await page.waitForTimeout(2000);

  // 첫 번째 행의 요소들 위치 확인
  const upBtn = await page.locator('text=▲').first().boundingBox();
  const downBtn = await page.locator('text=▼').first().boundingBox();
  const detailBtn = await page.locator('text=제품 순서').first().boundingBox();
  
  // 드롭다운 위치
  const selectBtn = await page.locator('div[tabindex="0"], [role="button"]').filter({ hasText: /^1$/ }).first().boundingBox();

  console.log('--- 기본 상태 위치 ---');
  console.log('▲:', upBtn);
  console.log('▼:', downBtn);
  console.log('순위 셀렉트:', selectBtn);
  console.log('제품 순서 버튼:', detailBtn);

  if (selectBtn && detailBtn) {
    const selectRight = selectBtn.x + selectBtn.width;
    const detailLeft = detailBtn.x;
    console.log(`셀렉트 우측 끝: ${selectRight}, 상세 좌측 시작: ${detailLeft}, 여백: ${detailLeft - selectRight}px`);
    if (selectRight > detailLeft) {
      console.error('ERROR: 여전히 겹칩니다!');
    } else {
      console.log('SUCCESS: 겹치지 않고 충분한 여백이 있습니다.');
    }
  }

  // 제품 순서 버튼 클릭해서 펼침 테스트
  await page.locator('text=제품 순서').first().click();
  await page.waitForTimeout(1500);

  const subTable = await page.locator('text=제품군 내 순서').first().boundingBox();
  console.log('펼쳐진 서브 테이블 헤더:', subTable);

  const closeBtn = await page.locator('text=닫기').first().boundingBox();
  console.log('닫기 버튼:', closeBtn);

  await page.screenshot({ path: 'scratch/product_rank_opened.png', fullPage: true });
  await browser.close();
})();
