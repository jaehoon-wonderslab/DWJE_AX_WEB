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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

/**
 * 계열이 이 수를 넘으면 범례를 **체크 목록**으로 바꿉니다.
 * 불량 유형처럼 계열이 수십 개인 추이는 전부 겹쳐 그리면 한 줄도 못 읽습니다.
 * 계열색(LIGHT_SERIES)도 6개뿐이라 그 위로는 같은 색이 되어 구분이 안 됩니다 —
 * 그래서 **켜져 있는 순서대로** 색을 배정합니다(체크를 바꾸면 색도 다시 배정됩니다).
 */
const SERIES_TOGGLE_MIN = 5;

export default function LineChart({
  labels = [], series = [], height = 170, min, max, target, unit = '', showLegend = true,
  /**
   * true 면 계열이 SERIES_TOGGLE_MIN 개를 넘을 때 범례가 체크 목록이 되어
   * 보고 싶은 계열만 골라 그릴 수 있습니다. 기본은 처음 SERIES_TOGGLE_MIN 개만 켭니다.
   */
  selectableSeries = false,
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

  const canToggle = selectableSeries && series.length > SERIES_TOGGLE_MIN;

  /** 계열 구성이 바뀌면(조회 기간 변경 등) 선택을 처음 상태로 되돌립니다 */
  const seriesKey = useMemo(
    () => series.map((se, i) => se.name || `계열 ${i + 1}`).join('\u0001'),
    [series],
  );
  const [hidden, setHidden] = useState(() => new Set());
  useEffect(() => {
    setHidden(canToggle
      ? new Set(series.map((_, i) => i).filter((i) => i >= SERIES_TOGGLE_MIN))
      : new Set());
    // seriesKey 로만 반응합니다 — series 배열은 렌더마다 새로 만들어져 매번 초기화됩니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, canToggle]);

  /**
   * `si` 는 켜져 있는 것들 사이의 순번입니다 — 색은 이 순번으로 뽑습니다.
   * 원래 인덱스(`oi`)로 뽑으면 7번째부터 전부 같은 색이 되어 골라 봐도 구분이 안 됩니다.
   */
  const lines = series
    .map((se, oi) => ({ ...se, oi }))
    .filter((se) => !hidden.has(se.oi))
    .map((se, si) => ({
      ...se,
      si,
      points: (se.data || []).map((v, i) => ({ i, v: num(v) })),
    }));
  /** 원래 인덱스 → 배정된 색. 범례 표식이 차트와 같은 색을 쓰도록 합니다 */
  const colorOf = new Map(lines.map((se) => [se.oi, theme.seriesAt(se.si)]));
  const all = lines.flatMap((se) => se.points.map((p) => p.v)).filter((v) => v !== null);

  const minPointW = axisLabelWidth(labels, FONT.axis, minPointWidth);
  const contentWidth = Math.max(width || 300, labels.length * minPointW + PAD.l + PAD.r);

  useEffect(() => {
    if (!width || !all.length) {
      // 전부 체크 해제하면 남아 있던 선을 지웁니다
      if (svgRef.current) select(svgRef.current).selectAll('*').remove();
      return;
    }
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

    lines.forEach((se) => {
      const col = c.series(se.si);
      if (!se.points.some(defined)) return;
      if (se.si === 0) {
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
          .map((se) => ({ name: se.name || `계열 ${se.oi + 1}`, v: se.points[near]?.v, color: c.series(se.si) }))
          .filter((r) => r.v !== null && r.v !== undefined)
          .map((r) => ({ name: r.name, value: `${r.v}${unit}`, color: r.color }));
        if (!rows.length) { setHover(null); return; }
        setHover({ at: { x: x(near), y: PAD.t }, title: String(labels[near] ?? ''), rows });
      })
      .on('mouseleave', () => setHover(null));
  }, [labels, series, hidden, width, height, theme, min, max, target, unit, contentWidth]);

  // 체크 목록이 아닐 때만 통째로 비웁니다 — 목록이 있으면 다시 켤 수단을 남겨야 합니다
  if (!all.length && !canToggle) return <ChartEmpty height={height} />;

  const toggle = (i) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return (
    <View>
      <div ref={ref} style={{ width: '100%', minWidth: 0, position: 'relative' }}>
        {all.length ? (
          <div style={{ width: '100%', overflowX: contentWidth > (width || 300) ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}>
            <svg ref={svgRef} width={contentWidth} height={height} role="img" aria-label="추이 그래프" style={{ cursor: 'default', display: 'block' }} />
          </div>
        ) : (
          <ChartEmpty height={height} text="아래에서 볼 항목을 체크해 주세요." />
        )}
        <Tooltip {...(hover || {})} />
      </div>

      {canToggle ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text style={s.legendText}>{`표시 중 ${series.length - hidden.size} / ${series.length}개`}</Text>
            <Pressable onPress={() => setHidden(new Set())}>
              <Text style={[s.legendText, { color: theme.color.primary }]}>전체 선택</Text>
            </Pressable>
            <Pressable onPress={() => setHidden(new Set(series.map((_, i) => i)))}>
              <Text style={[s.legendText, { color: theme.color.primary }]}>전체 해제</Text>
            </Pressable>
          </View>
          <View style={[s.legend, { gap: 8 }]}>
            {series.map((se, i) => {
              const on = !hidden.has(i);
              const col = colorOf.get(i) || theme.color.mutedForeground;
              return (
                <Pressable
                  key={se.name || i}
                  onPress={() => toggle(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: on ? col : theme.divider,
                    backgroundColor: on ? theme.surface : 'transparent',
                  }}
                >
                  <View style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    borderWidth: on ? 0 : 1.5,
                    borderColor: theme.divider,
                    backgroundColor: on ? col : 'transparent',
                  }}
                  />
                  <Text style={[s.legendText, { color: on ? theme.color.foreground : theme.color.mutedForeground }]}>
                    {se.name || `계열 ${i + 1}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : showLegend && series.length > 1 ? (
        <View style={[s.legend, { marginTop: 6 }]}>
          {series.map((se, i) => (
            <View key={se.name || i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.legendLine, { backgroundColor: colorOf.get(i) || theme.seriesAt(i) }]} />
              <Text style={s.legendText}>{se.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
