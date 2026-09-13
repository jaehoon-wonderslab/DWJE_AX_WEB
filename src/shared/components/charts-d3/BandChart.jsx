/**
 * 추정 밴드 차트 — d3 (CM-06)
 *
 * 「실측 구간 + 추정 구간(신뢰 밴드)」 한 장짜리 그림입니다. AOI 불량률 추이처럼
 * **어디까지가 사실이고 어디부터가 추정인지**가 핵심인 자료에 씁니다.
 *
 * ■ 왜 LineChart 로는 안 되는가
 * 밴드를 상한선·하한선 **두 개의 선**으로 그리면 밴드로 보이지 않습니다.
 * 실제로 그렇게 그려 봤더니 하한선이 0 에 붙어 축처럼 보이고, 계열이 4개로 늘어
 * 범례와 값 라벨만 빽빽해졌습니다. 신뢰 구간은 **면**으로 칠해야 한눈에 읽힙니다.
 *
 * ■ 값 라벨은 **꼭지점에만** 답니다
 * 시간 단위 30~60점에 전부 달면 라벨이 서로 겹쳐 숫자를 못 읽습니다.
 * 그렇다고 하나도 없으면 그림에서 수치를 읽을 수 없습니다. 그래서 눈이 가는 곳
 * — 최고점 · 최저점 · 마지막 실측 · 마지막 추정 — 네 곳에만 답니다.
 * 나머지 점은 가리키면 툴팁으로 보입니다.
 *
 * ■ 경계를 눈에 보이게
 * 「▼ 09-11 23:00 기준」 처럼 글로만 적어 두면 그림과 따로 놉니다.
 * 세로 경계선과 추정 구간 바탕 틴트로 **그림 안에서** 갈립니다.
 *
 * @param {object} props
 * @param {string[]} props.labels    x축 라벨 (전체. 솎는 것은 이 컴포넌트가 합니다)
 * @param {number[]} props.actual    실측값 — 추정 구간은 null
 * @param {number[]} props.estimated 추정 중앙값 — 실측 구간은 null
 * @param {number[]} props.bandHigh  95% 상한
 * @param {number[]} props.bandLow   95% 하한
 * @param {number} props.splitIndex  추정이 시작되는 인덱스
 * @param {number} [props.threshold] 임계값 — 주면 가로 점선으로
 * @param {string} [props.unit]      값 단위
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

const PAD = { l: 60, r: 20, t: 26, b: 48 };

/** x축 라벨은 이 간격보다 촘촘해지지 않게 솎습니다 */
const X_LABEL_MIN_PX = 78;

