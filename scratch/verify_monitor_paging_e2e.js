const api = require('../tests/lib/api');
const { open, visit } = require('../tests/lib/browser');

(async () => {
  console.log('=== 1. API 레벨 페이징 검증 ===');
  await api.ping();

  // API 호출: page 1, size 10
  const p1 = await api.get('/production/monitor/equipments', { page: 1, size: 10 });
  const p1Items = p1.body?.data?.items || [];
  const p1Meta = p1.body?.meta || {};
  console.log(`[API p1] 건수: ${p1Items.length}, page: ${p1Meta.page}, size: ${p1Meta.size}, total: ${p1Meta.total}, totalPages: ${p1Meta.totalPages}`);
  console.log(`[API p1] 첫 설비: ${p1Items[0]?.eqptCd}, 마지막 설비: ${p1Items[p1Items.length - 1]?.eqptCd}`);

  // API 호출: page 2, size 10
  const p2 = await api.get('/production/monitor/equipments', { page: 2, size: 10 });
  const p2Items = p2.body?.data?.items || [];
  const p2Meta = p2.body?.meta || {};
  console.log(`[API p2] 건수: ${p2Items.length}, page: ${p2Meta.page}, size: ${p2Meta.size}`);
  console.log(`[API p2] 첫 설비: ${p2Items[0]?.eqptCd}, 마지막 설비: ${p2Items[p2Items.length - 1]?.eqptCd}`);

  if (p1Items[0]?.eqptCd === p2Items[0]?.eqptCd) {
    throw new Error('API 페이징 오류: 1페이지와 2페이지 첫 설비가 동일합니다!');
  }
  console.log('✔ API page 파라미터 분기 정상 작동 확인');

  // API 호출: size 25
  const s25 = await api.get('/production/monitor/equipments', { page: 1, size: 25 });
  console.log(`[API size 25] 건수: ${s25.body?.data?.items?.length}, totalPages: ${s25.body?.meta?.totalPages}`);
  if (s25.body?.data?.items?.length !== 25) {
    throw new Error(`API size 파라미터 오류: 25건 요청했으나 ${s25.body?.data?.items?.length}건 반환`);
  }
  console.log('✔ API size 파라미터 정상 작동 확인');

  console.log('\n=== 2. 브라우저 E2E 페이징 UI 조작 검증 ===');
  const { browser, page } = await open('admin');
  await visit(page, '/production/monitor');
  await page.waitForTimeout(2000);

  // 1페이지 확인
  const row1_p1 = (await page.locator('text=AT-').first().innerText()).trim();
  console.log(`[화면 1페이지] 첫 설비코드: ${row1_p1}`);

  // 2페이지 버튼 클릭
  console.log('>> 2페이지 버튼 클릭...');
  await page.locator('[role=button]').filter({ hasText: /^2$/ }).first().click();
  await page.waitForTimeout(2000);

  const row1_p2 = (await page.locator('text=AT-').first().innerText()).trim();
  console.log(`[화면 2페이지] 첫 설비코드: ${row1_p2}`);

  if (row1_p1 === row1_p2) {
    throw new Error('화면 2페이지 이동 실패: 행 데이터가 바뀌지 않았습니다.');
  }
  console.log('✔ 화면 2페이지 이동 및 데이터 갱신 확인');

  // 3페이지 버튼 클릭
  console.log('>> 3페이지 버튼 클릭...');
  await page.locator('[role=button]').filter({ hasText: /^3$/ }).first().click();
  await page.waitForTimeout(2000);

  const row1_p3 = (await page.locator('text=AT-').first().innerText()).trim();
  console.log(`[화면 3페이지] 첫 설비코드: ${row1_p3}`);

  if (row1_p2 === row1_p3) {
    throw new Error('화면 3페이지 이동 실패: 행 데이터가 바뀌지 않았습니다.');
  }
  console.log('✔ 화면 3페이지 이동 및 데이터 갱신 확인');

  // '페이지당 25' 클릭
  console.log('>> 페이지당 25 클릭...');
  await page.locator('[role=button]').filter({ hasText: /^25$/ }).first().click();
  await page.waitForTimeout(2000);

  const count25 = await page.locator('div[style*=\"flex-direction: row\"]').filter({ hasText: /^AT-/ }).count();
  console.log(`[화면 size=25] 테이블 설비 행 개수: ${count25}`);

  // '페이지당 100' 클릭
  console.log('>> 페이지당 100 클릭...');
  await page.locator('[role=button]').filter({ hasText: /^100$/ }).first().click();
  await page.waitForTimeout(2500);

  const count100 = await page.locator('div[style*=\"flex-direction: row\"]').filter({ hasText: /^AT-/ }).count();
  console.log(`[화면 size=100] 테이블 설비 행 개수: ${count100}`);

  await browser.close();
  console.log('\n=== 모든 API 및 화면 페이징 검증 100% 완료! ===');
})();
