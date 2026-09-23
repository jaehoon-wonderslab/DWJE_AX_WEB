/**
 * 품질관리 목 핸들러 (API 29건)
 */
import { nowStamp } from '@shared/utils/formatUtil';
import { DEFECT_MAIN_TYPES, DEFECTS_BY_TYPE, AOI_EQUIPMENTS, AOI_DRIFT, AOI_EQUIPMENT_RISK, AOI_LOT_RISK,
  AOI_PREDICTION_BASIS, AOI_PREDICTION_SUMMARY, AOI_REMAINING_ESTIMATE, AOI_TREND_BAND, AOI_TYPE_SHIFT,
  QUALITY_AUTOFILL, QUALITY_MASKING, QUALITY_REPORT, QUALITY_REPORT_HISTORY, REPORT_FORM_FIELDS, REPORT_FORMS,
} from './data/quality';
import { LINES, PROCESSES, PRODUCTS, DEFECT_TYPES } from './data/masters';
import { dimensionSerials, dimensionFailSeqs, dimensionSeqPage } from './data/aoiDimension';
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

const fail = (code, message) => ({ success: false, code, message, data: null });

export const qualityMock = {
  /* ───────── QC-01 불량 현황 조회 ───────── */
  /**
   * 불량 요약 — 화면의 「불량 수량」·「정상 수량」 카드가 이 값을 씁니다.
   *
   * 정상 수량은 화면이 `totalQty - ngQty` 로 계산하므로 **둘 다** 있어야 합니다.
   * 예전에는 `totalCnt` 만 있어 카드가 「0 EA」·「— EA」 로 비어 보였습니다.
   */
  getQualityDefectsSummary: () => {
    const ngQty = DEFECTS_BY_TYPE.reduce((a, d) => a + d.cnt, 0);
    const defectRate = 2.6;
    return {
      totalQty: Math.round((ngQty / defectRate) * 100),
      ngQty,
      totalCnt: ngQty,
      defectRate,
      momChange: '-0.4%p',
    };
  },

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

  /**
   * 불량 상세 분해 트리 (QC-01-F04) — 공정 → 제품 → 라인 → 불량 유형
   *
   * 각 단계의 `ngQty` 는 자식들의 합입니다. 화면이 상위 합계와 하위 합을 견주므로
   * 어긋나면 트리를 펼쳤을 때 수가 맞지 않습니다.
   * 다만 **생산 분모(`okQty`)는 유형 단계에서 합산하지 않습니다** — 같은 생산 수량을 유형마다
   * 세면 분모가 유형 수만큼 부풀려집니다(서버 규약과 같습니다).
   */
  getQualityDefectsTree: ({ from, to, levels = 'wc,item,eqpt,defect' }) => {
    const tree = buildDefectTree();
    const totals = tree.reduce(
      (a, n) => ({ okQty: a.okQty + n.okQty, ngQty: a.ngQty + n.ngQty }),
      { okQty: 0, ngQty: 0 }
    );
    return {
      levels: String(levels).split(',').map((v) => v.trim()).filter(Boolean),
      period: { from: from || null, to: to || null },
      totals: { ...totals, defectRate: rate(totals.ngQty, totals.okQty + totals.ngQty) },
      items: tree,
    };
  },

  /** 제품별 불량 현황 (QC-01-F05) — 제품 → 불량 유형 → 라인 */
  getQualityDefectsByProduct: ({ from, to }) => ({
    period: { from: from || null, to: to || null },
    items: buildProductTree(),
  }),

  /* ───────── QC-02 AOI 치수 판정 (DIMENSION · MSSQL) ─────────
   * MES 라벨 이력과 **설비 집합이 다른** 원천입니다(GP-*·MQ-* vs VNA-*).
   * 화면(AOI 판정 분석)의 「불량 목록」이 이 둘을 씁니다. */

  /** 검사일 하루의 시리얼 목록 — 불량 회차 많은 순 */
  getQualityAoiDimensionSerials: ({ date, failSeqsTop = 20, page = 1, size = 25 }) => {
    const day = String(date || '').slice(0, 10) || '2026-08-28';
    const p = Math.max(1, Number(page) || 1);
    const sz = Math.max(1, Number(size) || 25);
    const list = dimensionSerials(day);
    const top = Math.max(1, Number(failSeqsTop) || 20);
    const items = list.slice((p - 1) * sz, p * sz).map((row) => {
      const failSeqs = dimensionFailSeqs(row, top);
      return { ...row, failSeqs, failSeqsTruncated: row.failSeqCnt > failSeqs.length };
    });
    return {
      success: true,
      code: 'SUCCESS',
      message: 'AOI 시리얼 목록 조회가 완료되었습니다.',
      data: { date: day, from: day, to: day, wcCd: null, eqptCd: null, sort: 'failSeqCnt', desc: true, failSeqsTop: top, items },
      meta: { page: p, size: sz, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / sz)) },
      masked: [],
    };
  },

  /** 시리얼 한 건의 회차 상세 — `only=ng`(기본) 불량 회차만 · `all` 전 회차 */
  getQualityAoiDimensionSerialByKey: ({ serialKey, only = 'ng', page = 1, size = 100 }) => {
    const key = String(serialKey || '');
    if (!/^[^~]*~[^~]*~[^~]*~[^~]*$/.test(key)) {
      return fail('E-VALID-001', 'serialKey 는 wc~eqpt~lot~serial 형식입니다.');
    }
    // 목록과 같은 값을 쓰도록, 그 시리얼이 속한 날짜를 LOT 앞뒤로 찾아봅니다
    const lot = key.split('~')[2] || '';
    const candidates = [lot, nextDayOf(lot)].filter(Boolean).map(dashed);
    let row = null;
    for (const day of candidates) {
      row = dimensionSerials(day).find((r) => r.serialKey === key);
      if (row) break;
    }
    if (!row) return fail('E-NOTFOUND', `시리얼 ${key} 을(를) 찾을 수 없습니다.`);

    const pageData = dimensionSeqPage(row, { only, page, size });
    return {
      success: true,
      code: 'SUCCESS',
      message: 'AOI 시리얼 상세 조회가 완료되었습니다.',
      data: {
        serialKey: row.serialKey,
        wcCd: row.wcCd, eqptCd: row.eqptCd, lotNo: row.lotNo, serialNo: row.serialNo,
        seqCnt: row.seqCnt, failSeqCnt: row.failSeqCnt, failRate: row.failRate, passed: row.passed,
        cavity: row.cavity, firstAt: row.firstAt, lastAt: row.lastAt,
        seqMin: row.seqMin, seqMax: row.seqMax, partial: row.partial,
        failSeqs: dimensionFailSeqs(row, 20),
        failSeqsTruncated: row.failSeqCnt > 20,
        only: only === 'all' ? 'all' : 'ng',
        faiNos: pageData.faiNos,
        spec: pageData.spec,
        limitBasis: pageData.limitBasis,
        resolution: pageData.resolution,
        items: pageData.items,
        images: [],
      },
      meta: pageData.meta,
      masked: [],
    };
  },

  /** 필터용 AOI 설비 목록 (실 서버 32대 · 목 8대) */
  getQualityAoiDefectsEquipments: () => ({ items: AOI_EQUIPMENTS.map(({ eqptCd, eqptNm, modelNm }) => ({ eqptCd, eqptNm, modelNm })) }),

  /* ───────── QC-03 품질 보고서 ───────── */
};

