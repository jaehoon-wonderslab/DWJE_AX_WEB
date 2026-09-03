/**
 * 전 화면 렌더 — 36개 화면이 실 API 로 깨지지 않고 그려지는가
 *
 * 확인하는 것
 *  · 자바스크립트 오류(빈 화면의 가장 흔한 원인)
 *  · 콘솔 오류
 *  · 4xx/5xx 응답 (파라미터·권한 문제)
 *  · 로딩에서 멈춤 (데이터 없음과 로딩을 구분하지 못하는 화면)
 *  · 권한 있는 화면인데 되돌려 보내지는지
 */
const { suite, test, beforeAll, afterAll, eq, ok } = require('../lib/runner');
const api = require('../lib/api');
const meta = require('../lib/appmeta');
const { open, visit } = require('../lib/browser');

suite('전 화면 렌더', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    const me = await api.data('/auth/me');
    ctx.perms = new Set(me.menuPerms || []);
    ctx.screens = meta.screens().filter((s) => ctx.perms.has(s.id));
    ctx.blocked = meta.screens().filter((s) => !ctx.perms.has(s.id));

    const b = await open('admin');
    ctx.browser = b.browser;
    ctx.page = b.page;

    // 한 번만 돌고 결과를 재사용합니다 (화면마다 다시 열면 느립니다)
    ctx.results = [];
    for (const s of ctx.screens) {
      ctx.results.push({ screen: s, ...(await visit(ctx.page, s.path)) });
    }
  });

  afterAll(async () => {
    if (ctx.browser) await ctx.browser.close();
  });

  test('자바스크립트 오류가 없다', () => {
    const bad = ctx.results
      .filter((r) => r.errors.some((e) => e.startsWith('CRASH')))
      .map((r) => `${r.screen.path} — ${r.errors.find((e) => e.startsWith('CRASH'))}`);
    eq(bad, [], '화면이 통째로 비는 가장 흔한 원인입니다');
  });

  test('콘솔 오류가 없다', () => {
    const bad = ctx.results.filter((r) => r.errors.length).map((r) => `${r.screen.path} — ${r.errors[0]}`);
    eq(bad, []);
  });

  test('4xx·5xx 응답이 없다', () => {
    const bad = ctx.results.filter((r) => r.failed.length).map((r) => `${r.screen.path} — ${r.failed.join(', ')}`);
    eq(bad, []);
  });

  test('로딩에서 멈추지 않는다', () => {
    const bad = ctx.results.filter((r) => r.stuck).map((r) => r.screen.path);
    eq(bad, [], '데이터가 없을 때도 로딩이 계속되면 사용자는 고장으로 봅니다');
  });

  test('권한 있는 화면이 되돌려 보내지지 않는다', () => {
    const bad = ctx.results.filter((r) => r.url !== r.screen.path).map((r) => `${r.screen.path} → ${r.url}`);
    eq(bad, []);
  });

  test('화면마다 제목이 그려진다', () => {
    const bad = ctx.results
      .filter((r) => !r.text.includes(r.screen.name) && r.text.length < 500)
      .map((r) => `${r.screen.path} (${r.screen.name})`);
    eq(bad, [], '제목조차 없으면 렌더가 멈춘 것입니다');
  });

  test('권한이 없는 화면은 기본 화면으로 되돌아간다', async () => {
    if (!ctx.blocked.length) return; // 통합관리자는 전 화면 권한이라 대상이 없을 수 있습니다
    const target = ctx.blocked[0];
    const r = await visit(ctx.page, target.path);
    ok(r.url !== target.path, `${target.path} 는 권한이 없는데 그대로 열렸습니다`);
  });
});
