/**
 * AI 브리핑이 맺히는 동안 — 카드 배경의 입자 밭
 *
 * 「데이터가 문장이 된다」는 은유를 그대로 보여 줍니다.
 * 브리핑을 부르는 동안 카드 안에 입자가 옅게 떠 있다가,
 * 문장이 도착하면 **바깥으로 밀려나며 사라지고** 그 자리에 글이 남습니다.
 *
 * 로그인 직후 첫 화면(자연어 질의 홈)의 카드라 첫인상이 여기서 만들어집니다.
 * 글을 읽는 자리이므로 세기를 낮춥니다 — 색은 잉크 계열의 반투명, 알갱이도 조금 작게.
 *
 * `active` 가 꺼져도 바로 사라지지 않고 흩어짐을 마저 보여 준 뒤 스스로 빠집니다.
 * 그래서 부모는 조건부 마운트 대신 `active` 만 넘기면 됩니다.
 */
import React, { useEffect, useState } from 'react';
import ParticleSwarm from './ParticleSwarm';
import { useTheme } from '@shared/theme/useTheme';

export default function AiGatherField({ active, style }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(!!active);
  const [phase, setPhase] = useState('drift');

  useEffect(() => {
    if (active) {
      setVisible(true);
      setPhase('drift');
      return;
    }
    // 이미 흩어지는 중이면 그대로 둡니다
    setPhase((prev) => (prev === 'drift' ? 'disperse' : prev));
  }, [active]);

  if (!visible) return null;

  // 글 뒤에 깔리는 밭이라 반투명 잉크로 낮춥니다
  const colors = [
    theme.alpha('primary', 0.5),
    theme.alpha('info', 0.45),
    theme.alpha('ink500', 0.45),
    theme.alpha('warning', 0.6),
  ];

  return (
    <ParticleSwarm
      fill
      phase={phase}
      colors={colors}
      dotScale={0.85}
      onSettled={() => setVisible(false)}
      style={style}
    />
  );
}
