/**
 * [Model] 대시보드 리포지토리 (DB-01 · DB-02 · DB-03)
 *
 * 화면 하나가 필요로 하는 API 묶음을 한 함수로 제공합니다.
 * "이 화면이 어떤 API 들로 이루어지는가" 는 이 파일에만 적혀 있습니다.
 */
import * as commonService from '@services/api/commonService';
import * as dashboardService from '@services/api/dashboardService';
import * as productionService from '@services/api/productionService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { fillRates, fillRatesAll } from '@domains/common/model/metricModel';
import { periodUnit } from '@domains/common/model/paramModel';

/* ───────── DB-01 AI 통합 대시보드 (API 12건) ───────── */

/** 매트릭스 가로축 — 2시간 간격 12칸 */
const SLOT_LABELS = ['00시', '02시', '04시', '06시', '08시', '10시', '12시', '14시', '16시', '18시', '20시', '22시'];

/** '00시' → '02시' (마지막은 '24시') */
const nextSlotOf = (label) => {
  const h = Number(String(label).replace('시', ''));
  return `${String(h + 2).padStart(2, '0')}시`;
};

/**
 * 시간대별 실측을 화면이 쓰는 모양으로 — **서버가 준 것만** 담습니다
 *
 * 서버 응답: `labels[]` 와 같은 순서·개수의
 * `slots[] = { slot: '08-29 00시', inputQty, okQty, ngQty, defectRate, topDefectNm }`.
 * 실적이 없는 시간대는 아예 오지 않습니다. 그 칸은 비워 둡니다.
 *
 * 수량은 `qty` 권한이 없으면 null 로 옵니다(불량률은 `yield` 권한). 그때는 수량 칸을
 * 비우고 불량률만 그립니다 — 0 으로 채우면 안 만든 것처럼 보입니다.
 *
 * @param {object} trend defect-trend 응답
 * @returns {{ barData, pivotMatrix, target, unit }}
 */
function buildHourly(trend) {
  const slots = Array.isArray(trend?.slots) ? trend.slots : [];

  const cells = slots.map((x) => {
    const [day, label] = String(x.slot || '').split(' ');
    const input = x.inputQty == null ? null : Number(x.inputQty);
    const ok = x.okQty == null ? null : Number(x.okQty);
    const rate = x.defectRate == null ? null : Number(x.defectRate);
    return {
      date: day,
      slotLabel: label,
      nextSlot: nextSlotOf(label),
      timelineLabel: x.slot,
      defectRate: rate,
      inputQty: input,
      okQty: ok,
      ngQty: x.ngQty == null ? null : Number(x.ngQty),
      // 수율은 서버가 주지 않아 양품/투입으로 냅니다 — 둘 중 하나라도 없으면 비웁니다
      yield: input && ok != null ? Number(((ok / input) * 100).toFixed(2)) : null,
      primaryDefect: x.topDefectNm || null,
    };
  });

  // 실적이 있는 날만 줄로 세웁니다 — 서버가 안 준 날은 그날 생산이 없었다는 뜻입니다
  const byDate = new Map();
  cells.forEach((c) => {
    if (!byDate.has(c.date)) byDate.set(c.date, new Map());
    byDate.get(c.date).set(c.slotLabel, c);
  });

  const rows = [...byDate.entries()].map(([day, slotMap]) => {
    const got = [...slotMap.values()];
    const totalInput = got.reduce((a, c) => a + (c.inputQty || 0), 0);
    const totalNg = got.reduce((a, c) => a + (c.ngQty || 0), 0);
    /**
     * 일일 평균 — 수량이 있으면 **가중 평균**(그날의 실제 불량률)입니다.
     * 칸별 불량률을 단순 평균하면 조금 만든 시간대가 많이 만든 시간대와 같은 무게가 됩니다.
     * 수량 권한이 없을 때만 측정된 불량률의 단순 평균으로 냅니다.
     */
    const rated = got.filter((c) => c.defectRate != null);
    const avg = totalInput > 0
      ? Number(((totalNg / totalInput) * 100).toFixed(2))
      : (rated.length ? Number((rated.reduce((a, c) => a + c.defectRate, 0) / rated.length).toFixed(2)) : null);

    return {
      date: day,
      cells: SLOT_LABELS.map((label) => slotMap.get(label) || { date: day, slotLabel: label, nextSlot: nextSlotOf(label), empty: true }),
      totalInputQty: totalInput || null,
      totalNgQty: totalNg || null,
      avgDefectRate: avg,
      weighted: totalInput > 0,
    };
  });

  return {
    barData: cells.filter((c) => c.defectRate != null).map((c) => ({ l: c.timelineLabel, v: c.defectRate })),
    pivotMatrix: { slots: SLOT_LABELS, rows, dateCount: rows.length, filledSlots: cells.length },
    // 서버에 등록된 불량률 목표가 없습니다. 화면이 색을 나누는 기준은 화면이 정한 값입니다.
    target: trend?.target ?? null,
    unit: '%',
  };
}

