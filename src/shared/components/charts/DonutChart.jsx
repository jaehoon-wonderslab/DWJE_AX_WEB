/**
 * 도넛 그래프 (CM-06)
 *
 * 불량 유형 구성처럼 전체 대비 비중을 볼 때 씁니다.
 * 계열은 c1~c6 고정 순서로 배정하며, 7번째부터는 '기타'로 묶어 넘겨 주세요.
 *
 * @param {object} props segs [{ l:라벨, v:값 }]
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, withValues } from './chartData';
import { comma } from '@shared/utils/formatUtil';

export default function DonutChart({ segs = [], height = 180, unitLabel = '건' }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const parts = withValues(segs);
  if (!parts.length || parts.every((x) => x.v === 0)) return <ChartEmpty height={height} />;

  const W = 200;
  const H = height;
  const cx = W / 2;
  const cy = H / 2;
  const r = 58;
  const sw = 20;

  const total = parts.reduce((a, b) => a + b.v, 0) || 1;
  const C = 2 * Math.PI * r;
  let acc = 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <Svg width={160} height={H} viewBox={`0 0 ${W} ${H}`}>
        {segs.map((seg, i) => {
          const len = (C * seg.v) / total;
          const off = (C * acc) / total;
          acc += seg.v;
          return (
            <Circle
              key={seg.l}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={theme.seriesAt(i)}
              strokeWidth={sw}
              strokeDasharray={`${Math.max(len - 2, 0).toFixed(1)} ${(C - len + 2).toFixed(1)}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <SvgText x={cx} y={cy - 2} textAnchor="middle" fontSize={19} fontWeight="700" fill={theme.color.foreground}>
          {comma(total)}
        </SvgText>
        <SvgText x={cx} y={cy + 15} textAnchor="middle" fontSize={9.5} fill={theme.color.mutedForeground}>
          {unitLabel}
        </SvgText>
      </Svg>

      <View style={{ flex: 1, minWidth: 130 }}>
        {segs.map((seg, i) => (
          <View key={seg.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: theme.seriesAt(i) }} />
            <Text style={[s.textSm, { flex: 1 }]} numberOfLines={1}>
              {seg.l}
            </Text>
            <Text style={[s.textSm, s.num, { color: theme.color.mutedForeground }]}>{comma(seg.v)}</Text>
            <Text style={[s.textSm, s.num, { width: 44, textAlign: 'right' }]}>{((seg.v / total) * 100).toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
