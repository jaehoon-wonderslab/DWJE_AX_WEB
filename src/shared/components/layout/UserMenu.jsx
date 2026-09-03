/**
 * [View] 계정 전환 · 사용자 메뉴 (CM-02)
 *
 * 전환 가능한 계정 목록을 보여 주고 선택 계정으로 세션을 전환합니다.
 * 실제 전환 로직은 domains/auth 의 컨트롤러가 담당합니다.
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { positionLabel } from '@shared/constants/accounts';
import { DEPTS } from '@shared/constants/dataFields';
import { useAccountSwitch } from '@domains/auth/controller/useAccountSwitch';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';

export default function UserMenu({ onClose }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { accounts, currentEmpNo, handleSwitch, handleLogout } = useAccountSwitch({ onDone: onClose });

  const deptAv = (deptId) => DEPTS.find((d) => d.id === deptId)?.av || '--';
  const deptDesc = (deptId) => DEPTS.find((d) => d.id === deptId)?.desc || '';

  return (
    <View
      style={{
        position: 'absolute',
        right: 0,
        top: 40,
        zIndex: 60,
        minWidth: 262,
        backgroundColor: theme.color.popover,
        borderWidth: 1,
        borderColor: theme.color.border,
        borderRadius: theme.metrics.radius,
        padding: 6,
        ...theme.shadow,
      }}
    >
      {accounts.length ? (
        <Text style={[s.textXs, { fontWeight: '600', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4 }]}>계정 전환</Text>
      ) : null}

      {accounts.map((u) => {
        const on = u.empNo === currentEmpNo;
        return (
          <TouchableOpacity
            key={u.empNo}
            onPress={() => handleSwitch(u.empNo)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingVertical: 8,
              paddingHorizontal: 9,
              borderRadius: theme.metrics.radiusXs,
              backgroundColor: on ? theme.color.secondary : 'transparent',
            }}
          >
            <View style={{ width: 27, height: 27, borderRadius: 99, backgroundColor: theme.color.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.color.secondaryForeground }}>{deptAv(u.dept)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.textSm, { fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
                {u.name} <Text style={{ fontWeight: '400', color: theme.color.mutedForeground }}>{positionLabel(u.pos)}</Text>
              </Text>
              <Text style={[s.textXs, { fontSize: 11 }]} numberOfLines={1}>
                {u.dept} · {deptDesc(u.dept)}
              </Text>
            </View>
            {on ? <Icon name="check" size={14} color={theme.color.foreground} /> : null}
          </TouchableOpacity>
        );
      })}

      {accounts.length ? <View style={{ height: 1, backgroundColor: theme.color.border, marginVertical: 4 }} /> : null}

      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.75}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingHorizontal: 9, borderRadius: theme.metrics.radiusXs }}
      >
        <Icon name="lock" size={14} color={theme.color.mutedForeground} />
        <Text style={[s.textSm, { fontSize: 13 }]}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={[s.textXs, { fontSize: 11, lineHeight: 17, paddingHorizontal: 9, paddingTop: 4, paddingBottom: 5 }]}>
        접근 권한은 계정이 아니라 소속 부서 단위로 관리됩니다.
      </Text>
    </View>
  );
}
