/**
 * 히트맵 (CM-06)
 *
 * 설비 × 시간처럼 두 범주의 교차 값을 한눈에 볼 때 씁니다.
 * 순차 스케일(단일 색상의 명도 단계)을 사용하며, invert 를 주면 낮을수록 진하게 칠합니다.
 *
 * @param {object} props rows 행 이름 · cols 열 이름 · data data[r][c] · lo/hi 색 범위
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, isNum, num } from './chartData';

export default function HeatMap({ rows = [], cols = [], data = [], unit = '', lo = 0, hi = 100, invert = false, cellWidth = 34 }) {
  const s = useCommonStyles();
  const theme = useTheme();

  if (!rows.length || !cols.length) return <ChartEmpty height={120} />;

  /** 값을 명도 단계로 바꿉니다 (0.10 ~ 0.90). 값이 없으면 빈 칸으로 둡니다 */
  const shade = (v) => {
    if (!isNum(v)) return 'transparent';
    const t = Math.max(0, Math.min(1, (num(v) - lo) / (hi - lo || 1)));
    const k = invert ? 1 - t : t;
    return theme.alpha('info', 0.1 + k * 0.8);
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* 열 머리글 */}
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 74 }} />
            {cols.map((c) => (
              <View key={c} style={{ width: cellWidth, alignItems: 'center', paddingVertical: 2 }}>
                <Text style={[s.textXs, { fontSize: 10.5, fontWeight: '600' }]}>{c}</Text>
              </View>
            ))}
          </View>
          {/* 본문 */}
          {rows.map((r, ri) => (
            <View key={r} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <View style={{ width: 74, justifyContent: 'center', paddingRight: 7 }}>
                <Text style={[s.textXs, { fontSize: 10.5, fontWeight: '600', textAlign: 'right' }]} numberOfLines={1}>
                  {r}
                </Text>
              </View>
              {cols.map((c, ci) => (
                <View
                  key={c}
                  style={{
                    width: cellWidth - 2,
                    marginRight: 2,
                    paddingVertical: 5,
                    borderRadius: 3,
                    backgroundColor: shade(data[ri]?.[ci] ?? 0),
                    alignItems: 'center',
                  }}
                >
                  <Text style={[s.textXs, { fontSize: 10.5, color: theme.color.foreground, fontVariant: ['tabular-nums'] }]}>
                    {data[ri]?.[ci] ?? '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 색 범례 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Text style={s.textXs}>{`${invert ? hi : lo}${unit}`}</Text>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => (
          <View
            key={k}
            style={{ width: 22, height: 10, borderRadius: 2, backgroundColor: theme.alpha('info', 0.1 + (invert ? 1 - k : k) * 0.8) }}
          />
        ))}
        <Text style={s.textXs}>{`${invert ? lo : hi}${unit}`}</Text>
      </View>
    </View>
  );
}
