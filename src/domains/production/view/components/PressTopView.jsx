import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BlindValue, Icon } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { PRESS_STATUS } from '../../model/pressTopViewModel';

const number = (value) => value === null || value === undefined ? '—' : comma(value);

export default function PressTopView({ presses, selectedId, onSelect }) {
  const theme = useTheme();
  const selected = presses.find((press) => press.id === selectedId && !press.isDummy);
  return <View style={{ position: 'relative' }}>
    <View style={{ marginTop: 8, height: 520, position: 'relative', borderRadius: theme.metrics.radius, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.hairline }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTopWidth: 3, borderTopColor: theme.divider, borderStyle: 'dashed' }} />
      <View style={{ position: 'absolute', left: '50%', top: '50%', bottom: 0, borderLeftWidth: 3, borderLeftColor: theme.divider, borderStyle: 'dashed' }} />
      <Text style={{ position: 'absolute', left: 10, top: '48%', fontSize: 13, color: theme.color.mutedForeground }}>중앙 통로</Text>
      <Text style={{ position: 'absolute', left: 8, top: 4, fontSize: 13, color: theme.color.mutedForeground }}>1공장</Text>
      <Text style={{ position: 'absolute', left: 8, top: '51%', fontSize: 13, color: theme.color.mutedForeground }}>LINE A · 실제 프레스 01–05</Text>
      <Text style={{ position: 'absolute', right: 8, top: '51%', fontSize: 13, color: theme.color.mutedForeground }}>LINE B · 실제 프레스 06–10</Text>
      <View style={{ position: 'absolute', bottom: 7, left: '50%', transform: [{ translateX: -24 }], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: theme.color.background, borderWidth: 1, borderColor: theme.divider }}><Text style={{ fontSize: 14, color: theme.color.mutedForeground }}>출입구 ↑</Text></View>
      {presses.map((press) => <PressMachine key={press.id} press={press} active={selected?.id === press.id} onSelect={onSelect} />)}
    </View>
  </View>;
}

function PressMachine({ press, active, onSelect }) {
  const theme = useTheme();
  const meta = PRESS_STATUS[press.status];
  const dummy = press.isDummy;
  const lineA = !dummy && Number.parseInt(press.id.slice(-2), 10) <= 5;
  return <View style={{ position: 'absolute', left: `${press.position.x}%`, top: `${press.position.y}%`, width: `${press.layoutWidth || 9}%`, minWidth: 90, opacity: dummy ? 0.72 : 1 }}>
    <Pressable onPress={dummy ? undefined : () => onSelect(press.id)}
      style={{ minHeight: dummy ? 196 : lineA ? 220 : 204, borderRadius: 14, padding: 12, borderWidth: 1, borderStyle: dummy ? 'dashed' : 'solid', borderColor: active ? meta.color : theme.divider, backgroundColor: active ? `${meta.color}14` : theme.color.background }}>
      <View style={{ width: 30, height: 30, borderRadius: 99, backgroundColor: `${meta.color}22`, alignItems: 'center', justifyContent: 'center' }}><Icon name="settings" size={17} color={meta.color} /></View>
      <Text numberOfLines={1} ellipsizeMode="tail" style={{ marginTop: 9, flexShrink: 1, fontSize: 17, fontWeight: '500', letterSpacing: -0.2, color: theme.color.foreground }}>{press.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}><View style={{ width: 7, height: 7, borderRadius: 9, backgroundColor: meta.color }} /><Text numberOfLines={1} style={{ fontSize: 15, color: meta.color, fontWeight: '600' }}>{meta.label}</Text></View>
      {!dummy && <View style={{ marginTop: 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: theme.hairline }}>
        {/* 권한 없는 부서에는 서버가 값을 null 로 가립니다 — 「—」 가 아니라 「비공개」 로 보여 줍니다 */}
        <Detail label="생산량" value={<BlindValue field="qty" value={number(press.qty)} />} />
        <Detail label="불량" value={<BlindValue field="yield" value={number(press.defectQty)} />} />
        <Detail label="타발 수" value={number(press.strokeCount)} />
        <Detail label="양품률" value={<BlindValue field="yield" value={press.yieldRate === null ? '—' : `${fixed(press.yieldRate)}%`} />} />
        <Detail label="업데이트" value={press.lastUpdated} />
      </View>}
    </Pressable>
  </View>;
}
function Detail({ label, value }) { const theme = useTheme(); return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 2 }}><Text style={{ fontSize: 13.5, color: theme.color.mutedForeground }}>{label}</Text><Text style={{ fontSize: 13.5, color: theme.color.foreground, fontWeight: '600' }} numberOfLines={1}>{value}</Text></View>; }
