/**
 * [View] RP-04 제품별 수율 (경로: /report/yield-by-model)
 *
 * Loss 세부 유형(11종)과 관리 항목(3종)까지 한 표에서 확인합니다.
 * 사용 API 1건 — /api/v1/reports/yield-by-model
 */
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import ReportDoc from '@shared/components/layout/ReportDoc';
import { Button, Card, EmptyState, Filters, Loading, Pagination, ProgressBar, SelectField, StatCard, Table, XlsTable } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { lastDataDate, yearMonthOptions } from '@shared/stores/useAppStore';
import { useCommonStyles } from '@shared/theme/styles';
import { downloadCsv, downloadXls, printDocument } from '@shared/utils/exportUtil';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

const NODE_ID = 'rpt-yield-model-doc';

/** 수율 색 규칙 — 99% 이상 정상 / 98~99% 주의 / 98% 미만 위험 */
function yieldTone(value) {
  const n = parseFloat(value);
  if (n >= 99) return 'ok';
  if (n >= 98) return 'warn';
  return 'bad';
}

export default function YieldByModelView({
  loading, data, role, reportName, filters, setYearMonth, setModelCd, setProcessId, search,
  paging, sizes, rowsMeta, fetchAllRows, printPending, requestPrint, clearPrintPending, modelOptions, processOptions,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);
  const toast = useUiStore((state) => state.toast);

  /** 인쇄 대기 — 전체 행이 도착하면 그때 인쇄합니다 (쪽만 인쇄되면 보고서가 아닙니다) */
  useEffect(() => {
    if (!printPending || loading || paging?.size !== 0) return;
    clearPrintPending();
    printDocument({ nodeId: NODE_ID, title: '제품별 수율', role });
  }, [printPending, loading, paging?.size, clearPrintPending, role]);

  if (loading) return <Loading />;
  // 조회 결과가 없어도 로딩 화면에 머무르지 않습니다 — 빈 상태로 알려 줍니다
  if (!data) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;

  const yearMonth = data.yearMonth || filters.yearMonth;
  const rows = data.rows || [];
  const sum = data.summary || {};
  const qty = (v) => (v === '-' || v === undefined || v === null ? '-' : canData('qty') ? v : '비공개');
  const yld = (v) => (canData('yield') ? v : '비공개');

  // Loss·관리 항목 열은 서버가 알려 준 목록을 그대로 씁니다 (화면에 고정하지 않습니다)
  const lossTypes = data.lossTypes || [];
  const mgmtTypes = data.mgmtTypes || [];

  /** 행 묶음에서 항목별 합계를 냅니다 */
  const sumBy = (list, field, types) => types.map((t) => list.reduce((acc, r) => acc + (Number(r?.[field]?.[t]) || 0), 0));

  // 합계는 전체 기준이어야 합니다. 서버가 주면 그대로 쓰고, 없으면 받아 온 행으로 냅니다
  const totalLoss = lossTypes.map((t, i) => Number(data.lossTotals?.[t] ?? sumBy(rows, 'loss', lossTypes)[i]) || 0);
  const totalMgmt = mgmtTypes.map((t, i) => Number(data.mgmtTotals?.[t] ?? sumBy(rows, 'mgmt', mgmtTypes)[i]) || 0);
  const lossTotal = totalLoss.reduce((a, b) => a + b, 0);

  // 불량 유형별 Loss 비중
  const lossMix = lossTypes
    .map((t, i) => ({ label: t, value: totalLoss[i], ratio: lossTotal ? (totalLoss[i] / lossTotal) * 100 : 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  /** 내려받기 표 — 넘겨받은 자료로 머리글과 행을 만듭니다 */
  const buildExport = (src) => {
    const lt = src?.lossTypes || lossTypes;
    const mt = src?.mgmtTypes || mgmtTypes;
    return {
      head: ['No', 'Date', 'Model', '투입 수량', '양품 수량', '불량 수량', '불량률', '수율', ...lt, ...mt],
      rows: (src?.rows || []).map((r, i) => [
        r.no ?? i + 1, r.date || yearMonth, r.model, r.inputQty, r.okQty, r.ngQty, r.defectRate, r.yield,
        ...lt.map((t) => r.loss?.[t] ?? 0),
        ...mt.map((t) => r.mgmt?.[t] ?? 0),
      ]),
    };
  };

  /** 화면은 한 쪽만 보여 주지만 내려받기는 전량이어야 합니다 */
  const exportAll = async (kind) => {
    let src = data;
    try {
      src = (await fetchAllRows?.()) || data;
    } catch {
      toast('전체를 불러오지 못해 현재 쪽만 내려받습니다');
    }
    const { head, rows: body } = buildExport(src);
    const ym = String(src?.yearMonth || data.yearMonth || lastDataDate().slice(0, 7));
    if (kind === 'csv') downloadCsv({ name: `제품별수율_${ym}`, head, rows: body });
    else downloadXls({ name: `제품별 수율 ${ym}`, head, rows: body });
  };

  return (
    <View>
      <PageHead
        title="제품별 수율"
        desc="MES 투입·양품 실적과 AOI 판정 로그를 모델별로 집계한 월간 수율 현황입니다. Loss 세부 유형까지 한 표에서 확인할 수 있습니다."
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => { if (requestPrint?.() !== false) printDocument({ nodeId: NODE_ID, title: '제품별 수율', role }); }} />
            <Button label="CSV" size="sm" icon="download" onPress={() => exportAll('csv')} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => exportAll('xls')} />
          </>
        }
      />

      <Filters>
        <SelectField label="기준 월" value={filters.yearMonth} options={yearMonthOptions()} onChange={setYearMonth} />
        <SelectField label="모델" value={filters.modelCd} options={modelOptions} onChange={setModelCd} />
        <SelectField label="공정" value={filters.processId} options={processOptions} onChange={setProcessId} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <ReportDoc nodeId={NODE_ID}>
        <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: theme.color.foreground, marginBottom: 16 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: theme.color.foreground }}>제품별 수율 현황</Text>
          <Text style={[s.textXs, { fontSize: 12.5, marginTop: 5 }]}>{`${yearMonth}  /  품질보증팀`}</Text>
        </View>

        <Grid cols={4}>
          <StatCard label="총 투입수량" field="qty" value={sum.inputQty ?? 0} unit="EA" sub={`${comma(rowsMeta?.total ?? rows.length)}개 행 집계`} />
          <StatCard label="총 양품수량" field="qty" value={sum.okQty ?? 0} unit="EA" sub="AOI 판정 양품" />
          <StatCard label="전체 수율" field="yield" value={sum.yield ?? '—'} unit="%" sub={sum.target ? `목표 ${sum.target}%` : '목표 미설정'} tone={sum.target && sum.yield >= sum.target ? 'up' : 'down'} />
          <StatCard label="총 불량수량" field="qty" value={sum.ngQty ?? 0} unit="EA" sub={`불량률 ${sum.defectRate ?? '—'}%`} tone="down" />
        </Grid>
        <Gap />

        <Card title="모델별 수율 및 Loss 상세" sub={`${yearMonth} · 단위 EA · Loss 는 판정 유형별 수량`} tight>
          <XlsTable
            maxHeight={520}
            columns={[
              { key: 'no', title: 'No', width: 46 },
              { key: 'date', title: 'Date', width: 92 },
              { key: 'model', title: 'Model', width: 92, align: 'left' },
              { key: 'inputQty', title: '투입 수량', width: 110 },
              { key: 'okQty', title: '양품 수량', width: 110 },
              { key: 'ngQty', title: '불량 수량', width: 100 },
              { key: 'defectRate', title: '불량률%', width: 82 },
              { key: 'yield', title: '수율', width: 80 },
              ...lossTypes.map((h) => ({ key: `loss-${h}`, title: h, width: 100 })),
              ...mgmtTypes.map((h) => ({ key: `mgmt-${h}`, title: h, width: 104 })),
            ]}
            rows={[
              {
                key: '__total',
                tone: 'total',
                cells: [
                  { v: '합계 ▶', align: 'left', span: 3 },
                  { v: qty(comma(sum.inputQty ?? 0)), num: true },
                  { v: qty(comma(sum.okQty ?? 0)), num: true },
                  { v: qty(comma(sum.ngQty ?? 0)), num: true },
                  { v: yld(sum.defectRate ?? '—'), num: true },
                  { v: yld(sum.yield ?? '—'), num: true },
                  ...totalLoss.map((v) => ({ v: qty(comma(v)), num: true })),
                  ...totalMgmt.map((v) => ({ v: qty(comma(v)), num: true })),
                ],
              },
              ...rows.map((r, i) => ({
                key: `${r.date || ''}-${r.model}-${i}`,
                cells: [
                  { v: String(r.no ?? i + 1), num: true },
                  { v: r.date || yearMonth },
                  { v: r.model, align: 'left' },
                  { v: qty(comma(r.inputQty)), num: true },
                  { v: qty(comma(r.okQty)), num: true },
                  { v: qty(comma(r.ngQty)), num: true, tone: 'bad' },
                  { v: yld(r.defectRate), num: true, tone: 'bad' },
                  { v: yld(r.yield), num: true, tone: yieldTone(r.yield) },
                  ...lossTypes.map((t) => ({ v: qty(comma(r.loss?.[t] ?? 0)), num: true })),
                  ...mgmtTypes.map((t) => ({ v: qty(comma(r.mgmt?.[t] ?? 0)), num: true })),
                ],
              })),
            ]}
          />
          <Pagination meta={rowsMeta} sizes={sizes} {...(paging?.bind || {})} />
        </Card>
        <Gap />

        <Card title="불량 유형별 Loss 비중" sub={`${yearMonth} 누계 Loss ${canData('qty') ? comma(lossTotal) : '비공개'} EA 기준`} tight>
          <Table
            minWidth={680}
            keyExtractor={(r) => r.label}
            columns={[
              { key: 'label', title: '불량 유형', flex: 1 },
              { key: 'value', title: 'Loss 수량', width: 130, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(comma(r.value))}</Text> },
              { key: 'ratio', title: '비중', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{yld(`${fixed(r.ratio)}%`)}</Text> },
              {
                key: 'bar',
                title: '비중 그래프',
                flex: 1,
                minWidth: 160,
                render: (r) => (
                  <View style={{ width: '100%' }}>
                    <ProgressBar percent={r.ratio} tone={r.ratio >= 25 ? 'bad' : r.ratio >= 5 ? 'warn' : ''} />
                  </View>
                ),
              },
            ]}
            rows={lossMix}
          />
        </Card>
        <Gap />

        <Text style={s.sourceText}>
          수율·Loss 는 MES 투입/양품 실적과 AOI 판정 로그에서 자동 집계됩니다.
        </Text>
      </ReportDoc>
    </View>
  );
}
