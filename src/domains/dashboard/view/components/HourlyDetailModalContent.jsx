/**
 * [Component] 시간대별 생산·품질 상세
 *
 * 일자 × 시간대 매트릭스에서 칸을 누르면 그 2시간 구간의 실측을 보여 줍니다.
 * 투입·양품·불량·불량률·수율과 그 구간에서 가장 많이 나온 결함 유형입니다.
 *
 * ■ 지어낸 진단을 걷어냈습니다 (2026-09-06)
 * 예전에는 여기에 "타발 압력 편차 및 금형 온도 상승(+18.2%)에 따른 BDC 오프셋 미세 변위",
 * "BDC 오프셋 -5μm 보정", "SPM 170, 텐션 4.2kgf", "제1공장 프레스 10대(PR-01~10)" 가
 * 적혀 있었습니다. 수집하지 않는 값이고 PR- 로 시작하는 설비는 마스터 1,511대 중 없습니다.
 * 불량률이 기준을 넘으면 늘 같은 문장이 나오는, 데이터와 무관한 글이었습니다.
 * 원인과 처방은 근거를 붙여 검증한 「AI 공정 원인 분석 및 처방 권고」 카드가 맡습니다.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, StateBadge, TabulatorGrid } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function HourlyDetailModalContent({ cell, target = 3.0, loadDefectDetails }) {
  const theme = useTheme();
  const [details, setDetails] = useState({ loading: !!loadDefectDetails, data: null, error: '' });

  useEffect(() => {
    let active = true;
    if (!cell || !loadDefectDetails) {
      setDetails({ loading: false, data: null, error: '' });
      return () => { active = false; };
    }
    setDetails({ loading: true, data: null, error: '' });
    loadDefectDetails(cell)
      .then((data) => { if (active) setDetails({ loading: false, data, error: '' }); })
      .catch((e) => { if (active) setDetails({ loading: false, data: null, error: e?.message || '결함 상세를 불러올 수 없습니다.' }); });
    return () => { active = false; };
  }, [cell, loadDefectDetails]);

  if (!cell) return null;

  const rate = cell.defectRate == null ? null : Number(cell.defectRate);
  const isWarning = rate != null && rate > target;
  const isDanger = rate != null && rate >= 4.0;

  /** 값이 없으면 '—' — 0 으로 채우면 안 만든 구간이 잘 만든 구간처럼 보입니다 */
  const num = (v) => (v === null || v === undefined ? '—' : comma(v));
  const pct = (v) => (v === null || v === undefined ? '—' : `${fixed(v, 2)}%`);

  const card = { backgroundColor: theme.surface, borderColor: theme.hairline };
  const defectRows = (details.data?.items || []).map((item, index) => ({
    ...item,
    rank: item.rank ?? index + 1,
    defectType: item.defectType || item.label || '유형 미상',
    defectTypeCd: item.defectTypeCd || '—',
    ngQty: item.ngQty ?? item.value ?? null,
    ratio: item.ratio ?? null,
    classification: item.untyped || item.isUntyped ? '유형 미상' : '분류됨',
    rawQty: item.rawQty ?? null,
    recordCount: item.recordCount ?? null,
    lotCount: item.lotCount ?? null,
    itemCount: item.itemCount ?? null,
    itemCds: Array.isArray(item.itemCds) ? item.itemCds.join(', ') : item.itemCds || '—',
    processIds: Array.isArray(item.processIds) ? item.processIds.join(', ') : item.processIds || '—',
    remarks: Array.isArray(item.remarks) ? item.remarks.join(', ') : item.remarks || '—',
    insUsers: Array.isArray(item.insUsers) ? item.insUsers.join(', ') : item.insUsers || '—',
    firstAt: item.firstAt || '—',
    lastAt: item.lastAt || '—',
    useFlg: item.useFlg || '—',
    masterRemark: item.masterRemark || '—',
  }));
  const defectColumns = [
    { title: '순위', field: 'rank', width: 62, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '불량 유형', field: 'defectType', minWidth: 180, widthGrow: 2 },
    { title: '유형 코드', field: 'defectTypeCd', width: 120 },
    { title: '불량 수량', field: 'ngQty', width: 116, hozAlign: 'right', headerHozAlign: 'right', formatter: (c) => c.getValue() == null ? '—' : `${comma(c.getValue())} EA` },
    { title: '구간 비중', field: 'ratio', width: 104, hozAlign: 'right', headerHozAlign: 'right', formatter: (c) => c.getValue() == null ? '—' : `${fixed(c.getValue(), 2)}%` },
    { title: '분류 상태', field: 'classification', width: 104, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '원천 불량 수량', field: 'rawQty', width: 130, hozAlign: 'right', headerHozAlign: 'right', formatter: (c) => c.getValue() == null ? '—' : `${comma(c.getValue())} EA` },
    { title: '기록 수', field: 'recordCount', width: 90, hozAlign: 'right', headerHozAlign: 'right' },
    { title: 'LOT 수', field: 'lotCount', width: 80, hozAlign: 'right', headerHozAlign: 'right' },
    { title: '품목 수', field: 'itemCount', width: 80, hozAlign: 'right', headerHozAlign: 'right' },
    { title: '품목 코드', field: 'itemCds', minWidth: 220, widthGrow: 2, variableHeight: true },
    { title: '공정 코드', field: 'processIds', minWidth: 150, widthGrow: 1.2, variableHeight: true },
    { title: '비고', field: 'remarks', minWidth: 160, widthGrow: 1.2, variableHeight: true },
    { title: '등록자', field: 'insUsers', minWidth: 150, widthGrow: 1.2, variableHeight: true },
    { title: '최초 발생', field: 'firstAt', width: 168 },
    { title: '최종 발생', field: 'lastAt', width: 168 },
    { title: '사용', field: 'useFlg', width: 72, hozAlign: 'center', headerHozAlign: 'center' },
    { title: '유형 마스터 비고', field: 'masterRemark', minWidth: 180, widthGrow: 1.3, variableHeight: true },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, card]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>투입 / 생산량</Text>
          <Text style={[styles.metricValue, { color: theme.color.text }]}>{num(cell.inputQty)}</Text>
          <Text style={[styles.metricUnit, { color: theme.color.textMuted }]}>EA</Text>
        </View>

        <View style={[styles.metricCard, card]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>양품 수량</Text>
          <Text style={[styles.metricValue, { color: theme.color.success }]}>{num(cell.okQty)}</Text>
          <Text style={[styles.metricUnit, { color: theme.color.textMuted }]}>EA</Text>
        </View>

        <View style={[styles.metricCard, card]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>불량 수량</Text>
          <Text style={[styles.metricValue, { color: cell.ngQty > 0 ? theme.color.danger : theme.color.text }]}>
            {num(cell.ngQty)}
          </Text>
          <Text style={[styles.metricUnit, { color: theme.color.textMuted }]}>EA</Text>
        </View>

        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isWarning
                ? (theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                : card.backgroundColor,
              borderColor: isWarning ? 'rgba(239, 68, 68, 0.3)' : theme.color.border,
            },
          ]}
        >
          <View style={styles.labelWithBadge}>
            <Text style={[styles.metricLabel, { color: isWarning ? theme.color.danger : theme.color.textDim }]}>불량률</Text>
            {rate == null ? null : <StateBadge state={isDanger ? '위험' : isWarning ? '주의' : '정상'} />}
          </View>
          <Text style={[styles.metricValue, { color: isWarning ? theme.color.danger : theme.color.success }]}>
            {pct(rate)}
          </Text>
          {/* 이 %는 등록된 목표가 아니라 화면이 색을 나누려고 정한 값입니다 */}
          <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>화면 기준 {fixed(target, 1)}%</Text>
        </View>

        <View style={[styles.metricCard, card]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>공정 수율</Text>
          <Text style={[styles.metricValue, { color: theme.color.primary }]}>{pct(cell.yield)}</Text>
          <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>양품 / 투입</Text>
        </View>
      </View>

      {/* 선택한 구간에 발생한 결함 전량 — 단일 1위 텍스트 대신 정렬·검색 가능한 표로 봅니다. */}
      <View style={[styles.actionSection, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
        <View style={styles.actionHeader}>
          <Icon name="alert" size={15} color={theme.color.primary} />
          <Text style={[styles.actionTitle, { color: theme.color.foreground, fontWeight: '500' }]}>
            이 구간의 불량 유형 상세
          </Text>
        </View>
        {details.loading ? (
          <Text style={[styles.actionText, { color: theme.color.textDim }]}>불량 유형을 불러오는 중입니다.</Text>
        ) : details.error ? (
          <Text style={[styles.actionText, { color: theme.color.danger }]}>{details.error}</Text>
        ) : (
          <>
            <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>
              {`불량 유형 ${defectRows.length}종 · 불량 수량 ${num(details.data?.totalNgQty ?? cell.ngQty)} EA`}
            </Text>
            <TabulatorGrid
              columns={defectColumns}
              rows={defectRows}
              height={Math.min(480, Math.max(180, defectRows.length * 40 + 48))}
              emptyText="이 구간에 집계된 불량 유형이 없습니다."
              initialSort={[{ column: 'rank', dir: 'asc' }]}
            />
          </>
        )}
        <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>
          유형 코드·수량·구간 비중은 선택한 시간 구간의 실측입니다. 원인과 조치는 「AI 공정 원인 분석 및 처방 권고」 카드에서 확인합니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 14,
    marginTop: 2,
  },
  metricSubText: {
    fontSize: 14,
    marginTop: 2,
  },
  actionSection: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionTitle: {
    fontSize: 17,
  },
  actionText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 18,
  },
});
