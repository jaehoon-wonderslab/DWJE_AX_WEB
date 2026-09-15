/**
 * [View] PR-02 실적 집계·조회 (경로: /production/result)
 *
 * MES 생산 실적을 기간·제품·라인별로 집계해 조회합니다.
 * 사용 API 2건 — /api/v1/production/results, /results/trend
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { BlindValue, Button, Card, DateField, Filters, Loading, TabulatorTable } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed, minutesText } from '@shared/utils/formatUtil';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import ProductionTrendD3Chart from './components/ProductionTrendD3Chart';


/** 값이 없으면 '—' (0 으로 채우면 측정값과 구분되지 않습니다) */
const pct = (v) => (v === null || v === undefined || v === '' ? '—' : `${fixed(v)} %`);
const mins = (v) => (v === null || v === undefined || v === '' ? '—' : minutesText(v));

export default function ProductionResultView({
  loading,
  items,
  summary,
  trendChart,
  filters,
  period,
  setFrom,
  setTo,
  search,
  exportExcel,
  exportScreenExcel,
  exportingGrid,
  exportingScreen,
  itemsMeta,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  return (
    <View style={{ width: '100%' }}>
      <PageHead
        title="실적 집계·조회"
        desc="MES 생산 실적을 기간·제품·라인별로 집계해 조회합니다."
        actions={
          <Button label={exportingScreen ? "파일 생성 중…" : "화면 전체 엑셀 다운로드"} size="sm" icon="download" onPress={exportScreenExcel} disabled={loading || exportingScreen} />
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />

        <View style={{ justifyContent: 'flex-end' }}>
          <Button
            label="조회"
            variant="primary"
            style={{ height: 38, minWidth: 64, justifyContent: 'center' }}
            onPress={search}
          />
        </View>
      </Filters>

      <Card
        title={`${filters.unit} 생산·불량 추이`}
        sub={`${period.from} ~ ${period.to}`}
        right={
          <Button
            label="차트 이미지 저장"
            size="sm"
            variant="outline"
            icon="download"
            onPress={() =>
              saveChartAsPng({
                svgId: 'production-trend-d3-svg',
                fileName: `생산_불량_추이_${period.from}_${period.to}`,
                title: `${filters.unit} 생산·불량 추이`,
                sub: `${period.from} ~ ${period.to}`,
                isDark: theme.isDark,
              })
            }
          />
        }
      >
        {loading ? (
          <View style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>
            <Loading text="생산·불량 추이 데이터를 불러오는 중입니다…" />
          </View>
        ) : (
          <ProductionTrendD3Chart
            labels={trendChart?.labels || []}
            qty={trendChart?.qty || []}
            ngQty={trendChart?.ngQty || []}
            defectRate={trendChart?.defectRate || []}
            unit={filters.unit}
            height={240}
          />
        )}
      </Card>
      <Gap />

      <Card
        title="집계 결과"
        sub={`${filters.unit} · 전체 ${comma(itemsMeta?.total ?? items.length)}건 (행 좌측 [+] 클릭 시 제품 ➔ 공정/프레스 기기별 상세 실적 확인)`}
        right={
          <Button
            label={exportingGrid ? "파일 생성 중…" : "집계 결과 엑셀 다운로드"}
            size="sm"
            variant="outline"
            icon="download"
            onPress={exportExcel}
            disabled={loading || exportingGrid || !items.length}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6 }}>
          {loading ? (
            <View style={{ minHeight: 200, alignItems: 'center', justifyContent: 'center' }}>
              <Loading text="실적 집계 데이터를 불러오는 중입니다…" />
            </View>
          ) : (
            <TabulatorTable
              rows={items}
              emptyText="해당 기간의 실적이 없습니다."
            />
          )}
          {summary ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap',
                marginTop: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.color.border,
                backgroundColor: theme.alpha('secondary', 0.4),
              }}
            >
              <Text style={[s.textXs, { fontWeight: '700', color: theme.color.foreground }]}>합계 요약</Text>
              <SummaryItem label="투입" field="qty" value={`${comma(summary.inputQty)} EA`} />
              <SummaryItem label="양품" field="qty" value={`${comma(summary.okQty)} EA`} />
              <SummaryItem label="불량" field="qty" value={`${comma(summary.ngQty)} EA`} />
              <SummaryItem label="평균 불량률" field="yield" value={pct(summary.defectRate)} />
              <SummaryItem label="평균 가동률" value={pct(summary.uptimeRate ?? summary.avgUptime)} />
              <SummaryItem label="비가동 합계" value={mins(summary.downtimeMin)} />
            </View>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

function SummaryItem({ label, value, field }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{label}</Text>
      <BlindValue field={field} value={value} textStyle={[s.textSm, s.num, { fontWeight: '700', color: theme.color.foreground }]} />
    </View>
  );
}