/**
 * AI 통합 대시보드에 필요한 모든 데이터를 한 번에 조회합니다.
 * @param {string|object} param 조회 기준일 (YYYY-MM-DD) 또는 { from, to, date, plant, unit }
 */
export async function loadAiDashboard(param) {
  const isObj = typeof param === 'object' && param !== null;
  const date = isObj ? (param.to || param.date) : param;
  const from = isObj ? param.from : undefined;
  const to = isObj ? param.to : undefined;
  const plant = isObj ? param.plant : undefined;
  const unit = isObj ? param.unit : undefined;
  const unitCode = periodUnit(unit) || 'day';

  const baseParams = { date, from, to, plant };
  const prodParams = { from: from || date, to: to || date, unit: unitCode, plant };
  const targetEqptCd = isObj ? param.eqptCd || undefined : undefined; // 서버가 분석 대상을 정합니다

  const [data, prodTrendRes, prodResultsRes] = await Promise.all([
    unwrapAll({
      summary: dashboardService.getDashboardAiSummary(baseParams),
      trend: dashboardService.getDashboardAiDefectTrend({ ...baseParams, from, to, interval: '2h' }),
      lineProduction: dashboardService.getDashboardAiLineProduction(baseParams),
      qualityIndex: dashboardService.getDashboardAiQualityIndex(baseParams),
      composition: dashboardService.getDashboardAiDefectComposition(baseParams),
      processYield: dashboardService.getDashboardAiProcessYield(baseParams),
      planActual: dashboardService.getDashboardAiPlanVsActual({ ...baseParams, interval: '2h' }),
      heatmap: dashboardService.getDashboardAiEquipmentUptimeHeatmap({ ...baseParams, interval: '2h' }),
      alerts: dashboardService.getDashboardAiAlerts({ hours: 24 }),
      agents: dashboardService.getDashboardAiAgents({}),
    }),
    unwrap(productionService.getProductionResultsTrend(prodParams), null).catch(() => null),
    unwrap(productionService.getProductionResults({ ...prodParams, size: 100 }), null).catch(() => null),
  ]);

  // 공정별 수율 계산 정규화 (서버 yield 필드 및 okQty/qty 기반 실시간 산출)
  let processYield = data.processYield;
  if (processYield?.items?.length) {
    const target = Number(processYield.target) || 97.0;
    const items = processYield.items.map((x) => {
      const qty = Number(x.qty) || (Number(x.okQty || 0) + Number(x.ngQty || 0));
      const ok = Number(x.okQty) || Math.max(0, qty - Number(x.ngQty || 0));
      // 수량이 0 이면 수율은 낼 수 없습니다 — 98.0 을 넣던 것을 걷어냈습니다(만들어 낸 값입니다)
      const yieldRate = x.yield != null ? Number(x.yield) : (qty > 0 ? Number(((ok / qty) * 100).toFixed(2)) : null);
      const level = yieldRate < target - 1.5 ? 'bad' : yieldRate < target ? 'warn' : 'ok';
      return {
        ...x,
        process: x.process || x.processNm || x.processId,
        l: x.process || x.processNm || x.processId,
        v: yieldRate,
        yieldRate,
        cls: level,
        level,
      };
    });
    processYield = {
      ...processYield,
      target,
      items,
    };
  }

  /**
   * 설비별 시간대 가동률 히트맵 — 서버가 준 것만 그립니다
   *
   * 여기 있던 폴백은 없는 설비(PR-01~PR-10)에 지어낸 가동률이었습니다.
   * 설비 마스터 1,511대 중 `PR-` 로 시작하는 코드는 한 대도 없습니다.
   */
  const rawHeatmap = data.heatmap?.rows?.length && data.heatmap?.data?.length ? data.heatmap : { cols: [], rows: [], data: [] };
  // 설비 코드를 '프레스 N (코드)' 로 바꿔 부르던 것을 걷어냈습니다 — BG·YG 설비를 프레스로 이름 붙였습니다
  const heatmap = rawHeatmap;

  /**
   * 시간대별 실측 — **서버가 준 slots[] 를 그대로** 씁니다
   *
   * 2026-09-06 이전에는 여기서 시간대별 불량률을 지어냈습니다. 일 단위 불량률에
   * 시간대 가감치(14시 +1.4 · 10시 +0.8 …)를 얹고, 실적이 없는 날은 `2.0 + (dIdx % 3) * 0.45`,
   * 투입 수량은 150,000 으로 채웠습니다. 서버가 2시간 단위 실측을 이미 주고 있었는데
   * 받아 놓고 버린 채 만든 값을 그렸습니다.
   *
   * 실적이 없는 시간대는 서버가 아예 주지 않으므로 **빈 칸으로 둡니다** — 12칸을 억지로
   * 채우면 쉰 시간대가 잘 돌아간 시간대처럼 보입니다.
   */
  const defectTrendData = buildHourly(data.trend);

  /**
   * 유형별 불량 수량 추이 — 서버 계열을 **그대로** 그립니다
   *
   * 예전에는 총 불량수에 0.48 · 0.32 · 0.20 을 곱해 세 유형으로 나눴습니다. 유형 이름만
   * 서버 것이고 수량은 지어낸 비율이었습니다. 서버가 유형별 실측 계열을 줍니다.
   *
   * 다만 이 계열은 **구간 합계 상위 2종**입니다(`seriesScope`). 합이 총 불량이 아니므로
   * 합계로 쓰지 않습니다 — 총 불량은 `slots[].ngQty` 쪽입니다.
   */
  const rawTrend = splitRateAndCounts(data.trend);
  const trend = {
    ...rawTrend,
    labels: data.trend?.labels || rawTrend?.labels || [],
    seriesScope: data.trend?.seriesScope || null,
  };

  // 불량률·수율·가동률은 계산값입니다. 서버가 비워 보내면 원천 수량으로 채웁니다.
  return {
    ...data,
    heatmap,
    processYield,
    defectTrendData,
    trend,
    summary: fillRates(data.summary),
    lineProduction: data.lineProduction && { ...data.lineProduction, lines: fillRatesAll(data.lineProduction.lines) },
  };
}

