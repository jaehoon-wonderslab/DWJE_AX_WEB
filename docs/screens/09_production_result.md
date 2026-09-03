# 09. `/production/result` — 실적 집계·조회

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/result` |
| 화면 ID | `prod-result` |
| 라우트 파일 | `app/(main)/production/result.jsx` |
| MVC | `domains/production/view/ProductionResultView.jsx` · `controller/useProductionResultController.js` · `model/productionRepository.js` |
| 기능 ID | PR-02 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 경영진 · 통합관리자 |

MES 생산 실적을 기간·제품·라인별로 집계해 조회합니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(엑셀 다운로드)` |
| 1 | 조회 조건 | `Filters` + `DateField`(시작일/종료일) + `SelectField`(집계 단위 / 제품) + `Button primary(조회)` |
| 2 | 추이 차트 | `Card` + `BarChart`(생산량 `v` / 불량 수량 `v2`) + 커스텀 범례 |
| 3 | 집계 결과 | `Card(tight)` + `Table`(minWidth 820) + **합계 요약 바** |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `recentRange(7)` | 날짜 |
| 집계 단위 | `일별` | 일별 / 주별 / 월별 |
| 제품 | `전체` | `loadModelOptions()` — **서버 기준정보** |

### 2-2. 집계 결과 표 (`GET /production/results`)

| 열 | 폭 | 마스킹 |
| :--- | :--- | :--- |
| 일자 `period` | 120 | — |
| 투입 `inputQty` | flex 우측 | `qty` |
| 양품 `okQty` | flex 우측 | `qty` |
| 불량 `ngQty` | flex 우측 | `qty` |
| 불량률 `defectRate` | 90 우측 `n.n%` | `yield` |
| 가동률 `uptimeRate` | 90 우측 `n.n%` | — |
| 비가동 시간 `downtimeMin` | 110 우측 `minutesText()` | — |

### 2-3. 합계 요약 바 (표 하단, `summary`)

투입 합계(`qty`) · 양품 합계(`qty`) · 불량 합계(`qty`) · 평균 불량률(`yield`) · 평균 가동률 · 비가동 합계

### 2-4. 추이 차트 (`GET /production/results/trend`)

`labels[]` + `series[0]`(생산량) / `series[1]`(불량 수량) → 이중 막대. 카드 부제는 `{from} ~ {to}`.

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 조회 | `reload()` + 건수 토스트 |
| 엑셀 다운로드 | 집계 결과 xls (일자·투입·양품·불량·불량률·가동률·비가동 시간) |

**페이징** — 서버 API 는 `page`/`size` 를 지원하지만 현재 화면은 미노출. 조회 기간이 넓어지면 `usePaging` + `Pagination` 을 붙여야 합니다. → **개선 항목**

## 4. 그 밖의 기능

- 제품 선택지 하드코딩 금지 — 서버 코드와 달라 0건이 됩니다.
- 실적 내려받기 전용 서버 API `postProductionResultsExport` (`POST /production/results/export`, blind `qty`,`yield`) 가 있으나 현재 화면은 클라이언트 `downloadXls` 사용. → 대용량 시 서버 export 로 전환 검토.

## 5. 사용 API

총 **3건**

**실적 집계·조회** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 57 | `getProductionResults` | 실적 집계 조회 | GET | `/api/v1/production/results` | from, to, unit(day|week|month), itemCd, lineCd, page, size | items[{period,inputQty,okQty,ngQty,defectRate,uptimeRate,downtimeMin}], summary, meta | 품질보증팀·생산관리팀·경영진·통합관리자 | qty, yield | 1 |
| 58 | `getProductionResultsTrend` | 실적 추이 차트 | GET | `/api/v1/production/results/trend` | from, to, unit, itemCd | labels[], series[] | 상동 | qty, yield | 1 |

**생산 실적 조회** — 1건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| - | `postProductionResultsExport` | 실적 집계 내려받기 | POST | `/api/v1/production/results/export` | fromDate, toDate, procCd, itemCd, format | fileUrl 또는 바이너리 | 전 부서 | qty, yield | 2 |


## 6. 개발 체크리스트

- [ ] 조회 조건 4종 (기간 · 집계 단위 · 제품)
- [ ] 제품 선택지 서버 기준정보 연동
- [ ] 이중 막대 추이 차트 + 범례
- [ ] 집계 표 7열 + 마스킹
- [ ] 합계 요약 바
- [ ] 엑셀 다운로드
- [ ] (개선) 서버 페이징 노출
- [ ] (개선) 대용량 시 서버 export API 전환
