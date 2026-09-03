/**
 * 상단 헤더 (CM-01 · CM-02)
 *
 * 브레드크럼 · 통합 검색 · 알림 · 테마 전환 · 계정 전환 메뉴로 구성됩니다.
 */
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { pageGroup, pageName } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { DEPTS } from '@shared/constants/dataFields';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useThemeStore } from '@shared/stores/useThemeStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from '../ui/Icon';
import { IconButton } from '../ui/Button';
import UserMenu from './UserMenu';

export default function Topbar() {
  const s = useCommonStyles();
  const theme = useTheme();
  const { goToScreen, currentScreenId } = useAppNavigation();
  const userInfo = useAuthStore((state) => state.userInfo);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const toast = useUiStore((state) => state.toast);

  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const dept = DEPTS.find((d) => d.id === userInfo?.dept);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 22,
        height: theme.metrics.topbarHeight,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.border,
        backgroundColor: theme.color.background,
        zIndex: 20,
      }}
    >
      <IconButton name="menu" onPress={toggleSidebar} title="메뉴 접기/펼치기" />

      {/* 브레드크럼 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }}>
        <Text style={[s.textSm, { color: theme.color.mutedForeground, fontSize: 13 }]} numberOfLines={1}>
          {pageGroup(currentScreenId)}
        </Text>
        <Icon name="chevronRight" size={14} color={theme.color.mutedForeground} />
        <Text style={[s.textSm, { fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
          {pageName(currentScreenId)}
        </Text>
      </View>

      <View style={s.spacer} />

      {/* 통합 검색 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          borderWidth: 1,
          borderColor: theme.color.input,
          borderRadius: theme.metrics.radius,
          paddingHorizontal: 10,
          height: 34,
          width: 230,
        }}
      >
        <Icon name="search" size={15} color={theme.color.mutedForeground} />
        <TextInput
          style={[s.textSm, { flex: 1, fontSize: 13, color: theme.color.foreground, outlineStyle: 'none' }]}
          placeholder="LOT · 품목 · 금형 검색"
          placeholderTextColor={theme.color.mutedForeground}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => {
            if (!keyword.trim()) return;
            // 통합 검색은 자연어 질의 화면으로 넘겨 처리합니다
            goToScreen('ai-chat', { q: keyword.trim() });
            setKeyword('');
          }}
        />
      </View>

      <IconButton name="bell" onPress={() => goToScreen('alert-list')} title="알림" />
      <IconButton name="moon" onPress={toggleTheme} title="테마" />

      {/* 계정 전환 */}
      <View>
        <TouchableOpacity
          onPress={() => setMenuOpen((v) => !v)}
          activeOpacity={0.75}
          style={{
            height: 32,
            minWidth: 32,
            paddingHorizontal: 11,
            borderRadius: 99,
            backgroundColor: theme.color.secondary,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: 'transparent',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.color.secondaryForeground }}>
            {userInfo?.name || '게스트'}
          </Text>
          <Icon name="chevronDown" size={12} color={theme.color.mutedForeground} />
        </TouchableOpacity>
        {menuOpen ? <UserMenu onClose={() => setMenuOpen(false)} currentDept={dept} /> : null}
      </View>
    </View>
  );
}
