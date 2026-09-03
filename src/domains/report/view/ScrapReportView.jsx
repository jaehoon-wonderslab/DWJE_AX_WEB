/**
 * [View] RP-06 폐기 보고서 (경로: /report/scrap)
 *
 * 폐기 수량과 금액을 결재 양식으로 정리한 문서입니다.
 * 금액 열은 원가(price) 열람 권한이 있는 계정에만 표시됩니다.
 * 사용 API 2건 — /api/v1/reports/scrap, /scrap/{docNo}
 *
 * 목록 응답 items[{docId,docNo,title,state,periodFrom,periodTo,generatedAt,confirmedAt,totalQty,totalAmt}]
 * 상세 응답 header{docNo,draft,review,approve,retention,…} · occurInfo{} · summary{totalQty,ngQty,lossQty,totalAmt} · rows[] · reviewOpinions[]
 */
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import ReportDoc from '@shared/components/layout/ReportDoc';
import { Badge, Button, Card, DateField, EmptyState, Filters, Hint, Loading, SelectField, StatCard, Table, XlsTable } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { downloadXls, printDocument } from '@shared/utils/exportUtil';
import { dateOnly, pctOf } from '../model/reportModel';

const NODE_ID = 'rpt-scrap-doc';

/** 문서 상태 → 배지 색 (RPT_DOC_STATE) */
const stateTone = (code) => ({ PUBLISHED: 'green', CONFIRMED: 'blue', REJECTED: 'red', SAVED: 'amber', DRAFT: 'amber' }[code] || '');

