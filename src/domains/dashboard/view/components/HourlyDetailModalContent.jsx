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
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, StateBadge } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function HourlyDetailModalContent({ cell, target = 3.0 }) {
  const theme = useTheme();

  if (!cell) return null;

  const rate = cell.defectRate == null ? null : Number(cell.defectRate);
  const isWarning = rate != null && rate > target;
  const isDanger = rate != null && rate >= 4.0;

  /** 값이 없으면 '—' — 0 으로 채우면 안 만든 구간이 잘 만든 구간처럼 보입니다 */
  const num = (v) => (v === null || v === undefined ? '—' : comma(v));
  const pct = (v) => (v === null || v === undefined ? '—' : `${fixed(v, 2)}%`);

  const card = { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.color.border };

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

      {/* 그 구간에서 가장 많이 나온 결함 — 서버가 전 유형을 훑어 고른 1위입니다 */}
      <View style={[styles.actionSection, { backgroundColor: theme.mode === 'dark' ? '#1f242d' : '#f8fafc', borderColor: theme.color.border }]}>
        <View style={styles.actionHeader}>
          <Icon name="alert" size={15} color={theme.color.primary} />
          <Text style={[styles.actionTitle, { color: theme.color.text, fontWeight: '700' }]}>
            이 구간에서 가장 많이 나온 결함
          </Text>
        </View>
        <Text style={[styles.actionText, { color: cell.primaryDefect ? theme.color.text : theme.color.textDim }]}>
          {cell.primaryDefect || '집계된 결함이 없습니다.'}
        </Text>
        <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>
          원인과 조치는 근거를 붙여 확인한 「AI 공정 원인 분석 및 처방 권고」 카드에 있습니다.
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
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 10,
    marginTop: 2,
  },
  metricSubText: {
    fontSize: 10,
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
    fontSize: 13,
  },
  actionText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
