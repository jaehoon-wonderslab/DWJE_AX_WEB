/**
 * 통계 카드 (CM-05) — 화면 상단의 KPI 숫자 카드
 *
 * 사용 예)
 *   <StatCard label="공정 불량률" value="2.6" unit="%" sub="목표 대비 -0.4%p" tone="up" field="yield" />
 *
 * field 를 주면 데이터 접근 권한이 없을 때 값이 '비공개' 배지로 바뀝니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import BlindValue from './BlindValue';

export default function StatCard({ label, value, unit, sub, tone = '', field, style, right }) {
  const s = useCommonStyles();
  return (
    <View style={[s.card, s.stat, style]}>
      <View style={s.statLabel}>
        <Text style={[s.textXs, { fontSize: 12 }]}>{label}</Text>
        {right}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <BlindValue field={field} value={value} textStyle={s.statValue} />
        {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
      </View>
      {sub ? (
        <Text style={[s.statSub, tone === 'up' && s.up, tone === 'down' && s.down]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
