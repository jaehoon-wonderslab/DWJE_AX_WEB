---
category: data-display
---
# ListRow

알림·이력 목록의 한 줄. 왼쪽 상태 점(`Dot`, `tone` 을 넘긴 경우만) · 제목(12px 600) + 설명(12px 500 회색) · 오른쪽 슬롯 · 시각(10.5px 캡션)을 가로로 놓고 아래 헤어라인으로 줄을 나눕니다(12/16 여백). 마지막 줄은 `last` 로 밑줄을 없애 카드 하단과 겹치지 않게 하고, `onPress` 가 있으면 줄 전체가 터치 영역(`TouchableOpacity`)이 됩니다. 카드(`Card tight`)나 흰 패널 안에 3~6줄 쌓아 쓰며, 설명은 "공정 · 설비 · 수치" 순으로 짧게 씁니다.

- `tone?: '' | 'amber' | 'red' | 'gray'` — 상태 점 톤. `undefined` 면 점을 그리지 않음
- `title: string`
- `desc?: string`
- `time?: string` — 오른쪽 끝 시각·날짜
- `right?: React.ReactNode` — 시각 앞 배지·건수
- `onPress?: () => void`
- `last?: boolean` — 밑줄 제거
- `style?: ViewStyle`

```jsx
<ListRow tone="red" title="PR-03 하중 편차 상한 초과" desc="PRESS · 3회 연속" time="08:12" onPress={open} />
```
