# 19. `/report/ship-plan` — 연간 출하계획

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/ship-plan` |
| 화면 ID | `rpt-ship-plan` |
| 라우트 파일 | `app/(main)/report/ship-plan.jsx` |
| MVC | `domains/report/view/ShipPlanView.jsx` · `controller/useShipPlanController.js` |
| 기능 ID | RP-03 |
| 접근 권한 | 생산관리팀 · 경영진 · 통합관리자 |
| 인쇄 노드 | `rpt-ship-plan-doc` |

모델 × 고객사 × 월 단위 연간 출하계획(**회계연도 8월 시작 12개월**). 계획 수량은 데이터 권한 **`plan`** 대상입니다.

## 1. 컴포넌트

`PageHead`(인쇄·CSV·엑셀) · `Filters`(계획 연도 / 모델 / 고객사 / 단위) · `ReportDoc` → 남색 타이틀 바 · `StatCard`×4 · `Card`+`XlsTable`(피벗, maxHeight 560) + `Hint` · `Card`+`Table`(모델별 계획 비중, `ProgressBar`) · 각주 · `EmptyState`

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 계획 연도 | `{올해}년` | `yearOptions()` |
| 모델 | `전체` | 전체 / MD001 / MD002 / MD003 / MD004 ⚠️ 하드코딩 — 서버 연동 필요 |
| 고객사 | `전체` | 전체 / A comp / B comp ⚠️ 하드코딩 — 서버 연동 필요 |
| 단위 | `수량 (EA)` | 수량 (EA) / 금액 (원) |

### 2-2. 요약 카드

| 카드 | 값 | 마스킹 |
| :--- | :--- | :--- |
| `{planYear}년 총 계획수량` | `grandTotal` (단위 EA/원) — 보조 `{modelCnt}개 모델 · {months.length}개월 합계` | `plan` |
| 모델 수 | `modelCnt` 종 | — |
| 고객사 수 | `customerCnt` 사 | — |
| 최다 출하 월 | `peakMonth` — 보조 `{peakQty} EA/원` | `plan` |

### 2-3. 피벗 표 (`XlsTable`)

열 : `모델`(130) · `고객사`(96) · `총합계`(110) · **`months[]` 각 월(96)**

행 구성
1. 모델별 고객사 행 — 첫 행에만 모델명(bold), 고객사(**customer** 마스킹), 총합계·월별(**plan** 마스킹)
2. 모델 소계 행 — `tone='group'`, 고객사 칸에 `TOTAL`
3. 전체 합계 행 — `tone='total'`, `TOTAL`(span 2) + `grandTotal` + `monthTotals[]`

부제 : "단위: EA · 회계연도 2026년(8월~익년 7월) · TOTAL 행은 모델 합계"
`Hint` : "총합계 열은 계획서 확정본 기준이며, 2월~7월은 고객사 PO 미확정 구간의 잠정 배분값입니다."

### 2-4. 모델별 계획 비중

모델 · 총 계획수량(EA, **plan**) · 비중(`total/grandTotal*100`, 소수 1자리) · 구성비 `ProgressBar` — 총합 내림차순

## 3. 버튼 및 페이징

인쇄 · PDF / CSV(`출하계획_2026`) / 엑셀 다운로드 / 조회. 페이징 없음(피벗 표 내부 스크롤 560px).

## 4. 그 밖의 기능

- 서버는 모델 × 고객사 행을 **평평하게** 주므로 화면에서 모델별로 묶어 소계·합계 행을 만듭니다(`sumMonthly`).
- 값이 없는 달은 0으로 계산.
- 각주 : "확정 계획은 고객사 PO 연동 후 월 단위로 갱신됩니다."

## 5. 사용 API

총 **1건**

**연간 출하계획** — 1건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 110 | `getReportsShipPlan` | 연간 출하계획 조회 | GET | `/api/v1/reports/ship-plan` | planYear, modelCd, customerCd, unit(qty|amount) | months[], rows[{model,customer,total,monthly[12]}], grandTotal, monthlyTotal[], peakMonth | 생산관리팀·경영진·통합관리자 | plan, customer, price | 1 |


## 6. 개발 체크리스트

- [ ] 조회 조건 4종 (**모델·고객사 선택지 서버 연동으로 교체**)
- [ ] 요약 4카드 (`plan` 마스킹)
- [ ] 월 열 동적 생성 피벗 표 (모델 소계 + 전체 합계)
- [ ] 모델별 계획 비중 표 + 구성비 바
- [ ] 인쇄 · CSV · 엑셀
- [ ] 단위(수량/금액) 전환
- [ ] 빈 상태
