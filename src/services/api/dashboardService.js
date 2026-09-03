/**
 * 대시보드 서비스 — API 34건
 *
 * 각 함수는 파라미터 객체 하나만 받습니다.
 * 경로 변수({param})는 이름이 같은 키에서 자동으로 채워지고, 나머지는
 * GET/DELETE 는 쿼리스트링, POST/PUT/PATCH 는 요청 바디로 전달됩니다.
 *
 * 사용 예)
 *   const res = await dashboardService.getDashboardAiSummary({ date: '2026-08-28' });
 *   if (res.success) setSummary(res.data);
 */
import { request } from './client';

/* ───────── AI 통합 대시보드 ───────── */

/**
 * 통합 요약 지표
 *
 * `GET /api/v1/dashboard/ai/summary`
 * @param {object} params date
 * @returns {Promise<object>} defectRate, uptimeRate, todayQty, pendingBorderline{cnt,maxWaitMin}
 * @remarks KPI 카드 4종
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiSummary(params) {
  return request('getDashboardAiSummary', params);
}

/**
 * 시간대별 불량률 추이
 *
 * `GET /api/v1/dashboard/ai/defect-trend`
 * @param {object} params date, interval(2h)
 * @returns {Promise<object>} labels[], series[{name,data[]}], target
 * @remarks 전체 + 주 불량유형 2계열
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiDefectTrend(params) {
  return request('getDashboardAiDefectTrend', params);
}

/**
 * 라인별 생산량·불량률
 *
 * `GET /api/v1/dashboard/ai/line-production`
 * @param {object} params date, processId
 * @returns {Promise<object>} lines[{eqptCd,qty,defectRate}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiLineProduction(params) {
  return request('getDashboardAiLineProduction', params);
}

/**
 * 공정 품질 지수(6축)
 *
 * `GET /api/v1/dashboard/ai/quality-index`
 * @param {object} params date
 * @returns {Promise<object>} axes[{label,value,target}]
 * @remarks 양품률·가동률·정시완료·검사정확도·이상대응·데이터정합
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiQualityIndex(params) {
  return request('getDashboardAiQualityIndex', params);
}

/**
 * 불량 유형 구성
 *
 * `GET /api/v1/dashboard/ai/defect-composition`
 * @param {object} params date, processId
 * @returns {Promise<object>} segments[{label,value}], total, excludedBorderline
 * @remarks 경계 판정 건 제외 표기
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiDefectComposition(params) {
  return request('getDashboardAiDefectComposition', params);
}

/**
 * 공정별 수율
 *
 * `GET /api/v1/dashboard/ai/process-yield`
 * @param {object} params date
 * @returns {Promise<object>} items[{process,yield,level}], target, note
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiProcessYield(params) {
  return request('getDashboardAiProcessYield', params);
}

/**
 * 생산 계획 대비 실적
 *
 * `GET /api/v1/dashboard/ai/plan-vs-actual`
 * @param {object} params date, interval(2h)
 * @returns {Promise<object>} items[{slot,plan,actual}], cumPlan, cumActual, rate
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiPlanVsActual(params) {
  return request('getDashboardAiPlanVsActual', params);
}

/**
 * 설비별 시간대 가동률
 *
 * `GET /api/v1/dashboard/ai/equipment-uptime-heatmap`
 * @param {object} params date, processId, interval(2h)
 * @returns {Promise<object>} cols[], rows[], data[][], lo, hi
 * @remarks 낮을수록 진하게(invert)
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiEquipmentUptimeHeatmap(params) {
  return request('getDashboardAiEquipmentUptimeHeatmap', params);
}

/**
 * 라인별 현황 목록
 *
 * `GET /api/v1/dashboard/ai/lines`
 * @param {object} params date, processId
 * @returns {Promise<object>} lines[{eqptCd,model,qty,defectRate,uptimeRate,state}]
 * @remarks 행 클릭 → 설비 상세
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiLines(params) {
  return request('getDashboardAiLines', params);
}

/**
 * 설비 상세 조회
 *
 * `GET /api/v1/production/equipments/{eqptCd}`
 * @param {object} params date
 * @returns {Promise<object>} eqptCd, model, qty, defectRate, uptimeRate, workcenter, iotState, stopElapsedMin
 * @remarks 모달
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getProductionEquipmentsByEqptCd(params) {
  return request('getProductionEquipmentsByEqptCd', params);
}

/**
 * 이상 알림 요약
 *
 * `GET /api/v1/dashboard/ai/alerts`
 * @param {object} params hours(24)
 * @returns {Promise<object>} alerts[{level,title,desc,elapsed,agent}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiAlerts(params) {
  return request('getDashboardAiAlerts', params);
}

/**
 * Agent 작동 현황 요약
 *
 * `GET /api/v1/dashboard/ai/agents`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} master{state,mode}, agents[{no,name,state,last,load}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardAiAgents(params) {
  return request('getDashboardAiAgents', params);
}

/* ───────── 공정 및 제품 대시보드 ───────── */

