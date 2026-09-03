/**
 * 방사형(레이더) — d3 (CM-06)
 *
 * 기존은 삼각함수로 좌표를 직접 계산했습니다. d3.lineRadial() 이 그 일을 대신합니다.
 * 값 범위는 0~100 고정입니다 (props 로 받지 않습니다).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { select } from 'd3-selection';
import { curveLinearClosed, lineRadial } from 'd3-shape';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from '../charts/chartData';
import { FONT, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { useChartSize } from './useChartSize';

export default function RadarChart({ axes = [], height = 210 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const rows = axes.map((a) => ({ ...a, v: num(a.v), t: num(a.t) }));
  const empty = !rows.length || rows.every((a) => a.v === null);

  useEffect(() => {
    if (!width || empty) return;
    const c = tokens(theme);
    const cx = width / 2;
    const cy = height / 2 + 4;
    const R = Math.min(width, height) / 2 - 42;
    const n = rows.length;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    const angle = (i) => (i * 2 * Math.PI) / n;
    const radial = lineRadial().curve(curveLinearClosed).angle((_, i) => angle(i));

    // 거미줄 4겹
    [1, 0.75, 0.5, 0.25].forEach((k) => {
      g.append('path')
        .attr('d', radial.radius(() => R * k)(rows))
        .attr('fill', 'none').attr('stroke', c.grid).attr('stroke-width', 1);
    });

    // 축선
    rows.forEach((_, i) => {
      const a = angle(i) - Math.PI / 2;
      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', Math.cos(a) * R).attr('y2', Math.sin(a) * R)
        .attr('stroke', c.grid).attr('stroke-width', 1);
    });

    // 목표 (점선) — 값이 하나라도 있을 때만
    if (rows.some((a) => a.t !== null)) {
      g.append('path')
        .attr('d', radial.radius((d) => (R * (d.t ?? 0)) / 100)(rows))
        .attr('fill', 'none').attr('stroke', c.target)
        .attr('stroke-dasharray', '5 4').attr('stroke-width', 1.5).attr('opacity', 0.8);
    }

    // 현재 (실선 + 면)
    g.append('path')
      .attr('d', radial.radius((d) => (R * (d.v ?? 0)) / 100)(rows))
      .attr('fill', c.series(0)).attr('fill-opacity', 0.18)
      .attr('stroke', c.series(0)).attr('stroke-width', 2);

    // 축 이름 + hover
    rows.forEach((d, i) => {
      const a = angle(i) - Math.PI / 2;
      const lx = Math.cos(a) * (R + 18);
      const ly = Math.sin(a) * (R + 18);
      g.append('text')
        .attr('x', lx).attr('y', ly + 3)
        .attr('text-anchor', Math.abs(lx) < 4 ? 'middle' : lx > 0 ? 'start' : 'end')
        .attr('font-size', FONT.value).attr('fill', c.axis)
        .text(String(d.l));
      g.append('circle')
        .attr('cx', Math.cos(a) * ((R * (d.v ?? 0)) / 100)).attr('cy', Math.sin(a) * ((R * (d.v ?? 0)) / 100))
        .attr('r', 9).attr('fill', 'transparent')
        .on('mouseenter', () => setHover({
          at: { x: cx + lx, y: cy + ly - 12 },
          title: String(d.l),
          rows: [
            ...(d.v !== null ? [{ name: '현재', value: String(d.v), color: c.series(0) }] : []),
            ...(d.t !== null ? [{ name: '목표', value: String(d.t), color: c.target }] : []),
          ],
        }))
        .on('mouseleave', () => setHover(null));
    });
  }, [axes, width, height, theme, empty]);

  if (empty) return <ChartEmpty height={height} />;

  return (
    <View>
      <div ref={ref} style={{ width: '100%', position: 'relative' }}>
        <svg ref={svgRef} width={width} height={height} role="img" aria-label="품질 지수 레이더" style={{ cursor: 'default', display: 'block' }} />
        <Tooltip {...(hover || {})} />
      </div>
      <View style={[s.legend, { marginTop: 4 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.legendLine, { backgroundColor: theme.seriesAt(0) }]} />
          <Text style={s.legendText}>현재</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.legendLine, { backgroundColor: theme.color.destructive }]} />
          <Text style={s.legendText}>목표</Text>
        </View>
      </View>
    </View>
  );
}
