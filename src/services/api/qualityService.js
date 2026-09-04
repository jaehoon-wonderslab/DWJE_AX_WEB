/**
 * 품질관리 서비스 — API 29건
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

/* ───────── 불량 현황 조회 ───────── */

/**
 * 불량 현황 요약
 *
 * `GET /api/v1/quality/defects/summary`
 * @param {object} params from, to, processId, defectTypeCd
 * @returns {Promise<object>} totalCnt, defectRate, momChange
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·제조팀·경영진·통합관리자 · 우선순위 1
 */
export function getQualityDefectsSummary(params) {
  return request('getQualityDefectsSummary', params);
}

/**
 * 불량 유형별 분포
 *
 * `GET /api/v1/quality/defects/by-type`
 * @param {object} params from, to, processId
 * @returns {Promise<object>} items[{defectType,cnt,ratio,momChange}]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityDefectsByType(params) {
  return request('getQualityDefectsByType', params);
}

/**
 * 라인별 불량률
 *
 * `GET /api/v1/quality/defects/by-line`
 * @param {object} params from, to, processId, topN(5)
 * @returns {Promise<object>} items[{eqptCd,model,ngQty,defectRate,mainType}]
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityDefectsByLine(params) {
  return request('getQualityDefectsByLine', params);
}

/* ───────── AOI 판정 분석·예측 ───────── */

/**
 * 예측 요약
 *
 * `GET /api/v1/quality/aoi/prediction/summary`
 * @param {object} params target, horizon, trainPeriod
 * @returns {Promise<object>} predictedDefectRate, thresholdReachCnt, riskLotCnt, modelConfidence
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·제조팀·통합관리자 · 우선순위 1
 */
export function getQualityAoiPredictionSummary(params) {
  return request('getQualityAoiPredictionSummary', params);
}

/**
 * 불량률 추이·예측 밴드
 *
 * `GET /api/v1/quality/aoi/prediction/trend-band`
 * @param {object} params target, horizon
 * @returns {Promise<object>} labels[], actual[], estimated[], bandLow[], bandHigh[], threshold, splitIndex
 * @remarks actual/estimated 구분 플래그 필수
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityAoiPredictionTrendBand(params) {
  return request('getQualityAoiPredictionTrendBand', params);
}

/**
 * 설비별 위험 예측·권고
 *
 * `GET /api/v1/quality/aoi/prediction/equipment-risk`
 * @param {object} params target, horizon
 * @returns {Promise<object>} items[{eqptCd,aoiCd,currentRate,plus2h,plus8h,thresholdEta,mainFactor,recommendation,confidence}]
 * @remarks ④ 원인 분석 Agent
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityAoiPredictionEquipmentRisk(params) {
  return request('getQualityAoiPredictionEquipmentRisk', params);
}

/**
 * 출하 전 위험 LOT
 *
 * `GET /api/v1/quality/aoi/prediction/lot-risk`
 * @param {object} params target
 * @returns {Promise<object>} items[{lotNo,model,customer,shipDue,lrrProbability,basis,recommendation}]
 * @remarks 과거 LRR 통보 이력 학습
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityAoiPredictionLotRisk(params) {
  return request('getQualityAoiPredictionLotRisk', params);
}

/**
 * 잔여 시간 추가 발생 추정
 *
 * `GET /api/v1/quality/aoi/prediction/remaining-estimate`
 * @param {object} params target, horizon
 * @returns {Promise<object>} estimatedNgQty, estimatedRate, confidence
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function getQualityAoiPredictionRemainingEstimate(params) {
  return request('getQualityAoiPredictionRemainingEstimate', params);
}

/**
 * AOI 판정 드리프트
 *
 * `GET /api/v1/quality/aoi/inspector-drift`
 * @param {object} params from, to
 * @returns {Promise<object>} items[{aoiCd,judgeCnt,drift,overRejectEst,underRejectEst,recheckMatchRate,borderlineRatio,state}]
 * @remarks 드리프트 큰 검사기는 예측 신뢰도 하향
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityAoiInspectorDrift(params) {
  return request('getQualityAoiInspectorDrift', params);
}

/**
 * 불량 유형 구성 변화
 *
 * `GET /api/v1/quality/aoi/defect-type-shift`
 * @param {object} params date, baseWeeks(4)
 * @returns {Promise<object>} items[{defectType,today,baseAvg,change,interpretation}]
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function getQualityAoiDefectTypeShift(params) {
  return request('getQualityAoiDefectTypeShift', params);
}

/**
 * 예측 재산출
 *
 * `POST /api/v1/quality/aoi/prediction/recalculate`
 * @param {object} params target, horizon, trainPeriod
 * @returns {Promise<object>} jobId, predictedAt
 * @remarks 최근 2시간 판정 이력 반영
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postQualityAoiPredictionRecalculate(params) {
  return request('postQualityAoiPredictionRecalculate', params);
}

/**
 * 추정 근거·모델 조회
 *
 * `GET /api/v1/quality/aoi/prediction/basis`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} model, trainPeriod, features[], validation{}, limitations[]
 * @remarks 모달
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function getQualityAoiPredictionBasis(params) {
  return request('getQualityAoiPredictionBasis', params);
}

/* ───────── 품질 보고서 ───────── */

/* ───────── 보고서 양식 관리 ───────── */

/**
 * 양식 항목 정의 조회
 *
 * `GET /api/v1/quality/report-forms/{formId}/fields`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} fields[{field,label,origin,dataFieldKey,required}]
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */