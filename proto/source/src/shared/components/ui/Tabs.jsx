/**
 * 탭 (CM-05) — 같은 화면 안에서 표시 내용을 전환합니다.
 *
 * 사용 예) <Tabs items={['전체','미확인','확인']} value={tab} onChange={setTab} />
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

export default function Tabs({ items = [], value, onChange, style }) {
  const s = useCommonStyles();
  const list = items.map((it) => (typeof it === 'string' ? { value: it, label: it } : it));
  return (
    <View style={[s.tabs, style]}>
      {list.map((it) => {
        const on = it.value === value;
        return (
          <TouchableOpacity key={String(it.value)} style={[s.tab, on && s.tabOn]} onPress={() => onChange?.(it.value)} activeOpacity={0.75}>
            <Text style={[s.tabText, on && s.tabOnText]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
