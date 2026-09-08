/**
 * [View] SY-15 데이터 연동 이력 (경로: /system/sync-history)
 *
 * 사내 MES(MSSQL) → AX 플랫폼(PostgreSQL) 이관 작업의 실행 이력입니다.
 * 사용 API — /api/v1/sync/*
 *
 * ■ 표는 모두 Tabulator 입니다
 * 이관 작업·드리프트는 어느 테이블에서 실패가 몰리는지 정렬해 보는 표라, 머리글 정렬·열 폭 조절이
 * 되는 `TabulatorGrid` 로 그립니다. 행 자료는 서버 응답을 그대로 두고(정렬은 원본 값으로 해야
 * 맞습니다) 보이는 모양만 formatter 에서 만듭니다. 열 정의는 한 번만 만들고 동작(재실행·상세)은
 * ref 로 읽습니다 — 열이 바뀌면 표가 통째로 다시 만들어져 사용자가 잡아 둔 정렬이 풀립니다.
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Filters, KeyValue, Loading, Pagination, SelectField, SourceNote, StatCard, TabulatorGrid, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma } from '@shared/utils/formatUtil';
import { jobStateTone, runStateTone, secText } from '../controller/useSyncHistoryController';

/**
 * 스키마 드리프트 · 연동 매핑 카드는 숨김 (2026-09-08 요청)
 *
 * 지우지 않고 끈 것입니다 — 드리프트 상세·해소 처리와 매핑 표는 그대로 있어 true 로 바꾸면 돌아옵니다.
 * 연동 매핑 자료(maps)는 숨긴 카드를 되살릴 때 그대로 쓰도록 프롭으로 계속 받습니다.
 */
const SHOW_DRIFT_CARD = false;
const SHOW_MAP_CARD = false;

