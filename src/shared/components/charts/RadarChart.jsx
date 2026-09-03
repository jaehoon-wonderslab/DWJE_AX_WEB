/**
 * 방사형(레이더) 그래프 (CM-06)
 *
 * 6축 품질 지수처럼 여러 지표의 균형을 한눈에 볼 때 씁니다.
 * 실선 = 현재값, 빨간 점선 = 목표값.
 *
 * @param {object} props axes [{ l:축이름, v:현재값(0~100), t:목표값(0~100) }]
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from './chartData';

export default function RadarChart({ axes = [], height = 210 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  // 축 값이 하나도 없으면(지표 미적재) 빈 도형 대신 안내를 띄웁니다.
  // 값이 없는 축은 0 으로 두되, 전부 없으면 그리지 않습니다.
  const rows = axes.map((a) => ({ ...a, v: num(a.v), t: num(a.t) }));
  if (!rows.length || rows.every((a) => a.v === null)) return <ChartEmpty height={height} />;

  const W = 340;
  const H = height;
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = Math.min(W, H) / 2 - 42;
  const n = rows.length;

  /** i 번째 축의 반지름 r 지점 좌표 */
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = (vals, r0) => vals.map((v, i) => pt(i, (r0 * v) / 100).map((x) => x.toFixed(1)).join(',')).join(' ');

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* 거미줄 */}
        {[1, 0.75, 0.5, 0.25].map((k) => (
          <Polygon
            key={k}
            points={rows.map((_, i) => pt(i, R * k).map((x) => x.toFixed(1)).join(',')).join(' ')}
            fill="none"
            stroke={theme.color.border}
            strokeWidth={1}
          />
        ))}
        {/* 축 */}
        {rows.map((_, i) => {
          const [x, y] = pt(i, R);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={theme.color.border} strokeWidth={1} />;
        })}
        {/* 목표 */}
        <Polygon points={poly(rows.map((a) => a.t ?? 0), R)} fill="none" stroke={theme.color.destructive} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
        {/* 현재 */}
        <Polygon points={poly(rows.map((a) => a.v ?? 0), R)} fill={theme.seriesAt(0)} fillOpacity={0.18} stroke={theme.seriesAt(0)} strokeWidth={2} />
        {rows.map((a, i) => {
          const [x, y] = pt(i, (R * a.v) / 100);
          return <Circle key={i} cx={x} cy={y} r={3.2} fill={theme.color.card} stroke={theme.seriesAt(0)} strokeWidth={1.8} />;
        })}
        {/* 축 이름 */}
        {rows.map((a, i) => {
          const [x, y] = pt(i, R + 18);
          return (
            <SvgText key={i} x={x} y={y + 3} textAnchor="middle" fontSize={9.5} fill={theme.color.mutedForeground}>
              {a.l}
            </SvgText>
          );
        })}
      </Svg>
      <View style={[s.legend, { justifyContent: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.legendLine, { backgroundColor: theme.seriesAt(0) }]} />
          <Text style={s.legendText}>현재</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.legendLine, { backgroundColor: theme.color.destructive, height: 2, opacity: 0.7 }]} />
          <Text style={s.legendText}>목표</Text>
        </View>
      </View>
    </View>
  );
}
