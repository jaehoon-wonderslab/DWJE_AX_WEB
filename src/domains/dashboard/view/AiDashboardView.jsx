/**
 * [View] DB-01 AI 통합 대시보드 (경로: /dashboard/ai)
 *
 * 생산·품질 현황과 AI 분석을 한 화면에서 봅니다.
 *
 * 설명 문구에 "제1공장 주력 라인(프레스 10대 · AOI 10대)" 이라 적혀 있던 것을 걷어냈습니다 —
 * 설비 마스터 1,511대 중 그런 구성이 없고, PR- 로 시작하는 설비 코드도 없습니다.
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
  period,
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

  /**
   * 계획이 실제로 등록돼 있는가
   *
   * 서버는 계획이 없어도 `plan: 0` 으로 칸을 채워 보냅니다. 합이 0 이면 등록된 계획이
   * 없는 것이므로 계획 막대를 내지 않습니다 — 0 을 그리면 "계획을 0 으로 세웠다" 로 읽힙니다.
   */
  const hasPlan = (planActual?.items || []).some((x) => Number(x.plan) > 0);

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
      // 'AI 정밀 진단' 이라 부르던 것을 걷어냈습니다 — 여기서 보여 주는 건 그 구간의 실측입니다.
      // sub 에 있던 '프레스 10대 · AOI 10대' 도 없앴습니다. 설비 마스터에 PR- 로 시작하는 코드가 없습니다.
      title: `${cell.date} [${cell.slotLabel} ~ ${cell.nextSlot}] 생산·품질 실적`,
      sub: '2시간 구간 실측입니다.',
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
        desc="생산·품질 현황과 AI 분석을 한 화면에서 확인합니다."
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
          <AiBriefingCard briefing={briefing} loading={briefingLoading} period={period} />

          {/* 설비별 AI 원인 분석 및 처방 권고 카드 (설비 선택기 포함) */}
          <AiCausePrescriptionCard
            causePrescription={causePrescription}
            eqptOptions={(causePrescription?.availableEquipments || []).map((e) => ({ value: e.eqptCd, label: e.eqptNm || e.eqptCd }))}
            selectedEqptCd={selectedEqptCd}
            onSelectEqpt={changeSelectedEqpt}
            loading={causeLoading}
            waiting={briefingLoading}
            period={period}
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

            {/*
              일자 × 시간대별 불량률 매트릭스 — **시간 단위로 올 때만** 그립니다
              서버가 구간 길이에 따라 칸을 접습니다(7일 이하 2시간 · 8~120일 일 · 그 위 주).
              접힌 값을 12칸에 늘어놓으면 없는 시간대 구분을 만들어 내게 되므로, 그때는
              매트릭스 대신 왜 없는지 적습니다. 위 막대 그래프는 접힌 단위 그대로 나옵니다.
            */}
            {defectTrendData?.pivotMatrix ? (
              <HourlyDefectPivotMatrix
                pivotMatrix={defectTrendData.pivotMatrix}
                onCellClick={showHourlyDetailModal}
                target={defectTrendData?.target || 3.0}
              />
            ) : (
              <EmptyState text={`선택 구간이 길어 ${defectTrendData?.bucket?.note || '일 단위로 접혔습니다'}. 시간대별 매트릭스는 7일 이하 구간에서 나옵니다.`} />
            )}
            {/*
              색을 나누는 3.0%는 **등록된 목표가 아닙니다.** ax.tb_met_metric_std 에는
              설비 가동률 85% · 생산 달성률 100% · 일 목표 수량뿐이고 불량률 기준은 없습니다
              (2026-09-06 확인). 서버가 target 을 주기 시작하면 그 값을 씁니다.
            */}
            <SourceNote>
              2시간 단위 실측입니다. 실적이 없는 시간대는 빈 칸입니다.
              색 기준 3.0%는 등록된 목표가 아니라 화면이 정한 값입니다.
            </SourceNote>
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
              labels={trend?.labels || []}
              series={trend?.countSeries || []}
              unit="EA"
              height={200}
            />
            {/*
              몇 종을 그린 것인지 밝힙니다. 서버가 주는 계열은 구간 합계 **상위 N종**이라
              합이 총 불량이 아닙니다. 적어 두지 않으면 이 그림을 불량 전량으로 읽습니다.
              (예전에는 총 불량수에 0.48·0.32·0.20 을 곱해 세 유형으로 나눠 그렸습니다.)
            */}
            {trend?.seriesScope?.topN ? (
              <SourceNote>{`불량 유형 상위 ${trend.seriesScope.topN}종입니다. 이 계열들의 합은 총 불량 수량이 아닙니다.`}</SourceNote>
            ) : null}
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
            {/*
              등록된 생산 계획이 없으면 **계획 막대를 내지 않습니다**
              `tb_pop_stock_hist` 의 hist_type=PLAN 이 한 행도 없어 계획이 전부 0 으로 옵니다
              (2026-09-06 API 확인). 그걸 그대로 그리면 "계획 0EA" 가 되어, 계획을 안 세운 것이
              아니라 계획이 0 이었던 것처럼 읽힙니다. 실적만 그리고 왜 없는지 적습니다.
            */}
            <BarChart
              data={(planActual?.items || []).map((x) => (hasPlan
                ? { l: x.slot, v: x.plan, v2: x.actual }
                : { l: x.slot, v: x.actual }))}
              height={180}
            />
            <View style={[s.legend, { marginTop: 6 }]}>
              {hasPlan ? (
                <View style={s.rowGap6}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(0) }} />
                  <Text style={s.legendText}>계획 (EA)</Text>
                </View>
              ) : null}
              <View style={s.rowGap6}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(hasPlan ? 1 : 0) }} />
                <Text style={s.legendText}>실적 (EA)</Text>
              </View>
            </View>
            <SourceNote>
              {hasPlan
                ? `누계 계획 ${comma(planActual.cumPlan)}EA 대비 실적 ${comma(planActual.cumActual)}EA · 달성률 ${fixed(planActual.rate)}%`
                : `실적 누계 ${comma(planActual?.cumActual ?? 0)}EA. 등록된 생산 계획이 없어 달성률은 내지 못합니다.`}
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