export default function SyncHistoryView({
  loading, items, hasRunning, summary, maps, filters, setState, reload,
  exportExcel, loadJob, retryJob, runs = [],
  driftSummary, drifts, driftSide, setDriftSide, showResolvedDrift, setShowResolvedDrift, resolveDrift, paging, itemsMeta,
  /** 상태 코드(DONE…) → 표시명(완료…). 공통코드가 아직 안 왔으면 코드를 그대로 돌려줍니다 */
  stateLabel = (v) => v,
}) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);

  /** 실패 건 재실행 확인 */
  const retry = (row) =>
    openConfirmModal({
      title: '이관 재실행',
      sub: `${row.jobId} · ${row.srcTable} → ${row.dstTable}`,
      message: `실패 ${comma(row.ngRows)}건만 재실행합니다 (성공 ${comma(row.okRows)}건은 건너뜁니다). 재실행 전에 대상 스키마를 먼저 수정해야 같은 오류가 반복되지 않습니다.`,
      confirmLabel: '재실행',
      onConfirm: () => retryJob(row.jobId),
    });

  /**
   * 이관 작업 상세
   *
   * 상세 응답은 { job, params, mapId, errors } 형태입니다.
   * 실패 사유(remark)는 목록에는 없고 상세에만 옵니다 — 왜 실패했는지 여기서만 알 수 있습니다.
   */
  const showDetail = async (row) => {
    const detail = await loadJob(row.jobId);
    const m = detail?.job || detail;
    if (!m) return;
    const errors = detail?.errors || [];
    openModal({
      title: '이관 작업 상세',
      sub: `${m.jobId} · ${m.kind} 이관`,
      render: () => (
        <View>
          <KeyValue
            keyWidth={130}
            rows={[
              ['원본 (MSSQL)', row.srcTable],
              ['대상 (PostgreSQL)', row.dstTable],
              ['시작 시각', m.startedAt || '—'],
              ['종료 시각', m.endedAt || '진행 중'],
              ['소요 시간', m.duration != null ? `${m.duration} 초` : '—'],
              ['대상 건수', `${comma(m.rows)} 건`],
              ['이관 성공', `${comma(m.okRows)} 건`],
              ['실패', m.ngRows ? `${comma(m.ngRows)} 건` : '—'],
              [
                '정합성 검증',
                m.checksumMatch
                  ? <Badge key="v" tone="green">일치 — 건수·체크섬 대조 완료</Badge>
                  : <Badge key="v" tone="red">불일치 — 원본·대상 대조 실패</Badge>,
              ],
              ['실행 경로', m.triggeredBy === 'MANUAL' ? '수동 예약' : '정기 배치'],
              ['재시도', m.retryCnt ? `${m.retryCnt} 회` : '—'],
              ['상태', stateLabel(m.state)],
            ]}
          />
          {/* 실패 사유가 없으면 사용자는 왜 FAIL 인지 알 수 없습니다 */}
          {m.remark ? <SourceNote>{`실패 원인 — ${m.remark}`}</SourceNote> : null}
          {errors.length ? <SourceNote>{`오류 ${errors.length}건 — ${errors[0]?.message || ''}`}</SourceNote> : null}
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          {m.ngRows ? <Button label="재실행" variant="primary" onPress={() => { close(); retry(m); }} /> : null}
        </>
      ),
    });
  };

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
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          {row.resolved ? null : <Button label="해소 처리" variant="primary" onPress={() => { close(); resolveDriftRow(row); }} />}
        </>
      ),
    });

  /** 스키마 드리프트 해소 처리 */
  const resolveDriftRow = (row) =>
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

  /**
   * 표 안 버튼이 부르는 동작 — 열 정의는 한 번만 만들므로(아래 useMemo) 최신 함수를 ref 로 읽습니다.
   * 열 정의를 렌더마다 새로 만들면 Tabulator 가 표를 다시 짓고, 사용자가 잡아 둔 정렬이 풀립니다.
   */
  const act = useRef({});
  // stateLabel 은 공통코드가 도착하면 바뀌므로 함께 ref 로 읽습니다 (열 정의는 그대로)
  act.current = { retry, showDetail, resolveDriftRow, stateLabel };

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
    { title: '메모', field: 'message', minWidth: 220, widthGrow: 2 },
  ], []);

  const jobColumns = useMemo(() => [
    { title: '작업 ID', field: 'jobId', minWidth: 150, formatter: monoFmt },
    { title: '원본 (MSSQL)', field: 'srcTable', minWidth: 190, widthGrow: 2, formatter: monoFmt },
    { title: '대상 (PostgreSQL)', field: 'dstTable', minWidth: 150, formatter: monoFmt },
    { title: '방식', field: 'kind', width: 64, hozAlign: 'center' },
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
      formatter: (cell) => tag(act.current.stateLabel(cell.getValue()), jobStateTone(cell.getValue())),
    },
    {
      title: '관리',
      field: 'action',
      width: 92,
      headerSort: false,
      formatter: (cell) => (cell.getData().ngRows ? btn('재실행', true) : btn('상세')),
      // 버튼을 눌렀을 때만 — 칸의 빈 자리를 누른 것은 행 클릭(상세)이 받습니다
      cellClick: (e, cell) => { if (!e.target?.closest?.('button')) return; const r = cell.getData(); if (r.ngRows) act.current.retry(r); else act.current.showDetail(r); },
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
      formatter: (cell) => (cell.getData().resolved ? tag('해소', 'green') : btn('해소 처리')),
      cellClick: (e, cell) => { const r = cell.getData(); if (!r.resolved && e.target?.closest?.('button')) act.current.resolveDriftRow(r); },
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

  return (
    <View>
      {/* 연동 테스트 · 수동 이관 버튼은 2026-09-08 요청으로 뺐습니다 — API(connection-test · jobs/manual)는 컨트롤러에 남아 있습니다 */}
      <PageHead
        title="데이터 연동 이력"
        desc="사내 MES(MSSQL) 에서 AX 플랫폼(PostgreSQL) 으로 옮기는 이관 작업의 실행 이력입니다."
        actions={<Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />}
      />

      {/* 요약 카드는 2종만 둡니다 — 평균 소요·진행 중·스키마 드리프트 카드는 2026-09-08 요청으로 뺐습니다 */}
      <Grid cols={2}>
        <StatCard label="금일 이관 건수" value={comma(summary?.todayRows ?? 0)} unit="건" sub={hasRunning ? '성공 기준 · 진행 중 작업이 있어 30초마다 새로고침' : '성공 기준'} />
        <StatCard label="실패 건수" value={comma(summary?.failRows ?? 0)} unit="건" sub={summary?.failCnt ? `실패 작업 ${summary.failCnt}건` : '전체 정상'} tone={summary?.failRows ? 'down' : 'up'} />
      </Grid>
      <Gap />

      {/* 방식(증분/전체) 선택은 뺐습니다 — 컨트롤러의 kind 는 '전체' 로 고정돼 나갑니다 */}
      <Filters>
        <SelectField label="상태" value={filters.state} options={['전체', '예약 대기', '완료', '진행 중', '실패', '재시도 완료']} onChange={setState} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="엔진 실행 이력" sub="정기 배치·즉시 실행 단위 · 「모의」는 실제로 옮기지 않은 실행입니다 · 열 제목으로 정렬할 수 있습니다">
        <TabulatorGrid columns={runColumns} rows={runs} emptyText="엔진 실행 기록이 없습니다." />
      </Card>
      <Gap />

      <Card title="이관 작업 이력" sub={`${items.length}건 · 행을 누르면 상세를 봅니다 · 열 제목으로 정렬할 수 있습니다`}>
        <TabulatorGrid columns={jobColumns} rows={items} onRowClick={showDetail} emptyText="이관 작업 이력이 없습니다." />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
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
          </>
        }
      >
        <TabulatorGrid
          columns={driftColumns}
          rows={drifts}
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
      <Card title="연동 매핑" sub="원본 테이블 ↔ 대상 테이블 · 이관 주기">
        <TabulatorGrid columns={mapColumns} rows={maps} emptyText="등록된 연동 매핑이 없습니다." />
      </Card>
      </>
      ) : null}
    </View>
  );
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

/** 작은 버튼 — 동작은 열의 cellClick 에서 받습니다 */
const btn = (label, primary) => `<button type="button" class="tbtn${primary ? ' tbtn-primary' : ''}">${esc(label)}</button>`;

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
