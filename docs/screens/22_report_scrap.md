# 22. `/report/scrap` — 폐기 보고서

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/scrap` |
| 화면 ID | `rpt-scrap` |
| 라우트 파일 | `app/(main)/report/scrap/index.jsx` |
| MVC | `domains/report/view/ScrapReportView.jsx` · `controller/useScrapReportController.js` |
| 기능 ID | RP-06 |
| 접근 권한 | 품질보증팀 · 생산관리팀 · 경영진 · 통합관리자 |
| 인쇄 노드 | `rpt-scrap-doc` |

폐기 수량·금액을 **결재 양식**으로 정리한 문서. 금액 열은 원가(**`price`**) 열람 권한이 있는 계정에만 표시됩니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button primary(새 보고서 작성)` · `Button(인쇄 · PDF)` · `Button(엑셀 다운로드)` |
| 1 | 조회 조건 | `Filters` + `SelectField`(문서번호) + `DateField`(발생 시작/종료일) + `SelectField`(발생 구분) + `Button primary(조회)` |
| 2 | 요약 | `StatCard` × 4 |
| 3 | 결재 양식 | `s.doc` `s.docWide` — 문서번호/보존기간/제목/결재란(기안·검토·승인) |
| 3-1 | 머리 정보 | `InfoGrid` — 라벨-값 격자(3열, 불량내용은 전폭) |
| 3-2 | 공정별 폐기 발생 내용 | `DocLine` 목록 (불량 내용 · 주요 모델별 발생수량 · 폐기 금액) + 우측 요약 박스 |
| 3-3 | 검토 의견 | `OpinionBox` × 4 (팀별 textarea + 팀장 서명란) |
| 4 | 안내 | `Hint` |
| 5 | 모델별 폐기 내역 | `Card(tight)` + `XlsTable`(6열, 합계행) + 우측 `Badge` 2종 |
| 6 | 빈 상태 | `EmptyState` |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 문서번호 | 목록 첫 건 | `GET /reports/scrap` 의 `docNo[]` |
| 발생 시작/종료일 | `currentMonthRange()` | — |
| 발생 구분 | `제조공정 발생` | 제조공정 발생 / 협력업체 발생 / IQC 발생 |

### 2-2. 요약 카드 (`summary`)

총 폐기수량(`totalQty`, **qty**) · 공정불량(`ngQty`, **qty**, 보조 비율) · Loss(`lossQty`, **qty**, 보조 비율) · 폐기 금액(`totalAmt`, **price**, 보조 "원가 기준정보 자동 산출")

### 2-3. 결재 양식 머리 정보 (`header`)

문서번호 · 보존기간 · 제목 「폐기 보고서」 · `origin` · 결재란 3칸
`InfoGrid` : 불량내용(전폭) · 모델명 · 발생공정 · 발생 일자 · **업체명(`customer` 마스킹)** · 제조일자 · 발생 수량(`qty`) · 제조자 · 작성자 · 작성일자

### 2-4. 공정별 폐기 발생 내용

- ▶ 불량 내용 : `각 공정의 불량 제품, Loss, 불용 재고` 총량 / 공정불량 / 불용 재고(`deadQty`, 0이면 `-`) / Loss
- ▶ 주요 모델별 발생수량 : `models[{no,name,qty}]`
- ▶ 폐기 금액 : 원가 기준정보 환산 합계(**price**)
- 우측 박스 : 공정불량·Loss 비율 + "주요 4개 모델이 전체 폐기수량의 N% 를 차지합니다."

### 2-5. 검토 의견 4칸

`reviewOpinions[{no, dept, placeholder}]` — 각 칸은 `{no}. {dept} 검토 내용` 제목 + multiline 입력 + `팀장 ______ (인)`

### 2-6. 모델별 폐기 내역 (`XlsTable`)

모델(bold) · 공정 · 폐기 사유 · 수량(EA, **qty**) · 금액(원, **price**) · 비중(%) + `tone='total'` 합계행(`전 공정` · `{N}개 항목 · 치수 Spec Out 외` · 100.0%)
우측 배지 : `폐기 N EA`(red) / `금액 N 원`(amber)

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 새 보고서 작성 | `/report/scrap/new` (위저드) |
| 인쇄 · PDF | `printDocument({nodeId:'rpt-scrap-doc'})` |
| 엑셀 다운로드 | 모델별 폐기 내역 xls (6열) |
| 조회 | `reload()` |

페이징 없음 (문서 1건 상세 방식). 목록 API 는 `page`/`size` 지원.

## 4. 그 밖의 기능

- 문서번호를 고르기 전에는 **목록의 첫 건**을 펼칩니다(리포지토리가 결정).
- 검토 의견은 현재 화면 로컬 state — 저장은 위저드 4단계(결재선)와 서버 `reviewOpinions` 로 관리.
- `Hint` : "폐기 수량은 MES 공정별 불량·Loss 실적에서 자동 집계되며, 검토 의견 4개 칸은 팀별 담당자가 직접 입력합니다. 금액 열은 원가 열람 권한이 있는 계정에만 표시됩니다."

## 5. 사용 API

총 **2건**

**폐기 보고서** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 113 | `getReportsScrap` | 폐기 보고서 목록 조회 | GET | `/api/v1/reports/scrap` | from, to, originType, page, size | items[{docNo,periodFrom,periodTo,totalQty,totalAmt,state}], meta | 품질보증팀·생산관리팀·경영진·통합관리자 | qty, price | 1 |
| 114 | `getReportsScrapByDocNo` | 폐기 보고서 상세 조회 | GET | `/api/v1/reports/scrap/{docNo}` | — | header{docNo,draft,review,approve,retention}, occurInfo{}, summary{totalQty,ngQty,lossQty,totalAmt}, rows[{model,process,reason,qty,amount,ratio}], reviewOpinions[] | 상동 | qty, price | 1 |


## 6. 개발 체크리스트

- [ ] 문서번호 선택 + 기간·발생 구분 조회
- [ ] 요약 4카드 (`qty` · `price` 마스킹)
- [ ] 결재 양식 문서(머리 정보 격자 · 결재란 · 발생 내용 · 검토 의견 4칸)
- [ ] 모델별 폐기 내역 표 + 합계행 + 배지
- [ ] 인쇄 · 엑셀
- [ ] 위저드 진입 버튼
- [ ] 빈 상태
