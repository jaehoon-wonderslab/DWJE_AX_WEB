---
category: report
---
# ReportDoc · ReportTitle · SignalLegend

보고서 화면(아침회의 자료 · 주간 품질 보고 · 월간 OEE)의 인쇄·PDF 출력 대상 문서 틀. `ReportDoc` 은 흰 패널(#FFFFFF · #DFE1E7 헤어라인 · 16px 반지름 · 20px 여백)이고, 상단 액션의 '인쇄 · PDF' 버튼이 `nodeId` 로 이 영역을 찾아 새 창에 복사해 인쇄합니다. 문서 안 첫 줄은 `ReportTitle`, 그 아래 표·차트가 오며 마지막에 10.5px 회색 출처 문구를 둡니다. 문서 안에는 카드를 중첩하지 않고 표·헤어라인만 씁니다.

**ReportDoc**
- `nodeId?: string` — 인쇄 영역 id(nativeID). 화면당 하나
- `children: ReactNode`
- `style?: ViewStyle`

**ReportTitle** — 제목줄. 왼쪽 날짜 캡슐(#FAFAFA · 999 반지름 · Inter 15px 600 숫자) · 제목 18px 600 잉크 · 오른쪽 슬롯(범례·배지). 아래 18px 여백, 좁으면 줄바꿈.
- `dateBox?: string` — "09.09 (화)" · "2026-09"
- `title: string`
- `right?: ReactNode` — 보통 `SignalLegend`
- `style?: ViewStyle`

**SignalLegend** — 달성률 신호등 범례(고정 3항목): 95% 이상(success) · 95% 미만(warning) · 85% 미만(destructive). 8px 사각 점(2px 반지름) + 11px 라벨, 기본 오른쪽 정렬.
- `style?: ViewStyle` — `{ justifyContent: 'flex-start' }` 로 왼쪽 정렬

```jsx
<ReportDoc nodeId="report-morning">
  <ReportTitle dateBox="09.09 (화)" title="아침회의 자료 — 전일 생산 실적" right={<SignalLegend />} />
  <XlsTable … />
</ReportDoc>
```