/**
 * 설비 매트릭스 — 공정별로 설비를 늘어놓고 불량률로 칠합니다
 *
 * 라인별 현황이 1,331대라 목록으로는 못 봅니다. 쪽을 넘겨 가며 읽을 표가 아니고,
 * "어느 공정의 어느 설비가 나쁜가" 를 한눈에 봐야 하는 자료입니다.
 *
 * **가동률이 아니라 불량률로 칠합니다.** 가동률 수집값이 이 시스템에 없습니다
 * (`uptimeRate` 가 1,331대 전부 null). 없는 값으로 색을 칠할 수는 없습니다.
 *
 * 생산이 없는 설비는 뺍니다 — 불량률 0% 로 칠하면 잘 돌아간 것처럼 보입니다.
 */
export async function fetchEquipmentMatrix({ date, from, to, plant }) {
  const [master, lines] = await Promise.all([
    unwrap(commonService.getCommonMastersProcesses({}), { processes: [] }),
    unwrap(dashboardService.getDashboardAiLines({ date: to || date, from, to, plant, size: 0 }), { lines: [] }),
  ]);

  const nameOf = Object.fromEntries((master?.processes || []).map((p) => [p.id, p.name]));
  const rows = (lines?.lines || lines?.items || []).filter((r) => (r.qty || 0) > 0);

  const byProc = {};
  rows.forEach((r) => {
    const id = r.processId || '기타';
    (byProc[id] = byProc[id] || []).push(r);
  });

  return {
    total: rows.length,
    /**
     * 서로 다른 설비 대수 — 줄 수와 따로 셉니다
     *
     * 지금은 설비 한 대가 한 줄이라 둘이 같습니다. 다만 서버가 설비 × 제품으로 줄을 나누면
     * 한 대가 여러 줄이 되어 줄 수를 "설비 N대" 라고 적는 순간 틀립니다.
     */
    eqptCnt: new Set(rows.map((r) => r.eqptCd).filter(Boolean)).size,
    /** 표에 그대로 넣을 한 줄 — 공장 · 설비 · 제품 · 불량률 (사용자 지정 순서) */
    items: rows
      .map((r) => ({
        // 공장은 서버가 null 로 줍니다 — 어느 표에도 없습니다(2026-09-06 확인). 지어내지 않고 비웁니다
        plant: r.plantNm || r.plantCd || '',
        processNm: r.processNm || nameOf[r.processId] || r.processId || '',
        eqptCd: r.eqptCd,
        eqptNm: r.eqptNm || r.eqptCd,
        product: r.productNm || r.product || '',
        productEtcCnt: r.productEtcCnt || 0,
        qty: r.qty || 0,
        ngQty: r.ngQty || 0,
        defectRate: r.defectRate || 0,
      }))
      .sort((a, b) => b.defectRate - a.defectRate),
    /** 나쁜 공정이 위로 오게 — 평균 불량률 내림차순 */
    groups: Object.entries(byProc)
      .map(([processId, items]) => {
        const qty = items.reduce((n, x) => n + (x.qty || 0), 0);
        const ng = items.reduce((n, x) => n + (x.ngQty || 0), 0);
        return {
          processId,
          processNm: nameOf[processId] || processId,
          qty,
          ngQty: ng,
          defectRate: qty ? Math.round((ng / qty) * 10000) / 100 : 0,
          items: items.slice().sort((a, b) => (b.defectRate || 0) - (a.defectRate || 0)),
        };
      })
      .sort((a, b) => b.defectRate - a.defectRate),
  };
}

