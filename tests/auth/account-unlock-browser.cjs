/*
 * 계정 잠금 안내 · 이메일 인증 잠금 해제 — 기획 09 AUD-16, 6.2 「AUD-16 인증 화면」 1~8
 *
 * page.route 로 잠금 응답을 흉내 내는 시험(1~5, 7)이 기본입니다.
 * 2026-10-02 R-17 로 SMTP 가 설정되어 mailEnabled=true(이메일 인증 해제)가 기본 기대값이고, false(전산팀 요청)는 예외 경로로만 봅니다.
 *  1. 로그인 401 E-AUTH-005 → 경고 상자에 가린 이메일 · 「이메일 인증으로 잠금 해제」, 누르면
 *     /forgot-password?mode=unlock&empNo=… 로 가고 사번이 채워져 있다. 비밀번호 칸은 비워진다
 *  2. mailEnabled=false → 단추 없이 「전산팀에 잠금 해제를 요청해 주세요」 문구만
 *  3. 잠금 해제 모드 제목 「계정 잠금 해제」, 1단계 입력은 사번 하나, POST /auth/unlock/request 를 부르고
 *     응답과 무관하게 2단계로 넘어간다
 *  4. 2단계 「인증 확인」 은 POST /auth/unlock/verify {empNo, code} (/auth/email/verify-code 를 부르지 않음)
 *  5. 3단계 완료 → 「잠금이 해제되었습니다…」, 「로그인 화면으로」 → /login
 *  7. 폭 390px 에서 경고 상자·단계 표시·단추가 잘리지 않는다
 *
 * 6(로컬 API 실호출)은 `LIVE_UNLOCK=1` 일 때만 돕니다 — 서버에 AUD-16(잠금·해제 API, 로컬 고정 코드 000000)이
 * 들어간 뒤 전용 시험 계정(T…)을 만들어 5회 틀려 잠그고 해제한 뒤 지웁니다. 시드 계정(10000 등)은 잠그지 않습니다.
 * 8(04-auth.spec.js 의 시드 계정 오입력 이전)은 tests/specs/04-auth.spec.js 에서 합니다.
 *
 * 실 API 모드 개발 서버에서 돌립니다(목 모드 번들은 네트워크를 쓰지 않습니다).
 * 실행: WEB_URL=http://localhost:8081 node tests/auth/account-unlock-browser.cjs
 *       LIVE_UNLOCK=1 API_URL=http://localhost:18081 WEB_URL=… node tests/auth/account-unlock-browser.cjs (앱의 8080 호출을 API_URL 로 돌립니다)
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { WEB } = require('../lib/browser');
const api = require('../lib/api');

const EMP = 'T9100001';
const MASKED = 'j***@dwje.co.kr';

function locked(mailEnabled) {
  return {
    status: 401,
    json: {
      success: false,
      code: 'E-AUTH-005',
      message: mailEnabled
        ? '비밀번호를 5회 잘못 입력해 계정이 잠겼습니다. 등록된 이메일로 인증하면 잠금을 해제할 수 있습니다.'
        : '비밀번호를 5회 잘못 입력해 계정이 잠겼습니다. 전산팀에 잠금 해제를 요청해 주세요.',
      error: { code: 'E-AUTH-005', message: '계정 잠금', field: null },
      data: { lockedAt: '2026-10-01 09:12:44', ...(mailEnabled ? { emailMasked: MASKED } : {}), mailEnabled, unlockPath: '/forgot-password?mode=unlock' },
    },
  };
}

/** 요소가 화면 폭 안에 들어 있는지 */
async function inViewport(page, locator, width) {
  const b = await locator.boundingBox();
  return !!b && b.x >= -1 && b.x + b.width <= width + 1;
}

