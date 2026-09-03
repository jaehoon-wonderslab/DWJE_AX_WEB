/**
 * [View] RP-03 연간 출하계획 (경로: /report/ship-plan)
 *
 * 출하 계획 수량은 데이터 접근 권한 plan 항목, 금액 단위일 때는 price 항목도 함께 봅니다.
 * 사용 API 1건 — /api/v1/reports/ship-plan
 * 응답 — planYear · unit(qty|amount) · months[] · rows[{model,customer,total,monthly[]}] · monthTotals[] · grandTotal · modelCnt · customerCnt · peakMonth
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import ReportDoc from '@shared/components/layout/ReportDoc';
import { Button, Card, EmptyState, Filters, Hint, Loading, ProgressBar, SelectField, StatCard, Table, XlsTable } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { yearOptions } from '@shared/stores/useAppStore';
import { useCommonStyles } from '@shared/theme/styles';
import { downloadCsv, downloadXls, printDocument } from '@shared/utils/exportUtil';
import { comma } from '@shared/utils/formatUtil';
import { pctOf } from '../model/reportModel';

const NODE_ID = 'rpt-ship-plan-doc';

export default function ShipPlanView({
  loading, data, role, filters, setPlanYear, setModelCd, setCustomerCd, setUnit, search,
  modelOptions = [], customerOptions = [],
}) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);

  const yearNum = data?.planYear ?? String(filters.planYear).replace(/[^0-9]/g, '');
  const title = `${yearNum}년 출하계획`;
  const isAmount = data?.unit ? data.unit === 'amount' : String(filters.unit).includes('금액');
  const unitLabel = isAmount ? '원' : 'EA';
  // 계획값은 plan 권한, 금액 단위일 때는 price 권한까지 있어야 봅니다
  const planField = isAmount && !canData('price') ? 'price' : 'plan';
  let blindCnt = 0;
  const masked = (ok, v) => {
    if (ok) return v;
    blindCnt += 1;
    return '비공개';
  };
  const plan = (v) => masked(canData(planField), comma(v));
  const cust = (v) => masked(canData('customer'), v ?? '—');

  const months = data?.months || [];
  const rows = data?.rows || [];
  const monthlyOf = (r) => r.monthly || r.values || [];

  // 피벗 표 — 서버는 모델 × 고객사 행을 평평하게 주므로 모델별로 묶어 TOTAL 행을 만듭니다
  const byModel = [];
  rows.forEach((r) => {
    const found = byModel.find((m) => m.model === r.model);
    if (found) found.rows.push(r);
    else byModel.push({ model: r.model, rows: [r] });
  });

  /** 월별 합계를 더합니다 (값이 없는 달은 0 으로 셉니다) */
  const sumMonthly = (list) => months.map((_, i) => list.reduce((acc, r) => acc + (Number(monthlyOf(r)[i]) || 0), 0));

  const modelSum = byModel.map((m) => ({
    model: m.model,
    total: m.rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    monthly: sumMonthly(m.rows),
  }));

  const pivotRows = [];
  byModel.forEach((m, di) => {
    const ms = modelSum[di];
    m.rows.forEach((r, ri) => {
      pivotRows.push({
        key: `${m.model}-${r.customer ?? ri}`,
        cells: [
          { v: ri === 0 ? m.model : '', align: 'left', bold: ri === 0 },
          { v: cust(r.customer), align: 'left' },
          { v: plan(r.total), num: true },
          ...months.map((_, i) => ({ v: plan(monthlyOf(r)[i] ?? 0), num: true })),
        ],
      });
    });
    pivotRows.push({
      key: `${m.model}-total`,
      tone: 'group',
      cells: [
        { v: '', align: 'left' },
        { v: 'TOTAL', align: 'left', bold: true },
        { v: plan(ms.total), num: true, bold: true },
        ...ms.monthly.map((v) => ({ v: plan(v), num: true, bold: true })),
      ],
    });
  });
  if (pivotRows.length) {
    pivotRows.push({
      key: '__grand',
      tone: 'total',
      cells: [
        { v: 'TOTAL', align: 'left', span: 2 },
        { v: plan(data.grandTotal), num: true },
        ...months.map((_, i) => ({ v: plan((data.monthTotals || data.monthlyTotal || [])[i] ?? 0), num: true })),
      ],
    });
  }

  const monthTotals = data?.monthTotals || data?.monthlyTotal || [];
  const peakQty = monthTotals.length ? Math.max(0, ...monthTotals.map((v) => Number(v) || 0)) : 0;
  const exportHead = ['모델', '고객사', `총합계 (${unitLabel})`, ...months];
  const exportRows = rows.map((r) => [r.model, cust(r.customer), plan(r.total), ...months.map((_, i) => plan(monthlyOf(r)[i] ?? 0))]);

  return (
    <View>
      <PageHead
        title={title}
        desc="모델 × 고객사 × 월 단위 연간 출하계획(회계연도 8월 시작 12개월)입니다. 계획 수량은 출하 계획(plan) 데이터 권한이 있는 계정에만 표시됩니다."
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title, role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: `출하계획_${yearNum}`, head: exportHead, rows: exportRows, blindCount: blindCnt })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: title, head: exportHead, rows: exportRows, blindCount: blindCnt })} />
          </>
        }
      />

      <Filters>
        <SelectField label="계획 연도" value={filters.planYear} options={yearOptions()} onChange={setPlanYear} />
        <SelectField label="모델" value={filters.modelCd} options={modelOptions} onChange={setModelCd} />
        <SelectField label="고객사" value={filters.customerCd} options={customerOptions} onChange={setCustomerCd} />
        <SelectField label="단위" value={filters.unit} options={['수량 (EA)', '금액 (원)']} onChange={setUnit} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {loading ? (
        <Loading />
      ) : !data || !rows.length ? (
        // 계획이 등록된 모델·고객사가 없으면(고객사 기준정보 0건 포함) 조회 조건은 남기고 빈 상태만 알립니다
        <EmptyState text="조회 조건에 해당하는 출하계획이 없습니다." />
      ) : (
        <ReportDoc nodeId={NODE_ID}>
          <View style={{ backgroundColor: '#1f3864', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 6, marginBottom: 14 }}>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: 0.5 }}>{title}</Text>
          </View>

          <Grid cols={4}>
            <StatCard label={`${yearNum}년 총 계획${isAmount ? '금액' : '수량'}`} field={planField} value={comma(data.grandTotal)} unit={unitLabel} sub={`${data.modelCnt ?? byModel.length}개 모델 · ${months.length}개월 합계`} />
            <StatCard label="모델 수" value={data.modelCnt ?? byModel.length} unit="종" sub="계획이 등록된 모델" />
            <StatCard label="고객사 수" value={data.customerCnt ?? 0} unit="사" sub="계획이 등록된 고객사" />
            <StatCard label="최다 출하 월" value={Number(data.grandTotal) ? data.peakMonth || '—' : '—'} sub={`${plan(peakQty)} ${unitLabel}`} tone="up" />
          </Grid>
          <Gap />

          <Card title="모델·고객사별 월 출하계획" sub={`단위: ${unitLabel} · 회계연도 ${yearNum}년(8월~익년 7월) · TOTAL 행은 모델 합계`} tight>
            <XlsTable
              maxHeight={560}
              columns={[
                { key: 'model', title: '모델', width: 130 },
                { key: 'customer', title: '고객사', width: 96 },
                { key: 'total', title: '총합계', width: 110 },
                ...months.map((m) => ({ key: m, title: m, width: 96 })),
              ]}
              rows={pivotRows}
            />
            <View style={{ padding: 14 }}>
              <Hint>총합계 열은 계획서 확정본 기준이며, 고객사 PO 미확정 구간은 잠정 배분값입니다.</Hint>
            </View>
          </Card>
          <Gap />

          <Card title="모델별 계획 비중" sub="총합계 기준 모델 구성비" tight>
            <Table
              minWidth={700}
              keyExtractor={(r) => r.model}
              columns={[
                { key: 'model', title: '모델', flex: 1, render: (r) => <Text style={s.td}>{r.model}</Text> },
                { key: 'total', title: `총 계획${isAmount ? '금액' : '수량'} (${unitLabel})`, width: 170, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{plan(r.total)}</Text> },
                { key: 'ratio', title: '비중', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{pctOf(r.total, data.grandTotal)}</Text> },
                {
                  key: 'bar',
                  title: '구성비 그래프',
                  flex: 1,
                  minWidth: 160,
                  render: (r) => (
                    <View style={{ width: '100%' }}>
                      <ProgressBar percent={(r.total / (Number(data.grandTotal) || 1)) * 100} />
                    </View>
                  ),
                },
              ]}
              rows={[...modelSum].sort((a, b) => b.total - a.total)}
            />
          </Card>

          <Text style={[s.sourceText, { marginTop: 12 }]}>
            확정 계획은 고객사 PO 연동 후 월 단위로 갱신됩니다.
          </Text>
        </ReportDoc>
      )}
    </View>
  );
}
