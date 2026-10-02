/**
 * [Controller] SY-15 데이터 연동 이력 (화면 ID sys-sync)
 *
 *  · 진행 중(RUNNING)·예약 대기(PENDING) 작업이 있을 때만 30초 폴링합니다. (「공통 규약」 7절 · SYN-06)
 *  · 상태 선택지는 공통코드 SYNC_STATE 의 코드값입니다 — 표시명('완료')을 보내면 서버가 400 을 냅니다(SYN-01).
 *  · 조회 일부 실패(SYN-01) — 실패한 영역(summary·list·runs…)을 `loadErrors` 로, 대표 오류를 `loadError` 로 내보냅니다.
 *    화면은 그 자리에 「불러오지 못했습니다 — {서버 메시지}」 를 그려 「데이터 없음」 과 구분합니다.
 *  · 연동 상태 줄·카드(SYN-03) — 서버 요약의 healthState·openFailJobCnt 등을 씁니다. 「실패 작업 보기」 는
 *    상태 FAIL + 기간 시작일 = 미조치 실패 중 가장 오래된 작업의 날짜(oldestOpenFailAt)로 조회합니다(SYN-08).
 *  · 재실행(SYN-02·14) — 대상 판정은 서버 `retryable`, 쓰기 권한은 `canWrite('sys-sync')`. 같은 작업을 연달아
 *    누르지 못하게 요청 중·등록 직후 작업을 기억해 둡니다(서버 409 가 정본).
 *  · 엑셀(SYN-15) — 표마다 「조회 목록(그리드 그대로, 브라우저 생성)」 과 「전체(POST /sync/export, 서버 생성)」.
 *    내려받기는 조회 권한이면 됩니다(R-10).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { firstError } from '@services/api/request';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls } from '@shared/utils/exportUtil';
import { today } from '@shared/utils/formatUtil';
import { buildGridExport } from '../model/gridExport';
import { isRetryTarget, retryConfirmText, SHOW_DRIFT_CARD } from '../model/syncModel';
import * as repo from '../model/systemRepository';

const POLL_MS = 30000;
/** 화면 ID — 쓰기 권한 판정·다운로드 이력의 「화면」 칸 */
const MENU_ID = 'sys-sync';
/** 작업 이력 조회 기간 상한(일) — 기획 8장 Q9 권장 92일 */
export const MAX_RANGE_DAYS = 92;
/** 쓰기 권한이 없을 때 안내 (공통 문서 9.7 · R-06) */
export const WRITE_DENIED_TEXT = '이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.';

/** 이관 작업 상태 코드(SYNC_STATE) → 배지 색. 완료/재시도 완료 초록 · 실패 빨강 · 예약 대기 주황 · 중단 기본 · 진행 중 파랑 */
export const jobStateTone = (state) => {
  if (state === 'DONE' || state === 'RETRY_DONE' || state === '완료' || state === '재시도 완료') return 'green';
  if (state === 'FAIL' || state === '실패') return 'red';
  if (state === 'PENDING' || state === '예약 대기') return 'amber';
  if (state === 'ABORTED' || state === '중단') return '';
  return 'blue';
};

/**
 * 엔진 실행 상태 코드(SYNC_RUN_STATE) → 배지 색
 *
 * 완료 초록 · 일부 실패 주황 · 실패/점검 실패 빨강 · 진행 중 파랑 · 대상 없음/건너뜀/중단은 기본색.
 * 예전 뷰는 'SUCCESS' 만 초록으로 봤는데 서버 코드는 DONE 이라 완료까지 전부 빨갛게 나왔습니다.
 */
export const runStateTone = (state) => {
  if (state === 'DONE' || state === 'SUCCESS') return 'green';
  if (state === 'PARTIAL') return 'amber';
  if (state === 'FAIL' || state === 'PREFLIGHT_FAIL') return 'red';
  if (state === 'RUNNING') return 'blue';
  return '';
};

