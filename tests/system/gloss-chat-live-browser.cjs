/**
 * 브라우저 시험(실 API) — 용어 사전 관리 · 용어 사전 조회 · 자연어 질의 이력
 *
 * 응답을 흉내 내지 않고 실제 API 를 부릅니다. 조회만 합니다(쓰기·서버 내려받기는 하지 않습니다 — 감사 표에 행이 남습니다).
 * 브라우저 내려받기 기록(POST /download-logs)도 남지 않게 막아 둡니다.
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8098 node tests/system/gloss-chat-live-browser.cjs
 *
 *  · 통합관리자(10000): 07 요약·변경 이력 모달, 13 상세·관련 용어, 08 전사 자연어 질의 이력(세션 보기·질의 보기·응답 조건·학습데이터)
 *  · 제조팀(10003): /history/chat 본인 질의 — 관리 기능 없음, 전사 질의 이력 진입 불가
 */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

const REAL_API = process.env.API_URL || 'http://localhost:8080';
const APP_API = process.env.APP_API_URL || 'http://localhost:8080';

async function wire(page) {
  if (REAL_API !== APP_API) await page.route(`${APP_API}/**`, (r) => r.continue({ url: r.request().url().replace(APP_API, REAL_API) }));
  await page.route('**/api/v1/download-logs', (r) => (r.request().method() === 'POST'
    ? r.fulfill({ json: { success: true, code: 'SUCCESS', message: '기록했습니다.', data: {} } })
    : r.continue({ url: r.request().url().replace(APP_API, REAL_API) })));
}

const text = (page) => page.evaluate(() => document.body.innerText);

