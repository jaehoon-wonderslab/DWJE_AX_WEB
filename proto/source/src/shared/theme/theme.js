/**
 * 테마 생성기
 *
 * CSS 변수 → JS 색상값 변환 계층입니다.
 * 화면 코드는 `useTheme()` 으로 받은 theme 객체만 사용하고,
 * HSL 원본이나 변환 로직은 직접 다루지 않습니다.
 */
import { LIGHT_TOKENS, LIGHT_SERIES } from './colors';

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
  /** 최상위 패널(사이드바·본문·레일) */
  radiusPanel: 24,
  /** 카드·게이지·브리핑 */
  radius: 16,
  /** 주요 동작 버튼 */
  radiusAction: 14,
  /** 내비 행·아이콘 버튼·입력칸 */
  radiusSm: 12,
  /** 하위 메뉴 항목 */
  radiusXs: 10,
  /** 캡슐·칩·점·진행 트랙 */
  radiusPill: 999,
  /** 패널 사이·바깥 여백 */
  gutter: 16,
  sidebarWidth: 228,
  sidebarCollapsedWidth: 64,
  topbarHeight: 64,
  contentMaxWidth: 1400,
  /** 홈(질의) 화면의 한 줄 척추 폭 */
  contentColumn: 720,
};

/**
 * 모드에 맞는 테마 객체를 만듭니다.
 *
 * @param {'light'|'dark'} mode 테마 모드
 * @returns {object} color(불투명 색상 맵) · alpha(투명도 적용 함수) · series(차트 계열색) 등
 */
export function createTheme(mode) {
  // 테마는 라이트 하나입니다 — mode 는 호환을 위해 받기만 합니다
  const tokens = LIGHT_TOKENS;
  const series = LIGHT_SERIES;

  // 1. 불투명 색상 맵을 미리 만들어 둡니다 (렌더마다 재계산하지 않기 위함)
  const color = {};
  Object.keys(tokens).forEach((key) => {
    color[key] = hslToRgba(tokens[key]);
  });

  // 1-1. 별칭 — 일부 화면이 쓰는 이름을 실제 토큰에 잇습니다 (text · textDim · danger)
  color.text = color.foreground;
  color.textDim = color.mutedForeground;
  color.danger = color.destructive;

  // 2. 투명도가 필요한 곳에서 쓰는 함수 — CSS 의 `hsl(var(--x) / .12)` 대응
  const alpha = (key, a) => hslToRgba(tokens[key] || LIGHT_TOKENS.foreground, a);

  return {
    mode,
    isDark: false,
    color,
    alpha,
    series,
    /** 계열색은 고정 순서로만 배정하고 순환시키지 않습니다 (7번째 이상은 '기타'로 묶음) */
    seriesAt: (i) => series[Math.min(i, series.length - 1)],
    metrics: METRICS,
    /** 모달·드로어 뒤에 까는 반투명 배경 */
    overlay: 'rgba(11, 20, 64, 0.28)',
    drawerOverlay: 'rgba(11, 20, 64, 0.2)',
    /** 패널 테두리 — 거의 보이지 않는 선 (rgba(0,0,0,0.03)) */
    hairline: 'rgba(0, 0, 0, 0.03)',
    /** 컨트롤(버튼·칩) 테두리 (rgba(0,0,0,0.06)) */
    hairlineStrong: 'rgba(0, 0, 0, 0.06)',
    /** 구분선 #DFE1E7 */
    divider: hslToRgba(tokens.border),
    /** 2차 표면 — 패널 안의 스탯 카드·브리핑 (#FAFAFA) */
    surface: hslToRgba(tokens.muted),
    /** 트랙·호버 채움 (#F4F5F6) */
    surfaceHover: hslToRgba(tokens.secondary),
    /**
     * 그림자 — 최상위 패널에 한 번만 쓰는 넓고 옅은 그림자 (0 10px 30px rgba(0,0,0,.04)).
     * 팝오버·모달은 조금 더 진하게 (같은 모양).
     */
    panelShadow: {
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2,
      ...(typeof document !== 'undefined' ? { boxShadow: '0 10px 30px rgba(0,0,0,0.04)' } : {}),
    },
    shadow: {
      shadowColor: '#0B1440',
      shadowOpacity: 0.1,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
      ...(typeof document !== 'undefined' ? { boxShadow: '0 12px 30px rgba(11,20,64,0.1)' } : {}),
    },
  };
}

export { hslToRgba };
