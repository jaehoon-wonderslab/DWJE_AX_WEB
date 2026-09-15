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
/**
 * 목록 한 줄 — 사진·하위 불량은 상세에서만 줍니다.
 * MSSQL(DIMENSION) 전환 뒤 모양으로 맞추느라 MES 수량(sampleQty·okQty·ngQty)은 빼고
 * 회차 기준 수치(seqCnt·failSeqCnt·failRate)만 남깁니다 — 두 벌이 섞이면 검사 수와 불량률이 어긋납니다.
 */
const listItem = ({ images, defects, imageUrlTtlSec, sampleQty, okQty, ngQty, ...rest }) => ({
  ...rest,
  ...dimensionSummary(rest),
});

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
    const sum = dimensionSummary(found);
    // 실 서버는 불량 SEQ 만 쪽 나눠 줍니다 — 목에서도 같은 모양으로, 앞쪽 DETAIL_SEQ_CAP 회차만 만듭니다
    const items = dimensionSeqRows(found, sum);
    // MES 수량은 뺍니다 — 회차 기준 수치와 섞이면 모달의 수가 목록과 어긋납니다(listItem 과 같은 이유)
    const { sampleQty, okQty, ngQty, ...rest } = found;
    return ok('AOI 불량 상세 조회가 완료되었습니다.', {
      ...rest,
      ...sum,
      faiNos: Array.from({ length: sum.faiUsed }, (_, i) => i + 1),
      items,
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
 * DIMENSION 치수 검사 — 실 원천은 MSSQL `EDGE.dbo.TB_SAMSUN_DIMENSION` 입니다.
 * 2026-09-11 에 192.168.7.203 에 직접 붙어 확인한 모양으로 맞췄습니다
 * (docs/requests/REQ_20260911_aoi_dimension_mssql_실측.md).
 *
 *  · **한 행(SEQ) = 제품 1개의 측정 1회**입니다. SEQ 는 검사 항목 번호가 아닙니다.
 *    치수 FAI1~FAIn 이 그 행 안에 통째로 들어 있고, PASSED 는 그 회차 전체의 합부입니다.
 *  · 한 시리얼의 SEQ 는 **2,000~3,800개**, 걸리는 시간은 1~2시간입니다.
 *  · 쓰는 FAI 개수가 작업장마다 다릅니다 — S110(GP-*) 45개 · S120(MQ-*) 58개.
 *  · SEQ 중 하나라도 PASSED=0 이면 그 시리얼은 불량입니다. 실측에서는 **시리얼이 거의 전부 불량**이고
 *    SEQ 기준 불량률이 24.7% 였습니다 — 목도 그 수준으로 만듭니다.
 *  · COMMENT 는 금형 호기(`#5 B` 같은 값)이고 한 시리얼 안에서 같습니다.
 */

/** 실측 한 행(S120 MQ-008)의 치수 58개 — 목 값은 이 프로파일에 흔들림을 더해 만듭니다 */
const FAI_PROFILE = [
  0.033, 24.416, 24.392, 24.617, 24.594, 19.826, 19.832, 19.834, 19.818, 22.852,
  22.856, 0.156, 2.372, 0.147, 2.616, 4.602, 4.606, 4.606, 4.605, 4.594,
  4.646, 4.612, 4.599, 4.018, 4.008, 4.014, 4.594, 4.005, 4.033, 4.18,
  4.162, 4.174, 4.166, 1.877, 1.894, 1.01, 1.022, 0.999, 0.997, 0.995,
  0.992, 1.002, 0.992, 1.006, 0.998, 0.981, 0.999, 4.154, 4.154, 0.812,
  3.645, 3.635, 2.33, 2.358, 3.572, 3.592, 10.293, 20.917,
];

/** 모달이 한 번에 그리는 회차 수 — 실 서버도 쪽 나눠 줍니다(기본 100) */
const DETAIL_SEQ_CAP = 120;

/** 호기 — COMMENT 자리 */
const CAVITIES = ['#1 B', '#2 B', '#3 B', '#4 B', '#5 B', '#7 B', '#8 B', '#9 B'];

/** 불량 ID 로 고정되는 난수 — 같은 건을 다시 열어도 같은 값입니다 */
function seededRnd(key) {
  let seed = 0;
  for (const ch of String(key)) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  return (i) => {
    const x = Math.sin(seed + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
}

/** 시리얼 한 건의 DIMENSION 요약 — 목록과 상세가 같은 값을 쓰도록 한 곳에서 만듭니다 */
function dimensionSummary(defect) {
  const rnd = seededRnd(defect.defectId);
  // S120(MQ) 계열은 58개, 나머지는 45개 — 실측과 같은 두 갈래
  const faiUsed = /MQ/i.test(String(defect.eqptCd)) ? 58 : 45;
  const seqCnt = 2000 + Math.floor(rnd(0) * 1800); // 2,000~3,800 회차
  const failRate = 3 + rnd(1) * 55; // 3~58% — 실측 분포(최고 67.7%)에 맞춥니다
  const failSeqCnt = Math.max(1, Math.round((seqCnt * failRate) / 100));
  // 실측에서 오늘 70건 중 9건이 어제부터 이어졌습니다 — 대략 그 비율
  const carried = rnd(2) < 0.13;
  return {
    seqCnt,
    failSeqCnt,
    failRate: Number(((failSeqCnt / seqCnt) * 100).toFixed(2)),
    passed: false, // SEQ 중 하나라도 불량이면 불량 — 실측에서는 전부 불량입니다
    seqMin: carried ? 1 + Math.floor(rnd(3) * 1500) : 1,
    partial: carried,
    cavity: CAVITIES[Math.floor(rnd(4) * CAVITIES.length)],
    faiUsed,
  };
}

/** 회차(SEQ) 목록 — 불량 회차를 앞세워 DETAIL_SEQ_CAP 개만 만듭니다 */
function dimensionSeqRows(defect, sum) {
  const rnd = seededRnd(`${defect.defectId}#seq`);
  const base = new Date(String(defect.judgedAt).replace(' ', 'T'));
  const count = Math.min(DETAIL_SEQ_CAP, sum.failSeqCnt);
  return Array.from({ length: count }, (_, i) => {
    // 불량 회차 번호를 전체 구간에 흩뿌립니다
    const seq = sum.seqMin + Math.floor((i / Math.max(count, 1)) * (sum.seqCnt - 1)) + Math.floor(rnd(i) * 3);
    const at = new Date(base.getTime() + i * 1100);
    return {
      seq,
      passed: false, // 기본이 불량 회차만 오는 응답입니다
      measuredAt: at.toISOString().slice(0, 19).replace('T', ' '),
      measurements: Array.from({ length: sum.faiUsed }, (_, k) => {
        const baseVal = FAI_PROFILE[k % FAI_PROFILE.length];
        const jitter = (rnd(i * 97 + k) - 0.5) * (baseVal > 10 ? 0.06 : 0.02);
        return { no: k + 1, value: Number((baseVal + jitter).toFixed(3)) };
      }),
    };
  });
}
