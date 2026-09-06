/**
 * 필터가 실제로 동작하는가
 *
 * 조용히 무시되는 필터가 반복해서 나왔습니다.
 *  · 알림 목록이 state·target 을 보내는데 서버는 ackState·eqptCd 를 받고 있었습니다
 *  · 실적 집계의 품목 선택지가 화면에 박혀 있어 서버가 받는 코드와 달랐습니다
 *  · 실적 집계가 itemCd 로 제품 코드를 보내고 있었습니다 — 실적 품목 코드는 별개 체계라 늘 0건이었습니다
 *
 * 화면은 조용히 비거나 조용히 전체를 보여 주고, 사용자는 필터가 걸렸다고 믿습니다.
 * 그래서 "서버가 스스로 알려 준 값" 으로 걸었을 때
 *  ① 결과가 비지 않고 ② 전체와 달라지는가 를 봅니다.
 */
const { suite, test, beforeAll, eq, ok, skip } = require('../lib/runner');
const api = require('../lib/api');
const { fixtures } = require('../lib/fixtures');
const { open } = require('../lib/browser');

/**
 * 집계 단위 — 고른 단위로 **칸이 여러 개** 나와야 합니다
 *
 * 2026-09-06 이전에는 AI 통합 대시보드에서 단위를 바꿔도 API 호출이 한 건도 나가지
 * 않았습니다(날짜만 바뀌고 조회는 조회 버튼을 눌러야 했는데, 토스트는 "설정되었습니다"
 * 라고 했습니다). 게다가 주별은 이번 주 한 주, 월별은 이번 달 한 달이라
 * 추이 막대가 하나뿐이었습니다 — 단위를 바꿔도 그림이 그대로였습니다.
 *
 * [단위, 서버에 가는 unit, 나와야 하는 칸 수]
 * 화면이 일별로 떠 있으므로 **일별을 마지막에** 둡니다. 같은 단위를 다시 고르면 구간이
 * 그대로라 조회가 안 나가는 것이 맞습니다 — 그걸 실패로 잡으면 안 됩니다.
 */
const UNIT_CASES = [
  ['주별', 'week', 4],
  ['월별', 'month', 3],
  ['일별', 'day', 7],
];

/**
 * 비교할 값을 꺼냅니다 — 응답 모양이 제각각입니다.
 * 목록이면 그 배열을, 차트면 첫 계열의 값들을 씁니다
 * (차트는 labels 가 기간이라 필터를 걸어도 같습니다. 달라지는 건 값입니다).
 */
const listOf = (data, key) => {
  if (typeof key === 'function') return key(data) || [];
  return data?.[key] || data?.items || [];
};

/** 추이 응답에서 첫 계열의 값 배열 */
const seriesData = (d) => d?.series?.[0]?.data || [];

/**
 * 검사 대상 — [이름, 경로, 기본 파라미터, 필터 이름, 목록 키, 값 두 개, 행에서 확인할 필드]
 *
 * 필터 값은 서버에서 받아 온 실제 값이어야 합니다. 지어내면 0건이 나와도 필터 탓인지 알 수 없습니다.
 * 값을 두 개 두는 이유는, 서로 다른 값으로 걸었는데 결과가 같으면
 * 그때는 필터가 무시된 것이 확실하기 때문입니다.
 * (하나만 두고 "전체와 다른가" 로 보면, 그 값이 전체를 덮는 경우 오탐이 납니다 —
 *  설비 200대가 전부 STOPPED 인 경우가 실제로 있었습니다.)
 */
const CASES = (f) => [
  ['실적 집계 · 제품', '/production/results', { from: f.baseDate, to: f.baseDate, unit: 'day' }, 'modelCd', 'items', f.productCodes.slice(0, 2), null],
  ['실적 추이 · 제품', '/production/results/trend', { from: f.baseDate, to: f.baseDate, unit: 'day' }, 'modelCd', seriesData, f.productCodes.slice(0, 2), null],
  ['공정 불량 구성 · 공정', '/dashboard/process/defect-composition', { date: f.baseDate }, 'processId', 'segments', f.defectProcessIds.slice(0, 2), null],
  ['설비 현황 · 상태', '/production/monitor/equipments', { size: 200 }, 'state', 'items', f.equipmentStates.slice(0, 2), 'state'],
  ['설비 현황 · 모델', '/production/monitor/equipments', { size: 500 }, 'model', 'items', f.equipmentModels.slice(0, 2), 'model'],
  ['불량 현황 · 공정', '/quality/defects/by-type', { from: f.monthFrom, to: f.monthTo }, 'processId', 'items', f.defectProcessIds.slice(0, 2), null],
  ['제품별 수율 · 제품', '/reports/yield-by-model', { yearMonth: f.yearMonth }, 'modelCd', 'rows', f.madeProducts.slice(0, 2), null],
  ['질의 이력 · 부서', '/ai/chat/history', { size: 100 }, 'userGroup', 'items', f.deptNames.slice(0, 1), 'dept'],
  ['감사 로그 · 부서', '/audit-logs', { size: 200 }, 'userGroup', 'items', f.deptNames.slice(0, 2), 'dept'],
];

