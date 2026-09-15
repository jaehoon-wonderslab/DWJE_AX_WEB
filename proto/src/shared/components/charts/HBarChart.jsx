/**
 * 가로 막대 그래프 (CM-06)
 *
 * 항목명이 길고 순위 비교가 목적일 때 씁니다 (세로 막대보다 라벨이 겹치지 않음).
 *
 * @param {object} props data [{ l:라벨, v:값, cls:'warn'|'bad' }]
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, withValues } from './chartData';
import { comma } from '@shared/utils/formatUtil';

export default function HBarChart({ data = [], unit = '', target, format = comma, labelWidth = 96, valueWidth = 66 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const rows = withValues(data);
  if (!rows.length) return <ChartEmpty height={90} />;

  const hi = Math.max(...rows.map((d) => d.v), target || 0) * 1.08 || 1;
  const colorOf = (cls) =>
    cls === 'bad' ? theme.color.destructive : cls === 'warn' ? theme.color.warning : theme.seriesAt(0);

  return (
    <View style={{ gap: 9 }}>
      {rows.map((d, i) => (
        <View key={`${d.l}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[s.textSm, { width: labelWidth, color: theme.color.mutedForeground }]} numberOfLines={1}>
            {d.l}
          </Text>
          <View style={{ flex: 1, height: 16, backgroundColor: theme.color.muted, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${((d.v / hi) * 100).toFixed(1)}%`, height: '100%', backgroundColor: colorOf(d.cls), borderRadius: 4 }} />
            {target !== undefined ? (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  bottom: -2,
                  left: `${((target / hi) * 100).toFixed(1)}%`,
                  width: 2,
                  backgroundColor: theme.color.destructive,
                }}
              />
            ) : null}
          </View>
          <Text style={[s.textSm, s.num, { width: valueWidth, textAlign: 'right', fontWeight: '600' }]}>
            {format(d.v)}
            {unit}
          </Text>
        </View>
      ))}
      {target !== undefined ? (
        <Text style={[s.textXs, { textAlign: 'right' }]}>
          ▏목표 {format(target)}
          {unit}
        </Text>
      ) : null}
    </View>
  );
}
