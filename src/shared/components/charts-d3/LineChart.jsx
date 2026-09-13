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
import { useChartSize } from './useChartSize';

import { axisLabelWidth } from './axisLabelWidth';

const PAD = { l: 38, r: 12, t: 14, b: 24 };

/** 포인트 수치 라벨이 서로 닿지 않는 최소 간격(px) — 이보다 좁으면 건너뛰며 씁니다 */
const VALUE_LABEL_MIN_PX = 42;

export default function LineChart({
  labels = [], series = [], height = 170, min, max, target, unit = '', showLegend = true,
  /**
   * 점 하나가 차지하는 최소 폭(px). 축 글자가 더 길면 글자에 맞춰 늘립니다.
   * 전체 너비가 카드보다 넓으면 가로로 스크롤됩니다.
   */
  minPointWidth = 44,
}) {
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

  const minPointW = axisLabelWidth(labels, FONT.axis, minPointWidth);
  const contentWidth = Math.max(width || 300, labels.length * minPointW + PAD.l + PAD.r);

  useEffect(() => {
    if (!width || !all.length) return;
    const iw = Math.max(10, contentWidth - PAD.l - PAD.r);
    const ih = Math.max(10, height - PAD.t - PAD.b);
    const c = tokens(theme);

    const lo = min !== undefined ? min : Math.min(...all, num(target) ?? Infinity);
    const hi = max !== undefined ? max : Math.max(...all, num(target) ?? -Infinity);

    const x = scalePoint().domain(labels.map((_, i) => i)).range([PAD.l, PAD.l + iw]).padding(0.5);
    const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([PAD.t + ih, PAD.t]);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // 눈금선 · y 라벨 — 사람이 읽기 좋은 값은 d3 가 고릅니다
    const ticks = y.ticks(5);
    /**
     * 소수 자리 — 눈금 간격이 1 미만이면(수율 96.8~98.3 · Cp 1.0~1.7 처럼 좁은 범위) 정수로 반올림하면
     * 눈금이 전부 「98 98 97」 로 겹쳐 보입니다. 간격에 맞춰 1~2자리를 남깁니다.
     */
    const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
    const axisDec = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    const fmtAxis = (t) => (axisDec ? t.toFixed(axisDec) : Math.abs(t) < 10 ? t.toFixed(1) : Math.round(t).toLocaleString());
    const span = Math.abs(hi - lo);
    const pointDec = span < 1 ? 2 : span < 10 ? 1 : 0;
    const fmtPoint = (v) => (pointDec ? v.toFixed(pointDec) : v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString());
    const g = svg.append('g');
    ticks.forEach((t) => {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', c.grid).attr('stroke-dasharray', '3 3').attr('stroke-width', 1);
      g.append('text')
        .attr('x', PAD.l - 6).attr('y', y(t) + 3).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(fmtAxis(t));
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

      /**
       * 포인트 상단 수치 라벨 — 점 간격이 좁으면 솎아 냅니다.
       * 시간 단위 추이처럼 점이 수십 개면 모든 점에 값을 쓰면 글자가 서로 겹쳐 오히려 못 읽습니다.
       * x 축 라벨과 같은 방식으로 stride 를 잡고, 마지막 점은 언제나 씁니다(현재값이라 가장 중요합니다).
       */
      const stepPx = x.step();
      const valueStride = Math.max(1, Math.ceil(VALUE_LABEL_MIN_PX / Math.max(stepPx, 1)));
      const lastIdx = se.points.filter(defined).reduce((m, d) => Math.max(m, d.i), -1);
      se.points.filter(defined).filter((d) => d.i % valueStride === 0 || d.i === lastIdx).forEach((d) => {
        g.append('text')
          .attr('x', x(d.i)).attr('y', y(d.v) - 6).attr('text-anchor', 'middle')
          .attr('font-size', 13.5).attr('font-weight', '600').attr('fill', col)
          .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff').attr('stroke-width', 2.5).attr('paint-order', 'stroke')
          .text(typeof d.v === 'number' ? fmtPoint(d.v) : d.v);
      });
    });

    // 글자 길이만큼 간격을 확보하여 모든 시점을 표시합니다. 양끝에도 반 칸의 여백을 둡니다.
    labels.forEach((l, i) => {
      g.append('text')
        .attr('class', 'x-axis-label').attr('x', x(i)).attr('y', height - 7).attr('text-anchor', 'middle')
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
      <div ref={ref} style={{ width: '100%', minWidth: 0, position: 'relative' }}>
        <div style={{ width: '100%', overflowX: contentWidth > (width || 300) ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}>
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
