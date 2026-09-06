import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, DateField, Filters, FormAlert, Loading, SelectChip, SelectField, SourceNote, TabulatorGrid, TextField } from '@shared/components/ui';
import { BarChart, HBarChart, LineChart } from '@shared/components/charts-d3';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { openProductPicker } from './ProductPicker';
import { metricText, missingQuantity, numeric, processInsights } from '../model/processPeriodModel';

const UNITS = ['일별', '주별', '월별', '기간선택'];
const EMPTY = [];
const numberText = (value) => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export default function ProcessDashboardView({ filters, applied, edit, setUnit, reset, inspectProcess, exportExcel, search, loading, error, data, processes, masterError }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);
  const showQty = canData('qty');
  const showYield = canData('yield');
  const [detailFilter, setDetailFilter] = useState('all');
  const [query, setQuery] = useState('');
  const products = data?.products || EMPTY;
  const comparison = data?.processes || EMPTY;
  const periods = data?.periods || EMPTY;
  const summary = data?.summary || {};
  const insights = useMemo(() => processInsights(data), [data]);
  const largest = insights.byDefects[0];
  const worstProcess = insights.byRate[0];
  const selectedProcess = processes.find((p) => p.id === applied.processId);
  const processName = selectedProcess?.name || (applied.processId ? '선택 공정' : '전체 공정');
  const dirty = JSON.stringify(filters) !== JSON.stringify(applied);
  const noProduction = summary.qty === 0;
  const periodLabel = (period) => applied.unit === '월별' ? period.slice(0, 7) : period.slice(5);
  const detail = (filter = 'all', code = '') => {
    setDetailFilter(filter);
    setQuery(code);
    if (typeof document !== 'undefined') document.getElementById('process-product-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const allowed = (key) => key.endsWith('Rate') ? showYield : showQty;
  const metricColumns = useMemo(() => ['qty', 'okQty', 'ngQty', 'defectRate', 'yieldRate'].map((key, index) => ({
    title: ['투입 (EA)', '양품 (EA)', '불량 (EA)', '불량률 (%)', '수율 (%)'][index],
    field: key, minWidth: 145, hozAlign: 'right', sorter: 'number',
    formatter: (cell) => metricText(cell.getRow().getData(), key, key.endsWith('Rate') ? showYield : showQty),
  })), [showQty, showYield]);
  const columns = useMemo(() => [
    { title: '제품', field: 'code', width: 140, formatter: 'plaintext', headerFilter: 'input' },
    { title: '제품명', field: 'productNm', minWidth: 210, formatter: 'plaintext', headerFilter: 'input' },
    ...metricColumns,
  ], [metricColumns]);
  const processColumns = useMemo(() => [
    { title: '공정', field: 'process', minWidth: 240, formatter: 'plaintext', headerFilter: 'input' },
    ...metricColumns,
  ], [metricColumns]);
  const maskRows = (rows) => rows.map((p) => ({ ...p,
    ...Object.fromEntries(['qty', 'okQty', 'ngQty', 'defectRate', 'yieldRate'].map((key) => [key, allowed(key) ? p[key] : null])),
  }));
  const detailRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const rows = products.filter((p) => (detailFilter !== 'defect' || !showQty || p.ngQty > 0)
      && (detailFilter !== 'missing' || !showQty || missingQuantity(p))
      && (!keyword || `${p.code || ''} ${p.productNm || ''}`.toLowerCase().includes(keyword)));
    return rows.map((p) => ({ ...p, code: p.code || '제품 코드 미등록', productNm: p.productNm || '제품명 미등록',
      ...Object.fromEntries(['qty', 'okQty', 'ngQty', 'defectRate', 'yieldRate'].map((key) => [key, (key.endsWith('Rate') ? showYield : showQty) ? p[key] : null])),
    }));
  }, [products, query, detailFilter, showQty, showYield]);
  const share = largest && summary.ngQty > 0 ? largest.ngQty / summary.ngQty * 100 : null;
  const missingCount = insights.incompleteProducts.length;
  const topProducts = insights.byDefects.slice(0, 8);
  const chartMessage = (key) => !allowed(key) ? '조회 권한이 없어 이 지표를 볼 수 없습니다.'
    : noProduction ? '선택한 기간에 생산 실적이 없습니다.' : '집계에 필요한 자료가 부족합니다. 실적 등록 상태를 확인해 주세요.';

  return <View style={{ width: '100%' }}>
    <PageHead title="공정 및 제품 대시보드" desc="생산 현황과 불량이 집중된 곳을 확인하고, 우선 점검할 제품·공정을 찾아보세요."
      actions={<><Button label="엑셀 다운로드" icon="download" size="sm" disabled={loading || !!error || !products.length} onPress={exportExcel} /><Button label="기본값 복원" icon="refresh" size="sm" onPress={reset} /></>} />
    <Filters>
      <SelectField label="집계 단위" value={filters.unit} options={UNITS} onChange={setUnit} />
      <DateField label="시작일" value={filters.from} onChange={(from) => edit({ from })} />
      <DateField label="종료일" value={filters.to} onChange={(to) => edit({ to })} />
      <View><Text style={s.fieldLabel}>제품</Text><Button icon="search" label={filters.models.length ? `제품 선택 (${filters.models.length}개)` : '제품 선택 (전체)'}
        onPress={() => openProductPicker({ selected: filters.models, onApply: (models) => edit({ models }) })} /></View>
      <SelectField label="공정" value={filters.processId} options={[{ value: '', label: '전체 공정' }, ...processes.map((p) => ({ value: p.id, label: p.name || p.id }))]} onChange={(processId) => edit({ processId })} />
      <Button label="조회" icon="search" variant="primary" onPress={search} />
    </Filters>
    {filters.models.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {filters.models.slice(0, 8).map((code) => <SelectChip key={code} label={`${code} ×`} small on onPress={() => edit({ models: filters.models.filter((p) => p !== code) })} />)}
      {filters.models.length > 8 && <Text style={s.textSm}>외 {filters.models.length - 8}개</Text>}
      <Button label="전체 제품 선택" size="sm" onPress={() => edit({ models: [] })} />
    </View>}
    {dirty && <FormAlert tone="info">조회 조건이 변경되었습니다. 조회 버튼을 누르면 새 조건으로 집계합니다.</FormAlert>}
    {masterError && <FormAlert tone="error">공정 목록을 불러오지 못했습니다. 화면을 새로고침해 주세요.</FormAlert>}
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      <Badge tone="blue">기간 누계</Badge>
      <Text style={s.textSm}>{applied.from} ~ {applied.to}</Text>
      <Text style={s.textXs}>{applied.unit} · {processName} · {applied.models.length ? `${applied.models.length}개 제품` : '전체 제품'}</Text>
    </View>
    {loading ? <Loading text="생산 실적과 우선 확인할 항목을 집계하고 있습니다…" /> : error ?
      <Card title="실적을 불러오지 못했습니다"><FormAlert tone="error">조회 요청을 처리하지 못했습니다. 조회 조건과 연결 상태를 확인한 뒤 다시 시도해 주세요.</FormAlert><Gap /><Button label="다시 조회" onPress={search} /></Card>
      : data ? <>
        {noProduction && <><FormAlert tone="info">이 기간에는 선택한 제품·공정의 생산 실적이 없습니다. 기간이나 조회 대상을 바꿔 주세요.</FormAlert><Gap /></>}
        <Grid cols={4}>
          <Metric label="얼마나 생산했나요?" name="생산 투입량" row={summary} metric="qty" allowed={showQty} unit="EA" note="여러 공정을 거친 수량의 누계" />
          <Metric label="양품은 얼마나 되나요?" name="양품 수량" row={summary} metric="okQty" allowed={showQty} unit="EA" note="양품으로 집계된 수량" />
          <Metric label="불량은 얼마나 나왔나요?" name="불량 수량" row={summary} metric="ngQty" allowed={showQty} unit="EA" note={showQty ? `불량 발생 제품 ${insights.byDefects.length}종` : '불량 수량 조회 권한이 필요합니다'} accent />
          <Metric label="품질 수준은 어떤가요?" name="수율" row={summary} metric="yieldRate" allowed={showYield} unit="%" note={showYield && numeric(summary.defectRate) ? `불량률 ${numberText(summary.defectRate)}%` : '양품 수량을 투입 수량으로 나눈 비율'} />
        </Grid><Gap size={20} />

        <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={[s.textSm, { fontSize: 18, fontWeight: '700' }]}>먼저 확인해 주세요</Text>
          <Text style={s.textXs}>조회 기간의 실제 실적에서 찾은 확인 항목</Text>
        </View>
        <Grid cols={3}>
          <Issue eyebrow="01 · 불량 수량 집중" title={showQty && largest ? largest.code : showQty ? '집계된 불량 제품 없음' : '조회 권한 필요'}
            body={showQty && largest ? `${numberText(largest.ngQty)} EA의 불량이 발생했습니다.${share == null ? '' : ` 전체 불량의 ${numberText(share)}%입니다.`}` : showQty ? (noProduction ? '생산 실적이 있는 기간을 선택해 주세요.' : '수량이 집계된 제품에서 불량이 확인되지 않았습니다.') : '불량 수량을 볼 수 있는 권한이 필요합니다.'}
            hint="해당 제품의 작업·검사 기록을 먼저 확인해 보세요." action={showQty && largest ? <Button label="이 제품 상세 보기" size="sm" onPress={() => detail('all', largest.code)} /> : null} />
          <Issue eyebrow="02 · 공정 품질 확인" title={showQty && showYield && worstProcess ? worstProcess.process : '공정 품질 확인'}
            body={showQty && showYield && worstProcess ? `전체 비교 공정 중 불량률이 가장 높습니다. 불량률 ${numberText(worstProcess.defectRate)}% · 투입 ${numberText(worstProcess.qty)} EA.` : !showQty || !showYield ? '공정의 수량·품질 조회 권한이 필요합니다.' : '비교할 수 있는 공정 실적이 없습니다.'}
            hint="같은 기간·제품의 전체 공정을 비교합니다. 수량과 함께 판단해 주세요."
            action={showQty && showYield && worstProcess ? <Button label="이 공정 조회" size="sm" onPress={() => inspectProcess(worstProcess.processId)} /> : null} />
          <Issue eyebrow="03 · 집계 상태 확인" title={showQty ? (missingCount ? `제품 ${missingCount}종 집계 확인 필요` : '제품 수량 집계 확인됨') : '조회 권한 필요'}
            body={showQty ? (missingCount ? '투입·양품·불량 중 아직 집계되지 않은 수량이 있습니다. 실적 등록 상태를 확인해 주세요.' : products.length ? '현재 제품 상세의 투입·양품·불량 수량이 모두 집계되어 있습니다.' : '선택한 조건에 제품별 실적이 없습니다.') : '수량 조회 권한이 없어 집계 상태를 확인할 수 없습니다.'}
            hint={showQty && insights.incompleteProcesses.length ? `전체 비교 공정 중 ${insights.incompleteProcesses.length}곳에도 미집계 수량이 있습니다.` : '미집계 수량은 0개나 불량 없음으로 판단하지 않습니다.'}
            action={showQty && missingCount ? <Button label="미집계 제품 확인" size="sm" onPress={() => detail('missing')} /> : null} muted />
        </Grid><Gap size={20} />

        <Grid cols={2}>
          <Card title="생산량은 어떻게 변했나요?" sub={`${applied.unit} 투입량 · 단위: 만 EA`}>
            {showQty && periods.some((p) => numeric(p.qty) && p.qty > 0) ? <BarChart data={periods.map((p) => ({ l: periodLabel(p.period), v: numeric(p.qty) ? p.qty / 10000 : null }))} height={220} unit="만 EA" /> : <ChartMessage text={chartMessage('qty')} />}
            {showQty && periods.some((p) => !numeric(p.qty)) && <SourceNote>수량이 아직 집계되지 않은 구간은 막대를 표시하지 않습니다.</SourceNote>}
          </Card>
          <Card title="불량률은 어떻게 변했나요?" sub={`${applied.unit} 불량률 · 단위: %`}>
            {showYield && periods.some((p) => numeric(p.defectRate)) ? <LineChart labels={periods.map((p) => periodLabel(p.period))} series={[{ name: '불량률', data: periods.map((p) => p.defectRate ?? null) }]} unit="%" min={0} height={220} /> : <ChartMessage text={chartMessage('defectRate')} />}
            <SourceNote>생산이 없거나 산출 자료가 부족한 구간은 선을 연결하지 않습니다. 첫·마지막 구간은 선택한 날짜까지만 집계합니다.</SourceNote>
          </Card>
        </Grid><Gap />
        <Grid cols={2}>
          <Card title="불량이 많이 발생한 제품" sub="불량 수량 상위 8종 · 제품별 상세에서 전체 확인">
            {showQty && topProducts.length ? <HBarChart data={topProducts.map((p) => ({ l: p.code, v: p.ngQty, cls: 'bad' }))} unit=" EA" labelWidth={120} /> : <ChartMessage text={!showQty ? '조회 권한이 없어 불량 수량을 볼 수 없습니다.' : '집계된 제품 불량이 없습니다.'} />}
          </Card>
          <Card title="불량률이 높은 공정" sub="같은 기간·제품의 전체 공정 중 상위 8곳">
            {showQty && showYield && insights.byRate.length ? <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}><View style={{ minWidth: 510, flex: 1 }}><HBarChart data={insights.byRate.slice(0, 8).map((p) => ({ l: p.process || '공정명 미등록', v: p.defectRate }))} unit="%" format={numberText} labelWidth={230} /></View></ScrollView> : <ChartMessage text={!showQty || !showYield ? '공정의 수량·품질 조회 권한이 필요합니다.' : '비교할 수 있는 공정 실적이 없습니다.'} />}
          </Card>
        </Grid><Gap size={20} />
        <Card title="공정별로 비교해 보세요" sub="같은 기간·제품의 전체 공정 · 선택한 공정과 무관하게 비교 대상을 유지합니다">
          <TabulatorGrid columns={processColumns} rows={maskRows(comparison).map((p) => ({ ...p, process: p.process || '공정명 미등록' }))} height={360} emptyText="비교할 공정 실적이 없습니다." />
          <SourceNote>수량 미집계: 실적에 필요한 수량이 아직 모이지 않았습니다. 산출 자료 부족: 비율을 계산할 수량이 부족합니다.</SourceNote>
        </Card><Gap />
        <View nativeID="process-product-detail" style={{ scrollMarginTop: 70 }}>
          <Card title="제품별 상세 실적" sub={`${processName} · 제품 ${products.length}종 · 열 제목으로 정렬할 수 있습니다`}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <SelectChip label="전체 제품" small on={detailFilter === 'all'} onPress={() => setDetailFilter('all')} />
              {showQty && <><SelectChip label={`불량 발생 ${insights.byDefects.length}종`} small on={detailFilter === 'defect'} onPress={() => setDetailFilter('defect')} />
                <SelectChip label={`집계 확인 ${missingCount}종`} small on={detailFilter === 'missing'} onPress={() => setDetailFilter('missing')} /></>}
              {/* TextField 는 onChangeText 로 글자를 줍니다. onChange 로 받으면 이벤트 객체가 들어와
                  아래 query.trim() 에서 화면이 통째로 죽습니다 — 한 글자만 쳐도 터집니다 */}
              <TextField label="제품 찾기" value={query} onChangeText={setQuery} placeholder="제품 코드 또는 제품명" />
              {(query || detailFilter !== 'all') && <Button label="상세 필터 해제" size="sm" onPress={() => { setQuery(''); setDetailFilter('all'); }} />}
            </View>
            <TabulatorGrid columns={columns} rows={detailRows} height={440} emptyText="현재 조건에 해당하는 제품이 없습니다. 상세 필터를 해제하거나 조회 대상을 바꿔 주세요." />
            <SourceNote>제품 정보가 연결되지 않은 실적과 미집계 수량이 있으면 제품별 합과 전체 합이 다를 수 있습니다. 전체 합계는 상단 요약을 확인해 주세요.</SourceNote>
          </Card>
        </View>
      </> : null}
  </View>;
}

