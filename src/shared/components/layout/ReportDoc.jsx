/**
 * 보고서 문서 틀 — 인쇄·PDF 출력 대상 영역
 *
 * 보고서 화면들은 이 컴포넌트로 본문을 감싸고, 상단 액션의 '인쇄 · PDF' 버튼이
 * nativeID 로 이 영역을 찾아 새 창에 복사해 인쇄합니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function ReportDoc({ nodeId, children, style }) {
  const theme = useTheme();
  return (
    <View
      nativeID={nodeId}
      style={[
        {
          backgroundColor: theme.color.card,
          borderWidth: 1,
          borderColor: theme.color.border,
          borderRadius: theme.metrics.radius,
          padding: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * 보고서 상단 제목줄 — 날짜 박스 + 제목 + 우측 범례
 */
export function ReportTitle({ dateBox, title, right, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 14 }, style]}>
      {dateBox ? (
        <View style={{ borderWidth: 2, borderColor: theme.color.foreground, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 18 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: 0.5, color: theme.color.foreground }}>{dateBox}</Text>
        </View>
      ) : null}
      <Text style={[s.pageTitle, { fontSize: 19, fontWeight: '600', flex: 1, minWidth: 180, marginTop: 4 }]}>{title}</Text>
      {right ? <View style={{ alignItems: 'flex-end' }}>{right}</View> : null}
    </View>
  );
}

/** 달성률 신호등 범례 (95% 이상 / 95% 미만 / 85% 미만) */
export function SignalLegend({ style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const items = [
    { color: theme.color.success, label: '95%이상' },
    { color: theme.color.warning, label: '95%미만' },
    { color: theme.color.destructive, label: '85%미만' },
  ];
  return (
    <View style={[s.legend, { justifyContent: 'flex-end' }, style]}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.legendDot, { backgroundColor: it.color }]} />
          <Text style={s.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
