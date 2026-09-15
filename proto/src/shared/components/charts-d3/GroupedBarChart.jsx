/** 선택 항목별 수량을 한 그룹 안에서 비교하는 d3 막대그래프 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from '../charts/chartData';
import { tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { axisLabelWidth } from './axisLabelWidth';
import { useChartSize } from './useChartSize';

const PAD = { l: 46, r: 24, t: 28, b: 42 };

/**
 * 좌측 여백 — 눈금 숫자가 길면 넓힙니다.
 *
 * 고정 46px 이면 십만 단위부터 앞자리가 잘려 「00,000」 처럼 보입니다.
 * 가장 큰 눈금의 글자 폭을 어림해 그만큼 확보합니다 (숫자·쉼표는 대략 0.62em).
 */
function leftPadFor(maxValue, fontSize) {
  const label = Math.round(maxValue).toLocaleString();
  return Math.max(PAD.l, Math.ceil(label.length * fontSize * 0.62) + 12);
}

/** 기본 계열 — 실적 집계(투입 · 양품 · 불량). 다른 계열을 그릴 때는 `metrics` 로 넘깁니다 */
const DEFAULT_METRICS = [
  { key: 'qty', label: '투입량' }, { key: 'okQty', label: '양품 수량' }, { key: 'ngQty', label: '불량 수량' },
];

export default function GroupedBarChart({ data = [], height = 250, unit = ' EA', metrics: metricsProp, fontSize = 15 }) {
  const theme = useTheme();
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const metrics = metricsProp?.length ? metricsProp : DEFAULT_METRICS;
  const rows = data.map((row) => ({ ...row, values: metrics.map((m) => ({ ...m, value: num(row[m.key]) })) }));
  const empty = !rows.length || rows.every((row) => row.values.every((v) => v.value === null));
  const maxValue = Math.max(1, ...rows.flatMap(row => row.values.map(v => v.value || 0)));
  const padL = leftPadFor(maxValue, fontSize);
  const valueLabel = value => value >= 10000 ? (value / 10000).toFixed(1) + '만' : Number(value.toFixed(2)).toLocaleString();
  const barSlot = axisLabelWidth(rows.flatMap(row => row.values.map(v => valueLabel(v.value || 0))), fontSize, 60);
  const groupSlot = Math.max(axisLabelWidth(rows.map(row => row.label), fontSize, 116), metrics.length * barSlot / 0.7);
  const contentWidth = Math.max(width || 300, rows.length * groupSlot + padL + PAD.r);

  useEffect(() => {
    if (!width || empty) return;
    const ih = Math.max(10, height - PAD.t - PAD.b);
    const c = tokens(theme);
    const maxValue = Math.max(1, ...rows.flatMap((row) => row.values.map((v) => v.value || 0)));

    const iw = Math.max(10, contentWidth - padL - PAD.r);
    const x0 = scaleBand().domain(rows.map((_, i) => i)).range([padL, padL + iw]).padding(0.24);
    const x1 = scaleBand().domain(metrics.map((m) => m.key)).range([0, x0.bandwidth()]).padding(0.14);
    const y = scaleLinear().domain([0, maxValue]).nice().range([PAD.t + ih, PAD.t]);
    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    y.ticks(5).forEach((tick) => {
      g.append('line').attr('x1', padL).attr('x2', padL + iw).attr('y1', y(tick)).attr('y2', y(tick)).attr('stroke', c.grid).attr('stroke-dasharray', '3 3');
      g.append('text').attr('x', padL - 6).attr('y', y(tick) + 3).attr('text-anchor', 'end').attr('font-size', fontSize).attr('fill', c.axis).text(Number(tick.toFixed(2)).toLocaleString());
    });

    rows.forEach((row, i) => {
      const gx = x0(i);
      row.values.forEach((value, mi) => {
        if (value.value === null) return;
        const barX = gx + x1(value.key);
        const barY = y(value.value);
        g.append('rect').attr('x', barX).attr('y', barY).attr('width', x1.bandwidth()).attr('height', y(0) - barY).attr('rx', 3).attr('fill', c.series(mi));
        // 0 은 막대가 없으니 숫자도 달지 않습니다. 계열이 여럿이면 '0' 만 줄지어
        // 실제 값 라벨을 덮습니다 (설비별 불량 유형처럼 빈 칸이 많은 자료).
        if (!value.value) return;
        // 막대가 짧아도 축·그래프 밖으로 나가지 않도록 상단 여백 안에서만 수치를 보입니다.
        g.append('text').attr('x', barX + x1.bandwidth() / 2).attr('y', Math.max(PAD.t + 10, barY - 4))
          .attr('text-anchor', 'middle').attr('font-size', fontSize).attr('font-weight', '600').attr('fill', c.text)
          .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff').attr('stroke-width', 2.5).attr('paint-order', 'stroke')
          .text(valueLabel(value.value));
      });
      g.append('text').attr('class', 'x-axis-label').attr('x', gx + x0.bandwidth() / 2).attr('y', height - 8).attr('text-anchor', 'middle').attr('font-size', fontSize).attr('fill', c.axis).text(String(row.label));
      g.append('rect').attr('x', gx).attr('y', PAD.t).attr('width', x0.bandwidth()).attr('height', ih).attr('fill', 'transparent')
        .on('mouseenter', () => setHover({
          // Tooltip 의 중앙 기준점과 위쪽 여백을 고정 범위로 제한해 첫·마지막 그룹에서도 차트 밖으로 나가지 않습니다.
          at: { x: Math.max(90, Math.min(contentWidth - 90, gx + x0.bandwidth() / 2)), y: Math.min(height - 10, 108) },
          title: String(row.label),
          rows: row.values.filter((v) => v.value !== null).map((v) => ({ name: v.label, value: `${v.value.toLocaleString()}${unit}`, color: c.series(metrics.findIndex((m) => m.key === v.key)) })),
        }))
        .on('mouseleave', () => setHover(null));
    });
  }, [rows, width, height, theme, empty, contentWidth, unit, fontSize]);

  if (empty) return <ChartEmpty height={height} />;
  return <View>
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      <div style={{ width: '100%', overflowX: contentWidth > (width || 300) ? 'auto' : 'hidden', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}>
        <svg ref={svgRef} width={contentWidth} height={height} role="img" aria-label="그룹별 막대 그래프" style={{ display: 'block' }} />
      </div>
      <Tooltip {...(hover || {})} />
    </div>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
      {metrics.map((metric, i) => <View key={metric.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: theme.seriesAt(i) }} /><Text style={{ fontSize, color: theme.color.mutedForeground }}>{metric.label}</Text></View>)}
    </View>
  </View>;
}
