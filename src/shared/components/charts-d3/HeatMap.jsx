/**
 * 설비별 시간대 가동률 히트맵 — d3 (CM-06)
 *
 * 프레스 10대 × 2시간 구간의 가동률 현황을 그리드로 시각화합니다.
 * 값이 낮을수록 진하게 표시하여 문제 구간(최저 가동률)을 직관적으로 식별합니다.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, isNum } from '../charts/chartData';

export default function HeatMap({
  rows = [],
  cols = [],
  data = [],
  unit = '%',
  lo = 40,
  hi = 100,
  invert = true,
  cellHeight = 32,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  if (!rows.length || !cols.length) return <ChartEmpty height={180} />;

  // 색상 매핑 함수 (참고 디자인 1:1 구현)
  const getCellColors = (val) => {
    if (!isNum(val)) {
      return {
        bg: theme.isDark ? '#1e293b' : '#f1f5f9',
        text: theme.isDark ? '#64748b' : '#94a3b8',
      };
    }
    const v = Number(val);
    const ratio = Math.max(0, Math.min(1, (hi - v) / (hi - lo))); // 40(최저)이면 1, 100(최고)이면 0

    if (theme.isDark) {
      if (ratio > 0.65) return { bg: '#2563eb', text: '#ffffff' }; // 40~58%
      if (ratio > 0.45) return { bg: '#1d4ed8', text: '#ffffff' }; // 58~72%
      if (ratio > 0.25) return { bg: '#1e3a8a', text: '#cbd5e1' }; // 72~85%
      if (ratio > 0.1) return { bg: '#172554', text: '#94a3b8' };  // 85~92%
      return { bg: '#0f172a', text: '#64748b' };                  // 93% 이상
    }

    // 라이트 모드 (스크린샷 색상과 1:1 일치)
    if (ratio > 0.65) return { bg: '#4385e0', text: '#ffffff' }; // 40~58%: 진한 파랑 + 흰색 글씨
    if (ratio > 0.45) return { bg: '#6ba5f2', text: '#ffffff' }; // 58~72%: 중간 파랑 + 흰색 글씨
    if (ratio > 0.25) return { bg: '#a3c9f8', text: '#1e293b' }; // 72~85%: 부드러운 파랑
    if (ratio > 0.1) return { bg: '#cde1fb', text: '#1e293b' };  // 85~92%: 연한 하늘색
    return { bg: '#e5f0fd', text: '#1e293b' };                   // 93% 이상: 아주 연한 파스텔 블루
  };

  return (
    <View style={{ width: '100%' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
        <View style={{ flex: 1, minWidth: 500 }}>
          {/* 열 헤더 (06, 08, 10 ...) */}
          <View style={{ flexDirection: 'row', marginBottom: 6, alignItems: 'center' }}>
            <View style={{ width: 62, paddingRight: 8 }} />
            <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
              {cols.map((c) => (
                <View key={c} style={{ flex: 1, minWidth: 42, alignItems: 'center' }}>
                  <Text style={[s.textXs, { fontSize: 11, fontWeight: '600', color: theme.color.mutedForeground }]}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 행 (PR-01 ~ PR-10) */}
          {rows.map((r, ri) => (
            <View key={r} style={{ flexDirection: 'row', marginBottom: 4, alignItems: 'center' }}>
              {/* 좌측 설비명 라벨 */}
              <View style={{ width: 62, paddingRight: 10, justifyContent: 'center' }}>
                <Text style={[s.textXs, { fontSize: 11, fontWeight: '600', textAlign: 'right', color: theme.color.foreground }]}>
                  {r}
                </Text>
              </View>

              {/* 셀 그리드 */}
              <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                {cols.map((c, ci) => {
                  const val = data[ri]?.[ci];
                  const { bg, text } = getCellColors(val);
                  return (
                    <View
                      key={c}
                      style={{
                        flex: 1,
                        minWidth: 42,
                        height: cellHeight,
                        borderRadius: 4,
                        backgroundColor: bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: text,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {isNum(val) ? val : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 하단 범례 바 (100% [블록들] 40%) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <Text style={[s.textXs, { fontSize: 10.5, color: theme.color.mutedForeground }]}>{`${hi}${unit}`}</Text>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {['#e5f0fd', '#cde1fb', '#a3c9f8', '#6ba5f2', '#4385e0'].map((color, idx) => (
            <View
              key={idx}
              style={{
                width: 22,
                height: 10,
                borderRadius: 2,
                backgroundColor: theme.isDark ? ['#0f172a', '#172554', '#1e3a8a', '#1d4ed8', '#2563eb'][idx] : color,
              }}
            />
          ))}
        </View>
        <Text style={[s.textXs, { fontSize: 10.5, color: theme.color.mutedForeground }]}>{`${lo}${unit}`}</Text>
      </View>
    </View>
  );
}
