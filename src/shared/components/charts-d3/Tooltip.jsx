/**
 * 차트 공용 hover 툴팁 (CM-06 · d3)
 *
 * 마스킹 규칙 — 차트는 canData() 를 호출하지 않습니다.
 * 권한이 없으면 View 가 애초에 값을 넘기지 않으므로, 툴팁에도 새지 않습니다.
 */
import React from 'react';
import { useTheme } from '@shared/theme/useTheme';

/**
 * @param {object} props
 *   at   {x, y} 화면 안 좌표 (null 이면 숨김)
 *   rows [{ name, value, color }]
 *   title 상단 라벨 (x축 값)
 */
export default function Tooltip({ at, title, rows = [] }) {
  const theme = useTheme();
  if (!at || !rows.length) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: at.x,
        top: at.y,
        transform: 'translate(-50%, -100%)',
        marginTop: -10,
        pointerEvents: 'none',
        background: theme.color.popover,
        border: `1px solid ${theme.color.border}`,
        borderRadius: 7,
        padding: '6px 9px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        whiteSpace: 'nowrap',
        zIndex: 5,
      }}
    >
      {title ? (
        <div style={{ fontSize: 10.5, color: theme.color.mutedForeground, marginBottom: rows.length ? 4 : 0 }}>{title}</div>
      ) : null}
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: theme.color.foreground }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, display: 'inline-block' }} />
          <span style={{ color: theme.color.mutedForeground }}>{r.name}</span>
          <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
