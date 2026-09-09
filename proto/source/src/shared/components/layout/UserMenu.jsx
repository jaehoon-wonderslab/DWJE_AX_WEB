/**
 * [View] 사용자 메뉴 (CM-02) — 현재 계정 · 로그아웃
 *
 * 프로토타입 시절의 "계정 전환" 목록은 걷어냈습니다. 로그인한 계정 하나만 보여 주고 로그아웃합니다.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { positionLabel } from '@shared/constants/accounts';
import { DEPTS } from '@shared/constants/dataFields';
import { useAccountSwitch } from '@domains/auth/controller/useAccountSwitch';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';

export default function UserMenu({ onClose }) {
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
          right: 0,
          top: 42,
          zIndex: 60,
          minWidth: 260,
          backgroundColor: theme.color.popover,
          borderWidth: 1,
          borderColor: theme.hairlineStrong,
          borderRadius: theme.metrics.radius,
          padding: 6,
          ...theme.shadow,
        }}
      >
        {/* 현재 계정 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: theme.metrics.radiusSm, backgroundColor: theme.surface }}>
          <View style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: theme.color.info, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 10, fontWeight: '600', letterSpacing: 0.2, color: '#fff' }}>{dept?.av || 'ME'}</Text>
          </View>
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

        <Pressable
          onPress={handleLogout}
          style={({ hovered }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: theme.metrics.radiusSm, backgroundColor: hovered ? theme.surface : 'transparent' })}
        >
          <Icon name="logout" size={14} color={theme.color.secondaryForeground} />
          <Text style={s.textSm}>로그아웃</Text>
        </Pressable>

        <Text style={[s.caption, { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8 }]}>
          접근 권한은 계정이 아니라 소속 부서 단위로 관리됩니다.
        </Text>
      </View>
    </>
  );
}
