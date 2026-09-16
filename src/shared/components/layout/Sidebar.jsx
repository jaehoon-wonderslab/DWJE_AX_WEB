/**
 * 좌측 사이드바 패널 (CM-01)
 *
 * 흰 패널(24px 반지름) 하나에 로고 블록 · 아코디언 내비 · 하단 고정 사용자 카드가 놓입니다.
 *  · 내비 행: 9/10 여백 · 12px 반지름 · 16px 아이콘 + 12.5px 라벨 + 쉐브론.
 *    활성은 600 · 잉크색 · #FAFAFA 채움, 비활성은 500 · #3C3C3C. 호버 #FAFAFA.
 *  · 하위 항목: 14px 들여쓰기 · 12px 라벨 · 5px 점(선택 = 앰버, 아니면 #DFE1E7).
 *  · 접힘(64px 레일): 심볼마크 + 그룹 아이콘만 남습니다.
 *  · `hidden` 그룹(이상 알림)은 그리지 않습니다 — 상단 종 버튼으로 들어갑니다.
 *
 * 메뉴 항목은 실제 링크(<Link>)입니다. 새 탭 열기·주소 복사가 그대로 동작하고,
 * 로그인 계정의 소속 부서 권한으로 필터링해 접근 가능한 항목만 그립니다.
 *
 * 2026-09-10 변경
 *  · 「덕반장 AI」(자연어 질의) 는 스크롤되는 메뉴 목록 밖, 로고 블록 아래 **고정 카드 버튼**으로 둡니다.
 *    누를 수 있는 버튼임이 보이도록 채움 배경 + 아이콘 + 캡션("AI를 통해 궁금한 것을 물어보세요").
 *  · 계정 메뉴(현재 계정 · 로그아웃)는 상단바에서 내려와 하단 사용자 카드를 누르면 위로 뜹니다.
 *
 * 2026-09-16 변경 (화면설계 v03)
 *  · 「메뉴 접기」는 로고와 같은 줄의 36×32 네모 단추입니다. 접히면 로고 아래로 내려가
 *    덕우 블루 틴트로 채워지고, 화살표가 뒤집혀 「펼치기」임을 보여 줍니다.
 *  · 「덕반장 AI」는 덕우 블루(#0033a0) 채움 버튼 — 흰 글자 · 반투명 아이콘 타일 · 스카이블루 생존 점.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { MENU } from '@shared/constants/menu';
import { DEPTS } from '@shared/constants/dataFields';
import { positionLabel } from '@shared/constants/accounts';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { hubGroupOf } from '@shared/navigation/routes';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { BRAND } from '@shared/theme/colors';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { LogoLockup, LogoMark } from '../brand/Logo';
import Hoverable from '../ui/Hoverable';
import Icon from '../ui/Icon';
import UserMenu from './UserMenu';

/** 그룹별 아이콘 (디자인 시스템 선 아이콘) */
const GROUP_ICON = {
  'AI 어시스턴트': 'sparkles',
  대시보드: 'grid',
  '생산 및 품질 관리': 'activity',
  보고서: 'file',
  '이상 알림': 'bell',
  시스템관리: 'settings',
};

