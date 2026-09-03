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
import { BlindValue, Button, Card, Filters, Hint, Loading, Pagination, SelectField, StatCard, StateBadge, Table } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed } from '@shared/utils/formatUtil';
import { monitorStateLabel } from '../model/productionRepository';

/** 갱신 시각 표기 (초까지 — 10초 폴링이라 분 단위로는 움직임이 안 보입니다) */
const hhmmss = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

/** 값이 없으면 '—' 를 두고, 있으면 뒤에 단위를 붙입니다 */
const withUnit = (v, unit) => (v === null || v === undefined || v === '' ? '—' : `${v}${unit}`);

/**
 * 비가동 상세 — 서버는 정지 설비 목록(`[{eqptCd, …}]`)을 배열로 줍니다.
 * 비가동 설비가 많으면 대표 설비 또는 전체 건수로 안내합니다.
 */
function stoppedDetailText(detail, stoppedCnt) {
  if (detail && typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    const codes = detail.map((d) => (typeof d === 'string' ? d : d?.eqptCd)).filter(Boolean);
    const head = codes.slice(0, 3).join(' · ');
    return codes.length > 3 ? `${head} 외 ${codes.length - 3}대` : head;
  }
  if (stoppedCnt > 0) return `${comma(stoppedCnt)}대 정지 중`;
  return '정지 설비 없음';
}

function warningDetailText(detail, warningCnt) {
  if (detail && typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    const codes = detail.map((d) => (typeof d === 'string' ? d : d?.eqptCd)).filter(Boolean);
    const head = codes.slice(0, 3).join(' · ');
    return codes.length > 3 ? `${head} 외 ${codes.length - 3}대` : head;
  }
  if (warningCnt > 0) return `${comma(warningCnt)}대 점검 필요`;
  return '경고 설비 없음';
}

export default function ProductionMonitorView({
  paging, itemsMeta,
  loading, summary, items, filters, setProcessId, setModel, setState,
  autoRefresh, toggleAutoRefresh, search, exportExcel, modelOptions, processOptions, stateOptions = ['전체'],
  iotMissing, noOutputToday, updatedAt }) {
  const s = useCommonStyles();

  // 전체 대수는 응답에 없으면 가동·경고·비가동 합으로 셉니다 (박아 둔 숫자는 실제 설비 수와 다릅니다)
  const totalCnt = summary?.total ?? (summary ? (summary.running ?? 0) + (summary.warning ?? 0) + (summary.stopped ?? 0) : null);
  const filtered = filters.processId !== '전체' || filters.model !== '전체' || filters.state !== '전체';

  return (
    <View>
      <PageHead
        title="생산 모니터링"
        desc={
          'IoT 복합 센서가 부착된 설비의 진행 현황을 실시간으로 조회합니다.'
          // 조회 조건을 걸면 카드도 함께 좁혀집니다 — 무엇을 세고 있는지 밝혀 둡니다
          + (totalCnt ? ` ${filtered ? '조회 대상' : '등록 설비'} ${comma(totalCnt)}대.` : '')
        }
        actions={
          <>
            {/* 값이 전부 0 일 때 화면이 살아 있는지 알려면 갱신 시각이 보여야 합니다 */}
            {updatedAt ? <Text style={[s.textXs, { alignSelf: 'center', marginRight: 2 }]}>{`${hhmmss(updatedAt)} 갱신`}</Text> : null}
            <Button
              label={autoRefresh ? '실시간 갱신 중 · 10초' : '자동 새로고침 꺼짐'}
              size="sm"
              variant={autoRefresh ? 'primary' : undefined}
              icon="refresh"
              onPress={toggleAutoRefresh}
            />
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

      {/* 비는 이유가 둘이고 성격이 다릅니다 — 하나는 상시, 하나는 그날 이관 전까지만 */}
      {iotMissing ? (
        <>
          <Hint icon="alert">
            {'설비 IoT 수집이 아직 연결되지 않았습니다 — 가동률 · 타발 속도 · 최근 수집은 상시 비어 있습니다. '
              + '설비 상태는 IoT 값이 없어 전부 비가동으로 표시됩니다.'}
          </Hint>
          <Gap />
        </>
      ) : null}
      {noOutputToday ? (
        <>
          <Hint>
            {'오늘 라벨 실적이 아직 들어오지 않아 생산량 · 불량률이 0 입니다. '
              + '모니터링은 당일 기준이며, MES 이관이 돌면 채워집니다.'}
          </Hint>
          <Gap />
        </>
      ) : null}

      <Grid cols={4}>
        <StatCard
          label="가동"
          value={summary?.running ?? '—'}
          unit="대"
          sub={totalCnt === null ? undefined : `전체 ${comma(totalCnt)}대 중`}
          tone={Number(summary?.running) > 0 ? 'up' : undefined}
        />
        <StatCard
          label="경고"
          value={summary?.warning ?? '—'}
          unit="대"
          sub={warningDetailText(summary?.warningDetail, summary?.warning)}
          tone={Number(summary?.warning) > 0 ? 'down' : undefined}
        />
        <StatCard
          label="비가동"
          value={summary?.stopped ?? '—'}
          unit="대"
          sub={stoppedDetailText(summary?.stoppedDetail, summary?.stopped)}
          tone={Number(summary?.stopped) > 0 ? 'down' : undefined}
        />
        <StatCard label="시간당 처리" field="qty" value={comma(summary?.hourlyThroughput)} unit="EA" sub="전 라인 합계" />
      </Grid>
      <Gap />

      <Card title="설비별 실시간 현황" sub="프레스 IoT 1초 단위 수집 · AOI 제품 단위" tight>
        {loading && !items.length ? (
          <Loading />
        ) : (
          <Table
            minWidth={980}
            keyExtractor={(r) => r.eqptCd}
            emptyText="조회 조건에 맞는 설비가 없습니다."
            columns={[
              { key: 'eqptCd', title: '설비', width: 96, mono: true },
              { key: 'eqptNm', title: '설비명', flex: 1, minWidth: 200, render: (r) => <Text style={[s.td, { fontWeight: '500' }]} numberOfLines={1}>{r.eqptNm || r.model || '—'}</Text> },
              { key: 'qty', title: '생산량', width: 106, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.qty)} textStyle={[s.td, s.num]} /> },
              { key: 'defectRate', title: '불량률', width: 90, align: 'right', render: (r) => <BlindValue field="yield" value={withUnit(fixed(r.defectRate) === '—' ? null : fixed(r.defectRate), '%')} textStyle={[s.td, s.num]} /> },
              { key: 'uptimeRate', title: '가동률', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num]}>{withUnit(fixed(r.uptimeRate) === '—' ? null : fixed(r.uptimeRate), '%')}</Text> },
              { key: 'strokeSpeed', title: '타발 속도', width: 104, align: 'right', render: (r) => <BlindValue field="mold" value={withUnit(r.strokeSpeed, ' spm')} textStyle={[s.td, s.num]} /> },
              { key: 'lastCollectedAt', title: '최근 수집', width: 140, render: (r) => <Text style={[s.td, s.num]} numberOfLines={1}>{r.lastCollectedAt || '—'}</Text> },
              { key: 'state', title: '상태', width: 86, align: 'center', render: (r) => <StateBadge state={monitorStateLabel(r.state)} /> },
            ]}
            rows={items}
          />
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