async function routed() {
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const calls = [];
  let mailEnabled = true;
  // 등록하지 않은 호출은 빈 성공 — 실 서버로 새지 않게 합니다(로컬 API 가 멈춰 있어도 화면 시험은 돕니다)
  await page.route('**/api/v1/**', (route) => route.fulfill({ json: { success: true, code: 'SUCCESS', data: null } }));
  await page.route('**/api/v1/auth/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/.*\/api\/v1/, '');
    const body = req.method() === 'POST' ? req.postDataJSON() : null;
    calls.push({ path, body });
    if (path === '/auth/login') return route.fulfill(locked(mailEnabled));
    if (path === '/auth/unlock/request') return route.fulfill({ json: { success: true, data: { message: '잠긴 계정이면 등록된 이메일로 인증 코드를 보냈습니다. 메일함을 확인해 주세요.', expireMinutes: 5, resendAvailableInSec: 60 } } });
    if (path === '/auth/unlock/verify') return route.fulfill({ json: { success: true, data: { verificationToken: 'tok-unlock', expireMinutes: 10 } } });
    if (path === '/auth/unlock/complete') return route.fulfill({ json: { success: true, data: { empNo: EMP, message: '잠금이 해제되었습니다. 새 비밀번호로 로그인해 주세요.' } } });
    return route.continue();
  });

  try {
    // 1. 잠금 응답 → 경고 · 해제 단추 · 비밀번호 비움
    await page.goto(`${WEB}/login`);
    const id = page.getByPlaceholder('예) 10004');
    await id.waitFor({ timeout: 60000 });
    // R-17(2026-10-02): SMTP 가 설정되어 이메일 잠금 해제가 기본 경로입니다 — 평소 안내도 그 문구
    assert(await page.getByText('잠긴 계정은 이메일 인증으로 풀 수 있습니다', { exact: false }).count(), '로그인 안내: 이메일 인증 해제');
    await id.fill(EMP);
    await page.getByPlaceholder('비밀번호', { exact: true }).fill('Wrong!2026');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    const unlockBtn = page.getByRole('button', { name: '이메일 인증으로 잠금 해제', exact: true });
    await unlockBtn.waitFor();
    assert(await page.getByText(MASKED, { exact: false }).count(), '경고 상자에 가린 이메일');
    assert.equal(await page.getByPlaceholder('비밀번호', { exact: true }).inputValue(), '', '비밀번호 칸을 비운다');

    // 7-a. 390px — 경고 상자 · 단추가 잘리지 않음
    await page.setViewportSize({ width: 390, height: 860 });
    await page.waitForTimeout(300);
    assert(await inViewport(page, unlockBtn, 390), '390px 에서 잠금 해제 단추');
    assert(await inViewport(page, page.getByText(MASKED, { exact: false }).first(), 390), '390px 에서 경고 상자');
    await page.setViewportSize({ width: 1280, height: 900 });

    // 2. mailEnabled=false → 단추 없음 · 전산팀 요청 문구
    mailEnabled = false;
    await page.getByPlaceholder('비밀번호', { exact: true }).fill('Wrong!2026');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.getByText('전산팀에 잠금 해제를 요청해 주세요', { exact: false }).first().waitFor();
    assert.equal(await unlockBtn.count(), 0, 'SMTP 미제공이면 해제 단추를 그리지 않는다');
    assert.equal(await page.getByText(MASKED, { exact: false }).count(), 0, '가린 이메일도 보이지 않는다');
    mailEnabled = true;
    await page.getByPlaceholder('비밀번호', { exact: true }).fill('Wrong!2026');
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await unlockBtn.waitFor();

    // 1-b. 해제 단추 → /forgot-password?mode=unlock&empNo=…
    await unlockBtn.click();
    await page.waitForURL(/\/forgot-password\?/);
    const url = new URL(page.url());
    assert.equal(url.searchParams.get('mode'), 'unlock');
    assert.equal(url.searchParams.get('empNo'), EMP);

    // 3. 잠금 해제 모드 1단계 — 제목 · 사번만 · unlock/request
    await page.getByText('계정 잠금 해제', { exact: true }).first().waitFor();
    assert.equal(await page.getByPlaceholder('예) 10001').inputValue(), EMP, '사번이 채워져 있다');
    assert.equal(await page.getByPlaceholder('예) 10001@dwje.co.kr').count(), 0, '1단계 입력은 사번 하나');
    await page.waitForTimeout(300);
    // 7-b. 390px — 단계 표시 · 단추
    await page.setViewportSize({ width: 390, height: 860 });
    await page.waitForTimeout(300);
    assert(await inViewport(page, page.getByRole('button', { name: '인증 코드 받기', exact: true }), 390), '390px 1단계 단추');
    assert(await inViewport(page, page.getByText('사번 확인', { exact: true }).first(), 390), '390px 단계 표시');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: '인증 코드 받기', exact: true }).click();
    const code = page.getByPlaceholder('메일로 받은 6자리 숫자');
    await code.waitFor();
    const req = calls.find((c) => c.path === '/auth/unlock/request');
    assert.deepEqual(req?.body, { empNo: EMP }, 'unlock/request 본문 {empNo}');
    assert(await page.getByText('메일이 오지 않으면 전산팀에 잠금 해제를 요청하세요.', { exact: true }).count(), '2단계 안내');

    // 4. 2단계 — unlock/verify {empNo, code}, 공용 verify-code 는 부르지 않음
    await code.fill('000000');
    await page.getByRole('button', { name: '인증 확인', exact: true }).click();
    await page.getByPlaceholder('8자 이상').waitFor();
    const ver = calls.find((c) => c.path === '/auth/unlock/verify');
    assert.deepEqual(ver?.body, { empNo: EMP, code: '000000' }, 'unlock/verify 본문');
    assert(!calls.some((c) => c.path === '/auth/email/verify-code'), '공용 이메일 검증 경로를 부르지 않는다');

    // 5. 3단계 완료 → 완료 문구 → 로그인 화면
    await page.getByPlaceholder('8자 이상').fill('Unlock!2026a');
    await page.getByPlaceholder('한 번 더 입력해 주세요').fill('Unlock!2026a');
    await page.getByRole('button', { name: '잠금 해제하고 비밀번호 변경', exact: true }).click();
    await page.getByText('잠금이 해제되었습니다. 새 비밀번호로 로그인해 주세요.', { exact: false }).first().waitFor();
    const done = calls.find((c) => c.path === '/auth/unlock/complete');
    assert.deepEqual(done?.body, { verificationToken: 'tok-unlock', newPassword: 'Unlock!2026a', newPasswordConfirm: 'Unlock!2026a' });
    await page.getByRole('button', { name: '로그인 화면으로', exact: true }).click();
    await page.waitForURL(/\/login/);

    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: 잠금 안내(가린 이메일·해제 단추·비밀번호 비움·SMTP 미제공 문구), 잠금 해제 3단계(request→verify→complete), 완료→로그인, 390px');
  } finally {
    await browser.close();
  }
}

