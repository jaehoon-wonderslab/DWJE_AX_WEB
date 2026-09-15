/**
 * 테마 → d3 색·글자 토큰 (CM-06 · d3)
 *
 * d3 기본 팔레트(schemeCategory10 · interpolateBlues 등)를 쓰지 않습니다.
 * 라이트/다크 두 벌을 테마가 관리하고 있어, 팔레트를 섞으면 한쪽이 깨집니다.
 */

/** 축·눈금·값 글자 크기 — 기존 차트와 같은 값을 씁니다 */
export const FONT = { axis: 13, value: 13.5, center: 23, gauge: 30, unit: 16 };

/**
 * @param {object} theme useTheme() 결과
 */
export function tokens(theme) {
  return {
    grid: theme.hairline,
    axis: theme.color.mutedForeground,
    text: theme.color.foreground,
    /** 점 안쪽은 캔버스색으로 뚫어 선 위에 떠 보이게 */
    dot: theme.color.background,
    target: theme.color.spark,
    muted: theme.alpha('foreground', 0.08),
    series: (i) => theme.seriesAt(i),
  };
}

/**
 * HBarChart · DotPlot 의 `cls` 색 규칙
 * @param {object} theme
 * @param {'bad'|'warn'|string} cls
 */
export function clsColor(theme, cls) {
  if (cls === 'bad') return theme.color.destructive;
  if (cls === 'warn') return theme.color.warning;
  return theme.seriesAt(0);
}

/** 게이지·상태 색 (level) */
export function levelColor(theme, level) {
  if (level === 'bad') return theme.color.destructive;
  if (level === 'warn') return theme.color.warning;
  if (level === 'ok') return theme.color.success;
  return theme.seriesAt(0);
}
