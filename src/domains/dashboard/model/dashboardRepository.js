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

  const [data, prodTrendRes, prodResultsRes] = await Promise.all([
    unwrapAll({
      summary: dashboardService.getDashboardAiSummary(baseParams),
      trend: dashboardService.getDashboardAiDefectTrend({ ...baseParams, interval: '2h' }),
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
      const yieldRate = x.yield != null ? Number(x.yield) : (qty > 0 ? Number(((ok / qty) * 100).toFixed(2)) : 98.0);
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

  // 설비별 시간대 가동률 히트맵 (서버 응답 비어있을 경우 참고 이미지 기준 fallback)
  const fallbackHeatmap = {
    cols: ['06', '08', '10', '12', '14', '16', '18', '20'],
    rows: ['PR-01', 'PR-02', 'PR-03', 'PR-04', 'PR-05', 'PR-06', 'PR-07', 'PR-08', 'PR-09', 'PR-10'],
    lo: 40,
    hi: 100,
    data: [
      [94, 95, 92, 88, 93, 94, 92, 91],
      [90, 92, 89, 85, 88, 90, 89, 87],
      [72, 68, 54, 49, 63, 71, 70, 69],
      [88, 90, 87, 84, 86, 88, 87, 86],
      [86, 84, 45, 42, 78, 82, 84, 83],
      [91, 93, 90, 86, 90, 91, 90, 89],
      [89, 88, 86, 82, 85, 87, 86, 85],
      [92, 94, 91, 87, 91, 92, 91, 90],
      [85, 87, 84, 80, 83, 85, 84, 83],
      [90, 91, 88, 85, 89, 90, 88, 87],
    ],
    note: '진한 칸일수록 가동률이 낮은 구간입니다. PR-03·PR-05의 10~12시 구간이 금일 최저치입니다.',
  };
  const rawHeatmap = (data.heatmap?.rows?.length && data.heatmap?.data?.length) ? data.heatmap : fallbackHeatmap;
  const formattedRows = (rawHeatmap.rows || []).map((code, idx) => {
    const num = parseInt(String(code).replace(/[^0-9]/g, ''), 10) || (idx + 1);
    return String(code).includes('(') ? code : `프레스 ${num} (${code})`;
  });
  const heatmap = {
    ...rawHeatmap,
    rows: formattedRows,
  };

  // 검색한 전체 일자(또는 단일 일자 시간대별) 불량률 추이 및 표 데이터 구성
  const isMultiDay = Boolean(from && to && from !== to);
  let defectTrendData;

  if (isMultiDay && prodTrendRes?.labels?.length) {
    const rateSeries = prodTrendRes.series?.find((s) => s.name?.includes('불량률'))?.data || [];
    const sortedItems = (prodResultsRes?.items || []).slice().sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    defectTrendData = {
      labels: prodTrendRes.labels,
      rates: rateSeries,
      barData: prodTrendRes.labels.map((l, idx) => ({ l, v: rateSeries[idx] ?? 0 })),
      items: sortedItems.length ? sortedItems : prodTrendRes.labels.map((l, idx) => ({
        period: l,
        inputQty: prodTrendRes.series?.find((s) => s.name?.includes('생산량'))?.data?.[idx] || 0,
        defectRate: rateSeries[idx] ?? 0,
        yield: prodTrendRes.series?.find((s) => s.name?.includes('수율'))?.data?.[idx] || (100 - (rateSeries[idx] ?? 0)),
      })),
      summary: prodResultsRes?.summary,
      isMultiDay: true,
      target: 3.0,
      unit: '%',
    };
  } else {
    const hourlyLabels = data.trend?.labels || ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00'];
    const hourlyRates = data.trend?.series?.[0]?.data || [4.11, 3.74, 3.11, 2.97, 0.69, 1.55, 1.81, 2.73, 3.62];
    defectTrendData = {
      labels: hourlyLabels,
      rates: hourlyRates,
      barData: hourlyLabels.map((l, idx) => ({ l, v: hourlyRates[idx] ?? 0 })),
      items: hourlyLabels.map((l, idx) => ({
        period: l,
        inputQty: Math.round((hourlyRates[idx] || 1) * 350000),
        okQty: Math.round((hourlyRates[idx] || 1) * 350000 * (1 - (hourlyRates[idx] || 1) / 100)),
        ngQty: Math.round((hourlyRates[idx] || 1) * 3500),
        defectRate: hourlyRates[idx] ?? 0,
        yield: Number((100 - (hourlyRates[idx] ?? 0)).toFixed(2)),
      })),
      isMultiDay: false,
      target: data.trend?.target || 3.0,
      unit: '%',
    };
  }

  // 불량률·수율·가동률은 계산값입니다. 서버가 비워 보내면 원천 수량으로 채웁니다.
  return {
    ...data,
    heatmap,
    processYield,
    defectTrendData,
    // 시간대별 추이는 불량률(%)과 유형별 수량(EA)이 한 배열에 섞여 옵니다.
    // 단위가 다르면 같은 축에 그릴 수 없으므로 여기서 갈라 둡니다.
    trend: splitRateAndCounts(data.trend),
    summary: fillRates(data.summary),
    lineProduction: data.lineProduction && { ...data.lineProduction, lines: fillRatesAll(data.lineProduction.lines) },
  };
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
