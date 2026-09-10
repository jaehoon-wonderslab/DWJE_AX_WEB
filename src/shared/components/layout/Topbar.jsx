/**
 * 본문 패널의 고정 헤더 (CM-01 · CM-02)
 *
 * 흰 배경 · 아래 #DFE1E7 헤어라인 · 18/20 여백. 그림자는 없습니다.
 *  왼쪽: 브레드크럼(그룹 회색 · 화면명 잉크)
 *  오른쪽: 덕파트장 AI 버튼(유일한 채움 버튼, 레일 열기/닫기) · 알림 종(미확인 배지 + 팝오버)
 *  계정 메뉴는 2026-09-10 부터 사이드바 하단 사용자 카드에 있습니다.
 *
 * 테마 전환 단추는 없습니다 — 앱은 라이트 테마 하나입니다.
 */
import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { pageGroup, pageName } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { hubGroupOf } from '@shared/navigation/routes';
import Icon from '../ui/Icon';
import { IconButton } from '../ui/Button';
import AlertBell from './AlertBell';

export default function Topbar({ chatAvailable = true }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { currentScreenId, pathname } = useAppNavigation();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const aiChatOpen = useUiStore((state) => state.aiChatOpen);
  const toggleAiChat = useUiStore((state) => state.toggleAiChat);
  const can = useAuthStore((state) => state.can);

  const hubGroup = hubGroupOf(pathname);
  const crumbGroup = hubGroup || pageGroup(currentScreenId);
  // 허브 화면: 보고서처럼 한 줄 그룹은 "보고서 선택", 나머지는 "메뉴"
  const crumbPage = hubGroup ? (hubGroup === '보고서' ? '보고서 선택' : '메뉴') : pageName(currentScreenId);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        height: theme.metrics.topbarHeight,
        borderBottomWidth: 1,
        borderBottomColor: theme.divider,
        backgroundColor: theme.color.card,
        zIndex: 20,
      }}
    >
      {width <= 860 ? <IconButton name="menu" onPress={toggleSidebar} title="메뉴" /> : null}

      {/* 브레드크럼 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Text style={[s.label, { color: theme.color.mutedForeground }]} numberOfLines={1}>
          {crumbGroup}
        </Text>
        <Icon name="chevronRight" size={12} color={theme.color.mutedForeground} />
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '600', letterSpacing: -0.1, color: theme.color.primary }} numberOfLines={1}>
          {crumbPage}
        </Text>
      </View>

      <View style={s.spacer} />

      {/* 덕파트장 AI — 화면에서 유일한 채움 버튼 (레일 열기/닫기) */}
      {can('ai-chat') && chatAvailable ? (
        <Pressable
          onPress={toggleAiChat}
          accessibilityRole="button"
          accessibilityLabel={aiChatOpen ? '덕파트장 AI 패널 닫기' : '덕파트장 AI 패널 열기'}
          style={({ hovered, pressed }) => ({
            height: 34,
            paddingHorizontal: 14,
            borderRadius: theme.metrics.radiusAction,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: aiChatOpen ? theme.color.info : pressed ? theme.color.info : theme.color.primary,
            opacity: hovered ? 0.92 : 1,
          })}
        >
          <Icon name="sparkles" size={15} color="#fff" />
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16.5, fontWeight: '600', color: '#fff' }}>
            {aiChatOpen ? 'AI 닫기' : '덕파트장 AI'}
          </Text>
        </Pressable>
      ) : null}

      {can('alert-list') ? <AlertBell /> : null}

    </View>
  );
}
