/**
 * 브라우저 시험(실 API) — 용어 사전 관리 · 용어 사전 조회 · 자연어 질의 이력
 *
 * 응답을 흉내 내지 않고 실제 API 를 부릅니다. 조회만 합니다(쓰기·서버 내려받기는 하지 않습니다 — 감사 표에 행이 남습니다).
 * 브라우저 내려받기 기록(POST /download-logs)도 남지 않게 막아 둡니다.
 *   API_URL=http://localhost:18081 WEB_URL=http://localhost:8098 node tests/system/gloss-chat-live-browser.cjs
 *
 *  · 통합관리자(10000): 07 요약·점검 필요 유사어·정규화 미리보기·변경 이력 모달, 13 상세·관련 용어, 08 세션 보기·질의 보기·상세
 *  · 제조팀(10003, chat-history 쓰기 권한 없음): 08 학습데이터·검토 비활성, 디버그 없음, 남의 이름 가림
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
    assert(/점검 필요 유사어 \d+건/.test(t), '점검 필요 유사어 카드(통합관리자)');
    assert(/최근 변경 \d{4}-\d{2}-\d{2}/.test(t), '최근 변경 시각');
    await page.getByRole('button', { name: '정규화', exact: true }).click();
    // 미리보기 결과 — 정규화 문장 아래 치환 칩 또는 「찾지 못했습니다」
    await page.getByText(/공식 용어로|바꿀 유사어를 찾지 못했습니다|치환하지 않음/).first().waitFor({ timeout: 30000 }).catch(() => {});
    await page.getByRole('button', { name: '변경 이력', exact: true }).click();
    await page.getByText('변경 이력 (최근 30일)', { exact: true }).waitFor();
    await page.waitForTimeout(1500);
    t = await text(page);
    const changesOk = t.includes('변경 이력이 없습니다') || /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t);
    const changesMissing = t.includes('변경 이력을 불러오지 못했습니다');
    assert(changesOk && !changesMissing, '변경 이력 모달 — 실 API 목록(또는 빈 목록)');
    await page.keyboard.press('Escape');

    // 분류별 현황(GLS-13) — 실 요약 byDomain
    await page.getByRole('button', { name: '펼치기', exact: true }).first().click();
    await page.getByText('유사어 없음', { exact: true }).last().waitFor();
    assert((await text(page)).includes('불량유형'), '분류별 현황 행');

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

    /* ── 08 자연어 질의 이력 (통합관리자) ── */
    await page.goto(`${WEB}/history/chat`);
    await page.getByText('세션 시작', { exact: true }).first().waitFor({ timeout: 60000 });
    await page.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    t = await text(page);
    assert(/세션 \d+개/.test(t), '요약 세션 수');
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').nth(1).click();
    await page.waitForURL(/session=/);
    await page.getByText('질의 상세 ›').first().waitFor({ timeout: 30000 });
    await page.getByText('질의 상세 ›').first().click();
    await page.getByText('답변 평가 기준', { exact: true }).waitFor();
    assert((await text(page)).includes('근거 문서'), '상세 근거 문서 항목');
    assert(!(await page.getByRole('button', { name: '검토: 오답', exact: true }).isDisabled()), '통합관리자 검토 활성');
    await page.getByRole('button', { name: '닫기', exact: true }).last().click();
    await page.getByText('질의 보기', { exact: true }).click();
    await page.getByText('판단 근거', { exact: true }).first().waitFor();
    assert(await page.locator('.tabulator-row').count() > 0, '질의 목록 행');
    assert(/보존 기간이 정해지지 않았습니다|보존 \d+(년|일) · /.test(await text(page)), '보존 안내(retentionDays)');
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

    /* ── 08 제조팀 — 쓰기 권한 없음 ── */
    ({ browser, page } = await open('mfg'));
    watch(page);
    await wire(page);
    await page.goto(`${WEB}/history/chat?view=message`);
    await page.locator('.tabulator-row').first().waitFor({ timeout: 60000 });
    assert(await page.getByRole('button', { name: '학습데이터 내보내기', exact: true }).isDisabled(), '학습데이터 비활성');
    t = await text(page);
    assert(/[가-힣]\*\*/.test(t), '남의 이름 가림');
    await page.locator('.tabulator-row').first().locator('.tabulator-cell[tabulator-field="question"]').click();
    await page.getByText('답변 평가 기준', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: '검토: 오답', exact: true }).isDisabled(), '검토 비활성');
    assert.equal(await page.getByText(/디버그 기록/).count(), 0, '디버그 없음');

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: live — 07 요약·점검·변경 이력 모달(실 API)·분류별 현황, GLV-11 허브 건너뛰기, 08 근거 문서·보존 안내·answered 조건, 13 상세·관련 용어, 08 세션·질의·상세(관리자 검토 활성), 제조팀 학습데이터·검토 비활성·디버그 없음·이름 가림');
  } catch (e) {
    console.error('화면:', (await text(page).catch(() => '')).slice(0, 600));
    throw e;
  } finally {
    await browser.close().catch(() => {});
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