/** 6. 로컬 API 실호출 — 전용 시험 계정을 잠그고 고정 코드 000000 으로 해제 (LIVE_UNLOCK=1) */
async function live() {
  const post = async (path, body, token) => {
    const res = await fetch(`${api.BASE}/api/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  const admin = (await api.login('admin')).accessToken;
  // 전용 시험 계정 — 등록 이메일이 있어야 잠금 해제 코드가 나가므로 회원가입 흐름(로컬 고정 코드)으로 만들고 승인합니다
  const empNo = `T9${String(Date.now()).slice(-6)}`;
  const email = `${empNo.toLowerCase()}@dwje.co.kr`;
  const CODE = process.env.TEST_VERIFY_CODE || '000000';
  const get = async (path) => (await fetch(`${api.BASE}/api/v1${path}`)).json();
  const depts = (await get('/auth/signup/depts')).data?.depts || [];
  await post('/auth/email/send-code', { email, purpose: 'SIGNUP' });
  const token = (await post('/auth/email/verify-code', { email, purpose: 'SIGNUP', code: CODE })).body?.data?.verificationToken;
  const made = await post('/auth/signup', { empNo, name: '잠금시험', deptId: depts[0]?.deptId, pos: 'STAFF', email, verificationToken: token, password: 'Test!2026a', passwordConfirm: 'Test!2026a' });
  if (!made.body?.success) throw new Error(`시험 계정을 만들지 못했습니다: ${made.body?.message}`);
  await post(`/system/users/${empNo}/approve`, { approve: true }, admin);
  try {
    let last;
    for (let i = 0; i < 5; i += 1) last = await post('/auth/login', { loginId: empNo, password: `Wrong!${i}abc` });
    assert.equal(last.body.code, 'E-AUTH-005', `5회째 잠금: ${JSON.stringify(last.body)}`);
    const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
    const page = await browser.newPage();
    // 앱 번들은 localhost:8080 을 부릅니다 — API_URL(예: 1단계 서버 18081)로 돌립니다
    const target = new URL(api.BASE);
    if (target.host !== 'localhost:8080') {
      await page.route('http://localhost:8080/**', (r) => r.continue({ url: r.request().url().replace('localhost:8080', target.host) }));
    }
    try {
      await page.goto(`${WEB}/forgot-password?mode=unlock&empNo=${empNo}`);
      await page.getByRole('button', { name: '인증 코드 받기', exact: true }).click();
      await page.getByPlaceholder('메일로 받은 6자리 숫자').fill(process.env.TEST_VERIFY_CODE || '000000');
      await page.getByRole('button', { name: '인증 확인', exact: true }).click();
      await page.getByPlaceholder('8자 이상').fill('Unlock!2026a');
      await page.getByPlaceholder('한 번 더 입력해 주세요').fill('Unlock!2026a');
      await page.getByRole('button', { name: '잠금 해제하고 비밀번호 변경', exact: true }).click();
      await page.getByText('잠금이 해제되었습니다', { exact: false }).first().waitFor({ timeout: 20000 });
    } finally {
      await browser.close();
    }
    const ok = await post('/auth/login', { loginId: empNo, password: 'Unlock!2026a' });
    assert.equal(ok.status, 200, '새 비밀번호로 로그인');
    console.log('PASS(live): 시험 계정 5회 실패 잠금 → 이메일 인증 해제 → 새 비밀번호 로그인');
  } finally {
    await api.cleanup([['DELETE', `/system/users/${empNo}`]], '잠금 시험 계정').catch(() => {});
  }
}

(async () => {
  await routed();
  if (process.env.LIVE_UNLOCK === '1') await live();
  else console.log('SKIP(live): LIVE_UNLOCK=1 일 때만 로컬 API 로 실제 잠금·해제를 시험합니다(서버 AUD-16 적용 후)');
})().catch((e) => { console.error(e); process.exitCode = 1; });
