/**
 * [Model] 품질관리 리포지토리 (QC-01 ~ QC-04)
 */
import * as qualityService from '@services/api/qualityService';
import { command, unwrap, unwrapAll } from '@services/api/request';
import { lastDataDate, recentRange } from '@shared/stores/useAppStore';

/* ───────── QC-01 불량 현황 조회 ───────── */

export function loadDefectStatus({ from, to, processId, defectTypeCd }) {
  const params = { from, to, processId, defectTypeCd };
  return unwrapAll({
    summary: qualityService.getQualityDefectsSummary(params),
    byType: qualityService.getQualityDefectsByType(params),
  });
}

/**
 * 라인별 불량률 — 따로 조회합니다.
 *
 * 이 조회만 유독 느립니다(기간에 따라 60초를 넘고 500 으로 끝나기도 합니다).
 * 같은 묶음에 두면 요약·유형 표가 다 왔는데도 화면 전체가 로딩에 멈춰
 * 사용자는 고장으로 봅니다. 카드 하나만 늦게 채우도록 떼어 냈습니다.
 */
export function loadDefectByLine({ from, to, processId, defectTypeCd }) {
  return unwrap(qualityService.getQualityDefectsByLine({ from, to, processId, defectTypeCd, topN: 5 }), { items: [] });
}

/* ───────── QC-02 AOI 판정 분석·예측 ───────── */

/**
 * AOI 예측 화면 한 벌
 *
 * 서버 규약(AoiPredictionService)
 *  · target      — 공정 코드. '전체' 는 보내지 않습니다(전 공정)
 *  · horizon     — "8h" 처럼 숫자만 뽑아 시간으로 씁니다 (기본 8h)
 *  · trainPeriod — "72h" 처럼 숫자만 뽑아 시간으로 씁니다 (기본 72h · 최대 720h)
 *  · 드리프트는 from/to 를 안 주면 오늘 기준 14일이라 실적이 없는 날이 섞입니다 → 마지막 실적일 기준 14일
 *  · 유형 구성 변화의 date 를 안 주면 오늘(실적 없음)이라 전부 -100% 가 됩니다 → 마지막 실적일
 */
export function loadAoiPrediction({ target, horizon, trainPeriod }) {
  const scope = target && target !== '전체' ? target : undefined;
  const params = { target: scope, horizon, trainPeriod };
  const drift = recentRange(14);
  return unwrapAll({
    summary: qualityService.getQualityAoiPredictionSummary(params),
    band: qualityService.getQualityAoiPredictionTrendBand({ target: scope, horizon }),
    equipRisk: qualityService.getQualityAoiPredictionEquipmentRisk({ target: scope, horizon }),
    lotRisk: qualityService.getQualityAoiPredictionLotRisk({ target: scope }),
    remaining: qualityService.getQualityAoiPredictionRemainingEstimate({ target: scope, horizon }),
    drift: qualityService.getQualityAoiInspectorDrift({ from: drift.from, to: drift.to }),
    shift: qualityService.getQualityAoiDefectTypeShift({ date: lastDataDate(), baseWeeks: 4 }),
    basis: qualityService.getQualityAoiPredictionBasis({}),
  });
}

export const recalculatePrediction = ({ target, horizon, trainPeriod }) =>
  command(qualityService.postQualityAoiPredictionRecalculate({
    target: target && target !== '전체' ? target : undefined,
    horizon,
    trainPeriod,
  }));

/* ───────── QC-03 품질 보고서 ───────── */

/**
 * 품질 보고서 상세 + 양식 + 이력
 *
 * reportId 는 숫자 대리키입니다. 문서번호(QR-260828-02)와 다른 값이라
 * 문서번호를 넣으면 400 이 납니다. 지정하지 않으면 이력의 첫 건을 펼칩니다.
 *
 * @param {number|null} [reportId]
 */
export async function loadQualityReport(reportId) {
  const history = await unwrap(qualityService.getQualityReports({}), { items: [] });
  const targetId = reportId ?? history?.items?.[0]?.reportId ?? null;

  const forms = await unwrap(qualityService.getQualityReportForms({}), { items: [] });
  // 보고서가 한 건도 없으면 상세를 부르지 않습니다 (없는 ID 로 부르면 404 입니다)
  if (targetId == null) return { history, forms, report: null, autofill: null, masking: null, errors: {}, metas: {} };

  const rest = await unwrapAll({
    report: qualityService.getQualityReportsByReportId({ reportId: targetId }),
    autofill: qualityService.getQualityReportsByReportIdAutofillStatus({ reportId: targetId }),
    masking: qualityService.getQualityReportsByReportIdMasking({ reportId: targetId }),
  });
  return { ...rest, history, forms, reportId: targetId };
}

export const createReportDraft = (params) => command(qualityService.postQualityReportsDraft(params));

/**
 * 임시 저장 — 서버(ReportCorrectionRequest)는 sections[{section, fields[{fieldCode, fieldNm, value, origin}]}] 를 받습니다.
 * 화면이 들고 있는 섹션 구조를 그 모양으로 바꿔 보냅니다.
 */
export const saveQualityReport = (reportId, sections) =>
  command(qualityService.putQualityReportsByReportId({
    reportId,
    sections: (sections || []).map((sec) => ({
      section: sec.section,
      fields: (sec.fields || []).map((f) => ({ fieldCode: f.fieldCode, fieldNm: f.field, value: f.value ?? '', origin: f.origin })),
    })),
  }));
export const confirmQualityReport = (reportId) => command(qualityService.postQualityReportsByReportIdConfirm({ reportId }));
export const rejectQualityReport = (reportId, reason) => command(qualityService.postQualityReportsByReportIdReject({ reportId, reason }));
export const regenerateQualityReport = (reportId) => command(qualityService.postQualityReportsByReportIdRegenerate({ reportId }));
export const exportQualityReport = (reportId, format) => command(qualityService.postQualityReportsByReportIdExport({ reportId, format }));
export const requestUnmask = (reportId, fields, reason) =>
  command(qualityService.postQualityReportsByReportIdUnmaskRequest({ reportId, fields, reason }));
// 서버는 criteria 만 받습니다 (limit 는 화면에서 매수 제한으로만 씁니다)
export const fetchEvidenceImages = (reportId, criteria) =>
  unwrap(qualityService.getQualityReportsByReportIdEvidenceImages({ reportId, criteria }), { images: [] });
// imageIds 는 문자열 목록(List<String>)입니다
export const attachEvidenceImages = (reportId, imageIds) =>
  command(qualityService.postQualityReportsByReportIdEvidenceImages({ reportId, imageIds: (imageIds || []).map(String) }));

/* ───────── QC-04 보고서 양식 관리 ───────── */

export const loadReportForms = () => unwrap(qualityService.getQualityReportForms({}), { items: [] });
export const loadFormFields = (formId) => unwrap(qualityService.getQualityReportFormsByFormIdFields({ formId }), { fields: [] });
export const createReportForm = (values) => command(qualityService.postQualityReportForms(values));
export const updateReportForm = (formId, values) => command(qualityService.putQualityReportFormsByFormId({ formId, ...values }));
