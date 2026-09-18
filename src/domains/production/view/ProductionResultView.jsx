/**
 * [View] PR-02 실적 집계·조회 (경로: /production/result)
 *
 * MES 생산 실적을 기간·제품·라인별로 집계해 조회합니다.
 * 사용 API 2건 — /api/v1/production/results, /results/trend
 */
import React from 'react';
import { View } from 'react-native';
import { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, DateField, Filters, HelpTip, Loading, TabulatorTable } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import ProductionTrendD3Chart from './components/ProductionTrendD3Chart';


export default function ProductionResultView({
  loading,
  items,
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
}) {
  const theme = useTheme();

  return (
    <View style={{ width: '100%' }}>
      <PageHead
        title="실적 집계·조회"
        actions={
          <Button label={exportingScreen ? "파일 생성 중…" : "화면 전체 엑셀 다운로드"} size="sm" icon="download" onPress={exportScreenExcel} disabled={loading || exportingScreen} />
        }
      />

      <Filters>
        <DateField label="시작일" value={filters.from} onChange={setFrom} />
        <DateField label="종료일" value={filters.to} onChange={setTo} />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Button
            label="조회"
            variant="primary"
            style={{ height: 38, minWidth: 64, justifyContent: 'center' }}
            onPress={search}
          />
          <HelpTip text="시작일 오전 8시부터 종료일 오전 8시까지 시간을 검색합니다." size={38} />
        </View>
      </Filters>

      <Card
        title={`${filters.unit} 생산·불량 추이`}
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
        </View>
      </Card>
    </View>
  );
}