export default function ScrapReportView({
  loading, detail: data, docList = [], docOptions = [], stateLabel = (v) => v, originOptions = [],
  role, filters, setDocNo, setFrom, setTo, setOriginType, search,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen } = useAppNavigation();
  const canData = useAuthStore((state) => state.canData);

  const sum = data?.summary || {};
  const header = data?.header || {};
  const occ = data?.occurInfo || {};
  const rows = data?.rows || [];
  const models = data?.models || occ.models || [];
  const at = (k) => header[k] ?? occ[k] ?? '-';

  let blindCnt = 0;
  const masked = (ok, v) => {
    if (ok) return v;
    blindCnt += 1;
    return '비공개';
  };
  const qty = (v) => masked(canData('qty'), v);
  const price = (v) => masked(canData('price'), v);
  const cust = (v) => masked(canData('customer'), v);
  const ratio = (d) => (d.ratio !== undefined && d.ratio !== null ? `${Number(d.ratio).toFixed(1)}%` : pctOf(d.qty, sum.totalQty));
  const deadQty = sum.deadQty ?? sum.deadStockQty ?? 0;

  const exportHead = ['모델', '공정', '폐기 사유', '수량(EA)', '금액(원)', '비중(%)'];
  const exportRows = rows.map((d) => [d.model, d.process, d.reason, qty(comma(d.qty)), price(comma(d.amount)), ratio(d)]);

  const savedCnt = docList.filter((x) => !x.docNo).length;

  return (
    <View>
      <PageHead
        title="폐기 보고서"
        desc="공정별 불량·Loss·불용 재고의 폐기 수량과 금액을 결재 양식으로 정리한 문서입니다. 금액은 원가(price) 열람 권한이 있는 계정에만 표시됩니다."
        actions={
          <>
            <Button label="새 보고서 작성" size="sm" variant="primary" icon="plus" onPress={() => goToScreen('rpt-scrap-new')} />
            <Button label="인쇄 · PDF" size="sm" icon="printer" onPress={() => printDocument({ nodeId: NODE_ID, title: '폐기 보고서', role })} />
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={() => downloadXls({ name: `폐기 보고서_${header.docNo || filters.docNo || ''}`, head: exportHead, rows: exportRows, blindCount: blindCnt })} />
          </>
        }
      />

      <Filters>
        <SelectField label="문서번호" value={filters.docNo} options={docOptions} onChange={setDocNo} placeholder={docOptions.length ? '선택' : '문서 없음'} />
        <DateField label="발생 시작일" value={filters.from} onChange={setFrom} />
        <DateField label="발생 종료일" value={filters.to} onChange={setTo} />
        <SelectField label="발생 구분" value={filters.originType} options={originOptions} onChange={setOriginType} />
        <Button label="조회" variant="primary" onPress={search} />
      </Filters>

      {loading ? (
        <Loading />
      ) : (
        <>
          <Card title="폐기 보고서 목록" sub={`${filters.from} ~ ${filters.to} · ${docList.length}건${savedCnt ? ` (임시 저장 ${savedCnt}건은 '새 보고서 작성'에서 이어서 작성합니다)` : ''}`} tight>
            <Table
              minWidth={900}
              keyExtractor={(r) => String(r.docId ?? r.docNo)}
              emptyText="조회 조건에 해당하는 폐기 보고서가 없습니다."
              onRowPress={(r) => (r.docNo ? setDocNo(r.docNo) : null)}
              columns={[
                { key: 'docNo', title: '문서번호', width: 150, mono: true, render: (r) => <Text style={[s.td, s.mono]}>{r.docNo || '(미확정)'}</Text> },
                { key: 'title', title: '제목', flex: 1, minWidth: 220, wrap: true },
                { key: 'state', title: '상태', width: 96, render: (r) => <Badge tone={stateTone(r.state)}>{stateLabel(r.state)}</Badge> },
                { key: 'periodFrom', title: '발생 기간', width: 200, render: (r) => <Text style={s.td}>{`${dateOnly(r.periodFrom)} ~ ${dateOnly(r.periodTo)}`}</Text> },
                { key: 'totalQty', title: '폐기 수량', width: 110, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{qty(comma(r.totalQty))}</Text> },
                { key: 'totalAmt', title: '금액(원)', width: 120, align: 'right', render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{price(comma(r.totalAmt))}</Text> },
                { key: 'generatedAt', title: '생성일', width: 110, render: (r) => <Text style={s.td}>{dateOnly(r.generatedAt)}</Text> },
              ]}
              rows={docList}
            />
          </Card>
          <Gap />

          {!data ? (
            <EmptyState text={docList.length ? '문서번호가 확정된 폐기 보고서가 없습니다. 임시 저장 초안은 위저드에서 이어서 작성해 생성하세요.' : '조회 조건에 해당하는 자료가 없습니다.'} />
          ) : (
            <ReportDoc nodeId={NODE_ID}>
              <Grid cols={4}>
                <StatCard label="총 폐기수량" field="qty" value={comma(sum.totalQty)} unit="EA" sub={`${at('occurPeriod')} · 전 공정 합계`} />
                <StatCard label="공정불량" field="qty" value={comma(sum.ngQty)} unit="EA" sub={`전체의 ${pctOf(sum.ngQty, sum.totalQty)}`} tone="down" />
                <StatCard label="Loss" field="qty" value={comma(sum.lossQty)} unit="EA" sub={`전체의 ${pctOf(sum.lossQty, sum.totalQty)}`} />
                <StatCard label="폐기 금액" field="price" value={comma(sum.totalAmt)} unit="원" sub="원가 기준정보 자동 산출" tone="down" />
              </Grid>
              <Gap />

              {/* 결재 양식 */}
              <View style={[s.doc, s.docWide]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                  <View>
                    <Text style={[s.textXs, { fontWeight: '600' }]}>문서번호</Text>
                    <Text style={[s.textSm, s.mono]}>{header.docNo || '-'}</Text>
                  </View>
                  <View>
                    <Text style={[s.textXs, { fontWeight: '600' }]}>보존기간</Text>
                    <Text style={s.textSm}>{header.retention || '-'}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: 8, color: theme.color.foreground }}>폐기 보고서</Text>
                    <Text style={[s.textXs, { marginTop: 6 }]}>{header.origin || occ.origin || filters.originType}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[['기 안', header.draft], ['검 토', header.review], ['승 인', header.approve]].map(([label, who]) => (
                      <View key={label} style={{ borderWidth: 1, borderColor: theme.color.border, width: 72, height: 62, alignItems: 'center', paddingTop: 4, justifyContent: 'space-between', paddingBottom: 4 }}>
                        <Text style={[s.textXs, { fontWeight: '600' }]}>{label}</Text>
                        <Text style={[s.textXs, { fontSize: 10.5 }]} numberOfLines={1}>{who || ''}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <InfoGrid
                  rows={[
                    ['불량내용', at('description'), 3],
                    ['모 델 명', at('models') !== '-' && Array.isArray(at('models')) ? at('models').map((m) => m.name || m).join(', ') : at('modelNames') !== '-' ? at('modelNames') : (models.map((m) => m.name || m.no).join(', ') || '-'), 1],
                    ['발생공정', at('process'), 1],
                    ['발생 일자', at('occurPeriod'), 1],
                    ['업 체 명', cust(at('vendor')), 1],
                    ['제조일자', at('mfgPeriod'), 1],
                    ['발생 수량', `${qty(comma(sum.totalQty))} pcs`, 1],
                    ['제 조 자', at('maker'), 1],
                    ['작 성 자', at('writer'), 1],
                    ['작성일자', at('writeDate'), 1],
                  ]}
                />

                {/* 공정별 폐기 발생 내용 */}
                <Text style={[s.docSectionTitle, { textAlign: 'center', marginTop: 16, marginBottom: 10 }]}>공정별 폐기 발생 내용</Text>
                <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 300 }}>
                    <Text style={[s.textSm, { fontWeight: '700', marginBottom: 6 }]}>▶ 불량 내용</Text>
                    <DocLine label="1. 각 공정의 불량 제품, Loss, 불용 재고" value={`${qty(comma(sum.totalQty))} pcs`} />
                    <DocLine label="   - 공정불량 :" value={qty(`${comma(sum.ngQty)}EA`)} indent />
                    <DocLine label="   - 불용 재고 :" value={Number(deadQty) === 0 ? '-' : qty(`${comma(deadQty)}EA`)} indent />
                    <DocLine label="   - Loss :" value={qty(`${comma(sum.lossQty)}EA`)} indent />

                    <Text style={[s.textSm, { fontWeight: '700', marginTop: 16, marginBottom: 6 }]}>▶ 주요 모델별 발생수량</Text>
                    {models.length ? (
                      models.map((m, i) => <DocLine key={`${m.no ?? m.name ?? i}`} label={`- ${m.no ?? i + 1} (${m.name ?? '-'})`} value={qty(comma(m.qty))} />)
                    ) : (
                      <DocLine label="- 모델별 내역은 아래 표를 참고" value="" />
                    )}

                    <Text style={[s.textSm, { fontWeight: '700', marginTop: 16, marginBottom: 6 }]}>▶ 폐기 금액</Text>
                    <DocLine label="- 원가 기준정보 환산 합계" value={price(`${comma(sum.totalAmt)}원`)} />
                  </View>

                  <View style={{ width: 210 }}>
                    <Text style={[s.textSm, { fontWeight: '600' }]}>모델별 불량 수량(불용재고 포함)</Text>
                    <Text style={[s.textXs, { marginTop: 6 }]}>
                      {`공정불량 ${pctOf(sum.ngQty, sum.totalQty)} · Loss ${pctOf(sum.lossQty, sum.totalQty)}`}
                    </Text>
                    {models.length ? (
                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.color.border }}>
                        <Text style={s.textXs}>
                          {`주요 ${models.length}개 모델이 전체 폐기수량의 ${pctOf(models.reduce((a, m) => a + (Number(m.qty) || 0), 0), sum.totalQty)} 를 차지합니다.`}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* 검토 의견 4칸 */}
                <Text style={[s.docSectionTitle, { marginTop: 20, marginBottom: 10 }]}>검토 의견</Text>
                {(data.reviewOpinions || []).length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {(data.reviewOpinions || []).map((op, i) => (
                      <OpinionBox key={op.no ?? i} no={op.no ?? i + 1} dept={op.dept} placeholder={op.placeholder} initial={op.opinion || op.content || ''} />
                    ))}
                  </View>
                ) : (
                  <Text style={s.textXs}>검토 요청 부서가 지정되지 않았습니다. 위저드 4단계(검토·결재선)에서 지정합니다.</Text>
                )}
              </View>
              <Gap />

              <Hint>
                폐기 수량은 MES 공정별 불량·Loss 실적에서 자동 집계되며, 검토 의견 4개 칸은 팀별 담당자가 직접 입력합니다. 금액 열은 원가 열람 권한이 있는 계정에만 표시됩니다.
              </Hint>

              <Card
                title="모델별 폐기 내역"
                sub={`${at('occurPeriod')} · 모델 · 공정 · 폐기 사유별 상세`}
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
                    { key: 'process', title: '공정', width: 150 },
                    { key: 'reason', title: '폐기 사유', width: 300, align: 'left' },
                    { key: 'qty', title: '수량(EA)', width: 116 },
                    { key: 'amount', title: '금액(원)', width: 130 },
                    { key: 'ratio', title: '비중(%)', width: 84 },
                  ]}
                  rows={[
                    ...rows.map((d, i) => ({
                      key: `${d.model}-${i}`,
                      cells: [
                        { v: d.model || '-', align: 'left', bold: true },
                        { v: d.process || '-' },
                        { v: d.reason || '-', align: 'left' },
                        { v: qty(comma(d.qty)), num: true },
                        { v: price(comma(d.amount)), num: true },
                        { v: ratio(d), num: true },
                      ],
                    })),
                    {
                      key: '__total',
                      tone: 'total',
                      cells: [
                        { v: '합계', align: 'left' },
                        { v: '전 공정' },
                        { v: `${rows.length}개 항목`, align: 'left' },
                        { v: qty(comma(rows.reduce((a, d) => a + (Number(d.qty) || 0), 0))), num: true },
                        { v: price(comma(rows.reduce((a, d) => a + (Number(d.amount) || 0), 0))), num: true },
                        { v: rows.length ? '100.0%' : '-', num: true },
                      ],
                    },
                  ]}
                />
              </Card>

              <Text style={[s.sourceText, { marginTop: 12 }]}>
                폐기 수량은 MES 불량/Loss 실적에서, 금액은 원가 기준정보에서 자동 산출됩니다.
              </Text>
            </ReportDoc>
          )}
        </>
      )}
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
            <Text style={s.textXs}>{value === null || value === undefined || value === '' ? '-' : String(value)}</Text>
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

/** 팀별 검토 의견 입력 칸 (화면 로컬 — 저장은 위저드 4단계와 서버 reviewOpinions 로 관리) */
function OpinionBox({ no, dept, placeholder, initial = '' }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [text, setText] = useState(initial);
  return (
    <View style={{ flexGrow: 1, flexBasis: 320, borderWidth: 1, borderColor: theme.color.border }}>
      <Text style={[s.textXs, { fontWeight: '700', padding: 8, borderBottomWidth: 1, borderBottomColor: theme.color.border }]}>
        {`${no}. ${dept || '-'} 검토 내용`}
      </Text>
      <TextInput style={[s.editable, { minHeight: 104, margin: 5 }]} multiline value={text} onChangeText={setText} placeholder={placeholder || '검토 의견을 입력하세요'} placeholderTextColor={theme.color.mutedForeground} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderTopWidth: 1, borderTopColor: theme.color.border }}>
        <Text style={[s.textXs, { fontWeight: '600' }]}>팀장</Text>
        <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: theme.color.border, borderStyle: 'dotted', height: 12 }} />
        <Text style={s.textXs}>(인)</Text>
      </View>
    </View>
  );
}