/**
 * 집계 단위 드롭다운에서 하나를 고릅니다 (네이티브 select 가 아니라 직접 그린 목록입니다)
 *
 * 고정 시간 대기를 쓰지 않습니다. 전체 검사를 함께 돌리면 브라우저가 여러 개 떠 있어
 * 렌더와 응답이 모두 늦어지는데, 2~6초로 박아 두면 그때만 실패해 원인을 찾기 어렵습니다.
 * 각 단계마다 "그 다음이 가능해질 때까지" 기다립니다.
 */
async function pickUnit(page, label) {
  const isLeaf = (t) => `[...document.querySelectorAll('div,span')].find((e) => e.textContent.trim() === ${JSON.stringify(t)} && e.children.length === 0)`;

  // 1) 라벨이 그려질 때까지
  await page.waitForFunction(`!!${isLeaf('집계 단위')}`, { timeout: 60000 });

  // 2) 목록이 열릴 때까지 — 한 번 눌러 안 열리면 다시 누릅니다
  for (let i = 0; i < 5; i += 1) {
    const open = await page.evaluate((t) => {
      const els = [...document.querySelectorAll('div,span')];
      // 목록이 열리면 고르지 않은 단위가 화면에 나타납니다
      return els.some((e) => e.textContent.trim() === t && e.children.length === 0);
    }, label);
    if (open) break;
    await page.evaluate(() => {
      const lab = [...document.querySelectorAll('div,span')]
        .find((e) => e.textContent.trim() === '집계 단위' && e.children.length === 0);
      lab.parentElement.children[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(500);
  }

  // 3) 고릅니다 — 목록 항목이 뒤에 붙으므로 마지막 것을 씁니다
  await page.evaluate((t) => {
    const opt = [...document.querySelectorAll('div,span')].reverse()
      .find((e) => e.textContent.trim() === t && e.children.length === 0);
    if (opt) opt.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, label);
}

/** 조건이 참이 될 때까지 기다립니다 (조회가 실제로 나가는 데 걸리는 시간이 들쭉날쭉합니다) */
async function waitFor(page, check, ms = 40000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (check()) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

suite('필터', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    const f = await fixtures();

    // 필터 값은 전부 서버에서 받아 옵니다
    const eqs = await api.data('/production/monitor/equipments', { size: 500 });
    const rows = eqs.items || [];
    const states = [...new Set(rows.map((x) => x.state).filter(Boolean))];
    const equipmentModels = [...new Set(rows.map((x) => x.model).filter(Boolean))];

    // 기준정보 공정 39개 중 특정 하루에 실적이 있는 건 일부뿐이고,
    // 생산이 있어도 불량이 0인 공정이 있습니다(S114 는 qty 559,420 · ngQty 0).
    // 불량 API 를 거를 때 그런 공정을 쓰면 0건이 나오는데, 그건 필터 문제가 아닙니다.
    const py = await api.data('/dashboard/ai/process-yield', { date: f.baseDate });
    const byQty = [...(py.items || [])].sort((a, b) => (b.qty || 0) - (a.qty || 0));
    const processIds = byQty.filter((x) => (x.qty || 0) > 0).map((x) => x.processId).filter(Boolean);
    const defectProcessIds = byQty.filter((x) => (x.ngQty || 0) > 0).map((x) => x.processId).filter(Boolean);

    // 그 달에 실제로 실적이 있는 제품 (기준일에 만든 것)
    const made = f.productCodes || [];

    const depts = await api.data('/system/depts');
    const deptNames = (depts.depts || depts.items || []).map((d) => d.deptNm).filter(Boolean);

    ctx.f = { ...f, equipmentStates: states, equipmentModels, processIds, defectProcessIds, madeProducts: made, deptNames };
  });

  test('필터를 걸면 결과가 비지 않는다', async () => {
    const bad = [];
    for (const [name, path, params, key, listKey, values] of CASES(ctx.f)) {
      for (const v of values) {
        const filtered = await api.data(path, { ...params, [key]: v });
        const n = listOf(filtered, listKey).length;
        if (n === 0) bad.push(`${name}: ${key}=${v} 인데 0건 (그 값은 서버가 알려 준 값입니다)`);
      }
    }
    eq(bad, [], '유효한 값으로 걸었는데 0건이면 화면이 조용히 빕니다');
  });

  test('걸러진 행이 모두 필터 값과 같다', async () => {
    const bad = [];
    for (const [name, path, params, key, listKey, values, rowField] of CASES(ctx.f)) {
      if (!rowField) continue; // 행에 그 필드가 없으면 다음 검사에서 봅니다
      for (const v of values) {
        const rows = listOf(await api.data(path, { ...params, [key]: v }), listKey);
        const wrong = rows.filter((r) => r[rowField] !== v);
        if (wrong.length) bad.push(`${name}: ${key}=${v} 인데 ${wrong.length}건이 ${rowField}=${wrong[0][rowField]} 입니다`);
      }
    }
    eq(bad, [], '걸리지 않은 행이 섞여 오면 필터가 무시된 것입니다');
  });

  test('다른 값으로 걸면 다른 결과가 온다', async () => {
    const bad = [];
    for (const [name, path, params, key, listKey, values] of CASES(ctx.f)) {
      if (values.length < 2) continue; // 값이 하나뿐이면 비교할 수 없습니다
      const [v1, v2] = values;
      const a = listOf(await api.data(path, { ...params, [key]: v1 }), listKey);
      const b = listOf(await api.data(path, { ...params, [key]: v2 }), listKey);
      if (!a.length || !b.length) continue; // 앞 검사에서 잡힙니다
      if (JSON.stringify(a) === JSON.stringify(b)) {
        bad.push(`${name}: ${key}=${v1} 과 ${key}=${v2} 의 결과가 똑같습니다 (파라미터가 무시됩니다)`);
      }
    }
    eq(bad, [], '서로 다른 값에 같은 결과가 오면 필터가 걸리지 않은 것입니다');
  });

  test('집계 단위를 바꾸면 그 단위로 다시 조회한다', async () => {
    const b = await open('admin');
    const seen = [];
    b.page.on('request', (r) => {
      const u = r.url();
      if (u.includes('/production/results/trend')) seen.push(u);
    });
    try {
      await b.page.goto('http://localhost:8081/dashboard/ai', { waitUntil: 'load', timeout: 60000 });

      const bad = [];
      for (const [label, wantUnit, wantBuckets] of UNIT_CASES) {
        seen.length = 0;
        await pickUnit(b.page, label);
        // 조회가 나갈 때까지 기다립니다 — 안 나가면 그것이 잡으려는 결함입니다
        if (!(await waitFor(b.page, () => seen.length > 0))) {
          bad.push(`${label}: 단위를 골랐는데 조회가 나가지 않습니다`);
          continue;
        }
        const q = new URL(seen[seen.length - 1]).searchParams;
        if (q.get('unit') !== wantUnit) bad.push(`${label}: 서버에 unit=${q.get('unit')} 이 갔습니다 (${wantUnit} 이어야 합니다)`);

        // 실제로 그 단위로 칸이 나뉘는지 — 한 칸뿐이면 단위를 바꾼 티가 나지 않습니다
        const trend = await api.data('/production/results/trend', {
          from: q.get('from'), to: q.get('to'), unit: q.get('unit'),
        });
        const n = (trend?.items || trend?.labels || []).length;
        if (n !== wantBuckets) bad.push(`${label}: ${q.get('from')}~${q.get('to')} 가 ${n}칸입니다 (${wantBuckets}칸이어야 합니다)`);
      }
      eq(bad, [], '집계 단위를 골라도 결과가 그대로면 고른 티가 나지 않습니다');
    } finally {
      await b.browser.close();
    }
  });

  test('알림 목록 필터가 동작한다 (상태·설비)', async () => {
    const all = await api.data('/alerts', { size: 100 });
    const items = all.items || [];
    if (!items.length) skip('알림이 없어 필터를 확인할 수 없습니다');

    const state = items.map((x) => x.ackState).find(Boolean);
    if (state) {
      const one = await api.data('/alerts', { size: 100, ackState: state });
      const wrong = (one.items || []).filter((x) => x.ackState !== state);
      eq(wrong.length, 0, `ackState=${state} 로 걸었는데 다른 상태가 섞여 옵니다`);
      ok((one.items || []).length > 0, `ackState=${state} 인 알림이 있는데 0건이 옵니다`);
    }

    const eqptCd = items.map((x) => x.eqptCd).find(Boolean);
    if (eqptCd) {
      const one = await api.data('/alerts', { size: 100, eqptCd });
      const wrong = (one.items || []).filter((x) => x.eqptCd !== eqptCd);
      eq(wrong.length, 0, `eqptCd=${eqptCd} 로 걸었는데 다른 설비가 섞여 옵니다`);
    }
  });
});
