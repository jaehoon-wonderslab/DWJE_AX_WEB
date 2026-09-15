/**
 * [View] RP-05 고객사별 LRR (경로: /report/lrr-by-customer)
 *
 * LRR(%) = LRR Q'ty ÷ Ship Q'ty × 100.
 * 출하 실적이 없는 구간은 산출이 불가하여 '-' 로 표기합니다.
 * 사용 API 1건 — /api/v1/reports/lrr-by-customer
 *
 * 서버는 집계 단위(월·분기·연)에 따라 기간 라벨을 바꿔 내려주므로,
 * 표의 열도 응답의 `period` 값에서 만들어 씁니다. (열을 화면에 고정하지 않습니다)
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import ReportDoc, { ReportTitle } from '@shared/components/layout/ReportDoc';
import { Badge, BlindValue, Button, Card, EmptyState, Filters, Loading, ProgressBar, SelectField, StatCard, Table, XlsTable } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { yearOptions } from '@shared/stores/useAppStore';
import { useCommonStyles } from '@shared/theme/styles';
import { downloadCsv, downloadXls, printDocument } from '@shared/utils/exportUtil';
import { comma } from '@shared/utils/formatUtil';

const NODE_ID = 'rpt-lrr-customer-doc';

/** null → '-' (원본 엑셀의 빈 셀·#DIV/0! 처리 규칙) */
const nz = (v) => (v === null || v === undefined ? '-' : comma(v));

/**
 * [{label, period, qty, shipQty, cnt}] 를 라벨 × 기간 피벗으로 바꿉니다.
 *
 * @param {Array} list 서버 집계 결과
 * @param {string} field 셀에 표시할 값의 키
 * @returns {{ periods: string[], rows: Array<{label, cells: number[], total: number}> }}
 */
function pivot(list = [], field = 'qty') {
  const periods = [...new Set(list.map((r) => r.period))].sort();
  const labels = [...new Set(list.map((r) => r.label))].sort();
  const at = new Map(list.map((r) => [`${r.label}|${r.period}`, r]));

  const rows = labels.map((label) => {
    const cells = periods.map((p) => at.get(`${label}|${p}`)?.[field] ?? null);
    return { label, cells, total: cells.reduce((a, b) => a + (Number(b) || 0), 0) };
  });
  return { periods, rows };
}

