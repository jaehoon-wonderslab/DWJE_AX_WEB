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

/**
 * 품질 보고서 초안 생성
 *
 * `POST /api/v1/quality/reports/draft`
 * @param {object} params formId, lotNo, occurDate, disclosurePolicy
 * @returns {Promise<object>} reportId, version, sections[]
 * @remarks ⑥ 보고서 생성 Agent
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·통합관리자 · 우선순위 1
 */
export function postQualityReportsDraft(params) {
  return request('postQualityReportsDraft', params);
}

/**
 * 품질 보고서 조회
 *
 * `GET /api/v1/quality/reports/{reportId}`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} header{}, resultTable{}, processCondition{}, causeAnalysis{}, traceHistory{}, images[], actions{}, state
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·통합관리자 · 우선순위 1
 */
export function getQualityReportsByReportId(params) {
  return request('getQualityReportsByReportId', params);
}

/**
 * 자동 기입 현황 조회
 *
 * `GET /api/v1/quality/reports/{reportId}/autofill-status`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} fields[{field,origin(mes|ai|manual)}]
 * @remarks 회색=MES 자동, 주황=AI 초안
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function getQualityReportsByReportIdAutofillStatus(params) {
  return request('getQualityReportsByReportIdAutofillStatus', params);
}

/**
 * 마스킹 적용 내역
 *
 * `GET /api/v1/quality/reports/{reportId}/masking`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} rules[{field,policy,action}]
 * @remarks ⑦ 보안 필터링 Agent
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityReportsByReportIdMasking(params) {
  return request('getQualityReportsByReportIdMasking', params);
}

/**
 * 마스킹 해제 요청
 *
 * `POST /api/v1/quality/reports/{reportId}/unmask-request`
 * @param {object} params fields[], reason
 * @returns {Promise<object>} requestId
 * @remarks 권한자 결재 필요. 감사 로그 기록
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function postQualityReportsByReportIdUnmaskRequest(params) {
  return request('postQualityReportsByReportIdUnmaskRequest', params);
}

/**
 * 증빙 이미지 후보 조회
 *
 * `GET /api/v1/quality/reports/{reportId}/evidence-images`
 * @param {object} params criteria(ng|lot|borderline), limit(4|6|10)
 * @returns {Promise<object>} images[{id,name,defectType,nasPath}]
 * @remarks NAS 경로 참조. 서버 복사 금지
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function getQualityReportsByReportIdEvidenceImages(params) {
  return request('getQualityReportsByReportIdEvidenceImages', params);
}

/**
 * 증빙 이미지 첨부
 *
 * `POST /api/v1/quality/reports/{reportId}/evidence-images`
 * @param {object} params imageIds[]
 * @returns {Promise<object>} attachedCnt
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postQualityReportsByReportIdEvidenceImages(params) {
  return request('postQualityReportsByReportIdEvidenceImages', params);
}

/**
 * 보고서 임시 저장
 *
 * `PUT /api/v1/quality/reports/{reportId}`
 * @param {object} params sections[]
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function putQualityReportsByReportId(params) {
  return request('putQualityReportsByReportId', params);
}

/**
 * 보고서 확정
 *
 * `POST /api/v1/quality/reports/{reportId}/confirm`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} state, confirmedAt, confirmedBy
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postQualityReportsByReportIdConfirm(params) {
  return request('postQualityReportsByReportIdConfirm', params);
}

/**
 * 보고서 반려
 *
 * `POST /api/v1/quality/reports/{reportId}/reject`
 * @param {object} params reason
 * @returns {Promise<object>} state
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postQualityReportsByReportIdReject(params) {
  return request('postQualityReportsByReportIdReject', params);
}

/**
 * 보고서 초안 재생성
 *
 * `POST /api/v1/quality/reports/{reportId}/regenerate`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} version
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function postQualityReportsByReportIdRegenerate(params) {
  return request('postQualityReportsByReportIdRegenerate', params);
}

/**
 * 보고서 출력
 *
 * `POST /api/v1/quality/reports/{reportId}/export`
 * @param {object} params format(xls|ppt-img|pdf)
 * @returns {Promise<object>} file(binary)
 * @remarks 다운로드 이력 기록
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postQualityReportsByReportIdExport(params) {
  return request('postQualityReportsByReportIdExport', params);
}

/**
 * 품질 보고서 이력
 *
 * `GET /api/v1/quality/reports`
 * @param {object} params from, to, formId, state, page, size
 * @returns {Promise<object>} items[], meta
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function getQualityReports(params) {
  return request('getQualityReports', params);
}

/* ───────── 보고서 양식 관리 ───────── */

/**
 * 양식 목록 조회
 *
 * `GET /api/v1/quality/report-forms`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{formId,name,type,fieldCnt,disclosurePolicy,parserVer,updatedAt}]
 * @privateRemarks 접근 권한 품질보증팀·생산관리팀·통합관리자 · 우선순위 1
 */
export function getQualityReportForms(params) {
  return request('getQualityReportForms', params);
}

/**
 * 양식 등록
 *
 * `POST /api/v1/quality/report-forms`
 * @param {object} params name, type, fields[], disclosurePolicy
 * @returns {Promise<object>} formId, parserVer
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function postQualityReportForms(params) {
  return request('postQualityReportForms', params);
}

/**
 * 양식 수정
 *
 * `PUT /api/v1/quality/report-forms/{formId}`
 * @param {object} params name, type, fields[], disclosurePolicy
 * @returns {Promise<object>} parserVer
 * @remarks 항목 변경 시 파서 버전 증가
 * @privateRemarks 접근 권한 상동 · 우선순위 1
 */
export function putQualityReportFormsByFormId(params) {
  return request('putQualityReportFormsByFormId', params);
}

/**
 * 양식 항목 정의 조회
 *
 * `GET /api/v1/quality/report-forms/{formId}/fields`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} fields[{field,label,origin,dataFieldKey,required}]
 * @privateRemarks 접근 권한 상동 · 우선순위 2
 */
export function getQualityReportFormsByFormIdFields(params) {
  return request('getQualityReportFormsByFormIdFields', params);
}
