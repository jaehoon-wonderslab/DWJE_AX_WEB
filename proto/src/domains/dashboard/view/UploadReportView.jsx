/**
 * [View] DB-01 업로드 리포트 탭 (경로: /dashboard/ai · 탭 「업로드 리포트」)
 *
 * MES 데이터가 아닌 **가공된 결과**(회의 자료 등)를 정해진 엑셀 포맷으로 올리면
 * 서버가 파싱해 돌려준 블록을 그대로 차트(d3)·표(Tabulator)로 그립니다 — 「블록 렌더러」.
 *
 * 구성
 *  1. 툴바 — 문서 선택 · 버전 선택 · (권한자) 엑셀 업로드 · 새 버전 업로드 · 원본 다운로드 · 인쇄·PDF
 *  2. 문서 정보 한 줄 + 파싱 경고
 *  3. 블록 — 차트는 2열, 표는 한 줄 전체
 *
 * 사용 API — /api/v1/dashboard/uploads/*
 */
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarChart, DonutChart, GroupedBarChart, LineChart } from '@shared/components/charts-d3';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, EmptyState, Filters, FormAlert, Hint, Loading, SelectField, TabulatorGrid } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { FORMAT_RULE, PRINT_NODE_ID } from '../controller/useUploadReportController';
import {
  CHART_TYPE_LABEL, formatBytes, parseStateOf, renderKind, seriesOf, toBarProps, toDonutProps, toGroupedProps, toLineProps, toTableProps, toNum,
} from '../model/uploadReportModel';

const EMPTY_GUIDE = '권한이 있는 담당자가 정해진 엑셀 포맷으로 업로드하면 이 자리에 차트와 표가 만들어집니다';

export default function UploadReportView({
  canUpload, uploading,
  docs = [], docsLoading, docsError, doc, docId, docOptions = [],
  versions = [], version, versionInfo, versionOptions = [],
  report, reportLoading, reportError,
  selectDoc, selectVersion, uploadNew, uploadVersion, downloadOriginal, print, reload,
  /** 머리말 바로 아래에 끼우는 요소 — 라우트가 탭을 넣습니다 */
  headExtra = null,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const warnings = report?.warnings || [];
  const blocks = report?.sheets || [];
  const state = parseStateOf(report?.parseState || versionInfo?.parseState);
  const failed = (report?.parseState || versionInfo?.parseState) === 'FAIL';

  return (
    <View>
      <PageHead
        title="AI 통합 대시보드"
        desc="정해진 엑셀 포맷으로 올린 가공 데이터를 차트·표로 만들어 회의 자료로 씁니다. 문서는 서버에 저장되고 버전으로 관리됩니다."
        actions={<Button label="새로고침" size="sm" variant="primary" icon="refresh" onPress={reload} />}
      />
      {headExtra}

      {/* 1. 툴바 */}
      <Filters>
        <SelectField
          label="문서"
          value={docId}
          options={docOptions}
          onChange={selectDoc}
          placeholder={docsLoading ? '불러오는 중…' : docs.length ? '문서 선택' : '업로드된 문서가 없습니다'}
          style={{ minWidth: 380, flexGrow: 1, maxWidth: 560 }}
        />
        <SelectField
          label="버전"
          value={version}
          options={versionOptions}
          onChange={selectVersion}
          placeholder={docId ? (versions.length ? '버전 선택' : '불러오는 중…') : '—'}
          style={{ minWidth: 240 }}
        />
        {canUpload ? <Button label="엑셀 업로드" variant="primary" icon="upload" onPress={uploadNew} disabled={uploading} /> : null}
        {canUpload ? <Button label="새 버전 업로드" icon="plus" onPress={uploadVersion} disabled={uploading || !doc} /> : null}
        <Button label="원본 다운로드" variant="ghost" icon="download" onPress={downloadOriginal} disabled={!doc || !version} />
        <Button label="인쇄 · PDF" variant="ghost" icon="printer" onPress={print} disabled={!report} />
      </Filters>

      {uploading ? <Loading compact text="업로드하고 파싱하는 중입니다…" /> : null}

      {/* 문서가 하나도 없을 때 */}
      {!docsLoading && !docs.length ? (
        <Card>
          <EmptyState text={EMPTY_GUIDE} />
          {canUpload ? (
            <View style={{ alignItems: 'center', marginTop: -12, marginBottom: 12 }}>
              <Button label="엑셀 업로드" variant="primary" icon="upload" onPress={uploadNew} disabled={uploading} />
            </View>
          ) : (
            <Hint>업로드 권한은 시스템관리 › 메뉴 접근 권한의 「AI 통합 대시보드 › 업로드 리포트 업로드」 행에서 부서 단위로 지정합니다. {FORMAT_RULE}</Hint>
          )}
        </Card>
      ) : null}

      {docsError ? <FormAlert>{docsError.message || '문서 목록을 불러오지 못했습니다'}</FormAlert> : null}

      {/* 2. 문서 정보 · 경고 */}
      {doc ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={[s.textSm, { color: theme.color.mutedForeground }]}>
              {[
                doc.memo || null,
                versionInfo ? `v${versionInfo.version} · ${versionInfo.uploadedByName || versionInfo.uploadedBy || '—'} · ${versionInfo.uploadedAt || ''}` : null,
                versionInfo?.fileName || null,
                versionInfo ? formatBytes(versionInfo.sizeBytes) : null,
                `버전 ${comma(doc.versionCnt ?? versions.length)}개`,
              ].filter(Boolean).join('  ·  ')}
            </Text>
            {versionInfo ? <Badge tone={state.tone}>{`파싱 ${state.label}`}</Badge> : null}
          </View>
          {failed ? <FormAlert style={{ marginBottom: 8 }}>파싱 실패 — 읽을 수 있는 시트가 없어 차트·표를 만들지 못했습니다. 파일은 버전으로 남아 있으니 포맷을 고쳐 새 버전으로 올려 주세요.</FormAlert> : null}
          {warnings.map((w, i) => (
            <FormAlert key={i} tone={failed ? 'error' : 'info'} style={{ marginBottom: 8 }}>{typeof w === 'string' ? w : w?.message || JSON.stringify(w)}</FormAlert>
          ))}
          {reportError ? <FormAlert style={{ marginBottom: 8 }}>{reportError.message || '파싱 결과를 불러오지 못했습니다'}</FormAlert> : null}
        </>
      ) : null}

      {/* 3. 블록 렌더러 */}
      {doc && reportLoading && !report ? <Loading text="파싱 결과를 불러오는 중입니다…" /> : null}
      {doc && report && !blocks.length ? (
        <Card><EmptyState text={`이 버전에는 그릴 수 있는 시트가 없습니다. ${FORMAT_RULE}`} /></Card>
      ) : null}
      {doc && report && blocks.length ? <BlockGrid blocks={blocks} title={report.title || doc.title} version={version} /> : null}
    </View>
  );
}