function Metric({ label, name, row, metric, allowed, unit, note, accent }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const measured = allowed && numeric(row[metric]);
  return <View style={[s.card, { padding: 18, minHeight: 150, borderTopWidth: 3, borderTopColor: accent ? '#d97706' : theme.color.primary }]}>
    <Text style={s.textXs}>{label}</Text>
    <Text style={[s.textSm, { fontWeight: '600', marginTop: 7 }]}>{name}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 10 }}>
      <Text style={[s.textSm, { fontSize: measured ? 27 : 19, fontWeight: '700', color: accent && measured ? (theme.isDark ? '#fbbf24' : '#b45309') : theme.color.foreground }]}>{metricText(row, metric, allowed)}</Text>
      {measured && <Text style={s.textXs}>{unit}</Text>}
    </View>
    <Text style={[s.textXs, { marginTop: 9 }]}>{note}</Text>
  </View>;
}
function Issue({ eyebrow, title, body, hint, action, muted }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return <View style={[s.card, { flex: 1, padding: 18, backgroundColor: muted ? theme.color.card : theme.isDark ? '#241e14' : '#fffaf0' }]}>
    <Text style={[s.textXs, { fontWeight: '700', color: muted ? theme.color.mutedForeground : theme.isDark ? '#fbbf24' : '#92400e' }]}>{eyebrow}</Text>
    <Text style={[s.textSm, { fontWeight: '700', fontSize: 18, marginTop: 12 }]}>{title}</Text>
    <Text style={[s.textSm, { lineHeight: 22, marginTop: 10 }]}>{body}</Text>
    <Text style={[s.textXs, { lineHeight: 19, marginTop: 10, marginBottom: 14 }]}>{hint}</Text>
    {action && <View style={{ marginTop: 'auto', alignItems: 'flex-start' }}>{action}</View>}
  </View>;
}
function ChartMessage({ text }) {
  const s = useCommonStyles();
  return <View style={{ minHeight: 200, justifyContent: 'center', alignItems: 'center', padding: 20 }}><Text style={[s.textSm, { textAlign: 'center', lineHeight: 22 }]}>{text}</Text></View>;
}
