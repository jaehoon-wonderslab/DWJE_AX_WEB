/**
 * [View] RP-02 아침회의 자료 (Plating·Coating) (경로: /report/plating-morning)
 *
 * 사용 API 1건 — /api/v1/reports/plating-morning
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import ReportDoc, { ReportTitle, SignalLegend } from '@shared/components/layout/ReportDoc';
import { Badge, Button, Card, DateField, EmptyState, Filters, Hint, Loading, SelectField, StatCard, Table, XlsTable } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { downloadCsv, downloadXls, printDocument } from '@shared/utils/exportUtil';

const NODE_ID = 'rpt-plating-morning-doc';

/** 신호등 상태 → 표 셀 색 */
const toneOf = (state) => (state === '위험' ? 'bad' : state === '주의' ? 'warn' : 'ok');

export default function PlatingMorningView({ loading, data, role, reportName, filters, setBaseDate, setProcessScope, setState, search }) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);

  if (loading) return <Loading />;
  // 조회 결과가 없어도 로딩 화면에 머무르지 않습니다 — 빈 상태로 알려 줍니다
  if (!data) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;

  const rows = data.rows || [];
  const total = data.total || {};
  const sum = data.summary || {};
  const mask = (field, v) => (canData(field) ? v : '비공개');

  const exportHead = ['상태', '공정', '이슈 항목', '일목표', '실적', '달성률', '주간목표', '주간실적', '주간달성률', '결정항목', 'DRI', '기한'];
  const exportRows = rows.map((r) => [r.state, r.process, r.item, r.dayTarget, r.dayActual, r.rate, r.weekTarget, r.weekActual, r.weekRate, r.decision, r.dri, r.due]);

  return (
    <View>
      <PageHead
        title="아침회의 자료 (Plating · Coating)"
        desc="전일(26.08.20) Plating·Coating 라인의 일목표 대비 실적, 주간누적 달성률, 이슈 및 결정항목을 아침회의용 한 장으로 정리합니다."
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: '아침회의 자료 (Plating·Coating)', role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: '아침회의자료_PlatingCoating_20260821', head: exportHead, rows: exportRows })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: '아침회의 자료 (Plating·Coating)', head: exportHead, rows: exportRows })} />
          </>
        }
      />

      <Filters>
        <DateField label="기준일" value={filters.baseDate} onChange={setBaseDate} />
        <SelectField label="공정" value={filters.processScope} options={['전체', 'A Plating', 'B Plating', 'Coating']} onChange={setProcessScope} />
        <SelectField label="상태" value={filters.state} options={['전체', '정상', '주의', '위험']} onChange={setState} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <ReportDoc nodeId={NODE_ID}>
        <ReportTitle
          dateBox="26.08.21"
          title="생산관리팀 (Plating, Coating)"
          right={
            <>
              <SignalLegend />
              <Text style={[s.textXs, { fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 }]}>{`${data.actualDate}실적`}</Text>
            </>
          }
        />

        <Grid cols={4}>
          <StatCard label="일목표 합계" field="qty" value={sum.dayTarget} unit="k" sub={`11개 라인 · ${data.actualDate}`} />
          <StatCard label="실적 합계" field="qty" value={sum.dayActual} unit="k" sub={`목표 대비 ${mask('qty', sum.gap)}`} tone="up" />
          <StatCard label="평균 달성률" field="yield" value={sum.avgRate} unit="%" sub={`주간누적 ${mask('yield', `${sum.weekRate}%`)}`} tone="up" />
          <StatCard label="위험 공정" value={sum.riskCnt} unit="건" sub={sum.riskDetail} tone="down" />
        </Grid>
        <Gap />

        <Card
          title="일일 실적 현황 (26.08.20 목)"
          sub="신호등 규칙 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험"
          tight
          right={
            <>
              <Badge tone="red">{`위험 ${rows.filter((r) => r.state === '위험').length}`}</Badge>
              <Badge tone="green">{`정상 ${rows.filter((r) => r.state === '정상').length}`}</Badge>
            </>
          }
        >
          <XlsTable
            columns={[
              { key: 'st', title: '상태', width: 62 },
              { key: 'proc', title: '공정/Process', width: 100, align: 'left' },
              { key: 'item', title: '이슈 항목', width: 92 },
              { key: 'tgt', title: '일목표', width: 82 },
              { key: 'act', title: '실적', width: 82 },
              { key: 'rate', title: '달성률', width: 84 },
              { key: 'week', title: '주간누적', width: 190, align: 'left' },
              { key: 'scope', title: '영향범위', width: 90 },
              { key: 'memo', title: '결정항목 / 기타', width: 320, align: 'left' },
              { key: 'dri', title: 'DRI', width: 62 },
              { key: 'due', title: '기한', width: 62 },
            ]}
            rows={[
              ...rows.map((r) => ({
                key: `${r.process}-${r.item}`,
                cells: [
                  { v: r.state, tone: toneOf(r.state), bold: true },
                  { v: r.process, align: 'left', bold: true },
                  { v: r.item, bold: true },
                  { v: mask('qty', r.dayTarget), num: true },
                  { v: mask('qty', r.dayActual), num: true },
                  { v: mask('yield', r.rate), num: true, tone: toneOf(r.state) },
                  { v: `주간목표 ${mask('qty', r.weekTarget)} / 실적 ${mask('qty', r.weekActual)} / ${mask('yield', r.weekRate)}`, align: 'left' },
                  { v: r.scope },
                  { v: r.decision, align: 'left', wrap: true },
                  { v: r.dri || '-' },
                  { v: r.due },
                ],
              })),
              {
                key: '__total',
                tone: 'total',
                cells: [
                  { v: total.state },
                  { v: total.process, align: 'left' },
                  { v: total.item },
                  { v: mask('qty', total.dayTarget), num: true },
                  { v: mask('qty', total.dayActual), num: true },
                  { v: mask('yield', total.rate), num: true, tone: 'ok' },
                  { v: `주간목표 ${mask('qty', total.weekTarget)} / 실적 ${mask('qty', total.weekActual)} / ${mask('yield', total.weekRate)}`, align: 'left' },
                  { v: total.scope },
                  { v: total.decision, align: 'left' },
                  { v: total.dri },
                  { v: total.due },
                ],
              },
            ]}
          />
        </Card>
        <Gap />

        <Card title="공정별 요약" sub="A/B Plating · Coating 목표 대비 실적과 설비 가동 현황" tight>
          <Table
            minWidth={920}
            keyExtractor={(r) => r.process}
            columns={[
              { key: 'process', title: '공정', width: 110 },
              { key: 'lines', title: '대상 라인', flex: 1, minWidth: 260 },
              { key: 'dayTarget', title: '일목표', width: 92, align: 'right' },
              { key: 'dayActual', title: '실적', width: 92, align: 'right' },
              { key: 'dayRate', title: '일 달성률', width: 96, align: 'right' },
              { key: 'weekRate', title: '주간 달성률', width: 104, align: 'right' },
              { key: 'eqpt', title: '가동 설비', width: 96, align: 'center' },
              { key: 'note', title: '비고', width: 90, render: (r) => (r.note === '-' ? <Text style={s.td}>-</Text> : <Badge tone={r.noteTone}>{r.note}</Badge>) },
            ]}
            rows={data.processSummary || []}
          />
        </Card>

        <Text style={[s.sourceText, { marginTop: 12 }]}>
          프로토타입 — 표시 데이터는 샘플입니다. 도금조 액 분석·석출 이력은 IoT 연동 후 자동 반영됩니다.
        </Text>
      </ReportDoc>
      <Gap />

      <Hint>
        B Plating BOI 라인은 JIG 라인 도금조 석출로 가동이 중단되어 일 달성률 62.0%입니다. 미달성 수량은 주말 작업으로 만회 예정이며, 기한은 8/23 입니다.
      </Hint>
    </View>
  );
}
