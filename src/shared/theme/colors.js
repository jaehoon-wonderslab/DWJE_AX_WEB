/**
 * 컬러 토큰 — 덕우전자 AX "Precision Blue"
 *
 * 프로토타입(Web 프로토타입/index.html)의 CSS 변수(:root / [data-theme="dark"])를
 * React Native 에서 쓸 수 있도록 JS 객체로 옮긴 것입니다.
 *
 *  · 브랜드   : 딥 블루 (213°) — 정밀 가공·신뢰. 주요 액션과 활성 상태에만 사용
 *  · 중립     : 블루그레이 (215°) — 브랜드와 같은 계열로 회색을 맞춰 화면이 하나로 읽히게
 *  · 상태색   : 정상(아쿠아그린) / 주의(앰버) / 위험(레드) — 데이터 계열색과 겹치지 않게 예약
 *  · 차트 계열: c1~c6 — 라이트/다크 각각 별도 선정, 고정 순서 배정(순환 금지)
 *
 * CSS 의 `hsl(var(--x) / .12)` 문법은 RN 에서 동작하지 않으므로
 * HSL 삼원색을 그대로 보관하고 rgba() 문자열로 변환해 사용합니다. (theme.js 의 alpha 참고)
 */

/** HSL 삼원색 [h, s(%), l(%)] */
const LIGHT_TOKENS = {
  background: [0, 0, 100],
  foreground: [215, 28, 12],
  card: [0, 0, 100],
  cardForeground: [215, 28, 12],
  popover: [0, 0, 100],
  muted: [214, 32, 96],
  mutedForeground: [215, 16, 45],
  primary: [213, 72, 38],
  primaryForeground: [0, 0, 100],
  secondary: [214, 38, 96],
  secondaryForeground: [213, 72, 30],
  accent: [213, 60, 94],
  accentForeground: [213, 72, 30],
  destructive: [0, 74, 51],
  destructiveForeground: [0, 0, 100],
  success: [158, 73, 34],
  warning: [41, 96, 44],
  /** 앰버 배지 글자색 — 라이트에서 --warning 원색은 대비가 부족해 따로 둡니다 */
  warningText: [38, 92, 38],
  info: [213, 68, 50],
  border: [214, 26, 89],
  input: [214, 26, 89],
  ring: [213, 68, 55],
};

const DARK_TOKENS = {
  background: [215, 32, 7],
  foreground: [214, 32, 96],
  card: [215, 30, 10],
  cardForeground: [214, 32, 96],
  popover: [215, 30, 12],
  muted: [215, 24, 18],
  mutedForeground: [215, 18, 65],
  primary: [213, 78, 60],
  primaryForeground: [215, 32, 7],
  secondary: [215, 26, 17],
  secondaryForeground: [214, 32, 96],
  accent: [215, 30, 20],
  accentForeground: [214, 32, 96],
  destructive: [0, 68, 58],
  destructiveForeground: [0, 0, 100],
  success: [158, 62, 44],
  warning: [41, 92, 55],
  /** 다크에서는 --warning 원색이 그대로 잘 읽힙니다 */
  warningText: [41, 92, 55],
  info: [213, 78, 62],
  border: [215, 22, 20],
  input: [215, 22, 20],
  ring: [213, 70, 50],
};

/** 차트 계열색 — 라이트/다크 각각 별도 선정 (색각 이상 분리도 검증 통과) */
const LIGHT_SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const DARK_SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];

export { LIGHT_TOKENS, DARK_TOKENS, LIGHT_SERIES, DARK_SERIES };
