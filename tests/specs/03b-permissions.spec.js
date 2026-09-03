/**
 * 권한 — 부서별로 보이는 것과 가려지는 것
 *
 * 접근 권한은 계정이 아니라 부서에 붙습니다.
 * 여기서는 서버가 부서별로 다른 권한을 주는지, 그리고 그 권한이 실제 조회를 막는지 봅니다.
 */
const { suite, test, beforeAll, eq, ok } = require('../lib/runner');
const api = require('../lib/api');
const meta = require('../lib/appmeta');

suite('권한', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.me = {};
    for (const key of Object.keys(api.ACCOUNTS)) {
      ctx.me[key] = await api.data('/auth/me', {}, key);
    }
  });

  test('부서마다 메뉴 권한이 다르다', () => {
    const counts = Object.entries(ctx.me).map(([k, m]) => [k, (m.menuPerms || []).length]);
    const unique = new Set(counts.map(([, n]) => n));
    ok(unique.size > 1, `모든 부서의 권한 수가 같습니다 (${counts.map(([k, n]) => `${k}:${n}`).join(', ')})`);
  });

  test('통합관리자가 가장 많은 화면을 본다', () => {
    const admin = (ctx.me.admin.menuPerms || []).length;
    const others = Object.entries(ctx.me).filter(([k]) => k !== 'admin');
    const bigger = others.filter(([, m]) => (m.menuPerms || []).length > admin).map(([k]) => k);
    eq(bigger, [], '통합관리자보다 넓은 권한을 가진 부서가 있습니다');
  });

  test('메뉴 권한의 화면 ID 가 웹의 화면 정의와 일치한다', () => {
    const known = new Set(meta.screens().map((s) => s.id));
    const unknown = [...new Set(Object.values(ctx.me).flatMap((m) => m.menuPerms || []))]
      .filter((id) => !known.has(id));
    eq(unknown, [], '서버가 주는 화면 ID 를 웹이 모릅니다 — 그 화면은 열리지 않습니다');
  });

  test('웹 화면이 모두 서버 권한 목록에 존재한다', async () => {
    const perms = await api.data('/system/menu-perms');
    const server = new Set((perms.screens || []).map((s) => s.id));
    const missing = meta.screens().map((s) => s.id).filter((id) => !server.has(id));
    eq(missing, [], '권한을 부여할 수 없는 화면입니다 — 서버 화면 목록에 등록되어야 합니다');
  });

  test('권한 없는 화면을 조회하면 403 E-AUTH-002 로 막는다', async () => {
    // 품질보증팀에 없는 화면의 API 를 골라 부릅니다
    const qa = new Set(ctx.me.qa.menuPerms || []);
    if (qa.has('sys-audit')) return; // 권한 구성이 바뀌면 검사 대상이 아닙니다
    const { status, body } = await api.get('/audit-logs', {}, 'qa');
    eq(status, 403, '권한 없는 조회는 막혀야 합니다');
    eq(body.code, 'E-AUTH-002');
  });

  test('데이터 권한이 없으면 blindFields 로 알려 준다', () => {
    const qa = ctx.me.qa;
    ok(Array.isArray(qa.blindFields), 'blindFields 가 있어야 화면이 비공개 배지를 그립니다');
    const all = ['qty', 'yield', 'price', 'customer', 'plan', 'mold', 'worker'];
    const covered = new Set([...(qa.dataPerms || []), ...(qa.blindFields || [])]);
    const missing = all.filter((k) => !covered.has(k));
    eq(missing, [], '허용도 차단도 아닌 항목이 있으면 화면이 판정할 수 없습니다');
  });

  test('통합관리자는 가려지는 데이터가 없다', () => {
    eq(ctx.me.admin.blindFields || [], [], '통합관리자는 전 데이터를 봅니다');
  });

  test('계정 전환 대상은 통합관리자만 조회할 수 있다', async () => {
    const okRes = await api.get('/auth/switch-targets', {}, 'admin');
    eq(okRes.status, 200);
    const deny = await api.get('/auth/switch-targets', {}, 'mfg');
    ok(deny.status !== 200, '제조팀이 계정 전환 목록을 볼 수 있으면 안 됩니다');
  });
});
