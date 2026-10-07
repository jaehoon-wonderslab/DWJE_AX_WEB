/**
 * [View] 사용자 메뉴 (CM-02) — 현재 계정 · 로그아웃
 *
 * 프로토타입 시절의 "계정 전환" 목록은 걷어냈습니다. 로그인한 계정 하나만 보여 주고 로그아웃합니다.
 * 2026-09-10: 상단바에서 사이드바 하단 사용자 카드로 이동 — `placement="up"` 이면 카드 위로 뜹니다.
 * 2026-10-07: 현재 계정 줄(이름 · 사번 · 부서)은 사용자 카드와 겹쳐 뺐습니다. 카드에 이름이 보이지 않는
 *   접힌 사이드바에서만 `showAccount` 로 보입니다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { positionLabel } from '@shared/constants/accounts';
import { DEPTS } from '@shared/constants/dataFields';
import { useAccountSwitch } from '@domains/auth/controller/useAccountSwitch';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';

export default function UserMenu({ onClose, placement = 'down', showAccount = true }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const userInfo = useAuthStore((state) => state.userInfo);
  const { handleLogout } = useAccountSwitch({ onDone: onClose });
  const dept = DEPTS.find((d) => d.id === userInfo?.dept);

  return (
    <>
      <Pressable onPress={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 59 }} />
      <View
        style={{
          position: 'absolute',
          zIndex: 60,
          minWidth: 260,
          // down: 상단바 버튼 아래 · up: 사이드바 사용자 카드 위
          // up 은 사이드바 패널(overflow hidden) 안에 있으므로 카드 폭에 맞춥니다
          ...(placement === 'up' ? { left: 0, right: 0, minWidth: 0, bottom: '100%', marginBottom: 8 } : { right: 0, top: 42 }),
          backgroundColor: theme.color.popover,
          borderWidth: 1,
          borderColor: theme.hairlineStrong,
          borderRadius: theme.metrics.radius,
          padding: 6,
          ...theme.shadow,
        }}
      >
        {/* 현재 계정 — 사용자 카드가 이름·사번을 보일 때는 중복이라 숨깁니다 */}
        {showAccount ? (<>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: theme.metrics.radiusSm, backgroundColor: theme.surface }}>
          {/* 아바타(부서 약자 동그라미)는 뺐습니다(2026-10-07) — 계정 사진을 제공할 수 없습니다 */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.textSm, { fontWeight: '600', color: theme.color.primary }]} numberOfLines={1}>
              {userInfo?.name || '게스트'} <Text style={{ fontWeight: '500', color: theme.color.mutedForeground }}>{positionLabel(userInfo?.pos)}</Text>
            </Text>
            <Text style={s.caption} numberOfLines={1}>
              {[userInfo?.empNo, userInfo?.dept, dept?.desc].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 6 }} />
        </>) : null}

        <Pressable
          onPress={handleLogout}
          style={({ hovered }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: theme.metrics.radiusSm, backgroundColor: hovered ? theme.surface : 'transparent' })}
        >
          <Icon name="logout" size={14} color={theme.color.secondaryForeground} />
          <Text style={s.textSm}>로그아웃</Text>
        </Pressable>
        {/* 「접근 권한은 계정이 아니라 소속 부서 단위로 관리됩니다.」 안내는 뺐습니다(2026-10-07) */}
      </View>
    </>
  );
}
