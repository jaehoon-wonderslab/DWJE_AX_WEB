/**
 * 진행 바 (CM-05) — 달성률·진행률 표시
 *
 * 사용 예) <ProgressBar percent={83.5} tone="warn" />
 */
import React from 'react';
import { View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

export default function ProgressBar({ percent = 0, tone = '', style }) {
  const s = useCommonStyles();
  return (
    <View style={[s.bar, style]}>
      <View
        style={[
          s.barFill,
          tone === 'ok' && s.barFillOk,
          tone === 'warn' && s.barFillWarn,
          tone === 'bad' && s.barFillBad,
          { width: `${Math.max(0, Math.min(percent, 100))}%` },
        ]}
      />
    </View>
  );
}
