/**
 * API 일관성 검증 — 같은 사실을 여러 API 가 같게 말하는가
 *
 * 화면은 여러 API 를 섞어 한 장면을 만듭니다. 그래서 API 끼리 어긋나면
 * 사용자는 "같은 날짜인데 화면마다 숫자가 다르다" 를 겪습니다.
 * 여기서는 **API 응답만으로** 서로 맞아야 하는 관계를 확인합니다.
 *
 * 실패하면 웹이 아니라 API 쪽 확인이 필요한 항목입니다.
 */
const { suite, test, beforeAll, eq, ok, skip } = require('../lib/runner');
const api = require('../lib/api');
const meta = require('../lib/appmeta');
const { fixtures } = require('../lib/fixtures');

suite('API 일관성', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.f = await fixtures();
  });

  test('같은 날짜의 불량률이 품질·공정·AI 대시보드에서 같다', async () => {
    const d = ctx.f.baseDate;
    const [q, p, a] = await Promise.all([
      api.data('/quality/defects/summary', { from: d, to: d }),
      api.data('/dashboard/process/summary', { date: d }),
      api.data('/dashboard/ai/summary', { date: d }),
    ]);
    eq(q.defectRate, p.defectRate, '품질 화면과 공정 대시보드의 불량률');
    eq(q.defectRate, a.defectRate, '품질 화면과 AI 대시보드의 불량률');
    eq(q.ngQty, p.ngQty, '불량 수량');
    eq(q.totalQty, a.todayQty, '총 생산량');
  });

  test('불량률이 수량으로 다시 계산해도 맞는다', async () => {
    const d = ctx.f.baseDate;
    const q = await api.data('/quality/defects/summary', { from: d, to: d });
    const recomputed = q.totalQty > 0 ? Math.round((q.ngQty / q.totalQty) * 10000) / 100 : 0;
    eq(q.defectRate, recomputed, '불량률 = 불량수량 ÷ 총생산량 × 100 이어야 합니다');
  });

  test('수율과 불량률의 합이 100 이다', async () => {
    const f = ctx.f;
    const y = await api.data('/reports/yield-by-model', { yearMonth: f.yearMonth });
    const s = y.summary || {};
    if (s.yield === null || s.defectRate === null) return; // 실적이 없으면 검사 대상 아님
    const sum = Math.round((s.yield + s.defectRate) * 100) / 100;
    ok(Math.abs(sum - 100) <= 0.02, `수율 ${s.yield} + 불량률 ${s.defectRate} = ${sum} (100 이어야 합니다)`);
  });

  test('유형 합계가 불량 수량과 맞는다', async () => {
    const f = ctx.f;
    const [sum, byType] = await Promise.all([
      api.data('/quality/defects/summary', { from: f.monthFrom, to: f.monthTo }),
      api.data('/quality/defects/by-type', { from: f.monthFrom, to: f.monthTo }),
    ]);
    const total = (byType.items || []).reduce((a, b) => a + (b.cnt || 0), 0);
    const gap = sum.ngQty - total;
    eq(gap, 0,
      `by-type 의 cnt 합(${total})과 summary 의 ngQty(${sum.ngQty})가 ${Math.abs(gap)} 만큼 다릅니다.\n` +
      '      불량 수량은 라벨이력, 유형 구성은 불량이력에서 나오는데 기간 필터를 각 테이블에\n' +
      '      따로 걸면 두 집합이 어긋납니다(MES_QUERY_GUIDE 2-3). 유형 수량을 라벨 불량에\n' +
      '      안분(2-4)하면 합이 맞습니다. → API 확인 필요');
  });

  test('유형 비중(%)의 분모가 불량 수량이다', async () => {
    const f = ctx.f;
    const [sum, byType] = await Promise.all([
      api.data('/quality/defects/summary', { from: f.monthFrom, to: f.monthTo }),
      api.data('/quality/defects/by-type', { from: f.monthFrom, to: f.monthTo }),
    ]);
    const top = (byType.items || [])[0];
    ok(top, '유형이 하나도 없습니다');

    const expected = Math.round((top.cnt / sum.ngQty) * 10000) / 100;
    const shownSum = (byType.items || []).reduce((a, b) => a + (b.cnt || 0), 0);
    eq(top.ratio, expected,
      `'${top.defectType}' 비중이 불량 수량 기준과 다릅니다.\n` +
      `      불량 수량 ${sum.ngQty} 을 분모로 하면 ${expected}% 인데 API 는 ${top.ratio}% 입니다.\n` +
      `      표시된 유형 합계 ${shownSum} 를 분모로 쓰고 있어, 유형이 붙지 않은 몫만큼 비중이 부풀려집니다. → API 확인 필요`);
  });

  test('공정별 실적의 합이 전사 실적을 넘지 않는다', async () => {
    const d = ctx.f.baseDate;
    const [all, byProc] = await Promise.all([
      api.data('/dashboard/ai/summary', { date: d }),
      api.data('/dashboard/ai/process-yield', { date: d }),
    ]);
    const sum = (byProc.items || []).reduce((a, b) => a + (b.qty || 0), 0);
    ok(sum <= all.todayQty + 1, `공정 합계 ${sum} 이 전사 ${all.todayQty} 를 넘습니다`);
  });

  test('공정별 보유 기간이 전사 기간 안에 있다', async () => {
    const all = await api.data('/common/data-range', { plantCd: 'PL01' });
    const wrong = [];
    for (const wc of [ctx.f.processId, 'W110', 'W150'].filter(Boolean)) {
      const one = await api.data('/common/data-range', { plantCd: 'PL01', processId: wc });
      if (one.processId !== wc) wrong.push(`${wc}: processId 를 되돌려 주지 않습니다`);
      if (one.fromDate < all.fromDate || one.toDate > all.toDate) {
        wrong.push(`${wc}: ${one.fromDate}~${one.toDate} 이 전사 ${all.fromDate}~${all.toDate} 밖입니다`);
      }
    }
    eq(wrong, []);
  });

  test('공정 기준일에는 그 공정의 실적이 있다', async () => {
    const wrong = [];
    for (const wc of [ctx.f.processId, 'W110', 'W150'].filter(Boolean)) {
      const range = await api.data('/common/data-range', { plantCd: 'PL01', processId: wc });
      const s = await api.data('/dashboard/process/summary', { date: range.toDate, processId: wc });
      if (!(s.qty > 0)) wrong.push(`${wc}: 마지막 실적일 ${range.toDate} 인데 생산량이 ${s.qty} 입니다`);
    }
    eq(wrong, [], 'data-range 의 toDate 는 그 공정에 실적이 있는 마지막 날이어야 합니다');
  });

  test('등록되지 않은 공정 코드는 404 로 알려 준다', async () => {
    const { status, body } = await api.get('/dashboard/process/summary', { date: ctx.f.baseDate, processId: 'NOPE' });
    eq(status, 404, '조용히 0건을 주면 화면이 왜 비었는지 알 수 없습니다');
    eq(body.code, 'E-NOTFOUND');
  });

  test('/auth/me 의 화면 권한이 권한 관리 화면과 같다', async () => {
    // 두 API 가 같은 사실(이 부서가 어느 화면에 들어갈 수 있는가)을 말합니다.
    // 어긋나면 관리자가 준 권한인데 화면이 안 열립니다 — 실제로 하위 화면 4개가 그랬습니다.
    const me = await api.data('/auth/me');
    const mp = await api.data('/system/menu-perms');
    const deptId = me.deptId ?? me.user?.deptId ?? 1;
    const granted = mp.matrix?.[String(deptId)] || mp.matrix?.[deptId] || [];
    if (!granted.length) skip('권한 행렬에서 내 부서를 찾지 못했습니다');

    const mine = new Set(me.menuPerms || []);
    const missing = granted.filter((id) => !mine.has(id));
    eq(missing, [],
      '권한 관리 화면은 허용인데 /auth/me 가 빠뜨린 화면입니다.\n' +
      '      웹은 menuPerms 로 접근을 막으므로 이 화면들은 아무도 못 들어갑니다.');
  });

  test('등록된 모든 화면이 최소 한 부서에서는 열린다', async () => {
    // 어느 부서에서도 열리지 않는 화면은 만들어 놓고 닿을 수 없는 화면입니다.
    const mp = await api.data('/system/menu-perms');
    const screens = (mp.screens || []).map((x) => x.id);
    const reachable = new Set(Object.values(mp.matrix || {}).flat());
    const orphan = screens.filter((id) => !reachable.has(id));
    eq(orphan, [], '어느 부서에도 권한이 없는 화면입니다');

    // 화면 정의(웹)와 화면 마스터(서버)가 어긋나도 닿을 수 없게 됩니다
    const webIds = meta.screens().map((s2) => s2.id);
    const onlyWeb = webIds.filter((id) => !screens.includes(id));
    const onlyServer = screens.filter((id) => !webIds.includes(id));
    eq(onlyWeb, [], '웹에만 있는 화면 — 서버 권한 목록에 없어 열리지 않습니다');
    eq(onlyServer, [], '서버에만 있는 화면 — 웹에 경로가 없습니다');
  });
});
