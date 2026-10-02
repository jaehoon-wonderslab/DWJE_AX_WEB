/**
 * [View] SY-16 업로드 문서 목록 (경로: /system/upload-doc · 화면 ID sys-upload-doc)
 *
 * AI 통합 대시보드 「업로드 리포트」 에 올라온 엑셀 문서와 버전 이력을 조회하고, 잘못 올린 문서를
 * 숨기거나 복원합니다(R-19 · D-13 — 소프트 삭제, 원본 파일·버전은 그대로). 편집·버전 삭제는 없습니다.
 * 숨기기·복원은 쓰기 권한(R-06)이 있어야 하고, 없으면 단추를 비활성으로 두고 툴팁을 띄웁니다.
 * 엑셀은 조회 권한으로 받습니다(R-10).
 *
 * 카드는 전체 현황(서버 summary), 표는 조회 조건 결과(서버 쪽 나눔)입니다.
 *
 * 사용 API — GET /api/v1/system/uploads · GET /api/v1/system/uploads/{docId}/versions ·
 *            DELETE /api/v1/system/uploads/{docId} · POST /api/v1/system/uploads/{docId}/restore
 */
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, DateField, EmptyState, ExportMenuButton, Filters, FormAlert, KeyValue, Loading, Pagination,
  CheckRow, SelectField, SourceNote, StatCard, TabulatorGrid, TextField, openFormModal,
} from '@shared/components/ui';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { formatBytes, parseStateOf } from '@domains/dashboard/model/uploadReportModel';

/**
 * 첫 정렬 — 모듈 상수로 둡니다. 렌더마다 새 배열을 넘기면 TabulatorGrid 가 표를 다시 만들어
 * 조건 입력 중에도 표가 새로 그려지고 사용자가 잡은 정렬이 풀립니다(Tabulator 경고 「$$typeof」 의 원인).
 */
const INITIAL_SORT = [{ column: 'updatedAt', dir: 'desc' }];

/**
 * 숨긴 행은 흐리게 (R-19) — Tabulator 옵션은 표를 만들 때 한 번만 읽으므로 모듈 상수로 둡니다.
 * 행 자료가 바뀌어 다시 그려질 때마다 rowFormatter 가 불립니다.
 */
const TABLE_OPTIONS = {
  rowFormatter: (row) => {
    const el = row.getElement();
    if (el) el.style.opacity = row.getData()?.deleted ? '0.55' : '';
  },
};

/** 원본 파일 보관 상태(UPD-08) — OK 가 아니면 빨간 배지 */
const FILE_STATE = { MISSING: '원본 없음', SIZE_MISMATCH: '크기 불일치' };

