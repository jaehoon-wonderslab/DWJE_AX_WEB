/**
 * [View] SY-16 업로드 문서 목록 (경로: /system/upload-doc)
 *
 * AI 통합 대시보드 「업로드 리포트」 에 올라온 엑셀 문서와 버전 이력을 읽기 전용으로 봅니다.
 * 삭제·편집 버튼은 없습니다(요구 8 — 시스템관리는 목록만).
 *
 * 사용 API — GET /api/v1/system/uploads · GET /api/v1/system/uploads/{docId}/versions
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, EmptyState, Filters, FormAlert, KeyValue, Loading, SelectField, SourceNote, StatCard, TabulatorGrid, TextField } from '@shared/components/ui';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { formatBytes, parseStateOf } from '@domains/dashboard/model/uploadReportModel';

export default function UploadDocView({
  loading, error, items = [], summary, filters, uploaderOptions = [],
  setKeyword, setUploadedBy, setFrom, setTo, search, resetFilters, loadVersions, exportExcel,
}) {
  const openDrawer = useUiStore((state) => state.openDrawer);

  /** 행을 누르면 우측 드로어에 문서 정보 + 버전 이력 */
  const showVersions = (row) => {
    openDrawer({
      title: row.title,
      sub: `${row.docId} · 버전 ${comma(row.versionCnt ?? 0)}개 · 읽기 전용`,
      render: () => <VersionHistory doc={row} loadVersions={loadVersions} />,
    });
  };

  const columns = useMemo(() => [
    { title: '문서명', field: 'title', minWidth: 220, widthGrow: 2, formatter: (cell) => `${esc(cell.getValue())}${cell.getData().memo ? `<div class="muted">${esc(cell.getData().memo)}</div>` : ''}` },
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
  ], []);

  return (
    <View>
      <PageHead
        title="업로드 문서 목록"
        desc="AI 통합 대시보드 「업로드 리포트」에 올라온 엑셀 문서와 버전 이력입니다. 행을 누르면 버전별 파일·업로더·파싱 상태를 볼 수 있습니다. 이 화면에서는 삭제·편집하지 않습니다."
        actions={<Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} disabled={!items.length} />}
      />

      <Grid cols={4}>
        <StatCard label="문서 수" value={comma(summary?.docCnt ?? 0)} unit="건" />
        <StatCard label="총 버전" value={comma(summary?.versionCnt ?? 0)} unit="개" sub="문서마다 쌓인 버전의 합" />
        <StatCard label="이번 달 업로드" value={comma(summary?.monthCnt ?? 0)} unit="건" sub="이번 달에 최근 업로드가 있었던 문서" />
        <StatCard label="최근 업로드" value={summary?.lastUploadedAt ? String(summary.lastUploadedAt).slice(5, 16) : '—'} sub={summary?.lastUploadedAt ? String(summary.lastUploadedAt).slice(0, 4) : '아직 업로드가 없습니다'} />
      </Grid>
      <Gap />

      <Filters>
        <TextField label="검색어" value={filters.keyword} onChangeText={setKeyword} placeholder="문서명 · 메모 · 문서 ID" style={{ minWidth: 240 }} />
        <SelectField label="업로더" value={filters.uploadedBy} options={uploaderOptions} onChange={setUploadedBy} />
        <DateField label="최근 업로드 시작" value={filters.from} onChange={setFrom} />
        <DateField label="최근 업로드 종료" value={filters.to} onChange={setTo} />
        <Button label="조회" variant="primary" onPress={search} />
        <Button label="초기화" variant="ghost" onPress={resetFilters} />
      </Filters>

      {error ? <FormAlert style={{ marginBottom: 12 }}>{error.message || '문서 목록을 불러오지 못했습니다'}</FormAlert> : null}

      <Card
        title="업로드 문서"
        sub={loading ? '불러오는 중…' : `${comma(items.length)}건 · 최근 업로드 순 · 행을 누르면 버전 이력 · 열 제목으로 정렬할 수 있습니다`}
      >
        {loading && !items.length ? (
          <Loading compact />
        ) : !items.length ? (
          <EmptyState text="조회 조건에 맞는 업로드 문서가 없습니다. 권한이 있는 담당자가 AI 통합 대시보드 › 업로드 리포트에서 엑셀을 올리면 여기에 쌓입니다." />
        ) : (
          <TabulatorGrid
            columns={columns}
            rows={items}
            rowKey="docId"
            onRowClick={showVersions}
            initialSort={[{ column: 'updatedAt', dir: 'desc' }]}
            height={items.length > 14 ? 620 : undefined}
            emptyText="조회 조건에 맞는 업로드 문서가 없습니다."
          />
        )}
      </Card>
    </View>
  );
}

/* ───────── 드로어 — 문서 정보 + 버전 이력 ───────── */

function VersionHistory({ doc, loadVersions }) {
  const s = useCommonStyles();
  const theme = useTheme();
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
        ]}
      />
      <Gap />
      <Text style={[s.label, { marginBottom: 8 }]}>버전 이력</Text>
      {loading ? <Loading compact /> : null}
      {error ? <FormAlert>{error.message || '버전 이력을 불러오지 못했습니다'}</FormAlert> : null}
      {!loading && !error && !versions.length ? <EmptyState text="버전 이력이 없습니다." /> : null}
      {versions.map((v) => {
        const st = parseStateOf(v.parseState);
        return (
          <View key={v.version} style={[s.cardNested, { padding: 12, marginBottom: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.textSm, { fontWeight: '600', color: theme.color.foreground }]}>{`v${v.version}`}</Text>
              <Badge tone={st.tone}>{`파싱 ${st.label}`}</Badge>
              {v.warningCnt ? <Text style={[s.textSm, { color: theme.color.mutedForeground }]}>{`경고 ${comma(v.warningCnt)}건`}</Text> : null}
              <View style={{ flex: 1 }} />
              <Text style={[s.mono, { color: theme.color.mutedForeground }]}>{formatBytes(v.sizeBytes)}</Text>
            </View>
            <Text style={[s.textSm, { marginTop: 6 }]} numberOfLines={2}>{v.fileName || '—'}</Text>
            <Text style={[s.textSm, { color: theme.color.mutedForeground, marginTop: 2 }]}>{`${v.uploadedByName || v.uploadedBy || '—'} · ${v.uploadedAt || '—'}`}</Text>
            {v.memo ? <Text style={[s.textSm, { color: theme.color.mutedForeground, marginTop: 4 }]}>{v.memo}</Text> : null}
            {v.sha256 ? <Text style={[s.mono, { color: theme.color.mutedForeground, marginTop: 4, fontSize: 14.5 }]}>{`sha256 ${v.sha256}`}</Text> : null}
          </View>
        );
      })}
      <SourceNote>파일 원본은 AI 통합 대시보드 › 업로드 리포트에서 문서·버전을 골라 내려받습니다. 이 화면은 목록 확인용이라 삭제·편집이 없습니다.</SourceNote>
    </View>
  );
}

/* ───────── Tabulator 셀 HTML 도우미 ───────── */

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);
