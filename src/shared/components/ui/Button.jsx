/**
 * 버튼 (CM-05)
 *
 * 기존 웹의 `<button class="btn btn-primary">` 에 대응합니다.
 * React Native 에서 클릭 가능한 요소는 <TouchableOpacity> 이고, 글자는 반드시 <Text> 안에 씁니다.
 *
 * 사용 예) <Button label="조회" variant="primary" onPress={fetchList} />
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const boxStyle = [
    s.base,
    sm && s.sm,
    variant === 'primary' && s.primary,
    variant === 'outline' && s.outline,
    variant === 'danger' && s.danger,
    disabled && s.disabled,
    style,
  ];
  const labelStyle = [
    s.label,
    sm && s.labelSm,
    variant === 'primary' && s.labelPrimary,
    variant === 'danger' && s.labelDanger,
    textStyle,
  ];
  const iconColor =
    variant === 'primary'
      ? theme.color.primaryForeground
      : variant === 'danger'
        ? theme.color.destructive
        : theme.color.foreground;

  return (
    <TouchableOpacity
      style={boxStyle}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.75}
      disabled={disabled}
      accessibilityRole="button"
    >
      {icon ? <Icon name={icon} size={sm ? 14 : 15} color={iconColor} /> : null}
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** 아이콘만 있는 정사각 버튼 (상단바 · 카드 헤더용) */
export function IconButton({ name, onPress, size = 34, iconSize = 16, style, color, title }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.metrics.radius,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.color.border,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={color || theme.color.mutedForeground} />
    </TouchableOpacity>
  );
}

/** 버튼을 가로로 늘어놓는 묶음 */
export function ButtonRow({ children, style }) {
  return <View style={[{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, style]}>{children}</View>;
}

const useStyles = (theme) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: theme.metrics.radius,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    sm: { height: 28, paddingHorizontal: 9 },
    primary: { backgroundColor: theme.color.primary },
    outline: { borderColor: theme.color.border, backgroundColor: theme.color.card },
    danger: { borderColor: theme.alpha('destructive', 0.4), backgroundColor: theme.alpha('destructive', 0.06) },
    disabled: { opacity: 0.45 },
    label: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '500', color: theme.color.foreground },
    labelSm: { fontSize: 12 },
    labelPrimary: { color: theme.color.primaryForeground },
    labelDanger: { color: theme.color.destructive },
  });
