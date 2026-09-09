---
category: cards-layout
---
# Card · CardBody · SourceNote

흰 패널 카드(16px 반지름 · #DFE1E7 헤어라인). `title`/`sub` 가 있으면 머리말 줄을 그리고 `right` 에 동작 버튼을 둡니다. children 은 기본 여백이 있는 본문에 들어가며, `tight` 이면 여백 없이(표·그리드를 꽉 채울 때) 넣습니다. 본문을 여러 구역으로 나눌 때는 `CardBody` 를 여러 개 두고, 근거·주석 문구는 `SourceNote`(점선 구분선 + 작은 회색 글씨, 내용이 없으면 그리지 않음)로 붙입니다.

카드 안 2차 표면은 `StatCard` 처럼 #FAFAFA 중첩 카드를 쓰고, 카드를 카드 안에 다시 넣지 않습니다.

```jsx
<Card title="공정별 수율" sub="오늘 · 목표 97.0%" right={<Button label="상세" size="sm" />}>
  <KeyValue rows={[['PRESS', '98.1%'], ['Plating', '96.9%']]} />
  <SourceNote>근거: MES 실적 집계 08:55</SourceNote>
</Card>
```
