/**
 * 통계 카드 (CM-05) — 화면 상단의 KPI 숫자 카드
 *
 * 사용 예)
 *   <StatCard label="공정 불량률" value="2.6" unit="%" sub="목표 대비 -0.4%p" tone="up" field="yield" />
 *
 * field 를 주면 데이터 접근 권한이 없을 때 값이 '비공개' 배지로 바뀝니다.
 * attr(응답 필드명, 문자열 또는 배열)로도 판정합니다 — 표 · 보고서 표와 같은 기준입니다(2026-10-07).
 * 값이 가려지면 부가 문구(sub)도 그리지 않습니다. 부가 문구는 대개 그 값의 내역(양품 · 불량 수량, 목표 대비)이라
 * 남겨 두면 가린 값을 거꾸로 계산할 수 있습니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import BlindValue, { useBlinded } from './BlindValue';

export default function StatCard({ label, value, unit, sub, tone = '', field, attr, style, right, labelStyle, valueStyle }) {
  const s = useCommonStyles();
  const blinded = useBlinded(field, attr);
  return (
    <View style={[s.cardNested, s.stat, style]}>
      {/* labelStyle — 여러 카드의 머리 줄 높이를 맞출 때(오른쪽 단추가 있는 카드와 나란히 둘 때) */}
      <View style={[s.statLabel, labelStyle]}>
        <Text style={[s.label, { flexShrink: 1 }]} numberOfLines={1}>{label}</Text>
        {right}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 12 }}>
        {/* valueStyle — 날짜처럼 긴 값을 한 줄에 넣을 때 글자 크기를 줄입니다 */}
        <BlindValue field={field} attr={attr} value={value} textStyle={valueStyle ? [s.statValue, valueStyle] : s.statValue} />
        {unit && !blinded ? <Text style={s.statUnit}>{unit}</Text> : null}
      </View>
      {sub && !blinded ? (
        <Text style={[s.statSub, tone === 'up' && s.up, tone === 'down' && s.down]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
