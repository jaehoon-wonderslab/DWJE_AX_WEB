---
category: charts
---
# GroupedBarChart

그룹별 **투입량 · 양품 수량 · 불량 수량** 3막대 비교(d3). 지표 3종은 컴포넌트에 고정되어 있어(`qty`·`okQty`·`ngQty`, 범례도 자동) 공정·모델·LOT 단위 실적 요약 카드에 그대로 씁니다. 다른 지표를 비교하려면 `BarChart` 의 `v/v2` 를 쓰세요. 막대 위에 값을 상시 표기(1만 이상 "1.2만")하고, null 지표는 그 막대만 생략합니다. 색은 시리즈 순서(잉크 → #1E2A78 → #3F3AA8). 모두 비어 있으면 `ChartEmpty`.

그룹 1개당 116px 을 확보하므로 4그룹이면 폭 560px 이상, 모자라면 가로 스크롤. 기본 높이 250.

- `data: { label: string; qty?: number|null; okQty?: number|null; ngQty?: number|null }[]`
- `height?: number` (250)
- `unit?: string` (' EA') — 툴팁 값 접미사(앞 공백 포함).

```jsx
<div style={{ width: 600 }}>
  <GroupedBarChart
    data={[
      { label: 'PRESS', qty: 8400, okQty: 8180, ngQty: 220 },
      { label: 'Plating', qty: 8180, okQty: 7990, ngQty: 190 },
      { label: 'AOI', qty: 7870, okQty: 7820, ngQty: 50 },
    ]}
    height={240}
  />
</div>
```