export default function BandChart({
  labels = [], actual = [], estimated = [], bandHigh = [], bandLow = [],
  splitIndex, threshold, unit = '%', height = 260,
  /** 축 제목 — 무엇을 세로로 재고 무엇을 가로로 늘어놓았는지 */
  yTitle = '불량률 (%)', xTitle = '시각',
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { ref, width } = useChartSize(height);
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const n = labels.length;
  const split = Number.isFinite(Number(splitIndex)) ? Number(splitIndex) : n;
  const empty = !n;

  useEffect(() => {
    if (!width || empty) return;
    const c = tokens(theme);
    const iw = Math.max(10, width - PAD.l - PAD.r);
    const ih = Math.max(10, height - PAD.t - PAD.b);

    const vals = [...actual, ...estimated, ...bandHigh, ...bandLow, threshold]
      .map(num).filter((v) => v !== null);
    const hi = Math.max(0.1, ...vals) * 1.15;

    const x = scalePoint().domain(labels.map((_, i) => i)).range([PAD.l, PAD.l + iw]);
    const y = scaleLinear().domain([0, hi]).nice().range([PAD.t + ih, PAD.t]);

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    // 1. 추정 구간 바탕 — 여기부터는 사실이 아니라는 표시
    if (split < n) {
      g.append('rect')
        .attr('x', x(split) - (x(1) - x(0)) / 2).attr('y', PAD.t)
        .attr('width', PAD.l + iw - x(split) + (x(1) - x(0)) / 2).attr('height', ih)
        .attr('fill', theme.alpha('foreground', 0.035));
    }

    // 2. 가로 눈금
    y.ticks(5).forEach((t) => {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y(t)).attr('y2', y(t))
        .attr('stroke', c.grid).attr('stroke-dasharray', '3 3');
      g.append('text')
        .attr('x', PAD.l - 8).attr('y', y(t) + 4).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(Number(t.toFixed(2)).toLocaleString());
    });

    // 3. 95% 밴드 — 상한과 하한 사이를 채웁니다. 선 두 개로는 밴드로 안 보입니다
    const defined = (i) => num(bandHigh[i]) !== null && num(bandLow[i]) !== null;
    // 추세선의 신뢰 구간이라 하한이 음수로 내려올 때가 있습니다. 불량률은 음수가 될 수 없으니
    // **그릴 때만** 0 에서 끊습니다 — 값을 고치는 것이 아니라 축 밖으로 삐져나가지 않게 하는 것입니다.
    const lowAt = (i) => Math.max(0, num(bandLow[i]));
    const bandArea = d3area()
      .defined((_, i) => defined(i))
      .x((_, i) => x(i))
      .y0((_, i) => y(lowAt(i)))
      .y1((_, i) => y(num(bandHigh[i])));
    g.append('path').datum(labels)
      .attr('d', bandArea)
      // 밴드가 진하면 실측선이 그 안에 묻힙니다. 바탕으로만 깔리게 옅게 둡니다
      .attr('fill', theme.alpha('info', 0.1))
      .attr('stroke', 'none');

    // 4. 선 — 실측은 실선, 추정 중앙값은 점선
    const lineOf = (arr) => d3line()
      .defined((_, i) => num(arr[i]) !== null)
      .x((_, i) => x(i))
      .y((_, i) => y(num(arr[i])));

    g.append('path').datum(labels)
      .attr('d', lineOf(actual))
      .attr('fill', 'none').attr('stroke', c.series(0)).attr('stroke-width', 2.2)
      .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');

    g.append('path').datum(labels)
      .attr('d', lineOf(estimated))
      .attr('fill', 'none').attr('stroke', c.series(1)).attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 4').attr('stroke-linecap', 'round');

    // 5. 임계선
    if (num(threshold) !== null) {
      g.append('line')
        .attr('x1', PAD.l).attr('x2', PAD.l + iw).attr('y1', y(num(threshold))).attr('y2', y(num(threshold)))
        .attr('stroke', theme.color.destructive).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 4');
      g.append('text')
        .attr('x', PAD.l + iw).attr('y', y(num(threshold)) - 6).attr('text-anchor', 'end')
        .attr('font-size', FONT.axis).attr('font-weight', '600').attr('fill', theme.color.destructive)
        .text(`임계 ${threshold}${unit}`);
    }

    // 6. 실측↔추정 경계
    if (split > 0 && split < n) {
      const bx = x(split) - (x(1) - x(0)) / 2;
      g.append('line')
        .attr('x1', bx).attr('x2', bx).attr('y1', PAD.t).attr('y2', PAD.t + ih)
        .attr('stroke', c.axis).attr('stroke-width', 1).attr('stroke-dasharray', '2 3');
      g.append('text')
        .attr('x', bx + 6).attr('y', PAD.t + 12).attr('text-anchor', 'start')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text('추정');
    }

    // 7. x축 라벨 — 촘촘하면 겹칩니다. 최소 간격을 지키며 솎습니다.
    //    마지막 라벨은 끝을 알려 주니 되도록 그리되, 직전 라벨과 붙으면(+7h+8h 처럼 겹침) 버립니다
    const step = Math.max(1, Math.ceil(X_LABEL_MIN_PX / Math.max(1, iw / Math.max(1, n - 1))));
    let lastDrawnX = -Infinity;
    labels.forEach((label, i) => {
      const isLast = i === n - 1;
      if (i % step !== 0 && !isLast) return;
      if (x(i) - lastDrawnX < X_LABEL_MIN_PX * 0.7) return;
      lastDrawnX = x(i);
      g.append('text')
        .attr('x', x(i)).attr('y', PAD.t + ih + 18).attr('text-anchor', isLast ? 'end' : 'middle')
        .attr('font-size', FONT.axis).attr('fill', c.axis)
        .text(String(label ?? ''));
    });

    // 8. 축 제목 — 단위를 글로 밝혀 둡니다
    g.append('text')
      .attr('transform', `translate(14,${PAD.t + ih / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('font-size', FONT.axis).attr('fill', c.axis)
      .text(yTitle);
    g.append('text')
      .attr('x', PAD.l + iw / 2).attr('y', height - 6)
      .attr('text-anchor', 'middle').attr('font-size', FONT.axis).attr('fill', c.axis)
      .text(xTitle);

    // 9. 꼭지점 값 — 최고 · 최저 · 마지막 실측 · 마지막 추정 네 곳만
    const marks = [];
    const actualIdx = labels.map((_, i) => i).filter((i) => num(actual[i]) !== null);
    if (actualIdx.length) {
      const hiIdx = actualIdx.reduce((a, b) => (num(actual[b]) > num(actual[a]) ? b : a));
      const loIdx = actualIdx.reduce((a, b) => (num(actual[b]) < num(actual[a]) ? b : a));
      const lastIdx = actualIdx[actualIdx.length - 1];
      marks.push({ i: hiIdx, v: num(actual[hiIdx]), color: c.series(0) });
      if (loIdx !== hiIdx) marks.push({ i: loIdx, v: num(actual[loIdx]), color: c.series(0) });
      if (lastIdx !== hiIdx && lastIdx !== loIdx) marks.push({ i: lastIdx, v: num(actual[lastIdx]), color: c.series(0) });
    }
    const estIdx = labels.map((_, i) => i).filter((i) => num(estimated[i]) !== null);
    if (estIdx.length) {
      const last = estIdx[estIdx.length - 1];
      marks.push({ i: last, v: num(estimated[last]), color: c.series(1) });
    }
    marks.forEach(({ i, v, color }) => {
      g.append('circle')
        .attr('cx', x(i)).attr('cy', y(v)).attr('r', 3.2)
        .attr('fill', theme.color.card).attr('stroke', color).attr('stroke-width', 2);
      g.append('text')
        .attr('x', x(i)).attr('y', y(v) - 10).attr('text-anchor', 'middle')
        .attr('font-size', FONT.value).attr('font-weight', '600').attr('fill', c.text)
        // 선 위에 겹쳐도 읽히도록 글자 뒤에 흰 테두리를 깝니다
        .attr('stroke', theme.isDark ? '#0f172a' : '#ffffff').attr('stroke-width', 3).attr('paint-order', 'stroke')
        .text(`${Number(v).toFixed(1)}${unit}`);
    });

    // 10. 가리키는 곳의 값 — 나머지 점은 툴팁으로 봅니다
    const half = (x(1) - x(0)) / 2 || 6;
    labels.forEach((label, i) => {
      g.append('rect')
        .attr('x', x(i) - half).attr('y', PAD.t).attr('width', half * 2).attr('height', ih)
        .attr('fill', 'transparent')
        .on('mouseenter', () => {
          const rows = [];
          const push = (name, v, color) => {
            if (num(v) === null) return;
            rows.push({ name, value: `${Number(v).toFixed(1)}${unit}`, color });
          };
          push('실측', actual[i], c.series(0));
          push('추정 중앙값', estimated[i], c.series(1));
          if (num(bandLow[i]) !== null && num(bandHigh[i]) !== null) {
            rows.push({
              name: '95% 구간',
              value: `${Number(bandLow[i]).toFixed(1)} ~ ${Number(bandHigh[i]).toFixed(1)}${unit}`,
              color: theme.alpha('info', 0.5),
            });
          }
          if (rows.length) setHover({ at: { x: Math.max(90, Math.min(width - 90, x(i))), y: 40 }, title: String(label), rows });
        })
        .on('mouseleave', () => setHover(null));
    });
  }, [labels, actual, estimated, bandHigh, bandLow, split, threshold, unit, width, height, theme, empty, n, yTitle, xTitle]);

  if (empty) return <ChartEmpty text="추이를 그릴 실적이 없습니다." />;

  return (
    <View ref={ref} style={{ width: '100%' }}>
      <View style={{ position: 'relative' }}>
        <svg ref={svgRef} width={width || 300} height={height} role="img" aria-label="불량률 추이와 추정 밴드" style={{ display: 'block' }} />
        {hover ? <Tooltip {...hover} /> : null}
      </View>
      {/* 범례 — 밴드는 면이라 네모로 보입니다 */}
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
        <LegendItem color={theme.seriesAt(0)} label="실측 불량률" />
        <LegendItem color={theme.seriesAt(1)} label="추정 중앙값" dashed />
        <LegendItem color={theme.alpha('info', 0.22)} label="95% 신뢰 구간" box />
      </View>
      <Text style={[s.textXs, { marginTop: 4 }]}>
        세로 점선 왼쪽은 실측, 오른쪽은 추정입니다. 표시된 것은 최고·최저·마지막 값이며, 나머지는 그래프를 가리키면 보입니다.
      </Text>
    </View>
  );
}

function LegendItem({ color, label, dashed, box }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={box
          ? { width: 14, height: 10, borderRadius: 2, backgroundColor: color }
          : { width: 14, height: 0, borderTopWidth: 2, borderTopColor: color, borderStyle: dashed ? 'dashed' : 'solid' }}
      />
      <Text style={{ fontSize: 15, color: theme.color.mutedForeground }}>{label}</Text>
    </View>
  );
}
