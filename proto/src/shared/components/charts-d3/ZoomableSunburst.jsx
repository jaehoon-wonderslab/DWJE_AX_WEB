/** 불량 수량으로 면적을 나눈 계층형 도넛. 경로·단계·상세를 확대 중에도 보존합니다. */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hierarchy, partition } from 'd3-hierarchy';
import { arc } from 'd3-shape';
import { useTheme } from '@shared/theme/useTheme';
import { useChartSize } from './useChartSize';

const PALETTE = ['#1d4ed8', '#0f766e', '#7e22ce', '#9a3412', '#be123c', '#166534', '#155e75', '#4338ca', '#854d0e', '#334155'];
const amount = v => v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
const describe = d => d?.levelLabel ? d.levelLabel + ': ' + d.name : d?.name || '';
const textWidth = text => Array.from(text).reduce((n,c) => n + (c.charCodeAt(0) > 255 ? 17 : 10), 0);
function shorten(text, width) {
  if (textWidth(text) <= width) return text;
  let result = '';
  for (const c of text) {
    if (textWidth(result + c + '…') > width) break;
    result += c;
  }
  return result ? result + '…' : '';
}
function HoverTooltip({ hover, theme, canRate }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!hover || !tooltipRef.current) return;
    const box = tooltipRef.current.getBoundingClientRect();
    const x = hover.x + 16 + box.width <= window.innerWidth - 8 ? hover.x + 16 : hover.x - box.width - 16;
    const y = hover.y + 16 + box.height <= window.innerHeight - 8 ? hover.y + 16 : hover.y - box.height - 16;
    setPosition({ left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8)) });
  }, [hover]);
  if (!hover || typeof document === 'undefined') return null;
  const d = hover.detail;
  return createPortal(<div ref={tooltipRef} role="tooltip" style={{ position: 'fixed', ...position, zIndex: 10000,
    pointerEvents: 'none', width: 420, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 16px)',
    boxSizing: 'border-box', padding: 14, borderRadius: 10, border: '1px solid ' + theme.divider,
    background: theme.color.card, color: theme.color.foreground, boxShadow: '0 6px 24px #0003',
    fontSize: 15, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
    <div style={{ fontWeight: 700, marginBottom: 10 }}>{describe(d)}</div>
    <table aria-label="불량 상세 정보" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <tbody>
        {[
          ...d.details.filter(([label]) => label !== '제품'),
          ['불량 수량', amount(d.value)],
          ...(canRate ? [
            ['전체 대비', d.overall + '%'],
            ['그룹 내 비율', d.local + '%'],
            ...(d.rate != null ? [['불량률', Number(d.rate).toFixed(2) + '%']] : []),
          ] : []),
        ].map(([label, value]) => <tr key={label}>
          <th scope="row" style={{ width: 100, padding: '6px 8px', textAlign: 'left', verticalAlign: 'top',
            fontWeight: 600, background: theme.surface, border: '1px solid ' + theme.divider }}>{label}</th>
          <td style={{ padding: '6px 8px', border: '1px solid ' + theme.divider, fontVariantNumeric: 'tabular-nums' }}>{value}</td>
        </tr>)}
      </tbody>
    </table>
  </div>, document.body);
}
export default function ZoomableSunburst({ data, title, canQty = true, canRate = true }) {
  const theme = useTheme();
  const { ref, width } = useChartSize(520);
  const [path, setPath] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const hide = () => setHover(null);
    const escape = e => { if (e.key === 'Escape') hide(); };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); window.removeEventListener('keydown', escape); };
  }, []);
  const total = useMemo(() => hierarchy(data || {}).sum(d => d.children?.length ? 0 : Math.max(0, Number(d.value) || 0)).value, [data]);
  const overall = value => total > 0 ? (value / total * 100).toFixed(1) : '0.0';
  useEffect(() => { setPath([]); setQuery(''); setPage(0); setHover(null); }, [data]);
  const ancestors = [data];
  for (const key of path) {
    const next = ancestors.at(-1)?.children?.find(d => d.key === key);
    if (!next) break;
    ancestors.push(next);
  }
  const focus = ancestors.at(-1);
  const root = useMemo(() => {
    const r = hierarchy(focus || { name: title });
    r.sum(d => d.children?.length ? 0 : Math.max(0, Number(d.value) || 0)).sort((a,b) => b.value - a.value);
    return partition().size([Math.PI * 2, r.height + 1])(r);
  }, [focus, title]);
  const diameter = Math.max(220, Math.min(620, (width > 850 ? width * 0.55 : width) || 480));
  const radius = diameter / 2 - 8;
  const inner = Math.min(105, radius * 0.5);
  const rings = Math.min(2, Math.max(1, root.height));
  const ring = (radius - inner) / rings;
  const shape = arc().startAngle(d => d.x0).endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.006)).padRadius(radius / 2)
    .innerRadius(d => inner + (d.depth - 1) * ring).outerRadius(d => inner + d.depth * ring - 2);
  const nodes = root.descendants().filter(d => d.depth > 0 && d.depth <= rings && d.value > 0);
  const activeNode = hover ? nodes.find(d => d.data.key === hover.detail.key) : null;
  const activeAncestors = new Set(activeNode?.ancestors().map(d => d.data.key) || []);
  const related = node => !activeNode || activeAncestors.has(node.data.key) ||
    node.ancestors().some(d => d.data.key === activeNode.data.key);
  const center = activeNode?.data || focus;
  const nodePath = node => [...ancestors, ...node.ancestors().reverse().slice(1).map(d => d.data)];
  const fullName = node => nodePath(node).map(describe).join(' › ');
  const children = (root.children || []).filter(d => d.value > 0 &&
    (fullName(d) + ' ' + (d.data.context || '')).toLowerCase().includes(query.toLowerCase()));
  const shown = children.slice(page * 8, page * 8 + 8);
  const go = keys => { setPath(keys); setQuery(''); setPage(0); setHover(null); };
  const inspect = node => {
    const details = new Map();
    nodePath(node).slice(1).forEach(d => {
      if (d.levelLabel) details.set(d.levelLabel, d.name);
      (d.details || []).forEach(([label, value]) => details.set(label, value));
    });
    const parent = node.parent || root;
    return { ...node.data, value: node.value, fullPath: fullName(node), details: [...details],
      overall: overall(node.value), local: parent.value > 0 ? (node.value / parent.value * 100).toFixed(1) : '0.0',
      parentName: describe(parent.data) };
  };
  const showTooltip = (node, event) => {
    const box = event.currentTarget.getBoundingClientRect();
    setHover({ detail: inspect(node), x: event.clientX ?? (box.left + box.width / 2),
      y: event.clientY ?? (box.top + box.height / 2) });
  };
  const drill = (node, event) => {
    if (!node.children?.length) { if (event) showTooltip(node, event); return; }
    go(nodePath(node).slice(1).map(d => d.key));
  };
  const color = node => {
    // 확대 전후에도 같은 노드는 같은 색을 유지합니다.
    let hash = 0;
    for (const c of node.data.key || node.data.name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  };
  const groupOutline = arc().startAngle(d => d.x0).endAngle(d => d.x1)
    .innerRadius(inner).outerRadius(radius - 2);
  const buttonStyle = { font: 'inherit', fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + theme.divider, background: theme.color.card, color: theme.color.foreground, cursor: 'pointer' };
  return <div ref={ref} data-sunburst={title} style={{ width: '100%', minWidth: 0, color: theme.color.foreground, fontSize: 17 }}>
    <HoverTooltip hover={canQty ? hover : null} theme={theme} canRate={canRate} />
    <nav aria-label={title + ' 선택 경로'} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, overflowWrap: 'anywhere' }}>
      <button style={buttonStyle} onClick={() => go([])}>전체 보기</button>
      {ancestors.length > 1 && <button style={buttonStyle} onClick={() => go(ancestors.slice(1,-1).map(d => d.key))}>상위로</button>}
      <span data-sunburst-path style={{ width: '100%', lineHeight: 1.6 }}>
        {ancestors.map((d,i) => <React.Fragment key={d?.key || i}>
          {i > 0 && ' › '}
          <button style={{ ...buttonStyle, border: 0, padding: '4px 2px', textAlign: 'left', overflowWrap: 'anywhere', maxWidth: '100%', fontWeight: i === ancestors.length - 1 ? 700 : 400 }}
            onClick={() => go(ancestors.slice(1,i+1).map(n => n.key))}>{describe(d)}</button>
        </React.Fragment>)}
      </span>
    </nav>
    <div style={{ color: theme.color.mutedForeground, fontSize: 15, marginBottom: 12 }}>
      조각 넓이 = 불량 수량. 두 단계씩 표시하며 조각·목록을 눌러 확대합니다. 차트나 목록에 마우스를 올리면 해당 영역과 연결된 항목이 강조됩니다.
    </div>
    {!canQty ? <p>수량 조회 권한이 없어 차트를 표시하지 않습니다.</p> : !root.value ? <p>표시할 불량 수량이 없습니다.</p> :
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', minWidth: 0 }}>
        <div style={{ flex: '1 1 400px', minWidth: 0, maxWidth: '100%', textAlign: 'center' }}>
          <div data-sunburst-caption style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, overflowWrap: 'anywhere' }}>{describe(focus)}{canRate && <span data-sunburst-overall style={{ display: 'block', fontSize: 16, marginTop: 6 }}>전체 대비 {overall(root.value)}%</span>}</div>
          <svg role="img" aria-label={title + ' — ' + ancestors.map(describe).join(' › ')} width={diameter} height={diameter}
            viewBox={'0 0 ' + diameter + ' ' + diameter} style={{ height: 'auto', maxWidth: '100%', display: 'block', margin: 'auto' }}>
            <g transform={'translate(' + diameter / 2 + ',' + diameter / 2 + ')'}>
              {nodes.map(d => {
                const angle = (d.x0 + d.x1) / 2;
                const delta = d.x1 - d.x0;
                const mid = inner + (d.depth - 0.5) * ring;
                const outer = inner + d.depth * ring - 4;
                const room = Math.min(2 * mid * Math.sin(Math.min(delta / 2, Math.PI / 2)) * 0.82,
                  2 * Math.sqrt(Math.max(0, outer * outer - mid * mid)) * 0.8);
                const label = room >= 36 ? shorten(d.data.name, room) : '';
                const valueLabel = canRate ? '전체 ' + overall(d.value) + '%' : amount(d.value);
                const showValue = ring >= 54 && textWidth(valueLabel) <= room;
                const showQuantity = canRate && showValue && ring >= 85 && textWidth(amount(d.value)) <= room;
                let rotate = angle * 180 / Math.PI;
                if (rotate > 90 && rotate < 270) rotate += 180;
                return <g key={d.data.key} data-sunburst-node={d.data.key} data-highlight={activeNode ? (related(d) ? 'active' : 'dimmed') : 'none'}
                  opacity={related(d) ? 1 : 0.2} style={{ transition: 'opacity 120ms ease' }}>
                  <path d={shape(d)} fill={color(d)} fillOpacity={1} stroke={theme.color.card} strokeWidth={1.5}
                    role="button" tabIndex={0} aria-label={fullName(d) + ', 불량 ' + amount(d.value)}
                    style={{ cursor: 'pointer' }}
                    onClick={e => drill(d, e)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(d, e); } }}
                    onMouseEnter={e => showTooltip(d, e)} onMouseMove={e => showTooltip(d, e)} onMouseLeave={() => setHover(null)}
                    onFocus={e => showTooltip(d, e)} onBlur={() => setHover(null)}>
                  </path>
                  {label && <g pointerEvents="none" transform={'translate(' + Math.sin(angle) * mid + ',' + -Math.cos(angle) * mid + ') rotate(' + rotate + ')'}>
                    <text data-sunburst-label fontSize={17} fontWeight="600" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" y={showQuantity ? -22 : showValue ? -10 : 0}>{label}</text>
                    {showQuantity && <text fontSize={16} fill="#ffffff" textAnchor="middle" dominantBaseline="middle" y={0}>{amount(d.value)}</text>}
                    {showValue && <text fontSize={16} fill="#ffffff" textAnchor="middle" dominantBaseline="middle" y={showQuantity ? 22 : 12}>{valueLabel}</text>}
                  </g>}
                </g>;
              })}
              <g pointerEvents="none" data-sunburst-boundaries>
                {(root.children || []).filter(d => d.value > 0).map(d => <g key={d.data.key}>
                  <path d={groupOutline(d)} fill="none" stroke={theme.color.card} strokeWidth={4} />
                  <path d={groupOutline(d)} fill="none" stroke={theme.color.foreground} strokeWidth={1} strokeOpacity={0.8} />
                </g>)}
              </g>
              {activeNode && <g pointerEvents="none" data-sunburst-highlight={activeNode.data.key}>
                <path d={shape(activeNode)} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" />
                <path d={shape(activeNode)} fill="none" stroke="#0f172a" strokeWidth={2} strokeLinejoin="round" />
                <circle cx={Math.sin((activeNode.x0 + activeNode.x1) / 2) * (inner + activeNode.depth * ring - 7)}
                  cy={-Math.cos((activeNode.x0 + activeNode.x1) / 2) * (inner + activeNode.depth * ring - 7)}
                  r={5} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
              </g>}
              <circle r={inner - 3} fill={theme.surface} role="button" tabIndex={0} aria-label="상위 구성으로 이동"
                style={{ cursor: 'pointer' }} onClick={() => go(ancestors.slice(1,-1).map(d => d.key))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(ancestors.slice(1,-1).map(d => d.key)); } }} />
              <text pointerEvents="none" textAnchor="middle" y="-28" fontSize={16} fill={theme.color.mutedForeground}>{center?.levelLabel || '전체'}</text>
              <text data-sunburst-center pointerEvents="none" textAnchor="middle" y="-3" fontSize={17} fontWeight="600" fill={theme.color.foreground}>{shorten(center?.name || '', inner * 1.7)}</text>
              <text pointerEvents="none" textAnchor="middle" y="24" fontSize={18} fontWeight="700" fill={theme.color.foreground}>{amount(activeNode?.value ?? root.value)}</text>
            </g>
          </svg>
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%' }}>
          <div style={{ marginBottom: 8, fontWeight: 600, overflowWrap: 'anywhere' }}>{describe(focus)}의 하위 항목</div>
          <input aria-label={title + ' 항목 검색'} placeholder="제품·불량·라인·공정 검색" value={query}
            onChange={e => { setQuery(e.target.value); setPage(0); }} style={{ ...buttonStyle, boxSizing: 'border-box', width: '100%', marginBottom: 8 }} />
          {shown.map(d => <button data-sunburst-item data-highlight={activeNode && related(d) ? 'active' : 'none'} key={d.data.key} onMouseEnter={e => showTooltip(d, e)} onMouseMove={e => showTooltip(d, e)} onMouseLeave={() => setHover(null)} onFocus={e => showTooltip(d, e)} onBlur={() => setHover(null)} style={{ ...buttonStyle, boxShadow: activeNode && related(d) ? 'inset 0 0 0 2px ' + color(d) : 'none', background: activeNode && related(d) ? theme.surface : theme.color.card, width: '100%', display: 'flex', gap: 10, textAlign: 'left', marginBottom: 6 }} onClick={e => drill(d, e)}>
            <span style={{ width: 14, height: 14, background: color(d), flexShrink: 0, marginTop: 4, borderRadius: 3 }} />
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong>{describe(d.data)}</strong>
              <span style={{ display: 'block', fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>{fullName(d)}</span>
              <span style={{ display: 'block', marginTop: 5 }}>불량 {amount(d.value)}{canRate ? ' · 전체 대비 ' + overall(d.value) + '% · 선택 그룹 내 ' + (d.value / root.value * 100).toFixed(1) + '%' : ''}</span>
            </span>
          </button>)}
          {!shown.length && <div style={{ padding: 12 }}>검색 조건에 맞는 하위 항목이 없습니다.</div>}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <button style={buttonStyle} disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button>
            <span>{page + 1} / {Math.max(1, Math.ceil(children.length / 8))}</span>
            <button style={buttonStyle} disabled={(page + 1) * 8 >= children.length} onClick={() => setPage(page + 1)}>다음</button>
          </div>
        </div>
      </div>}
  </div>;
}
