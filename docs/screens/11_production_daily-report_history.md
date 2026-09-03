# 11. `/production/daily-report/history` — 이전 보고서

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/daily-report/history` |
| 화면 ID | `daily-history` (**하위 화면** — 메뉴 비노출, 상위 `prod-daily` 에서 진입) |
| 라우트 파일 | `app/(main)/production/daily-report/history.jsx` |
| MVC | `domains/production/view/DailyHistoryView.jsx` · `controller/useDailyHistoryController.js` |
| 기능 ID | PR-04 |
| 접근 권한 | 생산관리팀 · 통합관리자 |

## 1. 컴포넌트

`PageHead`(+`Button(일일 생산현황 보고, icon=arrowLeft)`, `Button(엑셀 다운로드)`) · `Filters`(`DateField`×2 + `SelectField`(상태) + `Button primary(조회)`) · `Card(tight)` + `Table`(minWidth 820) + `Pagination` · `openFormModal`(보고서 복제)

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `currentMonthRange()` | 날짜 |
| 상태 | `전체` | 전체 / 검토 대기 / 확정 / 반려 |

### 2-2. 보고서 이력 표 (`GET /production/daily-reports`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 대상 일자 `targetDate` | 120 | |
| 버전 `version` | 70 중앙 | `v{n}` |
| 상태 `state` | 100 | `StateBadge` |
| 생성 일시 `generatedAt` | flex | |
| 확정 일시 `confirmedAt` | flex | 없으면 `—` |
| 보정 `correctionCnt` | 80 중앙 | 있으면 `Badge(amber) N건`, 없으면 `—` |
| 복제 | 82 | `Button(복제)` |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 일일 생산현황 보고 | `/production/daily-report` |
| 엑셀 다운로드 | 이력 xls (대상 일자·버전·상태·생성·확정·보정 건수) |
| 조회 | `reload()` |
| **행 클릭** | 상태가 `검토 대기` 면 작성 화면으로, 아니면 `{targetDate} 확정본을 열었습니다` 토스트 |
| 복제 | 복제 폼 모달 → `POST /production/daily-reports/{reportId}/copy` |

**페이징** — `usePaging({resetKey: from|to|state})` + `Pagination`.

### 3-1. 보고서 복제 폼

| 필드 | 타입 | 값 |
| :--- | :--- | :--- |
| 원본 보고서 | static | `{targetDate} · v{version} ({state})` |
| 새 대상 일자 | date (required) | 기본 `lastDataDate()` |
| 복제 범위 | radio | `수치만 새로 집계` / `본문까지 그대로 복제` |

안내: "수치는 새 기간 기준으로 다시 집계되며, 본문은 선택에 따라 초안이 다시 만들어집니다."

## 4. 그 밖의 기능

- 복제 성공 시 목록 자동 갱신.
- 상위 화면(`prod-daily`) 권한이 없으면 이 화면도 함께 닫는 것을 권장(메뉴 권한 화면의 회색 행 안내 참조).

## 5. 사용 API

총 **2건**

**이전 보고서** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 66 | `getProductionDailyReports` | 보고서 이력 조회 | GET | `/api/v1/production/daily-reports` | from, to, state, page, size | items[{targetDate,version,state,generatedAt,confirmedAt,correctionCnt}], meta | 생산관리팀·통합관리자 | — | 1 |
| 67 | `postProductionDailyReportsByReportIdCopy` | 보고서 복제 | POST | `/api/v1/production/daily-reports/{reportId}/copy` | targetDate | newReportId | 생산관리팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 기간·상태 조회 조건
- [ ] 이력 표 7열 (버전 · 상태 배지 · 보정 배지)
- [ ] 서버 페이징
- [ ] 행 클릭 분기 (검토 대기 → 작성 화면)
- [ ] 복제 폼 모달 + `POST .../copy`
- [ ] 엑셀 다운로드 · 상위 화면 복귀 버튼
