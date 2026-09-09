---
category: feedback-overlays
---
# EmptyState

조회 결과가 없을 때 표·목록 자리에 넣는 빈 상태. 28px 연회색 원 안의 minus 아이콘 + 12.5px 캡션 회색 문구, 세로 여백 40, 가운데 정렬. 문구는 "무엇이 없는지" 를 조건과 함께(기간·설비·상태) 적어 필터를 되짚을 수 있게 합니다. 카드 본문·모달 본문 안에 그대로 둡니다.

- `text?: string` (기본 `'조회된 데이터가 없습니다.'`)
- `style?: any`

```jsx
<Card title="재검 대기 LOT" sub="Plating · 오늘">
  <EmptyState text="재검 대기 중인 LOT 가 없습니다." />
</Card>
```
