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
  getProductionResults: ({ from, to, page = 1, size = 50 }) => {
    const items = RESULT_ROWS.filter((r) => (!from || r.period >= from) && (!to || r.period <= to));
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

  getProductionResultsTrend: () => RESULT_TREND,

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
