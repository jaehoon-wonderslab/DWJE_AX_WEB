---
category: charts
---
# BarChart

범주별 세로 막대(d3). 공정·설비·요일별 불량 건수/생산량/불량률 비교에 씁니다. 항목마다 `v`(주 계열, 잉크) 와 선택적 `v2`(보조 계열, #1E2A78) 를 받아 **나란히**(기본) 또는 **적층**(`stacked`) 으로 그리고, 막대 위에 값을 상시 표기합니다(1만 이상은 "1.2만", `unit="%"` 면 소수 2자리 %). y 상한은 `.nice()` 로 읽기 좋은 눈금에 맞추고, `target` 을 주면 앰버 점선 목표선을 그리며 목표를 넘은 막대의 수치는 빨간색이 됩니다. 값이 모두 null/비어 있으면 `ChartEmpty`.

폭은 부모를 측정합니다. 막대 폭은 최대 32px, 항목당 최소 40px(라벨이 6자 초과거나 `%` 면 68px) 을 확보하고 모자라면 가로 스크롤. 라벨이 좁으면 솎아 내고 그래도 좁으면 45° 로 눕힙니다. `v2` 나란히 모드는 두 수치 라벨이 17px 간격으로 붙으므로 3자리 이하 값에 적합합니다.

- `data: { l: string; v: number|null; v2?: number|null }[]` — `l` 라벨, `v` 주 값, `v2` 보조 값.
- `height?: number` (170)
- `stacked?: boolean` (false) — `v2` 를 `v` 위에 쌓음.
- `unit?: string` ('') — `'%'` 면 축·라벨을 % 포맷으로, 그 외는 목표 라벨·툴팁 접미사.
- `target?: number|null` (null) — 목표선.
- `min?: number` · `max?: number` — y 범위 고정(기본 0 ~ nice(최대×1.2 또는 최대)).

```jsx
<div style={{ width: 520 }}>
  <BarChart
    data={[{ l: 'PR-01', v: 1.6 }, { l: 'PR-02', v: 2.4 }, { l: 'PR-03', v: 3.1 }, { l: 'PL-01', v: 1.8 }]}
    unit="%"
    target={2.0}
    height={190}
  />
</div>
```
