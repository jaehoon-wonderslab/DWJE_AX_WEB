/**
 * 정의 목록 (CM-05) — 상세 모달의 "항목 : 값" 표
 *
 * 사용 예) <KeyValue rows={[['설비','PR-03'], ['모델','Krios_s']]} />
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

export default function KeyValue({ rows = [], keyWidth = 130, style }) {
  const s = useCommonStyles();
  return (
    <View style={style}>
      {rows.map(([k, v], i) => (
        <View key={`${k}-${i}`} style={s.kvRow}>
          <Text style={[s.kvKey, { width: keyWidth }]}>{k}</Text>
          {typeof v === 'string' || typeof v === 'number' ? <Text style={s.kvVal}>{v}</Text> : <View style={{ flex: 1 }}>{v}</View>}
        </View>
      ))}
    </View>
  );
}
