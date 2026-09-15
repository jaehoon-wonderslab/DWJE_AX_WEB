/**
 * [View] DB-03 성과지표 대시보드 (경로: /dashboard/kpi)
 *
 * 사업 성과지표 3종의 실시간 산출값과 목표 대비 달성률입니다.
 * 산출 근거 데이터는 시스템관리 > 지표 측정 데이터 관리에서 확인합니다.
 * 사용 API 11건 — /api/v1/dashboard/kpi/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BarChart, DonutChart, Gauge, HBarChart, HeatMap, LineChart, RadarChart } from '@shared/components/charts-d3';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, KeyValue, Loading, NoteText, SourceNote, Table } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useTheme } from '@shared/theme/useTheme';

export default function KpiDashboardView({
  loading, cards, trend, defectDist, defectMonthly, defectMonthlyNames, aiPerf, manhour, achieve, heatmap, basis,
  goals, goalSummary, exportExcel, exportEvidence,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const openModal = useUiStore((state) => state.openModal);

  if (loading) return <Loading />;

  /** 측정 기준 보기 */
  const showBasis = () =>
    openModal({
      title: '성과지표 측정 기준',
      sub: '산출식과 측정 범위',
      render: () => <KeyValue keyWidth={150} rows={basis.map((x) => [x.name, x.formula || '—'])} />,
      footer: (close) => <Button label="닫기" onPress={close} />,
    });

  return (
    <View>
      <PageHead
        title="성과지표 대시보드"
        desc="사업 성과지표 3종의 실시간 산출값과 목표 대비 달성률입니다. 산출 근거 데이터는 지표 측정 데이터 관리에서 확인합니다."
        actions={
          <>
            <Button label="측정 기준 보기" size="sm" icon="info" onPress={showBasis} />
            <Button label="증빙 내려받기" size="sm" variant="primary" icon="file" onPress={exportEvidence} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
          </>
        }
      />

      {/* KPI 3종 */}
      <Grid cols={3}>
        {cards.map((c) => (
          <Card key={c.key} title={c.title} sub={c.sub}>
            <Gauge value={c.progress} unit="%" label="목표 진척도" level={c.level} />
            <KeyValue
              style={{ marginTop: 12 }}
              keyWidth={80}
              rows={[
                ['현재', c.current],
                ['목표', c.target],
              ]}
            />
          </Card>
        ))}
      </Grid>
      <Gap />

      <Grid cols={[2, 1]}>
        <Card title="KPI 추이" sub="월별 · 기준선(구축 전 = 100) 대비 지수">
          <LineChart labels={trend?.labels} series={trend?.series} min={60} max={115} height={200} />
          <SourceNote>{trend?.note || `기준선 ${trend?.baseline ?? 100} = 구축 전 실측값`}</SourceNote>
        </Card>
        <Card title="불량 유형 분포" sub={`${lastDataDate().slice(0, 7)} 누계`}>
          <DonutChart segs={defectDist.map((d) => ({ l: d.label, v: d.value }))} height={190} unitLabel="EA" />
        </Card>
      </Grid>
      <Gap />

      <Grid cols={2}>
        <Card title="월별 불량 유형 추이" sub={`상위 ${defectMonthlyNames.length || 2}개 유형 · 막대`}>
          <BarChart data={defectMonthly} stacked height={180} />
          <View style={[s.legend, { marginTop: 4 }]}>
            {defectMonthlyNames.map((name, i) => (
              <View key={name} style={s.rowGap6}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.seriesAt(i) }} />
                <Text style={s.legendText}>{name}</Text>
              </View>
            ))}
          </View>
        </Card>
        <Card title="AI 성능 6축" sub="목표 대비 달성 수준">
          <RadarChart axes={(aiPerf?.axes || []).map((a) => ({ l: a.label, v: a.value, t: a.target }))} height={210} />
        </Card>
      </Grid>
      <Gap />

      <Grid cols={3}>
        <Card title="부서별 작업공수 절감" sub="구축 전 대비 · 지수 100 = 기준선">
          <HBarChart data={manhour} target={50} format={(v) => String(v)} />
          <SourceNote>보고서 작성·품질 집계 업무 기준. 값이 낮을수록 공수가 줄어든 것입니다.</SourceNote>
        </Card>
        <Card title="월별 목표 달성률" sub="KPI 3종 가중 합산">
          <LineChart
            labels={achieve?.labels}
            series={achieve?.series || []}
            target={100}
            unit="%"
            min={0}
            max={110}
            height={186}
            showLegend={false}
          />
          <SourceNote>{achieve?.note || 'KPI 3종을 가중 합산한 월별 달성률입니다.'}</SourceNote>
        </Card>
        <Card title="AI 성능 목표 충족" sub="5개 항목 · 검증 결과">
          <DonutChart segs={goalSummary.map((x) => ({ l: x.label, v: x.value }))} height={186} unitLabel="건" />
          <SourceNote>AI 성능 지표는 모델 서빙 후 월 단위로 측정합니다.</SourceNote>
        </Card>
      </Grid>
      <Gap />

      <Card title="월별 지표 실측값" sub={`${heatmap?.year ?? lastDataDate().slice(0, 4)}년 · 값이 진할수록 목표에 가까움`}>
        <HeatMap rows={heatmap?.rows || []} cols={heatmap?.cols || []} data={heatmap?.data || []} lo={0} hi={100} cellWidth={72} />
        <SourceNote>{heatmap?.note || `${heatmap?.year ?? ''}년 월별 실측값 — 지표 측정 데이터가 쌓이면 채워집니다.`}</SourceNote>
      </Card>
      <Gap />

      <Card title="AI 성능 목표" sub="검증 결과 · 월 단위 갱신" tight>
        <Table
          minWidth={860}
          columns={[
            { key: 'item', title: '항목', flex: 1, minWidth: 240 },
            { key: 'key', title: '지표 key', width: 130, mono: true },
            { key: 'target', title: '목표', width: 90, align: 'right', num: true },
            {
              key: 'current',
              title: '현재',
              width: 90,
              align: 'right',
              render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.current ?? '—'}</Text>,
            },
            {
              key: 'state',
              title: '상태',
              width: 92,
              render: (r) => <Badge tone={r.state === '충족' ? 'green' : r.state === '미충족' ? 'amber' : ''}>{r.state}</Badge>,
            },
          ]}
          rows={goals}
          keyExtractor={(r) => r.item}
        />
      </Card>
      <NoteText>KPI ②③은 구축 전 1개월 사전 실측값을 기준선으로 사용합니다.</NoteText>
    </View>
  );
}
