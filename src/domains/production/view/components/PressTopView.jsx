import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '@shared/components/ui';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';
import { PRESS_STATUS } from '../../model/pressTopViewModel';

const number = (value) => value === null || value === undefined ? '—' : comma(value);

export default function PressTopView({ presses, selectedId, onSelect }) {
  const theme = useTheme();
  const selected = presses.find((press) => press.id === selectedId && !press.isDummy) || presses.find((press) => !press.isDummy);
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
    {selected && <EquipmentPanel press={selected} />}
  </View>;
}

function PressMachine({ press, active, onSelect }) {
  const theme = useTheme();
  const meta = PRESS_STATUS[press.status];
  const dummy = press.isDummy;
  const lineA = !dummy && Number.parseInt(press.id.slice(-2), 10) <= 5;
  return <View style={{ position: 'absolute', left: `${press.position.x}%`, top: `${press.position.y}%`, width: `${press.layoutWidth || (dummy ? 15 : 9)}%`, minWidth: dummy ? 82 : 90, opacity: dummy ? 0.72 : 1 }}>
    <Pressable onPress={() => onSelect(press.id)}
      style={{ minHeight: dummy ? 42 : lineA ? 220 : 204, borderRadius: dummy ? 10 : 14, padding: dummy ? 6 : 12, flexDirection: dummy ? 'row' : 'column', alignItems: dummy ? 'center' : 'stretch', gap: dummy ? 5 : 0, borderWidth: 1, borderColor: active ? meta.color : theme.divider, backgroundColor: active ? `${meta.color}14` : theme.color.background }}>
      <View style={{ width: dummy ? 20 : 30, height: dummy ? 20 : 30, borderRadius: 99, backgroundColor: `${meta.color}22`, alignItems: 'center', justifyContent: 'center' }}><Icon name="settings" size={dummy ? 12 : 17} color={meta.color} /></View>
      <Text numberOfLines={1} ellipsizeMode="tail" style={{ marginTop: dummy ? 0 : 9, flexShrink: 1, fontSize: dummy ? 14 : 17, fontWeight: '500', letterSpacing: -0.2, color: theme.color.foreground }}>{press.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: dummy ? 0 : 5 }}><View style={{ width: 7, height: 7, borderRadius: 9, backgroundColor: meta.color }} /><Text numberOfLines={1} style={{ fontSize: dummy ? 13 : 15, color: meta.color, fontWeight: '600' }}>{meta.label}</Text></View>
      {!dummy && <View style={{ marginTop: 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: theme.hairline }}>
        <Detail label="생산량" value={number(press.qty)} compact />
        <Detail label="불량" value={number(press.defectQty)} compact />
        <Detail label="타발 수" value={number(press.strokeCount)} compact />
        <Detail label="양품률" value={press.yieldRate === null ? '—' : `${fixed(press.yieldRate)}%`} compact />
        <Detail label="업데이트" value={press.lastUpdated} compact />
      </View>}
    </Pressable>
  </View>;
}
function EquipmentPanel({ press }) { const theme = useTheme(); const meta = PRESS_STATUS[press.status]; return <View style={{ marginTop: 18, padding: 13, borderRadius: 9, borderLeftWidth: 3, borderLeftColor: meta.color, backgroundColor: theme.color.card }}><Text style={{ fontSize: 17, fontWeight: '700', color: theme.color.foreground, marginBottom: 7 }}>{press.name} · {meta.label}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}><Detail label="오늘 생산량" value={number(press.qty)} /><Detail label="불량 수량" value={number(press.defectQty)} /><Detail label="타발 수" value={number(press.strokeCount)} /><Detail label="양품률" value={press.yieldRate === null ? '—' : `${fixed(press.yieldRate)}%`} /><Detail label="마지막 업데이트" value={press.lastUpdated} /></View></View>; }
function Detail({ label, value, compact }) { const theme = useTheme(); return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: compact ? 2 : 3 }}><Text style={{ fontSize: compact ? 13.5 : 14.5, color: theme.color.mutedForeground }}>{label}</Text><Text style={{ fontSize: compact ? 13.5 : 14.5, color: theme.color.foreground, fontWeight: '600' }} numberOfLines={1}>{value}</Text></View>; }