export default function UploadDocView({
  loading, error, items = [], meta, summary, filtered, exportTotal, filters, uploaderOptions = [], parseStateOptions = [],
  setKeyword, setUploadedBy, setParseState, setFrom, setTo, search, resetFilters, paging,
  loadVersions, gridRef, exportView, exportAll,
  // 숨기기 · 복원 (R-19)
  includeDeleted = false, toggleIncludeDeleted, canWrite = true, writeDeniedText = '', hideReasonMax = 200, hideDoc, restoreDoc,
}) {
  const openDrawer = useUiStore((state) => state.openDrawer);

  /** 숨기기 — 사유 필수·200자 모달 */
  const askHide = (row) => {
    if (!canWrite) return;
    openFormModal({
      title: '업로드 문서 숨기기',
      sub: `${row.docId} · ${row.title}`,
      fields: [
        { key: 'doc', label: '문서', type: 'static', full: true, value: `${row.title} (버전 ${comma(row.versionCnt ?? 0)}개)` },
        { key: 'reason', label: '숨기는 사유', type: 'textarea', rows: 2, full: true, required: true, placeholder: '예) 잘못 올린 파일 — 같은 내용을 「9월 회의 자료」 로 다시 올림' },
      ],
      note: '숨기면 대시보드 업로드 리포트·AI 패널 문서 선택·이 화면 기본 목록에서 빠집니다. 원본 파일과 버전은 그대로 남고, 「숨긴 문서 포함」 으로 찾아 복원할 수 있습니다.',
      validate: (v) => {
        const len = String(v?.reason || '').trim().length;
        return len > hideReasonMax ? { reason: `사유는 ${hideReasonMax}자까지 쓸 수 있습니다 (지금 ${len}자)` } : {};
      },
      submitLabel: '숨기기',
      onSubmit: async (v) => ((await hideDoc?.(row.docId, v.reason))?.ok ? undefined : false),
    });
  };

  /** 복원 — 확인 없이 바로(되돌릴 수 있는 동작) */
  const doRestore = (row) => { if (canWrite) restoreDoc?.(row.docId); };

  /** 표 안 단추가 부르는 동작 — 열 정의는 한 번만 만들므로 최신 값을 ref 로 읽습니다 */
  const act = useRef({});
  act.current = { askHide, doRestore, canWrite, writeDeniedText };

  /** 행을 누르면 우측 드로어에 문서 정보 + 버전 이력 */
  const showVersions = (row) => {
    openDrawer({
      title: row.title,
      sub: `${row.docId} · 버전 ${comma(row.versionCnt ?? 0)}개${row.deleted ? ' · 숨김' : ''}`,
      render: () => <VersionHistory doc={row} loadVersions={loadVersions} />,
    });
  };

  const columns = useMemo(() => [
    {
      title: '문서명', field: 'title', minWidth: 220, widthGrow: 2,
      // 최신 버전의 원본 보관 상태(행 fileState, UPD-08) — 열을 늘리지 않고 문서명 옆 빨간 태그로
      formatter: (cell) => {
        const d = cell.getData();
        const bad = d.fileState && d.fileState !== 'OK' ? ` <span class="tag tag-red">${esc(FILE_STATE[d.fileState] || d.fileState)}</span>` : '';
        // 숨긴 문서는 「숨김」 태그 + 사유 (R-19)
        const hidden = d.deleted ? ` <span class="tag">숨김</span>` : '';
        const why = d.deleted && d.deleteReason ? `<div class="muted">숨긴 사유 — ${esc(d.deleteReason)}</div>` : '';
        return `${esc(cell.getValue())}${hidden}${bad}${d.memo ? `<div class="muted">${esc(d.memo)}</div>` : ''}${why}`;
      },
    },
    { title: '최신 버전', field: 'latestVersion', width: 96, hozAlign: 'center', sorter: 'number', formatter: (cell) => `<span class="mono">v${esc(cell.getValue() ?? 0)}</span>` },
    { title: '버전 수', field: 'versionCnt', width: 84, hozAlign: 'right', sorter: 'number', formatter: (cell) => `<span class="num">${comma(cell.getValue() ?? 0)}</span>` },
    { title: '최초 등록자', field: 'createdByName', minWidth: 110, formatter: (cell) => esc(dash(cell.getValue() || cell.getData().createdBy)) },
    { title: '최근 업로더', field: 'updatedByName', minWidth: 110, formatter: (cell) => esc(dash(cell.getValue() || cell.getData().updatedBy)) },
    { title: '최근 업로드', field: 'updatedAt', minWidth: 150, formatter: (cell) => `<span class="mono">${esc(dash(cell.getValue()))}</span>` },
    { title: '크기', field: 'sizeBytes', width: 92, hozAlign: 'right', sorter: 'number', formatter: (cell) => `<span class="num">${esc(formatBytes(cell.getValue()))}</span>` },
    {
      title: '파싱 상태', field: 'parseState', width: 100, hozAlign: 'center',
      formatter: (cell) => {
        const st = parseStateOf(cell.getValue());
        const cls = st.tone ? ` tag-${st.tone}` : '';
        return `<span class="tag${cls}">${esc(st.label)}</span>`;
      },
    },
    {
      // 관리 — 숨기기 / 복원 (R-19). 쓰기 권한이 없으면 비활성 + 툴팁
      title: '관리', field: 'action', width: 96, hozAlign: 'center', headerSort: false,
      formatter: (cell) => {
        const d = cell.getData();
        const label = d.deleted ? '복원' : '숨기기';
        return act.current.canWrite ? btn(label) : btn(label, true, act.current.writeDeniedText);
      },
      // 단추를 눌렀을 때만 — 칸의 빈 자리는 행 클릭(버전 이력)이 받습니다
      cellClick: (e, cell) => {
        if (!e.target?.closest?.('button') || !act.current.canWrite) return;
        e.stopPropagation?.();
        const d = cell.getData();
        if (d.deleted) act.current.doRestore(d); else act.current.askHide(d);
      },
    },
  ], []);

  const total = meta?.total ?? items.length;
  const pending = '—';

  return (
    <View>
      <PageHead
        title="업로드 문서 목록"
        desc="AI 통합 대시보드 「업로드 리포트」에 올라온 엑셀 문서와 버전 이력입니다. 카드는 현황, 표는 조회 조건 결과입니다. 행을 누르면 버전별 파일·업로더·파싱 상태를 볼 수 있습니다. 잘못 올린 문서는 숨기고 다시 복원할 수 있습니다(원본 파일은 지우지 않습니다)."
        actions={
          <ExportMenuButton
            viewCount={items.length}
            totalCount={exportTotal}
            onExportView={exportView}
            onExportAll={exportAll}
          />
        }
      />

      {/*
        카드 4종 — 서버 summary (UPD-07).
        전체 기준(scope ALL)이면 기획 4종 그대로, API 2단계(scope COND — 파싱 상태만 뺀 조회 조건 기준)면
        문서 수에 정상·경고·실패 건수를 붙이고 서버가 아직 주지 않는 값은 「—」 로 둡니다.
      */}
      <Grid cols={4}>
        <StatCard
          label="문서 수"
          value={summary ? comma(summary.docCnt ?? 0) : pending}
          unit={summary ? '건' : undefined}
          sub={loading && summary ? '불러오는 중…' : docSub(summary)}
          tone={summary?.failDocCnt ? 'down' : undefined}
        />
        <StatCard
          label="총 버전"
          value={summary?.versionCnt != null ? comma(summary.versionCnt) : pending}
          unit={summary?.versionCnt != null ? '개' : undefined}
          sub={summary?.monthVersionCnt != null ? `이번 달 ${comma(summary.monthVersionCnt)}개` : '문서마다 쌓인 버전의 합'}
        />
        <StatCard
          label="원본 용량"
          value={summary?.totalBytes != null ? formatBytes(summary.totalBytes) : pending}
          sub={`1건 상한 ${summary?.maxBytesPerFile ? formatBytes(summary.maxBytesPerFile) : '20 MB'}`}
        />
        <StatCard
          label="최근 업로드"
          value={summary?.lastUploadedAt ? String(summary.lastUploadedAt).slice(5, 16) : pending}
          sub={summary?.lastUploadedAt ? String(summary.lastUploadedAt).slice(0, 4) : summary?.scope === 'ALL' ? '아직 업로드가 없습니다' : '서버 집계 준비 중'}
        />
      </Grid>
      <Gap />

      <Filters>
        <TextField label="검색어" value={filters.keyword} onChangeText={setKeyword} onSubmitEditing={search} placeholder="문서명 · 메모 · 파일명 · 문서 ID" style={{ minWidth: 240 }} />
        <SelectField label="업로더" value={filters.uploadedBy} options={uploaderOptions} onChange={setUploadedBy} />
        <SelectField label="파싱 상태" value={filters.parseState} options={parseStateOptions} onChange={setParseState} />
        {/* 업로드일은 MES 실적 보유 기간과 무관하므로 달력 범위를 묶지 않습니다 */}
        <DateField label="최근 업로드 시작" value={filters.from} onChange={setFrom} min={null} max={null} />
        <DateField label="최근 업로드 종료" value={filters.to} onChange={setTo} min={null} max={null} />
        <Button label="조회" variant="primary" onPress={search} />
        <Button label="초기화" variant="ghost" onPress={resetFilters} />
        {/* 숨긴 문서 포함 (R-19) — 누르면 바로 다시 조회합니다 */}
        <CheckRow label={`숨긴 문서 포함${summary?.deletedDocCnt ? ` (${comma(summary.deletedDocCnt)}건)` : ''}`} checked={includeDeleted} onToggle={toggleIncludeDeleted} style={{ alignSelf: 'center' }} />
      </Filters>

      {/* 서버 메시지(예: 기간 오류)를 그대로 — 카드·표는 직전 값을 유지합니다 */}
      {error ? <FormAlert style={{ marginBottom: 12 }}>{error.message || '문서 목록을 불러오지 못했습니다'}</FormAlert> : null}

      <Card
        title="업로드 문서"
        sub={loading ? '불러오는 중…' : `조건 결과 ${comma(total)}건 · 최근 업로드 순 · 행을 누르면 버전 이력 · 열 제목으로 정렬할 수 있습니다`}
      >
        {loading && !items.length ? (
          <Loading compact />
        ) : !items.length ? (
          <EmptyState
            text={filtered || summary?.docCnt
              ? '조회 조건에 맞는 업로드 문서가 없습니다. 조건을 넓혀 보십시오.'
              : '업로드 문서가 없습니다. 권한이 있는 담당자가 AI 통합 대시보드 › 업로드 리포트에서 엑셀을 올리면 여기에 쌓입니다.'}
          />
        ) : (
          <TabulatorGrid
            columns={columns}
            rows={items}
            rowKey="docId"
            instanceRef={gridRef}
            onRowClick={showVersions}
            initialSort={INITIAL_SORT}
            tableOptions={TABLE_OPTIONS}
            height={items.length > 14 ? 620 : undefined}
            emptyText="조회 조건에 맞는 업로드 문서가 없습니다."
          />
        )}
        <Pagination meta={meta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}

/** 문서 수 카드 보조 문구 — 실패 건수와 집계 기준 */
function docSub(summary) {
  if (!summary) return '서버 요약을 기다립니다';
  const b = summary.byState || {};
  const states = b.ok != null || b.warn != null ? `정상 ${comma(b.ok ?? 0)} · 경고 ${comma(b.warn ?? 0)} · 실패 ${comma(b.fail ?? 0)}` : '';
  if (summary.scope === 'COND') return [states, '조회 조건 기준(파싱 상태 제외)'].filter(Boolean).join(' · ');
  const hidden = summary.deletedDocCnt ? ` · 숨긴 문서 ${comma(summary.deletedDocCnt)}건 별도` : '';
  return summary.failDocCnt ? `최신 버전 파싱 실패 ${comma(summary.failDocCnt)}건${hidden}` : `숨김 제외 전체${hidden}`;
}

/* ───────── 드로어 — 문서 정보 + 버전 이력 ───────── */

function VersionHistory({ doc, loadVersions }) {
  const s = useCommonStyles();
  const { data, loading, error } = useAsync(() => loadVersions(doc.docId), [doc.docId], { initialData: [], silent: true });
  const versions = data || [];

  return (
    <View>
      <KeyValue
        keyWidth={92}
        rows={[
          ['문서 ID', doc.docId],
          ['메모', doc.memo || '—'],
          ['최초 등록', `${doc.createdByName || doc.createdBy || '—'} · ${doc.createdAt || '—'}`],
          ['최근 업로드', `${doc.updatedByName || doc.updatedBy || '—'} · ${doc.updatedAt || '—'}`],
          // 숨긴 문서 (R-19)
          ...(doc.deleted ? [['숨김', [doc.deletedByName, doc.deletedAt, doc.deleteReason ? `사유 ${doc.deleteReason}` : null].filter(Boolean).join(' · ') || '숨김']] : []),
        ]}
      />
      <Gap />
      <Text style={[s.label, { marginBottom: 8 }]}>버전 이력</Text>
      {loading ? <Loading compact /> : null}
      {error ? <FormAlert>{error.message || '버전 이력을 불러오지 못했습니다'}</FormAlert> : null}
      {!loading && !error && !versions.length ? <EmptyState text="버전 이력이 없습니다." /> : null}
      {versions.map((v, i) => (
        // 목록은 최신 버전이 먼저 — 바로 다음 항목이 직전 버전입니다
        <VersionCard key={v.version} v={v} prev={versions[i + 1]} />
      ))}
      <SourceNote>파일 원본은 AI 통합 대시보드 › 업로드 리포트에서 문서·버전을 골라 내려받습니다. 숨긴 문서는 대시보드에 보이지 않으며, 표의 「복원」 으로 되돌립니다. 편집·버전 삭제는 없습니다.</SourceNote>
    </View>
  );
}

/** 버전 카드 — 파싱 상태 · 원본 보관 상태 · 메모 · 경고 문장 · 직전 버전과 같은 파일 안내 */
function VersionCard({ v, prev }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const st = parseStateOf(v.parseState);
  const warnings = Array.isArray(v.warnings) ? v.warnings : [];
  // 실패 버전은 경고를 펼친 채로 엽니다 (UPD-09)
  const [openWarn, setOpenWarn] = useState(v.parseState === 'FAIL');
  const fileBad = v.fileState && v.fileState !== 'OK' ? FILE_STATE[v.fileState] || v.fileState : '';
  // 직전 버전과 같은 파일 — 서버 duplicateOf 가 있으면 그것, 없으면 해시 비교 (UPD-10)
  const sameAsPrev = (v.duplicateOf != null && prev && Number(v.duplicateOf) === Number(prev.version))
    || (!!v.sha256 && !!prev?.sha256 && v.sha256 === prev.sha256);
  const muted = { color: theme.color.mutedForeground };

  return (
    <View style={[s.cardNested, { padding: 12, marginBottom: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={[s.textSm, { fontWeight: '600', color: theme.color.foreground }]}>{`v${v.version}`}</Text>
        <Badge tone={st.tone}>{`파싱 ${st.label}`}</Badge>
        {fileBad ? <Badge tone="red">{fileBad}</Badge> : null}
        {v.warningCnt ? (
          warnings.length ? (
            <Pressable onPress={() => setOpenWarn((x) => !x)} accessibilityRole="button" accessibilityLabel={`경고 ${v.warningCnt}건 ${openWarn ? '접기' : '펼치기'}`}>
              <Text style={[s.textSm, { color: theme.color.info }]}>{`경고 ${comma(v.warningCnt)}건 ${openWarn ? '▴' : '▾'}`}</Text>
            </Pressable>
          ) : <Text style={[s.textSm, muted]}>{`경고 ${comma(v.warningCnt)}건`}</Text>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={[s.mono, muted]}>{formatBytes(v.sizeBytes)}</Text>
      </View>
      <Text style={[s.textSm, { marginTop: 6 }]} numberOfLines={2}>{v.fileName || '—'}</Text>
      <Text style={[s.textSm, muted, { marginTop: 2 }]}>{`${v.uploadedByName || v.uploadedBy || '—'} · ${v.uploadedAt || '—'}`}</Text>
      {/* 버전 메모 — 서버에 memo 필드가 없거나 비었으면 그리지 않습니다 (UPD-02) */}
      {v.memo ? <Text style={[s.textSm, muted, { marginTop: 4 }]}>{`메모: ${v.memo}`}</Text> : null}
      {sameAsPrev ? <Text style={[s.textSm, muted, { marginTop: 4 }]}>직전 버전과 같은 파일</Text> : null}
      {v.sha256 ? <Text style={[s.mono, muted, { marginTop: 4, fontSize: 14.5 }]}>{`sha256 ${v.sha256}`}</Text> : null}
      {openWarn && warnings.length ? (
        <View style={{ marginTop: 6, gap: 2 }}>
          {warnings.map((w, i) => (
            <Text key={i} style={[s.textSm, muted]}>{`▸ ${typeof w === 'string' ? w : w?.message || JSON.stringify(w)}`}</Text>
          ))}
          {v.warningTruncated ? <Text style={[s.textSm, muted]}>앞 20건만 표시합니다</Text> : null}
        </View>
      ) : null}
      {fileBad ? <Text style={[s.textSm, { color: theme.color.destructive, marginTop: 4 }]}>API 서버 저장소를 확인하십시오</Text> : null}
    </View>
  );
}

/* ───────── Tabulator 셀 HTML 도우미 ───────── */

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);

/** 표 안 작은 단추 — 비활성이면 disabled 와 title(툴팁, 쓰기 권한 없음 안내) */
const btn = (label, disabled, title) =>
  `<button type="button" class="tbtn"${disabled ? ' disabled aria-disabled="true" style="opacity:.45;cursor:not-allowed"' : ''}${title ? ` title="${esc(title)}"` : ''}>${esc(label)}</button>`;
