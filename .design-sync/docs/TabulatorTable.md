---
category: tables
---
# TabulatorTable

실적 집계 화면(PD-01) 전용 Tabulator 표. 열 구조가 고정돼 있습니다 — 일자 · 제품명 · 공장·공정·설비 · 투입 · 양품 · 불량 · 불량률 · 가동률 · 비가동 시간. 행은 `_children` 으로 3단 트리(일자 → 제품 → 공장·공정·설비)를 이루며 처음엔 접혀 있고 왼쪽 + 로 펼칩니다. 머리글은 검색칸(문자·`>=` 숫자)을 달고, 머리글 클릭으로 다중 정렬(순번 배지)이 쌓입니다. 아래에 로컬 페이지네이션(25건·표시 건수 선택)이 붙습니다. 다른 표가 필요하면 열을 받아 그리는 `TabulatorGrid` 를 쓰세요.

디자인 규칙: 16px 라운드 테두리, 머리글 #FAFAFA, 본문 13px, 숫자는 오른쪽 정렬 tabular-nums, 불량 수량은 destructive 색, 자식 행은 ↳ 와 캡슐(칩)로 단계를 표시. 열 최소 폭 합이 약 1,080px 이므로 넓은 본문 패널에 놓습니다(좁으면 표 안에서 가로 스크롤).

props
- `rows: Array<{ date: string; inputQty; okQty; ngQty; defectRate; uptimeRate; downtimeMin; _children?: Array<{ productNm; …; isChild?: true; _children?: Array<{ plantNm?; processNm; equipNm; …; isGrandChild?: true }> }> }>` — 일자 행 배열(`depth` 1/2/3 또는 `isChild`/`isGrandChild` 로 단계 표시).
- `emptyText?: string = '해당 기간의 실적이 없습니다.'`
- `style?` — 바깥 View 스타일.

```jsx
<TabulatorTable rows={dailyRows} emptyText="해당 기간의 실적이 없습니다." />
```
