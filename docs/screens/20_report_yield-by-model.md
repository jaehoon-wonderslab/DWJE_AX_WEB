# 20. `/report/yield-by-model` — 제품별 수율

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/yield-by-model` |
| 화면 ID | `rpt-yield-model` |
| 라우트 파일 | `app/(main)/report/yield-by-model.jsx` |
| MVC | `domains/report/view/YieldByModelView.jsx` · `controller/useYieldByModelController.js` |
| 기능 ID | RP-04 |
| 접근 권한 | 품질보증팀 · 경영진 · 통합관리자 |
| 인쇄 노드 | `rpt-yield-model-doc` |

MES 투입·양품 실적 + AOI 판정 로그를 모델별로 집계한 월간 수율. **Loss 세부 유형(11종)과 관리 항목(3종)** 까지 한 표에서 봅니다.

## 1. 컴포넌트

`PageHead`(인쇄·CSV·엑셀) · `Filters`(기준 월 / 모델 / 공정) · `ReportDoc` → 문서 제목 · `StatCard`×4 · `Card`+`XlsTable`(동적 열, maxHeight 520)+`Pagination` · `Card`+`Table`(불량 유형별 Loss 비중) · 각주 · `EmptyState`

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 기준 월 | `{올해}년 {이번달}월` | `yearMonthOptions()` |
| 모델 | `전체` | `loadModelOptions()` (서버) |
| 공정 | `전체` | `loadProcessOptions()` (서버) |

### 2-2. 요약 카드 (`summary`)

총 투입수량(`inputQty`, **qty**, 보조 `{rowsMeta.total}개 행 집계`) · 총 양품수량(`okQty`, **qty**) · 전체 수율(`yield`, **yield**, 보조 `목표 {target}%`) · 총 불량수량(`ngQty`, **qty**, 보조 `불량률 {defectRate}%`)

### 2-3. 모델별 수율·Loss 상세 (`XlsTable`)

고정 열 : `No` · `Date` · `Model` · `투입 수량`(qty) · `양품 수량`(qty) · `불량 수량`(qty, tone bad) · `불량률%`(yield, tone bad) · `수율`(yield, **tone = yieldTone**)
동적 열 : **`data.lossTypes[]`(11종)** + **`data.mgmtTypes[]`(3종)** — 서버가 준 목록 그대로, 화면 고정 금지
**첫 행이 합계행** (`tone='total'`, `합계 ▶` span 3) — 서버 `lossTotals`/`mgmtTotals` 우선, 없으면 받은 행으로 합산

수율 색 규칙 : `99% 이상 ok / 98~99% warn / 98% 미만 bad`

### 2-4. 불량 유형별 Loss 비중

불량 유형 · Loss 수량(**qty**) · 비중(**yield**) · 비중 `ProgressBar`(25% 이상 bad / 5% 이상 warn) — 값 0 제외, 내림차순
카드 부제 : `{yearMonth} 누계 Loss {lossTotal} EA 기준`

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| **인쇄 · PDF** | `requestPrint()` — 쪽 단위로 보는 중이면 `size=0`(전체)으로 바꾸고 자료 도착 후 인쇄 (`printPending` 플래그). 이미 전체면 즉시 인쇄 |
| CSV / 엑셀 다운로드 | `fetchAllRows()` 로 **전량 재조회** 후 내려받기 — 실패 시 현재 쪽만 + 안내 토스트 |
| 조회 | `reload()` |

**페이징** — `usePaging({size:100, resetKey: 월\|모델\|공정})`, 선택지 `SIZES = [50, 100, 200, 0]` (**0 = 전체**, 인쇄용).

## 4. 그 밖의 기능

- 인쇄가 "쪽만 인쇄되면 보고서가 아니다"는 원칙 → 전체 로드 후 인쇄하는 2단계 처리.
- Loss/관리 항목 열은 서버 응답에서 동적으로 만들어 항목 증감에 화면 수정이 필요 없습니다.
- 각주 : "수율·Loss 는 MES 투입/양품 실적과 AOI 판정 로그에서 자동 집계됩니다."

## 5. 사용 API

총 **1건**

**제품별 수율** — 1건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 111 | `getReportsYieldByModel` | 제품별 수율 조회 | GET | `/api/v1/reports/yield-by-model` | yearMonth, modelCd, processId | summary{inputQty,okQty,yield,ngQty,defectRate,target}, rows[{no,date,model,inputQty,okQty,ngQty,defectRate,yield,loss{11종},mgmt{3종}}] | 품질보증팀·경영진·통합관리자 | qty, yield | 1 |


## 6. 개발 체크리스트

- [ ] 조회 조건 3종 (모델·공정 서버 연동)
- [ ] 요약 4카드
- [ ] 동적 열(Loss 11 + 관리 3) `XlsTable` + 최상단 합계행
- [ ] 수율 색 규칙(99/98)
- [ ] 페이징 + `전체(0)` 옵션
- [ ] 인쇄 전 전체 로드 대기 처리
- [ ] CSV·엑셀 전량 재조회 다운로드
- [ ] Loss 비중 표 + 임계 색
