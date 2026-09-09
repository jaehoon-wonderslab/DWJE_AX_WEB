/**
 * 반원 게이지 — d3 (CM-06)
 *
 * 기존은 path 문자열(`M … A …`)을 직접 만들었습니다. d3.arc() 가 그 일을 대신합니다.
 * value 가 null 이면 「데이터 없음」 — KPI 미측정 지표가 실제로 여기 걸립니다.
 */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { select } from 'd3-selection';
import { arc as d3arc } from 'd3-shape';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from '../charts/chartData';
import { FONT, levelColor, tokens } from './d3Theme';
import { useDataChanged } from './useDataChanged';
import 'd3-transition';

const W = 200;
const H = 118;
const R_OUT = 76;
const SW = 15;
const HALF = Math.PI / 2;

export default function Gauge({ value = 0, min = 0, max = 100, unit = '', label, target, level = '' }) {
  const theme = useTheme();
  const svgRef = useRef(null);
  const animate = useDataChanged();
  const v = num(value);

  useEffect(() => {
    if (v === null) return;
    const c = tokens(theme);
    const ratio = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
    const col = levelColor(theme, level);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${W / 2},100)`);

    const shape = d3arc().innerRadius(R_OUT - SW).outerRadius(R_OUT).cornerRadius(SW / 2);

    g.append('path').attr('d', shape({ startAngle: -HALF, endAngle: HALF })).attr('fill', c.muted);
    // 값 호 — 바뀌면 0 에서 값까지 쓸고 올라옵니다
    const value_ = g.append('path').attr('fill', col);
    if (animate) {
      value_
        .attr('d', shape({ startAngle: -HALF, endAngle: -HALF }))
        .transition()
        .duration(500)
        .attrTween('d', () => (t) => shape({ startAngle: -HALF, endAngle: -HALF + Math.PI * ratio * t }));
    } else {
      value_.attr('d', shape({ startAngle: -HALF, endAngle: -HALF + Math.PI * ratio }));
    }

    if (target !== undefined) {
      const a = -HALF + Math.PI * Math.max(0, Math.min(1, (target - min) / (max - min || 1)));
      const inner = R_OUT - SW - 3;
      const outer = R_OUT + 3;
      g.append('line')
        .attr('x1', Math.sin(a) * inner).attr('y1', -Math.cos(a) * inner)
        .attr('x2', Math.sin(a) * outer).attr('y2', -Math.cos(a) * outer)
        .attr('stroke', c.target).attr('stroke-width', 2);
    }

    const text = g.append('text').attr('y', -16).attr('text-anchor', 'middle')
      .attr('font-size', FONT.gauge).attr('font-weight', '700').attr('fill', c.text);
    text.append('tspan').text(String(value));
    text.append('tspan').attr('font-size', FONT.unit).attr('font-weight', '500').attr('fill', c.axis).text(unit);

    if (label) {
      g.append('text').attr('y', 14).attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', c.axis).text(String(label));
    }
  }, [value, min, max, unit, label, target, level, theme, v, animate]);

  if (v === null) return <ChartEmpty height={H} />;

  return (
    <View style={{ alignItems: 'center' }}>
      <svg ref={svgRef} width={W} height={H} role="img" aria-label={label || '게이지'} style={{ maxWidth: 220, display: 'block' }} />
    </View>
  );
}
