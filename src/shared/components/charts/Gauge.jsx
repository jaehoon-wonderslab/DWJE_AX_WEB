/**
 * 게이지 (CM-06)
 *
 * 단일 지표의 목표 달성 수준을 반원으로 보여줍니다. 숫자 하나를 크게 강조할 때 씁니다.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Text as SvgText, TSpan } from 'react-native-svg';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from './chartData';

export default function Gauge({ value = 0, min = 0, max = 100, unit = '', label, target, level = '' }) {
  const theme = useTheme();

  const W = 200;
  const H = 118;
  const cx = W / 2;
  const cy = 100;
  const r = 76;
  const sw = 15;

  const v = num(value);
  if (v === null) return <ChartEmpty height={118} />;

  const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
  const half = Math.PI * r;
  const col =
    level === 'bad'
      ? theme.color.destructive
      : level === 'warn'
        ? theme.color.warning
        : level === 'ok'
          ? theme.color.success
          : theme.seriesAt(0);

  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // 목표 지점 눈금
  let tick = null;
  if (target !== undefined) {
    const a = Math.PI * (1 - Math.max(0, Math.min(1, (target - min) / (max - min || 1))));
    tick = (
      <Line
        x1={cx + Math.cos(a) * (r - sw / 2 - 3)}
        y1={cy - Math.sin(a) * (r - sw / 2 - 3)}
        x2={cx + Math.cos(a) * (r + sw / 2 + 3)}
        y2={cy - Math.sin(a) * (r + sw / 2 + 3)}
        stroke={theme.color.destructive}
        strokeWidth={2}
      />
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 220 }}>
        <Path d={arc} fill="none" stroke={theme.color.muted} strokeWidth={sw} strokeLinecap="round" />
        <Path d={arc} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${(half * t).toFixed(1)} ${half.toFixed(1)}`} />
        {tick}
        <SvgText x={cx} y={cy - 16} textAnchor="middle" fontSize={26} fontWeight="700" fill={theme.color.foreground}>
          {String(value)}
          <TSpan fontSize={12} fontWeight="500" fill={theme.color.mutedForeground}>
            {unit}
          </TSpan>
        </SvgText>
        {label ? (
          <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill={theme.color.mutedForeground}>
            {label}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
