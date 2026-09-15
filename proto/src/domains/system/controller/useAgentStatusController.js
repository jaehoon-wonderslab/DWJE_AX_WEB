/**
 * [Controller] SY-12 Agent 실행 현황
 *
 * 실시간 갱신 — 폴링 30초 (「공통 규약」 7절). 조회는 silent 라 갱신 때 깜빡이지 않고, 첫 로드에만 Loading 을 그립니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const POLL_MS = 30000;

/** Agent 상태 코드(AI_AGENT_STATE) → 배지 색. 정상 초록 · 실행중 파랑 · 오류/중지 빨강 · 대기 기본 */
export const agentStateTone = (state) => {
  if (state === 'OK' || state === '정상' || state === 'DONE' || state === 'SUCCESS' || state === '성공') return 'green';
  if (state === 'RUNNING' || state === '실행중' || state === '진행 중') return 'blue';
  if (state === 'ERROR' || state === 'STOPPED' || state === 'FAIL' || state === '오류' || state === '실패') return 'red';
  return '';
};

/** 밀리초 → `n.ns` (없으면 '—') */
export const msText = (ms) => (ms === null || ms === undefined ? '—' : `${(Number(ms) / 1000).toFixed(1)}s`);

export function useAgentStatusController() {
  const toast = useUiStore((state) => state.toast);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // 상태 표시명은 공통코드(AI_AGENT_STATE)가 정본입니다 — IDLE 을 '대기' 로 보여 줍니다
  const { data: codes } = useAsync(() => loadCodeGroups('AI_AGENT_STATE'), [], { silent: true, initialData: {} });
  const stateCodes = codes?.AI_AGENT_STATE || [];

  const { data, loading, reload } = useAsync(() => repo.loadAgents(selectedAgent), [selectedAgent], { silent: true });

  // 30초마다 자동 새로고침
  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const agents = data?.agents?.items || [];
  const rawSummary = data?.summary;

  /**
   * 요약 카드 — 서버 필드(master · agentCnt · activeAgentCnt · eventsPerMin · avgResponseSec)를 화면 이름으로 맞춥니다.
   * '전체 정상 / 이상 감지' 는 요약에 없어 Agent 목록의 error·state 로 판정합니다.
   */
  const summary = rawSummary
    ? {
        master: rawSummary.master || {},
        agentCnt: rawSummary.agentCnt ?? agents.length,
        activeAgentCnt: rawSummary.activeAgentCnt ?? agents.filter((a) => a.state === 'RUNNING' || a.state === 'OK').length,
        eventsPerMin: rawSummary.eventsPerMin ?? 0,
        avgResponseSec: rawSummary.avgResponseSec ?? null,
        allNormal: !agents.some((a) => a.error || a.state === 'ERROR' || a.state === 'STOPPED'),
      }
    : null;

  /** 상태 코드 → 표시명 (IDLE → 대기). 이미 표시명이면 그대로 */
  const stateLabel = useCallback((code) => (code ? labelOf(stateCodes, code) : '—'), [stateCodes]);

  const restart = useCallback(
    async (values) => {
      const res = await repo.restartAgent(values);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: 'Agent 실행 현황',
      head: ['#', 'Agent', '역할', '상태', '최근 실행', '처리량', '최근 소요'],
      rows: agents.map((a) => [a.no, a.name, a.desc || a.role || '', stateLabel(a.state), a.last || '', a.load ?? '', msText(a.elapsedMs)]),
    });
  }, [agents, stateLabel]);

  return {
    loading: loading && !agents.length,
    summary,
    agents,
    pipeline: data?.pipeline?.stages || [],
    runs: data?.runs?.items || [],
    runsMeta: data?.metas?.runs,
    selectedAgent,
    setSelectedAgent,
    stateLabel,
    restart,
    exportExcel,
  };
}
