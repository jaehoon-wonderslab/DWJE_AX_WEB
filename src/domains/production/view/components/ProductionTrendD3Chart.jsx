/**
 * [Component] D3.js 기반 생산 실적 추이 이중 축 차트
 *
 * - D3.js (d3-scale, d3-shape, d3-array, d3-format)를 활용한 정밀한 스케일링 및 지오메트리 계산
 * - 좌측 축: 생산량/투입량 막대 (d3.scaleLinear + compact 포맷)
 * - 우측 축: 불량률(%) 선 그래프 (d3.scaleLinear + d3.curveMonotoneX)
 * - 마우스 호버 인터랙션: 컬럼 하이라이트 및 실시간 플로팅 툴팁(Tooltip)
 */
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as d3 from 'd3';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

export default function ProductionTrendD3Chart({
  labels = [],
  qty = [],
  ngQty = [],
  defectRate = [],
  unit = '일별',
  height = 240,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const hasNgQty = Array.isArray(ngQty) && ngQty.some((v) => v !== null && v !== undefined && v > 0);
  const hasRate = Array.isArray(defectRate) && defectRate.some((v) => v !== null && v !== undefined);

  // 차트 너비 및 여백 (항목이 많으면 가로 스크롤로 여유롭게 확장)
  const margin = { top: 24, right: 54, bottom: 34, left: 58 };
  const minItemWidth = 52;
  const calculatedWidth = margin.left + margin.right + labels.length * minItemWidth;
  const width = Math.max(800, calculatedWidth);
  const isScrollable = calculatedWidth > 800;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // D3 스케일 계산
  const { xScale, yScaleLeft, yScaleRight, yLeftTicks, yRightTicks, linePath, areaPath } = useMemo(() => {
    if (!labels.length) {
      return { xScale: null, yScaleLeft: null, yScaleRight: null, yLeftTicks: [], yRightTicks: [], linePath: '', areaPath: '' };
    }

    // 1. X축 (Band Scale)
    const x = d3.scaleBand()
      .domain(labels.map((_, i) => i))
      .range([margin.left, width - margin.right])
      .padding(0.38);

    // 2. Y1축 (생산량/투입량 Scale)
    const maxQtyVal = d3.max(qty, (d) => Number(d) || 0) || 100;
    const yLeft = d3.scaleLinear()
      .domain([0, maxQtyVal * 1.15])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // 3. Y2축 (불량률 Scale, 우측)
    const maxRateVal = d3.max(defectRate, (d) => Number(d) || 0) || 5;
    const yRight = d3.scaleLinear()
      .domain([0, Math.max(maxRateVal * 1.25, 4)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // 눈금 생성
    const leftTicks = yLeft.ticks(5);
    const rightTicks = yRight.ticks(5);

    // 불량률 곡선 생성 (d3.curveMonotoneX)
    const validRatePoints = defectRate
      .map((val, i) => ({ i, val: val === null || val === undefined ? null : Number(val) }))
      .filter((p) => p.val !== null);

    const lineGen = d3.line()
      .defined((d) => d.val !== null)
      .x((d) => (x(d.i) || 0) + x.bandwidth() / 2)
      .y((d) => yRight(d.val))
      .curve(d3.curveMonotoneX);

    const areaGen = d3.area()
      .defined((d) => d.val !== null)
      .x((d) => (x(d.i) || 0) + x.bandwidth() / 2)
      .y0(height - margin.bottom)
      .y1((d) => yRight(d.val))
      .curve(d3.curveMonotoneX);

    return {
      xScale: x,
      yScaleLeft: yLeft,
      yScaleRight: yRight,
      yLeftTicks: leftTicks,
      yRightTicks: rightTicks,
      linePath: lineGen(validRatePoints) || '',
      areaPath: areaGen(validRatePoints) || '',
    };
  }, [labels, qty, defectRate, width, height, margin.left, margin.right, margin.top, margin.bottom]);

  if (!labels.length || !xScale) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#cccccc', textAlign: 'center' }}>
          해당 기간의 추이 데이터가 없습니다.
        </Text>
      </View>
    );
  }

  // 좌측 수치 축약 포맷터
  const fmtLeft = (v) => {
    if (v >= 10_000_000) return `${Math.round(v / 1_000_000)}M`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000) return `${Math.round(v / 1_000)}k`;
    return Math.round(v).toLocaleString();
  };

  const primaryCol = theme.seriesAt(0) || '#0066cc';
  const secondaryCol = theme.seriesAt(1) || '#e65100';
  const rateCol = '#ea580c'; // 파란 막대와 확실하게 대비되는 선명한 오렌지
  const accentCol = '#10b981';

  const hoveredData = hoveredIdx !== null ? {
    label: labels[hoveredIdx],
    qty: qty[hoveredIdx],
    ngQty: ngQty?.[hoveredIdx],
    rate: defectRate?.[hoveredIdx],
  } : null;

  return (
    <View style={{ width: '100%', position: 'relative' }}>
      {/* 툴팁 정보 카드 (호버 시 상단에 표시) */}
      <View style={{ minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 4 }}>
        {hoveredData ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.textXs, { fontWeight: '700', color: theme.color.foreground }]}>{hoveredData.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: primaryCol }} />
              <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>생산량:</Text>
              <Text style={[s.textXs, { fontWeight: '700', color: theme.color.foreground }]}>
                {hoveredData.qty !== null && hoveredData.qty !== undefined ? `${comma(hoveredData.qty)} EA` : '—'}
              </Text>
            </View>
            {hasNgQty && hoveredData.ngQty !== null && hoveredData.ngQty !== undefined ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: secondaryCol }} />
                <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>불량 수량:</Text>
                <Text style={[s.textXs, { fontWeight: '700', color: theme.color.foreground }]}>{comma(hoveredData.ngQty)} EA</Text>
              </View>
            ) : null}
            {hasRate && hoveredData.rate !== null && hoveredData.rate !== undefined ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 2, backgroundColor: rateCol }} />
                <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>불량률:</Text>
                <Text style={[s.textXs, { fontWeight: '700', color: rateCol }]}>{fixed(hoveredData.rate)} %</Text>
              </View>
            ) : null}
          </View>
        ) : isScrollable ? (
          <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
            출력 일자가 많습니다. 차트를 좌우로 스크롤하여 전체 {labels.length}개 일자의 추이를 확인할 수 있습니다.
          </Text>
        ) : (
          <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>차트의 막대에 마우스를 올리면 상세 수치가 표시됩니다.</Text>
        )}
      </View>

      {/* D3.js 기반 가로 스크롤 SVG 렌더링 컨테이너 */}
      <View
        style={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <svg
          id="production-trend-d3-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', minWidth: width }}
        >
        <defs>
          {/* 불량률 영역 그라디언트 */}
          <linearGradient id="d3AreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rateCol} stopOpacity="0.18" />
            <stop offset="100%" stopColor={rateCol} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* 1. 수평 그리드선 & 좌측 축 라벨 */}
        {yLeftTicks.map((val) => {
          const yPos = yScaleLeft(val);
          return (
            <g key={`yL-${val}`}>
              <line
                x1={margin.left}
                y1={yPos}
                x2={width - margin.right}
                y2={yPos}
                stroke={theme.color.border}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={margin.left - 8}
                y={yPos + 3}
                textAnchor="end"
                fontSize={9.5}
                fill={theme.color.mutedForeground}
                fontFamily="sans-serif"
              >
                {fmtLeft(val)}
              </text>
            </g>
          );
        })}

        {/* 2. 우측 Y2 축 라벨 (불량률 %) */}
        {hasRate && yRightTicks.map((val) => {
          const yPos = yScaleRight(val);
          return (
            <text
              key={`yR-${val}`}
              x={width - margin.right + 8}
              y={yPos + 3}
              textAnchor="start"
              fontSize={9.5}
              fill={rateCol}
              fontWeight="600"
              fontFamily="sans-serif"
            >
              {`${fixed(val)}%`}
            </text>
          );
        })}

        {/* 3. 막대 그래프 (생산량 & 불량 수량) */}
        {labels.map((lbl, i) => {
          const xPos = xScale(i);
          const bw = xScale.bandwidth();
          const qVal = qty[i] || 0;
          const barY = yScaleLeft(qVal);
          const barHeight = Math.max(height - margin.bottom - barY, 0);
          const isHovered = hoveredIdx === i;

          return (
            <g key={`bar-${lbl}-${i}`}>
              {/* 호버 배경 밴드 */}
              {isHovered ? (
                <rect
                  x={xPos - 3}
                  y={margin.top}
                  width={bw + 6}
                  height={innerHeight}
                  fill={theme.alpha ? theme.alpha('primary', 0.08) : 'rgba(0,102,204,0.08)'}
                  rx={4}
                />
              ) : null}

              {/* 생산량 막대 */}
              <rect
                x={xPos}
                y={barY}
                width={bw}
                height={barHeight}
                rx={3}
                fill={isHovered ? theme.alpha('primary', 0.88) : primaryCol}
                style={{ transition: 'all 0.15s ease' }}
              />

              {/* 불량 수량 보조 막대 (있는 경우) */}
              {hasNgQty && ngQty[i] ? (
                <rect
                  x={xPos + bw * 0.55}
                  y={yScaleLeft(ngQty[i])}
                  width={bw * 0.4}
                  height={Math.max(height - margin.bottom - yScaleLeft(ngQty[i]), 0)}
                  rx={2}
                  fill={secondaryCol}
                />
              ) : null}

              {/* 막대 상단 상시 수치 라벨 — 마우스 오버하지 않아도 상시 출력 (흰색 윤곽선으로 어디서든 선명) */}
              {(() => {
                const showVal = labels.length <= 16 || (labels.length <= 32 && i % 2 === 0) || isHovered;
                if (!showVal || qVal <= 0) return null;
                const txt = fmtLeft(qVal);
                return (
                  <text
                    x={xPos + bw / 2}
                    y={Math.max(barY - 6, margin.top + 10)}
                    textAnchor="middle"
                    fontSize={bw > 30 ? 9.5 : 8}
                    fontWeight={isHovered ? '700' : '600'}
                    fill={isHovered ? primaryCol : theme.color.foreground}
                    stroke="#ffffff"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fontFamily="sans-serif"
                    style={{ pointerEvents: 'none', paintOrder: 'stroke fill' }}
                  >
                    {txt}
                  </text>
                );
              })()}

              {/* X축 라벨 — 라벨이 많으면 적절한 간격으로 분음하여 겹침 방지 */}
              {(() => {
                const labelStep = labels.length > 35 ? Math.ceil(labels.length / 10) : (labels.length > 18 ? 2 : 1);
                const isLast = i === labels.length - 1;
                const prevStepIndex = Math.floor((labels.length - 1) / labelStep) * labelStep;
                const tooCloseToPrev = isLast && (i - prevStepIndex < labelStep * 0.6);
                const shouldShow = (i % labelStep === 0 && (!isLast || !tooCloseToPrev)) || (isLast && !tooCloseToPrev) || isHovered;
                if (!shouldShow) return null;
                const txt = String(lbl).length > 10 ? String(lbl).slice(5) : String(lbl);
                return (
                  <text
                    x={xPos + bw / 2}
                    y={height - margin.bottom + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill={isHovered ? theme.color.foreground : theme.color.mutedForeground}
                    fontWeight={isHovered ? '700' : '400'}
                    fontFamily="sans-serif"
                  >
                    {txt}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* 4. 불량률 선 & 영역 그래프 (우측 Y축, 막대와 대비되는 오렌지 톤 + 흰색 윤곽선 Halo) */}
        {hasRate && (
          <g style={{ pointerEvents: 'none' }}>
            {areaPath ? <path d={areaPath} fill="url(#d3AreaGrad)" style={{ pointerEvents: 'none' }} /> : null}
            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke={rateCol}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: 'none' }}
              />
            ) : null}

            {/* 데이터 포인트 마커 및 상시 불량률 수치 (막대와 겹쳐도 100% 선명) */}
            {defectRate.map((rate, i) => {
              if (rate === null || rate === undefined) return null;
              const cx = (xScale(i) || 0) + xScale.bandwidth() / 2;
              const cy = yScaleRight(Number(rate));
              const isHovered = hoveredIdx === i;
              const showRateVal = labels.length <= 16 || (labels.length <= 32 && i % 2 === 0) || isHovered;

              // 막대 상단 수치와 y좌표가 가까우면 살짝 올려서 겹침 방지
              const qVal = qty[i] || 0;
              const barY = yScaleLeft(qVal);
              const textY = Math.abs(cy - barY) < 14 ? cy - 10 : cy - 8;

              return (
                <g key={`pt-${i}`}>
                  {/* 포인트 서클 — 흰색 배경 + 오렌지 보더 */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 3.8}
                    fill="#ffffff"
                    stroke={rateCol}
                    strokeWidth={isHovered ? 2.8 : 2}
                    style={{ transition: 'all 0.15s ease', pointerEvents: 'none' }}
                  />
                  {showRateVal && (
                    <text
                      x={cx}
                      y={textY}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="800"
                      fill={rateCol}
                      stroke="#ffffff"
                      strokeWidth={3.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fontFamily="sans-serif"
                      style={{ pointerEvents: 'none', paintOrder: 'stroke fill' }}
                    >
                      {`${fixed(rate)}%`}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 5. 마우스 인터랙션 투명 감지 영역 (최상단 레이어로 마우스 가로챔 방지) */}
        {labels.map((lbl, i) => {
          const xPos = xScale(i);
          const bw = xScale.bandwidth();
          return (
            <rect
              key={`overlay-${i}`}
              x={xPos - 4}
              y={margin.top}
              width={bw + 8}
              height={innerHeight + 24}
              fill="transparent"
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx((cur) => (cur === i ? null : cur))}
            />
          );
        })}
      </svg>
      </View>

      {/* 범례 */}
      <View style={[s.legend, { marginTop: 8, justifyContent: 'center' }]}>
        <View style={s.rowGap6}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: primaryCol }} />
          <Text style={s.legendText}>생산량 (좌측 축)</Text>
        </View>
        {hasNgQty ? (
          <View style={s.rowGap6}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: secondaryCol }} />
            <Text style={s.legendText}>불량 수량</Text>
          </View>
        ) : null}
        {hasRate ? (
          <View style={s.rowGap6}>
            <View style={{ width: 12, height: 2.5, backgroundColor: rateCol }} />
            <Text style={s.legendText}>불량률 % (우측 축)</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
