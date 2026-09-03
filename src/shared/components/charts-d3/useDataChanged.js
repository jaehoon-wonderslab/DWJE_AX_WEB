/**
 * 최초 그리기인지, 값이 바뀐 것인지 (CM-06 · d3)
 *
 * 전환 효과는 **값이 바뀔 때만** 의미가 있습니다.
 * 화면에 처음 들어왔을 때까지 움직이면 로딩이 끝나지 않은 것처럼 보입니다.
 *
 * 사용 예)
 *   const animate = useDataChanged();      // 첫 렌더 false, 그 뒤 true
 *   const t = (sel) => (animate ? sel.transition().duration(400) : sel);
 *   t(bar).attr('y', y(v));
 */
import { useRef } from 'react';

/** @returns {boolean} 최초 그리기면 false, 다시 그리는 것이면 true */
export function useDataChanged() {
  const drawn = useRef(false);
  const first = !drawn.current;
  drawn.current = true;
  return !first;
}

/**
 * 전환을 걸지 말지에 따라 selection 을 그대로 두거나 transition 으로 바꿉니다.
 * @param {boolean} animate
 * @param {number} [ms]
 */
export const motion = (animate, ms = 400) => (sel) => (animate ? sel.transition().duration(ms) : sel);
