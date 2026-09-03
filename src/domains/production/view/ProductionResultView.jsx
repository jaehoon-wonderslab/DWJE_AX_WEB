/**
 * [View] PR-02 실적 집계·조회 (경로: /production/result)
 *
 * MES 생산 실적을 기간·제품·라인별로 집계해 조회합니다.
 * 사용 API 2건 — /api/v1/production/results, /results/trend
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BarChart, LineChart } from '@shared/components/charts';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { BlindValue, Button, Card, DateField, Filters, Loading, Pagination, SelectField, Table } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed, minutesText } from '@shared/utils/formatUtil';

const UNIT_OPTIONS = ['일별', '주별', '월별'];

/** 값이 없으면 '—' (0 으로 채우면 측정값과 구분되지 않습니다) */
const pct = (v) => (v === null || v === undefined || v === '' ? '—' : `${fixed(v)} %`);
const mins = (v) => (v === null || v === undefined || v === '' ? '—' : minutesText(v));

export default function ProductionResultView({
  loading, items, summary, trendChart, filters, modelOptions, setFrom, setTo, setUnit, setModelCd, search, exportExcel, paging, itemsMeta,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  const hasNgQty = !!trendChart?.ngQty;
  const hasRate = !!trendChart?.defectRate && !hasNgQty;

  return (
    <View>
      <PageHead
        title="실적 집계·조회"
        desc="MES 생산 실적을 기간·제품·라인별로 집계해 조회합니다."
        actions={
          <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />
        <SelectField label="집계 단위" value={filters.unit} options={UNIT_OPTIONS} onChange={setUnit} />
        <SelectField label="제품" value={filters.modelCd} options={modelOptions} onChange={setModelCd} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <Card title={`${filters.unit} 생산·불량 추이`} sub={`${filters.from} ~ ${filters.to}`}>
        {/* 불량 수량 계열이 있으면 명세대로 이중 막대, 없으면 생산량 막대만 */}
        <BarChart
          height={200}
          data={(trendChart?.labels || []).map((l, i) => ({
            l,
            v: trendChart?.qty?.[i] ?? null,
            v2: hasNgQty ? trendChart.ngQty[i] ?? null : undefined,
          }))}
        />
        {hasRate ? (
          <View style={{ marginTop: 10 }}>
            <LineChart height={120} labels={trendChart.labels} series={[{ name: '불량률', data: trendChart.defectRate }]} unit="%" showLegend={false} />
          </View>
        ) : null}
        <View style={[s.legend, { marginTop: 12 }]}>
          <View style={s.rowGap6}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(0) }} />
            <Text style={s.legendText}>생산량</Text>
          </View>
          {hasNgQty ? (
            <View style={s.rowGap6}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(1) }} />
              <Text style={s.legendText}>불량 수량</Text>
            </View>
          ) : null}
          {hasRate ? (
            <View style={s.rowGap6}>
              <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: theme.seriesAt(0) }} />
              <Text style={s.legendText}>불량률 (%) — 아래 선 그래프</Text>
            </View>
          ) : null}
        </View>
      </Card>
      <Gap />

      <Card title="집계 결과" sub={`${filters.unit} · 전체 ${comma(itemsMeta?.total ?? items.length)}건`} tight>
        {loading && !items.length ? (
          <Loading />
        ) : (
          <Table
            minWidth={820}
            keyExtractor={(r) => r.period}
            emptyText="해당 기간의 실적이 없습니다."
            columns={[
              { key: 'period', title: '일자', width: 120 },
              { key: 'inputQty', title: '투입', flex: 1, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.inputQty)} textStyle={[s.td, s.num]} /> },
              { key: 'okQty', title: '양품', flex: 1, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.okQty)} textStyle={[s.td, s.num]} /> },
              { key: 'ngQty', title: '불량', flex: 1, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.ngQty)} textStyle={[s.td, s.num]} /> },
              { key: 'defectRate', title: '불량률', width: 90, align: 'right', render: (r) => <BlindValue field="yield" value={pct(r.defectRate)} textStyle={[s.td, s.num]} /> },
              { key: 'uptimeRate', title: '가동률', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num]}>{pct(r.uptimeRate)}</Text> },
              { key: 'downtimeMin', title: '비가동 시간', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num]}>{mins(r.downtimeMin)}</Text> },
            ]}
            rows={items}
          />
        )}
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
        {summary ? (
          <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap', padding: 14, borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: theme.color.secondary }}>
            <SummaryItem label="투입 합계" field="qty" value={`${comma(summary.inputQty)} EA`} />
            <SummaryItem label="양품 합계" field="qty" value={`${comma(summary.okQty)} EA`} />
            <SummaryItem label="불량 합계" field="qty" value={`${comma(summary.ngQty)} EA`} />
            <SummaryItem label="평균 불량률" field="yield" value={pct(summary.defectRate)} />
            <SummaryItem label="평균 가동률" value={pct(summary.uptimeRate ?? summary.avgUptime)} />
            <SummaryItem label="비가동 합계" value={mins(summary.downtimeMin)} />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function SummaryItem({ label, value, field }) {
  const s = useCommonStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={s.textXs}>{label}</Text>
      <BlindValue field={field} value={value} textStyle={[s.textSm, s.num, { fontWeight: '700' }]} />
    </View>
  );
}
