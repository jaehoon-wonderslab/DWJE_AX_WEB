---
category: charts
---
# LineChart

시간 축 추이 선 그래프(d3). 일별 수율·불량률·시간대별 가동률처럼 **같은 x 라벨을 공유하는 1~3개 계열**을 그립니다. 첫 계열은 선 아래를 10% 투명도로 채우고, 모든 점 위에 값을 상시 표기합니다(10 미만은 소수 1자리, 10 이상은 정수 반올림 — 96.8% 같은 수율은 정수로 보이니 `min/max` 로 범위를 좁히거나 불량률처럼 10 미만 지표에 쓰세요). `null` 값은 0 으로 떨어지지 않고 그 구간의 선을 끊습니다. 계열색은 테마 시리즈 순서(잉크 #0B1440 → #1E2A78 → #3F3AA8 → 앰버) 로 고정 배정되고, 목표선은 앰버 점선입니다. 값이 하나도 없으면 `ChartEmpty`("데이터 없음") 를 대신 그립니다.

폭은 **부모 컨테이너를 측정**하므로 항상 폭이 정해진 요소(카드 본문·`<div style={{width}}>`) 안에 둡니다. 라벨 1개당 최소 44px 을 확보하며 모자라면 가로 스크롤이 생깁니다(12포인트면 600px 정도). 카드 안에서는 보통 `height` 140~190.

- `labels: (string|number)[]` — x 축 라벨. 좁으면 하나 걸러 표시.
- `series: { name: string; data: (number|null)[]; dashed?: boolean }[]` — `data` 길이는 `labels` 와 같게. `dashed` 는 계획·기준선처럼 점선으로.
- `height?: number` (170) — 픽셀. 폭은 컨테이너에서.
- `min?: number` · `max?: number` — y 범위 고정(기본은 데이터·목표의 최소~최대).
- `target?: number` — 앰버 점선 목표선 + "목표 {target}{unit}" 라벨.
- `unit?: string` ('') — 목표 라벨·툴팁 접미사(`'%'`).
- `showLegend?: boolean` (true) — 계열이 2개 이상일 때만 하단 범례(색 선 + 이름).

```jsx
<div style={{ width: 600 }}>
  <LineChart
    labels={['09-01', '09-02', '09-03', '09-04', '09-05']}
    series={[
      { name: 'PRESS 불량률', data: [2.2, 2.6, 1.7, 1.4, 1.9] },
      { name: 'Plating 불량률', data: [1.9, 2.0, 1.8, null, 1.5], dashed: true },
    ]}
    target={2.0}
    unit="%"
    height={190}
  />
</div>
```
