/**
 * [View] DB-02 공정 및 제품 대시보드 (경로: /dashboard/process)
 *
 * 공정과 제품을 골라 그 조합의 실적·품질·설비 상태를 한 화면에서 확인합니다.
 * 선택 상태와 재계산은 Controller 가, 그리기는 이 파일이 맡습니다.
 * 사용 API 12건 — /api/v1/dashboard/process/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import { BarChart, DonutChart, DotPlot, HBarChart, HeatMap, LineChart } from '@shared/components/charts-d3';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, FormAlert, Loading, SelectChip, SourceNote, StatCard, XlsTable } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { saveChartAsPng } from '@shared/utils/exportUtil';
import { comma, fixed, rate } from '@shared/utils/formatUtil';
import { LEVEL_LABEL, TOP_N_OPTIONS, yieldLevel, targetDefectRate, uptimeLevel } from '../model/dashboardModel';
import { openProductPicker } from './ProductPicker';
import ProcessYieldView from './components/ProcessYieldView';

export default function ProcessDashboardView({
  loading, processes, products, proc, processId, models, topN, recentModels, target, summary,
  loadError, noProduction, baseDate, rows, trend, production, composition, productYield, productUptime, processCompare, heatmap, processYield,
  changeProcess, pickTopN, removeModel, applyModels, addModel, resetSelection, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);

  if (loading) return <Loading />;

  const riskCnt = rows.filter((r) => yieldLevel(r.yieldRate, target) === 'bad').length;
  const warnCnt = rows.filter((r) => yieldLevel(r.yieldRate, target) === 'warn').length;
  /** 표 셀은 문자열만 받으므로 마스킹을 문자열로 처리합니다 */
  const mask = (field, value) => (useAuthStore.getState().canData(field) ? value : '비공개');

  return (
    <View>
      <PageHead
        title="공정 및 제품 대시보드"
        desc="공정과 제품을 골라 그 조합의 실적·품질·설비 상태를 한 화면에서 확인합니다. 기본값은 기준일에 실적이 가장 많은 공정과 그 공정이 만든 제품이며, 아래에서 선택을 바꾸면 모든 카드가 다시 계산됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="기본값 복원" size="sm" icon="refresh" onPress={resetSelection} />
          </>
        }
      />

      {loadError ? (
        <View style={{ marginBottom: 14 }}>
          <FormAlert tone="error">
            {loadError.code === 'E-NOTFOUND'
              ? `선택한 공정으로는 조회할 수 없습니다 — ${loadError.message} 공정을 다시 선택하거나 「기본값 복원」을 눌러 주세요.`
              : loadError.message}
          </FormAlert>
        </View>
      ) : null}

      {noProduction ? (
        <View style={{ marginBottom: 14 }}>
          <FormAlert tone="info">
            {`${proc?.name || '선택한 공정'} 은(는) ${baseDate} 에 생산 실적이 없습니다. `}
            공정을 바꾸거나 조회 기준일을 그 공정의 마지막 실적일로 옮겨 주세요.
          </FormAlert>
        </View>
      ) : null}

      {/* 조회 대상 선택 */}
      <Card title="조회 대상 선택" sub="공정 1개 · 제품 1개 이상">
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 12 }}>
          <Text style={[s.fieldLabel, { width: 64, fontWeight: '600' }]}>공정</Text>
          {processes.map((p) => (
            <SelectChip
              key={p.id}
              label={p.name}
              sub={p.capacity}
              on={p.id === processId}
              onPress={() => changeProcess(p.id)}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 12 }}>
          <Text style={[s.fieldLabel, { width: 64, fontWeight: '600' }]}>주력 제품</Text>
          {TOP_N_OPTIONS.map((n) => (
            <SelectChip key={n} label={`Top ${n}`} small on={topN === n} onPress={() => pickTopN(n)} />
          ))}
          <SelectChip label={`전체 ${products.length}종`} small on={topN === 'all'} onPress={() => pickTopN('all')} />
          <Text style={s.textXs}>{`매출 순위 기준 · 전체 ${products.length}종 중 ${models.length}종 선택`}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Text style={[s.fieldLabel, { width: 64, fontWeight: '600', paddingTop: 7 }]}>제품</Text>
          <View style={{ flex: 1, minWidth: 300, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <Button
              label={`제품 검색·선택 ${models.length}`}
              size="sm"
              variant="primary"
              icon="search"
              onPress={() => openProductPicker({ selected: models, onApply: applyModels })}
            />
            {models.slice(0, 10).map((code) => {
              const pd = products.find((p) => p.code === code);
              return (
                <SelectChip
                  key={code}
                  label={code}
                  sub={`#${pd?.rank ?? '-'}`}
                  small
                  on
                  onPress={() => removeModel(code)}
                />
              );
            })}
            {models.length > 10 ? (
              <SelectChip
                label={`+${models.length - 10}종 더`}
                small
                onPress={() => openProductPicker({ selected: models, onApply: applyModels })}
              />
            ) : null}
          </View>
        </View>

        {recentModels.length ? (
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginTop: 10 }}>
            <Text style={[s.fieldLabel, { width: 64, fontWeight: '600' }]}>최근 조회</Text>
            <View style={{ flex: 1, minWidth: 260, flexDirection: 'row', flexWrap: 'wrap' }}>
              {recentModels.map((code) => (
                <SelectChip
                  key={code}
                  label={code}
                  small
                  onPress={() => addModel(code)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <SourceNote>
          {can('sys-rank') ? '주력 순위 기준은 시스템관리 > 제품군 순위 관리에서 조정합니다. ' : ''}
          제품이 {products.length}종이라 목록 대신 검색으로 고릅니다. 선택된 칩을 누르면 바로 제외됩니다.
        </SourceNote>
      </Card>
      <Gap />

      {/* 요약 지표 */}
      <Grid cols={4}>
        <StatCard label="생산량" field="qty" value={comma(summary.qty)} unit="EA" sub={`양품 ${comma(summary.okQty)} EA`} />
        <StatCard
          label="공정 불량률"
          field="yield"
          value={rate(summary.defectRate)}
          unit="%"
          sub={`불량 ${comma(summary.ngQty)} EA`}
          tone={summary.defectRate > 3 ? 'down' : 'up'}
        />
        <StatCard
          label="수율"
          field="yield"
          value={rate(summary.yieldRate)}
          unit="%"
          sub={`목표 ${target}% ${summary.yieldRate >= target ? '달성' : '미달'}`}
          tone={summary.yieldRate >= target ? 'up' : 'down'}
        />
        <StatCard label="평균 가동률" value={rate(summary.avgUptime)} unit="%" sub={`대상 제품 ${summary.productCnt}종 평균`} />
      </Grid>
      <Gap />

      <Grid cols={3}>
        <Card title="시간대별 불량률 추이" sub={`${proc?.name} · 2시간 간격`}>
          <LineChart labels={trend?.labels} series={trend?.series} target={trend?.target} unit="%" min={0} max={6} height={186} />
          <SourceNote>{`목표선은 목표 수율 ${target}% 를 불량률로 환산한 값입니다.`}</SourceNote>
        </Card>

        <Card title="제품별 생산량 · 불량률" sub="선택 제품 기준">
          <BarChart data={(production?.items || []).map((x) => ({ l: x.product, v: x.qty }))} height={112} />
          <LineChart
            labels={(production?.items || []).map((x) => x.product)}
            series={[{ name: '불량률 (%)', data: (production?.items || []).map((x) => x.defectRate) }]}
            target={targetDefectRate(target)}
            unit="%"
            min={0}
            max={7}
            height={96}
            showLegend={false}
          />
        </Card>

        <Card title="불량 유형 구성" sub={`${proc?.name} · 금일 누계`}>
          <DonutChart segs={(composition?.segments || []).map((x) => ({ l: x.label, v: x.value }))} height={186} unitLabel="EA" />
          <SourceNote>AOI 판정 로그 자동 집계</SourceNote>
        </Card>
      </Grid>
      <Gap />

      <Grid cols={3}>
        <Card title="제품별 수율" sub={`목표 ${target}% · 목표 대비 편차`}>
          <DotPlot
            unit="%"
            min={92}
            max={100}
            target={target}
            data={(productYield?.items || []).map((x) => ({ l: x.product, v: x.yieldRate, cls: x.level }))}
          />
        </Card>

        <Card title="제품별 가동률" sub="설비 점유 기준">
          <HBarChart
            unit="%"
            format={(v) => v.toFixed(0)}
            data={(productUptime?.items || []).map((x) => ({
              l: x.product,
              v: x.uptimeRate,
              cls: uptimeLevel(x.uptimeRate) === 'ok' ? '' : uptimeLevel(x.uptimeRate),
            }))}
          />
        </Card>

        <Card title="공정 비교" sub="같은 제품 구성 기준 · 공정별 불량률">
          <HBarChart
            unit="%"
            format={(v) => v.toFixed(1)}
            data={(processCompare?.items || []).map((x) => ({
              l: x.process.replace(' 공정', ''),
              v: x.defectRate,
              cls: x.process === processId ? '' : x.defectRate > 3.2 ? 'bad' : '',
            }))}
          />
          <SourceNote>현재 선택한 제품 구성으로 네 공정을 비교합니다.</SourceNote>
        </Card>
      </Grid>
      <Gap />

      {/* 공정별 수율 (전체 공정 정밀 수율 분석) */}
      <Card
        title="공정별 수율"
        sub={`목표 ${processYield?.target ?? target ?? 97}% · 목표 대비 편차 및 공정별 수율 정밀 분석`}
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
                sub: `목표 ${processYield?.target ?? target ?? 97}%`,
                isDark: theme.isDark,
              })
            }
          />
        }
      >
        <ProcessYieldView processYield={processYield} />
        <SourceNote>{processYield?.note || '양품 수량 ÷ (양품 + 불량) 기준. 재작업 투입분은 제외합니다.'}</SourceNote>
      </Card>
      <Gap />

      <Card title="설비별 시간대 가동률" sub={`${proc?.name} · 2시간 구간 · 값이 낮을수록 진하게 표시`}>
        <HeatMap
          rows={heatmap?.rows || []}
          cols={heatmap?.cols || []}
          data={heatmap?.data || []}
          lo={40}
          hi={100}
          unit="%"
          invert
        />
        <SourceNote>진한 칸일수록 가동률이 낮은 구간입니다.</SourceNote>
      </Card>
      <Gap />

      <Card
        title="제품별 상세"
        sub={`${proc?.name} · ${rows.length}종`}
        tight
        right={
          <>
            <Badge tone="red">{`위험 ${riskCnt}`}</Badge>
            <Badge tone="amber">{`주의 ${warnCnt}`}</Badge>
          </>
        }
      >
        <XlsTable
          maxHeight={520}
          columns={[
            { key: 'rank', title: '순위', width: 54 },
            { key: 'code', title: '제품', width: 100, align: 'left' },
            { key: 'customer', title: '고객사', width: 130, align: 'left' },
            { key: 'project', title: '프로젝트', width: 90 },
            { key: 'qty', title: '투입', width: 100 },
            { key: 'okQty', title: '양품', width: 100 },
            { key: 'ngQty', title: '불량', width: 88 },
            { key: 'defectRate', title: '불량률', width: 80 },
            { key: 'yieldRate', title: '수율', width: 80 },
            { key: 'uptimeRate', title: '가동률', width: 80 },
            { key: 'level', title: '판정', width: 72 },
          ]}
          rows={[
            ...rows.map((r) => {
              const lv = yieldLevel(r.yieldRate, target);
              return {
                key: r.code,
                cells: [
                  { v: `#${r.rank}`, num: true },
                  { v: r.code, align: 'left', bold: true },
                  { v: mask('customer', r.customer), align: 'left' },
                  { v: r.project },
                  { v: mask('qty', comma(r.qty)), num: true },
                  { v: mask('qty', comma(r.okQty)), num: true },
                  { v: mask('qty', comma(r.ngQty)), num: true },
                  { v: mask('yield', `${fixed(r.defectRate)}%`), num: true, tone: lv === 'ok' ? undefined : lv },
                  { v: mask('yield', `${fixed(r.yieldRate)}%`), num: true },
                  { v: `${r.uptimeRate}%`, num: true, tone: uptimeLevel(r.uptimeRate) === 'ok' ? undefined : uptimeLevel(r.uptimeRate) },
                  { v: LEVEL_LABEL[lv], tone: lv },
                ],
              };
            }),
            {
              key: '__total',
              tone: 'total',
              cells: [
                { v: `합계 · ${proc?.name}`, align: 'left', span: 4 },
                { v: mask('qty', comma(summary.qty)), num: true },
                { v: mask('qty', comma(summary.okQty)), num: true },
                { v: mask('qty', comma(summary.ngQty)), num: true },
                { v: mask('yield', `${fixed(summary.defectRate)}%`), num: true },
                { v: mask('yield', `${fixed(summary.yieldRate)}%`), num: true },
                { v: `${fixed(summary.avgUptime, 0)}%`, num: true },
                { v: '' },
              ],
            },
          ]}
        />
      </Card>
    </View>
  );
}

