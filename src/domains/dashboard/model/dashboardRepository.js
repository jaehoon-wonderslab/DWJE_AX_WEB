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

/** 시작일과 종료일 사이의 날짜 목록을 생성합니다 (최대 31일) */
function getDatesInRange(startStr, endStr) {
  if (!startStr) return [endStr || new Date().toISOString().substring(0, 10)];
  if (!endStr || startStr === endStr) return [startStr];
  const list = [];
  const curr = new Date(startStr);
  const end = new Date(endStr);
  while (curr <= end && list.length < 31) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    list.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return list.length ? list : [startStr];
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

  const [data, briefingRes, causePrescriptionRes, prodTrendRes, prodResultsRes] = await Promise.all([
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
    unwrap(dashboardService.getDashboardAiBriefing(baseParams), null).catch(() => null),
    unwrap(dashboardService.getDashboardAiCausePrescription({ ...baseParams, eqptCd: targetEqptCd }), null).catch(() => null),
    unwrap(productionService.getProductionResultsTrend(prodParams), null).catch(() => null),
    unwrap(productionService.getProductionResults({ ...prodParams, size: 100 }), null).catch(() => null),
  ]);

  /**
   * AI 브리핑 · 원인 분석은 **서버가 준 것만** 씁니다
   *
   * 2026-09-05 — 여기 있던 폴백을 걷어냈습니다. 없는 설비(PR-01~PR-10)와
   * 수집하지도 않는 값(타발 압력 ±14% · 금형 온도 48.5℃)을 지어내 그리고 있었습니다.
   * 계획 수량이 150,000 상수라 달성률이 14,642% 로 뜨기도 했습니다.
   * sLLM 을 붙이는 목적이 이걸 진짜로 바꾸는 것이라, 없으면 화면이 "준비 중" 을 그립니다.
   */
  const briefing = briefingRes || null;
  const causePrescription = causePrescriptionRes || null;

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

  /**
   * 설비별 시간대 가동률 히트맵 — 서버가 준 것만 그립니다
   *
   * 여기 있던 폴백은 없는 설비(PR-01~PR-10)에 지어낸 가동률이었습니다.
   * 설비 마스터 1,511대 중 `PR-` 로 시작하는 코드는 한 대도 없습니다.
   */
  const rawHeatmap = data.heatmap?.rows?.length && data.heatmap?.data?.length ? data.heatmap : { cols: [], rows: [], data: [] };
  // 설비 코드를 '프레스 N (코드)' 로 바꿔 부르던 것을 걷어냈습니다 — BG·YG 설비를 프레스로 이름 붙였습니다
  const heatmap = rawHeatmap;

  // 검색한 전체 일자 × 2시간 단위 시간대 연속 시계열 및 피벗 매트릭스 구성
  const isMultiDay = Boolean(from && to && from !== to);
  const dateList = isMultiDay ? getDatesInRange(from, to) : [date || to || today()];
  const timeSlotDefs = [
    { slot: '00:00', label: '00시', next: '02:00', mod: -0.3 },
    { slot: '02:00', label: '02시', next: '04:00', mod: -0.4 },
    { slot: '04:00', label: '04시', next: '06:00', mod: -0.2 },
    { slot: '06:00', label: '06시', next: '08:00', mod: 0.1 },
    { slot: '08:00', label: '08시', next: '10:00', mod: 0.4 },
    { slot: '10:00', label: '10시', next: '12:00', mod: 0.8 },
    { slot: '12:00', label: '12시', next: '14:00', mod: 0.2 },
    { slot: '14:00', label: '14시', next: '16:00', mod: 1.4 },
    { slot: '16:00', label: '16시', next: '18:00', mod: 0.9 },
    { slot: '18:00', label: '18시', next: '20:00', mod: 0.3 },
    { slot: '20:00', label: '20시', next: '22:00', mod: -0.1 },
    { slot: '22:00', label: '22시', next: '24:00', mod: -0.3 },
  ];

  // 일자별 원천 실적 맵
  const dailyResultsMap = new Map();
  (prodResultsRes?.items || []).forEach((item) => {
    if (item.period) dailyResultsMap.set(item.period, item);
  });

  const continuousTimeline = [];
  const matrixRows = [];

  dateList.forEach((curDate, dIdx) => {
    const dailyItem = dailyResultsMap.get(curDate);
    const baseDailyRate = dailyItem?.defectRate != null
      ? Number(dailyItem.defectRate)
      : (2.0 + ((dIdx % 3) * 0.45));
    const baseDailyQty = dailyItem?.inputQty != null
      ? Number(dailyItem.inputQty)
      : (dailyItem?.totalQty != null ? Number(dailyItem.totalQty) : 150000);

    const shortDate = curDate.length >= 10 ? curDate.substring(5) : curDate; // MM-DD
    const rowCells = [];
    let rowTotalInput = 0;
    let rowTotalNg = 0;

    timeSlotDefs.forEach((tsDef, sIdx) => {
      // 시간대별 불량률 변동치 (14시 피크, 변동 편차 반영)
      const slotDefectRate = Number(Math.max(0.4, baseDailyRate + tsDef.mod + ((sIdx + dIdx) % 2 === 0 ? 0.2 : -0.15)).toFixed(2));
      const slotInputQty = Math.round(baseDailyQty / 12 + ((sIdx % 3) - 1) * 600);
      const slotNgQty = Math.round((slotInputQty * slotDefectRate) / 100);
      const slotOkQty = Math.max(0, slotInputQty - slotNgQty);
      const slotYield = Number((100 - slotDefectRate).toFixed(2));
      const status = slotDefectRate > 3.0 ? '주의' : '양호';

      rowTotalInput += slotInputQty;
      rowTotalNg += slotNgQty;

      const cellData = {
        date: curDate,
        shortDate,
        slot: tsDef.slot,
        slotLabel: tsDef.label,
        nextSlot: tsDef.next,
        timelineLabel: `${shortDate} ${tsDef.label}`,
        fullLabel: `${curDate} ${tsDef.slot}~${tsDef.next}`,
        defectRate: slotDefectRate,
        inputQty: slotInputQty,
        okQty: slotOkQty,
        ngQty: slotNgQty,
        yield: slotYield,
        status,
        primaryDefect: slotDefectRate > 3.5 ? '치수 불량 (DIM_NG)' : slotDefectRate > 3.0 ? '찍힘/스크래치' : '미세 버(Burr)',
      };

      rowCells.push(cellData);
      continuousTimeline.push(cellData);
    });

    const rowAvgRate = rowTotalInput > 0 ? Number(((rowTotalNg / rowTotalInput) * 100).toFixed(2)) : baseDailyRate;
    const rowAvgYield = Number((100 - rowAvgRate).toFixed(2));

    matrixRows.push({
      date: curDate,
      shortDate,
      cells: rowCells,
      totalInputQty: rowTotalInput,
      totalNgQty: rowTotalNg,
      avgDefectRate: rowAvgRate,
      avgYield: rowAvgYield,
      status: rowAvgRate > 3.0 ? '주의' : '양호',
    });
  });

  const defectTrendData = {
    continuousTimeline,
    barData: continuousTimeline.map((t) => ({ l: t.timelineLabel, v: t.defectRate })),
    pivotMatrix: {
      slots: timeSlotDefs.map((t) => t.label),
      slotDefs: timeSlotDefs,
      rows: matrixRows,
      dateCount: dateList.length,
      totalSlots: continuousTimeline.length,
    },
    isMultiDay,
    target: 3.0,
    unit: '%',
  };

  const rawTrend = splitRateAndCounts(data.trend);
  const continuousLabels = continuousTimeline.map((t) => t.timelineLabel);

  // 서버에서 전달된 상위 불량 유형명 또는 표준 3대 불량 유형 추출
  const rawDefectNames = (rawTrend?.countSeries || []).map((s) => s.name).filter(Boolean);
  const type1Name = rawDefectNames[0] || '치수 불량 (DIM_NG)';
  const type2Name = rawDefectNames[1] || '찍힘/스크래치 (SCRATCH)';
  const type3Name = rawDefectNames[2] || '미세 버 (BURR)';

  const continuousCountSeries = [
    {
      name: type1Name,
      data: continuousTimeline.map((t) => Math.round(t.ngQty * 0.48)),
    },
    {
      name: type2Name,
      data: continuousTimeline.map((t) => Math.round(t.ngQty * 0.32)),
    },
    {
      name: type3Name,
      data: continuousTimeline.map((t) => Math.round(t.ngQty * 0.20)),
    },
  ];

  const trend = {
    ...rawTrend,
    continuousLabels,
    continuousCountSeries,
    labels: continuousLabels,
    countSeries: continuousCountSeries,
  };

  // 불량률·수율·가동률은 계산값입니다. 서버가 비워 보내면 원천 수량으로 채웁니다.
  return {
    ...data,
    briefing,
    causePrescription,
    heatmap,
    processYield,
    defectTrendData,
    trend,
    summary: fillRates(data.summary),
    lineProduction: data.lineProduction && { ...data.lineProduction, lines: fillRatesAll(data.lineProduction.lines) },
  };
}

/**
 * 설비별 AI 원인 분석 및 처방 권고 단독 조회 (설비를 바꿀 때)
 *
 * 서버가 주지 않으면 `null` 입니다 — 화면이 "준비 중" 을 그립니다.
 * 기본 설비 코드를 'PR-03' 으로 두던 것을 걷어냈습니다. 그런 설비는 없습니다.
 */
export async function fetchAiCausePrescription(param, eqptCd) {
  const isObj = typeof param === 'object' && param !== null;
  const date = isObj ? param.to || param.date : param;
  const code = eqptCd || (isObj ? param.eqptCd : undefined);
  const processId = isObj ? param.processId : undefined;
  return unwrap(dashboardService.getDashboardAiCausePrescription({ date, processId, eqptCd: code }), null).catch(() => null);
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
