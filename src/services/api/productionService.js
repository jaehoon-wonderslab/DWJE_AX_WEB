/**
 * 생산관리 서비스 — API 18건
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

/* ───────── 생산 모니터링 ───────── */

/**
 * 모니터링 요약
 *
 * `GET /api/v1/production/monitor/summary`
 * @param {object} params processId
 * @returns {Promise<object>} running, warning, stopped, hourlyThroughput, stoppedDetail
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionMonitorSummary(params) {
  return request('getProductionMonitorSummary', params);
}

/**
 * 설비별 실시간 현황
 *
 * `GET /api/v1/production/monitor/equipments`
 * @param {object} params lineRange, model, state, page, size
 * @returns {Promise<object>} items[{eqptCd,model,qty,defectRate,uptimeRate,strokeSpeed,lastCollectedAt,state}], meta
 * @remarks 10초 폴링. 운영 시 SSE 검토
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getProductionMonitorEquipments(params) {
  return request('getProductionMonitorEquipments', params);
}

/* ───────── 실적 집계·조회 ───────── */

/**
 * 실적 집계 조회
 *
 * `GET /api/v1/production/results`
 * @param {object} params from, to, unit(day|week|month), itemCd, lineCd, page, size
 * @returns {Promise<object>} items[{period,inputQty,okQty,ngQty,defectRate,uptimeRate,downtimeMin}], summary, meta
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·경영진·통합관리자 · 우선순위 1
 */
export function getProductionResults(params) {
  return request('getProductionResults', params);
}

/**
 * 실적 추이 차트
 *
 * `GET /api/v1/production/results/trend`
 * @param {object} params from, to, unit, itemCd
 * @returns {Promise<object>} labels[], series[]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getProductionResultsTrend(params) {
  return request('getProductionResultsTrend', params);
}

/* ───────── 일일 생산현황 보고 ───────── */

/**
 * 조간회의 자료 본문 — 제품별 한 행
 *
 * 집계 구간은 서버가 대상일로 정합니다(전일 20:00 ~ 당일 08:00).
 * `processId` 를 빼면 프레스 작업장 전부입니다.
 *
 * @param {object} params targetDate, processId
 * @returns {Promise<object>} periodFrom, periodTo, weekFrom, rows[]
 */
/* ───────── 일목표 마스터 (제품 × 공정 × 적용일) ─────────
 * 적용일부터 다음 적용일 전까지 유효합니다 — 종료일을 두지 않습니다.
 * 끝을 적게 하면 구간이 끊기거나 겹친 상태를 따로 막아야 합니다.
 */

/** 일목표 조회 — date 를 주면 그 날짜에 유효한 한 건씩, 안 주면 전 이력 (size=0 은 전건) */
export function getProductionDayTargets(params) {
  return request('getProductionDayTargets', params);
}

/** 일목표 등록 — {product, processId, applyFrom, targetQty, remark} */
export function postProductionDayTargets(params) {
  return request('postProductionDayTargets', params);
}

/** 일목표 수정 — 제품·공정은 바꿀 수 없습니다 */
export function putProductionDayTargetsByTargetId(params) {
  return request('putProductionDayTargetsByTargetId', params);
}

/** 일목표 삭제 */
export function deleteProductionDayTargetsByTargetId(params) {
  return request('deleteProductionDayTargetsByTargetId', params);
}

export function getProductionDailyReportsSheet(params) {
  return request('getProductionDailyReportsSheet', params);
}

/**
 * 조간회의 결과 저장 — 작성자가 채운 일목표 · 결정항목 · DRI · 기한
 *
 * 키는 (대상일, 제품)입니다. 보고서 문서가 없어졌으므로 reportId 를 쓰지 않습니다.
 * 보낸 제품만 갱신하고, 값에 null 을 보내면 그 칸을 비웁니다.
 *
 * @param {object} params targetDate, rows[{product, targetQty, decision, dri, due}]
 * @returns {Promise<object>} targetDate, savedCnt
 */
export function postProductionDailyReportsRows(params) {
  return request('postProductionDailyReportsRows', params);
}

/* ───────── 이전 보고서 ───────── */

/* ───────── 비가동 관리 ───────── */

/**
 * 비가동 요약
 *
 * `GET /api/v1/production/downtimes/summary`
 * @param {object} params date
 * @returns {Promise<object>} totalMin, registeredCnt, unregisteredCnt, byReason[]
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionDowntimesSummary(params) {
  return request('getProductionDowntimesSummary', params);
}

/**
 * 비가동 이력 조회
 *
 * `GET /api/v1/production/downtimes`
 * @param {object} params date, eqptCd, reasonCd, registered, page, size
 * @returns {Promise<object>} items[{eqptCd,stopAt,resumeAt,elapsedMin,registered,reasonCd,reasonNm,remark}], meta
 * @remarks 미등록 구간 포함
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionDowntimes(params) {
  return request('getProductionDowntimes', params);
}

/**
 * Agent 사유 후보 제안
 *
 * `GET /api/v1/production/downtimes/reason-suggestion`
 * @param {object} params eqptCd, stopAt
 * @returns {Promise<object>} candidates[{reasonCd,reasonNm,confidence,basis}]
 * @remarks ⑨ 이상 알림 Agent
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getProductionDowntimesReasonSuggestion(params) {
  return request('getProductionDowntimesReasonSuggestion', params);
}

/**
 * 비가동 사유 등록
 *
 * `POST /api/v1/production/downtimes`
 * @param {object} params eqptCd, stopAt, resumeAt, reasonCd, remark
 * @returns {Promise<object>} downtimeId
 * @remarks 가동률(KPI③) 산출 근거
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function postProductionDowntimes(params) {
  return request('postProductionDowntimes', params);
}

/**
 * 비가동 사유 수정
 *
 * `PUT /api/v1/production/downtimes/{downtimeId}`
 * @param {object} params reasonCd, remark, resumeAt
 * @returns {Promise<object>} success
 * @remarks 변경 이력 보존
 * @privateRemarks 접근 권한 생산관리팀·제조팀·통합관리자 · 우선순위 2
 */
export function putProductionDowntimesByDowntimeId(params) {
  return request('putProductionDowntimesByDowntimeId', params);
}

/**
 * 실적 집계 내려받기 (백엔드 구현 확장분)
 *
 * `POST /api/v1/production/results/export`
 * @param {object} params fromDate, toDate, procCd, itemCd, format
 */
export function postProductionResultsExport(params) {
  return request('postProductionResultsExport', params);
}