/**
 * AI 일일 품질·생산 종합 브리핑 — **따로 부릅니다**
 *
 * 모델 추론이라 느립니다(로컬 sLLM 실측 약 24초). 대시보드 묶음에 넣으면 나머지 12건이
 * 다 끝나고도 화면이 그만큼 멈춥니다. 카드만 늦게 채워지는 편이 낫습니다.
 * 서버가 주지 않으면 `null` 이고 화면은 "준비 중" 을 그립니다.
 */
export const fetchAiBriefing = ({ date, from, to, plant }) =>
  // 구간을 그대로 넘깁니다 — 종료일만 보내면 한 달을 골라도 그 하루만 분석됩니다
  unwrap(dashboardService.getDashboardAiBriefing(from && to ? { from, to, plant } : { date: to || date, plant }), null).catch(() => null);

/**
 * 설비별 AI 원인 분석 및 처방 권고 단독 조회 (설비를 바꿀 때)
 *
 * 서버가 주지 않으면 `null` 입니다 — 화면이 "준비 중" 을 그립니다.
 * 기본 설비 코드를 'PR-03' 으로 두던 것을 걷어냈습니다. 그런 설비는 없습니다.
 */
export async function fetchAiCausePrescription(param, eqptCd) {
  const isObj = typeof param === 'object' && param !== null;
  const from = isObj ? param.from : undefined;
  const to = isObj ? param.to : undefined;
  const code = eqptCd || (isObj ? param.eqptCd : undefined);
  const processId = isObj ? param.processId : undefined;
  // 구간을 그대로 넘깁니다 — 종료일만 보내면 한 달을 골라도 그 하루만 분석됩니다
  const range = from && to ? { from, to } : { date: to || (isObj ? param.date : param) };
  return unwrap(dashboardService.getDashboardAiCausePrescription({ ...range, processId, eqptCd: code }), null).catch(() => null);
}

