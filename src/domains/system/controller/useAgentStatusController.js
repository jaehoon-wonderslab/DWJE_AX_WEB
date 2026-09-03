/**
 * [Controller] SY-12 Agent 실행 현황
 *
 * 실시간 갱신 — 폴링 30초 (「공통 규약」 7절)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const POLL_MS = 30000;

export function useAgentStatusController() {
  const toast = useUiStore((state) => state.toast);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const { data, loading, reload } = useAsync(() => repo.loadAgents(selectedAgent), [selectedAgent], { silent: true });

  // 30초마다 자동 새로고침
  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const agents = data?.agents?.items || [];

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
      head: ['#', 'Agent', '역할', '상태', '최근 실행', '처리량', '관련 화면'],
      rows: agents.map((a) => [a.no, a.name, a.role, a.state, a.last, a.load, a.screens]),
    });
  }, [agents]);

  return {
    loading: loading && !agents.length,
    summary: data?.summary,
    agents,
    pipeline: data?.pipeline?.stages || [],
    runs: data?.runs?.items || [],
    selectedAgent,
    setSelectedAgent,
    restart,
    exportExcel,
  };
}
