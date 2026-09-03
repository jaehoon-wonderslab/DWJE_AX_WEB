/**
 * 인증 — 로그인 · 회원가입 · 비밀번호 찾기 · 가입 승인
 *
 * 계정을 실제로 만들었다 지우므로 로컬 개발 DB 에서만 돌리세요.
 * 만든 계정은 테스트 끝에 반려 처리해 로그인할 수 없게 만듭니다.
 */
const { suite, test, beforeAll, afterAll, skip, ok, eq, contains } = require('../lib/runner');
const api = require('../lib/api');

const BASE = api.BASE;
const post = async (path, body, token) => {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

/**
 * 테스트에서 쓸 인증 코드를 구합니다.
 *
 * 우선순위
 *  1. `TEST_VERIFY_CODE` — 서버가 로컬에서 **고정 코드**를 쓰도록 설정한 경우 (권장)
 *     application-local.yml 에 `app.security.email-verification.fixed-code: "000000"` 같은
 *     설정이 있으면 테스트가 코드를 알아낼 필요가 없습니다.
 *  2. 서버 로그 — LOG 모드에서 찍힌 코드를 받는 사람으로 골라 읽습니다.
 *     로그에는 여러 사람 코드가 섞여 있어 마지막 줄만 읽으면 남의 코드를 집습니다.
 *
 * @param {string} email 받는 사람
 * @returns {string|null} 6자리 코드
 */
function readMailCode(email) {
  if (process.env.TEST_VERIFY_CODE) return process.env.TEST_VERIFY_CODE;
  const fs = require('fs');
  // local 프로파일은 고정 코드를 씁니다 (app.security.email-verification.fixed-code)
  const LOCAL_FIXED = '000000';
  const candidates = [process.env.API_LOG, '/private/tmp/api.log', '/private/tmp/fin2.log'].filter(Boolean);
  for (const p of candidates) {
    let txt;
    try { txt = fs.readFileSync(p, 'utf8'); } catch { continue; }
    // '받는 사람 : <email>' 부터 그 뒤 '인증 코드 : NNNNNN' 까지를 한 묶음으로 봅니다
    const re = new RegExp(`받는 사람\\s*:\\s*${email.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}[\\s\\S]{0,300}?인증 코드\\s*:\\s*(\\d{6})`, 'g');
    const all = [...txt.matchAll(re)];
    if (all.length) return all[all.length - 1][1];
  }
  return LOCAL_FIXED;
}

suite('인증 흐름', () => {
  const ctx = { made: [] };

  beforeAll(async () => {
    await api.ping();
    ctx.admin = (await api.login('admin')).accessToken;
  });

  afterAll(async () => {
    // 테스트로 만든 계정은 지웁니다.
    // 예전엔 반려(approve:false)만 했는데, 승인 검사가 먼저 통과시켜 놓은 계정이라
    // 반려가 먹지 않고 계정이 그대로 쌓였습니다(18건까지 늘어난 적이 있습니다).
    await api.cleanup(ctx.made.map((empNo) => ['DELETE', `/system/users/${empNo}`]), '테스트 계정');
  });

  test('시드 계정 6종이 모두 로그인된다', async () => {
    const fails = [];
    for (const key of Object.keys(api.ACCOUNTS)) {
      try { await api.login(key); } catch (e) { fails.push(`${key}: ${e.message}`); }
    }
    eq(fails, [], '시드 계정 비밀번호가 바뀌었거나 계정이 정지되었습니다');
  });

  test('사번 없음과 비밀번호 오류의 문구가 같다 (계정 열거 방지)', async () => {
    const a = await post('/auth/login', { loginId: '99999999', password: 'Whatever!1' });
    const b = await post('/auth/login', { loginId: '10000', password: 'WrongPass!1' });
    eq(a.status, 401);
    eq(b.status, 401);
    eq(a.body.message, b.body.message, '두 경우를 구분할 수 있으면 사번을 캐낼 수 있습니다');
  });

  test('내 정보에 메뉴·데이터 권한이 함께 온다', async () => {
    const me = await api.data('/auth/me');
    ok(Array.isArray(me.menuPerms) && me.menuPerms.length > 0, 'menuPerms 가 비면 사이드바를 그릴 수 없습니다');
    ok(Array.isArray(me.dataPerms), 'dataPerms 가 있어야 마스킹을 판정합니다');
  });

  test('토큰 갱신이 동작한다', async () => {
    const { refreshToken } = await api.login('admin');
    const r = await post('/auth/refresh', { refreshToken });
    eq(r.status, 200);
    ok(r.body?.data?.accessToken, '갱신 응답에 새 accessToken 이 있어야 세션이 이어집니다');
  });

  test('위조 토큰은 401 로 거절된다', async () => {
    const res = await fetch(`${BASE}/api/v1/auth/me`, { headers: { Authorization: 'Bearer bogus.bogus.bogus' } });
    eq(res.status, 401);
  });

  test('401 응답에도 CORS 헤더가 있다 (없으면 브라우저가 응답을 막습니다)', async () => {
    const res = await fetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer bogus.bogus.bogus', Origin: 'http://localhost:8081' },
    });
    ok(res.headers.get('access-control-allow-origin'),
      '401 에 CORS 헤더가 없으면 브라우저가 응답을 차단해 화면이 상태 코드를 볼 수 없습니다.\n' +
      '      토큰 만료를 감지하지 못하고 빈 화면이 됩니다 — 인증 필터의 에러 응답에도 헤더를 실어야 합니다.');
  });

  test('회원가입 3단계가 이어진다 (사번 확인 → 이메일 인증 → 신청)', async () => {
    const empNo = `T${Date.now().toString().slice(-7)}`;
    const email = `${empNo.toLowerCase()}@dwje.co.kr`;

    const chk = await api.data('/auth/signup/check-emp-no', { empNo });
    eq(chk.available, true, '새 사번은 사용 가능해야 합니다');

    const depts = await api.data('/auth/signup/depts');
    ok(depts.depts?.length > 0, '가입 가능 부서가 있어야 합니다');
    ok(!depts.depts.some((d) => d.deptNm === '통합관리자'), '통합관리자는 스스로 신청할 수 없어야 합니다');

    const sent = await post('/auth/email/send-code', { email, purpose: 'SIGNUP' });
    eq(sent.status, 200);
    contains(sent.body.data.email, '*', '응답 이메일은 마스킹되어야 합니다');
    eq(sent.body.data.resendAvailableInSec > 0, true, '재발송 대기 시간을 알려 줘야 합니다');

    const code = readMailCode(email);
    if (!code) {
      skip('인증 코드를 알 수 없습니다. 둘 중 하나를 갖추면 이 테스트가 돕니다.\n' +
        '      (권장) 서버가 로컬에서 고정 코드를 쓰게 하고 그 값을 알려 주기\n' +
        '             application-local.yml → app.security.email-verification.fixed-code: "000000"\n' +
        '             TEST_VERIFY_CODE=000000 npm test\n' +
        '      (대안) API 서버 출력을 파일로 남기고 경로 알려 주기\n' +
        '             API_LOG=/tmp/api.log npm test');
    }

    // 일부러 틀린 코드 — 실제 코드와 겹치면 안 됩니다 (로컬 고정 코드가 000000 입니다)
    const wrongCode = code === '999999' ? '888888' : '999999';
    const wrong = await post('/auth/email/verify-code', { email, purpose: 'SIGNUP', code: wrongCode });
    eq(wrong.status, 400, '틀린 코드는 거절되어야 합니다');
    eq(wrong.body.error?.field, 'code', '어느 입력란의 문제인지 알려 줘야 합니다');

    const verified = await post('/auth/email/verify-code', { email, purpose: 'SIGNUP', code });
    eq(verified.status, 200);
    const token = verified.body.data.verificationToken;
    ok(token, '검증에 성공하면 1회용 토큰을 줘야 합니다');

    // 비밀번호 정책 위반 — 토큰은 살아 있어야 합니다 (@Transactional 롤백)
    const weak = await post('/auth/signup', {
      empNo, name: '자동테스트', deptId: depts.depts[0].deptId, pos: 'STAFF',
      email, verificationToken: token, password: 'short', passwordConfirm: 'short',
    });
    eq(weak.status, 400, '짧은 비밀번호는 거절되어야 합니다');

    const okRes = await post('/auth/signup', {
      empNo, name: '자동테스트', deptId: depts.depts[0].deptId, pos: 'STAFF',
      email, verificationToken: token, password: 'Test!2026', passwordConfirm: 'Test!2026',
    });
    eq(okRes.status, 200, '입력값만 고치면 같은 토큰으로 다시 신청할 수 있어야 합니다 (토큰 소모는 롤백됨)');
    eq(okRes.body.data.state, 'PENDING', '가입 즉시 로그인되면 안 됩니다');
    ctx.made.push(empNo);
    ctx.pendingEmpNo = empNo;

    const login = await post('/auth/login', { loginId: empNo, password: 'Test!2026' });
    eq(login.status, 401, '승인 전에는 로그인할 수 없어야 합니다');
    contains(login.body.message, '승인');
  });

  test('가입 승인하면 로그인된다', async () => {
    const empNo = ctx.pendingEmpNo;
    if (!empNo) skip('앞의 회원가입 테스트가 끝까지 가지 못했습니다 (인증 코드를 읽을 수 없는 환경)');

    const pending = await api.data('/system/users/pending');
    ok((pending.items || []).some((u) => u.empNo === empNo), '승인 대기 목록에 있어야 합니다');

    const ap = await post(`/system/users/${empNo}/approve`, { approve: true }, ctx.admin);
    eq(ap.status, 200);
    eq(ap.body.data.state, 'ACTIVE');

    const login = await post('/auth/login', { loginId: empNo, password: 'Test!2026' });
    eq(login.status, 200, '승인 후에는 로그인되어야 합니다');
  });

  test('인증 코드 재발송 제한이 걸린다', async () => {
    // 비밀번호 찾기는 계정 열거를 막으려고 제한을 삼키고 늘 200 을 줍니다.
    // 그래서 제한이 실제로 도는지는 열거 보호가 필요 없는 회원가입 발송에서 확인합니다.
    // 여기까지 200 이 되면 무제한 발송이 열린 것입니다.
    const email = `limitprobe${Date.now().toString().slice(-6)}@dwje.co.kr`;
    const first = await post('/auth/email/send-code', { email, purpose: 'SIGNUP' });
    eq(first.status, 200, `첫 발송이 실패합니다: ${first.body?.message}`);

    const again = await post('/auth/email/send-code', { email, purpose: 'SIGNUP' });
    eq(again.status, 409, '연속 발송이 막히지 않으면 메일 폭탄에 쓰일 수 있습니다');
    contains(again.body?.message || '', '초', `대기 시간을 알려 줘야 합니다: "${again.body?.message}"`);
  });

  test('비밀번호 찾기는 없는 계정에도 같은 응답을 준다 (계정 열거 방지)', async () => {
    // 특정 상태 코드가 아니라 '밖에서 구분이 되는가' 를 봅니다.
    // 실재 계정만 발송 제한(409)에 걸리면, 아무 사번이나 두 번 던져 실재 여부를 알아낼 수 있습니다.
    //
    // 실재 계정은 시드 6종을 돌려 씁니다. 한 주소에만 몰면 일일 발송 상한에 닿는데,
    // 이 API 는 제한을 삼키고 200 을 주도록 되어 있어(열거 방지) 테스트가 그 사실을 알 수 없습니다.
    // 그러면 검사가 조용히 통과만 하고 아무것도 확인하지 않는 상태가 됩니다.
    const keys = Object.keys(api.ACCOUNTS);
    const pick = api.ACCOUNTS[keys[new Date().getHours() % keys.length]];
    const real = await post('/auth/password/forgot', { empNo: pick.empNo, email: `${pick.empNo}@dwje.co.kr` });
    const fake = await post('/auth/password/forgot', { empNo: '99999999', email: 'nobody@dwje.co.kr' });

    eq(real.status, fake.status,
      '실재 계정과 없는 계정의 상태 코드가 다릅니다 — 이것만으로 계정 존재 여부를 알아낼 수 있습니다.\n' +
      `      실재 ${pick.empNo} → ${real.status} ${real.body?.code || ''} ${real.body?.message || ''}\n` +
      `      가짜 99999999 → ${fake.status} ${fake.body?.code || ''} ${fake.body?.message || ''}\n` +
      '      발송 제한 판정을 계정 존재 여부와 분리해야 합니다.');

    const msg = (r) => r.body?.data?.message || r.body?.message;
    eq(msg(real), msg(fake), '문구가 다르면 계정 존재 여부가 드러납니다');
  });
});
