/**
 * [Component] 공정별 수율 고시인성 종합 뷰 (Process Yield High-Visibility View)
 *
 * 각 생산 공정(프레스, 열처리, 표면처리, AOI 자동검사, 조립 등)의
 * 1) 목표 수율 대비 실적 달성 수준
 * 2) 고대비 게이지 프로그레스 바 및 목표 마커(97.0%)
 * 3) 편차(+/- %p) 배지와 투입/양품/불량 수량
 * 을 직관적이고 시인성 높게 표기합니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StateBadge, Icon } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function ProcessYieldView({ processYield }) {
  const theme = useTheme();

  const target = Number(processYield?.target) || 97.0;
  /**
   * 서버가 준 공정만 그립니다
   *
   * 2026-09-06 이전에는 서버 행이 3개 미만이면 지어낸 공정 다섯 개로 갈아 끼웠습니다 —
   * 프레스 97.8% / 350,000 EA · 열처리 98.5% · 표면처리 98.2% · AOI 96.9% · 조립 99.4%.
   * 있지도 않은 공정과 수량이었고, 서버 행이 있으면 그 위에 지어낸 수량을 덮어썼습니다.
   *
   * 공정 수는 날마다 다릅니다 — 2026-09-03 은 22개인데 2026-08-30(비가동일)은 2개뿐입니다.
   * 즉 조용히 넘어가는 예외가 아니라 **비가동일마다 가짜 다섯 줄이 뜨던** 자리입니다.
   */
  const items = processYield?.items || [];

  /**
   * 공정 평균 수율 — 수량이 있으면 **가중 평균**입니다
   *
   * 공정마다 만든 양이 다른데 단순 평균을 내면 조금 만든 공정이 많이 만든 공정과 같은 무게가
   * 됩니다. 수율을 못 받은 공정은 아예 빼고 셉니다 — 예전에는 `|| 0` 이라 0% 로 세어
   * 평균을 끌어내렸습니다. 셀 것이 없으면 98.1 을 적던 것도 걷어냈습니다.
   */
  const rated = items.filter((x) => (x.yieldRate ?? x.v) !== null && (x.yieldRate ?? x.v) !== undefined);
  const sumQty = rated.reduce((a, x) => a + (Number(x.qty) || 0), 0);
  const sumOk = rated.reduce((a, x) => a + (Number(x.okQty) || 0), 0);
  const avgYield = sumQty > 0
    ? Number(((sumOk / sumQty) * 100).toFixed(2))
    : (rated.length
        ? Number((rated.reduce((a, x) => a + Number(x.yieldRate ?? x.v), 0) / rated.length).toFixed(2))
        : null);
  const avgDiff = avgYield === null ? null : Number((avgYield - target).toFixed(2));

  return (
    <View style={styles.container}>
      {/* 상단 핵심 수율 지표 요약 바 */}
      <View
        style={[
          styles.summaryBar,
          {
            backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#f1f5f9',
            borderColor: theme.color.border,
          },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.color.textDim }]}>공정 평균 수율</Text>
          <View style={styles.summaryValRow}>
            <Text style={[styles.summaryVal, { color: avgYield === null ? theme.color.textDim : avgYield >= target ? theme.color.success : theme.color.danger }]}>
              {avgYield === null ? '—' : `${fixed(avgYield)}%`}
            </Text>
            {avgDiff === null ? null : (
              <View
                style={[
                  styles.diffBadge,
                  {
                    backgroundColor: avgDiff >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    borderColor: avgDiff >= 0 ? '#16a34a' : '#ef4444',
                  },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: avgDiff >= 0 ? '#16a34a' : '#ef4444' }}>
                  {avgDiff >= 0 ? `+${avgDiff}%p` : `${avgDiff}%p`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.vDivider, { backgroundColor: theme.color.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.color.textDim }]}>관리 목표 수율</Text>
          <Text style={[styles.summaryValSub, { color: theme.color.text, fontWeight: '700' }]}>
            {fixed(target)}%
          </Text>
        </View>

        <View style={[styles.vDivider, { backgroundColor: theme.color.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.color.textDim }]}>분석 대상 공정 수</Text>
          <Text style={[styles.summaryValSub, { color: theme.color.primary, fontWeight: '700' }]}>
            총 {items.length}개 공정
          </Text>
        </View>
      </View>

      {/* 공정별 고시인성 게이지 및 상세 카드 목록 */}
      <View style={styles.processList}>
        {items.map((item, idx) => {
          /**
           * 수율이 없으면 **없는 대로 둡니다** — 98.0 을 넣던 것을 걷어냈습니다.
           * 서버가 수율을 못 주는 공정에 98% 를 적으면 목표(97%)를 넘긴 우등 공정으로 보입니다.
           */
          const raw = item.yieldRate ?? item.v;
          const hasYield = raw !== null && raw !== undefined && raw !== '';
          const yVal = hasYield ? Number(raw) : null;
          const diff = hasYield ? Number((yVal - target).toFixed(2)) : null;
          const isOk = hasYield && yVal >= target;
          const isWarn = hasYield && yVal >= target - 1.0 && yVal < target;
          const barColor = !hasYield ? theme.color.border : isOk ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444';
          const pName = item.process || item.l || `공정 ${idx + 1}`;
          const qty = Number(item.qty) || 0;
          const okQty = item.okQty != null ? Number(item.okQty) : (hasYield ? Math.round(qty * (yVal / 100)) : null);
          const ngQty = item.ngQty != null ? Number(item.ngQty) : (okQty == null ? null : qty - okQty);

          // 게이지 비율 계산 (최소 85% ~ 최대 100% 구간 매핑으로 변별력 극대화)
          const gaugePercent = hasYield ? Math.min(100, Math.max(0, ((yVal - 85) / 15) * 100)) : 0;
          const targetPercent = Math.min(100, Math.max(0, ((target - 85) / 15) * 100));

          return (
            <View
              key={idx}
              style={[
                styles.processRow,
                {
                  backgroundColor: theme.mode === 'dark' ? '#18202f' : '#ffffff',
                  borderColor: !hasYield || isOk ? theme.color.border : 'rgba(239, 68, 68, 0.35)',
                },
              ]}
            >
              {/* 공정명 및 기본 물량 */}
              <View style={styles.rowLeft}>
                <View style={styles.pNameRow}>
                  <View style={[styles.pIndexBadge, { backgroundColor: theme.mode === 'dark' ? '#334155' : '#e2e8f0' }]}>
                    <Text style={[styles.pIndexText, { color: theme.color.text }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.processName, { color: theme.color.text, fontWeight: '700' }]}>
                    {pName}
                  </Text>
                </View>
                {qty > 0 && (
                  <Text style={[styles.qtySub, { color: theme.color.textDim }]}>
                    투입 {comma(qty)} · 양품 {okQty == null ? '—' : comma(okQty)} · 불량 <Text style={{ color: ngQty > 0 ? '#ef4444' : undefined, fontWeight: '600' }}>{ngQty == null ? '—' : `${comma(ngQty)} EA`}</Text>
                  </Text>
                )}
              </View>

              {/* 고시인성 수율 게이지 바 (목표 97% 수직 마커 포함) */}
              <View style={styles.rowCenter}>
                <View style={[styles.gaugeTrack, { backgroundColor: theme.mode === 'dark' ? '#334155' : '#e2e8f0' }]}>
                  {/* 실적 게이지 바 */}
                  <View
                    style={[
                      styles.gaugeBar,
                      {
                        width: `${gaugePercent}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                  {/* 목표 수율 수직 기준선 마커 */}
                  <View
                    style={[
                      styles.targetMarker,
                      {
                        left: `${targetPercent}%`,
                      },
                    ]}
                  >
                    <View style={styles.markerLine} />
                  </View>
                </View>
                <View style={styles.gaugeScaleTextRow}>
                  <Text style={styles.scaleText}>85%</Text>
                  <Text style={[styles.scaleText, { color: theme.color.danger, fontWeight: '600' }]}>목표 {target}%</Text>
                  <Text style={styles.scaleText}>100%</Text>
                </View>
              </View>

              {/* 수율 수치 및 목표 편차 배지 */}
              <View style={styles.rowRight}>
                <View style={styles.rateValueRow}>
                  <Text style={[styles.yieldText, { color: hasYield ? barColor : theme.color.textDim, fontWeight: '800' }]}>
                    {hasYield ? `${fixed(yVal)}%` : '—'}
                  </Text>
                  {/* 수율을 모르면 목표와의 차이도 없습니다 — 0%p 로 적으면 목표에 딱 맞은 것처럼 보입니다 */}
                  {diff === null ? null : (
                    <View
                      style={[
                        styles.diffPill,
                        {
                          backgroundColor: diff >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          borderColor: diff >= 0 ? '#10b981' : '#ef4444',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: diff >= 0 ? '#10b981' : '#ef4444' }}>
                        {diff >= 0 ? `+${diff}%p` : `${diff}%p`}
                      </Text>
                    </View>
                  )}
                </View>
                {hasYield ? (
                  <View style={{ alignSelf: 'flex-end', marginTop: 2 }}>
                    <StateBadge state={isOk ? '정상' : isWarn ? '주의' : '위험'} label={isOk ? '목표 달성' : '집중 관리'} />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 3,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryValSub: {
    fontSize: 16,
  },
  diffBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  vDivider: {
    width: 1,
    height: 32,
  },
  processList: {
    gap: 8,
  },
  processRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    flexWrap: 'wrap',
  },
  rowLeft: {
    width: 220,
    gap: 4,
  },
  pNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pIndexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pIndexText: {
    fontSize: 11,
    fontWeight: '700',
  },
  processName: {
    fontSize: 13,
  },
  qtySub: {
    fontSize: 11,
  },
  rowCenter: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  gaugeTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  gaugeBar: {
    height: '100%',
    borderRadius: 6,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: 'center',
  },
  markerLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#dc2626',
    boxShadow: '0 0 4px rgba(220, 38, 38, 0.8)',
  },
  gaugeScaleTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  scaleText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  rowRight: {
    width: 140,
    alignItems: 'flex-end',
    gap: 2,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yieldText: {
    fontSize: 17,
  },
  diffPill: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
});
