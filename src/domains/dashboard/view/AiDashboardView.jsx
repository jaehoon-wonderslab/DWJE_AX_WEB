/**
 * [View] DB-01 AI 통합 대시보드 (경로: /dashboard/ai)
 *
 * 제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 실시간 생산·품질 현황을 한 화면에서 확인합니다.
 *
 * [개선 사항]
 * 1. 라인별 생산량 / 라인별 불량률 개별 카드로 분리
 * 2. 공정 품질 지수 카드 제거
 * 3. 불량 유형 구성 제목에서 (레파토 분석) 문구 제거
 * 4. 공정별 수율 실시간 산출 데이터 완벽 연동
 * 5. 설비별 시간대 가동률 참고 디자인 1:1 구현
 * 6. 2열(cols=2) 대칭 레이아웃 완벽 유지
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BarChart, DotPlot, HeatMap, LineChart, ParetoChart } from '@shared/components/charts-d3';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  BlindValue, Button, Card, DateField, Filters, Loading, Pagination, ProgressBar, SelectField,
  SourceNote, StateBadge, StatCard, Table,
} from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import { comma, fixed, rate } from '@shared/utils/formatUtil';
import { AGG_UNITS, PLANT_OPTIONS } from '../controller/useAiDashboardController';
import EquipmentDetail from './components/EquipmentDetail';

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
  lines,
  linesLoading,
  linesMeta,
  paging,
  loadEquipmentDetail,
  refresh,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /** 설비 행 클릭 → 상세 모달 */
  const showEquipment = async (eqptCd) => {
    try {
      const detail = await loadEquipmentDetail(eqptCd);
      openModal({
        title: `${detail.eqptCd} 설비 상세`,
        sub: `${detail.model} · ${detail.workcenter}`,
        render: () => <EquipmentDetail detail={detail} />,
        footer: (close) => <Button label="닫기" onPress={close} />,
      });
    } catch (e) {
      toast(e.message);
    }
  };

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
        /* 3. 2열(cols=2) 레이아웃 재구성 (총 8개 카드) */
        <Grid cols={2}>
          {/* 카드 1: 시간대별 불량률 추이 */}
          <Card
            title="시간대별 불량률 추이"
            sub={`${from} ~ ${to} · 2시간 간격`}
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
              height={150}
            />
            {trend?.countSeries?.length ? (
              <>
                <Text style={[s.textXs, { marginTop: 4, marginBottom: -4, marginLeft: 2 }]}>주요 유형별 불량 수량 (EA)</Text>
                <LineChart labels={trend?.labels} series={trend.countSeries} height={96} />
              </>
            ) : null}
          </Card>

          {/* 카드 2: 라인별 생산량 (분리 1) */}
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
              height={200}
            />
          </Card>

          {/* 카드 3: 라인별 불량률 (분리 2) */}
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
              height={200}
              showLegend={false}
            />
          </Card>

          {/* 카드 4: 불량 유형 구성 ((레파토 분석) 문구 제거) */}
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
            <ParetoChart data={composition?.segments || []} height={200} unit="EA" />
            <SourceNote>{composition?.note || '불량 수량 내림차순(막대) 및 누적 점유율(주황 꺾은선)을 분석합니다.'}</SourceNote>
          </Card>

          {/* 카드 5: 공정별 수율 (실시간 계산 데이터 완벽 연동) */}
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
            <View style={{ maxHeight: 220, overflowY: 'auto' }}>
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

          {/* 카드 6: 생산 계획 대비 실적 */}
          <Card
            title="생산 계획 대비 실적"
            sub="프레스 10대 · 2시간 구간"
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
            <BarChart data={(planActual?.items || []).map((x) => ({ l: x.slot, v: x.plan, v2: x.actual }))} height={190} />
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

          {/* 카드 7: 설비별 시간대 가동률 (참고 디자인 1:1 구현) */}
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

          {/* 카드 8: 라인별 현황 (테이블) */}
          <Card title="라인별 현황" sub="실시간 설비 모니터링" tight>
            <Table
              minWidth={540}
              onRowPress={(row) => showEquipment(row.eqptCd)}
              keyExtractor={(row) => `${row.eqptCd}·${row.processId ?? ''}`}
              columns={[
                { key: 'eqptCd', title: '설비', width: 90, mono: true },
                { key: 'model', title: '모델', width: 120 },
                { key: 'qty', title: '생산량', width: 90, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.qty)} textStyle={[s.td, s.num]} /> },
                { key: 'defectRate', title: '불량률', width: 80, align: 'right', render: (r) => <BlindValue field="yield" value={`${fixed(r.defectRate)}%`} textStyle={[s.td, s.num]} /> },
                {
                  key: 'uptimeRate',
                  title: '가동률',
                  width: 100,
                  render: (r) => (
                    <View style={{ width: '100%' }}>
                      <ProgressBar percent={r.uptimeRate} tone={r.uptimeRate > 85 ? 'ok' : r.uptimeRate > 75 ? 'warn' : 'bad'} />
                      <Text style={[s.textXs, s.num, { marginTop: 3 }]}>{r.uptimeRate}%</Text>
                    </View>
                  ),
                },
                { key: 'state', title: '상태', width: 75, render: (r) => <StateBadge state={r.state} /> },
              ]}
              rows={lines}
            />
            <Pagination meta={linesMeta} {...(paging?.bind || {})} />
          </Card>
        </Grid>
      )}
    </View>
  );
}