/** 진행 중 판정 — 서버 코드(RUNNING)와 예전 표시명('진행 중') 둘 다 */
export const isRunning = (state) => state === 'RUNNING' || state === '진행 중';
/** 예약 대기 판정 */
export const isPending = (state) => state === 'PENDING' || state === '예약 대기';

/** 초 단위 소요 → 표시 문자열 */
export const secText = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'number') return String(v);
  if (v < 60) return `${v}초`;
  const m = Math.floor(v / 60);
  return m < 60 ? `${m}분 ${v % 60}초` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
};

/** yyyy-MM-dd 두 날짜 사이 일수 */
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

const EMPTY = { state: '전체', from: '', to: '', srcTable: '전체' };

/** 실행 이력 출처 선택지 — 기본 「MES 이관」(그룹웨어 동기화 제외, SYN-09 · 기획 8장 Q7 의 source 안) */
export const RUN_SOURCE_OPTIONS = [
  { value: 'MES', label: 'MES 이관' },
  { value: 'GROUPWARE', label: '그룹웨어 인사정보' },
  { value: '전체', label: '전체' },
];
/** 실행 이력 한 쪽 건수 (SYN-09) */
export const RUN_PAGE_SIZES = [20, 50, 100];

/** 표 작업까지 가지 못한 실행인지 — 행 클릭 시 작업 필터 대신 실행 상세를 엽니다(SYN-09) */
export const runHasJobs = (run) =>
  !!run && !['PREFLIGHT_FAIL', 'NO_WORK', 'SKIPPED'].includes(run.state) && Number(run.tableCnt ?? 0) > 0;

