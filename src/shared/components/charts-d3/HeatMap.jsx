/**
 * 히트맵 — d3 (CM-06)
 *
 * 격자 구조는 기존(View + 가로 ScrollView)을 그대로 유지하고 **색 계산만** d3 로 바꿉니다.
 * 셀이 수백 개가 될 수 있어 transition 은 넣지 않습니다 (렌더 비용).
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { scaleLinear } from 'd3-scale';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, isNum, num } from '../charts/chartData';

export default function HeatMap({ rows = [], cols = [], data = [], unit = '', lo = 0, hi = 100, invert = false, cellWidth = 34 }) {
  const s = useCommonStyles();
  const theme = useTheme();

  if (!rows.length || !cols.length) return <ChartEmpty height={120} />;

  // 명도 단계 0.1~0.9. invert 면 낮을수록 진하게 (가동률처럼 낮은 쪽이 문제인 지표)
  const t = scaleLinear().domain(invert ? [hi, lo] : [lo, hi]).range([0.1, 0.9]).clamp(true);
  const fill = (v) => (isNum(v) ? theme.alpha('info', t(num(v))) : 'transparent');

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 74 }} />
            {cols.map((c) => (
              <View key={c} style={{ width: cellWidth, alignItems: 'center', paddingVertical: 2 }}>
                <Text style={[s.textXs, { fontSize: 10.5, fontWeight: '600' }]}>{c}</Text>
              </View>
            ))}
          </View>

          {rows.map((r, ri) => (
            <View key={r} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <View style={{ width: 74, justifyContent: 'center', paddingRight: 7 }}>
                <Text style={[s.textXs, { fontSize: 10.5, fontWeight: '600', textAlign: 'right' }]} numberOfLines={1}>{r}</Text>
              </View>
              {cols.map((c, ci) => (
                <View
                  key={c}
                  style={{
                    width: cellWidth - 2,
                    marginRight: 2,
                    paddingVertical: 5,
                    borderRadius: 3,
                    backgroundColor: fill(data[ri]?.[ci]),
                    alignItems: 'center',
                  }}
                >
                  <Text style={[s.textXs, { fontSize: 10.5, color: theme.color.foreground, fontVariant: ['tabular-nums'] }]}>
                    {isNum(data[ri]?.[ci]) ? data[ri][ci] : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Text style={s.textXs}>{`${invert ? hi : lo}${unit}`}</Text>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => (
          <View key={k} style={{ width: 22, height: 10, borderRadius: 2, backgroundColor: theme.alpha('info', 0.1 + k * 0.8) }} />
        ))}
        <Text style={s.textXs}>{`${invert ? lo : hi}${unit}`}</Text>
      </View>
    </View>
  );
}
