/**
 * 좌측 사이드바 · 메뉴 트리 (CM-01)
 *
 * 메뉴 항목은 실제 링크(<Link>)입니다. 새 탭 열기·주소 복사가 그대로 동작하고,
 * 로그인 계정의 소속 부서 권한으로 필터링해 접근 가능한 항목만 그립니다.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { MENU } from '@shared/constants/menu';
import { useCurrentScreenId } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';

export default function Sidebar() {
  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);
  const menuPerms = useAuthStore((state) => state.menuPerms);
  const servingModelVer = useAuthStore((state) => state.servingModelVer);
  const currentId = useCurrentScreenId();

  // 현재 화면이 속한 그룹은 자동으로 펼칩니다
  const [openGroups, setOpenGroups] = useState({});
  useEffect(() => {
    const g = MENU.find((x) => x.items.some((i) => i.id === currentId));
    if (g) setOpenGroups((prev) => ({ ...prev, [g.group]: true }));
  }, [currentId]);

  // menuPerms 가 바뀌면(계정 전환) 메뉴가 다시 계산됩니다
  const groups = MENU.map((g) => ({ ...g, items: g.items.filter((it) => can(it.id)) })).filter((g) => g.items.length);

  // 메뉴가 보이는 높이를 넘는지 — 넘치면 경계에 그림자를 띄웁니다
  const [edge, setEdge] = useState({ top: false, bottom: false });
  const [contentH, setContentH] = useState(0);
  const [viewH, setViewH] = useState(0);

  return (
    <View
      style={{
        width: theme.metrics.sidebarWidth,
        borderRightWidth: 1,
        borderRightColor: theme.color.border,
        backgroundColor: theme.color.card,
        height: '100%',
      }}
    >
      {/* 브랜드 */}
      <View style={[s.cardHead, { paddingVertical: 16, paddingHorizontal: 18, gap: 10 }]}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.color.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.color.primaryForeground, fontWeight: '700', fontSize: 13 }}>AX</Text>
        </View>
        <View>
          <Text style={[s.textSm, { fontSize: 14, fontWeight: '700' }]}>덕우 AX</Text>
          <Text style={[s.textXs, { fontSize: 11 }]}>AI 의사결정 지원 계층</Text>
        </View>
      </View>

      {/* 메뉴 트리 */}
      {/*
        메뉴가 길어지면 스크롤됩니다. 다만 macOS 는 스크롤 막대가 오버레이라
        가만히 있을 때는 보이지 않습니다 — 그래서 아래에 더 있다는 사실이 드러나지 않습니다.
        위·아래 경계에 옅은 그림자를 두어 "더 있음" 을 알립니다 (Windows 는 막대도 함께 보입니다).
      */}
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, paddingBottom: 24 }}
          showsVerticalScrollIndicator
          nativeID="ax-sidebar-scroll"
          scrollEventThrottle={16}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setEdge({
              top: contentOffset.y > 4,
              bottom: contentOffset.y + layoutMeasurement.height < contentSize.height - 4,
            });
          }}
          onContentSizeChange={(_, h) => setContentH(h)}
          onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
        >
        {groups.map((g) => {
          if (g.solo) {
            return (
              <View key={g.group} style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.color.border }}>
                {g.items.map((it) => {
                  const on = it.id === currentId;
                  return (
                    <Link key={it.id} href={it.path} asChild>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 9,
                          padding: 10,
                          borderRadius: theme.metrics.radiusSm,
                          borderWidth: 1,
                          borderColor: on ? 'transparent' : theme.color.border,
                          backgroundColor: on ? theme.color.primary : theme.color.secondary,
                        }}
                      >
                        <Icon name="message" size={15} color={on ? theme.color.primaryForeground : theme.color.mutedForeground} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: on ? theme.color.primaryForeground : theme.color.foreground }}>{it.name}</Text>
                      </TouchableOpacity>
                    </Link>
                  );
                })}
              </View>
            );
          }

          const open = !!openGroups[g.group];
          const hasActive = g.items.some((i) => i.id === currentId);
          return (
            <View key={g.group} style={{ marginBottom: 2 }}>
              <TouchableOpacity
                onPress={() => setOpenGroups((prev) => ({ ...prev, [g.group]: !prev[g.group] }))}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 9,
                  paddingHorizontal: 10,
                  borderRadius: theme.metrics.radiusSm,
                  backgroundColor: hasActive ? theme.color.accent : theme.alpha('muted', 0.6),
                  marginBottom: 2,
                }}
              >
                <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} color={theme.color.mutedForeground} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.color.foreground, flex: 1 }}>{g.group}</Text>
                <View style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 99, paddingHorizontal: 6, backgroundColor: theme.color.card }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: theme.color.mutedForeground }}>{g.items.length}</Text>
                </View>
              </TouchableOpacity>

              {open ? (
                <View style={{ paddingLeft: 8, marginLeft: 12, borderLeftWidth: 1, borderLeftColor: theme.color.border, paddingBottom: 6 }}>
                  {g.items.map((it) => {
                    const on = it.id === currentId;
                    return (
                      <Link key={it.id} href={it.path} asChild>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 9,
                            paddingVertical: 7,
                            paddingHorizontal: 9,
                            borderRadius: theme.metrics.radiusSm,
                            backgroundColor: on ? theme.color.secondary : 'transparent',
                            marginBottom: 1,
                          }}
                        >
                          <Text
                            style={{ flex: 1, fontSize: 13, fontWeight: on ? '600' : '400', color: on ? theme.color.foreground : theme.color.mutedForeground }}
                            numberOfLines={1}
                          >
                            {it.name}
                          </Text>
                          {it.tag === '필수' ? (
                            <View style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 99, paddingHorizontal: 5 }}>
                              <Text style={{ fontSize: 10, color: theme.color.mutedForeground }}>필수</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      </Link>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
        {!groups.length ? (
          <Text style={[s.textXs, { padding: 10, lineHeight: 18 }]}>
            소속 부서에 허용된 메뉴가 없습니다. 시스템관리 &gt; 메뉴 접근 권한에서 지정해 주세요.
          </Text>
        ) : null}
        </ScrollView>

        {/* 위로 더 있음 */}
        {edge.top ? <EdgeFade theme={theme} side="top" /> : null}
        {/* 아래로 더 있음 — 처음 열었을 때 넘치면(스크롤 전에도) 바로 보입니다 */}
        {edge.bottom || (contentH > viewH + 4 && !edge.top) ? <EdgeFade theme={theme} side="bottom" /> : null}
      </View>

      {/*
        하단 정보 — 적을 것이 있을 때만 칸을 냅니다.
        "제1공장 주력 라인 · 프레스 10대 / AOI 10대" 를 걷어냈습니다(설비 마스터에 없는 구성입니다).
        그것만 지우면 빈 줄에 윗선만 남습니다.
      */}
      {servingModelVer ? (
        <View style={{ padding: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: theme.color.border }}>
          <Text style={[s.textXs, { lineHeight: 17 }]}>서비스 모델 {servingModelVer}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 스크롤 경계 그림자
 *
 * 그라디언트 라이브러리 없이 얇은 띠를 겹쳐 번지는 느낌을 냅니다.
 * 한 겹으로 두면 선처럼 보여 구분선과 헷갈립니다.
 */
function EdgeFade({ theme, side }) {
  const steps = [
    { h: 3, a: 0.1 },
    { h: 4, a: 0.055 },
    { h: 5, a: 0.025 },
  ];
  let offset = 0;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, [side]: 0 }}>
      {steps.map((st, i) => {
        const top = offset;
        offset += st.h;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              [side]: top,
              height: st.h,
              backgroundColor: theme.alpha('foreground', st.a),
            }}
          />
        );
      })}
    </View>
  );
}
