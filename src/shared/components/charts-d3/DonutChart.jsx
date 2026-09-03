/**
 * 도넛 — d3 (CM-06)
 *
 * 기존은 strokeDasharray 로 호를 흉내 냈습니다. d3.pie() + d3.arc() 가 정공법입니다.
 * `.sort(null)` 이 필수입니다 — 넘어온 순서를 지켜야 계열색이 오른쪽 범례와 맞습니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { select } from 'd3-selection';
import { arc as d3arc, pie as d3pie } from 'd3-shape';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { ChartEmpty, withValues } from '../charts/chartData';
import { FONT, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { useDataChanged } from './useDataChanged';
import 'd3-transition';

const SIZE = 160;
const R_IN = 48;
const R_OUT = 68;

export default function DonutChart({ segs = [], height = 180, unitLabel = '건' }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const animate = useDataChanged();

  const parts = withValues(segs);
  const empty = !parts.length || parts.every((x) => x.v === 0);
  const total = parts.reduce((a, b) => a + b.v, 0) || 1;

  useEffect(() => {
    if (empty) return;
    const c = tokens(theme);
    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${SIZE / 2},${height / 2})`);

    const layout = d3pie().sort(null).value((d) => d.v).padAngle(0.012);
    const shape = d3arc().innerRadius(R_IN).outerRadius(R_OUT);

    const arcs = g.selectAll('path').data(layout(parts)).join('path')
      .attr('fill', (_, i) => c.series(i));
    if (animate) {
      // 각도를 0 에서 제 값까지 벌립니다 (비중 변화가 눈에 보이게)
      arcs.transition().duration(450).attrTween('d', (d) => {
        const i = (t) => ({ ...d, endAngle: d.startAngle + (d.endAngle - d.startAngle) * t });
        return (t) => shape(i(t));
      });
    } else {
      arcs.attr('d', shape);
    }
    arcs
      .on('mouseenter', (_, d) => setHover({
        at: { x: SIZE / 2, y: height / 2 - R_OUT },
        title: String(d.data.l),
        rows: [{ name: '비중', value: `${comma(d.data.v)} (${((d.data.v / total) * 100).toFixed(1)}%)`, color: c.series(d.index) }],
      }))
      .on('mouseleave', () => setHover(null));

    g.append('text').attr('y', -2).attr('text-anchor', 'middle')
      .attr('font-size', FONT.center).attr('font-weight', '700').attr('fill', c.text)
      .text(comma(total));
    g.append('text').attr('y', 15).attr('text-anchor', 'middle')
      .attr('font-size', FONT.value).attr('fill', c.axis)
      .text(unitLabel);
  }, [segs, height, theme, empty, total, animate]);

  if (empty) return <ChartEmpty height={height} />;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: SIZE, height }}>
        <svg ref={svgRef} width={SIZE} height={height} role="img" aria-label="비중 도넛" style={{ cursor: 'default', display: 'block' }} />
        <Tooltip {...(hover || {})} />
      </div>

      <View style={{ flex: 1, minWidth: 130 }}>
        {parts.map((seg, i) => (
          <View key={seg.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: theme.seriesAt(i) }} />
            <Text style={[s.textSm, { flex: 1 }]} numberOfLines={1}>{seg.l}</Text>
            <Text style={[s.textSm, s.num, { color: theme.color.mutedForeground }]}>{comma(seg.v)}</Text>
            <Text style={[s.textSm, s.num, { width: 44, textAlign: 'right' }]}>{((seg.v / total) * 100).toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
