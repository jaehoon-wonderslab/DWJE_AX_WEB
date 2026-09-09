import './_rnw';
import React from 'react';
import { Icon } from 'dwje-ax-web';

/** Icon.jsx 의 PATHS 키 전체(59개) — 소스 순서 */
const NAMES = [
  'menu', 'search', 'bell', 'moon', 'chevronDown', 'chevronRight', 'chevronLeft', 'chevronUp', 'close', 'check',
  'download', 'upload', 'printer', 'info', 'message', 'plus', 'edit', 'trash', 'refresh', 'alert',
  'filter', 'arrowUp', 'arrowDown', 'arrowRight', 'arrowLeft', 'play', 'copy', 'external', 'clock', 'file',
  'user', 'users', 'settings', 'mic', 'send', 'sparkles', 'thumbsUp', 'thumbsDown', 'eye', 'eyeOff',
  'lock', 'database', 'activity', 'layers', 'grid', 'chart', 'save', 'calendar', 'shield', 'link',
  'history', 'book', 'image', 'minus', 'sun', 'logout', 'triangle', 'star', 'starFilled',
];

const Cell = ({ name }: { name: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 2px', background: '#FAFAFA', borderRadius: 10 }}>
    <Icon name={name} size={18} color="#1C1C1C" />
    <span style={{ fontSize: 10, color: '#787878', lineHeight: '12px', whiteSpace: 'nowrap' }}>{name}</span>
  </div>
);

/** 전체 아이콘 이름표 — name 에 그대로 넣는 카멜케이스 키 */
export const AllIcons = () => (
  <div style={{ width: 620, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
    {NAMES.map((n) => (
      <Cell key={n} name={n} />
    ))}
  </div>
);

/** size — 12 · 14 · 16(기본) · 20 · 24 · 32 */
export const Sizes = () => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
    {[12, 14, 16, 20, 24, 32].map((s) => (
      <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Icon name="settings" size={s} color="#1C1C1C" />
        <span style={{ fontSize: 10.5, color: '#787878' }}>{s}</span>
      </div>
    ))}
  </div>
);

/** color — 부모 글자색을 그대로 넘깁니다. 앰버는 활성 별표 같은 데이터 마커에만 */
export const Colors = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
    {[
      ['foreground', '#1C1C1C', 'user'],
      ['caption', '#787878', 'clock'],
      ['ink 900', '#0B1440', 'shield'],
      ['info', '#1E2A78', 'link'],
      ['success', '#2E9E57', 'check'],
      ['destructive', '#E5482D', 'alert'],
      ['amber', '#F2C14E', 'starFilled'],
    ].map(([label, c, n]) => (
      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 56 }}>
        <Icon name={n} size={20} color={c} />
        <span style={{ fontSize: 10.5, color: '#787878' }}>{label}</span>
      </div>
    ))}
  </div>
);

/** strokeWidth — 1.2(가늘게) · 1.6(기본) · 2.0(강조) */
export const StrokeWidth = () => (
  <div style={{ display: 'flex', gap: 18 }}>
    {[1.2, 1.6, 2.0].map((w) => (
      <div key={w} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Icon name="search" size={22} strokeWidth={w} color="#1C1C1C" />
          <Icon name="bell" size={22} strokeWidth={w} color="#1C1C1C" />
          <Icon name="refresh" size={22} strokeWidth={w} color="#1C1C1C" />
        </div>
        <span style={{ fontSize: 10.5, color: '#787878' }}>{w.toFixed(1)}</span>
      </div>
    ))}
  </div>
);

/** 글자 옆 인라인 — 캡션·버튼·목록행에서 14~16px 로 씁니다 */
export const Inline = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 260 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3C3C3C' }}>
      <Icon name="clock" size={14} color="#787878" /> 최근 갱신 09:40 · MES 실적
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E5482D' }}>
      <Icon name="alert" size={14} color="#E5482D" /> PL-01 도금 두께 하한 근접
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2E9E57' }}>
      <Icon name="check" size={14} color="#2E9E57" /> AOI 재검 12건 완료
    </div>
  </div>
);
