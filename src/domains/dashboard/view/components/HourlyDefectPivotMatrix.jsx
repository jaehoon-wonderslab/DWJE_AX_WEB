/**
 * [Component] 일자 × 시간대 불량률 매트릭스 (Hourly Defect Matrix)
 *
 * 검색한 전체 기간의 일자(Row)와 2시간 단위 시간대(Column)를 격자(Grid)로 교차 배치하여,
 * 1) 히트맵 그라데이션 셀로 특정 일자/시간대의 불량률을 직관적으로 비교하고
 * 2) 0ms 즉시 반응하는 고시인성 커스텀 플로팅 툴팁으로 상세 정보를 확인하며
 * 3) 셀 클릭 시 대형 상세 분석 모달을 호출합니다.
 * 4) '일일 평균' 열은 히트맵 컬러와 구별되는 뉴트럴 강조 스타일로 표시됩니다.
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
  const [hoverTooltip, setHoverTooltip] = useState(null);

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
      {/* 상단 정보 및 히트맵 범례 */}
      <View style={styles.topInfoRow}>
        <View style={styles.titleInfo}>
          <Icon name="grid" size={15} color={theme.color.primary} />
          <Text style={[styles.matrixTitle, { color: theme.color.text, fontWeight: '700' }]}>
            일자 × 시간대별 불량률 매트릭스
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

      {/* 가로 너비를 넓게 활용하는 매트릭스 테이블 */}
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
            {/* 일일 평균 열 헤더 (히트맵 컬러가 아닌 뉴트럴 분리 색상) */}
            <View
              style={[
                styles.thCell,
                styles.summaryCol,
                {
                  backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#e2e8f0',
                  borderLeftWidth: 2,
                  borderLeftColor: theme.color.border,
                },
              ]}
            >
              <Text style={[styles.thText, { color: theme.mode === 'dark' ? '#93c5fd' : '#1e3a8a', fontWeight: '800' }]}>
                일일 평균
              </Text>
            </View>
          </View>

          {/* 데이터 행 목록 */}
          {rows.map((row, rIdx) => {
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

                  return (
                    <Pressable
                      key={cIdx}
                      dataSet={{ cellSlot: cell.slot, date: cell.date }}
                      style={[
                        styles.tdCell,
                        styles.slotCol,
                        styles.heatCell,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                      onMouseEnter={(e) => {
                        const targetEl = e?.currentTarget || e?.target;
                        if (targetEl && targetEl.getBoundingClientRect) {
                          const rect = targetEl.getBoundingClientRect();
                          setHoverTooltip({
                            cell,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoverTooltip(null)}
                      onHoverIn={(e) => {
                        const targetEl = e?.currentTarget || e?.nativeEvent?.target;
                        if (targetEl && targetEl.getBoundingClientRect) {
                          const rect = targetEl.getBoundingClientRect();
                          setHoverTooltip({
                            cell,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }
                      }}
                      onHoverOut={() => setHoverTooltip(null)}
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

                {/* 일일 평균 열 (히트맵 컬러가 아닌 뉴트럴 구분 스타일) */}
                <View
                  style={[
                    styles.tdCell,
                    styles.summaryCol,
                    {
                      backgroundColor: theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
                      borderLeftWidth: 2,
                      borderLeftColor: theme.color.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryRateText,
                      { color: theme.mode === 'dark' ? '#f1f5f9' : '#0f172a', fontWeight: '800' },
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

      {/* 하단 기본 가이드 안내 문구 (툴팁 정보가 덮어씌워지지 않고 고정 유지) */}
      <View style={styles.bottomHelp}>
        <Icon name="info" size={13} color={theme.color.textDim} />
        <Text style={[styles.helpText, { color: theme.color.textDim }]}>
          각 셀에 마우스를 올리면 실시간 상세 툴팁이 표시되며, 셀 클릭 시 AI 정밀 진단 리포트 모달이 열립니다.
        </Text>
      </View>

      {/* 0ms 즉각 반응하는 고시인성 커스텀 플로팅 툴팁 */}
      {hoverTooltip && (
        <div
          style={{
            position: 'fixed',
            left: hoverTooltip.x,
            top: hoverTooltip.y - 10,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
            pointerEvents: 'none',
            backgroundColor: theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.94)',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            fontSize: 12,
            lineHeight: 1.5,
            minWidth: 220,
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.18)',
            transition: 'opacity 0.08s ease',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 5, color: '#60a5fa', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 4 }}>
            {hoverTooltip.cell.date} [{hoverTooltip.cell.slotLabel} ~ {hoverTooltip.cell.nextSlot}]
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{ color: '#94a3b8' }}>불량률:</span>
            <span style={{ fontWeight: 700, color: hoverTooltip.cell.defectRate > target ? '#f87171' : '#4ade80' }}>
              {fixed(hoverTooltip.cell.defectRate)}% ({hoverTooltip.cell.status})
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{ color: '#94a3b8' }}>투입 수량:</span>
            <span style={{ fontWeight: 500 }}>{comma(hoverTooltip.cell.inputQty)} EA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{ color: '#94a3b8' }}>양품 / 불량:</span>
            <span>{comma(hoverTooltip.cell.okQty)} / <span style={{ color: hoverTooltip.cell.ngQty > 0 ? '#f87171' : 'inherit' }}>{comma(hoverTooltip.cell.ngQty)}</span> EA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#94a3b8' }}>공정 수율:</span>
            <span style={{ fontWeight: 600 }}>{fixed(hoverTooltip.cell.yield)}%</span>
          </div>
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#e2e8f0' }}>
            주 결함: <span style={{ color: '#fde047', fontWeight: 600 }}>{hoverTooltip.cell.primaryDefect}</span>
          </div>
          <div style={{ marginTop: 3, fontSize: 10, color: '#93c5fd' }}>
            클릭 시 AI 상세 진단 모달 열기 &gt;
          </div>
        </div>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 10,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 2,
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
    width: '100%',
    minWidth: 980,
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
    width: 110,
    paddingLeft: 12,
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 11,
  },
  slotCol: {
    flex: 1,
    minWidth: 62,
  },
  summaryCol: {
    width: 86,
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
    paddingHorizontal: 2,
  },
  helpText: {
    fontSize: 11,
  },
});
