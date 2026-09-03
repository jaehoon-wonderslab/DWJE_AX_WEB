# 21. `/report/lrr-by-customer` — 고객사별 LRR

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/lrr-by-customer` |
| 화면 ID | `rpt-lrr-customer` |
| 라우트 파일 | `app/(main)/report/lrr-by-customer.jsx` |
| MVC | `domains/report/view/LrrByCustomerView.jsx` · `controller/useLrrByCustomerController.js` |
| 기능 ID | RP-05 |
| 접근 권한 | 품질보증팀 · 경영진 · 통합관리자 |
| 인쇄 노드 | `rpt-lrr-customer-doc` |

**LRR(%) = LRR Q'ty ÷ Ship Q'ty × 100.** 출하 실적이 없는 구간은 산출 불가로 `-` 표기(원본 엑셀의 `#DIV/0!` 처리 규칙).

## 1. 컴포넌트

`PageHead`(인쇄·CSV·엑셀) · `Filters`(기준 연도 / 고객사 / 집계 단위) · `ReportDoc` → `ReportTitle` · `StatCard`×4 · `PivotCard`(불량 유형별) · `PivotCard`(고객사별) · `Card`+`Table`(고객사 누계) · 각주 · `EmptyState`

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 기준 연도 | `{올해}년` | `yearOptions()` |
| 고객사 | `전체` | **조회 결과 `byCustomer[].customer` 에서 생성** |
| 집계 단위 | `월별` | 월별 / 분기별 / 연간 |

### 2-2. 요약 카드

`{baseYear}년 누적 출하수량`(`shipQty`, **qty**, 보조 `고객사 N개사`) · `LRR 건수`(`lrrCnt`, **qty**) · `LRR(%)`(`lrrRate`, **yield**, 0 초과면 tone down) · `전년 대비 개선폭`(`yoyImprovement`, %p, **yield**)

### 2-3. 피벗 표 2종 (`XlsTable`)

`pivot(list, field)` 로 **라벨 × 기간** 피벗을 만듭니다. 기간 열은 서버 응답의 `period` 값에서 생성 — 집계 단위(월·분기·연)에 따라 자동으로 바뀝니다.

| 카드 | 소스 | 값 필드 | 라벨 열 |
| :--- | :--- | :--- | :--- |
| 불량 유형별 발생 건수 | `byDefectType` | `cnt` | 불량 유형 |
| 고객사별 LRR 수량 | `byCustomerMonth` | `qty` | 고객사 |

열 : `라벨`(160) · `합계`(96, bold) · 기간 열(88 each). 값은 **qty** 마스킹, null 은 `-`.
데이터가 없으면 `EmptyState`("집계된 LRR 실적이 없습니다.").

### 2-4. 고객사 누계 표

고객사 · `Ship Q'ty`(**qty**) · `LRR Q'ty`(**qty**) · `LRR(%)`(**yield**, null 은 `-`) · 출하 비중 `ProgressBar`

## 3. 버튼 및 페이징

인쇄 · PDF / CSV(`고객사별LRR_{연도}`) / 엑셀 다운로드 / 조회. 페이징 없음(피벗 표 maxHeight 420 스크롤).

## 4. 그 밖의 기능

- 표의 **열을 화면에 고정하지 않습니다** — 응답 `period` 로 만들어 집계 단위 변경에 대응.
- 각주 : "LRR 은 고객사에서 통보한 라인 불량 수량입니다. 출하 실적이 없는 구간은 비율을 산출하지 않고 '-' 로 표기합니다."

## 5. 사용 API

총 **1건**

**고객사별 LRR** — 1건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 112 | `getReportsLrrByCustomer` | 고객사별 LRR 조회 | GET | `/api/v1/reports/lrr-by-customer` | baseYear, customerCd, unit(month|quarter|year) | summary{shipQty,lrrCnt,lrrRate,yoyImprove}, byDefectType[], byCustomerMonth[], byCustomerQuarter[], trend[] | 품질보증팀·경영진·통합관리자 | qty, yield, customer | 1 |


## 6. 개발 체크리스트

- [ ] 조회 조건 3종 (고객사 = 결과 기반)
- [ ] 요약 4카드 (전년 대비 개선폭 포함)
- [ ] 동적 기간 열 피벗 유틸(`pivot`)
- [ ] 피벗 표 2종 + 빈 상태
- [ ] 고객사 누계 표 + 출하 비중 바
- [ ] `-` 표기 규칙(산출 불가)
- [ ] 인쇄 · CSV · 엑셀