/**
 * 공정·제품 요약 지표
 *
 * `GET /api/v1/dashboard/process/summary`
 * @param {object} params date, processId, productCodes[]
 * @returns {Promise<object>} qty, okQty, ngQty, defectRate, yield, avgUptime, productCnt
 * @remarks 가중 평균 산출(총불량/총생산)
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessSummary(params) {
  return request('getDashboardProcessSummary', params);
}

/**
 * 시간대별 불량률 추이
 *
 * `GET /api/v1/dashboard/process/defect-trend`
 * @param {object} params date, processId, productCodes[], interval
 * @returns {Promise<object>} labels[], series[], target
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessDefectTrend(params) {
  return request('getDashboardProcessDefectTrend', params);
}

/**
 * 제품별 생산량·불량률
 *
 * `GET /api/v1/dashboard/process/product-production`
 * @param {object} params date, processId, productCodes[]
 * @returns {Promise<object>} items[{product,qty,defectRate}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessProductProduction(params) {
  return request('getDashboardProcessProductProduction', params);
}

/**
 * 불량 유형 구성
 *
 * `GET /api/v1/dashboard/process/defect-composition`
 * @param {object} params date, processId, productCodes[]
 * @returns {Promise<object>} segments[{label,value}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessDefectComposition(params) {
  return request('getDashboardProcessDefectComposition', params);
}

/**
 * 제품별 수율
 *
 * `GET /api/v1/dashboard/process/product-yield`
 * @param {object} params date, processId, productCodes[]
 * @returns {Promise<object>} items[{product,yield,level}], target
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessProductYield(params) {
  return request('getDashboardProcessProductYield', params);
}

/**
 * 제품별 가동률
 *
 * `GET /api/v1/dashboard/process/product-uptime`
 * @param {object} params date, processId, productCodes[]
 * @returns {Promise<object>} items[{product,uptimeRate}]
 * @remarks 설비 점유 기준
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessProductUptime(params) {
  return request('getDashboardProcessProductUptime', params);
}

/**
 * 공정 비교
 *
 * `GET /api/v1/dashboard/process/process-compare`
 * @param {object} params date, productCodes[]
 * @returns {Promise<object>} items[{process,defectRate}]
 * @remarks 동일 제품 구성 기준
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessProcessCompare(params) {
  return request('getDashboardProcessProcessCompare', params);
}

/**
 * 설비별 시간대 가동률
 *
 * `GET /api/v1/dashboard/process/equipment-uptime-heatmap`
 * @param {object} params date, processId, interval
 * @returns {Promise<object>} cols[], rows[], data[][]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessEquipmentUptimeHeatmap(params) {
  return request('getDashboardProcessEquipmentUptimeHeatmap', params);
}

/**
 * 제품별 상세 목록
 *
 * `GET /api/v1/dashboard/process/products`
 * @param {object} params date, processId, productCodes[], sort
 * @returns {Promise<object>} items[{product,family,customer,project,rank,qty,okQty,ngQty,defectRate,yield,uptimeRate}]
 * @remarks 생산량 내림차순 기본
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessProducts(params) {
  return request('getDashboardProcessProducts', params);
}

/**
 * Top N 제품 조회
 *
 * `GET /api/v1/dashboard/process/top-products`
 * @param {object} params topN(5|10|20|50|all)
 * @returns {Promise<object>} productCodes[]
 * @remarks SY-07 제품군 순위를 따름
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getDashboardProcessTopProducts(params) {
  return request('getDashboardProcessTopProducts', params);
}

/**
 * 선택 요약
 *
 * `GET /api/v1/dashboard/process/selection-summary`
 * @param {object} params processId, productCodes[]
 * @returns {Promise<object>} process{name,capacity,targetYield}, productCnt, currentYield, gap
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function getDashboardProcessSelectionSummary(params) {
  return request('getDashboardProcessSelectionSummary', params);
}

/* ───────── 성과지표 대시보드 ───────── */

