---
category: data-display
---
# Tabs

같은 화면 안에서 표시 내용을 바꾸는 분절 탭. 회색 트랙(surfaceHover · 3px 안쪽 여백 · 알약) 위에 항목이 늘어서고, 선택된 항목만 흰 알약 + 옅은 그림자 + 잉크색 600 글자로 떠 보입니다(나머지는 12px · 500 · 본문 회색). 트랙은 내용 폭만큼만(`alignSelf: flex-start`) 차지하고 아래 14px 여백이 내장돼 있으므로 카드 머리말 아래·표 위에 그대로 둡니다. 항목은 2~5개가 적당하며 페이지 이동에는 쓰지 않습니다(그건 사이드바·PageHead).

- `items?: (string | { value: string | number; label: string })[]` — 문자열이면 value=label
- `value?: string | number` — 선택된 항목의 value
- `onChange?: (value) => void`
- `style?: ViewStyle`

```jsx
<Tabs items={['전체', '미확인', '확인']} value={tab} onChange={setTab} />
```
