/**
 * 컨테이너 실제 폭 측정 (CM-06 · d3)
 *
 * 기존 차트는 `viewBox="0 0 620 H"` + `preserveAspectRatio="none"` 이라
 * 카드 폭이 620px 이 아니면 글자와 원이 가로로 늘어났습니다.
 * d3 판은 실제 폭을 재서 1:1 픽셀로 그립니다.
 */
import { useEffect, useRef, useState } from 'react';

/**
 * @param {number} height 차트 높이 (그대로 돌려줍니다)
 * @returns {{ref: object, width: number, height: number}} width 가 0 이면 아직 측정 전입니다
 */
export function useChartSize(height) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    // 첫 프레임에는 ResizeObserver 콜백이 아직 안 오므로 직접 한 번 잽니다
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width, height };
}

/**
 * x축 라벨을 몇 개 걸러 그릴지 정합니다.
 * 폭이 좁으면 라벨이 겹쳐 읽을 수 없습니다 — 하나당 최소 44px 을 확보합니다.
 *
 * @param {number} count 라벨 개수
 * @param {number} innerWidth 그릴 수 있는 가로 폭
 * @returns {number} 1 이면 전부, 2 면 하나 걸러 하나
 */
export function labelStride(count, innerWidth) {
  if (!count || innerWidth <= 0) return 1;
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(innerWidth / 44))));
}
