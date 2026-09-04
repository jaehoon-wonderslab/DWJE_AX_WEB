/**
 * 파레토 차트 — D3 (QC 7 Tools / 불량 유형 분석)
 *
 * 불량 수량(막대)과 누적 점유율(꺾은선)을 동시에 표기하여
 * 80%의 문제를 유발하는 핵심 20% 원인을 직관적으로 식별합니다.
 * 항목이 많을 경우 가로 스크롤로 매끄럽게 조회할 수 있습니다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { line as d3line } from 'd3-shape';
import { useTheme } from '@shared/theme/useTheme';
import { ChartEmpty, num } from '../charts/chartData';
import { FONT, tokens } from './d3Theme';
import Tooltip from './Tooltip';
import { useChartSize } from './useChartSize';

const PAD = { l: 54, r: 46, t: 26, b: 34 };
const MIN_COL_WIDTH = 58;

export default function ParetoChart({ data = [], height = 210, unit = 'EA' }) {
  const theme = useTheme();
  const { ref, width: containerWidth } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  // 데이터 가공 및 수량 내림차순 정렬
  const rawItems = data
    .map((d) => ({ l: String(d.label || d.l || ''), v: num(d.value ?? d.v) || 0 }))
    .filter((d) => d.v > 0)
    .sort((a, b) => b.v - a.v);

  const total = rawItems.reduce((acc, cur) => acc + cur.v, 0);

  let cum = 0;
  const items = rawItems.map((it, idx) => {
    cum += it.v;
    const share = total > 0 ? (it.v / total) * 100 : 0;
    const cumShare = total > 0 ? Math.min(100, (cum / total) * 100) : 0;
    return {
      ...it,
      rank: idx + 1,
      share: Number(share.toFixed(1)),
      cumShare: Number(cumShare.toFixed(1)),
    };
  });

  const empty = !items.length || total === 0;

  // 가로 스크롤을 위한 콘텐츠 너비 계산
  const contentWidth = Math.max(containerWidth || 500, items.length * MIN_COL_WIDTH + PAD.l + PAD.r);

  useEffect(() => {
    if (!contentWidth || empty) return;

    const iw = contentWidth - PAD.l - PAD.r;
    const ih = height - PAD.t - PAD.b;
    const c = tokens(theme);

    const maxVal = Math.max(...items.map((d) => d.v)) * 1.15 || 1;

    const x = scaleBand().domain(items.map((_, i) => i)).range([PAD.l, PAD.l + iw]).padding(0.32);
    const yLeft = scaleLinear().domain([0, maxVal]).nice().range([PAD.t + ih, PAD.t]);
    const yRight = scaleLinear().domain([0, 100]).range([PAD.t + ih, PAD.t]);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    // 1. 그리드 라인 & 좌측 Y축 (수량)
    yLeft.ticks(4).forEach((t) => {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', yLeft(t)).attr('y2', yLeft(t))
        .attr('stroke', c.grid).attr('stroke-dasharray', '3 3').attr('stroke-width', 1);
      g.append('text')
        .attr('x', PAD.l - 6).attr('y', yLeft(t) + 3).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(Math.round(t).toLocaleString());
    });

    // 좌측 Y축 라벨
    g.append('text')
      .attr('x', PAD.l - 6).attr('y', PAD.t - 10).attr('text-anchor', 'end')
      .attr('font-size', 10).attr('fill', c.axis)
      .text(`(${unit})`);

    // 2. 우측 Y축 (누적 %)
    [0, 50, 80, 100].forEach((p) => {
      g.append('text')
        .attr('x', PAD.l + iw + 6).attr('y', yRight(p) + 3).attr('text-anchor', 'start')
        .attr('font-size', FONT.axis)
        .attr('fill', p === 80 ? '#ef4444' : c.axis)
        .attr('font-weight', p === 80 ? 'bold' : 'normal')
        .text(`${p}%`);
    });

    // 3. 80% 파레토 관리 한계선 (빨간색 점선)
    const y80 = yRight(80);
    g.append('line')
      .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y80).attr('y2', y80)
      .attr('stroke', '#ef4444').attr('stroke-dasharray', '4 3').attr('stroke-width', 1.4);
    g.append('text')
      .attr('x', PAD.l + iw - 4).attr('y', y80 - 4).attr('text-anchor', 'end')
      .attr('font-size', 9.5).attr('fill', '#ef4444').attr('font-weight', '600')
      .text('80% 집중관리선');

    // 4. 세로 막대 (불량 수량)
    const base = PAD.t + ih;
    const bw = x.bandwidth();

    items.forEach((d, i) => {
      const cx = x(i) + bw / 2;
      const barH = base - yLeft(d.v);
      const isTop3 = d.rank <= 3;
      const barColor = isTop3 ? (theme.isDark ? '#38bdf8' : '#0284c7') : (theme.isDark ? '#64748b' : '#94a3b8');

      // 막대
      g.append('rect')
        .attr('x', cx - bw / 2).attr('y', yLeft(d.v)).attr('width', bw).attr('height', Math.max(barH, 0))
        .attr('rx', 3).attr('fill', barColor).attr('opacity', isTop3 ? 0.95 : 0.75);

      // 막대 상단 수량 값 라벨 (항상 표시 + halo 효과)
      g.append('text')
        .attr('x', cx).attr('y', yLeft(d.v) - 5).attr('text-anchor', 'middle')
        .attr('font-size', 10.5).attr('font-weight', '600').attr('fill', c.text)
        .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff').attr('stroke-width', 2.5).attr('paint-order', 'stroke')
        .text(d.v.toLocaleString());

      // 하단 x축 라벨 (순위 + 이름)
      const labelText = d.l.length > 5 ? `${d.l.slice(0, 4)}…` : d.l;
      g.append('text')
        .attr('x', cx).attr('y', base + 14).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', isTop3 ? 'bold' : 'normal')
        .attr('fill', isTop3 ? (theme.isDark ? '#38bdf8' : '#0284c7') : c.axis)
        .text(labelText);

      g.append('text')
        .attr('x', cx).attr('y', base + 26).attr('text-anchor', 'middle')
        .attr('font-size', 9.5).attr('fill', c.axis)
        .text(`${d.share}%`);
    });

    // 5. 누적 곡선 (Line & Dots)
    const lineGenerator = d3line()
      .x((_, i) => x(i) + bw / 2)
      .y((d) => yRight(d.cumShare));

    // 곡선 패스
    g.append('path')
      .attr('d', lineGenerator(items))
      .attr('fill', 'none').attr('stroke', '#ea580c').attr('stroke-width', 2.2);

    // 각 점 + 점 상단 누적 % 라벨
    items.forEach((d, i) => {
      const cx = x(i) + bw / 2;
      const cy = yRight(d.cumShare);

      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', 3.8)
        .attr('fill', '#ffffff').attr('stroke', '#ea580c').attr('stroke-width', 2);

      // 누적 % 수치 라벨 (halo 효과)
      g.append('text')
        .attr('x', cx).attr('y', cy - 7).attr('text-anchor', 'middle')
        .attr('font-size', 9.5).attr('font-weight', 'bold').attr('fill', '#ea580c')
        .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff').attr('stroke-width', 2.5).attr('paint-order', 'stroke')
        .text(`${d.cumShare}%`);
    });

    // 6. 호버 툴팁 오버레이
    items.forEach((d, i) => {
      g.append('rect')
        .attr('x', x(i)).attr('y', PAD.t).attr('width', bw).attr('height', ih)
        .attr('fill', 'transparent')
        .on('mouseenter', () => {
          setHover({
            at: { x: x(i) + bw / 2, y: PAD.t + 10 },
            title: `${d.rank}위. ${d.l}`,
            rows: [
              { name: '불량 수량', value: `${d.v.toLocaleString()} ${unit}`, color: theme.isDark ? '#38bdf8' : '#0284c7' },
              { name: '점유율', value: `${d.share}%`, color: c.text },
              { name: '누적 점유율', value: `${d.cumShare}%`, color: '#ea580c' },
            ],
          });
        })
        .on('mouseleave', () => setHover(null));
    });
  }, [items, contentWidth, height, theme, unit, empty]);

  if (empty) return <ChartEmpty height={height} />;

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      {/* 가로 스크롤 컨테이너 */}
      <div
        style={{
          width: '100%',
          overflowX: contentWidth > (containerWidth || 500) ? 'auto' : 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <svg
          ref={svgRef}
          width={contentWidth}
          height={height}
          role="img"
          aria-label="불량 유형 파레토 차트"
          style={{ cursor: 'default', display: 'block' }}
        />
      </div>
      <Tooltip {...(hover || {})} />
    </div>
  );
}
