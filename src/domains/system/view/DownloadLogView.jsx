/**
 * [View] SY-14 보고서 다운로드 이력 (경로: /system/download-log)
 *
 * 인쇄·PDF 출력도 함께 기록되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다.
 * 사용 API — /api/v1/download-logs/*
 *
 * ■ 2026-09-08 개편
 * - 요약 카드는 누적·금일 2종만 (blind 포함 · 최다 이용 카드와 보조 문구는 뺐습니다)
 * - 계정별 이용 카드 제거
 * - 이력 표는 `TabulatorGrid` — 쪽을 나누지 않고 조회 조건에 맞는 기록을 전부 놓습니다 (정렬·열 폭 조절 가능)
 * - 계정(사번) · 이름 · 부서, 보고서 · 화면을 각각 다른 칸에 둡니다
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, DateField, Filters, KeyValue, Loading, SelectField, SourceNote, StatCard, TabulatorGrid } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { comma } from '@shared/utils/formatUtil';
import { ALL_SIZE, screenInfo } from '../controller/useDownloadLogController';

export default function DownloadLogView({
  loading, items, capped, summary, filters, reportOptions = [], deptOptions = [], formatOptions = [], formatLabel = (v) => v,
  setFrom, setTo, setReportId, setDeptId, setFormat, search, exportExcel, loadPolicy,
}) {
  const openModal = useUiStore((state) => state.openModal);
  const toast = useUiStore((state) => state.toast);

  /**
   * 보존 정책 — 응답은 { retentionYears, totalCnt, archivedCnt, oldestAt, nextArchiveAt } 입니다.
   * 예전 목 응답(period · target · note)도 같이 받습니다.
   */
  const showPolicy = async () => {
    const policy = await loadPolicy();
    if (!policy) {
      toast('보존 정책을 불러오지 못했습니다');
      return;
    }
    const keep = policy.totalCnt ?? summary?.total ?? items.length;
    const rows = policy.period
      ? [['보존 기간', policy.period], ['보존 대상', policy.target]]
      : [
          ['보존 기간', policy.retentionYears != null ? `${policy.retentionYears}년` : '—'],
          ['보존 대상', '보고서·화면 내려받기(엑셀 · CSV) 및 인쇄 · PDF 출력 기록 전체'],
          ['보관 중', `${comma(keep)}건`],
          ['아카이브 완료', `${comma(policy.archivedCnt ?? 0)}건`],
          ['가장 오래된 기록', policy.oldestAt || '—'],
          ['다음 아카이브 예정', policy.nextArchiveAt || '—'],
        ];
    openModal({
      title: '다운로드 이력 보존 정책',
      sub: `현재 ${comma(keep)}건 보관 중`,
      render: () => (
        <View>
          <KeyValue keyWidth={130} rows={rows} />
          <SourceNote>
            {policy.note || '보존 기간이 지난 기록은 아카이브로 옮겨지며 화면 목록에서는 사라집니다. blind 처리된 항목은 파일에 담기지 않은 채 건수만 남습니다.'}
          </SourceNote>
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

  /**
   * 이력 표 열 — 행 자료는 응답 그대로 두고(정렬은 원본 값으로) 보이는 모양만 formatter 로 만듭니다.
   * formatLabel 은 공통코드(RPT_FORMAT)가 도착하면 바뀌므로 의존성에 넣습니다 — 그때 한 번 표가 다시 만들어집니다.
   */
  const columns = useMemo(() => [
    { title: '일시', field: 'ts', minWidth: 150, formatter: monoFmt },
    // 계정(사번) · 이름 · 부서를 각각 다른 칸에 — 예전에는 이름 하나로 합쳐 보였습니다
    { title: '계정', field: 'empNo', width: 84, formatter: monoFmt },
    { title: '이름', field: 'name', width: 90, formatter: dashFmt },
    { title: '부서', field: 'dept', minWidth: 110, formatter: dashFmt },
    // 보고서(내려받은 파일·보고서 이름)와 화면(내려받은 화면)을 따로 — 예전에는 「보고서 · 화면」 한 칸이었습니다
    { title: '보고서', field: 'report', minWidth: 220, widthGrow: 2, formatter: (cell) => esc(dash(cell.getValue() || cell.getData().reportName)) },
    {
      // 메뉴명 위에, 페이지 URL 을 옅게 아래에 — 어느 화면에서 내려받았는지 이름과 주소로 함께 봅니다
      title: '화면',
      field: 'reportId',
      minWidth: 170,
      formatter: (cell) => {
        const info = screenInfo(cell.getValue());
        if (!info) return '—';
        return `${esc(info.name)}${info.path ? `<div class="muted mono">${esc(info.path)}</div>` : ''}`;
      },
    },
    { title: '형식', field: 'format', width: 110, formatter: (cell) => esc(formatLabel(cell.getValue())) },
    { title: '대상 범위', field: 'scope', minWidth: 140, formatter: (cell) => `<span class="muted">${esc(dash(cell.getValue()))}</span>` },
    { title: '행 수', field: 'rowCnt', width: 80, hozAlign: 'right', sorter: 'number', formatter: (cell) => `<span class="num">${cell.getValue() != null ? comma(cell.getValue()) : '—'}</span>` },
    { title: 'blind 항목', field: 'blindCnt', width: 104, sorter: 'number', formatter: (cell) => (cell.getValue() ? `<span class="tag tag-amber">${comma(cell.getValue())}건 제외</span>` : '—') },
    { title: 'IP', field: 'ip', width: 116, formatter: monoFmt },
  ], [formatLabel]);

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="보고서 다운로드 이력"
        desc="보고서·화면에서 내려받은 파일의 이력을 계정 단위로 기록합니다. 인쇄·PDF 출력도 함께 기록되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="보존 정책" size="sm" icon="shield" onPress={showPolicy} />
          </>
        }
      />

      {/* blind 포함 · 최다 이용 카드와 보조 문구(행 수 · 오늘 날짜)는 2026-09-08 요청으로 뺐습니다 */}
      <Grid cols={2}>
        <StatCard label="누적 다운로드" value={comma(summary?.total ?? 0)} unit="건" />
        <StatCard label="금일" value={comma(summary?.today ?? 0)} unit="건" />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="보고서" value={filters.reportId} options={reportOptions} onChange={setReportId} />
        <SelectField label="부서" value={filters.deptId} options={deptOptions} onChange={setDeptId} />
        <SelectField label="형식" value={filters.format} options={formatOptions} onChange={setFormat} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {/* 쪽을 나누지 않습니다 — 조회 조건에 맞는 기록을 전부 놓고, 많으면 표 안에서 스크롤합니다 */}
      <Card
        title="다운로드 이력"
        sub={
          capped
            ? `${comma(ALL_SIZE)}건까지만 받아 왔습니다 · 더 있을 수 있으니 조회 기간을 좁혀 주세요 · 열 제목으로 정렬할 수 있습니다`
            : `${comma(items.length)}건 · 최근 순 · 이번 세션에서 내려받으면 맨 위에 추가됩니다 · 열 제목으로 정렬할 수 있습니다`
        }
      >
        <TabulatorGrid
          columns={columns}
          rows={items}
          height={items.length > 14 ? 620 : undefined}
          emptyText="조회 조건에 맞는 내려받기 기록이 없습니다."
        />
      </Card>
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

const dashFmt = (cell) => esc(dash(cell.getValue()));
const monoFmt = (cell) => `<span class="mono">${esc(dash(cell.getValue()))}</span>`;
