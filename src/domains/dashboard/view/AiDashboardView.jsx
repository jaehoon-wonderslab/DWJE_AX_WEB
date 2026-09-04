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
import { ScrollView, Text, View } from 'react-native';
import { BarChart, DotPlot, HeatMap, LineChart, ParetoChart } from '@shared/components/charts-d3';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  BlindValue, Button, Card, DateField, Filters, Loading, Pagination, ProgressBar, SelectField,
  SourceNote, StateBadge, StatCard, Table, openFormModal,
} from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useUiStore } from '@shared/stores/useUiStore';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import { comma, fixed, rate } from '@shared/utils/formatUtil';
import { AGG_UNITS, PLANT_OPTIONS } from '../controller/useAiDashboardController';
import AiBriefingCard from './components/AiBriefingCard';
import AiCausePrescriptionCard from './components/AiCausePrescriptionCard';
import HourlyDefectPivotMatrix from './components/HourlyDefectPivotMatrix';
import HourlyDetailModalContent from './components/HourlyDetailModalContent';
import ProcessYieldView from './components/ProcessYieldView';

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
  briefing,
  causePrescription,
  selectedEqptCd,
  changeSelectedEqpt,
  causeLoading,
  trend,
  defectTrendData,
  lineProduction,
  composition,
  processYield,
  planActual,
  heatmap,
  lines = [],
  linesLoading,
  linesMeta,
  paging,
  loadEquipmentDetail,
  refresh,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);

  const showEquipment = async (eqptCd) => {
    try {
      if (loadEquipmentDetail) {
        const eq = await loadEquipmentDetail(eqptCd);
        openFormModal({
          title: `${eq.eqptCd} 설비 상세 정보`,
          desc: `${eq.model || '—'} · ${eq.workcenter || 'Press / 제1공장'}`,
          fields: [
            { key: 'qty', label: '금일 생산량', value: `${comma(eq.qty)} EA` },
            { key: 'defectRate', label: '금일 불량률', value: `${fixed(eq.defectRate)}%` },
            { key: 'uptimeRate', label: '가동률', value: eq.uptimeRate != null ? `${eq.uptimeRate}%` : '—' },
            { key: 'iotState', label: 'IoT 통신 상태', value: eq.iotState || '정상 수신' },
            { key: 'mold', label: '장착 금형', value: eq.mold || '—' },
          ],
          actions: [{ label: '닫기', variant: 'primary' }],
        });
      }
    } catch (e) {
      toast(e.message || '설비 정보를 불러올 수 없습니다.');
    }
  };

  const showHourlyDetailModal = (cell) => {
    if (!cell) return;
    useUiStore.getState().openModal({
      title: `${cell.date} [${cell.slotLabel} ~ ${cell.nextSlot}] 생산·품질 AI 정밀 진단 리포트`,
      sub: '제1공장 주력 라인(프레스 10대 · AOI 10대) 2시간 구간 종합 분석',
      wide: true,
      render: () => (
        <HourlyDetailModalContent cell={cell} target={defectTrendData?.target || 3.0} />
      ),
      footer: (close) => (
        <Button label="닫기" variant="primary" style={{ minWidth: 84 }} onPress={close} />
      ),
    });
  };

  const displayLines = (lines?.length ? lines : (lineProduction?.lines || [])).map((l) => ({
    ...l,
    processId: l.processId || 'Press',
    okQty: l.okQty ?? Math.max(0, (l.qty || 0) - (l.ngQty || 0)),
    ngQty: l.ngQty ?? Math.round((l.qty || 0) * ((l.defectRate || 0) / 100)),
  }));

  return (
    <View>
      <PageHead
        title="AI 통합 대시보드"
        desc="제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 실시간 생산·품질 현황을 한 화면에서 확인합니다."
        actions={
          <Button label="새로고침" size="sm" variant="primary" icon="refresh" onPress={refresh} />
        }
      />

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
        />
        <DateField
          label="종료일"
          value={to}
          onChange={setTo}
        />
        <Button
          label="조회"
          variant="primary"
          icon="search"
          onPress={search}
          loading={loading}
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
      </Filters>
      <Gap y={16} />

      {/* 2. 로딩 / 콘텐츠 영역 */}
      {loading ? (
        <Loading message="AI 통합 대시보드 데이터를 불러오는 중..." />
      ) : (
        <View style={{ gap: 20 }}>
          {/* KPI 지표 3종 (3열 배치) */}
          <Grid cols={3}>
            <StatCard
              title="총 생산 수량"
              value={summary?.totalQty != null ? `${comma(summary.totalQty)} EA` : '—'}
              sub={`목표 ${comma(summary?.targetQty || 200000)} EA 달성률 ${fixed(summary?.progressRate || 0)}%`}
              color="primary"
              badge={
                <StateBadge
                  state={(summary?.progressRate || 0) >= 95 ? '정상' : '주의'}
                  label={`진척률 ${fixed(summary?.progressRate || 0)}%`}
                />
              }
            >
              <View style={{ marginTop: 8 }}>
                <ProgressBar value={summary?.progressRate || 0} max={100} color={theme.color.primary} height={4} />
              </View>
            </StatCard>

            <StatCard
              title="평균 불량률"
              value={summary?.defectRate != null ? `${fixed(summary.defectRate)}%` : '—'}
              sub={`양품 ${comma(summary?.goodQty || 0)} EA / 불량 ${comma(summary?.defectQty || 0)} EA`}
              color={(summary?.defectRate || 0) > 3.0 ? 'danger' : 'success'}
              badge={
                <StateBadge
                  state={(summary?.defectRate || 0) > 3.0 ? '위험' : '정상'}
                  label={(summary?.defectRate || 0) > 3.0 ? '목표 초과' : '목표 달성'}
                />
              }
            >
              <View style={{ marginTop: 8 }}>
                <ProgressBar
                  value={summary?.defectRate || 0}
                  max={5}
                  color={(summary?.defectRate || 0) > 3.0 ? theme.color.danger : theme.color.success}
                  height={4}
                />
              </View>
            </StatCard>

            <StatCard
              title="설비 가동률"
              value={summary?.uptimeRate != null ? `${fixed(summary.uptimeRate)}%` : '—'}
              sub={`가동 ${summary?.runningEquipment || 18}대 / 정지 ${summary?.stoppedEquipment || 2}대`}
              color="primary"
              badge={
                <StateBadge
                  state={(summary?.uptimeRate || 0) >= 85 ? '정상' : '주의'}
                  label={`가동률 ${fixed(summary?.uptimeRate || 0)}%`}
                />
              }
            >
              <View style={{ marginTop: 8 }}>
                <ProgressBar value={summary?.uptimeRate || 0} max={100} color={theme.color.info} height={4} />
              </View>
            </StatCard>
          </Grid>

          {/* AI 종합 브리핑 카드 */}
          <AiBriefingCard briefing={briefing} />

          {/* 설비별 AI 원인 분석 및 처방 권고 카드 (설비 선택기 포함) */}
          <AiCausePrescriptionCard
            causePrescription={causePrescription}
            selectedEqptCd={selectedEqptCd}
            onSelectEqpt={changeSelectedEqpt}
            loading={causeLoading}
          />

          {/* 1. 시간대별 불량률 추이 */}
          <Card
            title="시간대별 불량률 추이"
            sub={`${from} ~ ${to} · 2시간 간격 연속 시계열 차트 (가로 스크롤) 및 일자×시간대 매트릭스`}
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
            {/* 가로 스크롤 지원하는 전체 연속 시계열 막대 그래프 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
              <View style={{ width: Math.max(760, (defectTrendData?.barData?.length || 0) * 36) }}>
                <BarChart
                  data={defectTrendData?.barData || []}
                  target={defectTrendData?.target || 3.0}
                  unit="%"
                  height={180}
                />
              </View>
            </ScrollView>

            {/* 차트와 매트릭스 간 구분을 위한 여백 및 구분선 */}
            <View style={{ marginVertical: 24, borderTopWidth: 1, borderTopColor: theme.color.border, opacity: 0.6 }} />

            {/* 일자 × 시간대별 불량률 매트릭스 */}
            <HourlyDefectPivotMatrix
              pivotMatrix={defectTrendData?.pivotMatrix}
              onCellClick={showHourlyDetailModal}
              target={defectTrendData?.target || 3.0}
            />
            <SourceNote>목표 불량률 3.0% 기준 · 검색 기간 내 전체 일자 및 2시간 단위 시간대별 생산 투입 및 품질 분석 내역입니다.</SourceNote>
          </Card>

          {/* 2. 유형별 불량 수량 추이 (1행 전체, 가로 스크롤 연속 시계열) */}
          <Card
            title="유형별 불량 수량 추이"
            sub={`${from} ~ ${to} · 2시간 간격 · 검색 기간 내 전체 일자 및 시간대별 주요 불량 유형 발생 수량 (EA)`}
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
                    fileName: '유형별_불량_수량_추이',
                    title: '유형별 불량 수량 추이',
                    sub: `${from} ~ ${to}`,
                    isDark: theme.isDark,
                  })
                }
              />
            }
          >
            <LineChart
              labels={trend?.continuousLabels || trend?.labels}
              series={trend?.continuousCountSeries || trend?.countSeries || []}
              unit="EA"
              height={200}
            />
          </Card>

          {/* 3. 생산 계획 대비 실적 (1행 전체) */}
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

          {/* 4. 불량 유형 구성 (1행 전체) */}
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

          {/* 5. 공정별 수율 (고시인성 수율 게이지 및 목표 마커 뷰) */}
          <Card
            title="공정별 수율"
            sub={`목표 ${processYield?.target ?? 97}% · 목표 대비 편차 및 공정별 수율 정밀 분석`}
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
            <ProcessYieldView processYield={processYield} />
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
