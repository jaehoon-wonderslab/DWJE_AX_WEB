/**
 * [View] SY-15 데이터 연동 이력 (경로: /system/sync-history)
 *
 * 사내 MES(MSSQL) → AX 플랫폼(PostgreSQL) 이관 작업의 실행 이력입니다.
 * 사용 API 8건 — /api/v1/sync/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Filters, KeyValue, Loading, Pagination, SelectField, SourceNote, StatCard, Table, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma } from '@shared/utils/formatUtil';

/** 엔진 정기 배치 시각 (엔진 설정과 맞춰 둡니다) */
const BATCH_HOUR = 8;

export default function SyncHistoryView({
  loading, items, hasRunning, summary, maps, policy, filters, setState, setKind, reload,
  exportExcel, loadJob, retryJob, runManual, testConnection, runs = [],
  driftSummary, drifts, driftSide, setDriftSide, showResolvedDrift, setShowResolvedDrift, resolveDrift, paging, itemsMeta,
}) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);

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
              ['상태', m.state],
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

  /**
   * 수동 이관 예약
   *
   * 서버가 받는 것은 `srcTables`(배열) · `kind`(full|incremental) · `scheduledAt` 입니다.
   * 예전에는 폼 키(table · runAt)와 표시명(증분 · 지금 실행)이 그대로 나가 400 이 났습니다.
   *
   * 증분은 기준 컬럼(cdcColumn)이 있는 테이블만 됩니다. 13개 중 4개뿐이라
   * 없는 테이블은 선택지에서 빼 두어야 사용자가 400 을 만나지 않습니다.
   */
  const openManualForm = () =>
    openFormModal({
      title: '수동 이관 예약',
      sub: '정기 배치 외에 지금 또는 다음 배치에 이관을 실행합니다',
      initial: { srcTable: maps[0]?.srcTable, kind: 'full', now: true },
      fields: [
        {
          key: 'srcTable',
          label: '대상 테이블',
          type: 'select',
          required: true,
          full: true,
          // 증분은 기준 컬럼이 있는 표만 됩니다 (13개 중 3개). 선택지에 미리 밝혀 둡니다
          options: maps.map((x) => ({
            value: x.srcTable,
            label: `${x.srcTable} · ${x.cdcColumn ? '증분·전체' : '전체만'}`,
          })),
        },
        { key: 'kind', label: '이관 방식', type: 'select', options: [{ value: 'full', label: '전체' }, { value: 'incremental', label: '증분' }] },
        { key: 'now', label: '실행 시점', type: 'radio', full: true, options: [{ value: true, label: '지금 실행' }, { value: false, label: `다음 배치 (${BATCH_HOUR}:00)` }] },
      ],
      note: `증분은 기준 컬럼이 있는 표(${maps.filter((x) => x.cdcColumn).map((x) => x.srcTable).join(' · ') || '없음'})에서만 됩니다. 전체 이관은 대상 테이블을 비우고 다시 채우므로 조회가 잠시 느려질 수 있습니다.`,
      submitLabel: '실행',
      onSubmit: async (v) => {
        const picked = maps.find((x) => x.srcTable === v.srcTable);
        if (v.kind === 'incremental' && !picked?.cdcColumn) {
          toast(`${v.srcTable} 은(는) 증분 기준 컬럼이 없어 전체 이관만 됩니다`);
          return false;
        }
        const res = await runManual({
          srcTables: [v.srcTable],
          kind: v.kind,
          // '지금 실행' 이면 시각을 보내지 않습니다 (서버가 현재 시각으로 처리합니다)
          ...(v.now ? {} : { scheduledAt: nextBatchAt() }),
        });
        return res.ok;
      },
    });

  /** 연동 테스트 */
  const runConnectionTest = async () => {
    const res = await testConnection();
    openModal({
      title: '연동 테스트',
      sub: 'MES · AX · 사업관리시스템 연결 점검',
      render: () => (
        <View>
          {(res.data?.results || []).map((r) => (
            <View key={r.target} style={s.kvRow}>
              <Text style={[s.kvKey, { width: 220 }]}>{r.target}</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Badge tone={r.result === '성공' ? 'green' : 'red'}>{r.result}</Badge>
                <Text style={s.textXs}>{`${r.elapsedMs} ms`}</Text>
              </View>
            </View>
          ))}
          <SourceNote>{res.message}</SourceNote>
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
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

  if (loading) return <Loading />;

  // 미해소 드리프트 건수 — KPI 카드와 안내 문구가 함께 씁니다
  const openDriftCnt = driftSummary?.openCnt ?? 0;

  return (
    <View>
      <PageHead
        title="데이터 연동 이력"
        desc="사내 MES(MSSQL) 에서 AX 플랫폼(PostgreSQL) 으로 옮기는 이관 작업의 실행 이력입니다. 실패 건은 원인 확인 후 재실행할 수 있습니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="연동 테스트" size="sm" icon="link" onPress={runConnectionTest} />
            <Button label="수동 이관" size="sm" variant="primary" icon="play" onPress={openManualForm} />
          </>
        }
      />

      <Grid cols={5}>
        <StatCard label="금일 이관 건수" value={comma(summary?.todayRows ?? 0)} unit="건" sub="성공 기준" />
        <StatCard label="실패 건수" value={comma(summary?.failRows ?? 0)} unit="건" sub={summary?.failCnt ? `실패 작업 ${summary.failCnt}건` : '전체 정상'} tone={summary?.failRows ? 'down' : 'up'} />
        <StatCard label="평균 소요" value={summary?.avgDurationMin ?? 0} unit="분" sub="완료 작업 기준" />
        <StatCard label="진행 중" value={summary?.runningCnt ?? 0} unit="건" sub={hasRunning ? '30초마다 자동 새로고침' : '진행 중 작업 없음'} />
        <StatCard
          label="스키마 드리프트"
          value={comma(openDriftCnt)}
          unit="건"
          sub={openDriftCnt ? `최다 발견 ${comma(driftSummary?.maxDetectCnt ?? 0)}회` : '이관 정의와 일치'}
          tone={openDriftCnt ? 'down' : 'up'}
        />
      </Grid>
      <Gap />

      <Filters>
        <SelectField label="상태" value={filters.state} options={['전체', '예약 대기', '완료', '진행 중', '실패', '재시도 완료']} onChange={setState} />
        <SelectField label="방식" value={filters.kind} options={['전체', '증분', '전체']} onChange={setKind} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      {/*
        엔진 실행 이력 — 이관 작업 이력과 단위가 다릅니다.
        작업 이력은 '표 1건의 이관', 이 표는 '엔진 1회 실행' 입니다.
        원본에 접속하지 못해 표 작업까지 가지 못한 실행은 작업 이력에 한 건도 안 남아,
        이 표가 없으면 "돌린 적 없는" 것처럼 보입니다.
      */}
      <Card title="엔진 실행 이력" sub="정기 배치·즉시 실행 단위 · 「모의」는 실제로 옮기지 않은 실행입니다" tight>
        <Table
          minWidth={980}
          keyExtractor={(r) => r.runId}
          emptyText="엔진 실행 기록이 없습니다."
          columns={[
            { key: 'runId', title: '실행 ID', width: 190, mono: true },
            {
              // 모의 실행은 상태가 '완료' 라도 아무것도 옮기지 않았습니다.
              // 상태로는 구분되지 않으므로(모의인데 점검 실패인 경우도 있습니다) 따로 표시합니다.
              key: 'dryRun',
              title: '방식',
              width: 110,
              render: (r) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <Text style={s.td}>{r.modeNm}</Text>
                  {r.dryRun ? <Badge tone="amber">모의</Badge> : null}
                </View>
              ),
            },
            { key: 'startedAt', title: '시작', width: 150, mono: true },
            { key: 'durationSec', title: '소요', width: 70, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.durationSec == null ? '—' : `${r.durationSec}초`}</Text> },
            { key: 'tableCnt', title: '대상 테이블', width: 90, align: 'right', num: true },
            { key: 'successCnt', title: '성공', width: 64, align: 'right', num: true },
            { key: 'failCnt', title: '실패', width: 64, align: 'right', render: (r) => (r.failCnt ? <Badge tone="red">{r.failCnt}</Badge> : <Text style={[s.td, { textAlign: 'right' }]}>—</Text>) },
            {
              // 모의 실행(dry-run)은 '성공 13' 인데 옮긴 행이 0 입니다.
              // 지금은 응답에 dry-run 표시가 없어 추측하지 않고, 실제 행수를 그대로 보여 줍니다.
              key: 'okRows',
              title: '이관 행수',
              width: 100,
              align: 'right',
              render: (r) => (
                <Text style={[r.okRows ? s.td : s.textXs, s.num, { textAlign: 'right' }]}>{comma(r.okRows ?? 0)}</Text>
              ),
            },
            {
              key: 'stateNm',
              title: '상태',
              width: 96,
              render: (r) => <Badge tone={r.state === 'SUCCESS' ? 'green' : r.state === 'PARTIAL' ? 'amber' : 'red'}>{r.stateNm}</Badge>,
            },
            { key: 'message', title: '메모', flex: 1, minWidth: 220, wrap: true },
          ]}
          rows={runs}
        />
      </Card>
      <Gap />

      <Card title="이관 작업 이력" sub={`${items.length}건 · 행을 누르면 상세를 봅니다`} tight>
        <Table
          minWidth={1280}
          keyExtractor={(r) => r.jobId}
          onRowPress={showDetail}
          columns={[
            { key: 'jobId', title: '작업 ID', width: 160, mono: true },
            { key: 'srcTable', title: '원본 (MSSQL)', width: 210, mono: true },
            { key: 'dstTable', title: '대상 (PostgreSQL)', width: 160, mono: true },
            { key: 'kind', title: '방식', width: 70, align: 'center' },
            {
              key: 'startAt',
              title: '시작',
              width: 150,
              mono: true,
              // 예약 대기 작업은 아직 시작하지 않았으므로 예약 시각을 보여줍니다
              render: (r) => <Text style={[s.td, s.num]}>{r.startAt || (r.scheduledAt ? `예약 ${r.scheduledAt}` : '—')}</Text>,
            },
            { key: 'duration', title: '소요', width: 78, render: (r) => <Text style={s.td}>{r.duration || '—'}</Text> },
            { key: 'rows', title: '대상 건수', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{comma(r.rows)}</Text> },
            { key: 'okRows', title: '성공', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{comma(r.okRows)}</Text> },
            {
              key: 'ngRows',
              title: '실패',
              width: 90,
              align: 'right',
              render: (r) => (r.ngRows ? <Badge tone="red">{comma(r.ngRows)}</Badge> : <Text style={[s.td, { textAlign: 'right' }]}>—</Text>),
            },
            {
              key: 'state',
              title: '상태',
              width: 106,
              // 예약 대기는 아직 엔진이 집어가지 않은 상태 — 진행 중과 구분해 주황으로 둡니다
              render: (r) => <Badge tone={r.state === '완료' || r.state === '재시도 완료' ? 'green' : r.state === '실패' ? 'red' : r.state === '예약 대기' ? 'amber' : 'blue'}>{r.state}</Badge>,
            },
            {
              key: 'action',
              title: '관리',
              width: 96,
              render: (r) => (r.ngRows ? <Button label="재실행" size="sm" variant="primary" onPress={() => retry(r)} /> : <Button label="상세" size="sm" onPress={() => showDetail(r)} />),
            },
          ]}
          rows={items}
        />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
      <Gap />

      <Card
        title="스키마 드리프트"
        sub={
          openDriftCnt
            ? `미해소 ${openDriftCnt}건 · 원본 신규 ${driftSummary?.sourceNewCnt ?? 0} / 원본 유실 ${driftSummary?.sourceMissingCnt ?? 0} / 대상 신규 ${driftSummary?.targetNewCnt ?? 0} / 대상 유실 ${driftSummary?.targetMissingCnt ?? 0}`
            : '이관 정의와 원본·대상 테이블 구성이 일치합니다'
        }
        tight
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
        {drifts.length ? (
          <Table
            minWidth={1180}
            keyExtractor={(r) => String(r.driftId)}
            onRowPress={showDriftDetail}
            columns={[
              {
                key: 'side',
                title: '발견 위치',
                width: 150,
                render: (r) => <Text style={s.td}>{driftSideLabel(r.side)}</Text>,
              },
              {
                key: 'kind',
                title: '구분',
                width: 96,
                render: (r) => <Badge tone={r.kind === 'NEW' ? 'blue' : 'red'}>{driftKindLabel(r.kind)}</Badge>,
              },
              { key: 'objectName', title: '테이블', flex: 1, minWidth: 280, mono: true },
              {
                key: 'mapId',
                title: '이관 정의',
                width: 100,
                align: 'center',
                render: (r) => <Text style={s.td}>{r.mapId ? `map ${r.mapId}` : '없음'}</Text>,
              },
              { key: 'firstSeenAt', title: '최초 발견', width: 150, mono: true },
              { key: 'lastSeenAt', title: '최종 발견', width: 150, mono: true },
              {
                key: 'detectCnt',
                title: '발견',
                width: 78,
                align: 'right',
                // 발견 횟수가 많을수록 오래 방치된 건이므로 눈에 띄게 표시합니다
                render: (r) => (r.detectCnt >= 3 ? <Badge tone="red">{`${comma(r.detectCnt)}회`}</Badge> : <Text style={[s.td, { textAlign: 'right' }]}>{`${comma(r.detectCnt)}회`}</Text>),
              },
              {
                key: 'action',
                title: '관리',
                width: 110,
                render: (r) => (r.resolved
                  ? <Badge tone="green">해소</Badge>
                  : <Button label="해소 처리" size="sm" onPress={() => resolveDriftRow(r)} />),
              },
            ]}
            rows={drifts}
          />
        ) : (
          <SourceNote>
            {showResolvedDrift
              ? '기록된 스키마 드리프트가 없습니다.'
              : '미해소 드리프트가 없습니다. 이관 정의(연동 매핑)와 원본·대상 DB 의 테이블 구성이 일치합니다.'}
          </SourceNote>
        )}
      </Card>
      <Gap />

      <Grid cols={[3, 2]}>
        <Card title="연동 매핑" sub="원본 테이블 ↔ 대상 테이블 · 이관 주기" tight>
          <Table
            minWidth={720}
            keyExtractor={(r) => r.srcTable}
            columns={[
              { key: 'srcTable', title: '원본 (MSSQL)', width: 220, mono: true },
              { key: 'dstTable', title: '대상 (PostgreSQL)', width: 160, mono: true },
              { key: 'kind', title: '방식', width: 70, align: 'center' },
              { key: 'keyColumns', title: '기준 컬럼', width: 130, mono: true },
              { key: 'schedule', title: '주기', flex: 1, minWidth: 140 },
            ]}
            rows={maps}
          />
        </Card>

        <Card title="연동 정책" sub="이관 방식과 검증 규칙">
          <KeyValue
            keyWidth={90}
            rows={[
              ['원본', policy?.source],
              ['대상', policy?.target],
              ['이관 방식', policy?.mode],
              ['정합성 검증', policy?.validation],
              ['재시도', policy?.retry],
            ]}
          />
          <SourceNote>{policy?.note}</SourceNote>
        </Card>
      </Grid>
    </View>
  );
}

/** 드리프트 발견 위치 라벨 */
function driftSideLabel(side) {
  return side === 'SOURCE' ? '원본 (MES)' : side === 'TARGET' ? '대상 (AX)' : '전체 위치';
}

/** 드리프트 구분 라벨 — NEW 는 정의에 없는 신규, MISSING 은 정의에는 있으나 사라진 테이블 */
function driftKindLabel(kind) {
  return kind === 'NEW' ? '신규' : '유실';
}

/**
 * 다음 배치 시각 — 이미 지났으면 다음 날.
 * @returns {string} 'yyyy-MM-dd HH:mm:ss'
 */
function nextBatchAt() {
  const d = new Date();
  if (d.getHours() >= BATCH_HOUR) d.setDate(d.getDate() + 1);
  d.setHours(BATCH_HOUR, 0, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
