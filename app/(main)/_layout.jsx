/**
 * 업무 화면 공통 레이아웃 (CM-01 · CM-03) — 떠 있는 패널 셸
 *
 * 웜 그레이 캔버스 위에 흰 패널이 16px 여백을 두고 놓입니다.
 *   [사이드바 패널] [본문 패널: 상단 헤더 + 화면] [드래그 핸들] [덕반장 AI 레일 패널]
 * 셸 자체는 스크롤하지 않고 패널마다 따로 스크롤합니다.
 *
 * 덕반장 AI 레일 (2026-09-10)
 *  · 자연어 질의 화면(/ai/chat) · 대메뉴 선택 · 시스템관리를 뺀 모든 화면의 오른쪽에 기본으로 열려 있습니다.
 *  · 본문과 레일 사이 핸들을 끌어 폭을 바꿉니다 — 최소 320px, 최대 창 폭의 40%(본문은 480px 이상 남김). 폭은 브라우저에 기억.
 *  · 닫으면 본문 패널 오른쪽 가장자리에 세로 단추가 붙어 다시 열 수 있습니다(단추는 고정, 스크롤 없음).
 *
 * 본문을 그리기 전에 세 가지를 확인합니다.
 *  1) 로그인 여부 — 비로그인이면 /login 으로 보냅니다 (가려던 주소는 next 로 넘겨 로그인 후 복귀)
 *  2) 실적 보유 기간 — 화면마다 날짜 기본값을 잡아야 하므로 본문보다 먼저 받아 둡니다
 *  3) 메뉴 접근 권한 — 권한이 없는 화면은 주소로 직접 들어와도 기본 화면으로 되돌립니다
 */
import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import { HOME_SCREEN_ID } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { hubGroupOf, MENU } from '@shared/navigation/routes';
import { useDataRangeBootstrap } from '@domains/common/controller/useDataRangeBootstrap';
import PageTransition from '@shared/components/brand/PageTransition';
import Sidebar from '@shared/components/layout/Sidebar';
import Topbar from '@shared/components/layout/Topbar';
import AiChatPanelHost from '@shared/components/layout/AiChatPanelHost';
import { Icon, Loading, NoAccess } from '@shared/components/ui';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { BRAND } from '@shared/theme/colors';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 레일 폭 한계 */
const RAIL_MIN = 320;
const RAIL_MAX_RATIO = 0.4;
/** 본문 패널이 최소한 남겨야 하는 폭 */
const CONTENT_MIN = 480;
/** 닫힘 상태의 세로 단추 폭 */
const RAIL_TAB_WIDTH = 32;

/**
 * 덕반장 AI 레일을 아예 내지 않는 대메뉴 그룹.
 *
 * 시스템관리는 값을 「보는」 화면이 아니라 설정을 「고치는」 화면입니다 — 레일에 물어볼 실적이
 * 없는데도 오른쪽 세로 단추가 늘 붙어 본문 폭만 깎고 있었습니다. 하위 화면 전부에 적용합니다.
 * (2026-09-15)
 *
 * 대메뉴 선택 화면(/menu/*)도 마찬가지입니다 — 화면을 고르는 길목일 뿐이라 물어볼 데이터가
 * 아직 없습니다. 이쪽은 그룹을 가리지 않고 허브면 무조건 내리므로 아래 집합에 넣지 않습니다.
 * (2026-09-16)
 */
const RAIL_OFF_GROUPS = new Set(['시스템관리']);

/** 위 그룹에 속한 화면 ID — 경로가 바뀌어도 따라오도록 메뉴 정의에서 뽑습니다 */
const RAIL_OFF_SCREEN_IDS = new Set(
  MENU.filter((group) => RAIL_OFF_GROUPS.has(group.group)).flatMap((group) => group.items.map((item) => item.id)),
);

