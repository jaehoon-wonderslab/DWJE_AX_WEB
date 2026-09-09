---
category: report
---
# SignalLegend

달성률 신호등 범례. 항목은 고정 3개 — 95% 이상(success 초록) · 95% 미만(warning 앰버) · 85% 미만(destructive 빨강) — 8px 사각 점(2px 반지름) 과 11px 캡션 회색 라벨을 12px 간격으로 늘어놓고 기본 오른쪽 정렬입니다. `ReportTitle` 의 `right` 슬롯이나 달성률 표 아래에 둡니다. 색·문구는 props 로 바꾸지 않습니다(표의 신호 점과 같은 토큰).

- `style?: ViewStyle` — 정렬 변경용(`{ justifyContent: 'flex-start' }`)

```jsx
<ReportTitle dateBox="09.09 (화)" title="아침회의 자료" right={<SignalLegend />} />
```
