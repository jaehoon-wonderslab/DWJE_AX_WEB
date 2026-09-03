/**
 * [Controller] SY-15 데이터 연동 이력
 *
 * 진행 중 작업이 있을 때만 30초 폴링합니다. (「공통 규약」 7절)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const POLL_MS = 30000;

export function useSyncHistoryController() {
  const toast = useUiStore((state) => state.toast);

  const [state, setState] = useState('전체');
  const [kind, setKind] = useState('전체');
  // 스키마 드리프트 — 발견 위치(원본/대상) 필터와 해소 건 포함 여부
  const [driftSide, setDriftSide] = useState('전체');
  const [showResolvedDrift, setShowResolvedDrift] = useState(false);

  const paging = usePaging({ resetKey: `${state}|${kind}` });

  const { data, loading, reload } = useAsync(
    () => repo.loadSyncHistory({ state, kind, driftSide, driftResolved: showResolvedDrift ? undefined : false, ...paging.params }),
    [state, kind, driftSide, showResolvedDrift, paging.page, paging.size],
    { silent: true }
  );

  const items = data?.list?.items || [];
  const hasRunning = items.some((m) => m.state === '진행 중');

  // 진행 중 작업이 있을 때만 폴링합니다
  useEffect(() => {
    if (!hasRunning) return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [hasRunning, reload]);

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '데이터 연동 이력',
      head: ['작업 ID', '원본', '대상', '방식', '시작', '종료', '소요', '대상 건수', '성공', '실패', '상태'],
      rows: items.map((m) => [m.jobId, m.srcTable, m.dstTable, m.kind, m.startAt, m.endAt, m.duration, m.rows, m.okRows, m.ngRows, m.state]),
    });
  }, [items]);

  return {
    loading: loading && !items.length,
    items,
    hasRunning,
    summary: data?.summary,
    maps: data?.maps?.items || [],
    policy: data?.policy,
    // 스키마 드리프트 (SY-15-F09 ~ F11)
    driftSummary: data?.driftSummary,
    drifts: data?.drifts?.items || [],
    driftSide,
    setDriftSide,
    showResolvedDrift,
    setShowResolvedDrift,
    resolveDrift: (driftId, note) => run(() => repo.resolveSchemaDrift(driftId, note)),
    filters: { state, kind },
    paging,
    itemsMeta: data?.listMeta,
    runs: data?.runs?.items || [],
    setState,
    setKind,
    reload,
    exportExcel,
    loadJob: repo.fetchSyncJob,
    retryJob: (jobId) => run(() => repo.retrySyncJob(jobId)),
    runManual: (v) => run(() => repo.runManualSync(v)),
    testConnection: repo.testConnection,
  };
}
