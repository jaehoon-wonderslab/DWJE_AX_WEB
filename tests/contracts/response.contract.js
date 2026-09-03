/**
 * 응답 필드 계약
 *
 * 화면이 실제로 꺼내 쓰는 필드를 적어 둡니다.
 * 이 세션에서 반복해서 났던 사고가 전부 이 종류였습니다 —
 * 서버는 `kpis` 를 주는데 화면은 `cards` 를 읽고, 서버는 `segments` 인데 화면은 `items` 를 읽어
 * **오류 없이 조용히 빈 화면**이 되는 것입니다. 여기서 미리 잡습니다.
 *
 * 적는 법
 *   'GET 경로': { params, fields: ['a', 'b.c', 'items[].x'] }
 *     · `a.b`      중첩 객체
 *     · `items[].x` 배열 원소의 필드 (배열이 비어 있으면 통과 — 데이터가 없을 뿐이므로)
 */
module.exports = (f) => ({
  /* ── 인증·공통 ─────────────────────────────────────── */
  '/auth/me': {
    fields: ['user.empNo', 'user.name', 'user.dept', 'dept.deptId', 'menuPerms', 'dataPerms'],
  },
  '/common/data-range': {
    params: { plantCd: f.plantCd },
    fields: ['fromDate', 'toDate'],
  },
  '/common/masters/processes': { fields: ['processes[].id', 'processes[].name'] },
  '/common/masters/products': { params: { size: 5 }, fields: ['products[].code', 'products[].name'] },

  /* ── DB-01 AI 통합 대시보드 ────────────────────────── */
  '/dashboard/ai/summary': {
    params: { date: f.baseDate },
    fields: ['todayQty', 'okQty', 'ngQty', 'defectRate'],
  },
  '/dashboard/ai/defect-trend': {
    params: { date: f.baseDate, interval: '2h' },
    fields: ['labels', 'series[].name', 'series[].data'],
  },
  '/dashboard/ai/defect-composition': {
    params: { date: f.baseDate },
    fields: ['total', 'segments[].label', 'segments[].value'],
  },
  '/dashboard/ai/lines': {
    params: { date: f.baseDate },
    fields: ['lines[].eqptCd', 'lines[].processId', 'lines[].qty', 'lines[].state'],
  },
  '/dashboard/ai/process-yield': {
    params: { date: f.baseDate },
    fields: ['items[].processId', 'items[].process', 'items[].qty'],
  },
  '/dashboard/ai/agents': { fields: ['master.state', 'agents[].name', 'agents[].state'] },

  /* ── DB-02 공정 및 제품 대시보드 ───────────────────── */
  '/dashboard/process/summary': {
    params: { date: f.baseDate, processId: f.processId, productCodes: f.productCodes },
    fields: ['qty', 'okQty', 'ngQty', 'defectRate', 'productCnt'],
  },
  '/dashboard/process/products': {
    params: { date: f.baseDate, processId: f.processId },
    fields: ['items[].product', 'items[].qty'],
  },
  '/dashboard/process/defect-composition': {
    params: { date: f.baseDate, processId: f.processId, productCodes: f.productCodes },
    fields: ['segments[].label', 'segments[].value'],
  },

  /* ── DB-03 성과지표 대시보드 ───────────────────────── */
  '/dashboard/kpi/summary': {
    fields: ['yearMonth', 'kpis[].metricCd', 'kpis[].name', 'kpis[].weight', 'kpis[].level'],
  },
  '/dashboard/kpi/defect-distribution': { fields: ['yearMonth', 'segments[].label', 'segments[].value'] },
  '/dashboard/kpi/defect-type-trend': { fields: ['labels', 'series[].name', 'series[].data'] },
  '/dashboard/kpi/trend': { fields: ['labels', 'series[].name', 'series[].data'] },
  '/dashboard/kpi/achievement-trend': { fields: ['labels', 'series[].name', 'series[].data'] },
  '/dashboard/kpi/ai-target-status': { fields: ['segments[].label', 'segments[].value', 'items[].item', 'items[].target'] },
  '/dashboard/kpi/basis': { fields: ['kpis[].metricCd', 'kpis[].name', 'kpis[].formula'] },
  '/dashboard/kpi/monthly-matrix': { fields: ['year', 'cols', 'rows', 'data'] },

  /* ── 품질 ──────────────────────────────────────────── */
  '/quality/defects/summary': {
    params: { from: f.monthFrom, to: f.monthTo },
    fields: ['totalCnt', 'ngQty', 'totalQty', 'defectRate'],
  },
  '/quality/defects/by-type': {
    params: { from: f.monthFrom, to: f.monthTo },
    fields: ['items[].defectCd', 'items[].defectType', 'items[].cnt', 'items[].ratio'],
  },
  '/quality/defects/by-line': {
    params: { from: f.baseDate, to: f.baseDate },
    fields: ['items[].eqptCd', 'items[].eqptNm', 'items[].ngQty', 'items[].defectRate', 'items[].mainType'],
  },

  /* ── 생산 ──────────────────────────────────────────── */
  '/production/results': {
    params: { from: f.monthFrom, to: f.monthTo, unit: 'day' },
    fields: ['items[].period', 'items[].inputQty', 'items[].okQty', 'items[].ngQty', 'items[].defectRate'],
  },
  '/production/monitor/summary': { fields: [] },

  /* ── 보고서 ────────────────────────────────────────── */
  '/reports/ship-plan': {
    params: { planYear: f.year, unit: 'qty' },
    fields: ['planYear', 'months', 'rows', 'monthTotals', 'grandTotal'],
  },
  '/reports/yield-by-model': {
    params: { yearMonth: f.yearMonth },
    fields: ['yearMonth', 'summary.inputQty', 'summary.yield', 'lossTypes', 'mgmtTypes',
      'rows[].model', 'rows[].inputQty', 'rows[].loss', 'rows[].mgmt'],
  },
  '/reports/lrr-by-customer': {
    params: { baseYear: f.year, unit: 'month' },
    fields: ['baseYear', 'summary.shipQty', 'summary.lrrRate', 'byDefectType', 'byCustomerMonth', 'byCustomer'],
  },

  /* ── 시스템관리 ────────────────────────────────────── */
  '/system/users': { params: { size: 5 }, fields: ['items[].empNo', 'items[].name', 'items[].dept', 'items[].stateNm', 'items[].posNm'] },
  '/system/users/pending': { fields: ['items'] },
  '/system/depts': { fields: ['items[].deptId', 'items[].deptNm', 'items[].abbr'] },
  '/system/accounts/summary': { fields: ['userCnt.active', 'deptCnt'] },
  '/system/menu-perms': { fields: ['screens[].id', 'screens[].name', 'depts[].deptId', 'depts[].deptNm', 'matrix'] },
  '/system/data-perms': { fields: ['fields[].key', 'fields[].name', 'depts[].deptId', 'matrix'] },
  '/system/data-perms/by-user': { fields: ['items[].empNo', 'items[].allowedFields'] },
  '/system/perm-logs': { params: { size: 5 }, fields: ['items[].ts', 'items[].target', 'items[].detail'] },
  '/ai/model-config': { fields: ['thresholds', 'classification'] },
  '/ai/mask-rules': { fields: ['items'] },
});