export default function LrrByCustomerView({ loading, data, role, filters, setBaseYear, setCustomerCd, setUnit, search }) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);

  if (loading) return <Loading />;
  // 조회 결과가 없어도 로딩 화면에 머무르지 않습니다 — 빈 상태로 알려 줍니다
  if (!data) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;

  const sum = data.summary || {};
  const baseYear = data.baseYear ?? filters.baseYear;
  const qty = (v) => (canData('qty') ? nz(v) : '비공개');
  const yld = (v) => (canData('yield') ? (v === null || v === undefined ? '-' : `${v}%`) : '비공개');
  const cust = (v) => (canData('customer') ? (v ?? '—') : '비공개');

  const defect = pivot(data.byDefectType, 'cnt');
  const customer = pivot(data.byCustomerMonth, 'qty');
  const byCustomer = data.byCustomer || [];

  const exportHead = ['고객사', '출하수량', 'LRR 수량', 'LRR(%)', '출하 비중(%)'];
  const exportRows = byCustomer.map((r) => [r.customer ?? '—', r.shipQty, r.lrrQty, r.lrrRate, r.shipShare]);

  /** 피벗 표 하나를 그립니다 (기간 열은 응답에서 만들어집니다) */
  const PivotCard = ({ title, sub, pv, valueLabel }) => (
    <Card title={title} sub={sub} tight>
      {pv.rows.length ? (
        <XlsTable
          maxHeight={420}
          columns={[
            { key: 'label', title: valueLabel, width: 160 },
            { key: 'total', title: '합계', width: 96 },
            ...pv.periods.map((p) => ({ key: p, title: p, width: 88 })),
          ]}
          rows={pv.rows.map((r) => ({
            key: r.label,
            cells: [
              { v: valueLabel === '고객사' ? cust(r.label) : r.label, align: 'left' },
              { v: qty(r.total), num: true, bold: true },
              ...r.cells.map((v) => ({ v: qty(v), num: true })),
            ],
          }))}
        />
      ) : (
        <EmptyState text="집계된 LRR 실적이 없습니다." />
      )}
    </Card>
  );

  return (
    <View>
      <PageHead
        title="고객사별 LRR"
        desc="고객사 출하수량(Ship Q'ty) 대비 고객사 라인 불량 통보 수량(LRR Q'ty)을 불량 유형·기간·고객사별로 집계한 품질보증팀 LRR 현황표입니다."
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: '고객사별 LRR', role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: `고객사별LRR_${baseYear}`, head: exportHead, rows: exportRows })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: '고객사별 LRR', head: exportHead, rows: exportRows })} />
          </>
        }
      />

      <Filters>
        <SelectField label="기준 연도" value={filters.baseYear} options={yearOptions()} onChange={setBaseYear} />
        <SelectField label="고객사" value={filters.customerCd} options={['전체', ...byCustomer.map((r) => r.customer).filter(Boolean)]} onChange={setCustomerCd} />
        <SelectField label="집계 단위" value={filters.unit} options={['월별', '분기별', '연간']} onChange={setUnit} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <ReportDoc nodeId={NODE_ID}>
        <ReportTitle
          dateBox={`${baseYear}년`}
          title="고객사별 LRR 현황"
          right={
            <>
              <Text style={[s.textXs, { fontWeight: '600', textDecorationLine: 'underline' }]}>품질보증팀</Text>
              <Text style={s.textXs}>{`기준 : ${baseYear}년 출하 실적`}</Text>
            </>
          }
        />

        <Grid cols={4}>
          <StatCard label={`${baseYear}년 누적 출하수량`} field="qty" value={nz(sum.shipQty)} unit="EA" sub={canData('customer') ? `고객사 ${byCustomer.length}개사` : '고객사 비공개'} />
          <StatCard label="LRR 건수" field="qty" value={nz(sum.lrrCnt)} unit="건" sub="고객사 라인 불량 통보" />
          <StatCard label="LRR(%)" field="yield" value={sum.lrrRate ?? '—'} unit="%" sub="출하수량 대비" tone={Number(sum.lrrRate) > 0 ? 'down' : 'up'} />
          <StatCard
            label="전년 대비 개선폭"
            field="yield"
            value={sum.yoyImprovement ?? '—'}
            unit="%p"
            sub={`${baseYear - 1}년 대비`}
            tone={Number(sum.yoyImprovement) >= 0 ? 'up' : 'down'}
          />
        </Grid>
        <Gap />

        <PivotCard
          title="불량 유형별 발생 건수"
          sub={`${filters.unit} 집계 · 단위 건`}
          pv={defect}
          valueLabel="불량 유형"
        />
        <Gap />

        <PivotCard
          title="고객사별 LRR 수량"
          sub={`${filters.unit} 집계 · 단위 EA`}
          pv={customer}
          valueLabel="고객사"
        />
        <Gap />

        <Card title="고객사 누계" sub="출하수량 대비 LRR 비율" tight>
          {byCustomer.length ? (
            <Table
              minWidth={760}
              keyExtractor={(r) => r.customer || '—'}
              columns={[
                { key: 'customer', title: '고객사', flex: 1, minWidth: 140, render: (r) => <BlindValue field="customer" value={r.customer ?? '—'} textStyle={s.td} /> },
                { key: 'shipQty', title: "Ship Q'ty", width: 130, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(r.shipQty)}</Text> },
                { key: 'lrrQty', title: "LRR Q'ty", width: 120, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(r.lrrQty)}</Text> },
                { key: 'lrrRate', title: 'LRR(%)', width: 96, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{yld(r.lrrRate)}</Text> },
                {
                  key: 'shipShare',
                  title: '출하 비중',
                  flex: 1,
                  minWidth: 160,
                  render: (r) => (
                    <View style={{ width: '100%' }}>
                      <ProgressBar percent={Number(r.shipShare) || 0} />
                    </View>
                  ),
                },
              ]}
              rows={byCustomer}
            />
          ) : (
            <EmptyState text="집계된 고객사 출하 실적이 없습니다." />
          )}
        </Card>

        <Text style={[s.sourceText, { marginTop: 12 }]}>
          LRR 은 고객사에서 통보한 라인 불량 수량입니다. 출하 실적이 없는 구간은 비율을 산출하지 않고 '-' 로 표기합니다.
        </Text>
      </ReportDoc>
    </View>
  );
}
