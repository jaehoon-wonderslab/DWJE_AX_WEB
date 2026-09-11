/**
 * 입자 군집(Swarm) — 좌표 모핑 엔진
 *
 * `ConstellationField`(로그인 히어로의 배경 성좌)와 같은 모티프(윤곽선 삼각형 입자)를 쓰되,
 * 목적이 다릅니다. 성좌는 화면을 채우는 **배경**이고, 군집은 AI 의 상태를 말하는 **표식**입니다.
 *
 * 핵심은 모핑입니다. 입자의 정체성(크기·색·위상·속도)은 처음 한 번만 만들어 계속 유지하고,
 * 대형(phase)이 바뀌면 **목표 좌표만** 갈아끼운 뒤 현재 위치에서 그쪽으로 보간합니다.
 * 그래서 대형이 바뀌어도 끊기지 않고 같은 입자들이 흘러가 다시 모입니다.
 * (대형이 바뀔 때마다 입자를 새로 만들면 하드컷이 납니다.)
 *
 * 대형(phase)
 *  · swirl    — 중심을 도는 난류. "생각하는 중"                    (AiThinking)
 *  · converge — 한 점으로 수렴하며 사라짐 · 종료형                  (AiThinking)
 *  · drift    — 영역 전체에 흩어져 제자리를 맴돎. "모이는 중"        (AiGatherField)
 *  · disperse — 바깥으로 밀려나며 사라짐 · 종료형                   (AiGatherField)
 *  · form     — targets 가 준 좌표로 모여 형상을 이룸               (EntryTransition 의 로고)
 *              targetRatio 를 주면 가운데 정사각 안에 놓아 화면 비율과 무관하게 형상을 지킵니다
 * 종료형 대형은 다 끝나면 `onSettled` 를 **한 번만** 부릅니다.
 *
 * 알갱이 — grain='triangle'(기본, 성좌 모티프) · grain='dot'(채운 점).
 * 형상을 읽혀야 하는 자리(로고 등)에서는 윤곽선이 잡음처럼 보여 점이 낫습니다.
 * 농도는 alphaRange · twinkleDepth 로 조절합니다.
 *
 * 크기 — 둘 중 하나를 고릅니다
 *  · size={36}  정사각 표식. 부모 흐름 안에 자리를 차지합니다
 *  · fill       부모를 꽉 채웁니다(absolute). 크기가 바뀌면 다시 만듭니다
 *
 * 웹에서만 <canvas> 로 그립니다(네이티브에서는 아무것도 그리지 않음).
 * prefers-reduced-motion 이면 정지 화면 한 장만 그립니다. 탭이 뒤로 가면 루프를 멈춥니다.
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

/** 종료형 대형에 걸리는 시간 */
export const SETTLE_MS = 420;
export const DISPERSE_MS = 620;

/** 종료형 대형과 각각의 소요 시간 */
const TERMINAL = { converge: SETTLE_MS, disperse: DISPERSE_MS };

