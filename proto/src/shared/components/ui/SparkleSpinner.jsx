/** 로그인 진입 연출과 같은 입자가 로고로 모이는 공통 로딩 표시. */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import ParticleSwarm from '../brand/ParticleSwarm';
import { LOGO_COLORS, LOGO_POINTS } from '../brand/logoCloud';
import { useCommonStyles } from '@shared/theme/styles';

/** <SparkleSpinner active={loading} text="데이터를 불러오고 있습니다." size={112} /> */
export default function SparkleSpinner({ active = true, text = '데이터를 불러오고 있습니다.', size = 112, style }) {
  const s = useCommonStyles();
  const [phase, setPhase] = useState('drift');
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
    let timer;
    const start = () => {
      clearTimeout(timer);
      setReducedMotion(!!media?.matches);
      if (media?.matches) { setPhase('form'); return; }
      setPhase('drift');
      timer = setTimeout(() => {
        setPhase('form');
        timer = setTimeout(start, 1800);
      }, 700);
    };
    start();
    media?.addEventListener?.('change', start);
    return () => { clearTimeout(timer); media?.removeEventListener?.('change', start); };
  }, [active]);
  if (!active) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={text} aria-busy={true}
      style={[{ minHeight: 164, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 }, style]}>
      <ParticleSwarm key={String(reducedMotion)} size={size} phase={phase} targets={LOGO_POINTS} colors={LOGO_COLORS}
        count={LOGO_POINTS.length} targetRatio={0.6} grain="dot" dotScale={0.65}
        alphaRange={[0.72, 1]} twinkleDepth={0.16} />
      {text ? <Text style={[s.emptyText, { textAlign: 'center' }]}>{text}</Text> : null}
    </View>
  );
}
