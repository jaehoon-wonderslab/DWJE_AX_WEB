/**
 * 브랜드 로고 — 덕우전자 CI 'D' 심볼의 재해석
 *
 * CI(docs/덕우전자-CI.jpg)의 심볼마크는 'D' 안을 가로지르는 역동적인 획으로 이루어져 있습니다.
 * 여기서는 그 구조를 두 획으로 단순화했습니다.
 *  · 보울(bowl)  — Deokwoo Blue(PANTONE 286C 계열) → 밝은 블루 그라디언트의 D 바깥 곡선
 *  · 슬래시      — Sky Blue 의 기울어진 획. D 의 세로 기둥을 앞으로 기울여 "전진·정밀" 을 표현
 *
 * 그라디언트는 디자인 가이드가 로고·파티클에만 허용하는 요소입니다. UI 컴포넌트에서는 쓰지 않습니다.
 *
 * 사용 예)
 *   <LogoMark size={32} />
 *   <LogoLockup size={28} />              // 마크 + 워드마크
 *   <LogoLockup size={24} compact />      // 마크 + 한 줄 워드마크
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { BRAND } from '@shared/theme/colors';
import { FONT_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/**
 * 심볼마크
 * @param {object} props
 * @param {number} [props.size]  한 변의 길이(px)
 * @param {boolean} [props.mono] 단색(현재 글자색)으로 — 인쇄·비활성 표시용
 */
export function LogoMark({ size = 32, mono = false, style }) {
  const theme = useTheme();
  const fg = theme.color.foreground;
  // CI 원색(PANTONE 286C) 에서 한 단계 밝은 블루로 흐르는 그라디언트
  const bowlFrom = BRAND.deokwooBlue;
  const bowlTo = '#1f6fe0';
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={style} accessibilityLabel="덕우전자 심볼">
      <Defs>
        <LinearGradient id="dwBowl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={bowlFrom} />
          <Stop offset="1" stopColor={bowlTo} />
        </LinearGradient>
        <LinearGradient id="dwSlash" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={BRAND.skyBlue} />
          <Stop offset="1" stopColor="#8fe3ff" />
        </LinearGradient>
      </Defs>
      {/* D 의 보울 — 바깥 반지름 26, 안쪽 반지름 15 */}
      <Path d="M22 6h14a26 26 0 0 1 0 52H22V47h14a15 15 0 0 0 0-30H22Z" fill={mono ? fg : 'url(#dwBowl)'} />
      {/* 기울어진 기둥 — CI 의 관통하는 획 */}
      <Path d="M6 58 20 6h12L18 58Z" fill={mono ? fg : 'url(#dwSlash)'} opacity={mono ? 0.55 : 1} />
    </Svg>
  );
}

/**
 * 마크 + 워드마크 잠금(lockup)
 * @param {object} props
 * @param {number} [props.size]    마크 크기
 * @param {boolean} [props.compact] 한 줄 워드마크(사이드바 접힘 등)
 * @param {boolean} [props.light]   배경이 어두울 때 글자를 흰색으로 고정
 */
export function LogoLockup({ size = 28, compact = false, light = false, style }) {
  const theme = useTheme();
  const fg = light ? '#ffffff' : BRAND.ink;
  const muted = light ? 'rgba(255,255,255,0.6)' : theme.color.mutedForeground;
  const axColor = light ? BRAND.skyBlue : '#1E2A78';
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.4) }, style]}>
      <LogoMark size={size} />
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: Math.round(size * 0.56), lineHeight: Math.round(size * 0.68), fontWeight: '600', letterSpacing: -0.4, color: fg }}>
            덕우전자
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: Math.round(size * 0.42), fontWeight: '600', letterSpacing: 1.2, color: axColor }}>AX</Text>
        </View>
        {!compact ? (
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 9.5, lineHeight: 13, fontWeight: '500', letterSpacing: 0.9, textTransform: 'uppercase', color: muted, marginTop: 1 }}>
            AI Decision Layer
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default LogoMark;
