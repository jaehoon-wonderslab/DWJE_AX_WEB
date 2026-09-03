/**
 * [View] PR-04 이전 보고서 (경로: /production/daily-report/history)
 *
 * 일일 생산현황 보고서의 과거 이력을 조회하고, 이전 보고서를 새 기간으로 복제합니다.
 * 사용 API 2건 — /api/v1/production/daily-reports, /{reportId}/copy
 */
import React from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, Loading, Pagination, SelectField, StateBadge, Table, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useCommonStyles } from '@shared/theme/styles';

export default function DailyHistoryView({
  
  paging, itemsMeta,
  loading, items, filters, setFrom, setTo, setState, reload, copyReport, exportExcel,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);

  /** 이전 보고서를 새 기간으로 다시 생성합니다 */
  const openCopyForm = (row) =>
    openFormModal({
      title: '보고서 복제',
      sub: '이전 보고서를 새 기간으로 다시 생성합니다',
      fields: [
        { key: 'source', label: '원본 보고서', type: 'static', value: `${row.targetDate} · v${row.version} (${row.state})`, full: true },
        { key: 'targetDate', label: '새 대상 일자', type: 'date', required: true, value: lastDataDate(), max: null },
        { key: 'keepText', label: '복제 범위', type: 'radio', full: true, value: '수치만 새로 집계', options: ['수치만 새로 집계', '본문까지 그대로 복제'] },
      ],
      note: '수치는 새 기간 기준으로 다시 집계되며, 본문은 선택에 따라 초안이 다시 만들어집니다.',
      submitLabel: '복제',
      onSubmit: async (v) => {
        await copyReport(row.reportId, v.targetDate);
        return true;
      },
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="이전 보고서"
        desc="일일 생산현황 보고서의 과거 이력입니다. 확정본을 열어 보거나, 이전 보고서를 새 기간으로 복제할 수 있습니다."
        actions={
          <>
            <Button label="일일 생산현황 보고" size="sm" icon="arrowLeft" onPress={() => goToScreen('prod-daily')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
          </>
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="상태" value={filters.state} options={['전체', '검토 대기', '확정', '반려']} onChange={setState} />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="보고서 이력" sub={`${items.length}건`} tight>
        <Table
            minWidth={820}
            keyExtractor={(r) => r.reportId}
            onRowPress={(r) => (r.state === '검토 대기' ? goToScreen('prod-daily') : toast(`${r.targetDate} 확정본을 열었습니다`))}
            columns={[
              { key: 'targetDate', title: '대상 일자', width: 120 },
              { key: 'version', title: '버전', width: 70, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{`v${r.version}`}</Text> },
              { key: 'state', title: '상태', width: 100, render: (r) => <StateBadge state={r.state} /> },
              { key: 'generatedAt', title: '생성 일시', flex: 1, minWidth: 150 },
              { key: 'confirmedAt', title: '확정 일시', flex: 1, minWidth: 150, render: (r) => <Text style={s.td}>{r.confirmedAt || '—'}</Text> },
              {
                key: 'correctionCnt',
                title: '보정',
                width: 80,
                align: 'center',
                render: (r) => (r.correctionCnt ? <Badge tone="amber">{`${r.correctionCnt}건`}</Badge> : <Text style={[s.td, { textAlign: 'center' }]}>—</Text>),
              },
              { key: 'copy', title: '복제', width: 82, render: (r) => <Button label="복제" size="sm" onPress={() => openCopyForm(r)} /> },
            ]}
            rows={items}
          />
          <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
