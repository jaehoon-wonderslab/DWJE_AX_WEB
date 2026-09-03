/**
 * [Controller] SY-15 데이터 연동 이력
 *
 * 진행 중 작업이 있을 때만 30초 폴링합니다. (「공통 규약」 7절)
 */
import { useCallback, useEffect, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const POLL_MS = 30000;

/** 이관 작업 상태 코드(SYNC_STATE) → 배지 색. 완료/재시도 완료 초록 · 실패 빨강 · 예약 대기 주황 · 중단 기본 · 진행 중 파랑 */
export const jobStateTone = (state) => {
  if (state === 'DONE' || state === 'RETRY_DONE' || state === '완료' || state === '재시도 완료') return 'green';
  if (state === 'FAIL' || state === '실패') return 'red';
  if (state === 'PENDING' || state === '예약 대기') return 'amber';
  if (state === 'ABORTED' || state === '중단') return '';
  return 'blue';
};

/** 진행 중 판정 — 서버 코드(RUNNING)와 예전 표시명('진행 중') 둘 다 */
export const isRunning = (state) => state === 'RUNNING' || state === '진행 중';

/** 초 단위 소요 → 표시 문자열 */
export const secText = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'number') return String(v);
  if (v < 60) return `${v}초`;
  const m = Math.floor(v / 60);
  return m < 60 ? `${m}분 ${v % 60}초` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
};

export function useSyncHistoryController() {
  const toast = useUiStore((state) => state.toast);

  const [state, setState] = useState('전체');
  const [kind, setKind] = useState('전체');
  // 스키마 드리프트 — 발견 위치(원본/대상) 필터와 해소 건 포함 여부
  const [driftSide, setDriftSide] = useState('전체');
  const [showResolvedDrift, setShowResolvedDrift] = useState(false);

  // 상태·방식·드리프트 위치/구분·엔진 실행 상태의 선택지와 표시명은 공통코드가 정본입니다.
  // 화면에 '완료' 를 박아 보내면 서버(DONE)가 400 을 냅니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('SYNC_STATE', 'SYNC_KIND', 'SYNC_DRIFT_SIDE', 'SYNC_DRIFT_KIND', 'SYNC_RUN_STATE', 'SYNC_RUN_MODE', 'SYNC_TRIGGER'),
    [],
    { silent: true, initialData: {} }
  );
  const stateCodes = codes?.SYNC_STATE || [];
  const kindCodes = codes?.SYNC_KIND || [];
  const sideCodes = codes?.SYNC_DRIFT_SIDE || [];
  const driftKindCodes = codes?.SYNC_DRIFT_KIND || [];
  const triggerCodes = codes?.SYNC_TRIGGER || [];

  const paging = usePaging({ resetKey: `${state}|${kind}` });

  const { data, loading, reload } = useAsync(
    () => repo.loadSyncHistory({ state, kind, driftSide, driftResolved: showResolvedDrift ? undefined : false, ...paging.params }),
    [state, kind, driftSide, showResolvedDrift, paging.page, paging.size],
    { silent: true }
  );

  const items = data?.list?.items || [];
  const rawSummary = data?.summary;
  const hasRunning = items.some((m) => isRunning(m.state)) || (rawSummary?.runningJobCnt ?? 0) > 0;

  // 진행 중 작업이 있을 때만 폴링합니다
  useEffect(() => {
    if (!hasRunning) return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [hasRunning, reload]);

  /**
   * 요약 카드 — 서버 필드(todayRows · failedRows · failedJobCnt · runningJobCnt · avgDurationMin · lastBatchAt)를 화면 이름으로 맞춥니다.
   */
  const summary = rawSummary
    ? {
        syncState: rawSummary.syncState,
        todayRows: rawSummary.todayRows ?? 0,
        failRows: rawSummary.failedRows ?? rawSummary.failRows ?? 0,
        failCnt: rawSummary.failedJobCnt ?? rawSummary.failCnt ?? 0,
        avgDurationMin: rawSummary.avgDurationMin,
        runningCnt: rawSummary.runningJobCnt ?? rawSummary.runningCnt ?? items.filter((m) => isRunning(m.state)).length,
        totalJobCnt: rawSummary.totalJobCnt,
        lastBatchAt: rawSummary.lastBatchAt,
      }
    : null;

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  /** 코드 → 표시명 (이미 표시명이면 그대로) */
  const stateLabel = useCallback((c) => (c ? labelOf(stateCodes, c) : '—'), [stateCodes]);
  const kindLabel = useCallback((c) => (c ? labelOf(kindCodes, c) : '—'), [kindCodes]);
  const sideLabel = useCallback((c) => (c ? labelOf(sideCodes, c) : '—'), [sideCodes]);
  const driftKindLabel = useCallback((c) => (c ? labelOf(driftKindCodes, c) : '—'), [driftKindCodes]);
  const triggerLabel = useCallback((c) => (c ? labelOf(triggerCodes, c) : '—'), [triggerCodes]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '데이터 연동 이력',
      head: ['작업 ID', '원본', '대상', '방식', '시작', '종료', '소요', '대상 건수', '성공', '실패', '상태'],
      rows: items.map((m) => [
        m.jobId, m.srcTable, m.dstTable, kindLabel(m.kind), m.startedAt || m.startAt || (m.scheduledAt ? `예약 ${m.scheduledAt}` : ''),
        m.endedAt || m.endAt || '', secText(m.duration), m.rows, m.okRows, m.ngRows, stateLabel(m.state),
      ]),
    });
  }, [items, kindLabel, stateLabel]);

  return {
    loading: loading && !data,
    items,
    hasRunning,
    summary,
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
    stateOptions: stateCodes,
    kindOptions: kindCodes,
    stateLabel,
    kindLabel,
    sideLabel,
    driftKindLabel,
    triggerLabel,
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
