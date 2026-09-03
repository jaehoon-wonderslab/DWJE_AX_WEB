/**
 * [View] DB-01 AI 통합 대시보드 (경로: /dashboard/ai)
 *
 * 제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 Agent 작동 현황을 한 화면에서 확인합니다.
 * 사용 API 12건 — /api/v1/dashboard/ai/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BarChart, DonutChart, DotPlot, HeatMap, LineChart, RadarChart } from '@shared/components/charts-d3';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  BlindValue, Button, Card, ListRow, Loading, Pagination, ProgressBar, SourceNote, StateBadge, StatCard, Table,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed, rate } from '@shared/utils/formatUtil';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import EquipmentDetail from './components/EquipmentDetail';

export default function AiDashboardView({
  loading, baseDate, summary, trend, lineProduction, qualityIndex, composition, processYield,
  planActual, heatmap, alerts, agents, lines, linesMeta, paging, loadEquipmentDetail, exportExcel, refresh,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);
  const { goToScreen } = useAppNavigation();

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

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="AI 통합 대시보드"
        desc="제1공장 주력 라인(프레스 10대 · AOI 10대)의 성과지표와 Agent 작동 현황을 한 화면에서 확인합니다."
        actions={
          <>
            <Button label={`기간 · ${baseDate}`} size="sm" icon="calendar" onPress={() => toast('기간 선택은 조회 조건에서 변경합니다')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="새로고침" size="sm" variant="primary" icon="refresh" onPress={refresh} />
          </>
        }
      />

      {/* KPI 카드 4종 */}
      <Grid cols={4}>
        <StatCard label="공정 불량률" field="yield" value={rate(summary.defectRate)} unit="%" sub={summary.defectRateSub} tone="up" />
        <StatCard label="설비 가동률" value={fixed(summary.uptimeRate)} unit="%" sub={summary.uptimeRateSub} />
        <StatCard label="금일 생산량" field="qty" value={comma(summary.todayQty)} unit="EA" sub={summary.todayQtySub} />
        <StatCard
          label="미검토 경계 케이스"
          value={comma(summary.pendingBorderline?.cnt)}
          unit="건"
          sub={`HITL 대기 · 최장 ${summary.pendingBorderline?.maxWaitMin ?? 0}분`}
          tone="down"
        />
      </Grid>
      <Gap />

      <Grid cols={3}>
        <Card
          title="시간대별 불량률 추이"
          sub="오늘 · 2시간 간격"
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
                  sub: '오늘 · 2시간 간격',
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
              <Text style={[s.textXs, { marginTop: 2, marginBottom: -4, marginLeft: 2 }]}>주요 유형별 불량 수량 (EA)</Text>
              <LineChart labels={trend?.labels} series={trend.countSeries} height={96} />
            </>
          ) : null}
        </Card>

        <Card
          title="라인별 생산량 · 불량률"
          sub="프레스 10대 · 오늘"
          nativeID="chart-card-line-prod"
          right={
            <Button
              label="차트 이미지 저장"
              size="sm"
              variant="outline"
              icon="download"
              onPress={() =>
                saveChartAsPng({
                  containerId: 'chart-card-line-prod',
                  fileName: '라인별_생산량_불량률',
                  title: '라인별 생산량 · 불량률',
                  sub: '프레스 10대 · 오늘',
                  isDark: theme.isDark,
                })
              }
            />
          }
        >
          <BarChart data={(lineProduction?.lines || []).map((l) => ({ l: l.eqptCd.replace('PR-', ''), v: l.qty }))} height={110} />
          <Text style={[s.textXs, { marginTop: 2, marginBottom: -4, marginLeft: 2 }]}>불량률 (%)</Text>
          <LineChart
            labels={(lineProduction?.lines || []).map((l) => l.eqptCd.replace('PR-', ''))}
            series={[{ name: '불량률 (%)', data: (lineProduction?.lines || []).map((l) => l.defectRate) }]}
            target={3.0}
            unit="%"
            min={0}
            max={5}
            height={92}
            showLegend={false}
          />
        </Card>

        <Card
          title="공정 품질 지수"
          sub="6축 · 목표 대비"
          nativeID="chart-card-quality-index"
          right={
            <Button
              label="차트 이미지 저장"
              size="sm"
              variant="outline"
              icon="download"
              onPress={() =>
                saveChartAsPng({
                  containerId: 'chart-card-quality-index',
                  fileName: '공정_품질_지수',
                  title: '공정 품질 지수',
                  sub: '6축 · 목표 대비',
                  isDark: theme.isDark,
                })
              }
            />
          }
        >
          <RadarChart axes={(qualityIndex?.axes || []).map((a) => ({ l: a.label, v: a.value, t: a.target }))} height={200} />
        </Card>
      </Grid>
      <Gap />

      <Grid cols={3}>
        <Card
          title="불량 유형 구성"
          sub={`오늘 · 총 ${comma(composition?.total)}EA`}
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
                  sub: `오늘 · 총 ${comma(composition?.total)}EA`,
                  isDark: theme.isDark,
                })
              }
            />
          }
        >
          <DonutChart segs={(composition?.segments || []).map((x) => ({ l: x.label, v: x.value }))} height={186} unitLabel="EA" />
          <SourceNote>{composition?.note}</SourceNote>
        </Card>

        <Card
          title="공정별 수율"
          sub={`오늘 · 목표 ${processYield?.target ?? 97}% · 목표 대비 편차`}
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
                  sub: `오늘 · 목표 ${processYield?.target ?? 97}%`,
                  isDark: theme.isDark,
                })
              }
            />
          }
        >
          <DotPlot
            unit="%"
            min={94}
            max={100}
            target={processYield?.target}
            data={(processYield?.items || []).map((x) => ({ l: x.process, v: x.yieldRate, cls: x.level }))}
          />
          <SourceNote>{processYield?.note}</SourceNote>
        </Card>

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
                  sub: '프레스 10대 · 2시간 구간',
                  isDark: theme.isDark,
                })
              }
            />
          }
        >
          <BarChart data={(planActual?.items || []).map((x) => ({ l: x.slot, v: x.plan, v2: x.actual }))} height={186} />
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
      <Gap />

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
        <HeatMap rows={heatmap?.rows || []} cols={heatmap?.cols || []} data={heatmap?.data || []} lo={heatmap?.lo} hi={heatmap?.hi} unit="%" invert />
        <SourceNote>{heatmap?.note}</SourceNote>
      </Card>
      <Gap />

      <Grid cols={[2, 1]}>
        <Card title="라인별 현황" sub="실시간" tight>
          <Table
            minWidth={620}
            onRowPress={(row) => showEquipment(row.eqptCd)}
            keyExtractor={(row) => `${row.eqptCd}·${row.processId ?? ''}`}
            columns={[
              { key: 'eqptCd', title: '설비', width: 90, mono: true },
              { key: 'model', title: '모델', width: 140 },
              { key: 'qty', title: '생산량', width: 100, align: 'right', render: (r) => <BlindValue field="qty" value={comma(r.qty)} textStyle={[s.td, s.num]} /> },
              { key: 'defectRate', title: '불량률', width: 84, align: 'right', render: (r) => <BlindValue field="yield" value={`${fixed(r.defectRate)}%`} textStyle={[s.td, s.num]} /> },
              {
                key: 'uptimeRate',
                title: '가동률',
                width: 120,
                render: (r) => (
                  <View style={{ width: '100%' }}>
                    <ProgressBar percent={r.uptimeRate} tone={r.uptimeRate > 85 ? 'ok' : r.uptimeRate > 75 ? 'warn' : 'bad'} />
                    <Text style={[s.textXs, s.num, { marginTop: 3 }]}>{r.uptimeRate}%</Text>
                  </View>
                ),
              },
              { key: 'state', title: '상태', width: 82, render: (r) => <StateBadge state={r.state} /> },
            ]}
            rows={lines}
          />
          <Pagination meta={linesMeta} {...(paging?.bind || {})} />
        </Card>

        <View style={{ gap: 14 }}>
          <Card title="이상 알림" sub="최근 24시간" tight right={<Button label="전체" size="sm" variant="ghost" onPress={() => goToScreen('alert-list')} />}>
            {alerts.map((a, i, arr) => (
              <ListRow
                key={a.title}
                tone={a.level === 'red' ? 'red' : a.level === 'amber' ? 'amber' : 'gray'}
                title={a.title}
                desc={a.desc}
                time={a.elapsed}
                last={i === arr.length - 1}
                onPress={() => goToScreen('alert-list')}
              />
            ))}
          </Card>

          <Card title="Agent 작동 현황" sub="Master AI + Worker 9종" tight right={<Button label="전체" size="sm" variant="ghost" onPress={() => goToScreen('ai-agent')} />}>
            <Table
              columns={[
                { key: 'no', title: '', width: 34 },
                { key: 'name', title: 'Agent', flex: 1 },
                { key: 'state', title: '상태', width: 82, align: 'right', render: (r) => <StateBadge state={r.state} /> },
              ]}
              rows={agents.slice(0, 5)}
              keyExtractor={(r) => r.no}
            />
          </Card>
        </View>
      </Grid>
    </View>
  );
}
