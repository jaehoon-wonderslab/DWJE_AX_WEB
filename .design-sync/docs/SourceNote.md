---
category: cards-layout
---
# SourceNote

카드 본문 끝의 근거·주석 문구. 위쪽 헤어라인(#DFE1E7) 과 10px 간격을 두고 10.5px 캡션 회색(500) 글씨로 "근거: MES 실적 집계(08:55)" 처럼 출처를 나열합니다. children 이 비어 있으면(null·undefined·'' 또는 빈 배열) 구분선까지 그리지 않으니, 서버 응답에 주석이 있을 때만 붙는 자리로 그대로 넘겨도 됩니다. 항상 `Card`/`CardBody` 안의 마지막 요소로 둡니다.

- `children?: ReactNode` — 문구. 비면 렌더하지 않음
- `style?: ViewStyle`

```jsx
<Card title="공정별 수율" sub="오늘 · 목표 97.0%">
  <KeyValue rows={[['PRESS', '98.1%'], ['Plating', '96.9%']]} />
  <SourceNote>근거: MES 실적 집계(08:55) · AOI 판정 로그</SourceNote>
</Card>
```