/**
 * 라인별 현황 목록 (쪽 단위)
 *
 * 설비가 1,300대를 넘어 대시보드 묶음과 따로 조회합니다.
 * 쪽을 넘길 때마다 대시보드 12건을 다시 부르지 않기 위해서입니다.
 *
 * @param {string|object} param 기준일 (YYYY-MM-DD) 또는 { from, to, date, plant }
 * @param {{page?:number, size?:number}} [params] size 0 이면 전량
 */
export async function fetchAiLines(param, params = {}) {
  const isObj = typeof param === 'object' && param !== null;
  const date = isObj ? (param.to || param.date) : param;
  const from = isObj ? param.from : undefined;
  const to = isObj ? param.to : undefined;
  const plant = isObj ? param.plant : undefined;

  const { items, meta } = await unwrapPaged(
    dashboardService.getDashboardAiLines({ date, from, to, plant, ...params }),
    'lines'
  );
  return { lines: fillRatesAll(items), meta };
}

/** 설비 상세 조회 (라인 행 클릭 시 모달) */
export function fetchEquipmentDetail(eqptCd, date) {
  return unwrap(dashboardService.getProductionEquipmentsByEqptCd({ eqptCd, date }));
}

/**
 * 추이 응답을 비율 계열과 수량 계열로 나눕니다.
 *
 * 첫 계열이 불량률(%)이고 나머지는 유형별 수량(EA)입니다.
 * @param {{labels:string[], series:Array<{name:string,data:number[]}>}} trend
 */
function splitRateAndCounts(trend) {
  if (!trend?.series?.length) return trend;
  const [rate, ...counts] = trend.series;
  return { ...trend, rateSeries: [rate], countSeries: counts };
}

/* ───────── DB-02 공정 및 제품 대시보드 (API 12건) ───────── */

/** 제품 선택 팝업용 전체 제품 목록 (113종) */
export function loadProductOptions(sort = 'rank') {
  return unwrap(commonService.getCommonMastersProducts({ size: 500, sort }), { products: [] });
}

/**
 * 선택 UI 를 구성할 마스터 (공정 · 제품)
 *
 * 첫 진입 기본 선택을 정하려면 "그날 그 공정이 실제로 만든 것" 을 알아야 합니다.
 * 제품군 순위(rank)나 전체 판매 순위(top-products)로 고르면 그날 실적이 없는 제품이 잡혀
 * 대시보드가 0 으로 열립니다.
 *
 *  · activeProcesses — 기준일에 실적이 있는 공정 (많은 순으로 골라 기본 공정으로)
 *  · madeProducts    — 기준일 · 해당 공정이 실제로 생산한 제품 (기본 선택 제품으로)
 *
 * @param {string} date 기준일 (YYYY-MM-DD)
 * @param {string} [processId] 공정 ID — 정해지기 전에는 생략합니다
 */
export async function loadProcessMasters(date, processId) {
  const data = await unwrapAll({
    processes: commonService.getCommonMastersProcesses({}),
    products: commonService.getCommonMastersProducts({ size: 500 }),
    activeProcesses: dashboardService.getDashboardAiProcessYield({ date }),
    ...(processId ? { madeProducts: dashboardService.getDashboardProcessProducts({ date, processId }) } : {}),
  });
  // 어떤 공정으로 받아 온 결과인지 함께 돌려줍니다.
  // 공정을 바꾼 직후 이전 응답을 보고 기본 선택을 정하지 않도록 화면이 이 값으로 확인합니다.
  return { ...data, forProcessId: processId || null };
}

