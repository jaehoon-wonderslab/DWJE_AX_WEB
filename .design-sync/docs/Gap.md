---
category: cards-layout
---
# Gap

세로 간격만 주는 빈 블록. 카드·그리드 블록·섹션 사이에 두며 기본 14px(Grid 의 gap 과 같은 값)입니다. 카드 안 요소 사이에는 쓰지 않고(카드 본문 여백으로 처리), 페이지 레벨 블록 사이에만 씁니다. 8(촘촘) · 14(기본) · 24(섹션) 정도만 쓰고 그 이상은 드뭅니다.

- `size?: number` (기본 14)

```jsx
<Grid cols={4}>…</Grid>
<Gap />
<Card title="공정별 수율">…</Card>
<Gap size={24} />
```
