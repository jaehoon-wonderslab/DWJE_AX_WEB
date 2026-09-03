/**
 * 예측 · 추정 카드 (QC-02 AOI 판정 분석·예측)
 *
 * 실측값이 아니라 추정값임을 시각적으로 구분하기 위한 전용 카드입니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function Pred({ label, value, unit, ci, level = '', style, children }) {
  const s = useCommonStyles();
  return (
    <View style={[s.pred, level === 'risk' && s.predRisk, level === 'watch' && s.predWatch, style]}>
      <Text style={s.predLabel}>{label}</Text>
      <Text style={s.predValue}>
        {value}
        {unit ? <Text style={{ fontSize: 12, fontWeight: '500' }}> {unit}</Text> : null}
      </Text>
      {ci ? <Text style={s.predCi}>{ci}</Text> : null}
      {children}
    </View>
  );
}

/** 예측 신뢰도 태그 */
export function ConfTag({ value }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.color.border,
        borderRadius: 99,
        paddingVertical: 1,
        paddingHorizontal: 7,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={[s.textXs, { fontSize: 10.5, fontWeight: '600' }]}>신뢰도 {Math.round(value * 100)}%</Text>
    </View>
  );
}

/** 상승/하강 표시 */
export function Drift({ value, unit = '%p', invert }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const up = value > 0;
  const bad = invert ? !up : up;
  return (
    <Text style={[s.textSm, { fontWeight: '600', color: bad ? theme.color.destructive : theme.color.success }]}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}
      {unit}
    </Text>
  );
}
