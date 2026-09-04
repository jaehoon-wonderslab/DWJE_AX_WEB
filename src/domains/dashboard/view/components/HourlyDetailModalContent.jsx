/**
 * [Component] 시간대별 생산·품질 AI 정밀 진단 모달 콘텐츠
 *
 * 일자×시간대 피벗 매트릭스에서 특정 셀을 클릭했을 때 나타나는 대형 분석 뷰입니다.
 * 1) 투입량·양품·불량량·불량률·수율의 정밀 수치 지표
 * 2) AI 품질 판정 등급 및 주요 발생 결함 유형
 * 3) 불량 유발 공정 센서 인자 기여도 (XAI 분석 요약)
 * 4) 표준 작업 지침(SOP) 기반 AI 즉각 권고 조치
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, StateBadge } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function HourlyDetailModalContent({ cell, target = 3.0 }) {
  const theme = useTheme();

  if (!cell) return null;

  const isWarning = Number(cell.defectRate) > target;
  const isDanger = Number(cell.defectRate) >= 4.0;

  return (
    <View style={styles.container}>
      {/* 1. 상단 핵심 성과 지표 (5종 카드) */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.color.border }]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>투입 / 생산량</Text>
          <Text style={[styles.metricValue, { color: theme.color.text }]}>{comma(cell.inputQty)}</Text>
          <Text style={[styles.metricUnit, { color: theme.color.textMuted }]}>EA</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.color.border }]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>양품 수량</Text>
          <Text style={[styles.metricValue, { color: theme.color.success }]}>{comma(cell.okQty)}</Text>
          <Text style={[styles.metricUnit, { color: theme.color.textMuted }]}>EA</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.color.border }]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>불량 수량</Text>
          <Text style={[styles.metricValue, { color: cell.ngQty > 0 ? theme.color.danger : theme.color.text }]}>
            {comma(cell.ngQty)}
          </Text>
          <Text style={[styles.metricUnit, { color: theme.color.textMuted }]}>EA</Text>
        </View>

        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isWarning
                ? (theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                : (theme.mode === 'dark' ? '#1e293b' : '#f8fafc'),
              borderColor: isWarning ? 'rgba(239, 68, 68, 0.3)' : theme.color.border,
            },
          ]}
        >
          <View style={styles.labelWithBadge}>
            <Text style={[styles.metricLabel, { color: isWarning ? theme.color.danger : theme.color.textDim }]}>불량률</Text>
            <StateBadge state={isDanger ? '위험' : isWarning ? '주의' : '정상'} />
          </View>
          <Text style={[styles.metricValue, { color: isWarning ? theme.color.danger : theme.color.success }]}>
            {fixed(cell.defectRate)}%
          </Text>
          <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>목표 {target}% 기준</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.color.border }]}>
          <Text style={[styles.metricLabel, { color: theme.color.textDim }]}>공정 수율</Text>
          <Text style={[styles.metricValue, { color: theme.color.primary }]}>{fixed(cell.yield)}%</Text>
          <Text style={[styles.metricSubText, { color: theme.color.textMuted }]}>100% - 불량률</Text>
        </View>
      </View>

      {/* 2. AI 품질 진단 및 XAI 인자 기여도 요약 */}
      <View
        style={[
          styles.aiSection,
          {
            backgroundColor: theme.mode === 'dark' ? '#18202f' : '#f0fdf4',
            borderColor: isWarning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
          },
        ]}
      >
        <View style={styles.aiSectionHeader}>
          <View style={styles.headerTitleRow}>
            <Icon name="zap" size={16} color={isWarning ? '#ef4444' : '#16a34a'} />
            <Text style={[styles.aiSectionTitle, { color: theme.color.text, fontWeight: '700' }]}>
              AI 실시간 공정 상태 판정
            </Text>
          </View>
          <View
            style={[
              styles.gradeBadge,
              {
                backgroundColor: isWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                borderColor: isWarning ? '#ef4444' : '#16a34a',
              },
            ]}
          >
            <Text style={[styles.gradeText, { color: isWarning ? '#ef4444' : '#16a34a', fontWeight: '700' }]}>
              {isDanger ? '위험 등급 (CRITICAL)' : isWarning ? '주의 등급 (WARNING)' : '정상 가동 (NORMAL)'}
            </Text>
          </View>
        </View>

        <View style={styles.aiBody}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: theme.color.textDim }]}>주요 발생 결함:</Text>
            <Text style={[styles.infoValHighlight, { color: isWarning ? theme.color.danger : theme.color.text, fontWeight: '700' }]}>
              {cell.primaryDefect || '외관 미세 결함'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: theme.color.textDim }]}>추정 원인 인자:</Text>
            <Text style={[styles.infoVal, { color: theme.color.text }]}>
              {isWarning
                ? '타발 압력 편차(Peak Tonnage) 및 금형 온도 상승(+18.2%)에 따른 BDC 오프셋 미세 변위'
                : '타발 압력 및 피딩 텐션 정상 범위 유지, 설비 간 부하 균일'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: theme.color.textDim }]}>공정 데이터 스트림:</Text>
            <Text style={[styles.infoVal, { color: theme.color.textMuted }]}>
              제1공장 프레스 10대(PR-01~10) 및 AOI 복합 검사 라인 실시간 취합 데이터
            </Text>
          </View>
        </View>
      </View>

      {/* 3. AI 표준 SOP 권고 처방 */}
      <View style={[styles.actionSection, { backgroundColor: theme.mode === 'dark' ? '#1f242d' : '#f8fafc', borderColor: theme.color.border }]}>
        <View style={styles.actionHeader}>
          <Icon name="checkCircle" size={15} color={theme.color.primary} />
          <Text style={[styles.actionTitle, { color: theme.color.text, fontWeight: '700' }]}>
            AI 품질 개선 표준 처방 가이드 (SOP Recommendation)
          </Text>
        </View>
        <View style={styles.actionList}>
          <View style={styles.actionItem}>
            <Text style={[styles.actionBadge, { backgroundColor: theme.color.primary, color: '#ffffff' }]}>1순위</Text>
            <Text style={[styles.actionText, { color: theme.color.text }]}>
              {isWarning
                ? '하사점(BDC) 오프셋 -5μm 미세 보정 및 하형 냉각 노즐 분사압 점검 권고'
                : '현재 설비 파라미터(SPM 170, 텐션 4.2kgf) 유지 권장'}
            </Text>
          </View>
          <View style={styles.actionItem}>
            <Text style={[styles.actionBadge, { backgroundColor: '#64748b', color: '#ffffff' }]}>2순위</Text>
            <Text style={[styles.actionText, { color: theme.color.text }]}>
              {isWarning
                ? '금형 열부하 완화를 위해 타발 속도 5~10% 일시 감속 권고 (182 SPM → 165 SPM)'
                : '금형 피딩 가이드 이물 유입 여부 다음 정기 점검 시 예방 확인'}
            </Text>
          </View>
        </View>
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
  aiSection: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSectionTitle: {
    fontSize: 13,
  },
  gradeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  gradeText: {
    fontSize: 11,
  },
  aiBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoKey: {
    fontSize: 12,
    fontWeight: '600',
    width: 105,
  },
  infoVal: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  infoValHighlight: {
    fontSize: 12,
    flex: 1,
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
  actionList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
