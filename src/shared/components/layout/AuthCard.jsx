/**
 * [View] 인증 화면 공통 껍데기 (로그인 · 회원가입 · 비밀번호 찾기)
 *
 * 사이드바 없이 화면 가운데에 카드 하나만 놓는 구조입니다.
 * 세 화면이 브랜드 머리글 · 카드 · 하단 링크를 똑같이 쓰므로 여기로 묶었습니다.
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/**
 * @param {object} props
 * @param {string} props.title    카드 제목
 * @param {string} [props.desc]   제목 아래 설명
 * @param {number} [props.width]  카드 최대 너비 (기본 420)
 * @param {React.ReactNode} [props.footer] 카드 아래 링크 줄
 */
export default function AuthCard({ title, desc, width = 420, children, footer }) {
  const s = useCommonStyles();
  const theme = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.color.background }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingVertical: 40 }}
    >
      <View style={{ width: '100%', maxWidth: width, gap: 16 }}>
        {/* 브랜드 — 사이드바와 같은 표기 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              backgroundColor: theme.color.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.color.primaryForeground, fontWeight: '700', fontSize: 14 }}>AX</Text>
          </View>
          <View>
            <Text style={[s.textSm, { fontSize: 15, fontWeight: '700' }]}>덕우전자 AX</Text>
            <Text style={[s.textXs, { fontSize: 11 }]}>AI 의사결정 지원 계층</Text>
          </View>
        </View>

        {/* 본문 카드 */}
        <View style={[s.card, { width: '100%' }]}>
          <View style={[s.cardHead, { flexDirection: 'column', alignItems: 'flex-start', gap: 3 }]}>
            <Text style={s.cardHeadTitle}>{title}</Text>
            {desc ? <Text style={s.cardHeadSub}>{desc}</Text> : null}
          </View>
          <View style={[s.cardBody, { gap: 14 }]}>{children}</View>
        </View>

        {footer}
      </View>
    </ScrollView>
  );
}

/**
 * 카드 아래에 놓는 링크 줄 — 「계정이 없으신가요? 회원가입」 형태
 *
 * @param {Array<{ text?: string, label: string, onPress: Function }>} links
 */
export function AuthLinks({ links = [] }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {links.map((link, i) => (
        <View key={link.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {i > 0 ? <Text style={[s.textXs, { color: theme.color.border }]}>|</Text> : null}
          {link.text ? <Text style={s.textXs}>{link.text}</Text> : null}
          <TouchableOpacity onPress={link.onPress} activeOpacity={0.7} accessibilityRole="link">
            <Text style={[s.textXs, { color: theme.color.primary, fontWeight: '600' }]}>{link.label}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
