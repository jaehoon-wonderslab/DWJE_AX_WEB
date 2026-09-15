/**
 * 생산관리 목 핸들러 (API 18건)
 */
import { nowStamp } from '@shared/utils/formatUtil';
import {
  DAILY_DRAFT, DAILY_EVENTS, DAILY_HISTORY, DOWNTIME_SUGGESTIONS, DOWNTIMES,
  MONITOR_SUMMARY, RESULT_ROWS, RESULT_TREND,
} from './data/production';
import { COMMON_CODES, LINES } from './data/masters';
import { mockState } from './state';

/** 세션 동안 유지할 가변 데이터 */
function store() {
  if (!mockState.store.production) {
    mockState.store.production = {
      draft: JSON.parse(JSON.stringify(DAILY_DRAFT)),
      events: [...DAILY_EVENTS],
      history: [...DAILY_HISTORY],
      downtimes: JSON.parse(JSON.stringify(DOWNTIMES)),
    };
  }
  return mockState.store.production;
}

export const productionMock = {
  /* ───────── PR-01 생산 모니터링 ───────── */
  getProductionMonitorSummary: () => MONITOR_SUMMARY,

  getProductionMonitorEquipments: ({ lineRange, model, state, page = 1, size = 50 }) => {
    let items = LINES.map((l) => ({
      ...l,
      // 타발 속도는 가동률에 비례해 산출합니다 (정지 시 0)
      strokeSpeed: l.state === '비가동' ? 0 : 60 + Math.round(l.uptimeRate / 3),
      lastCollectedAt: l.state === '비가동' ? '—' : '1초 전',
    }));
    if (model && model !== '전체') items = items.filter((x) => x.model === model);
    if (state && state !== '전체') items = items.filter((x) => x.state === state);
    if (lineRange === 'PR-01 ~ PR-05') items = items.filter((x) => x.eqptCd <= 'PR-05');
    if (lineRange === 'PR-06 ~ PR-10') items = items.filter((x) => x.eqptCd > 'PR-05');
    return { items, meta: { page, size, total: items.length } };
  },

  /* ───────── PR-02 실적 집계·조회 ───────── */
  /**
   * 실적 집계 — 조회한 **기간 위에** 표본 실적을 얹어 줍니다.
   *
   * 예전에는 8월에 박힌 날짜를 그대로 걸러 내보냈습니다. 화면 기본 조회 기간이 「오늘 -7일 ~ 오늘」이라
   * 날이 바뀌면 「해당 기간의 실적이 없습니다」 만 나왔습니다(데모에서는 화면이 고장 난 것으로 보입니다).
   * 표본의 값은 그대로 두고 **날짜만 조회 구간으로 옮깁니다** — 수치의 결은 유지됩니다.
   */
  getProductionResults: ({ from, to, page = 1, size = 50 }) => {
    const items = resultRowsIn(from, to);
    const sum = items.reduce(
      (a, r) => ({ inputQty: a.inputQty + r.inputQty, okQty: a.okQty + r.okQty, ngQty: a.ngQty + r.ngQty }),
      { inputQty: 0, okQty: 0, ngQty: 0 }
    );
    return {
      items,
      summary: {
        ...sum,
        defectRate: sum.inputQty ? Number(((sum.ngQty / sum.inputQty) * 100).toFixed(1)) : 0,
        avgUptime: items.length ? Number((items.reduce((a, r) => a + r.uptimeRate, 0) / items.length).toFixed(1)) : 0,
        downtimeMin: items.reduce((a, r) => a + r.downtimeMin, 0),
      },
      meta: { page, size, total: items.length },
    };
  },

  /** 일별 추이 — 집계 결과와 같은 날짜를 씁니다(표와 그래프가 다른 날을 말하면 안 됩니다) */
  getProductionResultsTrend: ({ from, to } = {}) => {
    const rows = [...resultRowsIn(from, to)].reverse();
    if (!rows.length) return RESULT_TREND;
    return {
      labels: rows.map((r) => r.period.slice(5).replace('-', '/')),
      series: [
        { name: '생산량 (EA)', data: rows.map((r) => r.inputQty) },
        { name: '불량 수량 (EA)', data: rows.map((r) => r.ngQty) },
      ],
    };
  },

  /* ───────── PR-03 일일 생산현황 보고 ─────────
   *
   * 2026-09-04 — 서버에서 보고서 문서·결재 모형이 걷혔습니다.
   * 초안·확정·반려·생성 이력·이력 목록 목(mock)도 함께 지웠습니다.
   * 남은 두 건은 실 서버 전용이라 목을 두지 않습니다(집계 구간·설비 대수가 DB 계산값입니다).
   */

  /* ───────── PR-05 비가동 관리 ───────── */
  getProductionDowntimesSummary: () => {
    const items = store().downtimes;
    const byReason = {};
    items.forEach((d) => {
      const key = d.reasonNm || '미등록';
      byReason[key] = (byReason[key] || 0) + d.elapsedMin;
    });
    return {
      totalMin: items.reduce((a, d) => a + d.elapsedMin, 0),
      registeredCnt: items.filter((d) => d.registered).length,
      unregisteredCnt: items.filter((d) => !d.registered).length,
      byReason: Object.entries(byReason).map(([reason, min]) => ({ reason, min })),
    };
  },

  getProductionDowntimes: ({ eqptCd, reasonCd, registered, page = 1, size = 50 }) => {
    let items = store().downtimes;
    if (eqptCd && eqptCd !== '전체') items = items.filter((d) => d.eqptCd === eqptCd);
    if (reasonCd && reasonCd !== '전체') items = items.filter((d) => d.reasonNm === reasonCd);
    if (registered === true || registered === 'true') items = items.filter((d) => d.registered);
    if (registered === false || registered === 'false') items = items.filter((d) => !d.registered);
    return { items, meta: { page, size, total: items.length } };
  },

  getProductionDowntimesReasonSuggestion: ({ eqptCd }) => ({
    candidates: DOWNTIME_SUGGESTIONS[eqptCd] || [{ reasonCd: 'DT-99', reasonNm: '기타', confidence: 0.4, basis: '유사 이력 없음' }],
  }),

  postProductionDowntimes: ({ eqptCd, stopAt, resumeAt, reasonCd, remark }) => {
    const st = store();
    const code = COMMON_CODES.DOWNTIME_REASON.find((c) => c.cd === reasonCd || c.nm === reasonCd);
    const existing = st.downtimes.find((d) => d.eqptCd === eqptCd && d.stopAt === stopAt);
    if (existing) {
      existing.registered = true;
      existing.reasonCd = code?.cd || reasonCd;
      existing.reasonNm = code?.nm || reasonCd;
      existing.remark = remark || '';
      if (resumeAt) existing.resumeAt = resumeAt;
      return { success: true, code: 'SUCCESS', message: '비가동 사유를 등록했습니다.', data: { downtimeId: existing.downtimeId } };
    }
    const downtimeId = `DT-${Date.now()}`;
    st.downtimes.unshift({
      downtimeId, eqptCd, stopAt, resumeAt: resumeAt || '', elapsedMin: 0,
      registered: true, reasonCd: code?.cd || reasonCd, reasonNm: code?.nm || reasonCd, suggestion: '', remark: remark || '',
    });
    return { success: true, code: 'SUCCESS', message: '비가동 사유를 등록했습니다.', data: { downtimeId } };
  },

  putProductionDowntimesByDowntimeId: ({ downtimeId, reasonCd, remark, resumeAt }) => {
    const row = store().downtimes.find((d) => d.downtimeId === downtimeId);
    if (!row) return { success: false, code: 'E-NOTFOUND', message: '대상 비가동 이력을 찾을 수 없습니다.', data: null };
    const code = COMMON_CODES.DOWNTIME_REASON.find((c) => c.cd === reasonCd || c.nm === reasonCd);
    if (code) {
      row.reasonCd = code.cd;
      row.reasonNm = code.nm;
      row.registered = true;
    }
    if (remark !== undefined) row.remark = remark;
    if (resumeAt) row.resumeAt = resumeAt;
    return { success: true, code: 'SUCCESS', message: '비가동 사유를 수정했습니다.', data: { success: true } };
  },
};

