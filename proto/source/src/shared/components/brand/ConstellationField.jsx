/**
 * 파티클 성좌(Constellation) — 시그니처 비주얼
 *
 * 디자인 가이드의 히어로 이미지: 수천 개의 작은 **윤곽선 삼각형**이 유기적인 뇌·구름 형상을 이루고,
 * 주변에는 옅은 파티클이 흩어져 떠 있습니다. "지식은 위계가 아니라 분산된 지능" 이라는 메시지입니다.
 *
 * 웹에서만 <canvas> 로 그립니다(네이티브에서는 아무것도 그리지 않음).
 *  · 형상 파티클 — 매개변수 곡선(r(θ))으로 정의한 덩어리 안에 균일 분포
 *  · 주변 파티클 — 전체 영역에 낮은 밀도로 분포
 *  · 각 파티클은 제자리에서 천천히 떠돌고(drift) 반짝입니다(twinkle)
 *  · prefers-reduced-motion 이면 정지 화면으로 그립니다
 *
 * 사용 예)
 *   <View style={{ position:'absolute', inset:0 }}><ConstellationField density={1.0} /></View>
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { BRAND } from '@shared/theme/colors';

const PALETTE = [BRAND.iris, BRAND.spark, '#1fb59a', '#3fa9ff', BRAND.magenta, '#b79cff', '#5e7bff'];
/** 흰 패널 위에 쓰는 잉크 계열 팔레트 */
export const LIGHT_PALETTE = ['#0B1440', '#1E2A78', '#3F3AA8', '#F2C14E', '#6f6ac9', '#2E9E57', '#00aeef'];

/**
 * @param {object} props
 * @param {number} [props.density]   전체 파티클 양 배율 (기본 1)
 * @param {number} [props.opacity]   전체 불투명도 (기본 1)
 * @param {'brain'|'orb'|'ambient'} [props.shape] 중심 형상. ambient 는 흩어진 파티클만
 * @param {number} [props.centerX]   형상 중심 x (0~1, 기본 0.5)
 * @param {number} [props.centerY]   형상 중심 y (0~1, 기본 0.5)
 * @param {number} [props.scale]     형상 크기(짧은 변 대비, 기본 0.36)
 * @param {boolean} [props.animate]  애니메이션 (기본 true)
 * @param {number} [props.activity]  움직임 세기 (기본 1). 2 면 드리프트·반짝임이 두 배, 형상 전체가 천천히 공전합니다
 * @param {string[]} [props.palette] 파티클 색 목록 (기본: 어두운 배경용 형광 팔레트)
 */
