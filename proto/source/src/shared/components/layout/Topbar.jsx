/**
 * 본문 패널의 고정 헤더 (CM-01 · CM-02)
 *
 * 흰 배경 · 아래 #DFE1E7 헤어라인 · 18/20 여백. 그림자는 없습니다.
 *  왼쪽: 브레드크럼(그룹 회색 · 화면명 잉크)
 *  오른쪽: AI 질의 버튼(유일한 채움 버튼) · 알림 종(미확인 배지 + 팝오버) · 사용자 아바타(계정 메뉴)
 *
 * 테마 전환 단추는 없습니다 — 앱은 라이트 테마 하나입니다.
 */
import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { pageGroup, pageName } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { DEPTS } from '@shared/constants/dataFields';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { hubGroupOf } from '@shared/navigation/routes';
import Icon from '../ui/Icon';
import { IconButton } from '../ui/Button';
import AlertBell from './AlertBell';
import UserMenu from './UserMenu';

export default function Topbar({ chatAvailable = true }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { currentScreenId, pathname } = useAppNavigation();
  const userInfo = useAuthStore((state) => state.userInfo);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const aiChatOpen = useUiStore((state) => state.aiChatOpen);
  const toggleAiChat = useUiStore((state) => state.toggleAiChat);
  const can = useAuthStore((state) => state.can);

  const [menuOpen, setMenuOpen] = useState(false);

  const dept = DEPTS.find((d) => d.id === userInfo?.dept);
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
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: theme.color.primary }} numberOfLines={1}>
          {crumbPage}
        </Text>
      </View>

      <View style={s.spacer} />

      {/* AI 질의 — 화면에서 유일한 채움 버튼 */}
      {can('ai-chat') && chatAvailable ? (
        <Pressable
          onPress={toggleAiChat}
          accessibilityRole="button"
          accessibilityLabel={aiChatOpen ? 'AI 질의 패널 닫기' : 'AI 질의 패널 열기'}
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
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12.5, fontWeight: '600', color: '#fff' }}>
            {aiChatOpen ? '질의 닫기' : 'AI 질의'}
          </Text>
        </Pressable>
      ) : null}

      {can('alert-list') ? <AlertBell /> : null}

      {/* 계정 메뉴 */}
      <View>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="계정 메뉴"
          style={({ hovered }) => ({
            height: 34,
            paddingLeft: 3,
            paddingRight: 10,
            borderRadius: theme.metrics.radiusSm,
            backgroundColor: menuOpen || hovered ? theme.surface : theme.color.card,
            borderWidth: 1,
            borderColor: theme.hairlineStrong,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          })}
        >
          <View style={{ width: 26, height: 26, borderRadius: 99, backgroundColor: theme.color.info, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 9.5, fontWeight: '600', letterSpacing: 0.2, color: '#fff' }}>{dept?.av || 'ME'}</Text>
          </View>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '500', color: theme.color.foreground }}>
            {userInfo?.name || '게스트'}
          </Text>
          <Icon name="chevronDown" size={12} color={theme.color.mutedForeground} />
        </Pressable>
        {menuOpen ? <UserMenu onClose={() => setMenuOpen(false)} currentDept={dept} /> : null}
      </View>
    </View>
  );
}
