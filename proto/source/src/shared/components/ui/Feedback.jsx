/**
 * 안내 · 빈 상태 · 로딩 표시 (CM-05)
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

/** 화면 상단 안내 박스 (정보색 틴트) */
export function Hint({ children, style, icon = 'info' }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[s.hint, style]}>
      <Icon name={icon} size={15} color={theme.color.primary} />
      <Text style={s.hintText}>{children}</Text>
    </View>
  );
}

/**
 * 폼 상단 알림 — 오류 · 성공 · 안내
 *
 * API 실패 응답에 `error.field` 가 없을 때 메시지를 붙이는 자리입니다.
 * (field 가 있으면 해당 입력란 아래에 `<Field error=…>` 로 답니다)
 *
 * @param {object} props tone 은 error | success | info
 */
export function FormAlert({ children, tone = 'error', style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  if (!children) return null;

  const token = tone === 'success' ? 'success' : tone === 'info' ? 'info' : 'destructive';
  const icon = tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'alert';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          paddingVertical: 11,
          paddingHorizontal: 14,
          borderRadius: theme.metrics.radiusSm,
          backgroundColor: theme.alpha(token, 0.08),
          borderWidth: 1,
          borderColor: theme.alpha(token, 0.24),
        },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Icon name={icon} size={15} color={theme.color[token]} />
      <Text style={[s.textSm, { flex: 1, fontSize: 12.5, lineHeight: 19, fontWeight: '500' }]}>{children}</Text>
    </View>
  );
}

/** 좌측 세로선이 있는 보조 설명 */
export function NoteText({ children, style }) {
  const s = useCommonStyles();
  return (
    <View style={[s.note, style]}>
      <Text style={s.sourceText}>{children}</Text>
    </View>
  );
}

/** 데이터가 없을 때 */
export function EmptyState({ text = '조회된 데이터가 없습니다.', style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[s.empty, style]}>
      <View style={{ width: 28, height: 28, borderRadius: 99, backgroundColor: theme.surfaceHover, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon name="minus" size={13} color={theme.color.mutedForeground} />
      </View>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/**
 * 조회 중 — 삼각형 파티클 세 개가 차례로 숨 쉬는 인디케이터
 * (시스템 스피너 대신 브랜드 모티프를 씁니다)
 */
export function Loading({ text = '조회 중입니다…', style, compact }) {
  const s = useCommonStyles();
  return (
    <View style={[{ paddingVertical: compact ? 18 : 48, alignItems: 'center', gap: 14 }, style]}>
      <Pulse size={compact ? 6 : 8} />
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
    </View>
  );
}

/** 세 점이 순서대로 밝아지는 로딩 모티프 */
export function Pulse({ size = 8, colors }) {
  const theme = useTheme();
  const palette = colors || [theme.color.primary, theme.color.warning, theme.color.ink500];
  const anims = useRef(palette.map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(v, { toValue: 0.25, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.delay((anims.length - 1 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={{ flexDirection: 'row', gap: size, alignItems: 'center' }}>
      {anims.map((v, i) => (
        <Animated.View key={i} style={{ width: size, height: size, borderRadius: 99, backgroundColor: palette[i], opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0.25, 1], outputRange: [0.8, 1.15] }) }] }} />
      ))}
    </View>
  );
}

/** 화면 전체에 걸친 접근 권한 없음 안내 */
export function NoAccess({ dept, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[{ paddingVertical: 72, alignItems: 'center', gap: 12 }, style]}>
      <Text style={s.eyebrow}>Access denied</Text>
      <Text style={[s.pageTitle, { textAlign: 'center' }]}>접근 권한이 없는 화면입니다</Text>
      <Text style={[s.bodySm, { textAlign: 'center', maxWidth: 460 }]}>
        {dept ? `${dept} 에 허용되지 않은 화면입니다. ` : ''}
        시스템관리 &gt; 메뉴 접근 권한에서 부서 권한을 지정해 주세요.
      </Text>
      <View style={{ width: 40, height: 1, backgroundColor: theme.divider, marginTop: 8 }} />
    </View>
  );
}
