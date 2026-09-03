/**
 * [View] PR-01 생산 모니터링 (경로: /production/monitor)
 *
 * IoT 복합 센서가 부착된 프레스 10대와 AOI 검사기 10대의 진행 현황을 실시간으로 조회합니다.
 * 사용 API 2건 — /api/v1/production/monitor/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { BlindValue, Button, Card, Filters, Loading, Pagination, SelectField, StatCard, StateBadge, Table } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';
import { monitorStateLabel } from '../model/productionRepository';

/** 값이 없으면 '—' 를 두고, 있으면 뒤에 단위를 붙입니다 */
const withUnit = (v, unit) => (v === null || v === undefined || v === '' ? '—' : `${v}${unit}`);

/**
 * 비가동 상세 — 서버는 정지 설비 목록(`[{eqptCd, …}]`)을 배열로 줍니다.
 * 배열을 그대로 Text 에 넣으면 코드가 붙어 나오므로 설비 코드 몇 개만 이어 씁니다.
 */
function stoppedDetailText(detail) {
  if (!detail) return undefined;
  if (typeof detail === 'string') return detail;
  if (!Array.isArray(detail) || !detail.length) return '정지 설비 없음';
  const codes = detail.map((d) => (typeof d === 'string' ? d : d?.eqptCd)).filter(Boolean);
  const head = codes.slice(0, 3).join(' · ');
  return codes.length > 3 ? `${head} 외 ${codes.length - 3}대` : head;
}

export default function ProductionMonitorView({
  paging, itemsMeta,
  loading, summary, items, filters, setProcessId, setModel, setState,
  autoRefresh, toggleAutoRefresh, search, exportExcel, modelOptions, processOptions, stateOptions = ['전체'] }) {
  const s = useCommonStyles();

  // 전체 대수는 응답에 없으면 가동·경고·비가동 합으로 셉니다 (박아 둔 숫자는 실제 설비 수와 다릅니다)
  const totalCnt = summary?.total ?? (summary ? (summary.running ?? 0) + (summary.warning ?? 0) + (summary.stopped ?? 0) : null);

  return (
    <View>
      <PageHead
        title="생산 모니터링"
        desc="IoT 복합 센서가 부착된 프레스 10대와 AOI 검사기 10대의 진행 현황을 실시간으로 조회합니다."
        actions={
          <>
            <Button label={autoRefresh ? '자동 새로고침 · 10초' : '자동 새로고침 꺼짐'} size="sm" icon="refresh" onPress={toggleAutoRefresh} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
          </>
        }
      />

      <Filters>
        <SelectField label="공정" value={filters.processId} options={processOptions} onChange={setProcessId} />
        <SelectField label="모델" value={filters.model} options={modelOptions} onChange={setModel} />
        <SelectField label="상태" value={filters.state} options={stateOptions} onChange={setState} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Grid cols={4}>
        <StatCard label="가동" value={summary?.running ?? '—'} unit="대" sub={totalCnt === null ? undefined : `전체 ${comma(totalCnt)}대 중`} />
        <StatCard label="경고" value={summary?.warning ?? '—'} unit="대" sub={stoppedDetailText(summary?.warningDetail)} tone="down" />
        <StatCard label="비가동" value={summary?.stopped ?? '—'} unit="대" sub={stoppedDetailText(summary?.stoppedDetail)} tone="down" />
        <StatCard label="시간당 처리" field="qty" value={comma(summary?.hourlyThroughput)} unit="EA" sub="전 라인 합계" />
      </Grid>
      <Gap />

      <Card title="설비별 실시간 현황" sub="프레스 IoT 1초 단위 수집 · AOI 제품 단위" tight>
        {loading && !items.length ? (
          <Loading />
        ) : (
          <Table
            minWidth={880}
            keyExtractor={(r) => r.eqptCd}
            emptyText="조회 조건에 맞는 설비가 없습니다."
            columns={[
              { key: 'eqptCd', title: '설비', width: 90, mono: true },
              { key: 'eqptNm', title: '설비명', width: 170, render: (r) => <Text style={s.td} numberOfLines={1}>{r.eqptNm || r.model || '—'}</Text> },
              { key: 'qty', title: '생산량', width: 100, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.qty)} textStyle={[s.td, s.num]} /> },
              { key: 'defectRate', title: '불량률', width: 88, align: 'right', render: (r) => <BlindValue field="yield" value={withUnit(fixed(r.defectRate) === '—' ? null : fixed(r.defectRate), '%')} textStyle={[s.td, s.num]} /> },
              { key: 'uptimeRate', title: '가동률', width: 84, align: 'right', render: (r) => <Text style={[s.td, s.num]}>{withUnit(fixed(r.uptimeRate) === '—' ? null : fixed(r.uptimeRate), '%')}</Text> },
              { key: 'strokeSpeed', title: '타발 속도', width: 96, align: 'right', render: (r) => <BlindValue field="mold" value={withUnit(r.strokeSpeed, ' spm')} textStyle={[s.td, s.num]} /> },
              { key: 'lastCollectedAt', title: '최근 수집', width: 130, render: (r) => <Text style={[s.td, s.num]} numberOfLines={1}>{r.lastCollectedAt || '—'}</Text> },
              { key: 'state', title: '상태', width: 82, render: (r) => <StateBadge state={monitorStateLabel(r.state)} /> },
            ]}
            rows={items}
          />
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
