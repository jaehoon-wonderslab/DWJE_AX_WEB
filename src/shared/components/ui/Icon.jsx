/**
 * 아이콘 — 외부 아이콘 폰트 없이 인라인 SVG 로 그립니다.
 *
 * 프로토타입이 쓰던 stroke 기반(lucide 계열) 선 아이콘을 react-native-svg 로 옮긴 것입니다.
 * 색은 기본적으로 부모가 지정한 color 를 따릅니다.
 *
 * 사용 예) <Icon name="search" size={16} color={theme.color.mutedForeground} />
 */
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTheme } from '@shared/theme/useTheme';

/** 아이콘별 경로 정의 (24x24 좌표계) */
const PATHS = {
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  search: [{ c: [11, 11, 7] }, 'm21 21-4.3-4.3'],
  bell: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  chevronDown: ['m6 9 6 6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronUp: ['m18 15-6-6-6 6'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  check: ['m5 13 4 4L19 7'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  printer: [
    'M6 9V2h12v7',
    'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2',
    'M6 14h12v8H6z',
  ],
  info: [{ c: [12, 12, 9] }, 'M12 16v-4', 'M12 8h.01'],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7', 'M21 3v6h-6'],
  alert: ['m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
  filter: ['M22 3H2l8 9.5V19l4 2v-8.5L22 3Z'],
  arrowUp: ['M12 19V5', 'm5 12 7-7 7 7'],
  arrowDown: ['M12 5v14', 'm19 12-7 7-7-7'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  arrowLeft: ['M19 12H5', 'm12 19-7-7 7-7'],
  play: ['m5 3 14 9-14 9V3Z'],
  copy: [{ r: [9, 9, 13, 13, 2] }, 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  external: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14 21 3'],
  clock: [{ c: [12, 12, 9] }, 'M12 7v5l3 2'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', { c: [12, 7, 4] }],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', { c: [9, 7, 4] }, 'M23 21v-2a4 4 0 0 0-3-3.87'],
  settings: [{ c: [12, 12, 3] }, 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z'],
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  send: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'],
  sparkles: ['m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z', 'M19 3v4', 'M17 5h4'],
  thumbsUp: ['M7 22V11', 'M18 22H7V11l4-9a2 2 0 0 1 2.6 1.1L12 9h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18 22Z'],
  thumbsDown: ['M17 2v11', 'M6 2h11v11l-4 9a2 2 0 0 1-2.6-1.1L12 15H6a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 6 2Z'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z', { c: [12, 12, 3] }],
  eyeOff: ['M9.9 5.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.7', 'M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.5 9.5 0 0 0 4.4-1', 'M2 2l20 20'],
  lock: [{ r: [3, 11, 18, 11, 2] }, 'M7 11V7a5 5 0 0 1 10 0v4'],
  database: ['M3 5c0-1.7 4-3 9-3s9 1.3 9 3-4 3-9 3-9-1.3-9-3Z', 'M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5', 'M3 12c0 1.7 4 3 9 3s9-1.3 9-3'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  layers: ['m12 2 10 5-10 5L2 7l10-5Z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5'],
  grid: [{ r: [3, 3, 7, 7, 1] }, { r: [14, 3, 7, 7, 1] }, { r: [3, 14, 7, 7, 1] }, { r: [14, 14, 7, 7, 1] }],
  chart: ['M3 3v18h18', 'm7 14 4-4 3 3 5-6'],
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  calendar: [{ r: [3, 4, 18, 18, 2] }, 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  history: ['M3 12a9 9 0 1 0 3-6.7', 'M3 3v6h6', 'M12 7v5l4 2'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'],
  image: [{ r: [3, 3, 18, 18, 2] }, { c: [8.5, 8.5, 1.5] }, 'm21 15-5-5L5 21'],
  minus: ['M5 12h14'],
};

export default function Icon({ name, size = 16, color, strokeWidth = 1.75, style }) {
  const theme = useTheme();
  const stroke = color || theme.color.foreground;
  const parts = PATHS[name] || PATHS.info;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {parts.map((p, i) => {
        if (typeof p === 'string') {
          return (
            <Path
              key={i}
              d={p}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        if (p?.c) {
          const [cx, cy, r] = p.c;
          return <Circle key={i} cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={strokeWidth} fill="none" />;
        }
        if (p?.r) {
          const [x, y, w, h, rx] = p.r;
          return (
            <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
          );
        }
        return null;
      })}
    </Svg>
  );
}

export { PATHS as ICON_PATHS };
