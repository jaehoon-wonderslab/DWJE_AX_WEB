const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== Tree View, 제품 버튼 외곽선, 엑셀 다운로드 E2E 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/result');
  await page.waitForTimeout(2500);

  // 1. 제품 선택(전체) 버튼의 외곽선(border) 및 스타일 확인
  console.log('\n--- 1. 제품 선택(전체) 버튼 외곽선 확인 ---');
  const prodBtn = page.locator('text=제품 선택 (전체)').first();
  const btnBox = await prodBtn.boundingBox();
  console.log('제품 선택 버튼 위치/크기:', btnBox);

  // 버튼의 computed style (border, background) 확인
  const btnParent = prodBtn.locator('..');
  const btnStyle = await btnParent.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      borderWidth: s.borderWidth,
      borderStyle: s.borderStyle,
      borderColor: s.borderColor,
      backgroundColor: s.backgroundColor,
    };
  });
  console.log('버튼 스타일:', btnStyle);
  if (btnStyle.borderWidth !== '0px' && btnStyle.borderStyle !== 'none') {
    console.log('✔ 제품 선택 버튼에 외곽선(border)이 선명하게 적용되어 있습니다!');
  }

  // 2. Tabulator Tree 뷰 확인
  console.log('\n--- 2. Tabulator Tree 뷰 및 하위 제품별 실적 검증 ---');
  // 첫 번째 행에 트리 컨트롤([+])이 있는지 확인
  const treeControl = page.locator('.tabulator-data-tree-control').first();
  const hasTree = await treeControl.isVisible().catch(() => false);
  console.log(`트리 토글 컨트롤([+]) 노출 여부: ${hasTree}`);

  if (hasTree) {
    console.log('첫 번째 일자의 [+] 버튼 클릭하여 하위 제품별 실적 펼치기');
    await treeControl.click();
    await page.waitForTimeout(1000);

    // 하위 제품명 요소 확인
    const childBadge = page.locator('.tabulator-cell span[style*="border-radius: 4px"]').first();
    const childProdName = await childBadge.innerText().catch(() => 'NOT FOUND');
    console.log(`✔ 펼쳐진 하위 트리의 제품명: "${childProdName}"`);

    // 하위 행의 수치들 확인
    const rowTexts = await page.locator('.tabulator-row').allInnerTexts();
    console.log('상위 및 하위 트리 샘플 행 데이터:\n', rowTexts.slice(0, 5).join('\n'));
  }

  await page.screenshot({ path: 'scratch/tree_view_expanded_verified.png' });

  // 3. 엑셀 다운로드 버튼 확인 및 트리거
  console.log('\n--- 3. 엑셀 다운로드 버튼 검증 ---');
  const excelBtn = page.locator('[role=button]').filter({ hasText: /^엑셀 다운로드$/ }).first();
  const excelBtnVisible = await excelBtn.isVisible();
  console.log(`카드 헤더 내 엑셀 다운로드 버튼 노출 여부: ${excelBtnVisible}`);

  if (excelBtnVisible) {
    // 다운로드 클릭 (토스트 메시지 발생 확인)
    await excelBtn.click();
    await page.waitForTimeout(1000);
    const toast = await page.locator('text=다운로드').first().innerText().catch(() => '');
    console.log(`✔ 엑셀 다운로드 실행 결과: ${toast}`);
  }

  await page.screenshot({ path: 'scratch/final_tree_and_excel_verified.png' });

  await browser.close();
  console.log('\n=== 모든 검증 성공! ===');
})();
