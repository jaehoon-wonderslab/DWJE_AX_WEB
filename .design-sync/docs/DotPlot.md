---
category: charts
---
# DotPlot

값이 좁은 구간(예: 수율 95~100%)에 몰려 막대로는 차이가 안 보일 때 쓰는 가로 도트 플롯(d3 scaleLinear). **축이 0 에서 시작하지 않는 것이 의도** 입니다 — 길이가 아니라 위치로 값을 읽습니다. 행마다 왼쪽 라벨(12px 캡션) · 2px 회색 트랙 · 반지름 6 점(흰 2px 테두리) · 오른쪽 값(12px 600) 이 놓이고, `target` 이 있으면 앰버 세로 눈금과 맨 오른쪽에 편차 `±x.x%p`(미달 앰버 · 달성 초록) 열이 추가됩니다. 아래에 `min · 중간 · max` 축 라벨 3개. 높이는 행 수 × 28 + 16 으로 자동 계산되며 폭은 컨테이너를 재서 채웁니다(권장 480px 이상).

점 색은 `cls` 로 정합니다 — 생략하면 잉크, `'warn'` 앰버, `'bad'` 빨강. 값이 `null` 인 행은 걸러지고 남는 행이 없으면 "데이터 없음". 호버 시 값 툴팁.

- `data: { l: string; v: number | null; cls?: 'warn' | 'bad' | string }[]` — 행 목록. `l` 라벨, `v` 값, `cls` 상태색. 기본 `[]`
- `min?: number` — 축 하한. 기본 0
- `max?: number` — 축 상한. 기본 100
- `target?: number` — 목표선 위치. 주면 편차 열이 생김
- `unit?: string` — 값·축 라벨 뒤 단위. 기본 `''`
- `digits?: number` — 소수 자리. 기본 1
- `labelWidth?: number` — 왼쪽 라벨 열 폭(px). 기본 80. 긴 설비명은 110~120

```jsx
<DotPlot
  data={[{ l: 'PRESS', v: 98.1 }, { l: 'Plating', v: 96.4, cls: 'warn' }, { l: 'Coating', v: 97.4 }, { l: '조립', v: 95.3, cls: 'bad' }]}
  min={95} max={100} target={97} unit="%"
/>
```
