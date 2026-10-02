/**
 * [View] SY-15 데이터 연동 이력 (경로: /system/sync-history · 화면 ID sys-sync)
 *
 * 사내 MES(MSSQL) → AX 플랫폼(PostgreSQL) 이관 작업의 실행 이력입니다.
 * 사용 API — /api/v1/sync/* (전체 다운로드는 POST /api/v1/sync/export)
 *
 * ■ 구성
 *  1. 연동 상태 줄(SYN-03) — 카드 수는 늘리지 않고(2026-09-08 요청, 카드 2종) 카드 위 한 줄로 둡니다.
 *  2. 카드 2종 — 금일 이관 건수 · 미조치 실패
 *  3. 조회 조건 — 기간 · 상태(공통코드 SYNC_STATE)
 *  4. 엔진 실행 이력 · 이관 작업 이력 — 카드마다 오른쪽 위에 [엑셀 다운로드 ▾](SYN-15). 머리말 엑셀 단추는 「제거됨」
 *
 * ■ 표는 모두 Tabulator 입니다
 * 이관 작업·드리프트는 어느 테이블에서 실패가 몰리는지 정렬해 보는 표라, 머리글 정렬·열 폭 조절이
 * 되는 `TabulatorGrid` 로 그립니다. 행 자료는 서버 응답을 그대로 두고(정렬은 원본 값으로 해야
 * 맞습니다) 보이는 모양만 formatter 에서 만듭니다. 열 정의는 한 번만 만들고 동작(재실행·상세)은
 * ref 로 읽습니다 — 열이 바뀌면 표가 통째로 다시 만들어져 사용자가 잡아 둔 정렬이 풀립니다.
 *
 * ■ 쓰기 권한(SYN-14 · R-06)
 * 재실행 단추는 숨기지 않고 비활성으로 두고 안내를 붙입니다. 서버(requireWrite, 403 E-AUTH-004)가 정본입니다.
 * 엑셀은 조회 권한이면 받습니다(R-10).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, DateField, ExportMenuButton, Filters, FormAlert, KeyValue, Loading, Pagination, SelectField,
  SourceNote, StatCard, TabulatorGrid, openConfirmModal, openFormModal,
} from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { isPending, jobStateTone, RUN_PAGE_SIZES, runHasJobs, runStateTone, secText } from '../controller/useSyncHistoryController';
import { HEALTH, healthLine, SHOW_DRIFT_CARD, SHOW_MAP_CARD } from '../model/syncModel';

/**
 * 스키마 드리프트 · 연동 매핑 카드는 숨김 (2026-09-08 요청)
 *
 * 지우지 않고 끈 것입니다 — 드리프트 상세·해소 처리와 매핑 표는 그대로 있어 true 로 바꾸면 돌아옵니다.
 * 연동 매핑 자료(maps)는 숨긴 카드를 되살릴 때 그대로 쓰도록 프롭으로 계속 받습니다.
 * 두 카드의 엑셀 단추도 카드 안에 있어 카드와 함께 숨고 함께 돌아옵니다(SYN-15).
 */
/* 플래그는 model/syncModel.js 에 둡니다 — 컨트롤러가 숨긴 카드의 자료를 조회하지 않도록 같은 값을 봅니다(SYN-10) */

/** 예약 대기가 이만큼(분) 지나면 「지연」 태그 (SYN-08) */
const STALE_PENDING_MIN = 10;

