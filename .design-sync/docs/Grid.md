---
category: cards-layout
---
# Grid · Gap

반응형 그리드(CSS `.grid.g2/.g3/.g4/.g23` 대응). RN 에는 CSS Grid 가 없어 Flexbox 로 열을 나누고, 창 너비로 열 수를 줄입니다: 1100px 미만이면 `cols>=4 → 2열`, 그 외 1열; 860px 미만은 항상 1열. 비율 배열(`[2, 1]`)은 1100px 미만에서 세로 스택. 마지막 줄이 덜 차면 빈 칸을 넣어 앞 줄과 폭을 맞춥니다. 칸 사이 간격은 가로·세로 모두 14px(`gap`). KPI 줄은 `cols={4}` 에 `StatCard`, 차트+사이드는 `cols={[2, 1]}`, 카드 2장은 `cols={2}`.

**Grid**
- `cols?: number | number[]` (기본 3) — 열 수 또는 flex 비율 배열
- `gap?: number` (기본 14)
- `children: ReactNode` — 칸(falsy 는 걸러짐)
- `style?: ViewStyle`

**Gap** — 세로 간격 전용 빈 View. 카드·그리드 블록 사이에 둡니다.
- `size?: number` (기본 14, Grid 의 gap 과 같은 값)

```jsx
<Grid cols={4}>
  <StatCard label="금일 생산량" value="128,400" unit="EA" />
  <StatCard label="종합 수율" value="97.4" unit="%" />
  <StatCard label="PRESS 불량률" value="1.8" unit="%" tone="down" />
  <StatCard label="가동 설비" value="42" unit="/ 48" />
</Grid>
<Gap />
<Grid cols={[2, 1]}><Card title="불량률 추이" /><Card title="이상 알림" /></Grid>
```