/**
 * KPI 요약(3종)
 *
 * `GET /api/v1/dashboard/kpi/summary`
 * @param {object} params yearMonth
 * @returns {Promise<object>} kpis[{no,name,weight,value,target,rate,level}], totalRate
 * @remarks 가중치 0.4/0.3/0.3
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·전산팀·경영진·통합관리자 · 우선순위 1
 */
export function getDashboardKpiSummary(params) {
  return request('getDashboardKpiSummary', params);
}

/**
 * KPI 추이
 *
 * `GET /api/v1/dashboard/kpi/trend`
 * @param {object} params from, to
 * @returns {Promise<object>} labels[], series[{name,data[]}], baseline(100)
 * @remarks 구축 전=100 지수
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiTrend(params) {
  return request('getDashboardKpiTrend', params);
}

/**
 * 불량 유형 분포
 *
 * `GET /api/v1/dashboard/kpi/defect-distribution`
 * @param {object} params yearMonth
 * @returns {Promise<object>} segments[{label,value}]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiDefectDistribution(params) {
  return request('getDashboardKpiDefectDistribution', params);
}

/**
 * 월별 불량 유형 추이
 *
 * `GET /api/v1/dashboard/kpi/defect-type-trend`
 * @param {object} params from, to, topN(2)
 * @returns {Promise<object>} labels[], series[]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiDefectTypeTrend(params) {
  return request('getDashboardKpiDefectTypeTrend', params);
}

/**
 * AI 성능 6축
 *
 * `GET /api/v1/dashboard/kpi/ai-performance`
 * @param {object} params yearMonth
 * @returns {Promise<object>} axes[{label,value,target}]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiAiPerformance(params) {
  return request('getDashboardKpiAiPerformance', params);
}

/**
 * 부서별 작업공수 절감
 *
 * `GET /api/v1/dashboard/kpi/manhour-saving`
 * @param {object} params from, to
 * @returns {Promise<object>} items[{dept,index}], baseline(100)
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiManhourSaving(params) {
  return request('getDashboardKpiManhourSaving', params);
}

/**
 * 월별 목표 달성률
 *
 * `GET /api/v1/dashboard/kpi/achievement-trend`
 * @param {object} params from, to
 * @returns {Promise<object>} labels[], series[]
 * @remarks KPI 3종 가중 합산
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiAchievementTrend(params) {
  return request('getDashboardKpiAchievementTrend', params);
}

/**
 * AI 성능 목표 충족
 *
 * `GET /api/v1/dashboard/kpi/ai-target-status`
 * @param {object} params yearMonth
 * @returns {Promise<object>} segments[{label,value}], items[{item,target,actual,pass}]
 * @remarks 5개 항목
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiAiTargetStatus(params) {
  return request('getDashboardKpiAiTargetStatus', params);
}

/**
 * 월별 지표 실측값
 *
 * `GET /api/v1/dashboard/kpi/monthly-matrix`
 * @param {object} params year
 * @returns {Promise<object>} cols[], rows[], data[][]
 * @remarks 히트맵
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiMonthlyMatrix(params) {
  return request('getDashboardKpiMonthlyMatrix', params);
}

/**
 * KPI 측정 기준 조회
 *
 * `GET /api/v1/dashboard/kpi/basis`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} kpis[{no,name,formula,source,cycle,exclusion}]
 * @remarks 모달
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getDashboardKpiBasis(params) {
  return request('getDashboardKpiBasis', params);
}

/**
 * KPI 증빙 내려받기
 *
 * `POST /api/v1/dashboard/kpi/evidence-export`
 * @param {object} params yearMonth, format(xls)
 * @returns {Promise<object>} file(binary)
 * @remarks 산출 근거 원천 데이터
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function postDashboardKpiEvidenceExport(params) {
  return request('postDashboardKpiEvidenceExport', params);
}
