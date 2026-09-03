/**
 * 선 그래프 (CM-06)
 *
 * 시간대별 추이처럼 '변화'를 보여줄 때 씁니다.
 * 첫 번째 계열에만 옅은 면적을 깔아 주 계열을 구분합니다.
 *
 * @param {object} props
 *   labels  x축 라벨 배열
 *   series  [{ name, data:[…], dashed }] — 계열색은 c1~c6 고정 순서
 *   target  목표선 값 (빨간 점선)
 *   min/max y축 범위 (미지정 시 데이터에서 계산)
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from './chartData';

export default function LineChart({ labels = [], series = [], height = 170, min, max, target, unit = '', showLegend = true }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const W = 640;
  const H = height;
  const pl = 52;
  const pr = 28;
  const pt = 14;
  const pb = 24;
  const iw = W - pl - pr;
  const ih = H - pt - pb;

  // 아직 값이 없는 구간은 null 로 옵니다. 계산에서 빼고 선도 그 자리에서 끊습니다.
  const lines = series.map((se) => ({
    ...se,
    points: (se.data || []).map((v, i) => ({ i, v: num(v) })).filter((pt) => pt.v !== null),
  }));
  const all = lines.flatMap((se) => se.points.map((pt) => pt.v));
  if (!all.length) return <ChartEmpty height={height} />;

  // 1. y축 범위를 정합니다 (목표선도 범위 안에 들어오도록)
  const lo = min !== undefined ? min : Math.min(...all, num(target) ?? Infinity);
  const hi = max !== undefined ? max : Math.max(...all, num(target) ?? -Infinity);
  const span = hi - lo || 1;

  const X = (i) => pl + iw * (labels.length === 1 ? 0 : i / (labels.length - 1));
  const Y = (v) => pt + ih - ((v - lo) / span) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + span * t);

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* 눈금선 · y축 라벨 */}
        {ticks.map((t, i) => (
          <React.Fragment key={`t${i}`}>
            <Line x1={pl} y1={Y(t)} x2={W - pr} y2={Y(t)} stroke={theme.color.border} strokeDasharray="3 3" strokeWidth={1} />
            <SvgText x={pl - 6} y={Y(t) + 3} textAnchor="end" fontSize={9} fill={theme.color.mutedForeground}>
              {t.toFixed(Math.abs(t) < 10 ? 1 : 0)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* 목표선 */}
        {num(target) !== null && (
          <>
            <Line x1={pl} y1={Y(target)} x2={W - pr} y2={Y(target)} stroke={theme.color.destructive} strokeDasharray="5 4" strokeWidth={1.5} />
            <SvgText x={W - pr} y={Y(target) - 5} textAnchor="end" fontSize={9} fill={theme.color.destructive}>
              {`목표 ${target}${unit}`}
            </SvgText>
          </>
        )}

        {/* 계열 */}
        {lines.map((se, si) => {
          const col = theme.seriesAt(si);
          if (!se.points.length) return null;
          const pts = se.points.map((p) => `${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
          const first = se.points[0].i;
          const last = se.points[se.points.length - 1].i;
          const area = `${X(first).toFixed(1)},${pt + ih} ${pts} ${X(last).toFixed(1)},${pt + ih}`;
          return (
            <React.Fragment key={se.name || si}>
              {si === 0 && <Polygon points={area} fill={col} fillOpacity={0.1} />}
              <Polyline points={pts} fill="none" stroke={col} strokeWidth={2} strokeDasharray={se.dashed ? '5 4' : undefined} />
              {se.points.map((p) => (
                <Circle key={p.i} cx={X(p.i)} cy={Y(p.v)} r={3} fill={theme.color.card} stroke={col} strokeWidth={1.8} />
              ))}
            </React.Fragment>
          );
        })}

        {/* x축 라벨 */}
        {labels.map((l, i) => (
          <SvgText key={`l${i}`} x={X(i)} y={H - 7} textAnchor="middle" fontSize={9} fill={theme.color.mutedForeground}>
            {String(l)}
          </SvgText>
        ))}
      </Svg>

      {showLegend && series.length > 1 ? (
        <View style={[s.legend, { marginTop: 6 }]}>
          {series.map((se, i) => (
            <View key={se.name || i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.legendLine, { backgroundColor: theme.seriesAt(i) }]} />
              <Text style={s.legendText}>{se.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
