/**
 * 목록 항목 (CM-05) — 알림 목록처럼 제목/설명/시각으로 이루어진 줄
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { Dot } from './Badge';

export default function ListRow({ tone, title, desc, time, right, onPress, last, style }) {
  const s = useCommonStyles();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[s.listItem, last && { borderBottomWidth: 0 }, style]} onPress={onPress} activeOpacity={0.65}>
      {tone !== undefined ? <Dot tone={tone} style={{ marginTop: 6 }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.listTitle}>{title}</Text>
        {desc ? <Text style={s.listDesc}>{desc}</Text> : null}
      </View>
      {right}
      {time ? <Text style={s.listTime}>{time}</Text> : null}
    </Wrapper>
  );
}