/**
 * 선택한 공정 · 제품 조합의 실적을 한 번에 조회합니다.
 * @param {{ date: string, processId: string, productCodes: string[] }} cond
 */
export async function loadProcessDashboard({ date, processId, productCodes }) {
  const params = { date, processId, productCodes };
  const data = await unwrapAll({
    summary: dashboardService.getDashboardProcessSummary(params),
    trend: dashboardService.getDashboardProcessDefectTrend({ ...params, interval: '2h' }),
    production: dashboardService.getDashboardProcessProductProduction(params),
    composition: dashboardService.getDashboardProcessDefectComposition(params),
    productYield: dashboardService.getDashboardProcessProductYield(params),
    productUptime: dashboardService.getDashboardProcessProductUptime(params),
    processCompare: dashboardService.getDashboardProcessProcessCompare({ date, productCodes }),
    heatmap: dashboardService.getDashboardProcessEquipmentUptimeHeatmap({ ...params, interval: '2h' }),
    detail: dashboardService.getDashboardProcessProducts(params),
    processYield: dashboardService.getDashboardAiProcessYield({ date }),
  });

  // 공정별 수율 계산 정규화 (서버 yield 필드 및 okQty/qty 기반 실시간 산출)
  let processYield = data.processYield;
  if (processYield?.items?.length) {
    const target = Number(processYield.target) || 97.0;
    const items = processYield.items.map((x) => {
      const qty = Number(x.qty) || (Number(x.okQty || 0) + Number(x.ngQty || 0));
      const ok = Number(x.okQty) || Math.max(0, qty - Number(x.ngQty || 0));
      // 수량이 0 이면 수율은 낼 수 없습니다 — 98.0 을 넣던 것을 걷어냈습니다(만들어 낸 값입니다)
      const yieldRate = x.yield != null ? Number(x.yield) : (qty > 0 ? Number(((ok / qty) * 100).toFixed(2)) : null);
      const level = yieldRate < target - 1.5 ? 'bad' : yieldRate < target ? 'warn' : 'ok';
      return {
        ...x,
        process: x.process || x.processNm || x.processId,
        l: x.process || x.processNm || x.processId,
        v: yieldRate,
        yieldRate,
        cls: level,
        level,
      };
    });
    processYield = {
      ...processYield,
      target,
      items,
    };
  }

  return {
    ...data,
    processYield,
    summary: fillRates(data.summary),
    production: data.production && { ...data.production, items: fillRatesAll(data.production.items) },
    productYield: data.productYield && { ...data.productYield, items: fillRatesAll(data.productYield.items) },
    processCompare: data.processCompare && { ...data.processCompare, items: fillRatesAll(data.processCompare.items) },
    detail: data.detail && { ...data.detail, items: fillRatesAll(data.detail.items) },
  };
}

/* ───────── DB-03 성과지표 대시보드 (API 11건) ───────── */

/** 성과지표 대시보드 전체 */
export function loadKpiDashboard() {
  return unwrapAll({
    cards: dashboardService.getDashboardKpiSummary({}),
    trend: dashboardService.getDashboardKpiTrend({}),
    defectDist: dashboardService.getDashboardKpiDefectDistribution({}),
    defectMonthly: dashboardService.getDashboardKpiDefectTypeTrend({}),
    aiPerf: dashboardService.getDashboardKpiAiPerformance({}),
    manhour: dashboardService.getDashboardKpiManhourSaving({}),
    achieve: dashboardService.getDashboardKpiAchievementTrend({}),
    goalStatus: dashboardService.getDashboardKpiAiTargetStatus({}),
    heatmap: dashboardService.getDashboardKpiMonthlyMatrix({}),
    basis: dashboardService.getDashboardKpiBasis({}),
  });
}

/** 성과지표 증빙 내려받기 */
export function exportKpiEvidence(format = 'xls') {
  return command(dashboardService.postDashboardKpiEvidenceExport({ format }));
}
