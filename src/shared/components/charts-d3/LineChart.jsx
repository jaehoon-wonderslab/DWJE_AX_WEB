/**
 * 선 그래프 — d3 (CM-06)
 *
 * 기존 charts/LineChart 와 props 가 100% 같습니다. View 는 import 만 바꾸면 됩니다.
 *
 * 핵심은 **null 구간에서 선을 끊는 것** 입니다.
 * 실 데이터에는 아직 적재되지 않은 지표가 null 로 오는데,
 * d3 스케일에 null 을 넣으면 NaN 좌표가 되어 path 가 통째로 사라집니다.
 * `d3.line().defined()` 로 그 구간만 건너뜁니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { select } from 'd3-selection';
import { scaleLinear, scalePoint } from 'd3-scale';
import { area as d3area, line as d3line } from 'd3-shape';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from '../charts/chartData';
import { FONT, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { labelStride, useChartSize } from './useChartSize';

const PAD = { l: 38, r: 12, t: 14, b: 24 };

export default function LineChart({ labels = [], series = [], height = 170, min, max, target, unit = '', showLegend = true }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const lines = series.map((se) => ({
    ...se,
    points: (se.data || []).map((v, i) => ({ i, v: num(v) })),
  }));
  const all = lines.flatMap((se) => se.points.map((p) => p.v)).filter((v) => v !== null);

  const minPointW = 44;
  const contentWidth = Math.max(width || 300, labels.length * minPointW + PAD.l + PAD.r);

  useEffect(() => {
    if (!width || !all.length) return;
    const iw = Math.max(10, contentWidth - PAD.l - PAD.r);
    const ih = Math.max(10, height - PAD.t - PAD.b);
    const c = tokens(theme);

    const lo = min !== undefined ? min : Math.min(...all, num(target) ?? Infinity);
    const hi = max !== undefined ? max : Math.max(...all, num(target) ?? -Infinity);

    const x = scalePoint().domain(labels.map((_, i) => i)).range([PAD.l, PAD.l + iw]);
    const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([PAD.t + ih, PAD.t]);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // 눈금선 · y 라벨 — 사람이 읽기 좋은 값은 d3 가 고릅니다
    const ticks = y.ticks(5);
    const g = svg.append('g');
    ticks.forEach((t) => {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', c.grid).attr('stroke-dasharray', '3 3').attr('stroke-width', 1);
      g.append('text')
        .attr('x', PAD.l - 6).attr('y', y(t) + 3).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(Math.abs(t) < 10 ? t.toFixed(1) : Math.round(t).toLocaleString());
    });

    // 목표선
    if (num(target) !== null) {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y(target)).attr('y2', y(target))
        .attr('stroke', c.target).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.5);
      g.append('text')
        .attr('x', PAD.l + iw).attr('y', y(target) - 5).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('fill', c.target)
        .text(`목표 ${target}${unit}`);
    }

    const defined = (d) => d.v !== null;
    const path = d3line().defined(defined).x((d) => x(d.i)).y((d) => y(d.v));
    const fill = d3area().defined(defined).x((d) => x(d.i)).y0(PAD.t + ih).y1((d) => y(d.v));

    lines.forEach((se, si) => {
      const col = c.series(si);
      if (!se.points.some(defined)) return;
      if (si === 0) {
        g.append('path').attr('d', fill(se.points)).attr('fill', col).attr('fill-opacity', 0.1);
      }
      g.append('path')
        .attr('d', path(se.points)).attr('fill', 'none')
        .attr('stroke', col).attr('stroke-width', 2)
        .attr('stroke-dasharray', se.dashed ? '5 4' : null);

      // 포인트 점
      g.selectAll(null).data(se.points.filter(defined)).join('circle')
        .attr('cx', (d) => x(d.i)).attr('cy', (d) => y(d.v)).attr('r', 3.2)
        .attr('fill', c.dot).attr('stroke', col).attr('stroke-width', 1.8);

      // 각 포인트 상단 수치 라벨 상시 표기 (Halo 적용)
      se.points.filter(defined).forEach((d) => {
        g.append('text')
          .attr('x', x(d.i)).attr('y', y(d.v) - 6).attr('text-anchor', 'middle')
          .attr('font-size', 9.5).attr('font-weight', '600').attr('fill', col)
          .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff').attr('stroke-width', 2.5).attr('paint-order', 'stroke')
          .text(typeof d.v === 'number' ? (d.v < 10 ? d.v.toFixed(1) : Math.round(d.v).toLocaleString()) : d.v);
      });
    });

    // x 라벨 — 좁으면 솎아 냅니다
    const stride = labelStride(labels.length, iw);
    labels.forEach((l, i) => {
      if (i % stride !== 0) return;
      g.append('text')
        .attr('x', x(i)).attr('y', height - 7).attr('text-anchor', 'middle')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(String(l));
    });

    // 툴팁 — 투명 overlay 로 포인터를 받습니다
    svg.append('rect')
      .attr('x', PAD.l).attr('y', PAD.t).attr('width', iw).attr('height', ih)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = [event.offsetX];
        let near = 0;
        let best = Infinity;
        labels.forEach((_, i) => {
          const d = Math.abs(x(i) - mx);
          if (d < best) { best = d; near = i; }
        });
        const rows = lines
          .map((se, si) => ({ name: se.name || `계열 ${si + 1}`, v: se.points[near]?.v, color: c.series(si) }))
          .filter((r) => r.v !== null && r.v !== undefined)
          .map((r) => ({ name: r.name, value: `${r.v}${unit}`, color: r.color }));
        if (!rows.length) { setHover(null); return; }
        setHover({ at: { x: x(near), y: PAD.t }, title: String(labels[near] ?? ''), rows });
      })
      .on('mouseleave', () => setHover(null));
  }, [labels, series, width, height, theme, min, max, target, unit, contentWidth]);

  if (!all.length) return <ChartEmpty height={height} />;

  return (
    <View>
      <div ref={ref} style={{ width: '100%', position: 'relative' }}>
        <div style={{ width: '100%', overflowX: contentWidth > (width || 300) ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch' }}>
          <svg ref={svgRef} width={contentWidth} height={height} role="img" aria-label="추이 그래프" style={{ cursor: 'default', display: 'block' }} />
        </div>
        <Tooltip {...(hover || {})} />
      </div>

      {showLegend && series.length > 1 ? (
        <View style={[s.legend, { marginTop: 6 }]}>
          {series.map((se, i) => (
            <View key={se.name || i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.legendLine, { backgroundColor: theme.seriesAt(i) }]} />
              <Text style={s.legendText}>{se.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
