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
          {/* 1. 시간대별 불량률 추이 (하나의 막대 그래프 + 검색한 모든 날짜 정보 표) */}
          <Card
            title="시간대별 불량률 추이"
            sub={`${from} ~ ${to} · ${defectTrendData?.isMultiDay ? '검색 기간 전체 일자별 불량률 추이 및 상세 집계' : '2시간 간격 · 시간대별 불량률 추이 및 상세 집계'}`}
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
            {/* 하나의 막대 그래프로 표기 */}
            <BarChart
              data={defectTrendData?.barData || []}
              target={defectTrendData?.target || 3.0}
              unit="%"
              height={180}
            />

            {/* 검색한 모든 날짜의 정보를 표에 다 나타냄 */}
            <View style={{ marginTop: 16 }}>
              <Table
                minWidth={600}
                columns={[
                  { key: 'period', title: defectTrendData?.isMultiDay ? '일자' : '시간대', width: 130, mono: true },
                  {
                    key: 'inputQty',
                    title: '투입/생산량 (EA)',
                    flex: 1,
                    align: 'right',
                    render: (r) => <Text style={[s.td, s.num, { fontWeight: '500' }]}>{comma(r.inputQty || r.totalQty)}</Text>,
                  },
                  {
                    key: 'okQty',
                    title: '양품 수량 (EA)',
                    flex: 1,
                    align: 'right',
                    render: (r) => <Text style={[s.td, s.num]}>{comma(r.okQty ?? Math.max(0, (r.inputQty || 0) - (r.ngQty || 0)))}</Text>,
                  },
                  {
                    key: 'ngQty',
                    title: '불량 수량 (EA)',
                    width: 120,
                    align: 'right',
                    render: (r) => (
                      <Text style={[s.td, s.num, { color: (r.ngQty || 0) > 0 ? '#ef4444' : undefined }]}>
                        {comma(r.ngQty || 0)}
                      </Text>
                    ),
                  },
                  {
                    key: 'defectRate',
                    title: '불량률 (%)',
                    width: 110,
                    align: 'right',
                    render: (r) => (
                      <Text style={[s.td, s.num, { fontWeight: '700', color: Number(r.defectRate) > 3.0 ? '#ef4444' : '#16a34a' }]}>
                        {fixed(r.defectRate)}%
                      </Text>
                    ),
                  },
                  {
                    key: 'yield',
                    title: '수율 (%)',
                    width: 100,
                    align: 'right',
                    render: (r) => (
                      <Text style={[s.td, s.num]}>
                        {fixed(r.yield != null ? r.yield : (100 - (Number(r.defectRate) || 0)))}%
                      </Text>
                    ),
                  },
                  {
                    key: 'status',
                    title: '상태',
                    width: 80,
                    render: (r) => (
                      <View style={{
                        paddingVertical: 2,
                        paddingHorizontal: 8,
                        borderRadius: 4,
                        backgroundColor: Number(r.defectRate) > 3.0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                        alignSelf: 'flex-start',
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: Number(r.defectRate) > 3.0 ? '#ef4444' : '#16a34a',
                        }}>
                          {Number(r.defectRate) > 3.0 ? '주의' : '양호'}
                        </Text>
                      </View>
                    ),
                  },
                ]}
                rows={defectTrendData?.items || []}
              />
            </View>
            <SourceNote>목표 불량률 3.0% 기준 · 검색 기간 내 전체 일자의 생산 투입 및 품질 분석 내역입니다.</SourceNote>
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

          {/* 3. 라인별 생산량과 불량률 (하나의 표로 구성하고 하나의 행으로 레이아웃 구성) */}
          <Card
            title="라인별 생산량 및 불량률"
            sub={`프레스 10대 및 주요 설비 · ${from} ~ ${to} · 설비별 생산 실적 및 품질 현황`}
            nativeID="chart-card-line-table"
            tight
            right={
              <Button
                label="표 이미지 저장"
                size="sm"
                variant="outline"
                icon="download"
                onPress={() =>
                  saveChartAsPng({
                    containerId: 'chart-card-line-table',
                    fileName: '라인별_생산량_및_불량률',
                    title: '라인별 생산량 및 불량률',
                    sub: `${from} ~ ${to}`,
                    isDark: theme.isDark,
                  })
                }
              />
            }
          >
            <Table
              minWidth={680}
              onRowPress={(row) => showEquipment(row.eqptCd)}
              keyExtractor={(row) => `${row.eqptCd}·${row.processId ?? ''}`}
              columns={[
                {
                  key: 'eqptCd',
                  title: '설비 (코드/명칭)',
                  width: 160,
                  mono: true,
                  render: (r) => (
                    <View>
                      <Text style={[s.td, s.mono, { fontWeight: '600' }]}>{r.eqptCd}</Text>
                      {r.eqptNm ? <Text style={[s.textXs, { color: theme.color.muted }]}>{r.eqptNm}</Text> : null}
                    </View>
                  ),
                },
                { key: 'model', title: '모델', width: 120, render: (r) => <Text style={s.td}>{r.model || '—'}</Text> },
                {
                  key: 'qty',
                  title: '생산량 (EA)',
                  width: 120,
                  align: 'right',
                  render: (r) => <BlindValue field="qty" value={comma(r.qty)} textStyle={[s.td, s.num, { fontWeight: '600' }]} />,
                },
                {
                  key: 'okQty',
                  title: '양품 수량 (EA)',
                  width: 120,
                  align: 'right',
                  render: (r) => <Text style={[s.td, s.num]}>{comma(r.okQty ?? Math.max(0, (r.qty || 0) - (r.ngQty || 0)))}</Text>,
                },
                {
                  key: 'ngQty',
                  title: '불량 수량 (EA)',
                  width: 110,
                  align: 'right',
                  render: (r) => (
                    <Text style={[s.td, s.num, { color: (r.ngQty || 0) > 0 ? '#ef4444' : undefined }]}>
                      {comma(r.ngQty || 0)}
                    </Text>
                  ),
                },
                {
                  key: 'defectRate',
                  title: '불량률 (%)',
                  width: 100,
                  align: 'right',
                  render: (r) => (
                    <BlindValue
                      field="yield"
                      value={`${fixed(r.defectRate)}%`}
                      textStyle={[s.td, s.num, { fontWeight: '700', color: Number(r.defectRate) > 3.0 ? '#ef4444' : '#16a34a' }]}
                    />
                  ),
                },
                {
                  key: 'uptimeRate',
                  title: '가동률',
                  width: 110,
                  render: (r) => (
                    r.uptimeRate != null ? (
                      <View style={{ width: '100%' }}>
                        <ProgressBar percent={r.uptimeRate} tone={r.uptimeRate > 85 ? 'ok' : r.uptimeRate > 75 ? 'warn' : 'bad'} />
                        <Text style={[s.textXs, s.num, { marginTop: 3 }]}>{r.uptimeRate}%</Text>
                      </View>
                    ) : <Text style={[s.td, { color: theme.color.muted }]}>—</Text>
                  ),
                },
                { key: 'state', title: '상태', width: 80, render: (r) => <StateBadge state={r.state || (Number(r.defectRate) > 3.0 ? 'WARNING' : 'RUNNING')} /> },
              ]}
              rows={displayLines}
            />
            {linesMeta ? <Pagination meta={linesMeta} {...(paging?.bind || {})} /> : null}
            <SourceNote>목표 불량률 3.0% 이하 관리 · 설비 행 클릭 시 상세 모니터링 모달이 열립니다.</SourceNote>
          </Card>

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