export default function ParticleSwarm({
  size,
  fill = false,
  count,
  colors,
  phase = 'swirl',
  speed = 1,
  targets,
  targetRatio,
  dotScale,
  grain = 'triangle',
  alphaRange = [0.45, 1],
  twinkleDepth = 0.38,
  style,
  onSettled,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  // 루프를 다시 시작시키지 않고 바꿔 끼우는 값들
  const phaseRef = useRef({ name: phase, at: 0 });
  const colorsRef = useRef(colors);
  const targetsRef = useRef(targets);
  const ratioRef = useRef(targetRatio);
  const settledRef = useRef(onSettled);

  colorsRef.current = colors;
  targetsRef.current = targets;
  ratioRef.current = targetRatio;
  settledRef.current = onSettled;

  useEffect(() => {
    phaseRef.current = { name: phase, at: performance.now() };
  }, [phase]);

  // 그릴 수 없거나 그릴 필요가 없는 경우에는 기다리지 않고 바로 끝났다고 알립니다.
  // 이게 없으면 네이티브(캔버스 없음)와 움직임 최소화 설정에서 표식이 영원히 남습니다.
  useEffect(() => {
    if (!TERMINAL[phase]) return;
    const reduced = Platform.OS === 'web'
      && typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (Platform.OS !== 'web' || reduced) settledRef.current?.();
  }, [phase]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !host) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rand = (a, b) => a + Math.random() * (b - a);

    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let particles = [];
    let raf = 0;
    let settledFor = '';
    const t0 = performance.now();

    const build = () => {
      if (fill) {
        const rect = host.getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width));
        h = Math.max(1, Math.floor(rect.height));
      } else {
        w = size;
        h = size;
      }
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineJoin = 'round';

      cx = w / 2;
      cy = h / 2;
      // 군집이 도는 반지름 — 삼각형이 잘리지 않도록 여백을 둡니다
      R = Math.min(w, h) * 0.34;
      const scale = dotScale != null ? dotScale : (size ? size / 44 : 1);
      const n = count || (fill ? Math.max(40, Math.min(240, Math.round((w * h) / 1400))) : Math.max(18, Math.round(size * 0.8)));
      const palette = colorsRef.current?.length ? colorsRef.current : ['#1E2A78'];

      particles = [];
      for (let i = 0; i < n; i += 1) {
        const a0 = (i / n) * Math.PI * 2 + rand(-0.9, 0.9);
        // 반지름 대역 — 입자마다 달라야 합니다.
        // 전부 같은 반지름에 두면 고리 모양 스피너로 보이고 군집으로 읽히지 않습니다.
        // sqrt 분포라 바깥쪽이 조금 더 조밀합니다.
        const rBase = 0.24 + Math.sqrt(Math.random()) * 0.76;
        particles.push({
          // 첫 프레임부터 흩어져 있게 둡니다
          x: fill ? Math.random() * w : cx + Math.cos(a0) * R * rBase,
          y: fill ? Math.random() * h : cy + Math.sin(a0) * R * rBase,
          a0,
          rBase,
          /** drift 대형에서 맴돌 자리 */
          hx: Math.random() * w,
          hy: Math.random() * h,
          /** 공전 각속도 — 부호가 섞여야 군집이 뭉치지 않고 섞입니다 */
          w: rand(0.45, 1.25) * (Math.random() < 0.28 ? -1 : 1),
          /** 반지름·맴돎 출렁임 */
          s: rand(0.6, 1.7),
          ph: Math.random() * Math.PI * 2,
          size: rand(1.3, 2.7) * scale,
          alpha: rand(alphaRange[0], alphaRange[1]),
          rot: Math.random() * Math.PI * 2,
          spin: rand(-1.4, 1.4),
          /** 모이는 지점의 미세한 흩어짐 */
          jx: rand(-1.1, 1.1) * scale,
          jy: rand(-1.1, 1.1) * scale,
          color: palette[i % palette.length],
        });
      }
    };

    /** 대형이 정하는 목표 좌표 — [x, y, 투명도 배율, 크기 배율] */
    const targetOf = (p, i, t, name, eased) => {
      switch (name) {
        case 'converge':
          // 모이면서 흩어짐이 줄어듭니다
          return [cx + p.jx * (1 - eased), cy + p.jy * (1 - eased), 1 - eased, 1 - eased * 0.45];
        case 'disperse': {
          // 제 각도 바깥으로 밀려나며 옅어집니다
          const d = Math.max(w, h) * 0.55 * eased;
          const a = Math.atan2(p.hy - cy, p.hx - cx) || p.a0;
          return [p.hx + Math.cos(a) * d, p.hy + Math.sin(a) * d, 1 - eased, 1];
        }
        case 'drift': {
          // 제자리에서 느리게 맴돕니다
          const amp = Math.min(w, h) * 0.05;
          return [p.hx + Math.sin(t * p.s * 0.5 + p.ph) * amp, p.hy + Math.cos(t * p.s * 0.4 + p.ph) * amp, 1, 1];
        }
        case 'form': {
          const list = targetsRef.current;
          if (!list?.length) return [p.hx, p.hy, 1, 1];
          const target = list[i % list.length];
          const ratio = ratioRef.current;
          // targetRatio 를 주면 좌표를 **가운데 정사각** 안에 놓습니다.
          // 상자 전체(w×h)로 펼치면 화면 비율만큼 형상이 찌그러집니다.
          if (ratio) {
            const side = Math.min(w, h) * ratio;
            return [cx + (target.x - 0.5) * side + p.jx, cy + (target.y - 0.5) * side + p.jy, 1, 1];
          }
          return [target.x * w + p.jx, target.y * h + p.jy, 1, 1];
        }
        case 'swirl':
        default: {
          const a = p.a0 + t * p.w;
          // 자기 대역 안에서 숨 쉬듯 안팎으로 오갑니다
          const r = R * p.rBase * (0.62 + 0.5 * (0.5 + 0.5 * Math.sin(t * p.s + p.ph)));
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, 1, 1];
        }
      }
    };

    const draw = (now) => {
      const t = ((now - t0) / 1000) * speed;
      const { name, at } = phaseRef.current;
      const span = TERMINAL[name];
      const progress = span ? Math.min(1, (now - (at || now)) / span) : 0;
      // smoothstep
      const eased = progress * progress * (3 - 2 * progress);

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const [tx, ty, fade, shrink] = targetOf(p, i, t, name, eased);

        // 현재 위치에서 목표로 보간 — 뒤따라가는 지연이 유기적인 흐름을 만듭니다
        let k = 0.09;
        if (span) {
          k = 0.12 + eased * 0.4;
        } else if (name === 'form') {
          // 형상은 처음엔 느슨하게 흘러오다 점점 빠르게 자리를 잡습니다.
          // 계수를 고정해 두면 먼 데서 출발한 입자가 제자리에 닿지 못해 덩어리로 남습니다.
          k = 0.06 + Math.min(1, (now - (at || now)) / 420) * 0.2;
        } else if (name === 'drift') {
          k = 0.05;
        }
        p.x += (tx - p.x) * k;
        p.y += (ty - p.y) * k;

        const twinkle = (1 - twinkleDepth) + twinkleDepth * Math.sin(t * 2.1 + p.ph);
        const alpha = p.alpha * twinkle * fade;
        if (alpha <= 0.01) continue;
        const sz = p.size * shrink;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = alpha;
        if (grain === 'dot') {
          // 채운 점 — 형상(form)을 또렷하게 읽히게 해야 할 때
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.62, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 윤곽선 삼각형 — 성좌(ConstellationField)와 같은 모티프
          ctx.rotate(p.rot + t * p.spin);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -sz);
          ctx.lineTo(sz * 0.87, sz * 0.5);
          ctx.lineTo(-sz * 0.87, sz * 0.5);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }

      // 종료형은 대형마다 한 번씩만 알립니다
      if (span && progress >= 1 && settledFor !== name) {
        settledFor = name;
        settledRef.current?.();
      }
    };

    const loop = (now) => {
      draw(now);
      raf = window.requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && !reduced) raf = window.requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    build();
    // 움직임을 끈 사용자에게는 정지 화면 한 장만 그립니다 (종료 통지는 위 효과가 맡습니다)
    if (reduced) draw(performance.now());
    else start();

    // 탭이 뒤로 가면 멈춥니다 — 보고 있지 않은 장식이 배터리를 먹지 않도록
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    const ro = fill && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        build();
        if (reduced) draw(performance.now());
      })
      : null;
    ro?.observe(host);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      ro?.disconnect();
    };
  }, [size, fill, count, speed, dotScale, grain, alphaRange[0], alphaRange[1], twinkleDepth]);

  if (Platform.OS !== 'web') return null;

  const box = fill
    ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }
    : { width: size, height: size };

  return (
    <View ref={hostRef} pointerEvents="none" style={[box, style]}>
      <canvas ref={canvasRef} style={{ display: 'block' }} aria-hidden="true" />
    </View>
  );
}
