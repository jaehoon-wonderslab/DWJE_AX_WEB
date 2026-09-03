/**
 * [View] RP-02 아침회의 자료 (Plating·Coating) (경로: /report/plating-morning)
 *
 * 사용 API 1건 — /api/v1/reports/plating-morning
 * 응답 필드만 그립니다 — rows[{state,process,issue,dayTarget,dayActual,rate,weekTarget,weekActual,weekRate,impactEqptCnt,decision,dri,due}]
 * 공정별 요약은 행을 A Plating / B Plating / Coating 묶음(공정 마스터 이름 기준)으로 묶어 화면에서 계산합니다.
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
import { comma, fixed } from '@shared/utils/formatUtil';
import { PROCESS_GROUPS, countSignals, dateBoxOf, kk, pctOf, processGroupLabel, signalOf, worstSignal } from '../model/reportModel';

const NODE_ID = 'rpt-plating-morning-doc';
const TITLE = '아침회의 자료 (Plating·Coating)';

export default function PlatingMorningView({
  loading, data, role, filters, processOptions = [], stateOptions = [], groupKeys = [],
  setBaseDate, setProcessScope, setState, search,
}) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);

  const rows = data?.rows || [];
  const total = data?.total || {};
  const sum = data?.summary || {};
  const baseDate = data?.baseDate || filters.baseDate;
  const counts = countSignals(rows);

  let blindCnt = 0;
  const mask = (field, v) => {
    if (canData(field)) return v;
    blindCnt += 1;
    return '비공개';
  };
  const kNum = (n) => comma(Math.round((Number(n) || 0) / 1000));
  const pct = (v) => (v === null || v === undefined ? '-' : `${fixed(v)}%`);
  const weekText = (r) => `주간목표 ${mask('qty', kk(r.weekTarget))} / 실적 ${mask('qty', kk(r.weekActual))} / ${mask('yield', pct(r.weekRate))}`;
  const gap = (Number(sum.dayActual) || 0) - (Number(sum.dayTarget) || 0);

  // 위험 라인 — 요약 카드 보조 문구와 하단 안내에 씁니다
  const badRows = rows.filter((r) => signalOf(r.state).tone === 'bad');
  const badNames = badRows.map((r) => r.process);
  const riskDetail = badNames.length ? `${badNames.slice(0, 2).join(' · ')}${badNames.length > 2 ? ` 외 ${badNames.length - 2}` : ''}` : '위험 라인 없음';

  // 공정별 요약 — 묶음(A Plating / B Plating / Coating / 기타)별 합계
  const groupLabels = [...PROCESS_GROUPS.filter((g) => groupKeys.includes(g.key)).map((g) => g.label), '기타'];
  const processSummary = groupLabels
    .map((label) => {
      const list = rows.filter((r) => processGroupLabel(r.process) === label);
      if (!list.length) return null;
      const dayTarget = list.reduce((a, r) => a + (Number(r.dayTarget) || 0), 0);
      const dayActual = list.reduce((a, r) => a + (Number(r.dayActual) || 0), 0);
      const weekTarget = list.reduce((a, r) => a + (Number(r.weekTarget) || 0), 0);
      const weekActual = list.reduce((a, r) => a + (Number(r.weekActual) || 0), 0);
      const worst = worstSignal(list);
      return {
        process: label,
        lines: list.map((r) => r.process).join(' · '),
        dayTarget: mask('qty', kk(dayTarget)),
        dayActual: mask('qty', kk(dayActual)),
        dayRate: mask('yield', pctOf(dayActual, dayTarget)),
        weekRate: mask('yield', pctOf(weekActual, weekTarget)),
        eqpt: `${comma(list.reduce((a, r) => a + (Number(r.impactEqptCnt) || 0), 0))}대`,
        note: worst.label,
        noteTone: worst.badge,
      };
    })
    .filter(Boolean);

  const exportHead = ['상태', '공정', '이슈 항목', '일목표', '실적', '달성률', '주간누적', '영향범위', '결정항목', 'DRI', '기한'];
  const exportRows = rows.map((r) => [
    signalOf(r.state).label, r.process, r.issue || '-', mask('qty', kk(r.dayTarget)), mask('qty', kk(r.dayActual)), mask('yield', pct(r.rate)),
    weekText(r), `설비 ${comma(r.impactEqptCnt ?? 0)}대`, r.decision || '-', r.dri || '-', r.due || '-',
  ]);
  const fileName = `아침회의자료_PlatingCoating_${String(baseDate || '').replace(/-/g, '')}`;

  return (
    <View>
      <PageHead
        title="아침회의 자료 (Plating · Coating)"
        desc="전일 Plating·Coating 라인의 일목표 대비 실적, 주간누적 달성률, 이슈 및 결정항목을 아침회의용 한 장으로 정리합니다."
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: TITLE, role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: fileName, head: exportHead, rows: exportRows, blindCount: blindCnt })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: fileName, head: exportHead, rows: exportRows, blindCount: blindCnt })} />
          </>
        }
      />

      <Filters>
        <DateField label="기준일" value={filters.baseDate} onChange={setBaseDate} />
        <SelectField label="공정" value={filters.processScope} options={processOptions} onChange={setProcessScope} />
        <SelectField label="상태" value={filters.state} options={stateOptions} onChange={setState} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {loading ? (
        <Loading />
      ) : !data || !rows.length ? (
        // 조회 결과가 없어도 조회 조건은 그대로 두어 기준일·공정을 바꿀 수 있게 합니다
        <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />
      ) : (
        <>
          <ReportDoc nodeId={NODE_ID}>
            <ReportTitle
              dateBox={dateBoxOf(baseDate)}
              title="생산관리팀 (Plating, Coating)"
              right={
                <>
                  <SignalLegend />
                  <Text style={[s.textXs, { fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 }]}>{`${baseDate} 실적`}</Text>
                </>
              }
            />

            <Grid cols={4}>
              <StatCard label="일목표 합계" field="qty" value={kNum(sum.dayTarget)} unit="k" sub={`${rows.length}개 라인 · ${baseDate}`} />
              <StatCard label="실적 합계" field="qty" value={kNum(sum.dayActual)} unit="k" sub={`목표 대비 ${mask('qty', `${gap >= 0 ? '+' : '-'}${kk(Math.abs(gap))}`)}`} tone={gap >= 0 ? 'up' : 'down'} />
              <StatCard label="평균 달성률" field="yield" value={fixed(sum.avgRate)} unit="%" sub={`주간누적 ${mask('yield', pct(sum.weekRate))}`} tone={Number(sum.avgRate) >= 95 ? 'up' : 'down'} />
              <StatCard label="위험 공정" value={counts.bad} unit="건" sub={riskDetail} tone="down" />
            </Grid>
            <Gap />

            <Card
              title={`일일 실적 현황 (${baseDate})`}
              sub="신호등 규칙 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험"
              tight
              right={
                <>
                  <Badge tone="red">{`위험 ${counts.bad}`}</Badge>
                  <Badge tone="amber">{`주의 ${counts.warn}`}</Badge>
                  <Badge tone="green">{`정상 ${counts.ok}`}</Badge>
                </>
              }
            >
              <XlsTable
                columns={[
                  { key: 'st', title: '상태', width: 62 },
                  { key: 'proc', title: '공정/Process', width: 170, align: 'left' },
                  { key: 'item', title: '이슈 항목', width: 150, align: 'left' },
                  { key: 'tgt', title: '일목표', width: 82 },
                  { key: 'act', title: '실적', width: 82 },
                  { key: 'rate', title: '달성률', width: 84 },
                  { key: 'week', title: '주간누적', width: 230, align: 'left' },
                  { key: 'scope', title: '영향범위', width: 100 },
                  { key: 'memo', title: '결정항목 / 기타', width: 260, align: 'left' },
                  { key: 'dri', title: 'DRI', width: 70 },
                  { key: 'due', title: '기한', width: 70 },
                ]}
                rows={[
                  ...rows.map((r) => {
                    const sig = signalOf(r.state);
                    return {
                      key: r.processId || r.process,
                      cells: [
                        { v: sig.label, tone: sig.tone, bold: true },
                        { v: r.process, align: 'left', bold: true },
                        { v: r.issue || '-', align: 'left' },
                        { v: mask('qty', kk(r.dayTarget)), num: true },
                        { v: mask('qty', kk(r.dayActual)), num: true },
                        { v: mask('yield', pct(r.rate)), num: true, tone: sig.tone },
                        { v: weekText(r), align: 'left' },
                        { v: `설비 ${comma(r.impactEqptCnt ?? 0)}대` },
                        { v: r.decision || '-', align: 'left', wrap: true },
                        { v: r.dri || '-' },
                        { v: r.due || '-' },
                      ],
                    };
                  }),
                  {
                    key: '__total',
                    tone: 'total',
                    cells: [
                      { v: '합계' },
                      { v: `${rows.length}개 라인`, align: 'left' },
                      { v: '' },
                      { v: mask('qty', kk(total.dayTarget)), num: true },
                      { v: mask('qty', kk(total.dayActual)), num: true },
                      { v: mask('yield', pct(total.rate)), num: true },
                      { v: weekText(total), align: 'left' },
                      { v: `설비 ${comma(rows.reduce((a, r) => a + (Number(r.impactEqptCnt) || 0), 0))}대` },
                      { v: `주의 ${counts.warn}건 · 위험 ${counts.bad}건`, align: 'left' },
                      { v: '생산관리' },
                      { v: total.due || '-' },
                    ],
                  },
                ]}
              />
            </Card>
            <Gap />

            <Card title="공정별 요약" sub="A/B Plating · Coating 목표 대비 실적과 설비 가동 현황 (공정 마스터 이름 기준 묶음)" tight>
              <Table
                minWidth={920}
                keyExtractor={(r) => r.process}
                columns={[
                  { key: 'process', title: '공정', width: 110 },
                  { key: 'lines', title: '대상 라인', flex: 1, minWidth: 260, wrap: true },
                  { key: 'dayTarget', title: '일목표', width: 92, align: 'right' },
                  { key: 'dayActual', title: '실적', width: 92, align: 'right' },
                  { key: 'dayRate', title: '일 달성률', width: 96, align: 'right' },
                  { key: 'weekRate', title: '주간 달성률', width: 104, align: 'right' },
                  { key: 'eqpt', title: '가동 설비', width: 96, align: 'center' },
                  { key: 'note', title: '비고', width: 90, render: (r) => <Badge tone={r.noteTone}>{r.note}</Badge> },
                ]}
                rows={processSummary}
              />
            </Card>

            <Text style={[s.sourceText, { marginTop: 12 }]}>
              일목표·실적은 MES 실적과 불량 이력에서 자동 집계됩니다. 도금조 액 분석·석출 이력은 IoT 연동 후 자동 반영됩니다.
            </Text>
          </ReportDoc>
          <Gap />

          <Hint>
            {badNames.length
              ? `위험 ${badNames.length}개 라인 — ${badNames.join(', ')}. 미달성 수량의 만회 계획과 기한은 아침회의에서 DRI 와 함께 확정합니다.`
              : '위험(85% 미만) 라인이 없습니다. 주의 라인은 주간누적 달성률을 함께 확인하세요.'}
          </Hint>
        </>
      )}
    </View>
  );
}
