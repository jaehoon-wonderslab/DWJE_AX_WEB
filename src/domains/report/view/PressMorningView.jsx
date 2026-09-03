/**
 * [View] RP-01 아침회의 자료 (PRESS) (경로: /report/press-morning)
 *
 * 신호등 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험
 * 사용 API 2건 — /api/v1/reports/press-morning, /decisions
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

const NODE_ID = 'rpt-press-morning-doc';

export default function PressMorningView({ loading, data, role, reportName, filters, setBaseDate, setProcessScope, setState, search }) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);

  if (loading) return <Loading />;
  // 조회 결과가 없어도 로딩 화면에 머무르지 않습니다 — 빈 상태로 알려 줍니다
  if (!data?.report) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;

  const report = data.report;
  const rows = report.rows || [];
  const sum = report.summary || {};
  const total = report.total || {};
  const mask = (field, v) => (canData(field) ? v : '비공개');
  const kk = (n) => `${comma(n)}k`;

  const exportHead = ['상태', '공정', '이슈 항목', '일목표', '실적', '달성률', '주간누적', '영향범위', '결정항목', 'DRI', '기한'];
  const exportRows = rows.map((r) => [
    r.signal.label, 'Press', r.model, kk(r.dayTarget), kk(r.dayActual), `${fixed(r.rate)}%`,
    `${kk(r.weekTarget)} / ${kk(r.weekActual)} / ${fixed(r.weekRate)}%`, `Press ${r.impactEqptCnt}대`, r.decision, r.dri, r.due,
  ]);

  return (
    <View>
      <PageHead
        title="아침회의 자료 (PRESS)"
        desc={`기준일 ${filters.baseDate} · Press 공정 모델별 일목표 대비 실적과 주간 누적 달성률을 신호등으로 점검하는 아침회의 요약표입니다.`}
        actions={
          <>
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: '아침회의 자료 (PRESS)', role })} />
            <Button label="CSV" size="sm" icon="download" onPress={() => downloadCsv({ name: '아침회의자료_PRESS_20260821', head: exportHead, rows: exportRows })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: '아침회의 자료 (PRESS)', head: exportHead, rows: exportRows })} />
          </>
        }
      />

      <Filters>
        <DateField label="기준일" value={filters.baseDate} onChange={setBaseDate} />
        <SelectField label="공정" value={filters.processScope} options={['Press 전체', 'Press 1~5호기', 'Press 6~10호기']} onChange={setProcessScope} />
        <SelectField label="상태" value={filters.state} options={['전체', '정상', '주의', '위험']} onChange={setState} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <ReportDoc nodeId={NODE_ID}>
        <ReportTitle
          dateBox="26.08.21"
          title="생산관리팀 (PRESS)"
          right={
            <>
              <SignalLegend />
              <Text style={[s.textXs, { fontWeight: '600', textDecorationLine: 'underline', marginTop: 4 }]}>{`${data.actualDate}실적`}</Text>
            </>
          }
        />

        <Grid cols={4}>
          <StatCard label="일목표 합계" field="qty" value={comma(sum.dayTarget)} unit="k" sub="8개 모델 · Press 전체" />
          <StatCard label="실적 합계" field="qty" value={comma(sum.dayActual)} unit="k" sub={`목표 대비 +${comma(sum.dayActual - sum.dayTarget)}k`} tone="up" />
          <StatCard label="평균 달성률" field="yield" value={fixed(sum.avgRate)} unit="%" sub={`주간누적 ${mask('yield', `${fixed(sum.weekRate)}%`)}`} tone="up" />
          <StatCard label="이슈 건수" value={sum.issueCnt} unit="건" sub={`주의 ${sum.warnCnt}건 · 위험 ${sum.badCnt}건`} tone="down" />
        </Grid>
        <Gap />

        <Card
          title="모델별 일일 실적 · 주간 누적"
          sub={`Press 공정 ${rows.length}개 모델 · ${data.actualDate} 실적 기준`}
          tight
          right={
            <>
              <Badge tone="green">{`정상 ${sum.okCnt}`}</Badge>
              <Badge tone="amber">{`주의 ${sum.warnCnt}`}</Badge>
              <Badge tone="red">{`위험 ${sum.badCnt}`}</Badge>
            </>
          }
        >
          <XlsTable
            columns={[
              { key: 'st', title: '상태', width: 62 },
              { key: 'proc', title: '공정/Process', width: 92 },
              { key: 'model', title: '이슈 항목', width: 110, align: 'left' },
              { key: 'tgt', title: '일목표', width: 84 },
              { key: 'act', title: '실적', width: 84 },
              { key: 'rate', title: '달성률', width: 84 },
              { key: 'week', title: '주간누적', width: 150, align: 'left' },
              { key: 'eqpt', title: '영향범위 (생산장비)', width: 130 },
              { key: 'memo', title: '결정항목 / 기타', width: 330, align: 'left' },
              { key: 'dri', title: 'DRI', width: 70 },
              { key: 'due', title: '기한', width: 62 },
            ]}
            rows={[
              ...rows.map((r) => ({
                key: r.model,
                cells: [
                  { v: r.signal.label, tone: r.signal.tone, bold: true },
                  { v: 'Press' },
                  { v: r.model, align: 'left', bold: true },
                  { v: mask('qty', kk(r.dayTarget)), num: true },
                  { v: mask('qty', kk(r.dayActual)), num: true },
                  { v: mask('yield', `${fixed(r.rate)}%`), num: true },
                  { v: `주간목표 ${mask('qty', kk(r.weekTarget))} / 실적 ${mask('qty', kk(r.weekActual))} / ${mask('yield', `${fixed(r.weekRate)}%`)}`, align: 'left' },
                  { v: `Press ${r.impactEqptCnt}대` },
                  { v: r.decision, align: 'left', wrap: true },
                  { v: r.dri },
                  { v: r.due },
                ],
              })),
              {
                key: '__total',
                tone: 'total',
                cells: [
                  { v: '합계' },
                  { v: 'Press' },
                  { v: `${total.modelCnt}개 모델`, align: 'left' },
                  { v: mask('qty', kk(total.dayTarget)), num: true },
                  { v: mask('qty', kk(total.dayActual)), num: true },
                  { v: mask('yield', `${fixed(total.rate)}%`), num: true },
                  { v: `주간목표 ${mask('qty', kk(total.weekTarget))} / 실적 ${mask('qty', kk(total.weekActual))} / ${mask('yield', `${fixed(total.weekRate)}%`)}`, align: 'left' },
                  { v: `Press ${total.eqptCnt}대` },
                  { v: `주의 ${sum.warnCnt}건 · 위험 ${sum.badCnt}건`, align: 'left' },
                  { v: '생산관리' },
                  { v: '8/23' },
                ],
              },
            ]}
          />
        </Card>
        <Gap />

        <Hint>달성률 95% 미만은 주의(노랑), 85% 미만은 위험(빨강)으로 자동 표시됩니다. 위험 행은 아침회의에서 DRI 와 기한을 반드시 확정합니다.</Hint>

        <Card title="금일 결정 사항 · DRI" sub="제조1 / 제조2 / 제조3 담당자별 조치 항목 · 기한 8/23" tight>
          <Table
            minWidth={960}
            keyExtractor={(r, i) => `${r.team}-${i}`}
            columns={[
              { key: 'team', title: 'DRI', width: 74 },
              { key: 'action', title: '조치 항목', flex: 1, minWidth: 340, wrap: true },
              { key: 'model', title: '관련 모델', width: 150 },
              { key: 'eqpt', title: '영향 장비', width: 100 },
              { key: 'due', title: '기한', width: 70, align: 'center' },
              {
                key: 'state',
                title: '상태',
                width: 84,
                render: (r) => (
                  <Badge tone={r.state === '정상' ? 'green' : r.state === '주의' ? 'amber' : r.state === '위험' ? 'red' : 'blue'}>{r.state}</Badge>
                ),
              },
            ]}
            rows={data.decisions?.items || []}
          />
        </Card>

        <Text style={[s.sourceText, { marginTop: 12 }]}>
          프로토타입 — 표시 데이터는 샘플입니다. 실제 운영 시 MES 실적·IoT 수량이 자동 집계됩니다.
        </Text>
      </ReportDoc>
    </View>
  );
}
