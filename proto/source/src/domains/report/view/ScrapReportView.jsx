/**
 * [View] RP-06 폐기 보고서 (경로: /report/scrap)
 *
 * 「품질팀_폐기보고서」 양식(`보고서 스크린샷/품질팀_폐기보고서.png`)을 그대로 옮긴 화면입니다.
 *
 * **결재·발행·인쇄를 앱에서 하지 않습니다**(2026-09-04) — 양식과 내용만 채워 엑셀로 내려받고,
 * 결재란과 검토 의견은 내려받은 파일에서 채웁니다. 그래서 화면의 결재란·검토 의견은 **빈칸**입니다.
 *
 * 사용 API 1건 — /api/v1/reports/scrap/mes-vouchers (+ 공정 선택지용 공정 마스터)
 */
import React from 'react';
import { Text, View } from 'react-native';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, BlindValue, Button, Card, CheckRow, DateField, Hint, Loading, SelectField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { VOUCHER_ORIGIN_TYPES } from '../model/reportModel';
import { REVIEW_TEAMS } from '../controller/useScrapReportController';

export default function ScrapReportView({
  loading, from, setFrom, to, setTo, processId, setProcessId, processOptions,
  origins, toggleOrigin, head, sheet, exportExcel,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  /** 양식 칸 — 스크린샷의 얇은 실선 표를 흉내 냅니다 */
  const line = { borderColor: theme.color.border, borderWidth: 0.5 };
  const Cell = ({ label, children, flex = 1, labelWidth = 84 }) => (
    <View style={{ flexDirection: 'row', flex, minWidth: 220 }}>
      <View style={[line, { width: labelWidth, backgroundColor: theme.alpha('muted', 0.5), padding: 6, justifyContent: 'center' }]}>
        <Text style={[s.textXs, { fontWeight: '700', textAlign: 'center' }]}>{label}</Text>
      </View>
      <View style={[line, { flex: 1, padding: 6, justifyContent: 'center' }]}>
        {typeof children === 'string' ? <Text style={s.textXs}>{children}</Text> : children}
      </View>
    </View>
  );

  /** 엑셀에서 손으로 채우는 칸 — 서버에 근거 데이터가 없습니다 */
  const byHand = <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>엑셀에서 기입</Text>;
  const qtyOf = (n) => <BlindValue field="qty" value={`${comma(n)} EA`} textStyle={s.textXs} />;

  return (
    <View>
      <PageHead
        title="폐기 보고서"
        desc="폐기 수량을 결재 양식으로 정리합니다. 결재·인쇄는 내려받은 엑셀 파일에서 진행합니다."
        actions={<Button label="엑셀 다운로드" size="sm" icon="download" variant="primary" onPress={exportExcel} disabled={!sheet?.voucherCnt} />}
      />

      <View style={[s.filters, { position: 'relative', zIndex: 100 }]}>
        <DateField label="발생일자 (시작)" value={from} onChange={setFrom} style={{ minWidth: 168 }} />
        <DateField label="발생일자 (종료)" value={to} onChange={setTo} style={{ minWidth: 168 }} />
        <SelectField label="발생공정" value={processId} options={processOptions} onChange={setProcessId} style={{ minWidth: 240 }} />
      </View>

      <View style={[s.filters, { marginTop: -6 }]}>
        <Text style={[s.textXs, { fontWeight: '700', alignSelf: 'center', marginRight: 4 }]}>발생 구분</Text>
        {VOUCHER_ORIGIN_TYPES.map((name) => (
          <CheckRow key={name} label={name} checked={origins.includes(name)} onToggle={() => toggleOrigin(name)} />
        ))}
      </View>

      <Hint>결재란과 검토 의견은 비워 둡니다. 엑셀로 내려받아 그 파일에서 채우고 결재·인쇄하시면 됩니다.</Hint>

      {loading && !sheet ? (
        <Loading />
      ) : (
        <Card tight>
          <View style={{ padding: 14 }}>
            {/* ───── 양식 머리 ───── */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Cell label="문서번호" flex={1}>{byHand}</Cell>
              <View style={[line, { flex: 1.4, minWidth: 220, padding: 8, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: theme.color.foreground, letterSpacing: 2 }}>폐기 보고서</Text>
              </View>
              <View style={{ flexDirection: 'row', minWidth: 220, flex: 1 }}>
                <View style={[line, { width: 28, backgroundColor: theme.alpha('muted', 0.5), alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={[s.textXs, { fontWeight: '700' }]}>결{'\n'}재</Text>
                </View>
                {['기 안', '검 토', '승 인'].map((k) => (
                  <View key={k} style={[line, { flex: 1 }]}>
                    <View style={[line, { borderWidth: 0, borderBottomWidth: 0.5, padding: 4, alignItems: 'center' }]}>
                      <Text style={s.textXs}>{k}</Text>
                    </View>
                    <View style={{ height: 34 }} />
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Cell label="보존기한" flex={1}>{head.keepYears}</Cell>
              <Cell label="" labelWidth={0} flex={2}>
                <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                  {VOUCHER_ORIGIN_TYPES.map((name) => (
                    <Text key={name} style={s.textXs}>{`${origins.includes(name) ? '■' : '□'} ${name}`}</Text>
                  ))}
                </View>
              </Cell>
            </View>

            <Cell label="불량내용" labelWidth={84}>{head.defectNote}</Cell>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Cell label="모델명">{head.modelNm}</Cell>
              <Cell label="발생공정">{head.processNm}</Cell>
              <Cell label="발생일자">
                <Text style={[s.textXs, { backgroundColor: theme.alpha('warning', 0.35) }]}>{head.occurRange}</Text>
              </Cell>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Cell label="업체명">{byHand}</Cell>
              <Cell label="제조일자">{head.occurRange}</Cell>
              <Cell label="발생수량">
                <BlindValue field="qty" value={`${comma(head.totalQty)} pcs`} textStyle={s.textXs} />
              </Cell>
            </View>

            {/* ───── 본문 ───── */}
            <View style={[line, { backgroundColor: theme.alpha('muted', 0.5), padding: 6, alignItems: 'center' }]}>
              <Text style={[s.textXs, { fontWeight: '700' }]}>공정별 폐기 발생 내용</Text>
            </View>

            <View style={{ flexDirection: 'row' }}>
              <View style={[line, { width: 84, backgroundColor: theme.alpha('muted', 0.5), alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[s.textXs, { fontWeight: '700' }]}>폐 기 의 뢰</Text>
              </View>
              <View style={[line, { flex: 1, padding: 12, gap: 12 }]}>
                <Section title="▶ 불량 내용">
                  <Row label="1. 각 공정의 불량 제품, Loss, 불용 재고" value={<BlindValue field="qty" value={`${comma(head.totalQty)} pcs`} textStyle={s.textXs} />} note="모델별 불량 수량(불용재고 포함)" />
                  <Row label="- 공정불량" value={qtyOf(sheet?.kinds?.DEFECT ?? 0)} note="불량 이력이 붙는 전표" />
                  <Row label="- 그 밖 (불용 재고 · Loss)" value={qtyOf(sheet?.kinds?.OTHER ?? 0)} note="두 갈래를 가르는 근거가 없어 한 줄로 둡니다" />
                </Section>

                <Section title="▶ 폐기 사유">
                  {sheet?.remarks?.length ? (
                    sheet.remarks.slice(0, 8).map((r) => (
                      <Row key={r.remark} label={`- ${r.remark}`} value={qtyOf(r.qty)} />
                    ))
                  ) : (
                    <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>—</Text>
                  )}
                </Section>

                <Section title="▶ 주요 모델별 발생수량">
                  {sheet?.models?.length ? (
                    sheet.models.slice(0, 8).map((m) => (
                      <Row key={m.model} label={`- ${m.model}`} value={<BlindValue field="qty" value={`${comma(m.qty)} EA`} textStyle={s.textXs} />} />
                    ))
                  ) : (
                    <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>이 기간에 폐기 전표가 없습니다.</Text>
                  )}
                </Section>

                <Section title="▶ 폐기 금액">
                  <Row label="" value={byHand} note="단가 기준정보가 아직 비어 있습니다" />
                </Section>
              </View>
            </View>

            {/* ───── 검토 의견 (엑셀에서 채웁니다) ───── */}
            <View style={{ flexDirection: 'row' }}>
              <View style={[line, { width: 84, backgroundColor: theme.alpha('muted', 0.5), alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[s.textXs, { fontWeight: '700' }]}>검 토 의 견</Text>
              </View>
              <View style={{ flex: 1 }}>
                {[0, 2].map((i) => (
                  <View key={i} style={{ flexDirection: 'row' }}>
                    {[REVIEW_TEAMS[i], REVIEW_TEAMS[i + 1]].map((t) => (
                      <View key={t} style={[line, { flex: 1 }]}>
                        <View style={{ padding: 6, borderBottomWidth: 0.5, borderColor: theme.color.border }}>
                          <Text style={s.textXs}>{t}</Text>
                        </View>
                        <View style={{ height: 56 }} />
                        <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderColor: theme.color.border }}>
                          <View style={{ width: 44, padding: 5, borderRightWidth: 0.5, borderColor: theme.color.border }}>
                            <Text style={[s.textXs, { textAlign: 'center' }]}>팀장</Text>
                          </View>
                          <View style={{ flex: 1, padding: 5, alignItems: 'flex-end' }}>
                            <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>(인)</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>

            <View style={[s.rowGap6, { marginTop: 12, flexWrap: 'wrap' }]}>
              <Badge tone={sheet?.voucherCnt ? 'blue' : ''}>{`전표 ${comma(sheet?.voucherCnt ?? 0)}건`}</Badge>
              <Text style={[s.textXs, { flex: 1, minWidth: 320 }]}>
                「불용 재고」와 「Loss」를 가르는 근거가 원천에 없어 한 줄로 두고 사유를 그대로 보여 줍니다 —
                <Text style={{ fontWeight: '700' }}> 세 갈래로 나누는 규칙은 현업 확인이 필요합니다.</Text>
                「문서번호」·「업체명」·「폐기 금액」과 결재란·검토 의견은 엑셀에서 채우는 칸입니다.
              </Text>
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

/** 본문 소제목 묶음 */
function Section({ title, children }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 3 }}>
      <Text style={[s.textXs, { fontWeight: '700' }]}>{title}</Text>
      <View style={{ paddingLeft: 10, gap: 2 }}>{children}</View>
    </View>
  );
}

/** 본문 한 줄 — 항목명 · 값 · 오른쪽 설명 */
function Row({ label, value, note }) {
  const s = useCommonStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Text style={[s.textXs, { minWidth: 220 }]}>{label}</Text>
      <View style={{ minWidth: 110 }}>{value}</View>
      {note ? <Text style={[s.textXs, { marginLeft: 20 }]}>{note}</Text> : null}
    </View>
  );
}
