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
import { Badge, Button, Card, DateField, Filters, KeyValue, Loading, Pagination, ProgressBar, SelectField, StatCard, Table } from '@shared/components/ui';
import { DEPTS } from '@shared/constants/dataFields';
import { MENU } from '@shared/constants/menu';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { lastDataDate } from '@shared/stores/useAppStore';
import { comma } from '@shared/utils/formatUtil';

const FORMATS = ['전체', '엑셀 (.xls)', 'CSV (.csv)', '인쇄 · PDF'];
const REPORT_NAMES = ['전체', ...(MENU.find((g) => g.group === '보고서')?.items || []).map((x) => x.name)];

export default function DownloadLogView({
  
  paging, itemsMeta,
  loading, items, summary, filters, setFrom, setTo, setReportName, setDept, setFormat, search, exportExcel, loadPolicy,
}) {
  const s = useCommonStyles();
  const openModal = useUiStore((state) => state.openModal);

  /** 보존 정책 보기 */
  const showPolicy = async () => {
    const policy = await loadPolicy();
    openModal({
      title: '다운로드 이력 보존 정책',
      sub: `현재 ${items.length}건 보관 중`,
      render: () => (
        <View>
          <KeyValue keyWidth={110} rows={[['보존 기간', policy.period], ['보존 대상', policy.target]]} />
          <Text style={[s.sourceText, { marginTop: 12 }]}>{policy.note}</Text>
        </View>
      ),
      footer: (close) => <Button label="닫기" onPress={close} />,
    });
  };

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

      <Grid cols={4}>
        <StatCard label="누적 다운로드" value={summary?.total ?? 0} unit="건" sub="이번 세션 기록 포함" />
        <StatCard label="금일" value={summary?.today ?? 0} unit="건" sub={lastDataDate()} />
        <StatCard label="blind 포함" value={summary?.blindCnt ?? 0} unit="건" sub="비공개 항목 제외 후 저장" />
        {/* topUser 는 {name, cnt} 객체입니다. 통째로 넘기면 React 가 렌더하지 못해 화면이 죽습니다 */}
        <StatCard label="최다 이용" value={summary?.topUser?.name ?? '—'} unit="" sub={summary?.topUser ? `${comma(summary.topUser.cnt)}건` : '계정 기준'} />
      </Grid>
      <Gap />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="보고서" value={filters.reportName} options={REPORT_NAMES} onChange={setReportName} />
        <SelectField label="부서" value={filters.dept} options={['전체', ...DEPTS.map((d) => d.id)]} onChange={setDept} />
        <SelectField label="형식" value={filters.format} options={FORMATS} onChange={setFormat} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Grid cols={[3, 1]}>
        <Card title="다운로드 이력" sub="최근 순 · 이번 세션에서 내려받으면 맨 위에 추가됩니다" tight>
          <Table
            minWidth={1080}
            keyExtractor={(r, i) => `${r.ts}-${i}`}
            columns={[
              { key: 'ts', title: '일시', width: 150, mono: true },
              { key: 'user', title: '계정', width: 84 },
              { key: 'dept', title: '부서', width: 108 },
              { key: 'reportName', title: '보고서 · 화면', flex: 1, minWidth: 200 },
              { key: 'format', title: '형식', width: 110 },
              { key: 'scope', title: '대상 범위', width: 110 },
              { key: 'rowCount', title: '행 수', width: 80, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.rowCount ? comma(r.rowCount) : '—'}</Text> },
              {
                key: 'blindCount',
                title: 'blind 항목',
                width: 100,
                render: (r) => (r.blindCount ? <Badge tone="amber">{`${r.blindCount}건 제외`}</Badge> : <Text style={s.td}>—</Text>),
              },
              { key: 'ip', title: 'IP', width: 116, mono: true },
            ]}
            rows={items}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        </Card>

        <Card title="계정별 이용" sub="다운로드 비중" tight>
          <Table
            keyExtractor={(r) => r.user}
            columns={[
              { key: 'user', title: '계정', width: 84 },
              { key: 'cnt', title: '건수', width: 62, align: 'right', num: true },
              {
                key: 'ratio',
                title: '비중',
                flex: 1,
                minWidth: 90,
                render: (r) => (
                  <View style={{ width: '100%' }}>
                    <ProgressBar percent={r.ratio} />
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
