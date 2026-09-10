/**
 * 품질관리 목 핸들러 (API 29건)
 */
import { nowStamp } from '@shared/utils/formatUtil';
import { DEFECT_MAIN_TYPES, DEFECTS_BY_TYPE, AOI_DEFECTS, AOI_EQUIPMENTS, AOI_DRIFT, AOI_EQUIPMENT_RISK, AOI_LOT_RISK,
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

const ok = (message, data = { success: true }) => ({ success: true, code: 'SUCCESS', message, data });
const fail = (code, message) => ({ success: false, code, message, data: null });

/** 목록 응답에는 상세 전용 필드(사진 본문·불량 내역)를 싸 보내지 않습니다 — 건수만 (상세에서 받습니다) */
const listItem = ({ images, defects, imageUrlTtlSec, ...rest }) => rest;

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

  /* ───────── QC-03 AOI 불량 상세 · 이미지 (REQ_20260910 A-9 · API 회신 2026-09-10) ─────────
   * MES 라벨 이력을 기간·설비·LOT/모델로 걸러 쪽 단위로 돌려줍니다. defectTypeCd 는 MES 에 없어 무시합니다.
   * 서버 규약: 전체 응답에 meta{page,size,total,totalPages} 를 함께 실어 줍니다 (unwrapPaged 가 읽습니다). */
  getQualityAoiDefects: ({ from, to, eqptCd, lotNo, model, processId, page = 1, size = 25 }) => {
    const p = Math.max(1, Number(page) || 1);
    const sz = Math.max(1, Number(size) || 25);
    const lot = String(lotNo || '').trim().toLowerCase();
    const mdl = String(model || '').trim().toLowerCase();
    const list = AOI_DEFECTS.filter((d) => {
      const day = d.judgedAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (eqptCd && d.eqptCd !== eqptCd) return false;
      if (processId && d.processId !== processId) return false;
      if (lot && !(d.lotNo.toLowerCase().includes(lot) || `${d.lotNo}-${d.serialNo}`.toLowerCase().includes(lot) || d.defectId.toLowerCase().includes(lot))) return false;
      if (mdl && !(d.model.toLowerCase().includes(mdl) || (d.modelNm || '').toLowerCase().includes(mdl))) return false;
      return true;
    });
    const total = list.length;
    return {
      success: true,
      code: 'SUCCESS',
      message: 'AOI 불량 목록 조회가 완료되었습니다.',
      data: { from: from || null, to: to || null, items: list.slice((p - 1) * sz, p * sz).map(listItem) },
      meta: { page: p, size: sz, total, totalPages: Math.ceil(total / sz) },
      masked: [],
    };
  },

  /** 필터용 AOI 설비 목록 (실 서버 32대 · 목 8대) */
  getQualityAoiDefectsEquipments: () => ({ items: AOI_EQUIPMENTS.map(({ eqptCd, eqptNm, modelNm }) => ({ eqptCd, eqptNm, modelNm })) }),

  getQualityAoiDefectsByDefectId: ({ defectId }) => {
    const id = String(defectId || '');
    // 지금 원천(plant-wc-lot-serial)과 MSSQL DIMENSION 전환 후(wc~eqpt~lot~serial) 두 형식을 모두 받습니다
    if (!/^[A-Z0-9]+-[A-Z0-9]+-\d{8}-\d+$/i.test(id) && !/^[^~]+~[^~]+~[^~]+~[^~]+$/.test(id)) {
      return fail('E-VALID-001', '불량 ID 형식이 올바르지 않습니다 (plant-wc-lot-serial 또는 wc~eqpt~lot~serial).');
    }
    const found = AOI_DEFECTS.find((d) => d.defectId === id);
    if (!found) return fail('E-NOTFOUND', `불량 ${id} 을(를) 찾을 수 없습니다.`);
    const measurements = dimensionMeasurements(found);
    const failCnt = measurements.filter((m) => !m.passed).length;
    return ok('AOI 불량 상세 조회가 완료되었습니다.', {
      ...found,
      seqCnt: measurements.length,
      failSeqCnt: failCnt,
      failSeqs: measurements.filter((m) => !m.passed).map((m) => m.seq),
      passed: failCnt === 0,
      measurements,
      measurementSummary: {
        seqCnt: measurements.length,
        failSeqCnt: failCnt,
        firstFailSeq: measurements.find((m) => !m.passed)?.seq ?? null,
        lastJudgedAt: measurements[measurements.length - 1]?.dateTime ?? found.judgedAt,
      },
    });
  },

  /** 실 서버는 이미지 바이너리를 스트림합니다(?token= 서명) — 목에서는 data URI 를 그대로 돌려줍니다 */
  getFilesAoiImagesByImageId: ({ imageId }) => {
    const img = AOI_DEFECTS.flatMap((d) => d.images).find((x) => x.imageId === imageId);
    if (!img) return fail('E-NOTFOUND', '이미지를 찾을 수 없습니다.');
    if (!img.available) return fail('E-NOTFOUND', 'NAS 에 파일이 없습니다.');
    return ok('이미지 조회가 완료되었습니다.', { imageId: img.imageId, url: img.url, contentType: 'image/svg+xml' });
  },

  /* ───────── QC-03 품질 보고서 ───────── */
};

/**
 * DIMENSION 치수 검사 항목(SEQ 당 1종류) — 실 원천은 MSSQL `EDGE.dbo.TB_SAMSUN_DIMENSION` 입니다.
 * 목에서는 불량 ID 로 값을 고정 생성합니다(같은 건을 다시 열어도 같은 값).
 *  · SEQ 는 1부터 연번 · `passed` 는 1 통과 / 0 불량 · 하나라도 0 이면 그 시리얼은 불량
 *  · 측정값은 FAI n 열 한 개 (규격 5.000 ± 0.05 가정)
 */
function dimensionMeasurements(defect) {
  let seed = 0;
  for (const ch of String(defect.defectId)) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const rnd = (i) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const seqCnt = 12 + Math.floor(rnd(0) * 13); // 12~24 항목
  const failCnt = Math.max(1, Math.round(rnd(1) * 3)); // 불량 1~3 항목
  const failSeqs = new Set();
  for (let i = 0; failSeqs.size < failCnt && i < 50; i += 1) failSeqs.add(1 + Math.floor(rnd(10 + i) * seqCnt));
  const base = new Date(`${defect.judgedAt.replace(' ', 'T')}`);
  return Array.from({ length: seqCnt }, (_, i) => {
    const seq = i + 1;
    const bad = failSeqs.has(seq);
    // 통과는 규격 안, 불량은 규격 밖 값
    const dev = bad ? (0.06 + rnd(100 + i) * 0.08) * (rnd(200 + i) > 0.5 ? 1 : -1) : (rnd(300 + i) - 0.5) * 0.08;
    const at = new Date(base.getTime() - (seqCnt - seq) * 4000);
    return {
      seq,
      passed: bad ? 0 : 1,
      dateTime: at.toISOString().slice(0, 19).replace('T', ' '),
      comment: bad ? '규격 상·하한 이탈' : null,
      values: [{ name: `FAI${seq}`, value: (5 + dev).toFixed(3) }],
    };
  });
}
