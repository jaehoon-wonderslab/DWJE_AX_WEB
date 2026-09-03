/**
 * 세로 막대 그래프 (CM-06)
 *
 * 항목 수가 적고 값의 크기를 비교할 때 씁니다.
 * v2 를 주면 계획/실적처럼 두 계열을 나란히(또는 stacked 로 쌓아) 그립니다.
 *
 * @param {object} props data [{ l:라벨, v:값, v2:보조값 }]
 */
import React from 'react';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from './chartData';

export default function BarChart({ data = [], height = 170, stacked = false }) {
  const theme = useTheme();
  // 값이 없는 막대는 0 으로 두되, 전부 비어 있으면 그리지 않습니다
  const bars = data.map((d) => ({ ...d, v: num(d.v), v2: num(d.v2) }));
  if (!bars.length || bars.every((d) => d.v === null && d.v2 === null)) return <ChartEmpty height={height} />;

  const W = 620;
  const H = height;
  const pl = 38;
  const pr = 12;
  const pt = 14;
  const pb = 26;
  const iw = W - pl - pr;
  const ih = H - pt - pb;

  const total = (d) => (stacked ? (d.v || 0) + (d.v2 || 0) : Math.max(d.v || 0, d.v2 || 0));
  const hi = Math.max(...bars.map(total)) * 1.12 || 1;
  const bw = Math.min(30, (iw / bars.length) * 0.5);
  const step = iw / bars.length;
  const Y = (v) => pt + ih - ((v || 0) / hi) * ih;

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <React.Fragment key={t}>
          <Line x1={pl} y1={Y(hi * t)} x2={W - pr} y2={Y(hi * t)} stroke={theme.color.border} strokeDasharray="3 3" strokeWidth={1} />
          <SvgText x={pl - 6} y={Y(hi * t) + 3} textAnchor="end" fontSize={9} fill={theme.color.mutedForeground}>
            {Math.round(hi * t).toLocaleString()}
          </SvgText>
        </React.Fragment>
      ))}

      {bars.map((d, i) => {
        const cx = pl + step * i + step / 2;
        return (
          <React.Fragment key={`${d.l}-${i}`}>
            <Rect x={cx - bw / 2} y={Y(d.v)} width={bw} height={Math.max(pt + ih - Y(d.v), 0)} rx={3} fill={theme.seriesAt(0)} />
            {d.v2 !== null && d.v2 !== undefined &&
              (stacked ? (
                <Rect x={cx - bw / 2} y={Y(d.v + d.v2)} width={bw} height={Math.max(Y(d.v) - Y(d.v + d.v2), 0)} rx={3} fill={theme.seriesAt(1)} />
              ) : (
                <Rect x={cx + 1} y={Y(d.v2)} width={bw * 0.55} height={Math.max(pt + ih - Y(d.v2), 0)} rx={3} fill={theme.seriesAt(1)} />
              ))}
            <SvgText x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill={theme.color.mutedForeground}>
              {String(d.l)}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
