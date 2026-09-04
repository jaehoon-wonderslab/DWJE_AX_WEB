/**
 * [Component] AI 공정 원인 분석 및 처방 권고 카드 (XAI & Prescriptive Guidance)
 *
 * 불량률이 높거나 이상 징후가 감지된 설비를 AI가 자동 타겟팅하여,
 * 1) 핵심 공정 인자별 기여도(SHAP 수평 바 차트)
 * 2) 1·2순위 AI 최적 처방 가이드(SOP)
 * 를 1개 행으로 제공합니다. (사용자 요청: 조치버튼 제외)
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Icon, SelectField } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { fixed } from '@shared/utils/formatUtil';

export default function AiCausePrescriptionCard({
  causePrescription,
  selectedEqptCd,
  onSelectEqpt,
  loading,
}) {
  const theme = useTheme();

  if (!causePrescription) return null;

  const {
    selectedEqpt = {
      eqptCd: 'PR-03',
      eqptNm: '프레스 3호기 (PR-03)',
      model: 'A-Type High Speed Press (110T)',
      anomalyScore: 84,
      riskLevel: 'CRITICAL',
      defectRate: 4.25,
      primaryDefect: '치수 불량 (DIM_NG)',
    },
    availableEquipments = [],
    featureContributions = [],
    prescriptions = [],
    analyzedAt,
  } = causePrescription;

  const isCritical = selectedEqpt.riskLevel === 'CRITICAL';
  const isWarn = selectedEqpt.riskLevel === 'WARN';

  const riskColor = isCritical
    ? theme.color.danger
    : isWarn
    ? theme.color.warning
    : theme.color.success;

  const riskText = isCritical
    ? '집중 관리 필요 (위험)'
    : isWarn
    ? '주의 요망'
    : '정상 운전';

  const eqptOptions = (availableEquipments.length > 0
    ? availableEquipments
    : [
        { eqptCd: 'PR-01', eqptNm: '프레스 1호기 (PR-01)' },
        { eqptCd: 'PR-02', eqptNm: '프레스 2호기 (PR-02)' },
        { eqptCd: 'PR-03', eqptNm: '프레스 3호기 (PR-03)' },
        { eqptCd: 'PR-04', eqptNm: '프레스 4호기 (PR-04)' },
        { eqptCd: 'PR-05', eqptNm: '프레스 5호기 (PR-05)' },
        { eqptCd: 'PR-06', eqptNm: '프레스 6호기 (PR-06)' },
        { eqptCd: 'PR-07', eqptNm: '프레스 7호기 (PR-07)' },
        { eqptCd: 'PR-08', eqptNm: '프레스 8호기 (PR-08)' },
        { eqptCd: 'PR-09', eqptNm: '프레스 9호기 (PR-09)' },
        { eqptCd: 'PR-10', eqptNm: '프레스 10호기 (PR-10)' },
      ]
  ).map((e) => ({
    value: e.eqptCd,
    label: e.eqptNm || e.eqptCd,
  }));

  return (
    <Card
      style={[
        styles.card,
        {
          borderColor: isCritical
            ? theme.alpha('danger', 0.45)
            : theme.color.border,
          backgroundColor: theme.color.card,
        },
      ]}
    >
      {/* 1. 상단 타이틀 및 설비 선택 컨트롤러 */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIconBox,
              { backgroundColor: theme.alpha(riskColor, 0.12) },
            ]}
          >
            <Icon name="activity" size={18} color={riskColor} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.color.text, fontWeight: '700' },
                ]}
              >
                AI 공정 원인 분석 및 처방 권고 (XAI & Prescription)
              </Text>
              <View
                style={[
                  styles.anomalyBadge,
                  {
                    backgroundColor: theme.alpha(riskColor, 0.12),
                    borderColor: theme.alpha(riskColor, 0.35),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.anomalyBadgeText,
                    { color: riskColor, fontWeight: '700' },
                  ]}
                >
                  이상 스코어 {selectedEqpt.anomalyScore}점 · {riskText}
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.color.textDim }]}>
              {selectedEqpt.eqptNm} · 주 불량: {selectedEqpt.primaryDefect} (불량률 {fixed(selectedEqpt.defectRate)}%) · 분석: {analyzedAt || '실시간'}
            </Text>
          </View>
        </View>

        {/* 설비 선택 셀렉터 */}
        <View style={styles.selectorWrapper}>
          <Text style={[styles.selectorLabel, { color: theme.color.textDim }]}>
            분석 대상 설비:
          </Text>
          <View style={{ minWidth: 170 }}>
            <SelectField
              value={selectedEqptCd || selectedEqpt.eqptCd}
              options={eqptOptions}
              onChange={onSelectEqpt}
            />
          </View>
        </View>
      </View>

      {/* 2. 본문 2열 분할 레이아웃 (좌: XAI 기여도 차트 / 우: AI 처방 조치 가이드) */}
      <View style={styles.bodyRow}>
        {/* 좌측: 원인 인자 기여도 분석 (SHAP 수평 바 차트) */}
        <View
          style={[
            styles.columnLeft,
            {
              backgroundColor:
                theme.mode === 'dark' ? '#14171e' : '#f8fafd',
              borderColor: theme.color.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="bar-chart-2" size={16} color={theme.color.primary} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.color.text, fontWeight: '700' },
                ]}
              >
                불량 유발 공정 인자 기여도 (SHAP Analysis)
              </Text>
            </View>
            <Text
              style={[styles.sectionSubtitle, { color: theme.color.textDim }]}
            >
              프레스 센서 데이터와 불량 판정 간 상관관계를 분해 추정한 원인 기여율입니다.
            </Text>
          </View>

          {/* 기여도 수평 바 목록 */}
          <View style={styles.factorsList}>
            {featureContributions.map((feat, idx) => {
              const featColor =
                feat.impact === 'CRITICAL'
                  ? theme.color.danger
                  : feat.impact === 'WARN'
                  ? theme.color.warning
                  : theme.color.primary;

              return (
                <View key={idx} style={styles.factorItem}>
                  <View style={styles.factorHeader}>
                    <Text
                      style={[
                        styles.factorName,
                        { color: theme.color.text, fontWeight: '600' },
                      ]}
                    >
                      {feat.factor}
                    </Text>
                    <View style={styles.factorValueRow}>
                      <Text
                        style={[
                          styles.factorMeasured,
                          {
                            color:
                              feat.impact !== 'NORMAL'
                                ? featColor
                                : theme.color.textDim,
                            fontWeight: feat.impact !== 'NORMAL' ? '600' : '400',
                          },
                        ]}
                      >
                        {feat.measured}
                      </Text>
                      <Text
                        style={[
                          styles.factorImportance,
                          { color: featColor, fontWeight: '700' },
                        ]}
                      >
                        +{fixed(feat.importance)}%
                      </Text>
                    </View>
                  </View>

                  {/* 수평 진행 바 */}
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: theme.alpha(theme.color.border, 0.4) },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(100, (feat.importance / 40) * 100)}%`,
                          backgroundColor: featColor,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.factorDesc,
                      { color: theme.color.textDim },
                    ]}
                  >
                    {feat.description}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 우측: AI 최적 처방 조치 가이드 (조치 버튼 제외) */}
        <View
          style={[
            styles.columnRight,
            {
              backgroundColor:
                theme.mode === 'dark' ? '#14171e' : '#f8fafd',
              borderColor: theme.color.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="check-circle" size={16} color={theme.color.success} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.color.text, fontWeight: '700' },
                ]}
              >
                AI 최적 처방 가이드 (Prescriptive Guidance)
              </Text>
            </View>
            <Text
              style={[styles.sectionSubtitle, { color: theme.color.textDim }]}
            >
              품질관리 AI Worker가 공정 지식 그래프(KG) 및 SOP를 바탕으로 도출한 가이드입니다.
            </Text>
          </View>

          {/* 조치 권고 카드 목록 */}
          <View style={styles.prescriptionsList}>
            {prescriptions.map((p, idx) => {
              const priColor =
                p.priority === 1
                  ? theme.color.danger
                  : p.priority === 2
                  ? theme.color.warning
                  : theme.color.primary;

              return (
                <View
                  key={idx}
                  style={[
                    styles.prescItem,
                    {
                      backgroundColor: theme.color.card,
                      borderColor: theme.alpha(priColor, 0.35),
                    },
                  ]}
                >
                  <View style={styles.prescTopRow}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: theme.alpha(priColor, 0.12) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityBadgeText,
                          { color: priColor, fontWeight: '700' },
                        ]}
                      >
                        {p.priority}순위 권고
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.prescTitle,
                        { color: theme.color.text, fontWeight: '700' },
                      ]}
                    >
                      {p.title}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.prescAction,
                      { color: theme.color.text, lineHeight: 20 },
                    ]}
                  >
                    {p.action}
                  </Text>

                  <View style={styles.prescFooter}>
                    <View
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: theme.alpha(
                            theme.color.primary,
                            0.08
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metaChipText,
                          { color: theme.color.primary },
                        ]}
                      >
                        대상 인자: {p.targetFactor}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: theme.alpha(
                            theme.color.success,
                            0.08
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metaChipText,
                          { color: theme.color.success, fontWeight: '600' },
                        ]}
                      >
                        {p.expectedImpact}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* 하단 안내 문구 */}
          <View style={styles.guideNote}>
            <Icon name="info" size={13} color={theme.color.textDim} />
            <Text style={[styles.guideNoteText, { color: theme.color.textDim }]}>
              본 처방 조치는 실시간 센서 스트림 및 표준 SOP 기반 추천 정보이며, 조치 버튼 없이 모니터링 가이드로 제공됩니다.
            </Text>
          </View>
        </View>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  anomalyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  anomalyBadgeText: {
    fontSize: 11,
  },
  selectorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorLabel: {
    fontSize: 12,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  columnLeft: {
    flex: 1.1,
    minWidth: 320,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  columnRight: {
    flex: 0.9,
    minWidth: 300,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  factorsList: {
    gap: 12,
  },
  factorItem: {
    gap: 4,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  factorName: {
    fontSize: 12,
  },
  factorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorMeasured: {
    fontSize: 11,
  },
  factorImportance: {
    fontSize: 12,
    minWidth: 46,
    textAlign: 'right',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  prescriptionsList: {
    gap: 10,
  },
  prescItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  prescTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
  },
  prescTitle: {
    fontSize: 13,
    flex: 1,
  },
  prescAction: {
    fontSize: 12,
  },
  prescFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metaChipText: {
    fontSize: 10,
  },
  guideNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  guideNoteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
