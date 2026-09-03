/**
 * 상태 배지 · 상태 점 (CM-05)
 *
 * 사용 예)
 *   <Badge tone="green">가동</Badge>
 *   <StateBadge state="비가동" />
 *   <Dot tone="amber" />
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

export default function Badge({ children, tone = '', style, textStyle }) {
  const s = useCommonStyles();
  const box = [
    s.badge,
    tone === 'green' && s.badgeGreen,
    tone === 'red' && s.badgeRed,
    tone === 'amber' && s.badgeAmber,
    tone === 'blue' && s.badgeBlue,
    style,
  ];
  const txt = [
    s.badgeText,
    tone === 'green' && s.badgeGreenText,
    tone === 'red' && s.badgeRedText,
    tone === 'amber' && s.badgeAmberText,
    tone === 'blue' && s.badgeBlueText,
    textStyle,
  ];
  return (
    <View style={box}>
      <Text style={txt}>{children}</Text>
    </View>
  );
}

/** 상태 문자열에 맞는 색을 자동으로 고르는 배지 */
const STATE_TONE = {
  가동: 'green',
  정상: 'green',
  양품: 'green',
  완료: 'green',
  성공: 'green',
  사용: 'green',
  '서비스 중': 'green',
  경고: 'amber',
  주의: 'amber',
  경계: 'amber',
  대기: '',
  보류: 'amber',
  '진행 중': 'blue',
  실행중: 'blue',
  검토중: 'blue',
  비가동: 'red',
  불량: 'red',
  위험: 'red',
  실패: 'red',
  정지: 'red',
  반려: 'red',
  보관: '',
};

export function StateBadge({ state, style }) {
  return (
    <Badge tone={STATE_TONE[state] ?? ''} style={style}>
      {state}
    </Badge>
  );
}

export function Dot({ tone = '', size = 7, style }) {
  const s = useCommonStyles();
  return (
    <View
      style={[
        s.dot,
        tone === 'red' && s.dotRed,
        tone === 'amber' && s.dotAmber,
        tone === 'gray' && s.dotGray,
        { width: size, height: size },
        style,
      ]}
    />
  );
}

export { STATE_TONE };
