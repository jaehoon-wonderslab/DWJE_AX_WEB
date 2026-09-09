/**
 * 칩 (CM-05) — 데이터 소스 표기 · 후속 질문 · 공정/제품 선택 등에 씁니다.
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

/** 눌러서 실행하는 작은 칩 (후속 질문 등) */
export function Chip({ label, onPress, style, textStyle, disabled }) {
  const s = useCommonStyles();
  const Wrapper = onPress && !disabled ? TouchableOpacity : View;
  return (
    <Wrapper style={[s.chip, style]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.chipText, textStyle]}>{label}</Text>
    </Wrapper>
  );
}

/** 데이터 소스 표기 칩 (누를 수 없음) */
export function SourceChip({ label, off, style }) {
  const s = useCommonStyles();
  return (
    <View style={[s.chip, s.chipSrc, off && { opacity: 0.5 }, style]}>
      <Text style={[s.chipText, s.chipSrcText, off && { textDecorationLine: 'line-through' }]}>{label}</Text>
    </View>
  );
}

/**
 * 선택 칩 — 공정·제품처럼 여러 개 중 고르는 필터
 *
 * @param {object} props label 본문 · sub 보조설명 · on 선택 여부
 */
export function SelectChip({ label, sub, on, onPress, small, style }) {
  const s = useCommonStyles();
  return (
    <TouchableOpacity
      style={[s.selChip, small && s.selChipSm, on && s.selChipOn, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[s.selChipText, on && s.selChipOnText]}>{label}</Text>
      {sub ? <Text style={[s.selChipSub, on && s.selChipOnSub]}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

/** 칩들을 감싸는 줄 */
export function ChipRow({ children, style }) {
  const s = useCommonStyles();
  return <View style={[s.chips, style]}>{children}</View>;
}
