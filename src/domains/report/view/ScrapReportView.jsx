/**
 * [View] RP-06 폐기 보고서 (경로: /report/scrap)
 *
 * 폐기 수량과 금액을 결재 양식으로 정리한 문서입니다.
 * 금액 열은 원가(price) 열람 권한이 있는 계정에만 표시됩니다.
 * 사용 API 2건 — /api/v1/reports/scrap, /scrap/{docNo}
 */
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import ReportDoc from '@shared/components/layout/ReportDoc';
import { Badge, Button, Card, DateField, EmptyState, Filters, Hint, Loading, SelectField, StatCard, XlsTable } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { downloadXls, printDocument } from '@shared/utils/exportUtil';

const NODE_ID = 'rpt-scrap-doc';

export default function ScrapReportView({ loading, detail: data, docList, role, filters, setDocNo, setFrom, setTo, setOriginType, search }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const canData = useAuthStore((state) => state.canData);

  if (loading) return <Loading />;
  // 조회 결과가 없어도 로딩 화면에 머무르지 않습니다 — 빈 상태로 알려 줍니다
  if (!data) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;

  const sum = data.summary || {};
  const header = data.header || {};
  const rows = data.rows || [];
  const qty = (v) => (canData('qty') ? v : '비공개');
  const price = (v) => (canData('price') ? v : '비공개');
  const cust = (v) => (canData('customer') ? v : '비공개');
  const ratio = (v) => `${((v / sum.totalQty) * 100).toFixed(1)}%`;

  const exportHead = ['모델', '공정', '폐기 사유', '수량(EA)', '금액(원)', '비중(%)'];
  const exportRows = rows.map((d) => [d.model, d.process, d.reason, d.qty, d.amount, ratio(d.qty)]);

  return (
    <View>
      <PageHead
        title="폐기 보고서"
        desc={`${header.occurPeriod} 전 공정에서 발생한 치수 Spec Out 불량·Loss·불용 재고의 폐기 수량과 금액을 결재 양식으로 정리한 문서입니다.`}
        actions={
          <>
            <Button label="새 보고서 작성" size="sm" variant="primary" icon="plus" onPress={() => goToScreen('rpt-scrap-new')} />
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: '폐기 보고서', role })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: '폐기 보고서', head: exportHead, rows: exportRows })} />
          </>
        }
      />

      <Filters>
        <SelectField label="문서번호" value={filters.docNo} options={docList.map((x) => x.docNo)} onChange={setDocNo} />
        <DateField label="발생 시작일" value={filters.from} onChange={setFrom} />
        <DateField label="발생 종료일" value={filters.to} onChange={setTo} />
        <SelectField label="발생 구분" value={filters.originType} options={['제조공정 발생', '협력업체 발생', 'IQC 발생']} onChange={setOriginType} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      <ReportDoc nodeId={NODE_ID}>
        <Grid cols={4}>
          <StatCard label="총 폐기수량" field="qty" value={comma(sum.totalQty)} unit="EA" sub={`${header.occurPeriod} · 전 공정 합계`} />
          <StatCard label="공정불량" field="qty" value={comma(sum.ngQty)} unit="EA" sub={`전체의 ${fixed((sum.ngQty / sum.totalQty) * 100)}%`} tone="down" />
          <StatCard label="Loss" field="qty" value={comma(sum.lossQty)} unit="EA" sub={`전체의 ${fixed((sum.lossQty / sum.totalQty) * 100)}%`} />
          <StatCard label="폐기 금액" field="price" value={comma(sum.totalAmt)} unit="원" sub="원가 기준정보 자동 산출" tone="down" />
        </Grid>
        <Gap />

        {/* 결재 양식 */}
        <View style={[s.doc, s.docWide]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <View>
              <Text style={[s.textXs, { fontWeight: '600' }]}>문서번호</Text>
              <Text style={[s.textSm, s.mono]}>{header.docNo}</Text>
            </View>
            <View>
              <Text style={[s.textXs, { fontWeight: '600' }]}>보존기간</Text>
              <Text style={s.textSm}>{header.retention}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: 8, color: theme.color.foreground }}>폐기 보고서</Text>
              <Text style={[s.textXs, { marginTop: 6 }]}>{header.origin}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['기 안', '검 토', '승 인'].map((label) => (
                <View key={label} style={{ borderWidth: 1, borderColor: theme.color.border, width: 64, height: 62, alignItems: 'center', paddingTop: 4 }}>
                  <Text style={[s.textXs, { fontWeight: '600' }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <InfoGrid
            rows={[
              ['불량내용', header.description, 3],
              ['모 델 명', header.models, 1],
              ['발생공정', header.process, 1],
              ['발생 일자', header.occurPeriod, 1],
              ['업 체 명', cust(header.vendor), 1],
              ['제조일자', header.mfgPeriod, 1],
              ['발생 수량', `${qty(comma(sum.totalQty))} pcs`, 1],
              ['제 조 자', header.maker, 1],
              ['작 성 자', header.writer, 1],
              ['작성일자', header.writeDate, 1],
            ]}
          />

          {/* 공정별 폐기 발생 내용 */}
          <Text style={[s.docSectionTitle, { textAlign: 'center', marginTop: 16, marginBottom: 10 }]}>공정별 폐기 발생 내용</Text>
          <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 300 }}>
              <Text style={[s.textSm, { fontWeight: '700', marginBottom: 6 }]}>▶ 불량 내용</Text>
              <DocLine label="1. 각 공정의 불량 제품, Loss, 불용 재고" value={`${qty(comma(sum.totalQty))} pcs`} />
              <DocLine label="   - 공정불량 :" value={qty(`${comma(sum.ngQty)}EA`)} indent />
              <DocLine label="   - 불용 재고 :" value={sum.deadQty === 0 ? '-' : qty(`${comma(sum.deadQty)}EA`)} indent />
              <DocLine label="   - Loss :" value={qty(`${comma(sum.lossQty)}EA`)} indent />

              <Text style={[s.textSm, { fontWeight: '700', marginTop: 16, marginBottom: 6 }]}>▶ 주요 모델별 발생수량</Text>
              {(data.models || []).map((m) => (
                <DocLine key={m.no} label={`- ${m.no} (${m.name})`} value={qty(comma(m.qty))} />
              ))}

              <Text style={[s.textSm, { fontWeight: '700', marginTop: 16, marginBottom: 6 }]}>▶ 폐기 금액</Text>
              <DocLine label="- 원가 기준정보 환산 합계" value={price(`${comma(sum.totalAmt)}원`)} />
            </View>

            <View style={{ width: 210 }}>
              <Text style={[s.textSm, { fontWeight: '600' }]}>모델별 불량 수량(불용재고 포함)</Text>
              <Text style={[s.textXs, { marginTop: 6 }]}>
                {`공정불량 ${fixed((sum.ngQty / sum.totalQty) * 100)}% · Loss ${fixed((sum.lossQty / sum.totalQty) * 100)}%`}
              </Text>
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.color.border }}>
                <Text style={s.textXs}>
                  {`주요 4개 모델이 전체 폐기수량의 ${fixed(((data.models || []).reduce((a, m) => a + m.qty, 0) / sum.totalQty) * 100)}% 를 차지합니다.`}
                </Text>
              </View>
            </View>
          </View>

          {/* 검토 의견 4칸 */}
          <Text style={[s.docSectionTitle, { marginTop: 20, marginBottom: 10 }]}>검토 의견</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(data.reviewOpinions || []).map((op) => (
              <OpinionBox key={op.no} no={op.no} dept={op.dept} placeholder={op.placeholder} />
            ))}
          </View>
        </View>
        <Gap />

        <Hint>
          폐기 수량은 MES 공정별 불량·Loss 실적에서 자동 집계되며, 검토 의견 4개 칸은 팀별 담당자가 직접 입력합니다. 금액 열은 원가 열람 권한이 있는 계정에만 표시됩니다.
        </Hint>

        <Card
          title="모델별 폐기 내역"
          sub={`${header.occurPeriod} · 모델 · 공정 · 폐기 사유별 상세`}
          tight
          right={
            <>
              <Badge tone="red">{`폐기 ${qty(comma(sum.totalQty))} EA`}</Badge>
              <Badge tone="amber">{`금액 ${price(comma(sum.totalAmt))} 원`}</Badge>
            </>
          }
        >
          <XlsTable
            columns={[
              { key: 'model', title: '모델', width: 180, align: 'left' },
              { key: 'process', title: '공정', width: 90 },
              { key: 'reason', title: '폐기 사유', width: 300, align: 'left' },
              { key: 'qty', title: '수량(EA)', width: 116 },
              { key: 'amount', title: '금액(원)', width: 130 },
              { key: 'ratio', title: '비중(%)', width: 84 },
            ]}
            rows={[
              ...rows.map((d, i) => ({
                key: `${d.model}-${i}`,
                cells: [
                  { v: d.model, align: 'left', bold: true },
                  { v: d.process },
                  { v: d.reason, align: 'left' },
                  { v: qty(comma(d.qty)), num: true },
                  { v: price(comma(d.amount)), num: true },
                  { v: ratio(d.qty), num: true },
                ],
              })),
              {
                key: '__total',
                tone: 'total',
                cells: [
                  { v: '합계', align: 'left' },
                  { v: '전 공정' },
                  { v: `${rows.length}개 항목 · 치수 Spec Out 외`, align: 'left' },
                  { v: qty(comma(rows.reduce((a, d) => a + d.qty, 0))), num: true },
                  { v: price(comma(rows.reduce((a, d) => a + d.amount, 0))), num: true },
                  { v: '100.0%', num: true },
                ],
              },
            ]}
          />
        </Card>

        <Text style={[s.sourceText, { marginTop: 12 }]}>
          프로토타입 — 표시 데이터는 샘플입니다. 폐기 수량은 MES 불량/Loss 실적에서, 금액은 원가 기준정보에서 자동 산출됩니다.
        </Text>
      </ReportDoc>
    </View>
  );
}

