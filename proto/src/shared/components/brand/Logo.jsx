/**
 * 브랜드 로고 — 덕우전자 CI 심볼마크
 *
 * CI 원본(docs/덕우전자-CI.jpg)의 심볼마크를 그대로 씁니다.
 * 시트에서 가장 큰 인스턴스(195×184)를 잘라 흰 배경을 알파로 빼고 4배로 키운 것이
 * `src/assets/logo-mark.png` (780×736) 입니다.
 *
 * 한때 이 자리에는 CI 를 손으로 옮겨 그린 근사 도형(D 보울 + 기울어진 획)이 있었습니다.
 * 실제 심볼과 형태가 달라 CI 원본으로 교체했습니다. 임의로 다시 그리지 마십시오.
 *
 * 상자는 정사각(size×size)이고 심볼은 그 안에 contain 으로 놓입니다.
 * 심볼 자체는 가로가 6% 더 길어 위아래로 아주 조금 여백이 생깁니다 — 기존 배치를 건드리지
 * 않으려고 정사각을 유지했습니다. (EntryTransition 의 입자 형상도 같은 규칙으로 맞춥니다)
 *
 * 사용 예)
 *   <LogoMark size={32} />
 *   <LogoLockup size={28} />              // 마크 + 워드마크
 *   <LogoLockup size={24} compact />      // 마크 + 한 줄 워드마크
 */
import React from 'react';
import { Image, Text, View } from 'react-native';
import { BRAND } from '@shared/theme/colors';
import { FONT_FAMILY } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** CI 심볼마크 — 흰 배경을 알파로 뺀 투명 PNG */
export const LOGO_MARK_SOURCE = require('../../../assets/logo-mark.png');

/**
 * 심볼마크
 * @param {object} props
 * @param {number} [props.size]  상자 한 변의 길이(px)
 * @param {boolean} [props.mono] 단색(현재 글자색)으로 — 인쇄·비활성 표시용
 */
export function LogoMark({ size = 32, mono = false, style }) {
  const theme = useTheme();
  return (
    <Image
      source={LOGO_MARK_SOURCE}
      accessibilityLabel="덕우전자 심볼"
      resizeMode="contain"
      style={[{ width: size, height: size }, mono ? { tintColor: theme.color.foreground } : null, style]}
    />
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
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13.5, lineHeight: 13, fontWeight: '500', letterSpacing: 0.9, textTransform: 'uppercase', color: muted, marginTop: 1 }}>
            AI Decision Layer
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default LogoMark;
