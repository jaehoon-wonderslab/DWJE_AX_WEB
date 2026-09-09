/**
 * 버튼 (CM-05)
 *
 * 참조 스타일의 버튼 체계를 따릅니다.
 *  · primary — 잉크 네이비 채움 · 14px 반지름 · 흰 글자. 화면에서 유일한 채움 버튼(주요 동작).
 *  · outline — 흰 배경 · rgba(0,0,0,.06) 테두리 · 12px 반지름. 보조 동작. 호버 #FAFAFA.
 *  · ghost   — 배경·테두리 없이 글자만. 3차 동작·링크.
 *  · danger  — 붉은 틴트. 되돌리기 어려운 동작.
 * 라벨은 12.5px(sm 12px) · weight 500. 앰버는 버튼에 쓰지 않습니다.
 *
 * 사용 예) <Button label="조회" variant="primary" onPress={fetchList} />
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@shared/theme/useTheme';
import { FONT_FAMILY } from '@shared/theme/styles';
import Icon from './Icon';

export default function Button({
  label,
  onPress,
  variant = 'outline', // primary | outline | ghost | danger
  size = 'md', // md | sm
  icon, // 왼쪽 아이콘 이름
  disabled = false,
  style,
  textStyle,
}) {
  const theme = useTheme();
  const s = useStyles(theme);
  const sm = size === 'sm';

  const labelStyle = [
    s.label,
    sm && s.labelSm,
    variant === 'primary' && s.labelPrimary,
    variant === 'danger' && s.labelDanger,
    variant === 'ghost' && s.labelGhost,
    textStyle,
  ];
  const iconColor =
    variant === 'primary'
      ? theme.color.primaryForeground
      : variant === 'danger'
        ? theme.color.destructive
        : variant === 'ghost'
          ? theme.color.info
          : theme.color.secondaryForeground;

  return (
    <Pressable
      style={({ hovered, pressed }) => [
        s.base,
        sm && s.sm,
        variant === 'primary' && s.primary,
        variant === 'outline' && s.outline,
        variant === 'ghost' && s.ghost,
        variant === 'danger' && s.danger,
        hovered && !disabled && (variant === 'primary' ? s.primaryHover : variant === 'danger' ? s.dangerHover : s.hover),
        pressed && !disabled && s.pressed,
        disabled && s.disabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {icon ? <Icon name={icon} size={sm ? 13 : 14} color={iconColor} /> : null}
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 34×34 정사각 아이콘 버튼 — 흰 배경 · 옅은 테두리 · 12px 반지름 (헤더·카드 동작) */
export function IconButton({ name, onPress, size = 34, iconSize = 16, style, color, title, active = false }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ hovered, pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: theme.metrics.radiusSm,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.hairlineStrong,
          backgroundColor: active ? theme.surfaceHover : hovered || pressed ? theme.surface : theme.color.card,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={color || (active ? theme.color.primary : theme.color.secondaryForeground)} />
    </Pressable>
  );
}

/** 버튼을 가로로 늘어놓는 묶음 */
export function ButtonRow({ children, style }) {
  return <View style={[{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, style]}>{children}</View>;
}

const cache = new Map();
const useStyles = (theme) => {
  if (cache.has(theme.mode)) return cache.get(theme.mode);
  const s = StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 34,
      paddingHorizontal: 14,
      borderRadius: theme.metrics.radiusSm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    sm: { height: 28, paddingHorizontal: 11 },
    primary: { backgroundColor: theme.color.primary, borderRadius: theme.metrics.radiusAction },
    primaryHover: { backgroundColor: theme.color.info },
    outline: { borderColor: theme.hairlineStrong, backgroundColor: theme.color.card },
    ghost: { backgroundColor: 'transparent', paddingHorizontal: 8 },
    danger: { borderColor: theme.alpha('destructive', 0.25), backgroundColor: theme.alpha('destructive', 0.06) },
    dangerHover: { backgroundColor: theme.alpha('destructive', 0.12) },
    hover: { backgroundColor: theme.surface },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.45 },
    label: { fontFamily: FONT_FAMILY, fontSize: 12.5, lineHeight: 17, fontWeight: '500', color: theme.color.secondaryForeground },
    labelSm: { fontSize: 12, lineHeight: 16 },
    labelPrimary: { color: theme.color.primaryForeground, fontWeight: '600' },
    labelDanger: { color: theme.color.destructive },
    labelGhost: { color: theme.color.info },
  });
  cache.set(theme.mode, s);
  return s;
};
