/**
 * 도트 플롯 (CM-06)
 *
 * 값이 좁은 구간(예: 수율 95~100%)에 몰려 있어 막대 길이로는 구분이 안 될 때 씁니다.
 * 길이가 아닌 '위치'로 값을 인코딩하므로 0에서 시작하지 않아도 왜곡이 아닙니다.
 *
 * @param {object} props data [{ l:라벨, v:값, cls:'warn'|'bad' }] · min/max 축 범위 · target 목표선
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, withValues } from './chartData';

export default function DotPlot({ data = [], min = 0, max = 100, target, unit = '', digits = 1, labelWidth = 80 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  // 값이 아직 없는 항목(가동률 미적재 등)은 빼고 그립니다
  const rows = withValues(data);
  if (!rows.length) return <ChartEmpty height={90} />;

  const pos = (v) => `${(((v - min) / (max - min || 1)) * 100).toFixed(1)}%`;
  const colorOf = (cls) =>
    cls === 'bad' ? theme.color.destructive : cls === 'warn' ? theme.color.warning : theme.seriesAt(0);

  return (
    <View style={{ gap: 10 }}>
      {rows.map((d, i) => {
        const gap = target !== undefined ? d.v - target : null;
        return (
          <View key={`${d.l}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[s.textSm, { width: labelWidth, color: theme.color.mutedForeground }]} numberOfLines={1}>
              {d.l}
            </Text>
            <View style={{ flex: 1, height: 18, justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: theme.color.muted }} />
              {target !== undefined ? (
                <View style={{ position: 'absolute', top: 1, bottom: 1, left: pos(target), width: 2, backgroundColor: theme.color.destructive }} />
              ) : null}
              <View
                style={{
                  position: 'absolute',
                  left: pos(d.v),
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  borderRadius: 99,
                  backgroundColor: colorOf(d.cls),
                  borderWidth: 2,
                  borderColor: theme.color.card,
                }}
              />
            </View>
            <Text style={[s.textSm, s.num, { width: 52, textAlign: 'right', fontWeight: '600' }]}>
              {d.v.toFixed(digits)}
              {unit}
            </Text>
            {gap !== null ? (
              <Text style={[s.textXs, s.num, { width: 56, textAlign: 'right', color: gap < 0 ? theme.color.destructive : theme.color.success }]}>
                {gap > 0 ? '+' : ''}
                {gap.toFixed(1)}%p
              </Text>
            ) : null}
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', paddingLeft: labelWidth + 10, paddingRight: target !== undefined ? 118 : 62 }}>
        {[min, (min + max) / 2, max].map((t, i) => (
          <Text key={i} style={[s.textXs, { flex: 1, fontSize: 10.5, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }]}>
            {t}
            {unit}
          </Text>
        ))}
      </View>
    </View>
  );
}
