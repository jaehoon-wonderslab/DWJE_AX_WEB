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

  /* ───────── PR-03 일일 생산현황 보고 ───────── */
  getProductionDailyReportsDraft: () => store().draft,

  postProductionDailyReportsDraftRegenerate: () => {
    const st = store();
    st.draft = JSON.parse(JSON.stringify(DAILY_DRAFT));
    st.draft.version += 1;
    st.draft.generatedAt = nowStamp();
    st.events.unshift({ ts: nowStamp(), type: '초안 재생성', detail: `v${st.draft.version} 재생성`, by: mockState.currentUser.name });
    return { success: true, code: 'SUCCESS', message: '초안을 다시 생성했습니다.', data: { reportId: st.draft.reportId, version: st.draft.version } };
  },

  putProductionDailyReportsByReportId: ({ sections }) => {
    const st = store();
    if (sections) st.draft.sections = sections;
    const correctionCnt = (st.draft.correctionCnt || 0) + 1;
    st.draft.correctionCnt = correctionCnt;
    st.events.unshift({ ts: nowStamp(), type: '항목 보정', detail: `${correctionCnt}번째 보정`, by: mockState.currentUser.name });
    return { success: true, code: 'SUCCESS', message: '보고서 항목을 보정했습니다.', data: { reportId: st.draft.reportId, correctionCnt } };
  },

  postProductionDailyReportsByReportIdSave: ({ sections }) => {
    const st = store();
    if (sections) st.draft.sections = sections;
    return { success: true, code: 'SUCCESS', message: '보고서를 임시 저장했습니다.', data: { success: true } };
  },

  postProductionDailyReportsByReportIdConfirm: () => {
    const st = store();
    st.draft.state = '확정';
    const confirmedAt = nowStamp();
    st.events.unshift({ ts: confirmedAt, type: '확정', detail: `v${st.draft.version} 확정`, by: mockState.currentUser.name });
    const row = st.history.find((h) => h.reportId === st.draft.reportId);
    if (row) {
      row.state = '확정';
      row.confirmedAt = confirmedAt;
    }
    return {
      success: true,
      code: 'SUCCESS',
      message: '보고서를 확정했습니다.',
      data: { state: '확정', confirmedAt, confirmedBy: mockState.currentUser.name },
    };
  },

  postProductionDailyReportsByReportIdReject: ({ reason }) => {
    const st = store();
    st.draft.state = '반려';
    st.events.unshift({ ts: nowStamp(), type: '반려', detail: reason || '사유 미기재', by: mockState.currentUser.name });
    return { success: true, code: 'SUCCESS', message: '보고서를 반려했습니다.', data: { state: '반려' } };
  },

  getProductionDailyReportsByReportIdEvents: () => ({ events: store().events }),

  getProductionDailyReports: ({ from, to, state, page = 1, size = 50 }) => {
    let items = store().history;
    if (from) items = items.filter((r) => r.targetDate >= from);
    if (to) items = items.filter((r) => r.targetDate <= to);
    if (state && state !== '전체') items = items.filter((r) => r.state === state);
    return { items, meta: { page, size, total: items.length } };
  },

  postProductionDailyReportsByReportIdCopy: ({ targetDate }) => {
    const st = store();
    const newReportId = `DR-${String(targetDate || '').replace(/-/g, '')}`;
    st.history.unshift({
      reportId: newReportId,
      targetDate,
      version: 1,
      state: '검토 대기',
      generatedAt: nowStamp(),
      confirmedAt: '',
      correctionCnt: 0,
    });
    return { success: true, code: 'SUCCESS', message: '이전 보고서를 새 기간으로 복제했습니다.', data: { newReportId } };
  },

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
