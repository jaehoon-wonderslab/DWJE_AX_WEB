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
