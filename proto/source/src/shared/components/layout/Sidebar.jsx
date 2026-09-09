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
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { LogoLockup, LogoMark } from '../brand/Logo';
import Hoverable from '../ui/Hoverable';
import Icon from '../ui/Icon';

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
  const groups = MENU.filter((g) => !g.hidden)
    .map((g) => ({ ...g, items: g.items.filter((it) => can(it.id)) }))
    .filter((g) => g.items.length);

  const dept = DEPTS.find((d) => d.id === userInfo?.dept);
  const width = collapsed ? theme.metrics.sidebarCollapsedWidth : theme.metrics.sidebarWidth;

  return (
    <View style={[s.panel, { width, flexShrink: 0 }]}>
      {/* 로고 블록 + 접기 단추 */}
      <View style={{ paddingTop: 18, paddingBottom: 12, paddingHorizontal: collapsed ? 0 : 18, alignItems: collapsed ? 'center' : 'flex-start', gap: 12 }}>
        {collapsed ? <LogoMark size={30} /> : <LogoLockup size={30} />}
        <Pressable
          onPress={toggleSidebar}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          style={({ hovered }) => ({
            height: 30,
            width: collapsed ? 30 : undefined,
            alignSelf: collapsed ? 'center' : 'stretch',
            paddingHorizontal: collapsed ? 0 : 10,
            borderRadius: theme.metrics.radiusSm,
            backgroundColor: hovered ? theme.surfaceHover : theme.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: 8,
          })}
        >
          {!collapsed ? <Text style={[s.caption, { color: theme.color.secondaryForeground }]}>메뉴 접기</Text> : null}
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} color={theme.color.secondaryForeground} />
        </Pressable>
      </View>

      {/* 아코디언 내비 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: collapsed ? 12 : 10, paddingBottom: 16, gap: 2 }}
        showsVerticalScrollIndicator={false}
        nativeID="ax-sidebar-scroll"
      >
        {groups.map((g) => {
          const icon = GROUP_ICON[g.group] || 'grid';
          const hasActive = currentHubGroup === g.group || g.items.some((i) => i.id === currentId);

          // 단독 항목(자연어 질의) — 행 하나가 곧 화면입니다
          if (g.solo) {
            const it = g.items[0];
            const on = it.id === currentId;
            return (
              <View key={g.group} style={{ marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                <Link href={it.path} asChild>
                  <Hoverable hoverStyle={({ hovered }) => navRow(theme, { on, hovered, collapsed })} accessibilityLabel={it.name}>
                    <Icon name={icon} size={16} color={on ? theme.color.primary : theme.color.secondaryForeground} />
                    {!collapsed ? <Text style={navLabel(theme, on)} numberOfLines={1}>{it.name}</Text> : null}
                  </Hoverable>
                </Link>
              </View>
            );
          }

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
                          <Text style={{ flex: 1, fontFamily: FONT_FAMILY, fontSize: 12, lineHeight: 17, fontWeight: on ? '600' : '500', color: on ? theme.color.primary : theme.color.secondaryForeground }} numberOfLines={1}>
                            {it.name}
                          </Text>
                          {it.tag === '필수' ? <Text style={[s.caption, { fontSize: 10 }]}>필수</Text> : null}
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

      {/* 하단 고정 사용자 카드 */}
      <View style={{ margin: 10, marginTop: 0, padding: collapsed ? 8 : 12, borderRadius: theme.metrics.radius, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <View style={{ width: 30, height: 30, borderRadius: 99, backgroundColor: theme.color.info, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 10, fontWeight: '600', letterSpacing: 0.2, color: '#fff' }}>{dept?.av || 'ME'}</Text>
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
  return { fontFamily: FONT_FAMILY, fontSize: 12.5, lineHeight: 18, fontWeight: on ? '600' : '500', color: on ? theme.color.primary : theme.color.secondaryForeground };
}