export default function SyncHistoryView({
  loading, items, hasRunning, summary, maps, filters, setState, setFrom, setTo, search, resetFilters, showFailedJobs,
  loadJob, retryJob, prepareRetry, isRetryable = () => false, canWrite = true, writeDeniedText = '', runs = [],
  driftSummary, drifts, driftSide, setDriftSide, showResolvedDrift, setShowResolvedDrift, resolveDrift, paging, itemsMeta,
  /** 상태 코드(DONE…) → 표시명(완료…). 공통코드가 아직 안 왔으면 코드를 그대로 돌려줍니다 */
  stateLabel = (v) => v,
  kindLabel = (v) => v,
  triggerLabel = (v) => v,
  /** 상태 선택지 [{ value: 코드, label: 표시명 }] — 맨 앞은 「전체」 */
  stateOptions = [{ value: '전체', label: '전체' }],
  stateCodesReady = true,
  /** 영역별 조회 오류 { summary?, list?, runs?, … } — unwrapAll 의 errors */
  loadErrors = {},
  /** 대표 오류 (firstError) */
  loadError = null,
  jobsGridRef, runsGridRef, driftsGridRef, exportView, exportAll, exportMaps,
  // 실행 이력 조건·쪽·행 클릭 필터 (SYN-09) · 원본 테이블 (SYN-08) · 새 작업 강조 (SYN-06)
  runsMeta, runPaging, runState = '전체', setRunState, runSource = 'MES', setRunSource,
  runStateOptions = [{ value: '전체', label: '전체' }], runSourceOptions = [], runFilter = null, filterByRun, clearRunFilter,
  srcTableOptions = [{ value: '전체', label: '전체' }], setSrcTable, recentJobId = null,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const router = useRouter();
  const can = useAuthStore((state) => state.can);
  const openModal = useUiStore((state) => state.openModal);

  /** 재실행 확인 — 상세에서 대상 테이블·이후 정상 완료를 받아 문구를 만듭니다(SYN-02·07) */
  const retry = async (row) => {
    if (!canWrite) return;
    const text = prepareRetry ? await prepareRetry(row) : { sub: row.jobId, message: '' };
    openConfirmModal({
      title: '이관 재실행',
      sub: text.sub,
      message: text.message,
      confirmLabel: '재실행',
      onConfirm: () => retryJob(row.jobId),
    });
  };

  /**
   * 이관 작업 상세
   *
   * 상세 응답은 { job, params, mapId, errors } 형태입니다.
   * 실패 사유(remark)는 목록에는 없고 상세에만 옵니다 — 왜 실패했는지 여기서만 알 수 있습니다.
   * 상세 조회가 실패하면 컨트롤러가 토스트로 알리고 null 을 돌려줍니다(SYN-01).
   */
  const showDetail = async (row) => {
    const detail = await loadJob(row.jobId);
    if (!detail) return;
    const m = detail?.job || detail;
    if (!m) return;
    const params = detail?.params || {};
    const errors = detail?.errors || [];
    const retryTarget = isRetryable({ ...row, ...m });
    const src = row.srcTable || params.srcTable;
    const dst = row.dstTable || params.dstTable;
    const failText = m.ngRows
      ? `${comma(m.ngRows)} 건 (스테이징 적재 실패)`
      : (m.state === 'FAIL' || m.state === '실패') ? '행 실패 없음 — 아래 실패 원인 참고' : '—';
    openModal({
      title: '이관 작업 상세',
      sub: [m.jobId || row.jobId, m.kind ? `${kindLabel(m.kind)} 이관` : null].filter(Boolean).join(' · '),
      render: () => (
        <View>
          <KeyValue
            keyWidth={130}
            rows={[
              ['원본 (MSSQL)', src || '—'],
              ['대상 (PostgreSQL)', dst || '—'],
              ...(m.runId ? [['소속 실행', m.runId]] : []),
              // 매핑 파라미터 (SYN-07)
              ...(params.srcDb ? [['원본 DB', params.srcDb]] : []),
              ...(params.keyColumns ? [['키 컬럼', params.keyColumns]] : []),
              ['증분 기준 컬럼', params.cdcColumn || '—'],
              ...(params.schedule || params.cron ? [['주기', params.schedule || params.cron]] : []),
              ['시작 시각', m.startedAt || '—'],
              ['종료 시각', m.endedAt || (isPending(m.state) ? '—' : '진행 중')],
              ['소요 시간', m.duration != null && m.duration !== '' ? secText(m.duration) : '—'],
              ['대상 건수', `${comma(m.rows ?? 0)} 건`],
              ['이관 성공', `${comma(m.okRows ?? 0)} 건`],
              ['실패', failText],
              [
                '정합성 검증',
                // true 일치 · false 불일치 · null 검증 전 (SYN-07)
                m.checksumMatch === true
                  ? <Badge key="v" tone="green">일치</Badge>
                  : m.checksumMatch === false
                    ? <Badge key="v" tone="red">불일치</Badge>
                    : <Badge key="v">검증 전(또는 미수행)</Badge>,
              ],
              ['실행 경로', `${m.triggeredBy ? triggerLabel(m.triggeredBy) : '—'}${m.triggeredByName || m.triggeredByUser ? ` · ${m.triggeredByName || m.triggeredByUser}` : ''}`],
              ['재시도', m.retryCnt ? `${m.retryCnt} 회` : '—'],
              ['상태', stateLabel(m.state)],
            ]}
          />
          {/* 실패 사유가 없으면 사용자는 왜 FAIL 인지 알 수 없습니다 — 내부 주소는 가린 값입니다(SYN-05) */}
          {m.remark ? <SourceNote>{`실패 원인 — ${m.remark}`}</SourceNote> : null}
          {/* 오류 상세 표 (SYN-07) — 모달 안 가로 스크롤, 행을 누르면 원본 행 JSON */}
          {errors.length ? <JobErrorTable errors={errors} total={detail?.errorTotal ?? errors.length} /> : null}
          {Array.isArray(m.retriedBy) && m.retriedBy.length ? (
            <SourceNote>{`재실행됨 → ${m.retriedBy.map((r) => `${r.jobId} (${stateLabel(r.state)})`).join(', ')}`}</SourceNote>
          ) : null}
          {m.supersededBy?.jobId ? (
            <SourceNote>{`이후 정상 완료: ${m.supersededBy.jobId}${m.supersededBy.endedAt ? ` (${m.supersededBy.endedAt})` : ''} — 재실행이 필요한지 확인하십시오`}</SourceNote>
          ) : null}
          {retryTarget && !canWrite ? <SourceNote>{`재실행은 쓰기 권한이 필요합니다 — ${writeDeniedText}`}</SourceNote> : null}
          {!retryTarget && m.retryBlockedReason ? <SourceNote>{`재실행할 수 없습니다 — ${m.retryBlockedReason}`}</SourceNote> : null}
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          {retryTarget ? (
            <Button label="재실행" variant="primary" disabled={!canWrite} onPress={() => { close(); retry({ ...row, ...m, srcTable: src, dstTable: dst }); }} />
          ) : null}
        </>
      ),
    });
  };

  /**
   * 실행 행 클릭 (SYN-09) — 표 작업이 있는 실행이면 작업 표를 그 실행으로 거르고,
   * 점검 실패처럼 작업이 없는 실행이면 실행 상세(메시지 전문·옵션·엔진 버전, 호스트는 넣지 않음)를 엽니다.
   */
  const onRunClick = (run) => {
    if (runHasJobs(run)) { filterByRun?.(run); return; }
    showRunDetail(run);
  };
  const showRunDetail = (run) =>
    openModal({
      title: '엔진 실행 상세',
      sub: [run.runId, run.modeNm || run.mode].filter(Boolean).join(' · '),
      render: () => (
        <View>
          <KeyValue
            keyWidth={120}
            rows={[
              ['상태', <Badge key="s" tone={runStateTone(run.state)}>{run.stateNm || run.state || '—'}</Badge>],
              ['시작', run.startedAt || '—'],
              ['종료', run.endedAt || '—'],
              ['소요', run.durationSec != null ? `${comma(run.durationSec)}초` : '—'],
              ['실행 주체', run.triggeredBy || run.triggeredByCd || '—'],
              ['옵션', run.options || '—'],
              ['모의 실행', run.dryRun ? '예 — 실제로 옮기지 않았습니다' : '아니요'],
              ['대상 테이블', `${comma(run.tableCnt ?? 0)}개 · 성공 ${comma(run.successCnt ?? 0)} · 실패 ${comma(run.failCnt ?? 0)}`],
              ['엔진 버전', run.engineVersion || '—'],
            ]}
          />
          {/* 메시지는 내부 주소를 가린 값입니다 (SYN-05) */}
          <SourceNote>{run.message ? `메시지 — ${run.message}` : '메시지 없음'}</SourceNote>
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });

  /** 스키마 드리프트 상세 — 언제부터 몇 번 발견됐는지와 조치 안내를 보여 줍니다 */
  const showDriftDetail = (row) =>
    openModal({
      title: '스키마 드리프트 상세',
      sub: `${driftSideLabel(row.side)} · ${driftKindLabel(row.kind)}`,
      render: () => (
        <View>
          <KeyValue
            keyWidth={120}
            rows={[
              ['대상 테이블', row.objectName],
              ['이관 정의', row.mapId ? `map ${row.mapId}` : '없음 (정의되지 않은 테이블)'],
              ['최초 발견', row.firstSeenAt],
              ['최종 발견', row.lastSeenAt],
              ['발견 횟수', `${comma(row.detectCnt)}회`],
              ['상태', row.resolved ? '해소' : '미해소'],
              ...(row.resolved ? [['해소 일시', row.resolvedAt], ['해소 처리', row.resolvedBy], ['조치 내용', row.resolveNote]] : []),
            ]}
          />
          <SourceNote>{row.detail}</SourceNote>
          {!row.resolved && !canWrite ? <SourceNote>{`해소 처리는 쓰기 권한이 필요합니다 — ${writeDeniedText}`}</SourceNote> : null}
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          {row.resolved ? null : <Button label="해소 처리" variant="primary" disabled={!canWrite} onPress={() => { close(); resolveDriftRow(row); }} />}
        </>
      ),
    });

  /** 스키마 드리프트 해소 처리 */
  const resolveDriftRow = (row) => {
    if (!canWrite) return;
    openFormModal({
      title: '스키마 드리프트 해소 처리',
      sub: `${row.side} · ${row.kind} · ${row.objectName}`,
      fields: [
        { key: 'detail', label: '내용', type: 'static', full: true, value: row.detail },
        { key: 'note', label: '조치 내용', type: 'textarea', rows: 2, full: true, required: true, placeholder: '예) 이관 대상 아님으로 확인 — 정의 비활성화 처리' },
      ],
      note: '원인이 남아 있으면 다음 배치에서 이관 엔진이 같은 건을 다시 엽니다.',
      submitLabel: '해소 처리',
      onSubmit: async (v) => (await resolveDrift(row.driftId, v.note)).ok,
    });
  };

  /**
   * 표 안 버튼이 부르는 동작 — 열 정의는 한 번만 만들므로(아래 useMemo) 최신 함수를 ref 로 읽습니다.
   * 열 정의를 렌더마다 새로 만들면 Tabulator 가 표를 다시 짓고, 사용자가 잡아 둔 정렬이 풀립니다.
   * 재실행 대상·쓰기 권한도 바뀌므로 함께 ref 로 읽습니다.
   */
  const act = useRef({});
  act.current = { retry, showDetail, resolveDriftRow, stateLabel, kindLabel, isRetryable, canWrite, writeDeniedText, recentJobId };

  /**
   * 엔진 실행 이력 — 이관 작업 이력과 단위가 다릅니다.
   * 작업 이력은 '표 1건의 이관', 이 표는 '엔진 1회 실행' 입니다.
   * 원본에 접속하지 못해 표 작업까지 가지 못한 실행은 작업 이력에 한 건도 안 남아,
   * 이 표가 없으면 "돌린 적 없는" 것처럼 보입니다.
   */
  const runColumns = useMemo(() => [
    { title: '실행 ID', field: 'runId', minWidth: 180, formatter: monoFmt },
    {
      // 모의 실행은 상태가 '완료' 라도 아무것도 옮기지 않았습니다.
      // 상태로는 구분되지 않으므로(모의인데 점검 실패인 경우도 있습니다) 따로 표시합니다.
      title: '방식',
      field: 'modeNm',
      width: 110,
      formatter: (cell) => `${esc(dash(cell.getValue()))}${cell.getData().dryRun ? ` ${tag('모의', 'amber')}` : ''}`,
    },
    { title: '시작', field: 'startedAt', minWidth: 150, formatter: monoFmt },
    { title: '소요', field: 'durationSec', width: 76, hozAlign: 'right', sorter: 'number', formatter: (cell) => num(cell.getValue() == null ? '—' : `${cell.getValue()}초`) },
    { title: '대상 테이블', field: 'tableCnt', width: 96, hozAlign: 'right', sorter: 'number', formatter: numFmt },
    { title: '성공', field: 'successCnt', width: 70, hozAlign: 'right', sorter: 'number', formatter: numFmt },
    { title: '실패', field: 'failCnt', width: 70, hozAlign: 'right', sorter: 'number', formatter: (cell) => (cell.getValue() ? tag(comma(cell.getValue()), 'red') : '—') },
    {
      // 모의 실행(dry-run)은 '성공 13' 인데 옮긴 행이 0 입니다. 실제 행수를 그대로 보여 줍니다.
      title: '이관 행수',
      field: 'okRows',
      width: 100,
      hozAlign: 'right',
      sorter: 'number',
      formatter: (cell) => num(comma(cell.getValue() ?? 0), !cell.getValue()),
    },
    {
      title: '상태',
      field: 'stateNm',
      width: 96,
      // 색은 서버 코드(DONE·PARTIAL·FAIL·PREFLIGHT_FAIL…)로 정합니다 — 표시명(stateNm)은 그대로 보여 줍니다
      formatter: (cell) => { const r = cell.getData(); return tag(r.stateNm || r.state, runStateTone(r.state)); },
    },
    // 메시지는 내부 주소를 가린 값입니다(SYN-05). 폭은 그대로 두고 전문은 마우스를 올려 봅니다
    { title: '메모', field: 'message', minWidth: 220, widthGrow: 2, formatter: (cell) => esc(dash(cell.getValue())), tooltip: true },
  ], []);

  const jobColumns = useMemo(() => [
    {
      title: '작업 ID', field: 'jobId', minWidth: 150,
      // 재실행 작업이면 원 작업을 회색 보조 문구로 (열 추가 없음, SYN-06)
      // 방금 등록한 재실행 작업은 「방금 등록」 태그로 잠시 강조합니다 (SYN-06)
      formatter: (cell) => {
        const r = cell.getData();
        const fresh = act.current.recentJobId && r.jobId === act.current.recentJobId ? ` ${tag('방금 등록', 'blue')}` : '';
        return `${mono(r.jobId)}${fresh}${r.retryOfJobId ? `<div class="muted">← ${esc(r.retryOfJobId)}</div>` : ''}`;
      },
    },
    { title: '원본 (MSSQL)', field: 'srcTable', minWidth: 190, widthGrow: 2, formatter: monoFmt },
    { title: '대상 (PostgreSQL)', field: 'dstTable', minWidth: 150, formatter: monoFmt },
    // 방식은 공통코드 표시명(증분·전체) — 폭 64 유지
    { title: '방식', field: 'kind', width: 64, hozAlign: 'center', formatter: (cell) => esc(act.current.kindLabel(cell.getValue())) },
    {
      title: '시작',
      // 서버 필드는 startedAt 입니다 (모의 자료는 startAt). 예전에는 startAt 만 읽어 실서버에서 이 열이 늘 비어 있었습니다
      field: 'startedAt',
      minWidth: 150,
      // 예약 대기 작업은 아직 시작하지 않았으므로 예약 시각을 보여줍니다
      formatter: (cell) => { const r = cell.getData(); return mono(r.startedAt || r.startAt || (r.scheduledAt ? `예약 ${r.scheduledAt}` : '—')); },
    },
    // 소요는 초 단위 숫자로 옵니다 — 엑셀 다운로드와 같은 표기(secText)로 맞춥니다
    { title: '소요', field: 'duration', width: 84, hozAlign: 'right', sorter: 'number', formatter: (cell) => num(secText(cell.getValue())) },
    { title: '대상 건수', field: 'rows', width: 100, hozAlign: 'right', sorter: 'number', formatter: numFmt },
    { title: '성공', field: 'okRows', width: 100, hozAlign: 'right', sorter: 'number', formatter: numFmt },
    { title: '실패', field: 'ngRows', width: 84, hozAlign: 'right', sorter: 'number', formatter: (cell) => (cell.getValue() ? tag(comma(cell.getValue()), 'red') : '—') },
    {
      title: '상태',
      field: 'state',
      width: 106,
      // 글자는 공통코드 표시명(DONE → 완료), 색은 코드·표시명 둘 다 받는 jobStateTone 으로 — 예약 대기는 진행 중과 구분해 주황
      // 예약 시각이 10분 넘게 지난 예약 대기에는 「지연」 태그 (SYN-08)
      formatter: (cell) => {
        const r = cell.getData();
        const late = isPending(r.state) && minutesSince(r.scheduledAt) >= STALE_PENDING_MIN;
        return `${tag(act.current.stateLabel(cell.getValue()), jobStateTone(cell.getValue()))}${late ? ` ${tag('지연', 'amber')}` : ''}`;
      },
    },
    {
      title: '관리',
      field: 'action',
      width: 92,
      headerSort: false,
      // 재실행 대상(서버 retryable)이면 「재실행」, 아니면 「상세」. 쓰기 권한이 없으면 「재실행」 을 비활성으로 (SYN-02·14)
      formatter: (cell) => {
        const r = cell.getData();
        if (!act.current.isRetryable(r)) return btn('상세');
        return act.current.canWrite ? btn('재실행', true) : btn('재실행', true, true, act.current.writeDeniedText);
      },
      // 버튼을 눌렀을 때만 — 칸의 빈 자리를 누른 것은 행 클릭(상세)이 받습니다
      cellClick: (e, cell) => {
        if (!e.target?.closest?.('button')) return;
        const r = cell.getData();
        if (act.current.isRetryable(r) && act.current.canWrite) act.current.retry(r);
        else act.current.showDetail(r);
      },
    },
  ], []);

  const driftColumns = useMemo(() => [
    { title: '발견 위치', field: 'side', width: 130, formatter: (cell) => esc(driftSideLabel(cell.getValue())) },
    { title: '구분', field: 'kind', width: 84, formatter: (cell) => tag(driftKindLabel(cell.getValue()), cell.getValue() === 'NEW' ? 'blue' : 'red') },
    { title: '테이블', field: 'objectName', minWidth: 260, widthGrow: 2, formatter: monoFmt },
    { title: '이관 정의', field: 'mapId', width: 96, hozAlign: 'center', formatter: (cell) => (cell.getValue() ? `map ${esc(cell.getValue())}` : '없음') },
    { title: '최초 발견', field: 'firstSeenAt', minWidth: 150, formatter: monoFmt },
    { title: '최종 발견', field: 'lastSeenAt', minWidth: 150, formatter: monoFmt },
    {
      title: '발견',
      field: 'detectCnt',
      width: 78,
      hozAlign: 'right',
      sorter: 'number',
      // 발견 횟수가 많을수록 오래 방치된 건이므로 눈에 띄게 표시합니다
      formatter: (cell) => (cell.getValue() >= 3 ? tag(`${comma(cell.getValue())}회`, 'red') : num(`${comma(cell.getValue())}회`)),
    },
    {
      title: '관리',
      field: 'action',
      width: 104,
      headerSort: false,
      formatter: (cell) => (cell.getData().resolved ? tag('해소', 'green') : btn('해소 처리', false, !act.current.canWrite, act.current.canWrite ? '' : act.current.writeDeniedText)),
      cellClick: (e, cell) => { const r = cell.getData(); if (!r.resolved && act.current.canWrite && e.target?.closest?.('button')) act.current.resolveDriftRow(r); },
    },
  ], []);

  const mapColumns = useMemo(() => [
    { title: '원본 (MSSQL)', field: 'srcTable', minWidth: 200, widthGrow: 2, formatter: monoFmt },
    { title: '대상 (PostgreSQL)', field: 'dstTable', minWidth: 160, formatter: monoFmt },
    { title: '방식', field: 'kind', width: 70, hozAlign: 'center' },
    { title: '기준 컬럼', field: 'keyColumns', minWidth: 130, formatter: monoFmt },
    { title: '주기', field: 'schedule', minWidth: 140 },
  ], []);

  if (loading) return <Loading />;

  // 미해소 드리프트 건수 — (숨긴) 드리프트 카드의 부제가 씁니다
  const openDriftCnt = driftSummary?.openCnt ?? 0;
  const summaryError = loadErrors.summary;
  const health = HEALTH[summary?.healthState] || null;
  const openFail = summary?.openFailJobCnt;
  const showFailLink = (openFail ?? 0) > 0;
  const alert = summary?.alert;

  // 연동 상태 줄 색 — OK 회색 · WARN 주황 · DOWN 빨강
  const lineTone = summaryError || !health ? 'muted' : health.tone || 'muted';
  const lineColors = {
    muted: { bg: theme.color.muted || 'rgba(0,0,0,0.04)', fg: theme.color.mutedForeground },
    amber: { bg: 'rgba(245,158,11,0.14)', fg: theme.color.warningText || theme.color.foreground },
    red: { bg: 'rgba(239,68,68,0.10)', fg: theme.color.destructive },
  }[lineTone];

  return (
    <View>
      {/* 연동 테스트 · 수동 이관 버튼은 2026-09-08 요청으로 뺐습니다 — API(connection-test · jobs/manual)는 컨트롤러에 남아 있습니다 */}
      {/* 머리말의 엑셀 단추는 「제거됨」 — 표가 여럿이라 카드마다 둡니다(SYN-15) */}
      <PageHead
        title="데이터 연동 이력"
        desc="사내 MES(MSSQL) 에서 AX 플랫폼(PostgreSQL) 으로 옮기는 이관 작업의 실행 이력입니다."
      />

      {/* 조회 일부 실패 — 어느 조회가 실패했는지 한 줄로. 성공한 카드·표는 그대로 그립니다(SYN-01) */}
      {loadError ? (
        <FormAlert tone="error" style={{ marginBottom: 12 }}>
          {`일부 조회가 실패했습니다 (${Object.keys(loadErrors).map(areaName).join(' · ')}) — ${loadError.message || ''}`}
        </FormAlert>
      ) : null}

      {/* 1. 연동 상태 줄 (SYN-03) */}
      <View
        accessibilityRole="summary"
        nativeID="sync-health-line"
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: lineColors.bg, marginBottom: 12 }}
      >
        {health && !summaryError ? <Badge tone={health.tone}>{health.label}</Badge> : null}
        <Text style={[s.textSm, { color: lineColors.fg, flexShrink: 1, flexGrow: 1, minWidth: 200 }]}>
          {summaryError
            ? `연동 상태를 확인하지 못했습니다 — ${summaryError.message || ''}`
            : !summary
              ? '연동 상태를 확인하지 못했습니다'
              : health
                ? healthLine(summary)
                : `연동 상태 판정 대기 — ${summary.lastBatchAt ? `마지막 배치 ${String(summary.lastBatchAt).slice(5, 16)}` : '배치 기록 없음'}`}
        </Text>
        {alert ? (
          <Text style={[s.textSm, { color: theme.color.mutedForeground }]}>
            {alert.condCnt ? `실패 알림 조건 ${comma(alert.condCnt)}건 · 미확인 알림 ${comma(alert.openAlertCnt ?? 0)}건` : '이관 실패 알림 조건이 없습니다'}
          </Text>
        ) : null}
        {alert?.condCnt ? <LinkText label="알림 목록" onPress={() => router.push('/alert/list')} /> : null}
        {alert && !alert.condCnt && can('alert-cond') ? <LinkText label="발송 조건 등록" onPress={() => router.push('/system/alert-condition')} /> : null}
        {showFailLink && !summaryError ? <Button label="실패 작업 보기" size="sm" onPress={showFailedJobs} /> : null}
      </View>

      {/* 2. 요약 카드는 2종만 둡니다 — 평균 소요·진행 중·스키마 드리프트 카드는 2026-09-08 요청으로 뺐습니다 */}
      <Grid cols={2}>
        <StatCard
          label="금일 이관 건수"
          value={summaryError || !summary ? '—' : comma(summary.todayRows ?? 0)}
          unit={summaryError || !summary ? undefined : '건'}
          sub={hasRunning ? '성공 기준 · 진행 중이거나 예약된 작업이 있어 30초마다 새로고침' : '성공 기준'}
        />
        {openFail !== null && openFail !== undefined ? (
          <StatCard
            label="미조치 실패"
            value={summaryError ? '—' : comma(openFail)}
            unit={summaryError ? undefined : '건'}
            sub={summaryError ? '' : openFail
              ? `오늘 실패 실행 ${comma(summary.todayFailRunCnt ?? 0)}회 · 오래된 예약 ${comma(summary.stalePendingCnt ?? 0)}건`
              : '조치할 실패 없음'}
            tone={summaryError ? undefined : openFail ? 'down' : 'up'}
          />
        ) : (
          // 이전 서버(미조치 실패 판정 없음) — 실패 작업 수로 대신 보여 줍니다
          <StatCard
            label="미조치 실패"
            value={summaryError || !summary ? '—' : comma(summary.failCnt ?? 0)}
            unit={summaryError || !summary ? undefined : '건'}
            sub={summaryError || !summary ? '' : summary.failCnt ? '실패 작업 수(서버 판정 대기)' : '조치할 실패 없음'}
            tone={summary?.failCnt ? 'down' : 'up'}
          />
        )}
      </Grid>
      <Gap />

      {/* 3. 조회 조건 — 기간(비우면 서버 기본 최근 7일, 최대 92일, 실행 이력과 공유) · 원본 테이블 · 상태(공통코드). 방식(증분/전체) 선택은 「제거됨」 */}
      <Filters>
        {/* 이관 시각은 MES 실적 보유 기간과 무관하므로 달력 범위를 묶지 않습니다 */}
        <DateField label="기간 시작" value={filters.from} onChange={setFrom} min={null} max={null} />
        <DateField label="기간 종료" value={filters.to} onChange={setTo} min={null} max={null} />
        {/* 원본 테이블 — 연동 매핑의 srcTable (SYN-08). 서버가 대소문자를 가리지 않고 비교합니다 */}
        <SelectField label="원본 테이블" value={filters.srcTable || '전체'} options={srcTableOptions} onChange={setSrcTable} style={{ minWidth: 220 }} />
        <SelectField
          label="상태"
          value={filters.state}
          options={stateOptions}
          onChange={setState}
          hint={stateCodesReady ? undefined : '상태 코드를 불러오는 중입니다'}
        />
        <Button label="조회" variant="primary" onPress={search} />
        <Button label="초기화" variant="ghost" onPress={resetFilters} />
      </Filters>

      <Card
        title="엔진 실행 이력"
        sub={`${comma(runsMeta?.total ?? runs.length)}건 · 정기 배치·즉시 실행 단위 · 「모의」는 실제로 옮기지 않은 실행 · 행을 누르면 그 실행의 작업만 봅니다(작업이 없는 실행은 상세) · 메모의 내부 주소는 가려서 보입니다`}
        right={
          <ExportMenuButton
            viewCount={runs.length}
            onExportView={() => exportView?.('RUNS')}
            onExportAll={() => exportAll?.('RUNS')}
          />
        }
      >
        {/* 실행 이력 조건 — 결과(SYNC_RUN_STATE) · 출처(기본 MES 이관, 그룹웨어 제외). 기간은 위 조건과 공유 (SYN-09) */}
        <Filters>
          <SelectField label="결과" value={runState} options={runStateOptions} onChange={setRunState} />
          <SelectField label="출처" value={runSource} options={runSourceOptions} onChange={setRunSource} />
        </Filters>
        {loadErrors.runs ? (
          <FormAlert tone="error">{`불러오지 못했습니다 — ${loadErrors.runs.message || ''}`}</FormAlert>
        ) : (
          <TabulatorGrid columns={runColumns} rows={runs} instanceRef={runsGridRef} onRowClick={onRunClick} emptyText="선택한 조건의 엔진 실행 기록이 없습니다." />
        )}
        <Pagination meta={runsMeta} sizes={RUN_PAGE_SIZES} {...(runPaging?.bind || {})} />
      </Card>
      <Gap />

      <Card
        title="이관 작업 이력"
        sub={runFilter
          ? `실행 ${runFilter.runId} 의 작업 ${comma(itemsMeta?.total ?? items.length)}건 · 행을 누르면 상세를 봅니다`
          : `${comma(itemsMeta?.total ?? items.length)}건 · 행을 누르면 상세를 봅니다 · 열 제목으로 정렬할 수 있습니다`}
        right={
          <>
            {runFilter ? <Button label="실행 조건 해제" size="sm" onPress={clearRunFilter} /> : null}
            <ExportMenuButton
              viewCount={items.length}
              onExportView={() => exportView?.('JOBS')}
              onExportAll={() => exportAll?.('JOBS')}
            />
          </>
        }
      >
        {loadErrors.list ? (
          // 조회 실패는 빈 상태 문구와 섞지 않습니다 (SYN-01)
          <FormAlert tone="error">{`불러오지 못했습니다 — ${loadErrors.list.message || ''}`}</FormAlert>
        ) : (
          <TabulatorGrid
            columns={jobColumns}
            rows={items}
            instanceRef={jobsGridRef}
            onRowClick={showDetail}
            emptyText="선택한 조건의 이관 작업이 없습니다. 기간을 넓히거나 상태를 「전체」로 바꿔 보십시오."
          />
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        {!canWrite ? <SourceNote>{`재실행은 쓰기 권한이 필요합니다 — ${writeDeniedText}`}</SourceNote> : null}
      </Card>

      {SHOW_DRIFT_CARD ? (
      <>
      <Gap />
      <Card
        title="스키마 드리프트"
        sub={
          openDriftCnt
            ? `미해소 ${openDriftCnt}건 · 원본 신규 ${driftSummary?.sourceNewCnt ?? 0} / 원본 유실 ${driftSummary?.sourceMissingCnt ?? 0} / 대상 신규 ${driftSummary?.targetNewCnt ?? 0} / 대상 유실 ${driftSummary?.targetMissingCnt ?? 0}`
            : '이관 정의와 원본·대상 테이블 구성이 일치합니다'
        }
        right={
          <>
            <Button
              label={driftSide === '전체' ? '전체 위치' : driftSideLabel(driftSide)}
              size="sm"
              onPress={() => setDriftSide((v) => (v === '전체' ? 'SOURCE' : v === 'SOURCE' ? 'TARGET' : '전체'))}
            />
            <Button
              label={showResolvedDrift ? '해소 건 포함' : '미해소만'}
              size="sm"
              onPress={() => setShowResolvedDrift((v) => !v)}
            />
            <ExportMenuButton
              viewCount={drifts?.length}
              onExportView={() => exportView?.('DRIFTS')}
              onExportAll={() => exportAll?.('DRIFTS')}
            />
          </>
        }
      >
        <TabulatorGrid
          columns={driftColumns}
          rows={drifts}
          instanceRef={driftsGridRef}
          onRowClick={showDriftDetail}
          emptyText={showResolvedDrift
            ? '기록된 스키마 드리프트가 없습니다.'
            : '미해소 드리프트가 없습니다. 이관 정의(연동 매핑)와 원본·대상 DB 의 테이블 구성이 일치합니다.'}
        />
      </Card>
      </>
      ) : null}

      {SHOW_MAP_CARD ? (
      <>
      <Gap />
      <Card
        title="연동 매핑"
        sub="원본 테이블 ↔ 대상 테이블 · 이관 주기"
        // 13행 남짓이라 「조회 목록」=「전체」 — 패널 없이 단일 단추 (SYN-15)
        right={<Button label={`전체 다운로드 (${comma(maps?.length ?? 0)}건)`} size="sm" icon="download" onPress={exportMaps} />}
      >
        <TabulatorGrid columns={mapColumns} rows={maps} emptyText="등록된 연동 매핑이 없습니다." />
      </Card>
      </>
      ) : null}
    </View>
  );
}

/** 오류 상세 표에서 보여 주는 최대 행 수 (서버도 500건까지만 줍니다) */
const ERROR_LIMIT = 500;

/**
 * 작업 오류 상세 표 (SYN-07) — 순번 64 · 오류 코드 90 · 메시지 minWidth 320(줄바꿈) · 원본 키 minWidth 200(mono).
 * 행을 누르면 원본 행(JSON)을 아래 접힌 영역에 펼칩니다. 서버 3단계 전에는 srcKey·payload 대신 rawData 하나가 옵니다.
 */
function JobErrorTable({ errors, total }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [picked, setPicked] = useState(null);
  const rows = useMemo(() => errors.slice(0, ERROR_LIMIT).map((e, i) => ({ ...e, _key: `${e.rowNo ?? i}-${i}` })), [errors]);
  const columns = useMemo(() => [
    { title: '순번', field: 'rowNo', width: 64, hozAlign: 'right', sorter: 'number', formatter: numFmt },
    { title: '오류 코드', field: 'code', width: 90, formatter: monoFmt },
    { title: '메시지', field: 'message', minWidth: 320, widthGrow: 2, formatter: (cell) => `<div style="white-space:normal;word-break:break-word">${esc(dash(cell.getValue()))}</div>` },
    { title: '원본 키', field: 'srcKey', minWidth: 200, formatter: (cell) => { const r = cell.getData(); return mono(r.srcKey ?? keyOf(r.rawData)); } },
  ], []);
  const raw = picked ? picked.payload ?? picked.rawData ?? picked.srcKey : null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[s.label, { marginBottom: 6 }]}>{`오류 ${comma(total)}건`}</Text>
      <TabulatorGrid columns={columns} rows={rows} rowKey="_key" onRowClick={(r) => setPicked((p) => (p?._key === r._key ? null : r))} headerFilter={false} emptyText="기록된 오류가 없습니다." />
      {total > ERROR_LIMIT ? <SourceNote>{`앞 ${ERROR_LIMIT}건만 표시합니다 (전체 ${comma(total)}건)`}</SourceNote> : null}
      {picked ? (
        <View style={[s.cardNested, { padding: 10, marginTop: 8 }]}>
          <Text style={[s.textSm, { color: theme.color.mutedForeground, marginBottom: 4 }]}>{`원본 행 — 순번 ${picked.rowNo ?? '—'}`}</Text>
          <Text style={[s.mono, { fontSize: 14 }]} selectable>{raw ? prettyJson(raw) : '원본 행이 기록되지 않았습니다'}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** rawData 가 JSON 이면 보기 좋게, 아니면 그대로 */
function prettyJson(v) {
  if (typeof v !== 'string') return JSON.stringify(v, null, 2);
  try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; }
}

/** rawData 에서 원본 키 부분만 — JSON 이 아니면 앞 80자 */
function keyOf(raw) {
  if (raw === null || raw === undefined || raw === '') return '—';
  if (typeof raw === 'string' && !raw.trim().startsWith('{')) return raw.slice(0, 80);
  return '—';
}

/** 상태 줄 안의 글자 링크 */
function LinkText({ label, onPress }) {
  const theme = useTheme();
  const s = useCommonStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      <Text style={[s.textSm, { color: theme.color.info, textDecorationLine: 'underline' }]}>{label}</Text>
    </Pressable>
  );
}

/** 조회 영역 키 → 화면 이름 (FormAlert 의 「어느 조회가 실패했는지」) */
function areaName(key) {
  return {
    summary: '연동 상태', list: '이관 작업 이력', runs: '엔진 실행 이력', maps: '연동 매핑',
    driftSummary: '드리프트 요약', drifts: '스키마 드리프트',
  }[key] || key;
}

/** 'yyyy-MM-dd HH:mm(:ss)' 이후 지난 분 — 값이 없으면 0 */
function minutesSince(stamp) {
  if (!stamp) return 0;
  const t = new Date(String(stamp).replace(' ', 'T')).getTime();
  if (!Number.isFinite(t)) return 0;
  return (Date.now() - t) / 60000;
}

/* ───────── Tabulator 셀 HTML 도우미 — 값은 서버 문자열이므로 이스케이프해서 넣습니다 ───────── */

/** HTML 특수문자 이스케이프 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/** 빈 값은 대시로 */
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

/** 배지 — TabulatorGrid 의 .tag 클래스 (Badge 와 같은 색) */
const tag = (text, tone) => `<span class="tag${tone ? ` tag-${tone}` : ''}">${esc(text)}</span>`;

/**
 * 작은 버튼 — 동작은 열의 cellClick 에서 받습니다.
 * 비활성이면 disabled 와 title(마우스를 올리면 보이는 안내)을 붙입니다 — 쓰기 권한 없음(R-06)
 */
const btn = (label, primary, disabled, title) =>
  `<button type="button" class="tbtn${primary ? ' tbtn-primary' : ''}"${disabled ? ' disabled aria-disabled="true" style="opacity:.45;cursor:not-allowed"' : ''}${title ? ` title="${esc(title)}"` : ''}>${esc(label)}</button>`;

/** 고정폭 글자 */
const mono = (v) => `<span class="mono">${esc(dash(v))}</span>`;

/** 자릿수가 흔들리지 않는 숫자 — muted 면 옅게 */
const num = (v, muted) => `<span class="num${muted ? ' muted' : ''}">${esc(v)}</span>`;

const monoFmt = (cell) => mono(cell.getValue());
const numFmt = (cell) => num(comma(cell.getValue() ?? 0));

/** 드리프트 발견 위치 라벨 */
function driftSideLabel(side) {
  return side === 'SOURCE' ? '원본 (MES)' : side === 'TARGET' ? '대상 (AX)' : '전체 위치';
}

/** 드리프트 구분 라벨 — NEW 는 정의에 없는 신규, MISSING 은 정의에는 있으나 사라진 테이블 */
function driftKindLabel(kind) {
  return kind === 'NEW' ? '신규' : '유실';
}
