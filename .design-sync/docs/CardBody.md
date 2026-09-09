---
category: cards-layout
---
# CardBody

`Card` 본문을 여러 구역으로 나눌 때 쓰는 컨테이너. 기본은 18px 여백이고 `tight` 이면 여백 0 이라 `KeyValue`·표처럼 자체 여백이 있는 내용을 카드 안에 꽉 채울 수 있습니다. Card 에 children 을 직접 넣으면 자동으로 하나의 본문이 되므로, 구역이 둘 이상이거나 여백을 구역별로 다르게 줄 때만 씁니다. 항상 `Card` 안에서만 쓰고 단독으로 두지 않습니다.

- `children: ReactNode` — 구역 내용
- `tight?: boolean` (기본 false) — 여백 0
- `style?: ViewStyle` — 추가 스타일(예: `paddingHorizontal`)

```jsx
<Card title="PR-03 점검 메모" sub="09:12 · 생산1팀">
  <CardBody>금형 교체 후 첫 로트에서 치수 편차 +0.03mm.</CardBody>
  <CardBody tight><KeyValue rows={[['공정', 'PRESS'], ['모델', 'Krios_s']]} /></CardBody>
</Card>
```