(async () => {
  let { browser, page } = await open('admin');
  const errors = [];
  const watch = (p) => p.on('pageerror', (e) => errors.push(e.message));
  watch(page);
  try {
    await wire(page);

    /* ── 07 용어 사전 관리 (통합관리자) ── */
    await page.goto(`${WEB}/system/glossary`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    let t = await text(page);
    assert(/공식 용어\s*\n\s*571/.test(t) || /공식 용어\s*\n\s*\d+/.test(t), '요약 공식 용어 수');
    // 점검 필요 알림 줄 · 최근 변경 부제 · 정규화 미리보기 카드 · 분류는 뺐습니다(2026-10-03)
    assert(!/점검 필요 유사어 \d+건/.test(t), '점검 필요 알림 줄 없음');
    assert(!t.includes('용어 정규화 미리보기'), '정규화 미리보기 카드 없음');
    assert(!/분류별 현황/.test(t), '분류별 현황 없음');
    await page.getByRole('button', { name: '변경 이력', exact: true }).click();
    await page.getByText('변경 이력 (최근 30일)', { exact: true }).waitFor();
    await page.waitForTimeout(1500);
    t = await text(page);
    const changesOk = t.includes('변경 이력이 없습니다') || /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t);
    const changesMissing = t.includes('변경 이력을 불러오지 못했습니다');
    assert(changesOk && !changesMissing, '변경 이력 모달 — 실 API 목록(또는 빈 목록)');
    await page.keyboard.press('Escape');

    // 제거됨: 분류별 현황(GLS-13) 확인 — 카드는 2026-10-03 디자인 피드백으로, 분류는 같은 날 분류 삭제로 없앴습니다.
    // 대신 분류 열·분류 선택이 없는지 봅니다
    assert.equal(await page.locator('.tabulator-col[tabulator-field="domain"]').count(), 0, '분류 열 없음');
    assert.equal(await page.getByText('분류', { exact: true }).count(), 0, '분류 선택 없음');

    /* ── GLV-11 허브 건너뛰기 — 사이드바 「용어 사전」·「자연어 질의 이력」 은 바로 화면으로 ── */
    await page.getByLabel('용어 사전', { exact: true }).first().click();
    await page.waitForURL(/\/glossary\/view/, { timeout: 30000 });
    await page.getByLabel('자연어 질의 이력', { exact: true }).first().click();
    await page.waitForURL(/\/history\/chat/, { timeout: 30000 });
    await page.goto(`${WEB}/menu/glossary`);
    await page.getByText('용어 사전 조회', { exact: true }).first().waitFor({ timeout: 30000 });
    assert(/\/menu\/glossary/.test(page.url()), '허브 주소로 직접 들어오면 허브');

    /* ── 13 용어 사전 조회 ── */
    await page.goto(`${WEB}/glossary/view?term=101`);
    await page.getByText('관련 용어', { exact: true }).waitFor({ timeout: 60000 });
    assert(await page.locator('.tabulator-row').count() > 0, '목록 행');
    assert(await page.getByRole('button', { name: '용어 사전 관리로 이동', exact: true }).count(), '통합관리자는 관리 이동');

    /* ── 08 전사 자연어 질의 이력 (통합관리자 전용, 2026-10-03 — 관리 기능은 /history/chat 에서 이 화면으로 옮김) ── */
    await page.goto(`${WEB}/system/chat-history`);
    await page.locator('.tabulator-row, [role="row"]').nth(1).waitFor({ timeout: 60000 });
    await page.getByText('세션 보기', { exact: true }).first().click();
    await page.getByText('세션 시작', { exact: true }).first().waitFor({ timeout: 60000 });
    t = await text(page);
    assert(/세션 \d+개/.test(t), '요약 세션 수');
    await page.getByText('질의 보기', { exact: true }).first().click();
    await page.getByText('판단 근거', { exact: true }).first().waitFor();
    assert(await page.locator('.tabulator-row, [role="row"]').count() > 1, '질의 목록 행');
    assert(/보존 기간이 정해지지 않았습니다|보존 \d+(년|일)/.test(await text(page)), '보존 안내(retentionDays)');
    // CHH-10 응답 여부 조건 — 서버로 answered=N, 결과 행은 모두 미응답 사유가 있음
    const seen = [];
    page.on('request', (r) => { if (/\/ai\/chat\/history\?/.test(r.url())) seen.push(new URL(r.url()).searchParams.get('answered')); });
    // 「응답」 선택칸 — 라벨을 품은 칸 안의 누를 수 있는 상자를 엽니다(선택지는 body 포털)
    await page.evaluate(() => {
      const label = [...document.querySelectorAll('div')].find((el) => el.childElementCount === 0 && el.textContent === '응답');
      let box = label?.parentElement;
      while (box && !box.querySelector('[tabindex="0"]')) box = box.parentElement;
      box?.querySelector('[tabindex="0"]')?.click();
    });
    await page.getByText('미응답', { exact: true }).last().click();
    await page.waitForTimeout(2500);
    assert(seen.includes('N'), `answered=N 요청 ${JSON.stringify(seen)}`);
    assert(!(await page.getByRole('button', { name: '학습데이터 내보내기', exact: true }).isDisabled()), '학습데이터 활성');
    await browser.close();

    /* ── 08 제조팀 — /history/chat 은 본인 질의만, 관리 기능 없음 · 전사 화면은 열리지 않음 ── */
    ({ browser, page } = await open('mfg'));
    watch(page);
    await wire(page);
    await page.goto(`${WEB}/history/chat`);
    await page.getByText('질의 이력', { exact: true }).first().waitFor({ timeout: 60000 });
    t = await text(page);
    for (const gone of ['학습데이터 내보내기', '세션 보기', '사용자 그룹']) assert(!t.includes(gone), `본인 화면에 ${gone} 없음`);
    await page.goto(`${WEB}/system/chat-history`);
    await page.waitForTimeout(4000);
    assert(!/\/system\/chat-history/.test(page.url()), `제조팀은 전사 질의 이력으로 들어가지 못함: ${page.url()}`);

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: live — 07 요약·빠진 카드·변경 이력 모달(실 API)·분류 없음, GLV-11 허브 건너뛰기, 13 상세·관련 용어, 08 전사 질의 이력(세션·질의·보존 안내·answered 조건·학습데이터), 제조팀 본인 화면 관리 기능 없음·전사 화면 진입 불가');
  } catch (e) {
    console.error('화면:', (await text(page).catch(() => '')).slice(0, 600));
    throw e;
  } finally {
    await browser.close().catch(() => {});
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
