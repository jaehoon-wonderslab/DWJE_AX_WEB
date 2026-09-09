/**
 * 도트 플롯 — d3 (CM-06)
 *
 * 값이 좁은 구간(예: 수율 95~100%)에 몰려 있어 막대로는 구분이 안 될 때 씁니다.
 * **0 에서 시작하지 않는 것이 의도** 입니다 — 길이가 아니라 위치로 값을 읽습니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, withValues } from '../charts/chartData';
import { clsColor, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { useChartSize } from './useChartSize';

const ROW_H = 18;
const GAP = 10;
const AXIS_H = 16;

export default function DotPlot({ data = [], min = 0, max = 100, target, unit = '', digits = 1, labelWidth = 80 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const rows = withValues(data);
  const height = Math.max(1, rows.length) * (ROW_H + GAP) + AXIS_H;
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!width || !rows.length) return;
    const c = tokens(theme);
    const left = labelWidth + 10;
    const right = (target !== undefined ? 118 : 62) + 10;
    const iw = Math.max(10, width - left - right);
    const x = scaleLinear().domain([min, max]).range([0, iw]).clamp(true);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    rows.forEach((d, i) => {
      const y = i * (ROW_H + GAP);
      const mid = y + ROW_H / 2;
      g.append('text').attr('x', 0).attr('y', mid + 4).attr('font-size', 12).attr('fill', c.axis).text(String(d.l));
      g.append('rect').attr('x', left).attr('y', mid - 1).attr('width', iw).attr('height', 2).attr('fill', c.muted);
      if (target !== undefined) {
        g.append('rect').attr('x', left + x(target) - 1).attr('y', y + 1).attr('width', 2).attr('height', ROW_H - 2).attr('fill', c.target);
      }
      g.append('circle')
        .attr('cx', left + x(d.v)).attr('cy', mid).attr('r', 6)
        .attr('fill', clsColor(theme, d.cls)).attr('stroke', c.dot).attr('stroke-width', 2)
        .on('mouseenter', () => setHover({
          at: { x: left + x(d.v), y: mid - 10 },
          title: String(d.l),
          rows: [{ name: '값', value: `${d.v.toFixed(digits)}${unit}`, color: clsColor(theme, d.cls) }],
        }))
        .on('mouseleave', () => setHover(null));

      g.append('text')
        .attr('x', left + iw + 52).attr('y', mid + 4).attr('text-anchor', 'end')
        .attr('font-size', 12).attr('font-weight', '600').attr('fill', c.text)
        .text(`${d.v.toFixed(digits)}${unit}`);

      if (target !== undefined) {
        const gap = d.v - target;
        g.append('text')
          .attr('x', width).attr('y', mid + 4).attr('text-anchor', 'end')
          .attr('font-size', 11).attr('fill', gap < 0 ? c.target : theme.color.success)
          .text(`${gap > 0 ? '+' : ''}${gap.toFixed(digits)}%p`);
      }
    });

    // 하단 축 라벨 3개
    const axisY = rows.length * (ROW_H + GAP) + 10;
    [min, (min + max) / 2, max].forEach((v, i) => {
      g.append('text')
        .attr('x', left + x(v)).attr('y', axisY)
        .attr('text-anchor', i === 0 ? 'start' : i === 2 ? 'end' : 'middle')
        .attr('font-size', 9).attr('fill', c.axis)
        .text(`${Number(v).toFixed(digits)}${unit}`);
    });
  }, [data, width, theme, min, max, target, unit, digits, labelWidth]);

  if (!rows.length) return <ChartEmpty height={90} />;

  return (
    <View>
      <div ref={ref} style={{ width: '100%', position: 'relative' }}>
        <svg ref={svgRef} width={width} height={height} role="img" aria-label="목표 대비 편차" style={{ cursor: 'default', display: 'block' }} />
        <Tooltip {...(hover || {})} />
      </div>
      <Text style={[s.textXs, { opacity: 0 }]} />
    </View>
  );
}
