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
import { useChartSize } from './useChartSize';

const PAD = { l: 38, r: 12, t: 14, b: 26 };
const MAX_BAR = 30;

export default function BarChart({ data = [], height = 170, stacked = false }) {
  const theme = useTheme();
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const animate = useDataChanged();

  const bars = data.map((d) => ({ ...d, v: num(d.v), v2: num(d.v2) }));
  const empty = !bars.length || bars.every((d) => d.v === null && d.v2 === null);

  useEffect(() => {
    if (!width || empty) return;
    const iw = Math.max(10, width - PAD.l - PAD.r);
    const ih = Math.max(10, height - PAD.t - PAD.b);
    const c = tokens(theme);

    const total = (d) => (stacked ? (d.v || 0) + (d.v2 || 0) : Math.max(d.v || 0, d.v2 || 0));
    const x = scaleBand().domain(bars.map((_, i) => i)).range([PAD.l, PAD.l + iw]).padding(0.3);
    const y = scaleLinear().domain([0, Math.max(...bars.map(total)) || 1]).nice().range([PAD.t + ih, PAD.t]);
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
        .text(Math.round(t).toLocaleString());
    });

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
    });

    // x 라벨 — 자리가 좁으면 눕힙니다
    const rotate = x.bandwidth() < 24;
    bars.forEach((d, i) => {
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
          if (d.v !== null) rows.push({ name: '값', value: d.v.toLocaleString(), color: c.series(0) });
          if (d.v2 !== null) rows.push({ name: '보조', value: d.v2.toLocaleString(), color: c.series(1) });
          if (rows.length) setHover({ at: { x: x(i) + x.bandwidth() / 2, y: PAD.t }, title: String(d.l), rows });
        })
        .on('mouseleave', () => setHover(null));
    });
  }, [data, width, height, theme, stacked, empty, animate]);

  if (empty) return <ChartEmpty height={height} />;

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      <svg ref={svgRef} width={width} height={height} role="img" aria-label="막대 그래프" style={{ cursor: 'default', display: 'block' }} />
      <Tooltip {...(hover || {})} />
    </div>
  );
}
