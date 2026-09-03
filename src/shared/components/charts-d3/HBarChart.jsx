/**
 * 가로 막대 — d3 (CM-06)
 *
 * 기존은 View + width % 로 그렸습니다. d3 판은 scaleLinear + SVG 로 통일합니다.
 * 행 높이 16 · 라운드 4 · 항목 간 9 는 기존 간격을 그대로 유지합니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { ChartEmpty, withValues } from '../charts/chartData';
import { clsColor, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { motion, useDataChanged } from './useDataChanged';
import { useChartSize } from './useChartSize';

const ROW_H = 16;
const GAP = 9;

export default function HBarChart({ data = [], unit = '', target, format = comma, labelWidth = 96, valueWidth = 66 }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const rows = withValues(data);
  const height = Math.max(1, rows.length) * (ROW_H + GAP);
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const animate = useDataChanged();

  useEffect(() => {
    if (!width || !rows.length) return;
    const c = tokens(theme);
    const left = labelWidth + 10;
    const right = valueWidth + 10;
    const iw = Math.max(10, width - left - right);
    const hi = Math.max(...rows.map((d) => d.v), target || 0) * 1.08 || 1;
    const x = scaleLinear().domain([0, hi]).range([0, iw]);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    rows.forEach((d, i) => {
      const y = i * (ROW_H + GAP);
      g.append('text')
        .attr('x', 0).attr('y', y + ROW_H - 4)
        .attr('font-size', 12).attr('fill', c.axis)
        .text(String(d.l));
      g.append('rect')
        .attr('x', left).attr('y', y).attr('width', iw).attr('height', ROW_H).attr('rx', 4)
        .attr('fill', c.muted);
      const filled = g.append('rect')
        .attr('x', left).attr('y', y).attr('height', ROW_H).attr('rx', 4)
        .attr('fill', clsColor(theme, d.cls));
      if (animate) filled.attr('width', 0);
      motion(animate)(filled).attr('width', Math.max(x(d.v), 0));
      filled
        .on('mouseenter', () => setHover({
          at: { x: left + x(d.v), y },
          title: String(d.l),
          rows: [{ name: '값', value: `${format(d.v)}${unit}`, color: clsColor(theme, d.cls) }],
        }))
        .on('mouseleave', () => setHover(null));
      if (target !== undefined) {
        g.append('rect')
          .attr('x', left + x(target) - 1).attr('y', y - 2).attr('width', 2).attr('height', ROW_H + 4)
          .attr('fill', c.target);
      }
      g.append('text')
        .attr('x', width).attr('y', y + ROW_H - 4).attr('text-anchor', 'end')
        .attr('font-size', 12).attr('font-weight', '600').attr('fill', c.text)
        .text(`${format(d.v)}${unit}`);
    });
  }, [data, width, theme, target, unit, labelWidth, valueWidth, format, animate]);

  if (!rows.length) return <ChartEmpty height={90} />;

  return (
    <View>
      <div ref={ref} style={{ width: '100%', position: 'relative' }}>
        <svg ref={svgRef} width={width} height={height} role="img" aria-label="가로 막대 그래프" style={{ cursor: 'default', display: 'block' }} />
        <Tooltip {...(hover || {})} />
      </div>
      {target !== undefined ? (
        <Text style={[s.textXs, { textAlign: 'right' }]}>{`▏목표 ${format(target)}${unit}`}</Text>
      ) : null}
    </View>
  );
}
