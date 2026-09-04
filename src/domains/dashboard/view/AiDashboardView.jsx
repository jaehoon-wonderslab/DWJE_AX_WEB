/**
 * [View] DB-01 AI 통합 대시보드 (경로: /dashboard/ai)
 *
 * 제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 실시간 생산·품질 현황을 한 화면에서 확인합니다.
 *
 * [레이아웃 구성]
 * 1. KPI 지표 3종 (3열)
 * 2. 시간대별 불량률 추이 (1행 전체)
 * 3. 시간대별 주요 불량 수량 추이 ↔ 생산 계획 대비 실적 (2열)
 * 4. 라인별 생산량 ↔ 라인별 불량률 (2열)
 * 5. 불량 유형 구성 (파레토 분석, 1행 전체)
 * 6. 공정별 수율 (1행 전체)
 * 7. 설비별 시간대 가동률 (1행 전체, 프레스 1~10 명칭 적용)
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BarChart, DotPlot, HeatMap, LineChart, ParetoChart } from '@shared/components/charts-d3';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Button, Card, DateField, Filters, Loading, SelectField,
  SourceNote, StatCard,
} from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import { comma, fixed, rate } from '@shared/utils/formatUtil';
import { AGG_UNITS, PLANT_OPTIONS } from '../controller/useAiDashboardController';

export default function AiDashboardView({
  loading,
  from,
  setFrom,
  to,
  setTo,
  unit,
  changeUnit,
  plant,
  setPlant,
  search,
  summary,
  trend,
  lineProduction,
  composition,
  processYield,
  planActual,
  heatmap,
  refresh,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  return (
    <View>
      <PageHead
        title="AI 통합 대시보드"
        desc="제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 실시간 생산·품질 현황을 한 화면에서 확인합니다."
        actions={
          <Button label="새로고침" size="sm" variant="primary" icon="refresh" onPress={refresh} />
        }
      />

      {/* 1. 기간 선택 필터 영역 (실적 집계 조회 기능 그대로 적용 + 1~3공장 숨김 select box) */}
      <Filters>
        <SelectField
          label="집계 단위"
          value={unit}
          options={AGG_UNITS}
          onChange={changeUnit}
        />
        <DateField
          label="시작일"
          value={from}
          onChange={setFrom}
          disabled={unit !== '기간선택' && unit !== '일별'}
        />
        <DateField
          label="종료일"
          value={to}
          onChange={setTo}
          disabled={unit !== '기간선택' && unit !== '일별'}
        />

        {/* 1~3공장 선택 select box (기본 제1공장, 미래 사용 목적으로 숨김 처리) */}
        <View style={{ display: 'none' }}>
          <SelectField
            label="공장 선택"
            value={plant}
            options={PLANT_OPTIONS}
            onChange={setPlant}
          />
        </View>

        <View style={{ justifyContent: 'flex-end' }}>
          <Button
            label="조회"
            variant="primary"
            style={{ height: 38, minWidth: 64, justifyContent: 'center' }}
            onPress={search}
          />
        </View>
      </Filters>
      <Gap />

      {/* 2. KPI 카드 3종 */}
      <Grid cols={3}>
        <StatCard label="공정 불량률" field="yield" value={rate(summary.defectRate)} unit="%" sub={summary.defectRateSub} tone="up" />
        <StatCard label="설비 가동률" value={fixed(summary.uptimeRate)} unit="%" sub={summary.uptimeRateSub} />
        <StatCard label="금일 생산량" field="qty" value={comma(summary.todayQty)} unit="EA" sub={summary.todayQtySub} />
      </Grid>
      <Gap />

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Loading text="대시보드 데이터를 불러오는 중입니다…" />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {/* 1. 시간대별 불량률 추이 (1개의 행으로 표기) */}
          <Card
            title="시간대별 불량률 추이"
            sub={`${from} ~ ${to} · 2시간 간격 · 불량률 (%)`}
            nativeID="chart-card-hourly-trend"
            right={
              <Button
                label="차트 이미지 저장"
                size="sm"
                variant="outline"
                icon="download"
                onPress={() =>
                  saveChartAsPng({
                    containerId: 'chart-card-hourly-trend',
                    fileName: '시간대별_불량률_추이',
                    title: '시간대별 불량률 추이',
                    sub: `${from} ~ ${to}`,
                    isDark: theme.isDark,
                  })
                }
              />
            }
          >
            <LineChart
              labels={trend?.labels}
              series={trend?.rateSeries || trend?.series}
              target={trend?.target}
              unit="%"
              min={0}
              height={180}
            />
          </Card>

          {/* 2. 2열 묶음: 시간대별 주요 불량 수량 추이 (분리된 카드) ↔ 생산 계획 대비 실적 */}
          <Grid cols={2}>
            {/* 1번 아래쪽의 꺾은선 그래프 분리 카드 */}
            <Card
              title="시간대별 주요 불량 수량 추이"
              sub={`${from} ~ ${to} · 2시간 간격 · 주요 유형별 불량 수량 (EA)`}
              nativeID="chart-card-hourly-ng-count"
              right={
                <Button
                  label="차트 이미지 저장"
                  size="sm"
                  variant="outline"
                  icon="download"
                  onPress={() =>
                    saveChartAsPng({
                      containerId: 'chart-card-hourly-ng-count',
                      fileName: '시간대별_주요_불량_수량_추이',
                      title: '시간대별 주요 불량 수량 추이',
                      sub: `${from} ~ ${to}`,
                      isDark: theme.isDark,
                    })
                  }
                />
              }
            >
              <LineChart
                labels={trend?.labels}
                series={trend?.countSeries || []}
                unit="EA"
                height={180}
              />
            </Card>

            {/* 생산 계획 대비 실적 */}
            <Card
              title="생산 계획 대비 실적"
              sub="프레스 10대 · 2시간 구간 계획 vs 실적 (EA)"
              nativeID="chart-card-plan-actual"
              right={
                <Button
                  label="차트 이미지 저장"
                  size="sm"
                  variant="outline"
                  icon="download"
                  onPress={() =>
                    saveChartAsPng({
                      containerId: 'chart-card-plan-actual',
                      fileName: '생산_계획_대비_실적',
                      title: '생산 계획 대비 실적',
                      sub: '2시간 구간',
                      isDark: theme.isDark,
                    })
                  }
                />
              }
            >
              <BarChart data={(planActual?.items || []).map((x) => ({ l: x.slot, v: x.plan, v2: x.actual }))} height={180} />
              <View style={[s.legend, { marginTop: 6 }]}>
                <View style={s.rowGap6}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(0) }} />
                  <Text style={s.legendText}>계획 (EA)</Text>
                </View>
                <View style={s.rowGap6}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(1) }} />
                  <Text style={s.legendText}>실적 (EA)</Text>
                </View>
              </View>
              <SourceNote>
                {`누계 계획 ${comma(planActual?.cumPlan)}EA 대비 실적 ${comma(planActual?.cumActual)}EA · 달성률 ${fixed(planActual?.rate)}%`}
              </SourceNote>
            </Card>
          </Grid>

          {/* 3. 2열 묶음: 라인별 생산량 ↔ 라인별 불량률 */}
          <Grid cols={2}>
            {/* 라인별 생산량 */}
            <Card
              title="라인별 생산량"
              sub="프레스 10대 · 금일 생산량 (EA)"
              nativeID="chart-card-line-qty"
              right={
                <Button
                  label="차트 이미지 저장"
                  size="sm"
                  variant="outline"
                  icon="download"
                  onPress={() =>
                    saveChartAsPng({
                      containerId: 'chart-card-line-qty',
                      fileName: '라인별_생산량',
                      title: '라인별 생산량',
                      sub: `${from} ~ ${to}`,
                      isDark: theme.isDark,
                    })
                  }
                />
              }
            >
              <BarChart
                data={(lineProduction?.lines || []).map((l) => ({ l: l.eqptCd.replace('PR-', ''), v: l.qty }))}
                height={180}
              />
            </Card>

            {/* 라인별 불량률 */}
            <Card
              title="라인별 불량률"
              sub="프레스 10대 · 금일 불량률 (%) · 목표 3.0%"
              nativeID="chart-card-line-defect"
              right={
                <Button
                  label="차트 이미지 저장"
                  size="sm"
                  variant="outline"
                  icon="download"
                  onPress={() =>
                    saveChartAsPng({
                      containerId: 'chart-card-line-defect',
                      fileName: '라인별_불량률',
                      title: '라인별 불량률',
                      sub: `${from} ~ ${to}`,
                      isDark: theme.isDark,
                    })
                  }
                />
              }
            >
              <LineChart
                labels={(lineProduction?.lines || []).map((l) => l.eqptCd.replace('PR-', ''))}
                series={[{ name: '불량률 (%)', data: (lineProduction?.lines || []).map((l) => l.defectRate) }]}
                target={3.0}
                unit="%"
                min={0}
                max={5}
                height={180}
                showLegend={false}
              />
            </Card>
          </Grid>

          {/* 4. 불량유형 구성 (하나의 행으로 구성) */}
          <Card
            title="불량 유형 구성"
            sub={`총 ${comma(composition?.total)}EA · 상위 원인 집중 관리 (80/20 법칙)`}
            nativeID="chart-card-defect-composition"
            right={
              <Button
                label="차트 이미지 저장"
                size="sm"
                variant="outline"
                icon="download"
                onPress={() =>
                  saveChartAsPng({
                    containerId: 'chart-card-defect-composition',
                    fileName: '불량_유형_구성',
                    title: '불량 유형 구성',
                    sub: `총 ${comma(composition?.total)}EA`,
                    isDark: theme.isDark,
                  })
                }
              />
            }
          >
            <ParetoChart data={composition?.segments || []} height={230} unit="EA" />
            <SourceNote>{composition?.note || '불량 수량 내림차순(막대) 및 누적 점유율(주황 꺾은선)을 분석합니다.'}</SourceNote>
          </Card>

          {/* 5. 공정별 수율 (1개의 행으로 구성) */}
          <Card
            title="공정별 수율"
            sub={`목표 ${processYield?.target ?? 97}% · 목표 대비 편차 (총 ${(processYield?.items || []).length}개 공정)`}
            nativeID="chart-card-process-yield"
            right={
              <Button
                label="차트 이미지 저장"
                size="sm"
                variant="outline"
                icon="download"
                onPress={() =>
                  saveChartAsPng({
                    containerId: 'chart-card-process-yield',
                    fileName: '공정별_수율',
                    title: '공정별 수율',
                    sub: `목표 ${processYield?.target ?? 97}%`,
                    isDark: theme.isDark,
                  })
                }
              />
            }
          >
            <View style={{ maxHeight: 240, overflowY: 'auto' }}>
              <DotPlot
                unit="%"
                min={88}
                max={100}
                target={processYield?.target ?? 97}
                data={(processYield?.items || []).map((x) => ({
                  l: x.process || x.l,
                  v: x.v ?? x.yieldRate,
                  cls: x.cls || x.level,
                }))}
              />
            </View>
            <SourceNote>{processYield?.note || '양품 수량 ÷ (양품 + 불량) 기준. 재작업 투입분은 제외합니다.'}</SourceNote>
          </Card>

          {/* 6. 설비별 시간대 가동률 (1개의 행으로 구성, 프레스 1~10 (PR-01~10) 명칭 적용) */}
          <Card
            title="설비별 시간대 가동률"
            sub="프레스 10대 × 2시간 구간 · 값이 낮을수록 진하게 표시"
            nativeID="chart-card-equipment-heatmap"
            right={
              <Button
                label="차트 이미지 저장"
                size="sm"
                variant="outline"
                icon="download"
                onPress={() =>
                  saveChartAsPng({
                    containerId: 'chart-card-equipment-heatmap',
                    fileName: '설비별_시간대_가동률',
                    title: '설비별 시간대 가동률',
                    sub: '프레스 10대 × 2시간 구간',
                    isDark: theme.isDark,
                  })
                }
              />
            }
          >
            <HeatMap
              rows={heatmap?.rows || []}
              cols={heatmap?.cols || []}
              data={heatmap?.data || []}
              lo={heatmap?.lo ?? 40}
              hi={heatmap?.hi ?? 100}
              unit="%"
              invert
            />
            <SourceNote>{heatmap?.note || '진한 칸일수록 가동률이 낮은 구간입니다. PR-03·PR-05의 10~12시 구간이 금일 최저치입니다.'}</SourceNote>
          </Card>
        </View>
      )}
    </View>
  );
}
