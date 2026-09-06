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
  briefingLoading,
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
          {/*
            KPI 지표 3종
            StatCard 는 label · value · unit · sub · tone · right 를 받습니다.
            title · color · badge · 자식 요소는 받지 않아 그려지지 않고 있었습니다 —
            카드 제목이 하나도 안 나오고 진척 막대도 없는 상태였습니다(2026-09-05 고침).
          */}
          <Grid cols={3}>
            <StatCard
              label="총 생산 수량"
              field="qty"
              value={summary?.todayQty != null ? comma(summary.todayQty) : '—'}
              unit={summary?.todayQty != null ? 'EA' : ''}
              /* 목표가 없으면 달성률도 내지 않습니다 — 200,000 을 기본값으로 두면 없는 목표로 달성률이 나옵니다 */
              sub={summary?.targetQty
                ? `목표 ${comma(summary.targetQty)} EA · 달성률 ${fixed(summary.progressRate ?? 0)}%`
                : '일목표가 등록되지 않아 달성률을 낼 수 없습니다'}
            />

            <StatCard
              label="평균 불량률"
              field="yield"
              /* 불량률은 소수 2자리 — 1.98% 를 2.0% 로 반올림하면 관리 목표 근처에서 판단이 흐려집니다 */
              value={summary?.defectRate != null ? fixed(summary.defectRate, 2) : '—'}
              unit={summary?.defectRate != null ? '%' : ''}
              tone={(summary?.defectRate || 0) > 3.0 ? 'down' : 'up'}
              sub={`양품 ${comma(summary?.okQty ?? 0)} EA / 불량 ${comma(summary?.ngQty ?? 0)} EA`}
            />

            <StatCard
              label="설비 가동률"
              value={summary?.uptimeRate ? fixed(summary.uptimeRate) : '—'}
              unit={summary?.uptimeRate ? '%' : ''}
              /* 가동 18대 / 정지 2대 는 응답에 없는 필드의 기본값이었습니다 — 이 응답은 설비 대수를 주지 않습니다 */
              sub={summary?.uptimeRate ? '수집된 설비 기준' : '가동률 수집값이 없습니다 (생산 모니터링에서 확인)'}
            />
          </Grid>

          {/* AI 종합 브리핑 카드 */}
          <AiBriefingCard briefing={briefing} loading={briefingLoading} />

          {/* 설비별 AI 원인 분석 및 처방 권고 카드 (설비 선택기 포함) */}
          <AiCausePrescriptionCard
            causePrescription={causePrescription}
            eqptOptions={(causePrescription?.availableEquipments || []).map((e) => ({ value: e.eqptCd, label: e.eqptNm || e.eqptCd }))}
            selectedEqptCd={selectedEqptCd}
            onSelectEqpt={changeSelectedEqpt}
            loading={causeLoading}
            waiting={briefingLoading}
          />

          {/* 1. 시간대별 불량률 추이 */}
          <Card
            title="시간대별 불량률 추이"
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
            {/*
              가로 스크롤은 BarChart 가 스스로 답니다 (막대 수 × 최소 칸폭이 컨테이너보다 넓을 때만).
              바깥에서 한 번 더 감싸면 **스크롤바가 두 개** 생기고, 안쪽 차트가 컨테이너 실제 폭 대신
              감싼 View 의 고정 폭을 재게 되어 폭 계산도 어긋납니다.
            */}
            <BarChart
              data={defectTrendData?.barData || []}
              target={defectTrendData?.target || 3.0}
              unit="%"
              height={180}
            />

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


        </View>
      )}
    </View>
  );
}