export function useSyncHistoryController() {
  const toast = useUiStore((state) => state.toast);
  const canWriteFn = useAuthStore((state) => state.canWrite);
  /** 쓰기 권한(R-06 · SYN-14) — 재실행 단추를 비활성으로 두고 안내합니다. 서버 403(E-AUTH-004)이 정본입니다 */
  const canWrite = canWriteFn(MENU_ID);

  // 입력 중인 조건(draft)과 조회에 쓰는 조건(applied). 상태는 고르면 바로, 기간은 「조회」 로 적용합니다
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  /* 방식(kind) 상태·선택은 「제거됨」 — 서버가 받지 않는 파라미터였습니다(SYN-01·SYN-10) */
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

  // 실행 행 클릭으로 건 작업 필터 (SYN-09) — { runId, startedAt }
  const [runFilter, setRunFilter] = useState(null);
  // 실행 이력 조건 — 결과(SYNC_RUN_STATE)·출처. 기간은 작업 이력과 공유합니다
  const [runState, setRunState] = useState('전체');
  const [runSource, setRunSource] = useState('MES');

  const paging = usePaging({ resetKey: `${JSON.stringify(applied)}|${runFilter?.runId || ''}` });
  const runPaging = usePaging({ size: 20, resetKey: `${runState}|${runSource}|${applied.from}|${applied.to}` });

  const { data, loading, reload } = useAsync(
    () => repo.loadSyncHistory({
      ...applied,
      runId: runFilter?.runId,
      driftSide,
      driftResolved: showResolvedDrift ? undefined : false,
      ...paging.params,
      runState,
      runSource,
      runPage: runPaging.page,
      runSize: runPaging.size,
      withDrift: SHOW_DRIFT_CARD,
    }),
    [applied, runFilter, driftSide, showResolvedDrift, paging.page, paging.size, runState, runSource, runPaging.page, runPaging.size],
    { silent: true }
  );

  /*
   * 실행 이력 출처 — 서버가 source 를 받기 전(API 2단계)에는 그룹웨어 실행이 섞여 옵니다.
   * 그때는 그 쪽 안에서만 한 번 더 거릅니다(쪽 수·건수는 서버 값). 서버가 거르면 아무 일도 하지 않습니다.
   */
  // 출처(source)·실행(runId)은 서버가 거릅니다(API 3단계). 3단계에 두었던 화면 쪽 이중 거름은 「제거됨」
  const runsShown = data?.runs?.items || [];
  const items = data?.list?.items || [];

  // 연동 매핑 — 진입 때 한 번만 (원본 테이블 선택지, SYN-10)
  const { data: maps } = useAsync(() => repo.loadSyncMaps(), [], { silent: true, initialData: [] });
  const rawSummary = data?.summary;
  const loadErrors = data?.errors || {};
  // 진행 중 또는 예약 대기가 있으면 폴링 — 재실행 직후 PENDING → RUNNING → DONE 을 새로고침 없이 봅니다(SYN-06)
  const hasRunning = items.some((m) => isRunning(m.state) || isPending(m.state)) || (rawSummary?.runningJobCnt ?? 0) > 0;

  useEffect(() => {
    if (!hasRunning) return undefined;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [hasRunning, reload]);

  /**
   * 요약 — 서버 필드를 화면 이름으로 맞춥니다.
   * 연동 상태 줄(SYN-03) 필드가 없는 이전 서버 응답이면 healthState 가 null 이고, 화면은 「판정 대기」 로 그립니다.
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
        healthState: rawSummary.healthState || null,
        healthReason: rawSummary.healthReason || '',
        lastRun: rawSummary.lastRun || null,
        lastSuccessAt: rawSummary.lastSuccessAt || null,
        staleMin: rawSummary.staleMin,
        consecutiveFailRuns: rawSummary.consecutiveFailRuns,
        todayFailRunCnt: rawSummary.todayFailRunCnt,
        // 미조치 실패 — 서버 판정값. 이전 서버면 null(카드가 「실패 작업」 수로 대신 보입니다)
        openFailJobCnt: rawSummary.openFailJobCnt ?? null,
        oldestOpenFailAt: rawSummary.oldestOpenFailAt || null,
        stalePendingCnt: rawSummary.stalePendingCnt,
        alert: rawSummary.alert || null,
      }
    : null;

  /** 코드 → 표시명 (이미 표시명이면 그대로) */
  const stateLabel = useCallback((c) => (c ? labelOf(stateCodes, c) : '—'), [stateCodes]);
  const kindLabel = useCallback((c) => (c ? labelOf(kindCodes, c) : '—'), [kindCodes]);
  const sideLabel = useCallback((c) => (c ? labelOf(sideCodes, c) : '—'), [sideCodes]);
  const driftKindLabel = useCallback((c) => (c ? labelOf(driftKindCodes, c) : '—'), [driftKindCodes]);
  const triggerLabel = useCallback((c) => (c ? labelOf(triggerCodes, c) : '—'), [triggerCodes]);

  // ── 조회 조건 ─────────────────────────────────────────
  const setState = useCallback((v) => {
    setDraft((d) => ({ ...d, state: v }));
    setApplied((a) => ({ ...a, state: v }));
  }, []);
  const setFrom = useCallback((v) => setDraft((d) => ({ ...d, from: v || '' })), []);
  const setTo = useCallback((v) => setDraft((d) => ({ ...d, to: v || '' })), []);

  /** 「조회」 — 기간을 적용합니다. 이미 적용된 조건이면 다시 부릅니다 */
  const search = useCallback(() => {
    const { from, to } = draft;
    if (from && to && from > to) { toast('조회 시작일이 종료일보다 늦습니다'); return; }
    if (from && to && daysBetween(from, to) > MAX_RANGE_DAYS) { toast(`기간은 최대 ${MAX_RANGE_DAYS}일까지 조회할 수 있습니다`); return; }
    if (JSON.stringify(draft) === JSON.stringify(applied)) { reload(); return; }
    setApplied(draft);
  }, [draft, applied, reload, toast]);

  const resetFilters = useCallback(() => { setDraft(EMPTY); setApplied(EMPTY); setRunFilter(null); }, []);

  /** 원본 테이블 선택 — 고르면 바로 조회 (선택지는 연동 매핑의 srcTable, SYN-08) */
  const setSrcTable = useCallback((v) => {
    setDraft((d) => ({ ...d, srcTable: v }));
    setApplied((a) => ({ ...a, srcTable: v }));
  }, []);
  const srcTableOptions = useMemo(() => {
    const names = [...new Set((maps || []).map((m) => m.srcTable).filter(Boolean))].sort();
    return [{ value: '전체', label: '전체' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [maps]);

  /** 실행 행 클릭 — 그 실행의 작업만 (SYN-09). 작업이 없는 실행은 뷰가 실행 상세를 엽니다 */
  const filterByRun = useCallback((run) => { if (run?.runId) setRunFilter({ runId: run.runId, startedAt: run.startedAt }); }, []);
  const clearRunFilter = useCallback(() => setRunFilter(null), []);

  /**
   * 「실패 작업 보기」 — 상태 FAIL, 기간 시작일 = 미조치 실패 중 가장 오래된 작업의 날짜(SYN-03·08).
   * 기본 기간(최근 7일) 밖에 남은 실패도 한 번에 보입니다.
   */
  const showFailedJobs = useCallback(() => {
    const oldest = summary?.oldestOpenFailAt ? String(summary.oldestOpenFailAt).slice(0, 10) : '';
    const next = { state: 'FAIL', from: oldest, to: oldest ? today() : '' };
    setDraft(next);
    setApplied(next);
  }, [summary?.oldestOpenFailAt]);

  // ── 상세 ───────────────────────────────────────────────
  /** 작업 상세 — 실패하면 토스트(SYN-01). 화면은 멈추지 않습니다 */
  const loadJob = useCallback(async (jobId) => {
    try {
      return await repo.fetchSyncJob(jobId);
    } catch (e) {
      toast(`작업 상세를 불러오지 못했습니다 — ${e?.message || '알 수 없는 오류'}`);
      return null;
    }
  }, [toast]);

  // ── 재실행 (SYN-02 · SYN-14) ───────────────────────────
  /** 요청 중이거나 방금 등록한 원 작업 — 목록이 새로 올 때까지 「재실행」 을 다시 열지 않습니다 */
  const inFlight = useRef(new Set());
  /** 방금 등록한 재실행 작업 — 표에서 잠시 강조합니다 */
  const [recentJobId, setRecentJobId] = useState(null);
  const recentTimer = useRef(null);
  useEffect(() => () => recentTimer.current && clearTimeout(recentTimer.current), []);
  const [retried, setRetried] = useState(() => new Set());
  // 새 목록이 오면 서버 retryable 이 정본이므로 기억을 비웁니다
  useEffect(() => { setRetried(new Set()); }, [data]);

  /** 목록·상세 행이 재실행 대상인지 — 서버 retryable(없으면 FAIL·ABORTED), 방금 등록한 작업 제외 */
  const isRetryable = useCallback((row) => isRetryTarget(row) && !retried.has(row?.jobId), [retried]);

  /**
   * 재실행 확인창 문구 — 상세를 먼저 받아 대상 테이블(params)과 이후 정상 완료(supersededBy)를 채웁니다.
   * 상세를 못 받아도 목록 행 값으로 문구를 만듭니다(부제에 undefined 가 나오지 않게, SYN-07).
   */
  const prepareRetry = useCallback(async (row) => {
    let detail = null;
    try { detail = await repo.fetchSyncJob(row.jobId); } catch { /* 목록 값으로 대신합니다 */ }
    const job = detail?.job || {};
    const params = detail?.params || {};
    return retryConfirmText({
      jobId: row.jobId,
      srcTable: row.srcTable || params.srcTable,
      dstTable: row.dstTable || params.dstTable,
      kind: row.kind || job.kind,
      supersededBy: job.supersededBy || row.supersededBy || null,
    });
  }, []);

  const retryJob = useCallback(async (jobId) => {
    if (!canWrite) { toast(WRITE_DENIED_TEXT); return { ok: false }; }
    if (inFlight.current.has(jobId)) return { ok: false };
    inFlight.current.add(jobId);
    try {
      const res = await repo.retrySyncJob(jobId);
      if (res.ok) {
        const newJobId = res.data?.newJobId;
        const sup = res.data?.supersededBy?.jobId ? ` · 이후 정상 완료된 작업 ${res.data.supersededBy.jobId} 가 있습니다` : '';
        toast(newJobId ? `재실행을 등록했습니다 — ${newJobId}. 이관 엔진이 1분 안에 실행합니다${sup}` : (res.message || '재실행을 등록했습니다'));
        setRetried((s) => new Set(s).add(jobId));
        // 새 작업을 잠시 강조합니다 (SYN-06) — 1분 뒤 해제
        if (newJobId) {
          setRecentJobId(newJobId);
          if (recentTimer.current) clearTimeout(recentTimer.current);
          recentTimer.current = setTimeout(() => setRecentJobId(null), 60000);
        }
        reload();
      } else {
        // 409(대상 상태 아님·이미 예약됨)·403(쓰기 권한 없음) 은 서버 문구 그대로
        toast(res.message || '재실행을 등록하지 못했습니다');
      }
      return res;
    } finally {
      inFlight.current.delete(jobId);
    }
  }, [canWrite, toast, reload]);

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  // ── 엑셀 (표별 · 조회 목록 / 전체) ─────────────────────
  /** 뷰가 TabulatorGrid instanceRef 로 넘겨주는 표 인스턴스 — 「조회 목록」 이 정렬·열 필터·열 순서를 읽습니다 */
  const jobsGridRef = useRef(null);
  const runsGridRef = useRef(null);
  const driftsGridRef = useRef(null);

  const jobDefs = useMemo(() => ({
    jobId: { head: '작업 ID' },
    srcTable: { head: '원본 (MSSQL)' },
    dstTable: { head: '대상 (PostgreSQL)' },
    kind: { head: '방식', value: (m) => kindLabel(m.kind) },
    startedAt: { head: '시작', value: (m) => m.startedAt || m.startAt || (m.scheduledAt ? `예약 ${m.scheduledAt}` : '') },
    duration: { head: '소요', value: (m) => secText(m.duration) },
    rows: { head: '대상 건수' },
    okRows: { head: '성공' },
    ngRows: { head: '실패' },
    state: { head: '상태', value: (m) => stateLabel(m.state) },
  }), [kindLabel, stateLabel]);
  // 내보내기 전용 열 (SYN-10) — 실패 원인은 서버·화면 모두 내부 주소를 가린 값입니다
  const jobExtras = useMemo(() => [
    { attr: 'endedAt', head: '종료', value: (m) => m.endedAt || m.endAt || '' },
    { attr: 'retryOfJobId', head: '원 작업' },
    { attr: 'checksumMatch', head: '정합성', value: (m) => (m.checksumMatch === true ? '일치' : m.checksumMatch === false ? '불일치' : '검증 전') },
    { attr: 'retryCnt', head: '재시도' },
    { attr: 'triggeredBy', head: '실행 경로', value: (m) => [m.triggeredBy ? triggerLabel(m.triggeredBy) : '', m.triggeredByName || m.triggeredByUser || ''].filter(Boolean).join(' · ') },
    { attr: 'runId', head: '소속 실행' },
    { attr: 'remark', head: '실패 원인' },
  ], [triggerLabel]);

  const runDefs = useMemo(() => ({
    runId: { head: '실행 ID' },
    modeNm: { head: '방식', value: (r) => `${r.modeNm || r.mode || ''}${r.dryRun ? ' (모의)' : ''}` },
    startedAt: { head: '시작' },
    durationSec: { head: '소요(초)' },
    tableCnt: { head: '대상 테이블' },
    successCnt: { head: '성공' },
    failCnt: { head: '실패' },
    okRows: { head: '이관 행수' },
    stateNm: { head: '상태', value: (r) => r.stateNm || r.state || '' },
    message: { head: '메모' },
  }), []);
  // 호스트는 넣지 않습니다(SYN-15 — 내부 주소)
  const runExtras = useMemo(() => [
    { attr: 'endedAt', head: '종료' },
    { attr: 'dryRun', head: '모의 여부', value: (r) => (r.dryRun ? '모의' : '') },
    { attr: 'triggeredBy', head: '실행 주체' },
    { attr: 'engineVersion', head: '엔진 버전' },
  ], []);

  const driftDefs = useMemo(() => ({
    side: { head: '발견 위치', value: (d) => sideLabel(d.side) },
    kind: { head: '구분', value: (d) => driftKindLabel(d.kind) },
    objectName: { head: '테이블' },
    mapId: { head: '이관 정의' },
    firstSeenAt: { head: '최초 발견' },
    lastSeenAt: { head: '최종 발견' },
    detectCnt: { head: '발견 횟수' },
  }), [sideLabel, driftKindLabel]);

  const jobsCond = useMemo(() => {
    const meta = data?.listMeta;
    return [
      `기간=${applied.from || applied.to ? `${applied.from || ''}~${applied.to || ''}` : '기본(최근 7일)'}`,
      `상태=${applied.state === '전체' ? '전체' : applied.state}`,
      ...(applied.srcTable && applied.srcTable !== '전체' ? [`원본=${applied.srcTable}`] : []),
      ...(runFilter ? [`실행=${runFilter.runId}`] : []),
      `쪽 ${meta?.page || paging.page}/${Math.max(1, meta?.totalPages || 1)}`,
    ].join(' · ');
  }, [applied, runFilter, data?.listMeta, paging.page]);
  const runsCond = useMemo(() => {
    const meta = data?.runsMeta;
    return [
      `결과=${runState}`,
      `출처=${RUN_SOURCE_OPTIONS.find((o) => o.value === runSource)?.label || runSource}`,
      `쪽 ${meta?.page || runPaging.page}/${Math.max(1, meta?.totalPages || 1)}`,
    ].join(' · ');
  }, [runState, runSource, data?.runsMeta, runPaging.page]);

  const exportView = useCallback(async (target) => {
    const cfg = {
      JOBS: { name: '데이터 연동 이력 — 이관 작업', ref: jobsGridRef, rows: items, defs: jobDefs, extras: jobExtras, cond: jobsCond },
      RUNS: { name: '데이터 연동 이력 — 엔진 실행', ref: runsGridRef, rows: runsShown, defs: runDefs, extras: runExtras, cond: runsCond },
      DRIFTS: { name: '데이터 연동 이력 — 스키마 드리프트', ref: driftsGridRef, rows: data?.drifts?.items || [], defs: driftDefs, extras: [], cond: showResolvedDrift ? '해소 포함' : '미해소만' },
    }[target];
    if (!cfg) return;
    if (!cfg.rows.length) { toast('내려받을 행이 없습니다 — 「전체 다운로드」 는 조건과 관계없이 받을 수 있습니다'); return; }
    const out = buildGridExport({ instance: cfg.ref.current, rows: cfg.rows, defs: cfg.defs, extras: cfg.extras });
    await downloadXls({ name: cfg.name, ...out, scope: 'VIEW', condSummary: cfg.cond, menuId: MENU_ID });
  }, [items, data, runsShown, jobDefs, jobExtras, jobsCond, runDefs, runExtras, runsCond, driftDefs, showResolvedDrift, toast]);

  /** 「전체」 — 서버가 만든 xlsx 를 그대로 받습니다. 다운로드 이력도 서버가 남깁니다(logDownload 를 부르지 않음) */
  const exportAll = useCallback(async (target) => {
    const names = { JOBS: '데이터 연동 이력 — 이관 작업', RUNS: '데이터 연동 이력 — 엔진 실행', DRIFTS: '데이터 연동 이력 — 스키마 드리프트' };
    // 화면별 상한 (기획 4.4 · 공통 D-29) — 서버가 상한까지만 담았다고 알리면 안내에 씁니다
    const limits = { JOBS: 50000, RUNS: 10000, DRIFTS: 10000 };
    const { path, body } = repo.syncExportRequest(target);
    await downloadFromServer({ path, body, name: names[target] || '데이터 연동 이력', limit: limits[target] });
  }, []);

  /** (숨긴) 연동 매핑 — 13행 남짓이라 「조회 목록」=「전체」. 단일 「전체 다운로드」 만 둡니다 */
  const exportMaps = useCallback(async () => {
    if (!maps?.length) { toast('내려받을 연동 매핑이 없습니다'); return; }
    const defs = {
      srcTable: { head: '원본 (MSSQL)' }, dstTable: { head: '대상 (PostgreSQL)' }, kind: { head: '방식' },
      keyColumns: { head: '기준 컬럼', value: (m) => m.keyColumns || m.keyColumn || '' }, schedule: { head: '주기' },
    };
    await downloadXls({ name: '데이터 연동 이력 — 연동 매핑', ...buildGridExport({ rows: maps, defs }), scope: 'ALL', condSummary: '조건 무시(전체)', menuId: MENU_ID });
  }, [maps, toast]);

  return {
    loading: loading && !data,
    items,
    hasRunning,
    summary,
    maps: maps || [],
    // 스키마 드리프트 (SY-15-F09 ~ F11)
    driftSummary: data?.driftSummary,
    drifts: data?.drifts?.items || [],
    driftSide,
    setDriftSide,
    showResolvedDrift,
    setShowResolvedDrift,
    resolveDrift: (driftId, note) => run(() => repo.resolveSchemaDrift(driftId, note)),
    filters: draft,
    applied,
    // 상태 선택지는 공통코드(SYNC_STATE)의 코드값으로 보냅니다 — 표시명('완료')을 보내면 서버가 400 을 냅니다(SYN-01)
    stateOptions: [{ value: '전체', label: '전체' }, ...stateCodes],
    stateCodesReady: stateCodes.length > 0,
    // 영역별 조회 오류 — 한 API 가 실패해도 나머지는 그리되, 빈 표가 「이력 없음」 처럼 보이지 않게 알립니다
    loadErrors,
    loadError: firstError(data),
    kindOptions: kindCodes,
    stateLabel,
    kindLabel,
    sideLabel,
    driftKindLabel,
    triggerLabel,
    paging,
    itemsMeta: data?.listMeta,
    runs: runsShown,
    runsMeta: data?.runsMeta,
    runPaging,
    runState,
    setRunState,
    runSource,
    setRunSource,
    runStateOptions: [{ value: '전체', label: '전체' }, ...(codes?.SYNC_RUN_STATE || [])],
    runSourceOptions: RUN_SOURCE_OPTIONS,
    runFilter,
    filterByRun,
    clearRunFilter,
    srcTableOptions,
    setSrcTable,
    recentJobId,
    setState,
    setFrom,
    setTo,
    search,
    resetFilters,
    showFailedJobs,
    reload,
    // 쓰기 권한·재실행
    canWrite,
    writeDeniedText: WRITE_DENIED_TEXT,
    isRetryable,
    prepareRetry,
    loadJob,
    retryJob,
    // 엑셀
    jobsGridRef,
    runsGridRef,
    driftsGridRef,
    exportView,
    exportAll,
    exportMaps,
    // 연동 테스트·수동 이관 버튼은 2026-09-08 요청으로 뺐지만 API 는 되살릴 수 있게 남겨 둡니다
    runManual: (v) => run(() => repo.runManualSync(v)),
    testConnection: repo.testConnection,
  };
}
