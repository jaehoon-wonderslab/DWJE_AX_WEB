---
category: report
---
# ReportTitle

`ReportDoc` 첫 줄의 제목줄. 왼쪽 날짜 캡슐(#FAFAFA · 999 반지름 · Inter 15px 600) · 가운데 제목(18px 600 잉크, 최소 180px 후 flex) · 오른쪽 슬롯(`SignalLegend` 나 문서 상태 배지). 아래 18px 여백, 폭이 좁으면 줄바꿈합니다. 날짜가 없으면 `dateBox` 를 생략해 제목만 둡니다.

- `dateBox?: string` — "09.09 (화)" · "2026-09"
- `title: string`
- `right?: ReactNode`
- `style?: ViewStyle`

```jsx
<ReportTitle dateBox="09.09 (화)" title="아침회의 자료 — 전일 생산 실적" right={<SignalLegend />} />
```
