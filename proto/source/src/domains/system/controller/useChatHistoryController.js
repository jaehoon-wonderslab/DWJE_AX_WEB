/**
 * [Controller] SY-08 자연어 질의 이력
 *
 * 담당자 평가가 붙은 건은 파인튜닝 학습데이터 후보가 됩니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentDays } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 응답 시간 표기 — 초 단위 소수 1자리, 없으면 '—' */
export const secText = (sec) => (sec === null || sec === undefined || sec === '' ? '—' : `${Number(sec).toFixed(1)}s`);

/** 호출 Agent — 서버는 배열로 줍니다 (빈 배열이면 '—') */
export const agentsText = (agents) => {
  if (Array.isArray(agents)) return agents.length ? agents.join(', ') : '—';
  return agents || '—';
};

export function useChatHistoryController() {
  const toast = useUiStore((state) => state.toast);

  // 질의 이력도 시스템 기록입니다 (실적 기준일과 무관)
  const [from, setFrom] = useState(recentDays(8).from);
  const [to, setTo] = useState(recentDays(8).to);
  const [group, setGroup] = useState('전체');

  // 사용자 그룹 선택지는 서버 부서 목록에서 받습니다
  const { data: deptOptions } = useAsync(repo.loadDeptOptions, [], { silent: true, initialData: ['전체'] });
  // 평가 코드(USEFUL · REASK · BAD)의 표시명은 공통코드가 정본입니다
  const { data: codes } = useAsync(() => loadCodeGroups('AI_CHAT_RATING'), [], { silent: true, initialData: {} });
  const ratingCodes = codes?.AI_CHAT_RATING || [];

  const paging = usePaging({ resetKey: `${from}|${to}|${group}` });
  const { data, loading, reload } = useAsync(
    () => repo.loadChatHistory({ from, to, group, ...paging.params }),
    [from, to, group, paging.page, paging.size]
  );
  const items = data?.list?.items || [];

  /**
   * 요약 카드 — 서버 필드명(questionCnt · avgResponseSec · requeryRate)을 화면 이름으로 맞춥니다.
   * 예전 이름(totalCnt · avgElapsedSec · reAskRate)으로 오는 응답도 같이 받습니다.
   */
  const summary = useMemo(() => {
    const raw = data?.summary;
    if (!raw) return null;
    return {
      totalCnt: raw.questionCnt ?? raw.totalCnt ?? 0,
      intentAccuracy: raw.intentAccuracy,
      avgElapsedSec: raw.avgResponseSec ?? raw.avgElapsedSec,
      reAskRate: raw.requeryRate ?? raw.reAskRate,
      targetAccuracy: raw.targetAccuracy,
      usefulCnt: raw.usefulCnt,
      badCnt: raw.badCnt,
    };
  }, [data]);

  /** 평가 코드 → 표시명 ('USEFUL' → '유용'). 이미 표시명이면 그대로 */
  const ratingLabel = useCallback((rating) => (rating ? labelOf(ratingCodes, rating) : ''), [ratingCodes]);

  const rate = useCallback(
    async (messageId, rating) => {
      const res = await repo.rateChatMessage(messageId, rating);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '자연어 질의 이력',
      head: ['시각', '질의', '해석된 의도', '호출 Agent', '응답 시간', '평가', '사용자'],
      rows: items.map((h) => [
        h.ts,
        h.question,
        h.intentNm || h.intent || '—',
        agentsText(h.agents),
        secText(h.responseSec),
        ratingLabel(h.rating) || '—',
        `${h.name || h.empNo || ''} (${h.dept || ''})`,
      ]),
    });
  }, [items, ratingLabel]);

  return {
    paging,
    itemsMeta: data?.listMeta,
    loading,
    items,
    summary,
    filters: { from, to, group },
    deptOptions,
    ratingLabel,
    setFrom,
    setTo,
    setGroup,
    reload,
    loadDetail: repo.fetchChatDetail,
    rate,
    exportExcel,
    /**
     * 학습데이터 내보내기 — 서버는 ratingFilter 를 받지 않습니다(E-VALID-001 · 받는 항목 from·to·yearMonth·scope·format).
     * 조회 중인 기간을 그대로 보내고, '유용' 평가만 담는 것은 서버 쪽 처리에 맡깁니다.
     */
    exportTrainset: async () => {
      const res = await repo.exportTrainsetByRange({ from, to });
      const cnt = res.data?.sampleCnt;
      toast(res.ok && cnt != null ? `${res.message} (표본 ${cnt}건)` : res.message);
    },
  };
}
