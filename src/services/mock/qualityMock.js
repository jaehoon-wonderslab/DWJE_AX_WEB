/**
 * 품질관리 목 핸들러 (API 29건)
 */
import { nowStamp } from '@shared/utils/formatUtil';
import { DEFECT_MAIN_TYPES, DEFECTS_BY_TYPE, AOI_DRIFT, AOI_EQUIPMENT_RISK, AOI_LOT_RISK,
  AOI_PREDICTION_BASIS, AOI_PREDICTION_SUMMARY, AOI_REMAINING_ESTIMATE, AOI_TREND_BAND, AOI_TYPE_SHIFT,
  QUALITY_AUTOFILL, QUALITY_MASKING, QUALITY_REPORT, QUALITY_REPORT_HISTORY, REPORT_FORM_FIELDS, REPORT_FORMS,
} from './data/quality';
import { LINES } from './data/masters';
import { mockState } from './state';

function store() {
  if (!mockState.store.quality) {
    mockState.store.quality = {
      report: JSON.parse(JSON.stringify(QUALITY_REPORT)),
      forms: [...REPORT_FORMS],
      history: [...QUALITY_REPORT_HISTORY],
    };
  }
  return mockState.store.quality;
}

export const qualityMock = {
  /* ───────── QC-01 불량 현황 조회 ───────── */
  getQualityDefectsSummary: () => ({
    totalCnt: DEFECTS_BY_TYPE.reduce((a, d) => a + d.cnt, 0),
    defectRate: 2.6,
    momChange: '-0.4%p',
  }),

  getQualityDefectsByType: () => ({ items: DEFECTS_BY_TYPE }),

  getQualityDefectsByLine: ({ topN = 5 }) => ({
    items: LINES.slice(0, topN).map((l, i) => ({
      eqptCd: l.eqptCd,
      model: l.model,
      ngQty: Math.round((l.qty * l.defectRate) / 100),
      defectRate: l.defectRate,
      mainType: DEFECT_MAIN_TYPES[i] || 'chip',
    })),
  }),

  /* ───────── QC-02 AOI 판정 분석·예측 ───────── */
  getQualityAoiPredictionSummary: () => AOI_PREDICTION_SUMMARY,
  getQualityAoiPredictionTrendBand: () => AOI_TREND_BAND,
  getQualityAoiPredictionEquipmentRisk: () => ({ items: AOI_EQUIPMENT_RISK }),
  getQualityAoiPredictionLotRisk: () => ({ items: AOI_LOT_RISK }),
  getQualityAoiPredictionRemainingEstimate: () => AOI_REMAINING_ESTIMATE,
  getQualityAoiInspectorDrift: () => ({ items: AOI_DRIFT }),
  getQualityAoiDefectTypeShift: () => ({ items: AOI_TYPE_SHIFT }),
  getQualityAoiPredictionBasis: () => AOI_PREDICTION_BASIS,
  postQualityAoiPredictionRecalculate: () => ({
    success: true,
    code: 'SUCCESS',
    message: '예측을 재산출했습니다 — 최근 2시간 판정 이력 반영',
    data: { jobId: `PRED-${Date.now()}`, predictedAt: nowStamp() },
  }),

  /* ───────── QC-03 품질 보고서 ───────── */
  postQualityReportsDraft: ({ formId, lotNo, disclosurePolicy }) => {
    const st = store();
    st.report = JSON.parse(JSON.stringify(QUALITY_REPORT));
    if (lotNo) st.report.lotNo = lotNo;
    if (formId) st.report.formId = formId;
    if (disclosurePolicy) st.report.disclosurePolicy = disclosurePolicy;
    return { success: true, code: 'SUCCESS', message: '보고서 초안을 생성했습니다.', data: st.report };
  },

  getQualityReportsByReportId: () => store().report,

  getQualityReportsByReportIdAutofillStatus: () => ({ fields: QUALITY_AUTOFILL }),

  getQualityReportsByReportIdMasking: () => ({ rules: QUALITY_MASKING }),

  postQualityReportsByReportIdUnmaskRequest: ({ fields, reason }) => {
    if (!reason) return { success: false, code: 'E-VALID-001', message: '해제 사유는 필수입니다.', data: null };
    return {
      success: true,
      code: 'SUCCESS',
      message: `마스킹 해제를 요청했습니다 — 승인 후 적용됩니다 (항목 ${fields?.length || 0}건)`,
      data: { requestId: `UM-${Date.now()}` },
    };
  },

  getQualityReportsByReportIdEvidenceImages: ({ criteria = 'ng', limit = 10 }) => {
    let images = store().report.images;
    if (criteria === 'borderline') images = images.filter((x) => x.defectType === 'stain');
    return { images: images.slice(0, Number(limit) || 10) };
  },

  postQualityReportsByReportIdEvidenceImages: ({ imageIds = [] }) => {
    const st = store();
    st.report.images = st.report.images.map((img) => ({ ...img, attached: imageIds.includes(img.id) }));
    return { success: true, code: 'SUCCESS', message: `증빙 이미지 ${imageIds.length}장을 첨부했습니다`, data: { attachedCnt: imageIds.length } };
  },

  putQualityReportsByReportId: ({ sections }) => {
    const st = store();
    if (sections) st.report.sections = sections;
    return { success: true, code: 'SUCCESS', message: '임시 저장했습니다.', data: { success: true } };
  },

  postQualityReportsByReportIdConfirm: () => {
    const st = store();
    st.report.state = '확정';
    return { success: true, code: 'SUCCESS', message: '보고서를 확정했습니다.', data: { state: '확정', confirmedAt: nowStamp(), confirmedBy: mockState.currentUser.name } };
  },

  postQualityReportsByReportIdReject: ({ reason }) => {
    const st = store();
    st.report.state = '반려';
    return { success: true, code: 'SUCCESS', message: `보고서를 반려했습니다. (${reason || '사유 미기재'})`, data: { state: '반려' } };
  },

  postQualityReportsByReportIdRegenerate: () => {
    const st = store();
    st.report = JSON.parse(JSON.stringify(QUALITY_REPORT));
    return { success: true, code: 'SUCCESS', message: '보고서 초안을 다시 생성했습니다.', data: { version: 2 } };
  },

  postQualityReportsByReportIdExport: ({ format }) => ({
    success: true,
    code: 'SUCCESS',
    message:
      format === 'ppt-img'
        ? 'PPT용 표·그래프 이미지를 내려받았습니다'
        : format === 'pdf'
          ? 'PDF 미리보기를 열었습니다'
          : '엑셀 파일을 내려받았습니다',
    data: { format },
  }),

  getQualityReports: ({ page = 1, size = 50 }) => ({ items: store().history, meta: { page, size, total: store().history.length } }),

  /* ───────── QC-04 보고서 양식 관리 ───────── */
  getQualityReportForms: () => ({ items: store().forms }),

  postQualityReportForms: ({ name, type, disclosurePolicy }) => {
    const st = store();
    if (st.forms.some((f) => f.name === name)) {
      return { success: false, code: 'E-VALID-002', message: '이미 등록된 양식명입니다.', data: null };
    }
    const formId = `F-${Date.now().toString(36).toUpperCase()}`;
    st.forms.unshift({ formId, name, type, fieldCnt: 0, disclosurePolicy, parserVer: 'v1.0', updatedAt: nowStamp().slice(0, 10) });
    return { success: true, code: 'SUCCESS', message: '양식을 등록했습니다.', data: { formId, parserVer: 'v1.0' } };
  },

  putQualityReportFormsByFormId: ({ formId, name, type, disclosurePolicy }) => {
    const row = store().forms.find((f) => f.formId === formId);
    if (!row) return { success: false, code: 'E-NOTFOUND', message: '대상 양식을 찾을 수 없습니다.', data: null };
    if (name) row.name = name;
    if (type) row.type = type;
    if (disclosurePolicy) row.disclosurePolicy = disclosurePolicy;
    // 양식 구조가 바뀌면 파서 버전을 올립니다
    const [major, minor] = row.parserVer.replace('v', '').split('.').map(Number);
    row.parserVer = `v${major}.${minor + 1}`;
    row.updatedAt = nowStamp().slice(0, 10);
    return { success: true, code: 'SUCCESS', message: `양식을 수정했습니다 — 파서 ${row.parserVer}`, data: { parserVer: row.parserVer } };
  },

  getQualityReportFormsByFormIdFields: ({ formId }) => ({ fields: REPORT_FORM_FIELDS[formId] || REPORT_FORM_FIELDS['F-SCRAP'] }),
};
