/**
 * [Model] 대시보드 리포지토리 (DB-01 · DB-02 · DB-03)
 *
 * 화면 하나가 필요로 하는 API 묶음을 한 함수로 제공합니다.
 * "이 화면이 어떤 API 들로 이루어지는가" 는 이 파일에만 적혀 있습니다.
 */
import * as commonService from '@services/api/commonService';
import * as dashboardService from '@services/api/dashboardService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { fillRates, fillRatesAll } from '@domains/common/model/metricModel';

/* ───────── DB-01 AI 통합 대시보드 (API 12건) ───────── */

/**
 * AI 통합 대시보드에 필요한 모든 데이터를 한 번에 조회합니다.
 * @param {string} date 조회 기준일 (YYYY-MM-DD)
 */
export async function loadAiDashboard(date) {
  const data = await unwrapAll({
    summary: dashboardService.getDashboardAiSummary({ date }),
    trend: dashboardService.getDashboardAiDefectTrend({ date, interval: '2h' }),
    lineProduction: dashboardService.getDashboardAiLineProduction({ date }),
    qualityIndex: dashboardService.getDashboardAiQualityIndex({ date }),
    composition: dashboardService.getDashboardAiDefectComposition({ date }),
    processYield: dashboardService.getDashboardAiProcessYield({ date }),
    planActual: dashboardService.getDashboardAiPlanVsActual({ date, interval: '2h' }),
    heatmap: dashboardService.getDashboardAiEquipmentUptimeHeatmap({ date, interval: '2h' }),
    alerts: dashboardService.getDashboardAiAlerts({ hours: 24 }),
    agents: dashboardService.getDashboardAiAgents({}),
  });

  // 불량률·수율·가동률은 계산값입니다. 서버가 비워 보내면 원천 수량으로 채웁니다.
  return {
    ...data,
    // 시간대별 추이는 불량률(%)과 유형별 수량(EA)이 한 배열에 섞여 옵니다.
    // 단위가 다르면 같은 축에 그릴 수 없으므로 여기서 갈라 둡니다.
    trend: splitRateAndCounts(data.trend),
    summary: fillRates(data.summary),
    lineProduction: data.lineProduction && { ...data.lineProduction, lines: fillRatesAll(data.lineProduction.lines) },
    processYield: data.processYield && { ...data.processYield, items: fillRatesAll(data.processYield.items) },
  };
}

/**
 * 라인별 현황 목록 (쪽 단위)
 *
 * 설비가 1,300대를 넘어 대시보드 묶음과 따로 조회합니다.
 * 쪽을 넘길 때마다 대시보드 12건을 다시 부르지 않기 위해서입니다.
 *
 * @param {string} date 기준일 (YYYY-MM-DD)
 * @param {{page?:number, size?:number}} [params] size 0 이면 전량
 */
export async function fetchAiLines(date, params = {}) {
  const { items, meta } = await unwrapPaged(dashboardService.getDashboardAiLines({ date, ...params }), 'lines');
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
  });

  return {
    ...data,
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
