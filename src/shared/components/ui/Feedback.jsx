/**
 * 안내 · 빈 상태 · 로딩 표시 (CM-05)
 */
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

/** 파란 배경의 화면 상단 안내 박스 */
export function Hint({ children, style, icon = 'info' }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[s.hint, style]}>
      <Icon name={icon} size={16} color={theme.color.info} />
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
          gap: 8,
          alignItems: 'flex-start',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: theme.metrics.radius,
          backgroundColor: theme.alpha(token, 0.08),
          borderWidth: 1,
          borderColor: theme.alpha(token, 0.28),
        },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Icon name={icon} size={15} color={theme.color[token]} />
      <Text style={[s.textSm, { flex: 1, fontSize: 12.5, lineHeight: 19 }]}>{children}</Text>
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
  return (
    <View style={[s.empty, style]}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/** 조회 중 */
export function Loading({ text = '조회 중입니다…', style, compact }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[{ paddingVertical: compact ? 18 : 44, alignItems: 'center', gap: 10 }, style]}>
      <ActivityIndicator size={compact ? 'small' : 'large'} color={theme.color.primary} />
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
    </View>
  );
}

/** 화면 전체에 걸친 접근 권한 없음 안내 */
export function NoAccess({ dept, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[s.card, s.empty, style]}>
      <Text style={[s.emptyText, { fontWeight: '600', fontSize: 15, color: theme.color.foreground }]}>접근 권한이 없는 화면입니다</Text>
      <Text style={[s.emptyText, { marginTop: 6 }]}>
        {dept ? `${dept} 에 허용되지 않은 화면입니다. ` : ''}
        시스템관리 &gt; 메뉴 접근 권한에서 부서 권한을 지정해 주세요.
      </Text>
    </View>
  );
}
