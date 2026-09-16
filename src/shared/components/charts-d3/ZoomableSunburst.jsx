/**
 * 불량 수량으로 면적을 나눈 계층형 도넛. 경로·단계·상세를 확대 중에도 보존합니다.
 *
 * 확대·축소 애니메이션 (observablehq.com/@d3/zoomable-sunburst 와 같은 방식)
 *  · 계층은 **한 번만** 배치합니다. 확대할 때마다 다시 배치하면 조각의 각도와 차례가 통째로 바뀌어
 *    "어느 조각이 어디로 갔는지" 이을 수 없습니다. 대신 고른 조각(focus)을 기준으로 좌표를 환산합니다.
 *  · 각 조각의 좌표(각도 x0·x1, 고리 y0)를 직전 위치에서 새 위치로 750ms 동안 보간합니다.
 *    보이는 고리 밖으로 밀려나는 조각은 폭이 0 으로 좁아지며 사라지고, 새로 드러나는 조각은 그 반대입니다.
 *  · 보간은 React 상태가 아니라 DOM 속성에 직접 씁니다. 조각이 300개를 넘는 화면이라
 *    프레임마다 다시 그리면 끊깁니다. React 는 목표 좌표로 한 번만 그리고, 그 사이를 이 루프가 메웁니다.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hierarchy, partition } from 'd3-hierarchy';
import { arc } from 'd3-shape';
import { useTheme } from '@shared/theme/useTheme';
import { useChartSize } from './useChartSize';

const TAU = Math.PI * 2;
/** 확대·축소 전환 시간 */
const ZOOM_MS = 750;
/** 목록 머리글에서 쏠림을 요약할 때 묶는 상위 항목 수 */
const TOP_N = 10;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** 지금 보이는 고리 안에 있는 조각인지 (폭이 0 이면 접힌 것으로 봅니다) */
const onRing = (g, rings) => !!g && g.x1 - g.x0 > 1e-4 && g.y0 >= 1 - 1e-6 && g.y0 <= rings + 1e-6;

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
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const hide = () => setHover(null);
    const escape = e => { if (e.key === 'Escape') hide(); };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => { setPath([]); setQuery(''); setHover(null); }, [data]);

  // 계층은 한 번만 배치합니다 — 확대해도 조각의 각도 차례가 유지돼야 이어져 보입니다.
  const root = useMemo(() => {
    const r = hierarchy(data || { name: title });
    r.sum(d => d.children?.length ? 0 : Math.max(0, Number(d.value) || 0)).sort((a,b) => b.value - a.value);
    partition().size([TAU, r.height + 1])(r);
    // 같은 이름이 다른 가지에도 있으므로 좌표를 기억할 열쇠는 뿌리부터의 경로로 만듭니다
    r.each(d => { d.uid = d.parent ? d.parent.uid + '|' + (d.data.key ?? d.data.name ?? '') : 'root'; });
    return r;
  }, [data, title]);
  const total = root.value;
  const overall = value => total > 0 ? (value / total * 100).toFixed(1) : '0.0';

  const focusNode = useMemo(() => {
    let node = root;
    for (const key of path) {
      const next = node.children?.find(d => d.data.key === key);
      if (!next) break;
      node = next;
    }
    return node;
  }, [root, path]);
  const focus = focusNode.data;
  const ancestors = focusNode.ancestors().reverse();
  const rings = Math.min(2, Math.max(1, focusNode.height));

  /** 고른 조각을 기준으로 환산한 좌표 — 이 값이 애니메이션의 도착점입니다 */
  const targets = useMemo(() => {
    const span = focusNode.x1 - focusNode.x0 || 1;
    const map = new Map();
    root.each(d => map.set(d.uid, {
      x0: Math.max(0, Math.min(1, (d.x0 - focusNode.x0) / span)) * TAU,
      x1: Math.max(0, Math.min(1, (d.x1 - focusNode.x0) / span)) * TAU,
      y0: d.y0 - focusNode.depth,
    }));
    return map;
  }, [root, focusNode]);
  const candidates = useMemo(() => root.descendants().filter(d => d.depth > 0 && d.value > 0), [root]);

  const diameter = Math.max(220, Math.min(620, (width > 850 ? width * 0.55 : width) || 480));
  const radius = diameter / 2 - 8;
  const inner = Math.min(105, radius * 0.5);
  const ring = (radius - inner) / rings;
  /** 고리 두께는 단계 수에 따라 달라지므로 arc 생성기도 그때그때 만듭니다 */
  const arcFor = thickness => arc().startAngle(g => g.x0).endAngle(g => g.x1)
    .padAngle(g => Math.min((g.x1 - g.x0) / 2, 0.006)).padRadius(radius / 2)
    .innerRadius(g => Math.max(0, inner + (g.y0 - 1) * thickness))
    .outerRadius(g => Math.max(0, inner + g.y0 * thickness - 2));
  const shape = arcFor(ring);
  const edgeArc = arc().startAngle(g => g.x0).endAngle(g => g.x1).innerRadius(inner).outerRadius(radius - 2);

  // ── 애니메이션 ────────────────────────────────────────────
  const paintedRef = useRef(new Map());     // 지금 화면에 그려져 있는 좌표
  const paintedRingsRef = useRef(rings);
  const prevTargetsRef = useRef(null);      // 직전 focus 기준 좌표 (사라지는 조각을 그리는 데 씁니다)
  const groupEls = useRef(new Map());
  const arcEls = useRef(new Map());
  const labelEls = useRef(new Map());
  const edgeEls = useRef(new Map());
  const keep = (store, uid) => el => { if (el) store.current.set(uid, el); else store.current.delete(uid); };

  // 그릴 조각 — 새 자리에서 보이거나, 직전 자리에서 보이던 것(사라지는 중)
  const prevTargets = prevTargetsRef.current;
  const paint = [];
  for (const d of candidates) {
    const to = targets.get(d.uid);
    const show = onRing(to, rings);
    if (show || onRing(prevTargets?.get(d.uid), paintedRingsRef.current)) paint.push({ node: d, to, show });
  }
  const nodes = paint.filter(p => p.show).map(p => p.node);

  useLayoutEffect(() => {
    const painted = paintedRef.current;
    const fromRings = paintedRingsRef.current;
    const previous = prevTargetsRef.current;
    const steps = [];
    for (const d of candidates) {
      const to = targets.get(d.uid);
      if (!to) continue;
      const from = painted.get(d.uid) || previous?.get(d.uid);
      const show = onRing(to, rings);
      const wasShown = onRing(from, fromRings);
      if (!show && !wasShown) continue;
      // 대부분의 조각은 나타났다 사라지지 않고 자리만 옮깁니다 — 그때는 투명도를 건드리지 않습니다
      steps.push({ uid: d.uid, from: from || to, to, fade: show !== wasShown, alpha0: wasShown ? 1 : 0, alpha1: show ? 1 : 0 });
    }
    const draw = t => {
      const e = ease(t);
      const thickness = (radius - inner) / Math.max(1, fromRings + (rings - fromRings) * e);
      const shapeNow = arcFor(thickness);
      const painting = new Map();
      for (const s of steps) {
        const g = t >= 1 ? s.to : {
          x0: s.from.x0 + (s.to.x0 - s.from.x0) * e,
          x1: s.from.x1 + (s.to.x1 - s.from.x1) * e,
          y0: s.from.y0 + (s.to.y0 - s.from.y0) * e,
        };
        painting.set(s.uid, g);
        arcEls.current.get(s.uid)?.setAttribute('d', shapeNow(g) || '');
        edgeEls.current.get(s.uid)?.setAttribute('d', edgeArc(g) || '');
        if (s.fade) groupEls.current.get(s.uid)?.setAttribute('opacity', String(s.alpha0 + (s.alpha1 - s.alpha0) * e));
        const label = labelEls.current.get(s.uid);
        if (label) {
          const angle = (g.x0 + g.x1) / 2;
          const mid = inner + (g.y0 - 0.5) * thickness;
          let rotate = angle * 180 / Math.PI;
          if (rotate > 90 && rotate < 270) rotate += 180;
          label.setAttribute('transform', 'translate(' + Math.sin(angle) * mid + ',' + -Math.cos(angle) * mid + ') rotate(' + rotate + ')');
        }
      }
      paintedRef.current = painting;
      paintedRingsRef.current = fromRings + (rings - fromRings) * e;
    };
    // 첫 그림이나 「동작 줄이기」 설정에서는 곧바로 제자리에 놓습니다
    if (!painted.size || !previous || reduceMotion()) { draw(1); return undefined; }
    let raf = 0;
    let start = 0;
    const step = ts => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / ZOOM_MS);
      draw(t);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    draw(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, rings, radius, inner]);

  // 다음 확대의 출발점 — 렌더 중에는 직전 값이 남아 있어야 사라지는 조각을 그릴 수 있습니다
  useLayoutEffect(() => { prevTargetsRef.current = targets; });

  // ── 조회·강조 ─────────────────────────────────────────────
  const activeNode = hover ? nodes.find(d => d.data.key === hover.detail.key) : null;
  const activeAncestors = new Set(activeNode?.ancestors().map(d => d.data.key) || []);
  const related = node => !activeNode || activeAncestors.has(node.data.key) ||
    node.ancestors().some(d => d.data.key === activeNode.data.key);
  const center = activeNode?.data || focus;
  const nodePath = node => node.ancestors().reverse().map(d => d.data);
  const fullName = node => nodePath(node).map(describe).join(' › ');
  const siblings = (focusNode.children || []).filter(d => d.value > 0);
  const children = siblings.filter(d =>
    (fullName(d) + ' ' + (d.data.context || '')).toLowerCase().includes(query.toLowerCase()));
  /**
   * 목록 머리글 — 스크롤하지 않고도 규모와 쏠림을 알 수 있게 합니다.
   * 항목이 200개 가까이 되는 단계에서는 "몇 개인가" 보다 "위에서 몇 개가 대부분인가" 가 먼저 필요합니다.
   */
  const topShare = siblings.length > TOP_N && focusNode.value > 0
    ? siblings.slice(0, TOP_N).reduce((sum, d) => sum + d.value, 0) / focusNode.value * 100 : null;
  const listSummary = query ? siblings.length + '개 중 ' + children.length + '개'
    : siblings.length + '개' + (canRate && topShare != null ? ' · 상위 ' + TOP_N + '개가 이 그룹의 ' + topShare.toFixed(0) + '%' : '');
  const go = keys => { setPath(keys); setQuery(''); setHover(null); };
  const inspect = node => {
    const details = new Map();
    nodePath(node).slice(1).forEach(d => {
      if (d.levelLabel) details.set(d.levelLabel, d.name);
      (d.details || []).forEach(([label, value]) => details.set(label, value));
    });
    const parent = node.parent || focusNode;
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
  const buttonStyle = { font: 'inherit', fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + theme.divider, background: theme.color.card, color: theme.color.foreground, cursor: 'pointer' };
  return <div ref={ref} data-sunburst={title} style={{ width: '100%', minWidth: 0, color: theme.color.foreground, fontSize: 17 }}>
    <HoverTooltip hover={canQty ? hover : null} theme={theme} canRate={canRate} />
    <nav aria-label={title + ' 선택 경로'} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, overflowWrap: 'anywhere' }}>
      <button style={buttonStyle} onClick={() => go([])}>전체 보기</button>
      {ancestors.length > 1 && <button style={buttonStyle} onClick={() => go(ancestors.slice(1,-1).map(d => d.data.key))}>상위로</button>}
      <span data-sunburst-path style={{ width: '100%', lineHeight: 1.6 }}>
        {ancestors.map((d,i) => <React.Fragment key={d.uid}>
          {i > 0 && ' › '}
          <button style={{ ...buttonStyle, border: 0, padding: '4px 2px', textAlign: 'left', overflowWrap: 'anywhere', maxWidth: '100%', fontWeight: i === ancestors.length - 1 ? 700 : 400 }}
            onClick={() => go(ancestors.slice(1,i+1).map(n => n.data.key))}>{describe(d.data)}</button>
        </React.Fragment>)}
      </span>
    </nav>
    <div style={{ color: theme.color.mutedForeground, fontSize: 15, marginBottom: 12 }}>
      조각 넓이 = 불량 수량. 두 단계씩 표시하며 조각·목록을 눌러 확대합니다. 차트나 목록에 마우스를 올리면 해당 영역과 연결된 항목이 강조됩니다.
    </div>
    {!canQty ? <p>수량 조회 권한이 없어 차트를 표시하지 않습니다.</p> : !focusNode.value ? <p>표시할 불량 수량이 없습니다.</p> :
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', minWidth: 0 }}>
        <div style={{ flex: '1 1 400px', minWidth: 0, maxWidth: '100%', textAlign: 'center' }}>
          <div data-sunburst-caption style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, overflowWrap: 'anywhere' }}>{describe(focus)}{canRate && <span data-sunburst-overall style={{ display: 'block', fontSize: 16, marginTop: 6 }}>전체 대비 {overall(focusNode.value)}%</span>}</div>
          <svg role="img" aria-label={title + ' — ' + ancestors.map(d => describe(d.data)).join(' › ')} width={diameter} height={diameter}
            viewBox={'0 0 ' + diameter + ' ' + diameter} style={{ height: 'auto', maxWidth: '100%', display: 'block', margin: 'auto' }}>
            <g transform={'translate(' + diameter / 2 + ',' + diameter / 2 + ')'}>
              {paint.map(({ node: d, to, show }) => {
                const angle = (to.x0 + to.x1) / 2;
                const delta = to.x1 - to.x0;
                const mid = inner + (to.y0 - 0.5) * ring;
                const outer = inner + to.y0 * ring - 4;
                const room = Math.min(2 * mid * Math.sin(Math.min(delta / 2, Math.PI / 2)) * 0.82,
                  2 * Math.sqrt(Math.max(0, outer * outer - mid * mid)) * 0.8);
                // 라벨을 그릴지는 **도착 좌표**로 정합니다 — 움직이는 중에 글자가 나타났다 사라지면 읽을 수 없습니다
                const label = show && room >= 36 ? shorten(d.data.name, room) : '';
                const valueLabel = canRate ? '전체 ' + overall(d.value) + '%' : amount(d.value);
                const showValue = ring >= 54 && textWidth(valueLabel) <= room;
                const showQuantity = canRate && showValue && ring >= 85 && textWidth(amount(d.value)) <= room;
                let rotate = angle * 180 / Math.PI;
                if (rotate > 90 && rotate < 270) rotate += 180;
                return <g key={d.uid} ref={keep(groupEls, d.uid)} data-sunburst-node={d.data.key} data-highlight={activeNode ? (related(d) ? 'active' : 'dimmed') : 'none'}
                  opacity={related(d) ? 1 : 0.2} style={{ transition: 'opacity 120ms ease' }}>
                  <path ref={keep(arcEls, d.uid)} d={shape(to)} fill={color(d)} fillOpacity={1} stroke={theme.color.card} strokeWidth={1.5}
                    role={show ? 'button' : undefined} tabIndex={show ? 0 : undefined} aria-label={fullName(d) + ', 불량 ' + amount(d.value)}
                    style={{ cursor: 'pointer', pointerEvents: show ? 'auto' : 'none' }}
                    onClick={e => drill(d, e)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(d, e); } }}
                    onMouseEnter={e => showTooltip(d, e)} onMouseMove={e => showTooltip(d, e)} onMouseLeave={() => setHover(null)}
                    onFocus={e => showTooltip(d, e)} onBlur={() => setHover(null)}>
                  </path>
                  {label && <g ref={keep(labelEls, d.uid)} pointerEvents="none" transform={'translate(' + Math.sin(angle) * mid + ',' + -Math.cos(angle) * mid + ') rotate(' + rotate + ')'}>
                    <text data-sunburst-label fontSize={17} fontWeight="600" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" y={showQuantity ? -22 : showValue ? -10 : 0}>{label}</text>
                    {showQuantity && <text fontSize={16} fill="#ffffff" textAnchor="middle" dominantBaseline="middle" y={0}>{amount(d.value)}</text>}
                    {showValue && <text fontSize={16} fill="#ffffff" textAnchor="middle" dominantBaseline="middle" y={showQuantity ? 22 : 12}>{valueLabel}</text>}
                  </g>}
                </g>;
              })}
              <g pointerEvents="none" data-sunburst-boundaries>
                {(focusNode.children || []).filter(d => d.value > 0).map(d => <g key={d.uid}>
                  <path ref={keep(edgeEls, d.uid)} d={edgeArc(targets.get(d.uid))} fill="none" stroke={theme.color.card} strokeWidth={4} />
                  <path d={edgeArc(targets.get(d.uid))} fill="none" stroke={theme.color.foreground} strokeWidth={1} strokeOpacity={0.8} />
                </g>)}
              </g>
              {activeNode && <g pointerEvents="none" data-sunburst-highlight={activeNode.data.key}>
                <path d={shape(targets.get(activeNode.uid))} fill="none" stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" />
                <path d={shape(targets.get(activeNode.uid))} fill="none" stroke="#0f172a" strokeWidth={2} strokeLinejoin="round" />
                <circle cx={Math.sin((targets.get(activeNode.uid).x0 + targets.get(activeNode.uid).x1) / 2) * (inner + targets.get(activeNode.uid).y0 * ring - 7)}
                  cy={-Math.cos((targets.get(activeNode.uid).x0 + targets.get(activeNode.uid).x1) / 2) * (inner + targets.get(activeNode.uid).y0 * ring - 7)}
                  r={5} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
              </g>}
              <circle r={inner - 3} fill={theme.surface} role="button" tabIndex={0} aria-label="상위 구성으로 이동"
                style={{ cursor: 'pointer' }} onClick={() => go(ancestors.slice(1,-1).map(d => d.data.key))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(ancestors.slice(1,-1).map(d => d.data.key)); } }} />
              <text pointerEvents="none" textAnchor="middle" y="-28" fontSize={16} fill={theme.color.mutedForeground}>{center?.levelLabel || '전체'}</text>
              <text data-sunburst-center pointerEvents="none" textAnchor="middle" y="-3" fontSize={17} fontWeight="600" fill={theme.color.foreground}>{shorten(center?.name || '', inner * 1.7)}</text>
              <text pointerEvents="none" textAnchor="middle" y="24" fontSize={18} fontWeight="700" fill={theme.color.foreground}>{amount(activeNode?.value ?? focusNode.value)}</text>
            </g>
          </svg>
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%' }}>
          <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{describe(focus)}의 하위 항목</div>
          <div data-sunburst-summary style={{ margin: '4px 0 8px', fontSize: 15, color: theme.color.mutedForeground }}>{listSummary}</div>
          <input aria-label={title + ' 항목 검색'} placeholder="제품·불량·라인·공정 검색" value={query}
            onChange={e => setQuery(e.target.value)} style={{ ...buttonStyle, boxSizing: 'border-box', width: '100%', marginBottom: 8 }} />
          {/* 항목이 수백 개까지 늘어나므로 목록은 차트와 같은 높이 안에서 스크롤합니다 — 카드 길이가 항목 수에 휘둘리지 않습니다 */}
          <div style={{ maxHeight: Math.max(360, diameter), overflowY: 'auto', paddingRight: 4 }}>
            {children.map((d, i) => {
              const on = !!activeNode && related(d);
              const share = focusNode.value > 0 ? d.value / focusNode.value * 100 : 0;
              const whole = overall(d.value);
              const local = share.toFixed(1);
              return <button data-sunburst-item data-highlight={on ? 'active' : 'none'} key={d.uid} onMouseEnter={e => showTooltip(d, e)} onMouseMove={e => showTooltip(d, e)} onMouseLeave={() => setHover(null)} onFocus={e => showTooltip(d, e)} onBlur={() => setHover(null)} style={{ ...buttonStyle, fontSize: 16, lineHeight: 1.35, padding: '8px 11px', boxShadow: on ? 'inset 0 0 0 2px ' + color(d) : 'none', background: on ? theme.surface : theme.color.card, width: '100%', display: 'block', textAlign: 'left', marginBottom: 6 }} onClick={e => drill(d, e)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, minWidth: 20, color: theme.color.mutedForeground, fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ width: 12, height: 12, background: color(d), flexShrink: 0, borderRadius: 3 }} />
                  <strong style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{describe(d.data)}</strong>
                  <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>불량 {amount(d.value)}</span>
                </span>
                {/* 경로와 비율을 한 줄에 둡니다 — 줄이 하나 줄어든 만큼 한 화면에 보이는 항목이 늘어납니다 */}
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2, fontSize: 14, lineHeight: 1.45, color: theme.color.mutedForeground }}>
                  <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{fullName(d)}</span>
                  {canRate && <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {whole === local ? '전체 ' + whole + '%' : '전체 ' + whole + '% · 그룹 ' + local + '%'}
                  </span>}
                </span>
                {/* 비중 막대 — 목록은 수량 내림차순이라 막대만 훑어도 몇 번째로 큰지 읽힙니다 */}
                {canRate && <span style={{ display: 'block', height: 5, marginTop: 6, borderRadius: 99, background: theme.surfaceHover, overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: Math.max(1.5, share) + '%', background: color(d), borderRadius: 99 }} />
                </span>}
              </button>;
            })}
            {!children.length && <div style={{ padding: 12 }}>검색 조건에 맞는 하위 항목이 없습니다.</div>}
          </div>
        </div>
      </div>}
  </div>;
}
