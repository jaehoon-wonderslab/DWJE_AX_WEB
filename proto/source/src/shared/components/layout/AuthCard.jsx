/**
 * [View] 인증 화면 공통 껍데기 (로그인 · 회원가입 · 비밀번호 찾기)
 *
 * 앱과 같은 화이트 테마입니다 — 웜 그레이 캔버스 위에 **흰 패널 한 장**이 16px 여백을 두고 떠 있습니다.
 * 패널 안은 둘로 나뉩니다.
 *  · 왼쪽 — 브랜드 · 소제목 · 제목 · 본문. 뒤로 잉크 계열의 삼각형 파티클 성좌가 떠 있습니다.
 *  · 오른쪽 — 폼. 제목 21px · 설명 캡션 회색 · 입력칸 · 잉크 채움 버튼 · 고스트 링크.
 * 두 영역은 #DFE1E7 헤어라인 하나로만 나뉩니다. 좁은 화면(< 960)에서는 한 열로 쌓입니다.
 *
 * 세 화면이 같은 껍데기를 쓰므로 여기로 묶었습니다.
 */
import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import ConstellationField, { LIGHT_PALETTE } from '../brand/ConstellationField';
import { LogoLockup } from '../brand/Logo';

const HERO = {
  eyebrow: 'AI Decision Support Layer',
  headline: ['현장의 답은', '이미 데이터 안에 있습니다.'],
  body: 'MES 위에 얹은 AI 계층이 생산·품질·설비 데이터를 읽고, 질의하면 근거와 함께 답합니다. 보고서는 스스로 정리되고, 이상은 먼저 알려 드립니다.',
};

/**
 * @param {object} props
 * @param {string} props.title    폼 제목
 * @param {string} [props.desc]   제목 아래 설명
 * @param {number} [props.width]  폼 최대 너비 (기본 400)
 * @param {React.ReactNode} [props.footer] 폼 아래 링크 줄
 */
export default function AuthCard({ title, desc, width = 400, children, footer }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width: vw } = useWindowDimensions();
  const wide = vw >= 960;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: theme.metrics.gutter }}>
      <View style={[s.panel, { flex: 1, flexDirection: wide ? 'row' : 'column' }]}>
        {/* ── 왼쪽 · 브랜드 ─────────────────────────────── */}
        <View style={{ flex: wide ? 1.1 : undefined, minHeight: wide ? undefined : 220, position: 'relative', overflow: 'hidden', borderRightWidth: wide ? 1 : 0, borderBottomWidth: wide ? 0 : 1, borderColor: theme.divider }}>
          <ConstellationField
            shape="brain"
            palette={LIGHT_PALETTE}
            density={wide ? 0.9 : 0.6}
            opacity={wide ? 0.55 : 0.4}
            centerX={wide ? 0.68 : 0.78}
            centerY={wide ? 0.42 : 0.5}
            scale={wide ? 0.32 : 0.34}
            activity={2}
          />
          <View style={{ flex: 1, padding: wide ? 40 : 24, justifyContent: 'space-between', gap: 24 }}>
            <LogoLockup size={30} />
            <View style={{ maxWidth: 520 }}>
              <Text style={[s.eyebrow, { marginBottom: 12 }]}>{HERO.eyebrow}</Text>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: wide ? 34 : 24, lineHeight: wide ? 44 : 32, fontWeight: '600', letterSpacing: wide ? -0.68 : -0.48, color: theme.color.primary }}>
                {HERO.headline.join(wide ? '\n' : ' ')}
              </Text>
              {wide ? <Text style={[s.body, { marginTop: 16, color: theme.color.secondaryForeground, maxWidth: 460, fontSize: 13, lineHeight: 22 }]}>{HERO.body}</Text> : null}
            </View>
            {wide ? <Text style={s.caption}>© DERKWOO ELECTRONICS CO., LTD. · On-premise AI</Text> : null}
          </View>
        </View>

        {/* ── 오른쪽 · 폼 ─────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: wide ? 48 : 28 }}
        >
          <View style={{ width: '100%', maxWidth: width, gap: 16 }}>
            <View style={{ marginBottom: 4 }}>
              <Text style={s.pageTitle}>{title}</Text>
              {desc ? <Text style={[s.pageDesc, { marginTop: 6 }]}>{desc}</Text> : null}
            </View>

            <View style={{ gap: 14 }}>{children}</View>

            {footer ? <View style={{ marginTop: 4 }}>{footer}</View> : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * 폼 아래에 놓는 링크 줄 — 「계정이 없으신가요? 회원가입」 형태 (고스트 텍스트 링크)
 *
 * @param {Array<{ text?: string, label: string, onPress: Function }>} links
 */
export function AuthLinks({ links = [] }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {links.map((link, i) => (
        <View key={link.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {i > 0 ? <View style={{ width: 3, height: 3, borderRadius: 99, backgroundColor: theme.divider }} /> : null}
          {link.text ? <Text style={s.bodySm}>{link.text}</Text> : null}
          <Pressable onPress={link.onPress} accessibilityRole="link" style={({ hovered }) => ({ opacity: hovered ? 0.75 : 1 })}>
            <Text style={[s.textSm, { fontWeight: '600', color: theme.color.info }]}>{link.label}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
