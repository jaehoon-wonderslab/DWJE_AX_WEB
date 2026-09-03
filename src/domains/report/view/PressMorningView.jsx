/**
 * [View] RP-01 아침회의 자료 (PRESS) (경로: /report/press-morning)
 *
 * 신호등 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험 (서버 state: NORMAL | WARN | CRIT)
 * 사용 API 2건 — /api/v1/reports/press-morning, /decisions
 *
 * 응답 필드만 그립니다 — rows[{state,process,issue,dayTarget,dayActual,rate,weekTarget,weekActual,weekRate,impactEqptCnt,decision,dri,due}]
 * 마스킹은 문자열 치환(canData ? v : '비공개')이라 화면·인쇄·CSV 전 구간에 같이 적용됩니다.
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
import { countSignals, dateBoxOf, kk, signalOf } from '../model/reportModel';

const NODE_ID = 'rpt-press-morning-doc';
const TITLE = '아침회의 자료 (PRESS)';

export default function PressMorningView({
  loading, data, role, filters, processOptions = [], stateOptions = [], scopeLabel,
  setBaseDate, setProcessScope, setState, search,
}) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);

  const report = data?.report;
  const rows = report?.rows || [];
  const sum = report?.summary || {};
  const total = report?.total || {};
  const baseDate = report?.baseDate || filters.baseDate;
  const counts = countSignals(rows);
  const eqptTotal = rows.reduce((a, r) => a + (Number(r.impactEqptCnt) || 0), 0);

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

  const exportHead = ['상태', '공정', '이슈 항목', '일목표', '실적', '달성률', '주간누적', '영향범위', '결정항목', 'DRI', '기한'];
  const exportRows = rows.map((r) => [
    signalOf(r.state).label, r.process, r.issue || '-', mask('qty', kk(r.dayTarget)), mask('qty', kk(r.dayActual)), mask('yield', pct(r.rate)),
    weekText(r), `설비 ${comma(r.impactEqptCnt ?? 0)}대`, r.decision || '-', r.dri || '-', r.due || '-',
  ]);
  const fileName = `아침회의자료_PRESS_${String(baseDate || '').replace(/-/g, '')}`;

  return (
    <View>
      <PageHead
        title={TITLE}
        desc={`기준일 ${filters.baseDate} · Press 공정별 일목표 대비 실적과 주간 누적 달성률을 신호등으로 점검하는 아침회의 요약표입니다.`}
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
      ) : !report || !rows.length ? (
        // 조회 결과가 없어도 조회 조건은 그대로 두어 기준일·공정을 바꿀 수 있게 합니다
        <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />
      ) : (
        <ReportDoc nodeId={NODE_ID}>
          <ReportTitle
            dateBox={dateBoxOf(baseDate)}
            title="생산관리팀 (PRESS)"
            right={
              <>
                <SignalLegend />
                <Text style={[s.textXs, { fontWeight: '600', textDecorationLine: 'underline', marginTop: 4 }]}>{`${baseDate} 실적`}</Text>
              </>
            }
          />

          <Grid cols={4}>
            <StatCard label="일목표 합계" field="qty" value={kNum(sum.dayTarget)} unit="k" sub={`${rows.length}개 공정 · ${scopeLabel || 'Press 전체'}`} />
            <StatCard label="실적 합계" field="qty" value={kNum(sum.dayActual)} unit="k" sub={`목표 대비 ${mask('qty', `${gap >= 0 ? '+' : '-'}${kk(Math.abs(gap))}`)}`} tone={gap >= 0 ? 'up' : 'down'} />
            <StatCard label="평균 달성률" field="yield" value={fixed(sum.avgRate)} unit="%" sub={`주간누적 ${mask('yield', pct(sum.weekRate))}`} tone={Number(sum.avgRate) >= 95 ? 'up' : 'down'} />
            <StatCard label="이슈 건수" value={sum.issueCnt ?? counts.warn + counts.bad} unit="건" sub={`주의 ${counts.warn}건 · 위험 ${counts.bad}건`} tone="down" />
          </Grid>
          <Gap />

          <Card
            title="공정별 일일 실적 · 주간 누적"
            sub={`Press 공정 ${rows.length}건 · ${baseDate} 실적 기준`}
            tight
            right={
              <>
                <Badge tone="green">{`정상 ${counts.ok}`}</Badge>
                <Badge tone="amber">{`주의 ${counts.warn}`}</Badge>
                <Badge tone="red">{`위험 ${counts.bad}`}</Badge>
              </>
            }
          >
            <XlsTable
              columns={[
                { key: 'st', title: '상태', width: 62 },
                { key: 'proc', title: '공정/Process', width: 170, align: 'left' },
                { key: 'issue', title: '이슈 항목', width: 150, align: 'left' },
                { key: 'tgt', title: '일목표', width: 84 },
                { key: 'act', title: '실적', width: 84 },
                { key: 'rate', title: '달성률', width: 84 },
                { key: 'week', title: '주간누적', width: 230, align: 'left' },
                { key: 'eqpt', title: '영향범위 (생산장비)', width: 120 },
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
                    { v: `${rows.length}개 공정`, align: 'left' },
                    { v: '' },
                    { v: mask('qty', kk(total.dayTarget)), num: true },
                    { v: mask('qty', kk(total.dayActual)), num: true },
                    { v: mask('yield', pct(total.rate)), num: true },
                    { v: weekText(total), align: 'left' },
                    { v: `설비 ${comma(eqptTotal)}대` },
                    { v: `주의 ${counts.warn}건 · 위험 ${counts.bad}건`, align: 'left' },
                    { v: '생산관리' },
                    { v: total.due || '-' },
                  ],
                },
              ]}
            />
          </Card>
          <Gap />

          <Hint>달성률 95% 미만은 주의(노랑), 85% 미만은 위험(빨강)으로 자동 표시됩니다. 위험 행은 아침회의에서 DRI 와 기한을 반드시 확정합니다.</Hint>

          <Card title="금일 결정 사항 · DRI" sub={`${baseDate} 기준 · 담당자별 조치 항목과 기한`} tight>
            <Table
              minWidth={860}
              keyExtractor={(r, i) => `${r.team || 'dri'}-${i}`}
              emptyText="등록된 결정 사항이 없습니다."
              columns={[
                { key: 'team', title: 'DRI', width: 90, render: (r) => <Text style={s.td}>{r.team || '-'}</Text> },
                { key: 'action', title: '조치 항목', flex: 1, minWidth: 260, wrap: true },
                { key: 'detail', title: '내용', width: 200, render: (r) => <Text style={s.td}>{r.detail ?? '-'}</Text> },
                { key: 'dri', title: '담당', width: 100, render: (r) => <Text style={s.td}>{r.dri || '-'}</Text> },
                { key: 'due', title: '기한', width: 90, align: 'center', render: (r) => <Text style={[s.td, { textAlign: 'center' }]}>{r.due || '-'}</Text> },
              ]}
              rows={data?.decisions?.items || []}
            />
          </Card>

          <Text style={[s.sourceText, { marginTop: 12 }]}>
            일목표·실적은 MES 실적과 불량 이력에서 자동 집계됩니다. 결정항목·DRI·기한은 아침회의에서 확정합니다.
          </Text>
        </ReportDoc>
      )}
    </View>
  );
}