/* ───────── 명세 외 · 백엔드 구현분 목 ───────── */

/**
 * 실적 집계 내려받기 (PR-02-F08)
 *
 * 실제 파일은 서버가 만듭니다 — 화면은 `downloadFromServer` 로 직접 내려받으므로 이 목을 거치지 않습니다.
 * 목 계층에도 등록해 두는 것은 응답 규약을 문서와 맞춰 두기 위해서입니다.
 */
Object.assign(productionMock, {
  postProductionResultsExport: ({ from, to, format = 'xlsx', scope = 'screen' }) => ({
    success: true,
    code: 'SUCCESS',
    message: '실적 집계 파일을 만들었습니다 (내려받기 이력에 기록됨)',
    data: { fileName: `실적집계_${scope}_${String(from || '').replace(/-/g, '')}_${String(to || '').replace(/-/g, '')}.${format}` },
  }),
});

/**
 * 표본 실적을 조회 구간의 날짜로 옮깁니다.
 *
 * 구간이 표본보다 길면 표본을 돌려 씁니다(7일치를 반복). 짧으면 최근 쪽부터 잘라 씁니다.
 * 날짜만 바뀌고 수치는 표본 그대로라, 같은 구간을 다시 조회하면 같은 값이 나옵니다.
 */
function resultRowsIn(from, to) {
  const days = daysBetween(from, to);
  if (!days.length) return RESULT_ROWS;
  // 최신 날짜가 위로 — 화면 기본 정렬과 같습니다
  return days
    .slice(-RESULT_ROWS.length * 4)
    .map((period, i) => ({ ...RESULT_ROWS[i % RESULT_ROWS.length], period }))
    .sort((a, b) => (a.period < b.period ? 1 : -1));
}

/** `from`~`to` 사이의 날짜 목록 (최대 60일) */
function daysBetween(from, to) {
  if (!from || !to) return [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end && out.length < 60) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
