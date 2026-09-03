/**
 * [View] SY-14 보고서 다운로드 이력 (경로: /system/download-log)
 *
 * 인쇄·PDF 출력도 함께 기록되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다.
 * 사용 API 4건 — /api/v1/download-logs/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, KeyValue, Loading, Pagination, ProgressBar, SelectField, SourceNote, StatCard, Table } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, today } from '@shared/utils/formatUtil';

export default function DownloadLogView({
  paging, itemsMeta,
  loading, items, summary, filters, reportOptions = [], deptOptions = [], formatOptions = [], formatLabel = (v) => v,
  setFrom, setTo, setReportId, setDeptId, setFormat, search, exportExcel, loadPolicy,
}) {
  const s = useCommonStyles();
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
    const keep = policy.totalCnt ?? summary?.total ?? itemsMeta?.total ?? items.length;
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

  if (loading) return <Loading />;

  const total = itemsMeta?.total ?? items.length;

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

      <Grid cols={4}>
        <StatCard label="누적 다운로드" value={comma(summary?.total ?? 0)} unit="건" sub={summary?.totalRows != null ? `이번 세션 기록 포함 · 행 ${comma(summary.totalRows)}건` : '이번 세션 기록 포함'} />
        <StatCard label="금일" value={comma(summary?.today ?? 0)} unit="건" sub={today()} />
        <StatCard label="blind 포함" value={comma(summary?.blindCnt ?? 0)} unit="건" sub="비공개 항목 제외 후 저장" tone={summary?.blindCnt ? 'down' : ''} />
        {/* topUser 는 {name, cnt} 객체입니다. 통째로 넘기면 React 가 렌더하지 못해 화면이 죽습니다 */}
        <StatCard label="최다 이용" value={summary?.topUser?.name ?? '—'} unit="" sub={summary?.topUser ? `${comma(summary.topUser.cnt)}건 · 계정 기준` : '계정 기준'} />
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

      <Grid cols={[3, 1]}>
        <Card title="다운로드 이력" sub={`${comma(total)}건 · 최근 순 · 이번 세션에서 내려받으면 맨 위에 추가됩니다`} tight>
          <Table
            minWidth={1080}
            keyExtractor={(r, i) => `${r.dlId ?? r.ts}-${i}`}
            emptyText="조회 조건에 맞는 내려받기 기록이 없습니다."
            columns={[
              { key: 'ts', title: '일시', width: 150, mono: true },
              { key: 'name', title: '계정', width: 96, render: (r) => <Text style={s.td}>{r.name || r.empNo || '—'}</Text> },
              { key: 'dept', title: '부서', width: 108 },
              { key: 'report', title: '보고서 · 화면', flex: 1, minWidth: 200, wrap: true, render: (r) => <Text style={s.td}>{r.report || r.reportName || '—'}</Text> },
              { key: 'format', title: '형식', width: 110, render: (r) => <Text style={s.td}>{formatLabel(r.format)}</Text> },
              { key: 'scope', title: '대상 범위', width: 150, wrap: true, render: (r) => <Text style={s.textXs} numberOfLines={2}>{r.scope || '—'}</Text> },
              { key: 'rowCnt', title: '행 수', width: 80, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.rowCnt != null ? comma(r.rowCnt) : '—'}</Text> },
              {
                key: 'blindCnt',
                title: 'blind 항목',
                width: 100,
                render: (r) => (r.blindCnt ? <Badge tone="amber">{`${comma(r.blindCnt)}건 제외`}</Badge> : <Text style={s.td}>—</Text>),
              },
              { key: 'ip', title: 'IP', width: 116, mono: true },
            ]}
            rows={items}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        </Card>

        <Card title="계정별 이용" sub={`다운로드 비중 · 전체 ${comma(summary?.total ?? 0)}건 기준`} tight>
          <Table
            keyExtractor={(r, i) => `${r.empNo || r.user}-${i}`}
            emptyText="집계된 계정이 없습니다."
            columns={[
              { key: 'user', title: '계정', width: 96, render: (r) => <Text style={s.td} numberOfLines={1}>{r.user}{r.dept ? <Text style={s.textXs}>{` ${r.dept}`}</Text> : null}</Text> },
              { key: 'cnt', title: '건수', width: 56, align: 'right', num: true },
              {
                key: 'ratio',
                title: '비중',
                flex: 1,
                minWidth: 90,
                render: (r) => (
                  <View style={{ width: '100%', paddingRight: 8 }}>
                    <ProgressBar percent={r.ratio} />
                    <Text style={[s.textXs, { textAlign: 'right', marginTop: 2 }]}>{`${r.ratio}%`}</Text>
                  </View>
                ),
              },
            ]}
            rows={summary?.byUser || []}
          />
        </Card>
      </Grid>
    </View>
  );
}
