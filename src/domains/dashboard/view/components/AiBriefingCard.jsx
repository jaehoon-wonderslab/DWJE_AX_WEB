/**
 * [Component] AI 일일 종합 브리핑 카드 (Daily AI Executive Summary)
 *
 * 제1공장 10대 프레스 및 AOI 라인의 생산·품질 현황을 LLM/sLLM 엔진이 실시간 종합 분석하여
 * 4가지 핵심 관점(종합 진단, 이상 감지, 인과관계 원인 추론, 조치 권고)으로 요약 브리핑합니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Icon } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function AiBriefingCard({ briefing, loading }) {
  const theme = useTheme();

  if (!briefing) return null;

  const {
    status = 'NORMAL',
    overallDefectRate = 2.14,
    targetDefectRate = 3.0,
    todayQty = 142850,
    planQty = 150000,
    achievementRate = 95.2,
    criticalLine = {
      eqptNm: '프레스 3호기 (PR-03)',
      defectRate: 4.25,
      primaryDefect: '치수 불량',
      anomalyScore: 84,
    },
    summaryLines = [],
    generatedAt,
    engine = 'Master AI v2.4 (Qwen2.5-7B LoRA + GraphRAG)',
  } = briefing;

  const isWarn = status === 'WARN' || status === 'CRITICAL';

  // 불릿별 테마 색상 및 라벨
  const bulletConfigs = [
    { label: '종합 진단', color: theme.color.primary },
    { label: '이상 감지', color: isWarn ? theme.color.danger : theme.color.warning },
    { label: '원인 추론', color: '#8b5cf6' },
    { label: '조치 권고', color: theme.color.success },
  ];

  return (
    <Card
      style={[
        styles.card,
        {
          borderColor: isWarn ? theme.alpha('danger', 0.4) : theme.alpha('primary', 0.4),
          backgroundColor: theme.mode === 'dark' ? '#181b22' : '#f8faff',
        },
      ]}
    >
      {/* 1. 브리핑 상단 헤더 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isWarn
                  ? theme.alpha('danger', 0.15)
                  : theme.alpha('primary', 0.15),
              },
            ]}
          >
            <Icon
              name="cpu"
              size={18}
              color={isWarn ? theme.color.danger : theme.color.primary}
            />
          </View>
          <View>
            <View style={styles.headlineRow}>
              <Text
                style={[
                  styles.titleText,
                  { color: theme.color.text, fontWeight: '700' },
                ]}
              >
                AI 일일 품질·생산 종합 브리핑
              </Text>
              <View
                style={[
                  styles.aiBadge,
                  {
                    backgroundColor: isWarn
                      ? theme.alpha('danger', 0.12)
                      : theme.alpha('primary', 0.12),
                    borderColor: isWarn
                      ? theme.alpha('danger', 0.3)
                      : theme.alpha('primary', 0.3),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.aiBadgeText,
                    {
                      color: isWarn ? theme.color.danger : theme.color.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {isWarn ? '이상 감지 / 주의 권고' : '안정 운전 중'}
                </Text>
              </View>
            </View>
            <Text style={[styles.subText, { color: theme.color.textDim }]}>
              {engine} · 생성시각: {generatedAt || '실시간 갱신'}
            </Text>
          </View>
        </View>

        {/* 2. 우측 핵심 지표 피처 칩 3종 */}
        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricPill,
              {
                backgroundColor: theme.color.card,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Text style={[styles.pillLabel, { color: theme.color.textDim }]}>
              당일 불량률
            </Text>
            <Text
              style={[
                styles.pillValue,
                {
                  color:
                    overallDefectRate > targetDefectRate
                      ? theme.color.danger
                      : theme.color.text,
                },
              ]}
            >
              {fixed(overallDefectRate)}%
            </Text>
            <Text style={[styles.pillSub, { color: theme.color.textDim }]}>
              (목표 {targetDefectRate}%)
            </Text>
          </View>

          <View
            style={[
              styles.metricPill,
              {
                backgroundColor: theme.color.card,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Text style={[styles.pillLabel, { color: theme.color.textDim }]}>
              생산 달성률
            </Text>
            <Text style={[styles.pillValue, { color: theme.color.primary }]}>
              {fixed(achievementRate)}%
            </Text>
            <Text style={[styles.pillSub, { color: theme.color.textDim }]}>
              ({comma(todayQty)} / {comma(planQty)})
            </Text>
          </View>

          <View
            style={[
              styles.metricPill,
              {
                backgroundColor: isWarn
                  ? theme.alpha('danger', 0.08)
                  : theme.color.card,
                borderColor: isWarn
                  ? theme.alpha('danger', 0.25)
                  : theme.color.border,
              },
            ]}
          >
            <Text style={[styles.pillLabel, { color: theme.color.textDim }]}>
              집중 관리 대상
            </Text>
            <Text
              style={[
                styles.pillValue,
                {
                  color: isWarn ? theme.color.danger : theme.color.text,
                  fontSize: 13,
                },
              ]}
            >
              {criticalLine?.eqptNm || 'PR-03'}
            </Text>
            <Text
              style={[
                styles.pillSub,
                { color: isWarn ? theme.color.danger : theme.color.textDim },
              ]}
            >
              (불량률 {fixed(criticalLine?.defectRate)}%)
            </Text>
          </View>
        </View>
      </View>

      {/* 3. 브리핑 본문 요약 (4대 관점 불릿 리스트) */}
      <View
        style={[
          styles.contentBox,
          {
            backgroundColor: theme.color.card,
            borderColor: theme.color.border,
          },
        ]}
      >
        {summaryLines.map((line, idx) => {
          const cfg = bulletConfigs[idx] || bulletConfigs[0];
          return (
            <View key={idx} style={styles.lineItem}>
              <View
                style={[
                  styles.bulletBadge,
                  { backgroundColor: theme.alpha(cfg.color, 0.12) },
                ]}
              >
                <Text
                  style={[
                    styles.bulletBadgeText,
                    { color: cfg.color, fontWeight: '700' },
                  ]}
                >
                  {cfg.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.lineText,
                  { color: theme.color.text, lineHeight: 22 },
                ]}
              >
                {line}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 16,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 11,
  },
  subText: {
    fontSize: 11,
    marginTop: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 11,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillSub: {
    fontSize: 11,
  },
  contentBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    minWidth: 62,
    alignItems: 'center',
    marginTop: 1,
  },
  bulletBadgeText: {
    fontSize: 11,
  },
  lineText: {
    fontSize: 13,
    flex: 1,
  },
});
