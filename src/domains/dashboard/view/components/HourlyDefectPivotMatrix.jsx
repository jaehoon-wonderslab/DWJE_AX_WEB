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
import { createPortal } from 'react-dom';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

/** 툴팁 최소 너비 · 대략적인 높이 — 화면 밖으로 나가지 않게 자리를 잡는 데만 씁니다 */
const TIP_MIN_W = 220;
const TIP_EST_H = 180;

export default function HourlyDefectPivotMatrix({
  pivotMatrix,
  onCellClick,
  target = 3.0,
}) {
  const theme = useTheme();
  const [hoverTooltip, setHoverTooltip] = useState(null);

  /**
   * 툴팁을 띄울 자리를 잽니다 — 칸 위쪽 가운데
   *
   * 위쪽에 자리가 없으면(표 첫 줄) 아래로 뒤집고, 좌우로도 화면을 벗어나지 않게 당깁니다.
   * 좌표는 화면(viewport) 기준이며, 툴팁은 body 로 내보내 그리므로 그대로 맞습니다.
   */
  const showTip = (cell, el) => {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const half = TIP_MIN_W / 2;
    const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
    setHoverTooltip({
      cell,
      x: Math.min(Math.max(r.left + r.width / 2, half + 8), vw - half - 8),
      y: r.top,
      bottom: r.bottom,
      // 위로 띄우면 화면 밖으로 나가는 자리에서는 아래로 뒤집습니다
      flip: r.top < TIP_EST_H + 16,
    });
  };

  if (!pivotMatrix?.rows?.length) return null;

  const { slots = [], rows = [], filledSlots = 0 } = pivotMatrix;

  /** 값이 없으면 '—' — 0 으로 채우면 안 만든 시간대가 잘 만든 시간대처럼 보입니다 */
  const num = (v, suffix = '') => (v === null || v === undefined ? '—' : `${comma(v)}${suffix}`);
  /**
   * 서버가 주는 자리수(소수 둘째)를 그대로 적습니다
   *
   * 한 자리로 줄이면 3.46% 가 3.5% 로 보입니다. 색은 3.46 으로 칠하고 글자는 3.5 로 적히니
   * 4.0% 부근에서 "3.96% 인데 위험색이 아닌" 것처럼 어긋납니다.
   */
  const rate = (v) => (v === null || v === undefined ? '—' : `${fixed(v, 2)}%`);

  // 불량률에 따른 히트맵 배경색 및 글자색 산출
  const getCellColors = (r) => {
    // 실적이 없는 시간대 — 색으로 판단할 것이 없습니다
    if (r === null || r === undefined) {
      return { bg: 'transparent', border: theme.color.border, text: theme.color.textDim, bold: false };
    }
    if (r >= 4.0) {
      return {
        bg: theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.22)',
        border: 'rgba(239, 68, 68, 0.4)',
        text: '#ef4444',
        bold: true,
      };
    }
    if (r >= target) {
      return {
        bg: theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.10)',
        border: 'rgba(239, 68, 68, 0.25)',
        text: '#f87171',
        bold: true,
      };
    }
    if (r >= 2.0) {
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
            {/* 12칸을 곱해 적던 것을 걷어냈습니다 — 실적이 없는 시간대는 서버가 주지 않아 빈 칸입니다 */}
            실적이 있는 {rows.length}일 · 2시간 간격 {comma(filledSlots)}칸
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
      {/*
        가로 스크롤 안의 내용은 기본으로 제 너비만큼만 잡혀, 넓은 화면에서 오른쪽이 크게 빕니다.
        contentContainer 를 늘려 두면 좁을 때만 스크롤이 생기고 넓을 때는 카드 폭을 다 씁니다.
      */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.scrollContainer}
        contentContainerStyle={{ flexGrow: 1 }}
      >
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
                  // 실적이 없는 시간대는 눌러도 볼 것이 없습니다 — 툴팁·모달을 달지 않습니다
                  if (cell.empty) {
                    return (
                      <View key={cIdx} style={[styles.tdCell, styles.slotCol, styles.heatCell, { borderColor: colors.border }]}>
                        <Text style={[styles.cellRateText, { color: theme.color.textDim, fontWeight: '400' }]}>—</Text>
                      </View>
                    );
                  }

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
                      onMouseEnter={(e) => showTip(cell, e?.currentTarget || e?.target)}
                      onMouseLeave={() => setHoverTooltip(null)}
                      onHoverIn={(e) => showTip(cell, e?.currentTarget || e?.nativeEvent?.target)}
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
                        {rate(cell.defectRate)}
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
                    {rate(row.avgDefectRate)}
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
          칸에 마우스를 올리면 그 2시간 구간의 수량과 불량률이 보이고, 누르면 자세히 볼 수 있습니다.
        </Text>
      </View>

      {/*
        툴팁 — **본문(body) 바로 아래에 그립니다**

        `position: fixed` 는 화면 기준이지만, 조상 중 하나라도 `transform` 이 있으면 그 조상이
        기준이 됩니다. react-native-web 은 스크롤 영역에 `transform: matrix(1,0,0,1,0,0)` 를
        붙입니다 — 아무것도 안 움직이는 항등 행렬이라 눈에는 안 보이지만 기준은 바꿉니다.
        그래서 화면 좌표로 잰 셀 위치를 그대로 쓰면 **스크롤한 만큼 어긋났습니다**
        (2026-09-07 실측: 스크롤 0 에서 47px, 400 에서 -353px, 900 에서 -853px — 화면 밖).

        포털로 body 에 내보내면 조상이 없으니 `fixed` 가 다시 화면 기준이 됩니다.
      */}
      {hoverTooltip && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: hoverTooltip.x,
            top: hoverTooltip.flip ? hoverTooltip.bottom + 10 : hoverTooltip.y - 10,
            transform: hoverTooltip.flip ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
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
              {rate(hoverTooltip.cell.defectRate)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{ color: '#94a3b8' }}>투입 수량:</span>
            <span style={{ fontWeight: 500 }}>{num(hoverTooltip.cell.inputQty, ' EA')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{ color: '#94a3b8' }}>양품 / 불량:</span>
            <span>{num(hoverTooltip.cell.okQty)} / <span style={{ color: hoverTooltip.cell.ngQty > 0 ? '#f87171' : 'inherit' }}>{num(hoverTooltip.cell.ngQty)}</span> EA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ color: '#94a3b8' }}>공정 수율:</span>
            <span style={{ fontWeight: 600 }}>{rate(hoverTooltip.cell.yield)}</span>
          </div>
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#e2e8f0' }}>
            주 결함: <span style={{ color: '#fde047', fontWeight: 600 }}>{hoverTooltip.cell.primaryDefect || '—'}</span>
          </div>
          <div style={{ marginTop: 3, fontSize: 10, color: '#93c5fd' }}>
            눌러서 자세히 보기 &gt;
          </div>
        </div>,
        document.body
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
    // 좁은 화면에서는 이만큼은 있어야 칸이 읽힙니다 — 그보다 넓으면 flex 로 늘어납니다
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
