/**
 * 자주 쓰는 보고서 — 계정별 보고서 사용 횟수 (원본은 DB)
 *
 *  · 서버: `GET /api/v1/reports/usage?top=5` 가 (사용자, 보고서)별 만든 횟수·마지막 시각(`yyyy-MM-dd HH:mm:ss`)을 횟수 순으로 돌려줍니다.
 *    (API 회신 2026-09-09 — 테이블 ax.tb_rpt_usage, V24)
 *    보고서를 고를 때 `POST /api/v1/reports/usage { screenId }` 로 1회를 기록하고, 응답의 top 목록으로 버튼 줄을 갱신합니다.
 *  · 브라우저에는 저장하지 않습니다 — 어느 브라우저에서 들어와도 같은 목록이 나옵니다.
 *  · 서버가 응답하지 않으면 목록을 비우고(버튼 줄 없음) 드롭다운만 동작합니다. 기록 실패도 화면을 막지 않습니다.
 *
 * 요청 문서: docs/requests/API_REQUEST_report_usage_20260909.md
 */
import { create } from 'zustand';
import * as reportService from '@services/api/reportService';

/** 화면에 보이는 버튼 수 (= 서버에 요청하는 top) */
export const USAGE_TOP = 5;

/** 서버 items → 상태 배열 (횟수 순 → 최근 순으로 한 번 더 정렬해 방어) */
const normalize = (items) =>
  (Array.isArray(items) ? items : [])
    .filter((x) => x && typeof x.screenId === 'string')
    .map((x) => ({ screenId: x.screenId, useCount: Number(x.useCount) || 0, lastUsedAt: x.lastUsedAt || null }))
    .sort((a, b) => (b.useCount - a.useCount) || String(b.lastUsedAt || '').localeCompare(String(a.lastUsedAt || '')))
    .slice(0, USAGE_TOP);

export const useReportUsageStore = create((set, get) => ({
  empNo: null,
  /** [{ screenId, useCount, lastUsedAt }] — 횟수 순 */
  items: [],
  loading: false,
  /** 마지막 서버 호출 성공 여부 (false 면 버튼 줄에 안내만) */
  available: true,

  /** 계정이 정해지면 서버 목록을 읽습니다. 계정이 바뀌면 이전 목록은 비웁니다 */
  load: async (empNo) => {
    if (!empNo) return;
    if (get().empNo !== empNo) set({ empNo, items: [] });
    set({ loading: true });
    try {
      const res = await reportService.getReportsUsage({ top: USAGE_TOP });
      if (res?.success) set({ items: normalize(res.data?.items), available: true });
      else set({ available: false });
    } catch {
      set({ available: false });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 보고서를 골랐을 때 1회 기록 — 화면은 먼저 갱신(낙관적)하고 서버 응답의 목록으로 맞춥니다.
   * 응답에 목록이 없으면 GET 을 한 번 더 부릅니다. 서버가 기록을 못 받으면 원래 목록으로 되돌립니다(DB 에 없는 횟수를 보이지 않기 위해).
   */
  record: async (screenId) => {
    if (!screenId) return;
    const prev = get().items;
    const hit = prev.find((x) => x.screenId === screenId);
    const optimistic = normalize([
      ...prev.filter((x) => x.screenId !== screenId),
      { screenId, useCount: (hit?.useCount || 0) + 1, lastUsedAt: new Date().toISOString() },
    ]);
    set({ items: optimistic });
    try {
      const res = await reportService.postReportsUsage({ screenId });
      if (!res?.success) return set({ items: prev, available: false });
      if (Array.isArray(res.data?.items)) set({ items: normalize(res.data.items), available: true });
      else await get().load(get().empNo);
    } catch {
      set({ items: prev, available: false });
    }
  },

  /** 가장 최근에 고른 보고서 */
  lastId: () => {
    const { items } = get();
    return [...items].sort((a, b) => String(b.lastUsedAt || '').localeCompare(String(a.lastUsedAt || '')))[0]?.screenId || null;
  },
}));
