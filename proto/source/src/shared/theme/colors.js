/**
 * 컬러 토큰 — 덕우전자 AX 워크스페이스 "Soft-matte panels on warm gray"
 *
 * 스타일 참조(docs/duckwoo-ax-style-reference.md)를 React Native 토큰으로 옮긴 것입니다.
 *
 *  · 캔버스   : 웜 그레이(#f4f5f7). 그 위에 흰 패널이 16px 여백을 두고 떠 있습니다.
 *  · 패널     : 흰색(#ffffff). 그 안의 2차 표면은 #FAFAFA(보더 없음), 트랙·호버는 #F4F5F6.
 *  · 잉크     : 네이비 #0B1440 — 제목·주요 수치·기본 채움 버튼·차트 1계열.
 *  · 글자     : #1C1C1C 본문 · #3C3C3C 카드 안 문단 · #787878 모든 캡션/라벨.
 *  · 포인트   : 앰버 #F2C14E — 데이터 채움·활성 점·주의 마커에만. 글자·버튼·표면에는 쓰지 않습니다.
 *  · 상태     : 성공 #2E9E57 · 오류 #E5482D.
 *
 * 화면 테마는 라이트 하나입니다(로그인 화면 포함). 다크 토큰은 없습니다.
 *
 * CSS 의 `hsl(var(--x) / .12)` 문법은 RN 에서 동작하지 않으므로
 * HSL 삼원색을 그대로 보관하고 rgba() 문자열로 변환해 사용합니다. (theme.js 의 alpha 참고)
 */

/** HSL 삼원색 [h, s(%), l(%)] */
const LIGHT_TOKENS = {
  /** 캔버스 #f4f5f7 */
  background: [220, 16, 96],
  /** 본문 글자 #1C1C1C */
  foreground: [0, 0, 11],
  /** 패널 #ffffff */
  card: [0, 0, 100],
  cardForeground: [0, 0, 11],
  popover: [0, 0, 100],
  /** 2차 표면 #FAFAFA */
  muted: [0, 0, 98],
  /** 캡션·라벨 #787878 */
  mutedForeground: [0, 0, 47],
  /** 잉크 900 #0B1440 — 주요 동작·제목 */
  primary: [230, 71, 15],
  primaryForeground: [0, 0, 100],
  /** 트랙 #F4F5F6 */
  secondary: [210, 10, 96],
  /** 카드 안 문단 #3C3C3C */
  secondaryForeground: [0, 0, 24],
  accent: [0, 0, 98],
  accentForeground: [230, 71, 15],
  /** 오류 #E5482D */
  destructive: [9, 78, 54],
  destructiveForeground: [0, 0, 100],
  /** 성공 #2E9E57 */
  success: [142, 55, 40],
  /** 포인트 앰버 #F2C14E — 데이터 채움 전용 */
  warning: [42, 86, 63],
  /** 앰버 계열 글자가 꼭 필요할 때(배지) — 어두운 앰버 #B0851F */
  warningText: [42, 70, 41],
  /** 잉크 700 #1E2A78 — 링크·2계열·정보 */
  info: [232, 60, 29],
  /** 구분선 #DFE1E7 */
  border: [225, 14, 89],
  input: [225, 14, 89],
  ring: [232, 60, 29],
  /** 포인트(데이터) 색 별칭 — 앰버 */
  spark: [42, 86, 63],
  /** 잉크 500 #3F3AA8 — 3계열 */
  ink500: [243, 49, 44],
  /** 비강조 데이터 #B4B8CC */
  dataMute: [230, 19, 75],
  /** 성공 틴트 #EAF6EC — 세션 활성 캡슐 배경 */
  successTint: [130, 40, 94],
};

/** 차트 계열색 — 잉크 900 → 잉크 700 → 잉크 500 → 앰버 → 비강조 회색 → 성공 */
const LIGHT_SERIES = ['#0B1440', '#1E2A78', '#3F3AA8', '#F2C14E', '#B4B8CC', '#2E9E57'];

/** 브랜드 고정색 — 로고 그라디언트(CI) 와 파티클 성좌 팔레트에만 씁니다 */
export const BRAND = {
  deokwooBlue: '#0033a0',
  skyBlue: '#00aeef',
  ink: '#0B1440',
  iris: '#8052ff',
  amber: '#F2C14E',
  spark: '#ffb829',
  verdant: '#15846e',
  magenta: '#e35bd8',
};

export { LIGHT_TOKENS, LIGHT_SERIES };
