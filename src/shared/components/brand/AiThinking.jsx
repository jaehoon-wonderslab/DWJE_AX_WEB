/**
 * 덕반장 AI 가 생각하는 동안 — 입자 군집 표식
 *
 * 공용 로딩(Feedback 의 Pulse — 세 점이 순서대로 밝아지는)과 일부러 다르게 둡니다.
 * 세 점 스피너는 어느 화면에서나 쓰는 「기다리는 중」 신호라 AI 라는 의미가 없습니다.
 * 여기서는 입자가 소용돌이치다가 답이 도착하면 **한 점으로 수렴하며 사라집니다.**
 * 사용자가 질의할 때마다 보는 자리라 이 한 동작이 AI 특화라는 인상을 만듭니다.
 *
 * `active` 가 꺼져도 바로 사라지지 않습니다. 수렴을 마저 보여 주고 스스로 빠집니다.
 * 그래서 부모는 조건부 마운트 대신 `active` 만 넘기면 됩니다.
 *  · 부모가 <AiThinking active={pending} /> 처럼 항상 그려 두면 됩니다
 *
 * 수렴하는 동안에는 글자를 지웁니다. 답이 이미 화면에 붙은 뒤에
 * 「응답을 생성하는 중입니다」가 남아 있으면 거짓말이 되기 때문입니다.
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ParticleSwarm from './ParticleSwarm';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function AiThinking({ active, text = '응답을 생성하는 중입니다…', compact = false, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [visible, setVisible] = useState(!!active);
  const [phase, setPhase] = useState('swirl');

  useEffect(() => {
    if (active) {
      setVisible(true);
      setPhase('swirl');
      return;
    }
    // 이미 수렴 중이면 그대로 둡니다
    setPhase((prev) => (prev === 'swirl' ? 'converge' : prev));
  }, [active]);

  if (!visible) return null;

  const settling = phase === 'converge';
  // 흰 패널 위 — 잉크 계열에 포인트 앰버를 하나 섞습니다
  const colors = [theme.color.primary, theme.color.info, theme.color.ink500, theme.color.spark];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      style={[{ paddingVertical: compact ? 14 : 40, alignItems: 'center', gap: 10 }, style]}
    >
      <ParticleSwarm
        size={compact ? 36 : 52}
        phase={phase}
        colors={colors}
        onSettled={() => setVisible(false)}
      />
      {text && !settling ? <Text style={s.emptyText}>{text}</Text> : null}
    </View>
  );
}
