/**
 * 화면 머리말 (CM-03)
 *
 * 제목 · 설명 · 우측 액션 버튼으로 구성됩니다.
 * full 화면(자연어 질의처럼 전체 영역을 쓰는 화면)에서는 사용하지 않습니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function PageHead({ title, desc, actions, style }) {
  const s = useCommonStyles();
  return (
    <View style={[s.pageHead, style]}>
      <View style={{ flexShrink: 1, minWidth: 260 }}>
        <Text style={s.pageTitle}>{title}</Text>
        {desc ? <Text style={s.pageDesc}>{desc}</Text> : null}
      </View>
      {actions ? <View style={s.pageActions}>{actions}</View> : null}
    </View>
  );
}

/** 하위 화면에서 상위 화면으로 돌아가는 링크 */
export function BackLink({ label, onPress }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <Text style={[s.textSm, { color: theme.color.mutedForeground, marginBottom: 10 }]} onPress={onPress}>
      {`← ${label}`}
    </Text>
  );
}
