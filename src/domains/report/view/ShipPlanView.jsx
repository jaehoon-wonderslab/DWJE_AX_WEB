/**
 * [View] RP-03 연간 출하계획 (경로: /report/ship-plan)
 *
 * 출하 계획 수량은 데이터 접근 권한 plan 항목에 해당합니다.
 * 사용 API 1건 — /api/v1/reports/ship-plan
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
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';

const NODE_ID = 'rpt-ship-plan-doc';

export default function ShipPlanView({ loading, data, role, reportName, filters, setPlanYear, setModelCd, setCustomerCd, setUnit, search }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const canData = useAuthStore((state) => state.canData);

  if (loading) return <Loading />;
  // 조회 결과가 없어도 로딩 화면에 머무르지 않습니다 — 빈 상태로 알려 줍니다
  if (!data) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;

  const months = data.months || [];
  const plan = (v) => (canData('plan') ? comma(v) : '비공개');
  const cust = (v) => (canData('customer') ? v : '비공개');

  // 피벗 표 — 서버는 모델 × 고객사 행을 평평하게 주므로 모델별로 묶어 TOTAL 행을 만듭니다
  const rows = data.rows || [];
  const byModel = [];
  rows.forEach((r) => {
    const found = byModel.find((m) => m.model === r.model);
    if (found) found.rows.push(r);
    else byModel.push({ model: r.model, rows: [r] });
  });

  /** 월별 합계를 더합니다 (값이 없는 달은 0 으로 셉니다) */
  const sumMonthly = (list) => months.map((_, i) => list.reduce((acc, r) => acc + (Number(r.values?.[i]) || 0), 0));

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
          { v: cust(r.customer) ?? '—', align: 'left' },
          { v: plan(r.total), num: true },
          ...months.map((_, i) => ({ v: plan(r.values?.[i]), num: true })),
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
        ...(data.monthTotals || []).map((v) => ({ v: plan(v), num: true })),
      ],
    });
  }

  const peakQty = Math.max(0, ...(data.monthTotals || [0]));
  const exportHead = ['모델', '고객사', '총합계', ...months];
  const exportRows = rows.map((r) => [r.model, r.customer ?? '', r.total, ...months.map((_, i) => r.values?.[i] ?? 0)]);

  return (
    <View>
      <PageHead
        title="2026년 출하계획"
        desc="모델 × 고객사 × 월 단위 연간 출하계획(회계연도 8월 시작 12개월)입니다."
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: '2026년 출하계획', role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: '출하계획_2026', head: exportHead, rows: exportRows })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: '2026년 출하계획', head: exportHead, rows: exportRows })} />
          </>
        }
      />

      <Filters>
        <SelectField label="계획 연도" value={filters.planYear} options={yearOptions()} onChange={setPlanYear} />
        <SelectField label="모델" value={filters.modelCd} options={['전체', 'MD001', 'MD002', 'MD003', 'MD004']} onChange={setModelCd} />
        <SelectField label="고객사" value={filters.customerCd} options={['전체', 'A comp', 'B comp']} onChange={setCustomerCd} />
        <SelectField label="단위" value={filters.unit} options={['수량 (EA)', '금액 (원)']} onChange={setUnit} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <ReportDoc nodeId={NODE_ID}>
        <View style={{ backgroundColor: '#1f3864', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 6, marginBottom: 14 }}>
          <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: 0.5 }}>2026년 출하계획</Text>
        </View>

        <Grid cols={4}>
          <StatCard label={`${data.planYear ?? ''}년 총 계획수량`} field="plan" value={comma(data.grandTotal)} unit={data.unit === 'amount' ? '원' : 'EA'} sub={`${data.modelCnt ?? 0}개 모델 · ${months.length}개월 합계`} />
          <StatCard label="모델 수" value={data.modelCnt ?? 0} unit="종" sub="계획이 등록된 모델" />
          <StatCard label="고객사 수" value={data.customerCnt ?? 0} unit="사" sub="계획이 등록된 고객사" />
          <StatCard label="최다 출하 월" value={data.peakMonth || '—'} sub={`${plan(peakQty)} ${data.unit === 'amount' ? '원' : 'EA'}`} tone="up" />
        </Grid>
        <Gap />

        <Card title="모델·고객사별 월 출하계획" sub="단위: EA · 회계연도 2026년(8월~익년 7월) · TOTAL 행은 모델 합계" tight>
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
            <Hint>총합계 열은 계획서 확정본 기준이며, 2월~7월은 고객사 PO 미확정 구간의 잠정 배분값입니다.</Hint>
          </View>
        </Card>
        <Gap />

        <Card title="모델별 계획 비중" sub="총합계 기준 모델 구성비" tight>
          <Table
            minWidth={700}
            keyExtractor={(r) => r.model}
            columns={[
              { key: 'model', title: '모델', flex: 1, render: (r) => <Text style={s.td}>{r.model}</Text> },
              { key: 'total', title: '총 계획수량 (EA)', width: 160, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{plan(r.total)}</Text> },
              { key: 'ratio', title: '비중', width: 90, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{`${((r.total / (data.grandTotal || 1)) * 100).toFixed(1)}%`}</Text> },
              {
                key: 'bar',
                title: '구성비 그래프',
                flex: 1,
                minWidth: 160,
                render: (r) => (
                  <View style={{ width: '100%' }}>
                    <ProgressBar percent={(r.total / (data.grandTotal || 1)) * 100} />
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
    </View>
  );
}
