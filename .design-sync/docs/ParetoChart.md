---
category: charts
---
# ParetoChart

불량 유형 파레토(QC 7 tools, d3). 항목을 **수량 내림차순으로 자동 정렬**해 세로 막대로, 누적 점유율을 오른쪽 축(0~100%) 의 꺾은선으로 겹쳐 그립니다. 상위 3개 막대와 라벨을 강조색으로, 나머지는 회색으로 두고, 80% 지점에 빨간 점선 "80% 집중관리선" 을 그립니다. 막대 위 수량, 점 위 누적 %, x 라벨 아래 개별 점유율을 상시 표기하며 5자 넘는 라벨은 "…" 로 줄입니다. 값 0 이하 항목은 제외되고 남는 항목이 없으면 `ChartEmpty`.

이 차트는 다른 차트와 달리 강조색(#0284c7)·누적선(#ea580c) 을 자체 지정합니다 — 페이지에 시리즈 팔레트 차트와 나란히 둘 때 유의. 항목 1개당 58px 을 확보(좌우 여백 100px 포함, 8항목이면 약 560px) 하고 모자라면 가로 스크롤.

- `data: { label?: string; value?: number|null; l?: string; v?: number|null }[]` — `label`/`value` 우선, 없으면 `l`/`v` 를 읽습니다. 정렬은 컴포넌트가 합니다.
- `height?: number` (210)
- `unit?: string` ('EA') — 좌측 축 머리 "(EA)" 와 툴팁 접미사.

```jsx
<div style={{ width: 600 }}>
  <ParetoChart
    data={[
      { label: '치수 불량', value: 412 },
      { label: '도금 두께', value: 286 },
      { label: '스크래치', value: 174 },
      { label: '이물', value: 98 },
      { label: '기타', value: 18 },
    ]}
    height={230}
  />
</div>
```