export default function ConstellationField({
  density = 1,
  opacity = 1,
  shape = 'brain',
  centerX = 0.5,
  centerY = 0.5,
  scale = 0.36,
  animate = true,
  activity = 1,
  palette,
  style,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const colors = palette && palette.length ? palette : PALETTE;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let center = { x: 0, y: 0 };
    let particles = [];
    let raf = 0;
    let t0 = performance.now();

    /** 형상의 반지름 — 각도에 따라 울퉁불퉁한 뇌·구름 실루엣 */
    const radiusAt = (theta) => {
      if (shape === 'orb') return 1;
      return 1 + 0.16 * Math.sin(3 * theta + 0.6) + 0.09 * Math.cos(5 * theta - 1.2) + 0.05 * Math.sin(9 * theta);
    };

    const rand = (a, b) => a + Math.random() * (b - a);

    const build = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const short = Math.min(width, height);
      const R = short * scale;
      const cx = width * centerX;
      const cy = height * centerY;
      const area = width * height;
      center = { x: cx, y: cy };

      particles = [];
      // 1. 형상 파티클 — 반지름 안쪽에 거절 샘플링으로 채웁니다 (가장자리가 조밀해지도록 sqrt 분포)
      if (shape !== 'ambient') {
        const n = Math.round(Math.min(1800, (R * R) / 38) * density);
        for (let i = 0; i < n; i += 1) {
          const theta = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * R * radiusAt(theta);
          const x = cx + Math.cos(theta) * rr;
          const y = cy + Math.sin(theta) * rr * 0.82;
          particles.push(makeParticle(x, y, rand(1.6, 4.2), rand(0.35, 0.95), rand(0.4, 1.1), true));
        }
      }
      // 2. 주변 파티클 — 넓게 흩어진 낮은 밀도
      const m = Math.round(Math.min(360, area / 9000) * density);
      for (let i = 0; i < m; i += 1) {
        particles.push(makeParticle(Math.random() * width, Math.random() * height, rand(1.4, 3.6), rand(0.08, 0.32), rand(0.6, 1.8)));
      }
    };

    function makeParticle(x, y, size, alpha, amp, inShape = false) {
      return {
        x,
        y,
        size,
        alpha,
        amp,
        inShape,
        rot: Math.random() * Math.PI * 2,
        spin: rand(-0.35, 0.35) * activity,
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.25, 0.7) * activity,
        /** 이따금 밝게 번쩍이는 주기 (초) */
        flash: rand(3, 9),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }

    const draw = (now) => {
      const t = (now - t0) / 1000;
      const moving = animate && !reduced;
      // 형상 전체가 중심을 축으로 천천히 공전합니다 (activity 1 → 약 2분에 한 바퀴)
      const orbit = moving ? t * 0.05 * activity : 0;
      const cosO = Math.cos(orbit);
      const sinO = Math.sin(orbit);
      ctx.clearRect(0, 0, width, height);
      ctx.lineJoin = 'round';
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const drift = moving ? t * p.speed + p.phase : p.phase;
        const swing = p.amp * 2.4 * (0.6 + 0.4 * activity);
        const dx = Math.sin(drift) * swing;
        const dy = Math.cos(drift * 0.8) * swing;
        // 반짝임 — 기본 숨결에, 파티클마다 다른 주기의 짧은 번쩍임을 더합니다
        const breath = moving ? 0.6 + 0.4 * Math.sin(drift * 1.7 + p.phase) : 1;
        const flashPhase = moving ? ((t + p.phase) % p.flash) / p.flash : 1;
        const flash = flashPhase < 0.08 ? 1 + (1 - flashPhase / 0.08) * 0.9 * activity : 1;
        const twinkle = Math.min(1.6, breath * flash);
        const rot = p.rot + (moving ? t * p.spin : 0);
        const s = p.size * (flash > 1 ? 1.25 : 1);
        // 공전 — 형상 파티클만 중심을 돌고, 주변 파티클은 제자리에서 떠돕니다
        let px = p.x;
        let py = p.y;
        if (p.inShape && orbit) {
          const rx = p.x - center.x;
          const ry = p.y - center.y;
          px = center.x + rx * cosO - ry * sinO;
          py = center.y + rx * sinO + ry * cosO;
        }
        ctx.lineWidth = flash > 1 ? 1.6 : 1;
        ctx.save();
        ctx.translate(px + dx, py + dy);
        ctx.rotate(rot);
        ctx.globalAlpha = p.alpha * twinkle * opacity;
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.87, s * 0.5);
        ctx.lineTo(-s * 0.87, s * 0.5);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    };

    const loop = (now) => {
      draw(now);
      raf = window.requestAnimationFrame(loop);
    };

    build();
    if (animate && !reduced) raf = window.requestAnimationFrame(loop);
    else draw(performance.now());

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      build();
      if (!(animate && !reduced)) draw(performance.now());
    }) : null;
    ro?.observe(host);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [density, opacity, shape, centerX, centerY, scale, animate, activity, palette]);

  if (Platform.OS !== 'web') return null;

  return (
    <View ref={hostRef} pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }, style]}>
      <canvas ref={canvasRef} style={{ display: 'block' }} aria-hidden="true" />
    </View>
  );
}