export default function Sidebar({ collapsed = false }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);
  const userInfo = useAuthStore((state) => state.userInfo);
  const servingModelVer = useAuthStore((state) => state.servingModelVer);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const { currentScreenId: currentId, pathname } = useAppNavigation();
  const currentHubGroup = hubGroupOf(pathname);

  const [menuOpen, setMenuOpen] = useState(false);

  // 현재 화면이 속한 그룹은 자동으로 펼칩니다
  const [openGroups, setOpenGroups] = useState({});
  useEffect(() => {
    // 허브 화면이면 그 그룹을, 아니면 현재 화면이 속한 그룹을 펼칩니다
    // (허브에서는 currentId 가 기본 화면(ai-chat)으로 잡혀 첫 그룹이 열리던 문제를 막습니다)
    const g = currentHubGroup
      ? MENU.find((x) => x.group === currentHubGroup)
      : MENU.find((x) => x.items.some((i) => i.id === currentId));
    if (g) setOpenGroups((prev) => ({ ...prev, [g.group]: true }));
  }, [currentId, currentHubGroup]);

  // menuPerms 가 바뀌면(계정 전환) 메뉴가 다시 계산됩니다. hidden 그룹은 사이드바에 내지 않습니다
  const groups = MENU.filter((g) => !g.hidden && !g.solo)
    .map((g) => ({ ...g, items: g.items.filter((it) => can(it.id)) }))
    .filter((g) => g.items.length);
  // 고정 카드로 그리는 단독 항목(덕반장 AI)
  const aiItem = MENU.find((g) => g.solo)?.items.find((it) => can(it.id)) || null;
  const aiOn = aiItem ? aiItem.id === currentId : false;

  const dept = DEPTS.find((d) => d.id === userInfo?.dept);
  const width = collapsed ? theme.metrics.sidebarCollapsedWidth : theme.metrics.sidebarWidth;

  return (
    <View style={[s.panel, { width, flexShrink: 0 }]}>
      {/* 로고 블록 + 메뉴 접기 단추 — 펼침일 때는 로고 오른쪽, 접힘일 때는 로고 아래 */}
      <View style={{ paddingTop: 18, paddingBottom: 12, paddingHorizontal: 12, flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: 9 }}>
        {collapsed ? (
          <LogoMark size={30} />
        ) : (
          <View style={{ flex: 1, minWidth: 0 }}>
            <LogoLockup size={30} compact />
          </View>
        )}
        <Pressable
          onPress={toggleSidebar}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          // 접히면 파란 틴트로 채워 "여기를 누르면 다시 펼쳐진다"를 남겨 둡니다
          style={({ hovered }) => ({
            width: 36,
            height: 32,
            flexShrink: 0,
            borderRadius: theme.metrics.radiusSm,
            borderWidth: 1,
            borderColor: hovered ? BRAND.deokwooBlue : collapsed ? 'rgba(0,51,160,0.28)' : theme.hairlineStrong,
            backgroundColor: collapsed ? 'rgba(0,51,160,0.08)' : theme.color.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...(collapsed
              ? { shadowColor: BRAND.deokwooBlue, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }
              : null),
          })}
        >
          {/* 화살표는 하나만 두고 방향만 뒤집습니다 — 펼침이면 왼쪽(접기), 접힘이면 오른쪽(펼치기) */}
          <View style={{ transform: [{ scaleX: collapsed ? 1 : -1 }] }}>
            <Icon name="logout" size={16} color={collapsed ? BRAND.deokwooBlue : theme.color.secondaryForeground} />
          </View>
        </Pressable>
      </View>

      {/* 고정 — 덕반장 AI (스크롤 영향 없음) */}
      {aiItem ? (
        <View style={{ paddingHorizontal: collapsed ? 12 : 10, paddingBottom: 10, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
          <Link href={aiItem.path} asChild>
            <Hoverable
              accessibilityLabel={`${aiItem.name} — AI를 통해 궁금한 것을 물어보세요`}
              // 덕우 블루 채움 — 사이드바에서 유일한 채움 버튼이라 "여기부터 물어보면 된다"가 바로 읽힙니다
              hoverStyle={({ hovered, pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 10,
                height: 44,
                paddingHorizontal: collapsed ? 0 : 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: aiOn ? 'rgba(255,255,255,0.55)' : 'transparent',
                backgroundColor: aiOn || hovered || pressed ? BRAND.deokwooBlueHover : BRAND.deokwooBlue,
              })}
            >
              <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Icon name="sparkles" size={15} color="#fff" />
              </View>
              {!collapsed ? (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 18, fontWeight: '600', letterSpacing: -0.2, color: '#fff' }} numberOfLines={1}>{aiItem.name}</Text>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12.5, lineHeight: 15, fontWeight: '500', color: 'rgba(255,255,255,0.72)' }} numberOfLines={1}>AI를 통해 궁금한 것을 물어보세요</Text>
                </View>
              ) : null}
              {/* 살아 있는 세션 점 — 스카이블루에 옅은 링 */}
              {!collapsed ? (
                <View style={{ width: 13, height: 13, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,174,239,0.25)' }}>
                  <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: BRAND.skyBlue }} />
                </View>
              ) : null}
            </Hoverable>
          </Link>
        </View>
      ) : null}

      {/* 아코디언 내비 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: collapsed ? 14 : 10, paddingBottom: 16, gap: 2 }}
        showsVerticalScrollIndicator={false}
        nativeID="ax-sidebar-scroll"
      >
        {groups.map((g) => {
          const icon = GROUP_ICON[g.group] || 'grid';
          const hasActive = currentHubGroup === g.group || g.items.some((i) => i.id === currentId);

          // 한 줄 그룹(보고서) — 허브로 가는 행 하나. 하위 보고서는 허브의 드롭다운에서 고릅니다
          if (g.single) {
            return (
              <Link key={g.group} href={g.hubPath} asChild>
                <Hoverable hoverStyle={({ hovered }) => navRow(theme, { on: hasActive, hovered, collapsed })} accessibilityLabel={g.group}>
                  <Icon name={icon} size={16} color={hasActive ? theme.color.primary : theme.color.secondaryForeground} />
                  {!collapsed ? <Text style={[navLabel(theme, hasActive), { flex: 1 }]} numberOfLines={1}>{g.group}</Text> : null}
                </Hoverable>
              </Link>
            );
          }

          const open = !!openGroups[g.group] && !collapsed;
          return (
            <View key={g.group}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Link href={g.hubPath} asChild>
                  <Hoverable hoverStyle={({ hovered }) => ({ ...navRow(theme, { on: hasActive, hovered, collapsed }), flex: 1 })} accessibilityLabel={g.group}>
                    <Icon name={icon} size={16} color={hasActive ? theme.color.primary : theme.color.secondaryForeground} />
                    {!collapsed ? <Text style={[navLabel(theme, hasActive), { flex: 1 }]} numberOfLines={1}>{g.group}</Text> : null}
                    {!collapsed ? <Text style={[s.caption, { fontVariant: ['tabular-nums'] }]}>{g.items.length}</Text> : null}
                  </Hoverable>
                </Link>
                {!collapsed ? (
                  <Pressable
                    accessibilityLabel={`${g.group} 하위 메뉴 ${open ? '접기' : '펼치기'}`}
                    onPress={() => setOpenGroups((prev) => ({ ...prev, [g.group]: !prev[g.group] }))}
                    style={({ hovered }) => ({ width: 28, height: 28, borderRadius: theme.metrics.radiusXs, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? theme.surface : 'transparent' })}
                  >
                    <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} color={theme.color.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>

              {open ? (
                <View style={{ marginLeft: 14, paddingBottom: 4 }}>
                  {g.items.map((it) => {
                    const on = it.id === currentId;
                    return (
                      <Link key={it.id} href={it.path} asChild>
                        <Hoverable
                          hoverStyle={({ hovered }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 9,
                            paddingVertical: 7,
                            paddingHorizontal: 10,
                            borderRadius: theme.metrics.radiusXs,
                            backgroundColor: on || hovered ? theme.surface : 'transparent',
                          })}
                        >
                          <View style={{ width: 5, height: 5, borderRadius: 99, backgroundColor: on ? theme.color.warning : theme.divider }} />
                          <Text style={{ flex: 1, fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 17, fontWeight: on ? '600' : '500', color: on ? theme.color.primary : theme.color.secondaryForeground }} numberOfLines={1}>
                            {it.name}
                          </Text>
                          {it.tag === '필수' ? <Text style={[s.caption, { fontSize: 14 }]}>필수</Text> : null}
                        </Hoverable>
                      </Link>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
        {!groups.length ? (
          <Text style={[s.caption, { padding: 10, lineHeight: 16 }]}>
            소속 부서에 허용된 메뉴가 없습니다. 시스템관리 &gt; 메뉴 접근 권한에서 지정해 주세요.
          </Text>
        ) : null}
      </ScrollView>

      {/* 하단 고정 사용자 카드 — 누르면 계정 메뉴(현재 계정 · 로그아웃)가 위로 뜹니다 */}
      <View style={{ margin: 10, marginTop: 0, position: 'relative', zIndex: 30 }}>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="계정 메뉴"
          style={({ hovered }) => ({ padding: collapsed ? 8 : 12, borderRadius: theme.metrics.radius, backgroundColor: menuOpen || hovered ? theme.surfaceHover : theme.surface, borderWidth: 1, borderColor: menuOpen ? theme.hairlineStrong : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' })}
        >
          <View style={{ width: 30, height: 30, borderRadius: 99, backgroundColor: theme.color.info, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '600', letterSpacing: 0.2, color: '#fff' }}>{dept?.av || 'ME'}</Text>
          </View>
          {!collapsed ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.textSm, { fontWeight: '600', color: theme.color.primary }]} numberOfLines={1}>
                {userInfo?.name || '게스트'} <Text style={{ fontWeight: '500', color: theme.color.mutedForeground }}>{positionLabel(userInfo?.pos)}</Text>
              </Text>
              <Text style={s.caption} numberOfLines={1}>
                {userInfo?.dept || '—'}{servingModelVer ? ` · 모델 ${servingModelVer}` : ''}
              </Text>
            </View>
          ) : null}
          {!collapsed ? <Icon name={menuOpen ? 'chevronDown' : 'chevronUp'} size={13} color={theme.color.mutedForeground} /> : null}
        </Pressable>
        {menuOpen ? <UserMenu placement="up" onClose={() => setMenuOpen(false)} /> : null}
      </View>
    </View>
  );
}

/** 내비 행 스타일 */
function navRow(theme, { on, hovered, collapsed }) {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: collapsed ? 0 : 10,
    height: collapsed ? 38 : undefined,
    borderRadius: theme.metrics.radiusSm,
    backgroundColor: on || hovered ? theme.surface : 'transparent',
  };
}

function navLabel(theme, on) {
  return { fontFamily: FONT_FAMILY, fontSize: 16.5, lineHeight: 18, fontWeight: on ? '600' : '500', color: on ? theme.color.primary : theme.color.secondaryForeground };
}