export default function MainLayout() {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { goToScreen, currentScreenId } = useAppNavigation();

  const pathname = usePathname();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { ready: rangeReady } = useDataRangeBootstrap();
  const can = useAuthStore((state) => state.can);
  const menuPerms = useAuthStore((state) => state.menuPerms);
  const dept = useAuthStore((state) => state.userInfo?.dept);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const aiChatOpen = useUiStore((state) => state.aiChatOpen);
  const aiChatWidth = useUiStore((state) => state.aiChatWidth);
  const setAiChatWidth = useUiStore((state) => state.setAiChatWidth);
  const openAiChat = useUiStore((state) => state.openAiChat);
  const toast = useUiStore((state) => state.toast);

  const hubGroup = hubGroupOf(pathname);
  const allowed = hubGroup
    ? MENU.find((group) => group.group === hubGroup)?.items.some((item) => can(item.id))
    : can(currentScreenId);

  // 권한 없는 화면으로 들어오면 기본 화면으로 돌려보냅니다
  useEffect(() => {
    if (!allowed && (hubGroup || currentScreenId !== HOME_SCREEN_ID) && menuPerms?.length) {
      toast('접근 권한이 없는 화면입니다 — 덕반장 AI 화면으로 이동합니다');
      goToScreen(HOME_SCREEN_ID);
    }
  }, [allowed, currentScreenId, hubGroup, menuPerms, goToScreen, toast]);

  // 좁은 화면(태블릿 세로 이하)에서는 사이드바를 숨깁니다. 그 위로는 접힘(64px 레일) 상태로 남습니다
  const showSidebar = width > 860;
  const sidebarWidth = showSidebar ? (collapsed ? theme.metrics.sidebarCollapsedWidth : theme.metrics.sidebarWidth) : 0;
  // 자연어 질의 화면 자체에서는 옆 레일을 따로 열지 않습니다 (같은 대화가 두 번 보입니다)
  const onChatScreen = currentScreenId === 'ai-chat' && !hubGroup;
  // 대메뉴 선택 화면과 시스템관리에서는 레일도 세로 단추도 내지 않습니다
  const railOff = !!hubGroup || RAIL_OFF_SCREEN_IDS.has(currentScreenId);
  const railAvailable = !onChatScreen && !railOff && width >= 900;
  const chatOpen = aiChatOpen && railAvailable;

  // 레일 폭 한계 — 창 폭의 40% 를 넘지 않고 본문도 최소 폭을 남깁니다
  const gutter = theme.metrics.gutter;
  const railMax = Math.max(RAIL_MIN, Math.min(Math.floor(width * RAIL_MAX_RATIO), width - sidebarWidth - CONTENT_MIN - gutter * 4));
  const railWidth = Math.min(Math.max(aiChatWidth, RAIL_MIN), railMax);

  // 드래그 핸들 — 시작 시 폭을 기억하고 이동량만큼 반대로(왼쪽으로 끌면 넓어짐) 적용합니다
  const drag = useRef({ startX: 0, startWidth: railWidth });
  const onGrant = (e) => { drag.current = { startX: e.nativeEvent.pageX, startWidth: railWidth }; };
  const onMove = (e) => {
    const next = drag.current.startWidth + (drag.current.startX - e.nativeEvent.pageX);
    setAiChatWidth(Math.min(Math.max(next, RAIL_MIN), railMax));
  };

  // 비로그인 접근 — 가려던 주소를 들고 로그인 화면으로 보냅니다
  if (!isLoggedIn) {
    return <Redirect href={{ pathname: '/login', params: { next: attemptedPath(pathname) } }} />;
  }

  return (
    <View style={s.app}>
      {showSidebar ? <Sidebar collapsed={collapsed} /> : null}

      {/* 본문 패널 */}
      <View style={[s.panel, s.main]}>
        <Topbar />
        <View style={{ flex: 1, minHeight: 0, flexDirection: 'row' }}>
          <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {!allowed ? (
              <View style={s.content}>
                <NoAccess dept={dept} />
              </View>
            ) : rangeReady ? (
              // 경로가 바뀔 때마다 본문이 떠오르며 전환됩니다
              <PageTransition routeKey={pathname}>
                <Slot />
              </PageTransition>
            ) : (
              <View style={s.content}>
                <Loading text="조회 기간을 확인하는 중입니다…" />
              </View>
            )}
          </View>

          {/* 레일이 닫혔을 때 — 본문 오른쪽 가장자리에 붙는 덕우 블루 세로 손잡이 (고정 · 스크롤 없음) */}
          {railAvailable && !chatOpen ? (
            <View style={{ width: RAIL_TAB_WIDTH, alignSelf: 'stretch', justifyContent: 'center' }}>
              <Pressable
                onPress={openAiChat}
                accessibilityRole="button"
                accessibilityLabel="덕반장 AI 열기"
                style={({ hovered }) => ({
                  width: RAIL_TAB_WIDTH,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingTop: 14,
                  paddingBottom: 16,
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                  backgroundColor: hovered ? BRAND.deokwooBlueHover : BRAND.deokwooBlue,
                  shadowColor: BRAND.deokwooBlue,
                  shadowOpacity: hovered ? 0.4 : 0.25,
                  shadowRadius: hovered ? 20 : 8,
                  shadowOffset: { width: hovered ? -8 : 0, height: 2 },
                })}
              >
                <Icon name="chevronLeft" size={15} color="#fff" />
                {/* 세로 글자 — 한 글자씩 쌓아 어느 브라우저에서도 같은 모양 */}
                <View style={{ alignItems: 'center', gap: 2 }}>
                  {['덕', '반', '장', 'AI'].map((ch) => (
                    <Text key={ch} style={{ fontFamily: FONT_FAMILY, fontSize: 14.5, lineHeight: 15, fontWeight: '600', letterSpacing: 0.2, color: '#fff' }}>{ch}</Text>
                  ))}
                </View>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* 드래그 핸들 + 덕반장 AI 레일 패널 — 본문 옆에 따로 떠 있습니다 */}
      {chatOpen ? (
        <>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="AI 패널 폭 조절"
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={onGrant}
            onResponderMove={onMove}
            onResponderTerminationRequest={() => false}
            style={{ width: 10, marginHorizontal: -gutter / 2 + 5, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'col-resize' } : {}) }}
          >
            <View style={{ width: 4, height: 44, borderRadius: 99, backgroundColor: theme.hairlineStrong }} />
          </View>
          <AiChatPanelHost width={railWidth} />
        </>
      ) : null}
    </View>
  );
}

/**
 * 로그인 후 되돌아갈 주소를 고릅니다.
 *
 * 주소창에 직접 입력해 들어온 첫 렌더에서는 라우터의 pathname 이 아직 '/' 입니다.
 * 이때는 브라우저 주소를 그대로 씁니다.
 *
 * @param {string} pathname expo-router 가 알려 준 현재 경로
 */
function attemptedPath(pathname) {
  if (pathname && pathname !== '/') return pathname;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.pathname;
  return pathname;
}
