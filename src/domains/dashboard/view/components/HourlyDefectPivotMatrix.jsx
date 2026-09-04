/**
 * [Component] 일자 × 시간대 불량률 피벗 매트릭스 그리드 (Hourly Defect Pivot Matrix)
 *
 * 검색한 전체 기간의 일자(Row)와 2시간 단위 시간대(Column)를 격자(Grid)로 교차 배치하여,
 * 1) 히트맵 그라데이션 셀로 특정 일자/시간대의 불량률을 직관적으로 비교하고
 * 2) 호버 시 플로팅 툴팁으로 상세 수량을 즉시 확인하며
 * 3) 셀 클릭 시 대형 상세 분석 모달을 호출합니다.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function HourlyDefectPivotMatrix({
  pivotMatrix,
  onCellClick,
  target = 3.0,
}) {
  const theme = useTheme();
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!pivotMatrix?.rows?.length) return null;

  const { slots = [], rows = [] } = pivotMatrix;

  // 불량률에 따른 히트맵 배경색 및 글자색 산출
  const getCellColors = (rate) => {
    if (rate >= 4.0) {
      return {
        bg: theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.22)',
        border: 'rgba(239, 68, 68, 0.4)',
        text: '#ef4444',
        bold: true,
      };
    }
    if (rate >= target) {
      return {
        bg: theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.10)',
        border: 'rgba(239, 68, 68, 0.25)',
        text: '#f87171',
        bold: true,
      };
    }
    if (rate >= 2.0) {
      return {
        bg: theme.mode === 'dark' ? 'rgba(59, 130, 246, 0.10)' : 'rgba(59, 130, 246, 0.05)',
        border: 'rgba(59, 130, 246, 0.15)',
        text: theme.mode === 'dark' ? '#93c5fd' : '#2563eb',
        bold: false,
      };
    }
    return {
      bg: theme.mode === 'dark' ? 'rgba(34, 197, 94, 0.10)' : 'rgba(34, 197, 94, 0.05)',
      border: 'rgba(34, 197, 94, 0.15)',
      text: '#16a34a',
      bold: false,
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.topInfoRow}>
        <View style={styles.titleInfo}>
          <Icon name="grid" size={15} color={theme.color.primary} />
          <Text style={[styles.matrixTitle, { color: theme.color.text, fontWeight: '700' }]}>
            일자 × 시간대별 불량률 매트릭스 (Pivot Grid)
          </Text>
          <Text style={[styles.matrixSub, { color: theme.color.textDim }]}>
            총 {rows.length}일간 · 2시간 간격 ({rows.length * 12}개 구간)
          </Text>
        </View>

        {/* 히트맵 범례 */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: '#16a34a' }]} />
            <Text style={[styles.legendText, { color: theme.color.textDim }]}>양호 (&lt;2.0%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#2563eb' }]} />
            <Text style={[styles.legendText, { color: theme.color.textDim }]}>적정 (2.0~3.0%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }]} />
            <Text style={[styles.legendText, { color: theme.color.textDim }]}>주의 (&gt;3.0%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: 'rgba(239, 68, 68, 0.45)', borderColor: '#b91c1c' }]} />
            <Text style={[styles.legendText, { color: theme.color.textDim }]}>위험 (&gt;4.0%)</Text>
          </View>
        </View>
      </View>

      {/* 가로 스크롤 매트릭스 테이블 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scrollContainer}>
        <View style={[styles.tableWrapper, { borderColor: theme.color.border }]}>
          {/* 헤더 행 */}
          <View style={[styles.headerRow, { backgroundColor: theme.mode === 'dark' ? '#1f242d' : '#f1f5f9' }]}>
            <View style={[styles.thCell, styles.dateCol]}>
              <Text style={[styles.thText, { color: theme.color.text, fontWeight: '700' }]}>일자</Text>
            </View>
            {slots.map((sLabel, idx) => (
              <View key={idx} style={[styles.thCell, styles.slotCol]}>
                <Text style={[styles.thText, { color: theme.color.textDim, fontWeight: '600' }]}>{sLabel}</Text>
              </View>
            ))}
            <View style={[styles.thCell, styles.summaryCol]}>
              <Text style={[styles.thText, { color: theme.color.primary, fontWeight: '700' }]}>일일 평균</Text>
            </View>
          </View>

          {/* 데이터 행 목록 */}
          {rows.map((row, rIdx) => {
            const rowColors = getCellColors(row.avgDefectRate);
            return (
              <View
                key={rIdx}
                style={[
                  styles.dataRow,
                  {
                    borderTopColor: theme.color.border,
                    backgroundColor: rIdx % 2 === 0
                      ? 'transparent'
                      : (theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                  },
                ]}
              >
                {/* 일자 열 */}
                <View style={[styles.tdCell, styles.dateCol]}>
                  <Text style={[styles.dateText, { color: theme.color.text, fontWeight: '600' }]}>
                    {row.date}
                  </Text>
                </View>

                {/* 12개 시간대 셀 */}
                {row.cells.map((cell, cIdx) => {
                  const colors = getCellColors(cell.defectRate);
                  const tooltipText = `[${cell.date} ${cell.slotLabel}~${cell.nextSlot}]\n• 불량률: ${fixed(cell.defectRate)}%\n• 투입량: ${comma(cell.inputQty)} EA\n• 양품: ${comma(cell.okQty)} EA\n• 불량: ${comma(cell.ngQty)} EA\n• 수율: ${fixed(cell.yield)}%\n• 주 불량: ${cell.primaryDefect}\n(클릭 시 상세 모달 표시)`;

                  return (
                    <Pressable
                      key={cIdx}
                      ref={(el) => {
                        if (el && el.setAttribute) {
                          el.setAttribute('title', tooltipText);
                        }
                      }}
                      style={[
                        styles.tdCell,
                        styles.slotCol,
                        styles.heatCell,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityLabel={tooltipText}
                      onHoverIn={() => setHoveredCell(cell)}
                      onHoverOut={() => setHoveredCell((prev) => (prev === cell ? null : prev))}
                      onPress={() => onCellClick && onCellClick(cell)}
                    >
                      <Text
                        style={[
                          styles.cellRateText,
                          {
                            color: colors.text,
                            fontWeight: colors.bold ? '700' : '500',
                          },
                        ]}
                      >
                        {fixed(cell.defectRate)}%
                      </Text>
                    </Pressable>
                  );
                })}

                {/* 일일 평균 열 */}
                <View
                  style={[
                    styles.tdCell,
                    styles.summaryCol,
                    {
                      backgroundColor: rowColors.bg,
                    },
                  ]}
                  ref={(el) => {
                    if (el && el.setAttribute) {
                      el.setAttribute('title', `[${row.date} 일일 종합]\n• 평균 불량률: ${fixed(row.avgDefectRate)}%\n• 총 투입량: ${comma(row.totalInputQty)} EA\n• 총 불량: ${comma(row.totalNgQty)} EA\n• 평균 수율: ${fixed(row.avgYield)}%`);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.summaryRateText,
                      { color: rowColors.text, fontWeight: '700' },
                    ]}
                  >
                    {fixed(row.avgDefectRate)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 실시간 호버 요약 바 또는 기본 가이드 안내 문구 */}
      {hoveredCell ? (
        <View
          style={[
            styles.hoverInfoBar,
            {
              backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f8fafc',
              borderColor: Number(hoveredCell.defectRate) > target ? 'rgba(239, 68, 68, 0.4)' : theme.color.primary,
            },
          ]}
        >
          <View style={styles.hoverInfoLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: Number(hoveredCell.defectRate) > target ? '#ef4444' : '#16a34a' },
              ]}
            />
            <Text style={[styles.hoverTitleText, { color: theme.color.text, fontWeight: '700' }]}>
              {hoveredCell.date} [{hoveredCell.slotLabel} ~ {hoveredCell.nextSlot}]
            </Text>
            <Text style={[styles.hoverMetricsText, { color: theme.color.textMuted }]}>
              투입 {comma(hoveredCell.inputQty)} EA · 양품 {comma(hoveredCell.okQty)} EA · 불량 {comma(hoveredCell.ngQty)} EA · 불량률 <Text style={{ color: Number(hoveredCell.defectRate) > target ? '#ef4444' : '#16a34a', fontWeight: '700' }}>{fixed(hoveredCell.defectRate)}%</Text> · 수율 {fixed(hoveredCell.yield)}% · 주 원인: {hoveredCell.primaryDefect}
            </Text>
          </View>
          <Text style={[styles.hoverClickHint, { color: theme.color.primary, fontWeight: '600' }]}>
            클릭하여 AI 종합 분석 모달 열기 &gt;
          </Text>
        </View>
      ) : (
        <View style={styles.bottomHelp}>
          <Icon name="info" size={13} color={theme.color.textDim} />
          <Text style={[styles.helpText, { color: theme.color.textDim }]}>
            각 셀에 마우스를 올리면 실시간 요약이 표시되며, 클릭 시 상세 분석 보고서 모달이 열립니다.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 10,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matrixTitle: {
    fontSize: 13,
  },
  matrixSub: {
    fontSize: 11,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10,
  },
  scrollContainer: {
    width: '100%',
  },
  tableWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 840,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderTopWidth: 1,
  },
  thCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: '100%',
  },
  tdCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    height: '100%',
  },
  thText: {
    fontSize: 11,
  },
  dateCol: {
    width: 105,
    paddingLeft: 12,
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 11,
  },
  slotCol: {
    width: 58,
  },
  summaryCol: {
    width: 74,
  },
  heatCell: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(150, 150, 150, 0.1)',
    cursor: 'pointer',
  },
  cellRateText: {
    fontSize: 11,
  },
  summaryRateText: {
    fontSize: 11,
  },
  bottomHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  helpText: {
    fontSize: 11,
  },
  hoverInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    flexWrap: 'wrap',
  },
  hoverInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hoverTitleText: {
    fontSize: 12,
  },
  hoverMetricsText: {
    fontSize: 11,
  },
  hoverClickHint: {
    fontSize: 11,
  },
});
