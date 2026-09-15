/**
 * [Model] 대시보드 도메인 계산 규칙
 *
 * 화면에서 반복되는 판정·환산을 한 곳에 모읍니다. React 에 의존하지 않습니다.
 */

/**
 * 수율 판정 — 목표 대비 1.5%p 이상 미달이면 위험, 목표 미달이면 주의
 * @param {number} yieldRate 수율(%)
 * @param {number} target 목표 수율(%)
 * @returns {'ok'|'warn'|'bad'}
 */
export function yieldLevel(yieldRate, target) {
  if (yieldRate < target - 1.5) return 'bad';
  if (yieldRate < target) return 'warn';
  return 'ok';
}

/** 판정 코드 → 한글 라벨 */
export const LEVEL_LABEL = { ok: '정상', warn: '주의', bad: '위험' };

/**
 * 가동률 판정 — 80% 미만 위험 / 86% 미만 주의
 * @param {number} uptimeRate 가동률(%)
 */
export function uptimeLevel(uptimeRate) {
  if (uptimeRate < 80) return 'bad';
  if (uptimeRate < 86) return 'warn';
  return 'ok';
}

/** 목표 수율(%) → 목표 불량률(%) 환산 */
export function targetDefectRate(targetYield) {
  return Number((100 - targetYield).toFixed(1));
}

/** 주력 제품 Top N 선택 옵션 */
export const TOP_N_OPTIONS = [5, 10, 20];
