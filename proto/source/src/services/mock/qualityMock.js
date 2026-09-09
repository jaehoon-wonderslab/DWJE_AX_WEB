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









};
