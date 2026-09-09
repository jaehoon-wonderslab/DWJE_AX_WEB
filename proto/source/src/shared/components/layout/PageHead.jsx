/**
 * 화면 머리말 (CM-03)
 *
 * 제목(21px · 600 · -0.02em · 잉크) · 설명(12.5px 캡션 회색) · 우측 액션으로 구성됩니다.
 * `eyebrow` 를 주면 제목 위에 11px 소제목을 붙입니다.
 * full 화면(자연어 질의처럼 전체 영역을 쓰는 화면)에서는 사용하지 않습니다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';

export default function PageHead({ title, desc, eyebrow, actions, style }) {
  const s = useCommonStyles();
  return (
    <View style={[s.pageHead, style]}>
      <View style={{ flexShrink: 1, minWidth: 260 }}>
        {eyebrow ? <Text style={[s.eyebrow, { marginBottom: 8 }]}>{eyebrow}</Text> : null}
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
    <Pressable onPress={onPress} accessibilityRole="link" style={({ hovered }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 12, opacity: hovered ? 0.7 : 1 })}>
      <Icon name="arrowLeft" size={13} color={theme.color.info} />
      <Text style={[s.textSm, { color: theme.color.info }]}>{label}</Text>
    </Pressable>
  );
}