/** 결재 양식 상단의 라벨-값 격자 */
function InfoGrid({ rows }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: theme.color.border }}>
      {rows.map(([label, value, span]) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            width: span === 3 ? '100%' : '33.33%',
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.color.border,
          }}
        >
          <View style={{ width: 82, backgroundColor: theme.color.muted, padding: 6, justifyContent: 'center' }}>
            <Text style={[s.textXs, { fontWeight: '600', textAlign: 'center', color: theme.color.foreground }]}>{label}</Text>
          </View>
          <View style={{ flex: 1, padding: 6, justifyContent: 'center' }}>
            <Text style={s.textXs}>{value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function DocLine({ label, value, indent }) {
  const s = useCommonStyles();
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 2, paddingLeft: indent ? 14 : 0 }}>
      <Text style={[s.textXs, { flex: 1 }]}>{label}</Text>
      <Text style={[s.textXs, s.mono, { width: 140, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

/** 팀별 검토 의견 입력 칸 */
function OpinionBox({ no, dept, placeholder }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [text, setText] = useState('');
  return (
    <View style={{ flexGrow: 1, flexBasis: 320, borderWidth: 1, borderColor: theme.color.border }}>
      <Text style={[s.textXs, { fontWeight: '700', padding: 8, borderBottomWidth: 1, borderBottomColor: theme.color.border }]}>
        {`${no}. ${dept} 검토 내용`}
      </Text>
      <TextInput style={[s.editable, { minHeight: 104, margin: 5 }]} multiline value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={theme.color.mutedForeground} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderTopWidth: 1, borderTopColor: theme.color.border }}>
        <Text style={[s.textXs, { fontWeight: '600' }]}>팀장</Text>
        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: theme.color.border, borderStyle: 'dotted', height: 12 }} />
        <Text style={s.textXs}>(인)</Text>
      </View>
    </View>
  );
}
