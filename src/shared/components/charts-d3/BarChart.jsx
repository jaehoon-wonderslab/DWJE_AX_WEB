/**
 * 세로 막대 — d3 (CM-06)
 *
 * scaleBand 로 자리를 나누고, y 상한은 `.nice()` 로 사람이 읽기 좋은 값에 맞춥니다.
 * (기존은 max × 1.12 라 0.7 · 1.4 같은 어정쩡한 눈금이 나왔습니다)
 */
import React, { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from '../charts/chartData';
import { FONT, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { motion, useDataChanged } from './useDataChanged';
import { labelStride, useChartSize } from './useChartSize';

const PAD = { l: 42, r: 16, t: 16, b: 28 };
const MAX_BAR = 32;

export default function BarChart({
  data = [],
  height = 170,
  stacked = false,
  unit = '',
  target = null,
  min = undefined,
  max = undefined,
}) {
  const theme = useTheme();
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const animate = useDataChanged();

  const bars = data.map((d) => ({ ...d, v: num(d.v), v2: num(d.v2) }));
  const empty = !bars.length || bars.every((d) => d.v === null && d.v2 === null);

  const isPercent = unit === '%';
  const minColW = isPercent || bars.some((d) => String(d.l).length > 6) ? 68 : 40;
  const contentWidth = Math.max(width || 300, bars.length * minColW + PAD.l + PAD.r);

  useEffect(() => {
    if (!width || empty) return;
    const iw = Math.max(10, contentWidth - PAD.l - PAD.r);
    const ih = Math.max(10, height - PAD.t - PAD.b);
    const c = tokens(theme);

    const total = (d) => (stacked ? (d.v || 0) + (d.v2 || 0) : Math.max(d.v || 0, d.v2 || 0));
    const hiVal = Math.max(...bars.map(total), num(target) ?? 0);
    const yHi = max !== undefined ? max : (isPercent ? Math.max(4.5, hiVal * 1.2) : (hiVal || 1));
    const yLo = min !== undefined ? min : 0;

    const x = scaleBand().domain(bars.map((_, i) => i)).range([PAD.l, PAD.l + iw]).padding(0.32);
    const y = scaleLinear().domain([yLo, yHi]).nice().range([PAD.t + ih, PAD.t]);
    const bw = Math.min(MAX_BAR, x.bandwidth());

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    y.ticks(5).forEach((t) => {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', c.grid).attr('stroke-dasharray', '3 3').attr('stroke-width', 1);
      g.append('text')
        .attr('x', PAD.l - 6).attr('y', y(t) + 3).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(isPercent ? `${t.toFixed(1)}%` : Math.round(t).toLocaleString());
    });

    // 목표선 (target)
    if (num(target) !== null) {
      const yTarget = y(target);
      if (yTarget >= PAD.t && yTarget <= PAD.t + ih) {
        g.append('line')
          .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', yTarget).attr('y2', yTarget)
          .attr('stroke', c.target || '#ef4444').attr('stroke-dasharray', '5 4').attr('stroke-width', 1.5);
        g.append('text')
          .attr('x', PAD.l + iw).attr('y', yTarget - 5).attr('text-anchor', 'end')
          .attr('font-size', FONT.axis).attr('font-weight', '600').attr('fill', c.target || '#ef4444')
          .text(`목표 ${target}${unit}`);
      }
    }

    const base = PAD.t + ih;
    const move = motion(animate);
    /** 막대 하나 — 값이 바뀌면 바닥에서 자라 올라옵니다 */
    const bar = (x0, w, yTop, h, fill) => {
      const r = g.append('rect').attr('x', x0).attr('width', w).attr('rx', 3).attr('fill', fill);
      if (animate) r.attr('y', base).attr('height', 0);
      move(r).attr('y', yTop).attr('height', Math.max(h, 0));
    };

    bars.forEach((d, i) => {
      const cx = x(i) + x.bandwidth() / 2;
      bar(cx - bw / 2, bw, y(d.v || 0), base - y(d.v || 0), c.series(0));
      if (d.v2 !== null) {
        if (stacked) {
          bar(cx - bw / 2, bw, y((d.v || 0) + d.v2), y(d.v || 0) - y((d.v || 0) + d.v2), c.series(1));
        } else {
          bar(cx + 1, bw * 0.55, y(d.v2), base - y(d.v2), c.series(1));
        }
      }

      // 막대 상단 수치 라벨 상시 표기 (Halo 테두리 적용)
      if (d.v !== null && d.v > 0) {
        const yPos = y(d.v || 0) - 4;
        const valText = isPercent
          ? `${Number(d.v).toFixed(2)}%`
          : d.v >= 10000 ? `${(d.v / 10000).toFixed(1)}만` : Math.round(d.v).toLocaleString();
        g.append('text')
          .attr('x', cx - (d.v2 !== null && !stacked ? bw * 0.25 : 0))
          .attr('y', yPos)
          .attr('text-anchor', 'middle')
          .attr('font-size', 9.5)
          .attr('font-weight', '600')
          .attr('fill', (target && d.v > target) ? '#ef4444' : c.text)
          .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff')
          .attr('stroke-width', 2.5)
          .attr('paint-order', 'stroke')
          .text(valText);
      }
      if (d.v2 !== null && d.v2 > 0) {
        const yPos2 = stacked ? y((d.v || 0) + d.v2) - 4 : y(d.v2) - 4;
        const xPos2 = stacked ? cx : cx + bw * 0.28;
        const val2Text = isPercent
          ? `${Number(d.v2).toFixed(2)}%`
          : d.v2 >= 10000 ? `${(d.v2 / 10000).toFixed(1)}만` : Math.round(d.v2).toLocaleString();
        g.append('text')
          .attr('x', xPos2)
          .attr('y', yPos2)
          .attr('text-anchor', 'middle')
          .attr('font-size', 9.5)
          .attr('font-weight', '600')
          .attr('fill', c.series(1))
          .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff')
          .attr('stroke-width', 2.5)
          .attr('paint-order', 'stroke')
          .text(val2Text);
      }
    });

    // x 라벨 — 먼저 솎아 내고, 그래도 좁으면 눕힙니다.
    // 눕히기만 하면 라벨이 서로 겹쳐 읽을 수 없습니다 (설비 455대에서 454번 겹쳤습니다).
    const stride = labelStride(bars.length, iw);
    const shown = bars.filter((_, i) => i % stride === 0);
    const gap = iw / Math.max(1, shown.length);
    const rotate = gap < 44;
    bars.forEach((d, i) => {
      if (i % stride !== 0) return;
      const cx = x(i) + x.bandwidth() / 2;
      const t = g.append('text')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(String(d.l));
      if (rotate) {
        t.attr('transform', `translate(${cx},${height - 10}) rotate(-45)`).attr('text-anchor', 'end');
      } else {
        t.attr('x', cx).attr('y', height - 8).attr('text-anchor', 'middle');
      }
    });

    // 툴팁
    bars.forEach((d, i) => {
      g.append('rect')
        .attr('x', x(i)).attr('y', PAD.t).attr('width', x.bandwidth()).attr('height', ih)
        .attr('fill', 'transparent')
        .on('mouseenter', () => {
          const rows = [];
          const vStr = isPercent ? `${Number(d.v).toFixed(2)}%` : d.v.toLocaleString();
          if (d.v !== null) rows.push({ name: isPercent ? '불량률' : '값', value: vStr, color: c.series(0) });
          if (d.v2 !== null) {
            const v2Str = isPercent ? `${Number(d.v2).toFixed(2)}%` : d.v2.toLocaleString();
            rows.push({ name: '보조', value: v2Str, color: c.series(1) });
          }
          if (rows.length) setHover({ at: { x: x(i) + x.bandwidth() / 2, y: PAD.t }, title: String(d.l), rows });
        })
        .on('mouseleave', () => setHover(null));
    });
  }, [data, width, height, theme, stacked, empty, animate, unit, target, min, max]);

  if (empty) return <ChartEmpty height={height} />;

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      <div style={{ width: '100%', overflowX: contentWidth > (width || 300) ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <svg ref={svgRef} width={contentWidth} height={height} role="img" aria-label="막대 그래프" style={{ cursor: 'default', display: 'block' }} />
      </div>
      <Tooltip {...(hover || {})} />
    </div>
  );
}
