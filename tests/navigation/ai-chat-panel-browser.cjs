const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

(async () => {
  const { browser, page } = await open('admin');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${WEB}/dashboard/ai`);
    await page.locator('a[href="/menu/system"]').waitFor({ timeout: 60000 });
    await page.goto(`${WEB}/menu/system`);
    await page.getByText('계정·권한·기준값·연동 이력 등 운영 설정 화면을 선택합니다.', { exact: true }).waitFor();

    await page.getByRole('button', { name: 'AI 채팅 열기' }).click();
    await page.getByText('현재 보고 있는 화면에서 바로 물어볼 수 있습니다.', { exact: true }).waitFor();
    await page.getByText('이 화면에서 무엇을 확인할 수 있는지 알려줘', { exact: true }).waitFor();
    await page.getByText('이 화면의 현재 데이터를 분석해서 요약해줘', { exact: true }).waitFor();

    const input = page.getByPlaceholder('생산 실적 · 불량 현황 · 로트 이력을 물어보세요');
    const compactWidth = (await input.boundingBox()).width;
    assert.ok(compactWidth < 500, `최소 패널 입력창 너비: ${compactWidth}`);

    await page.getByRole('button', { name: '전체 너비' }).click();
    const fullWidth = (await input.boundingBox()).width;
    assert.ok(fullWidth > 700, `전체 패널 입력창 너비: ${fullWidth}`);

    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await input.waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, compactWidth, fullWidth, contextualQuestions: true }));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
