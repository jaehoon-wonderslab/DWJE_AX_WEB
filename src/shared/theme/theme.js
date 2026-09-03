/**
 * 테마 생성기
 *
 * CSS 변수 → JS 색상값 변환 계층입니다.
 * 화면 코드는 `useTheme()` 으로 받은 theme 객체만 사용하고,
 * HSL 원본이나 변환 로직은 직접 다루지 않습니다.
 */
import { LIGHT_TOKENS, DARK_TOKENS, LIGHT_SERIES, DARK_SERIES } from './colors';

/**
 * HSL(0~360, 0~100, 0~100) 값을 rgba() 문자열로 변환합니다.
 * RN 은 `hsl(h s% l% / a)` 최신 문법을 지원하지 않으므로 직접 변환합니다.
 *
 * @param {number[]} hsl [h, s, l] 삼원색
 * @param {number} alpha 불투명도 0~1
 * @returns {string} 예) "rgba(26, 95, 180, 0.12)"
 */
function hslToRgba([h, s, l], alpha = 1) {
  const sat = s / 100;
  const lig = l / 100;
  // 1. HSL → RGB 표준 변환식
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  // 2. 0~1 실수를 0~255 정수로 반올림
  const [r, g, b] = rgb.map((v) => Math.round((v + m) * 255));
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 반지름 · 간격 등 색상 외 디자인 토큰 (프로토타입의 --radius, --sidebar-w) */
export const METRICS = {
  radius: 10,
  radiusSm: 8,
  radiusXs: 7,
  sidebarWidth: 264,
  topbarHeight: 56,
  contentMaxWidth: 1400,
};

/**
 * 모드에 맞는 테마 객체를 만듭니다.
 *
 * @param {'light'|'dark'} mode 테마 모드
 * @returns {object} color(불투명 색상 맵) · alpha(투명도 적용 함수) · series(차트 계열색) 등
 */
export function createTheme(mode) {
  const tokens = mode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
  const series = mode === 'dark' ? DARK_SERIES : LIGHT_SERIES;

  // 1. 불투명 색상 맵을 미리 만들어 둡니다 (렌더마다 재계산하지 않기 위함)
  const color = {};
  Object.keys(tokens).forEach((key) => {
    color[key] = hslToRgba(tokens[key]);
  });

  // 2. 투명도가 필요한 곳에서 쓰는 함수 — CSS 의 `hsl(var(--x) / .12)` 대응
  const alpha = (key, a) => hslToRgba(tokens[key] || LIGHT_TOKENS.foreground, a);

  return {
    mode,
    isDark: mode === 'dark',
    color,
    alpha,
    series,
    /** 계열색은 고정 순서로만 배정하고 순환시키지 않습니다 (7번째 이상은 '기타'로 묶음) */
    seriesAt: (i) => series[Math.min(i, series.length - 1)],
    metrics: METRICS,
    /** 모달·드로어 뒤에 까는 반투명 검정 */
    overlay: 'rgba(0, 0, 0, 0.45)',
    drawerOverlay: 'rgba(0, 0, 0, 0.35)',
    /** 그림자 (웹 전용 boxShadow 대신 RN 공통 속성 사용) */
    shadow: {
      shadowColor: '#000',
      shadowOpacity: mode === 'dark' ? 0.5 : 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
  };
}

export { hslToRgba };