/* ───────── 블록 배치 — 차트는 2열, 표는 한 줄 전체 ───────── */

function BlockGrid({ blocks, title, version }) {
  const s = useCommonStyles();
  const theme = useTheme();
  // 표(table) 앞뒤로 차트를 2개씩 묶어 한 줄에 놓습니다
  const lines = useMemo(() => {
    const out = [];
    let pair = [];
    blocks.forEach((b, i) => {
      const kind = renderKind(b);
      if (kind === 'table') {
        if (pair.length) { out.push(pair); pair = []; }
        out.push([{ b, i, kind }]);
      } else {
        pair.push({ b, i, kind });
        if (pair.length === 2) { out.push(pair); pair = []; }
      }
    });
    if (pair.length) out.push(pair);
    return out;
  }, [blocks]);

  return (
    <View nativeID={PRINT_NODE_ID}>
      {/* 인쇄물 머리 — 화면에서는 옅게, 인쇄 창에서 문서 제목이 남습니다 */}
      <Text style={[s.label, { marginBottom: 10, color: theme.color.mutedForeground }]}>{`${title} · v${version} · 블록 ${blocks.length}개`}</Text>
      {lines.map((line, li) => (
        <View key={li} style={{ flexDirection: 'row', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          {line.map(({ b, i, kind }) => (
            <View key={i} style={{ flex: 1, minWidth: line.length > 1 ? 420 : '100%' }}>
              <BlockCard block={b} kind={kind} />
            </View>
          ))}
        </View>
      ))}
      <Gap size={2} />
    </View>
  );
}

/* ───────── 블록 하나 = 카드 하나 ───────── */

function BlockCard({ block, kind }) {
  const theme = useTheme();
  const s = useCommonStyles();
  const rows = block.rows || [];
  const sub = `${CHART_TYPE_LABEL[kind] || kind} · ${comma(rows.length)}행 · ${kind === 'table' ? `열 ${(block.columns || []).length || seriesOf(block).length + 1}개` : `시리즈 ${seriesOf(block).length}개`}${block.x ? ` · X축 ${block.x}` : ''}`;

  if (kind === 'line') {
    const p = toLineProps(block);
    return (
      <Card title={block.title} sub={sub}>
        <LineChart labels={p.labels} series={p.series} unit={p.unit} height={230} />
      </Card>
    );
  }
  if (kind === 'bar') {
    const p = toBarProps(block);
    return (
      <Card title={block.title} sub={sub}>
        <BarChart data={p.data} unit={p.unit} height={230} />
        {p.names.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            {p.names.map((n, i) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: theme.seriesAt(i) }} />
                <Text style={s.legendText}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    );
  }
  if (kind === 'grouped') {
    const p = toGroupedProps(block);
    return (
      <Card title={block.title} sub={sub}>
        <GroupedBarChart data={p.data} metrics={p.metrics} unit={p.unit ? ` ${p.unit}` : ''} height={240} />
      </Card>
    );
  }
  if (kind === 'donut') {
    const p = toDonutProps(block);
    return (
      <Card title={block.title} sub={sub}>
        <DonutChart segs={p.segs} unitLabel={p.unitLabel} height={200} />
      </Card>
    );
  }
  return <TableBlock block={block} sub={sub} />;
}

/** 표 블록 — 헤더 전체를 순서대로 (문자 열 포함). 숫자는 천 단위 쉼표 · 소수 2자리까지 */
function TableBlock({ block, sub }) {
  const { columns, rows } = useMemo(() => {
    const p = toTableProps(block);
    return {
      rows: p.rows,
      columns: p.columns.map(({ numeric, ...col }) => ({
        ...col,
        formatter: (cell) => {
          const v = cell.getValue();
          if (v === null || v === undefined || v === '') return '—';
          if (numeric) {
            const n = toNum(v);
            if (n !== null) return `<span class="num">${Number.isInteger(n) ? comma(n) : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}</span>`;
          }
          return esc(v);
        },
      })),
    };
  }, [block]);
  return (
    <Card title={block.title} sub={sub}>
      <TabulatorGrid columns={columns} rows={rows} headerFilter={false} height={rows.length > 12 ? 480 : undefined} emptyText="행이 없습니다." />
    </Card>
  );
}

/** HTML 특수문자 이스케이프 — 셀 값은 업로드된 문자열이므로 그대로 넣지 않습니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