/* ───────── DIMENSION 목 도우미 ───────── */

/** `20260828` → `2026-08-28` */
function dashed(compactDate) {
  const v = String(compactDate || '');
  return v.length === 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v;
}

/** `20260828` → `20260829` — LOT 은 대개 전날 번호라 측정일은 하루 뒤일 수 있습니다 */
function nextDayOf(compactDate) {
  const v = dashed(compactDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(`${v}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/* ───────── 불량 분해 트리 목 ─────────
 * 값은 고정 난수로 만듭니다 — 조회할 때마다 수가 바뀌면 화면을 견줄 수 없습니다. */

const rate = (ng, total) => (total > 0 ? Number(((ng / total) * 100).toFixed(2)) : 0);

/** 트리에 쓸 제품 — 주력 8종만 씁니다(113종 전부를 펼치면 표가 읽히지 않습니다) */
const TREE_PRODUCTS = PRODUCTS.slice(0, 8).map((p) => ({ ...p, name: `${p.code} (${p.family})` }));

/**
 * 공정 → 제품 → 라인 → 불량 유형.
 *
 * 아래에서 위로 쌓습니다. 잎(유형)에서 수량을 정하고 부모는 그 합을 갖습니다 —
 * 위에서 쪼개면 반올림 때문에 합이 어긋납니다.
 */
function buildDefectTree() {
  const rnd = treeRnd('defect-tree');
  let n = 0;
  const next = () => rnd(n++);

  return PROCESSES.map((proc, pi) => {
    const items = TREE_PRODUCTS.slice(pi, pi + 3).map((prod) => {
      const eqpts = LINES.slice((pi * 2) % LINES.length, ((pi * 2) % LINES.length) + 2).map((line) => {
        const defects = DEFECT_TYPES.slice(pi, pi + 3).map((dt) => {
          const ngQty = 12 + Math.floor(next() * 180);
          return {
            level: 'defect',
            plantNm: '제1공장',
            wcCd: proc.id, wcNm: proc.name,
            itemCd: prod.code, itemNm: prod.name,
            eqptCd: line.eqptCd, eqptNm: `${line.eqptCd} ${proc.pre}`,
            defectCd: dt.code, defectNm: dt.name,
            // 유형 단계에는 생산 분모를 두지 않습니다 — 합산하면 분모가 유형 수만큼 부풀려집니다
            okQty: null,
            ngQty,
            defectRate: null,
          };
        });
        const ngQty = defects.reduce((a, d) => a + d.ngQty, 0);
        const okQty = Math.round(ngQty * (28 + next() * 24));
        return {
          level: 'eqpt',
          plantNm: '제1공장',
          wcCd: proc.id, wcNm: proc.name,
          itemCd: prod.code, itemNm: prod.name,
          eqptCd: line.eqptCd, eqptNm: `${line.eqptCd} ${proc.pre}`,
          okQty, ngQty, defectRate: rate(ngQty, okQty + ngQty),
          children: defects.map((d) => ({ ...d, ratio: Number(((d.ngQty / ngQty) * 100).toFixed(1)) })),
        };
      });
      const ngQty = eqpts.reduce((a, e) => a + e.ngQty, 0);
      const okQty = eqpts.reduce((a, e) => a + e.okQty, 0);
      return {
        level: 'item',
        plantNm: '제1공장',
        wcCd: proc.id, wcNm: proc.name,
        itemCd: prod.code, itemNm: prod.name,
        okQty, ngQty, defectRate: rate(ngQty, okQty + ngQty),
        children: eqpts,
      };
    });
    const ngQty = items.reduce((a, e) => a + e.ngQty, 0);
    const okQty = items.reduce((a, e) => a + e.okQty, 0);
    return {
      level: 'wc',
      plantNm: '제1공장',
      wcCd: proc.id, wcNm: proc.name,
      okQty, ngQty, defectRate: rate(ngQty, okQty + ngQty),
      children: items,
    };
  });
}

/** 제품 → 불량 유형 → 라인 — 같은 실적을 제품 눈으로 다시 세운 것입니다 */
function buildProductTree() {
  const rnd = treeRnd('product-tree');
  let n = 0;
  const next = () => rnd(n++);

  return TREE_PRODUCTS.map((prod, pi) => {
    const types = DEFECT_TYPES.slice(pi % 4, (pi % 4) + 3).map((dt) => {
      const eqpts = LINES.slice(pi % 6, (pi % 6) + 2).map((line) => {
        const ngQty = 8 + Math.floor(next() * 140);
        return {
          level: 'eqpt',
          plantNm: '제1공장', wcNm: PROCESSES[pi % PROCESSES.length].name,
          itemCd: prod.code, itemNm: prod.name,
          defectCd: dt.code, defectNm: dt.name,
          eqptCd: line.eqptCd, eqptNm: `${line.eqptCd} 설비`,
          totalQty: null, okQty: null, ngQty, defectRate: null,
        };
      });
      const ngQty = eqpts.reduce((a, e) => a + e.ngQty, 0);
      return {
        level: 'defect',
        plantNm: '제1공장', wcNm: PROCESSES[pi % PROCESSES.length].name,
        itemCd: prod.code, itemNm: prod.name,
        defectCd: dt.code, defectNm: dt.name,
        totalQty: null, okQty: null, ngQty, defectRate: null,
        children: eqpts.map((e) => ({ ...e, ratio: Number(((e.ngQty / ngQty) * 100).toFixed(1)) })),
      };
    });
    const ngQty = types.reduce((a, t) => a + t.ngQty, 0);
    const totalQty = Math.round(ngQty * (34 + next() * 20));
    return {
      level: 'item',
      plantNm: '제1공장', wcNm: PROCESSES[pi % PROCESSES.length].name,
      itemCd: prod.code, itemNm: prod.name,
      totalQty, okQty: totalQty - ngQty, ngQty, defectRate: rate(ngQty, totalQty),
      children: types.map((t) => ({ ...t, ratio: Number(((t.ngQty / ngQty) * 100).toFixed(1)) })),
    };
  }).sort((a, b) => b.ngQty - a.ngQty);
}

/** 키로 고정되는 난수 */
function treeRnd(key) {
  let seed = 0;
  for (const ch of String(key)) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;
  return (i) => {
    const x = Math.sin(seed + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
}
