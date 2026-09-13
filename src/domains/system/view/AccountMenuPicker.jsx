import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { TextField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 부서 기본 권한과 계정에 별도로 유지할 추가 허용을 구분합니다. */
export default function AccountMenuPicker({ value = [], onChange, deptId, options }) {
  const [keyword, setKeyword] = useState('');
  const s = useCommonStyles();
  const theme = useTheme();
  const inherited = new Set(options.matrix?.[String(deptId)] || []);
  const screens = options.screens || [];
  const extra = new Set(value);
  const groups = {};
  screens.filter(menu => `${menu.group} ${menu.name} ${menu.id}`.toLowerCase().includes(keyword.toLowerCase().trim()))
    .forEach(menu => { (groups[menu.group || '기타'] ||= []).push(menu); });
  const toggle = id => onChange(extra.has(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={[s.text, { fontWeight: '700' }]}>수동 메뉴 설정</Text>
      <Text style={s.textSm}>부서 기본 권한 {inherited.size}개 · 수동 허용 {value.length}개</Text>
      <Text style={s.textSm}>체크한 메뉴는 소속 부서 권한에 추가됩니다. 부서 기본 메뉴는 해제할 수 없으며, 부서를 바꾸면 기본 메뉴도 바뀝니다.</Text>
      <TextField value={keyword} onChangeText={setKeyword} placeholder="메뉴 이름 또는 그룹 검색" accessibilityLabel="수동 허용 메뉴 검색" full />
      <div style={{ color: theme.color.foreground, fontSize: 16, maxHeight: 330, overflowY: 'auto', border: `1px solid ${theme.hairlineStrong}`, borderRadius: 10, padding: 14 }}>
        {Object.entries(groups).map(([group, menus]) => (
          <section key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{group}</div>
            {menus.map(menu => {
              const base = inherited.has(menu.id);
              return (
                <label key={menu.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 8px', borderBottom: `1px solid ${theme.hairline}`, cursor: base && !extra.has(menu.id) ? 'default' : 'pointer' }}>
                  <input type="checkbox" aria-label={`${menu.name} 추가 허용`} checked={base || extra.has(menu.id)} disabled={base && !extra.has(menu.id)} onChange={() => toggle(menu.id)} style={{ width: 18, height: 18, flexShrink: 0, accentColor: theme.color.primary }} />
                  <span style={{ flex: 1 }}>{menu.name}</span>
                  <span style={{ fontSize: 13, color: theme.color.mutedForeground }}>{base ? '부서 기본' : ''}{base && extra.has(menu.id) ? ' · ' : ''}{extra.has(menu.id) ? '수동 허용' : ''}</span>
                </label>
              );
            })}
          </section>
        ))}
        {!Object.keys(groups).length && <Text style={s.textSm}>일치하는 메뉴가 없습니다.</Text>}
        {value.filter(id => !screens.some(menu => menu.id === id)).map(id => (
          <label key={id} style={{ display: 'flex', gap: 10, padding: 8 }}>
            <input type="checkbox" checked onChange={() => toggle(id)} />
            <span>{id} (현재 선택지에 없는 메뉴 · 체크 해제로 제거)</span>
          </label>
        ))}
      </div>
    </View>
  );
}
