# 17. `/report/press-morning` — 아침회의 자료 (PRESS)

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/press-morning` |
| 화면 ID | `rpt-press-morning` |
| 라우트 파일 | `app/(main)/report/press-morning.jsx` |
| MVC | `domains/report/view/PressMorningView.jsx` · `controller/usePressMorningController.js` · `model/reportRepository.js` |
| 기능 ID | RP-01 |
| 접근 권한 | 생산관리팀 · 제조팀 · 통합관리자 |
| 인쇄 노드 | `rpt-press-morning-doc` |

**신호등 규칙 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험.**

> **2026-09-04 — 스크린샷 양식 그대로 다시 그렸습니다.**
> 표 정의(열·색·엑셀 행)는 `domains/report/view/components/MorningSheet.jsx` 한 곳에 있고
> PRESS·Plating·Coating 두 화면이 같은 것을 씁니다 — **화면과 엑셀이 갈라지지 않게** 하기 위해서입니다.
>
> 양식에 없던 것(요약 카드 4장 · 합계 행 · 결정 사항 표)은 덜어냈습니다.
> **값이 없는 칸은 `-` 로 둡니다.**
>
> **일목표가 0 이면 달성률·상태를 내지 않습니다.** 서버는 목표 0 일 때 달성률 0% · `CRIT` 을 주는데,
> 그건 못 지킨 것이 아니라 목표가 없는 것입니다. 그대로 그리면 모든 행이 빨간 위험으로 보입니다.
> 제품·공정별 일목표 마스터(`/production/day-targets`)가 채워지면 살아납니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(인쇄 · PDF)` · `Button(CSV)` · `Button(엑셀 다운로드)` |
| 1 | 조회 조건 | `Filters` + `DateField`(기준일) + `SelectField`(공정 / 상태) + `Button primary(조회)` |
| 2 | 보고서 문서 | `ReportDoc(nodeId)` — 이하 전부 인쇄 대상 |
| 2-1 | 문서 제목 | `ReportTitle`(dateBox `26.08.21` · 제목 `생산관리팀 (PRESS)` · 우측 `SignalLegend` + `{actualDate}실적`) |
| 2-2 | 요약 | `StatCard` × 4 (`Grid cols=4`) |
| 2-3 | 모델별 일일 실적 | `Card(tight)` + `XlsTable`(11열, 합계행) + 우측 `Badge` 3종 |
| 2-4 | 신호등 안내 | `Hint` |
| 2-5 | 금일 결정 사항·DRI | `Card(tight)` + `Table` |
| 2-6 | 각주 | 프로토타입 안내 |
| 3 | 빈 상태 | `EmptyState` — "조회 조건에 해당하는 자료가 없습니다." |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

기준일(`lastDataDate()`) · 공정(`Press 전체` / `Press 1~5호기` / `Press 6~10호기`) · 상태(`전체` / 정상 / 주의 / 위험)

### 2-2. 요약 카드 (`summary`)

| 카드 | 값 | 단위 | 보조 | 마스킹 |
| :--- | :--- | :--- | :--- | :--- |
| 일목표 합계 | `dayTarget` | k | `8개 모델 · Press 전체` | `qty` |
| 실적 합계 | `dayActual` | k | `목표 대비 +{dayActual-dayTarget}k` | `qty` |
| 평균 달성률 | `avgRate` | % | `주간누적 {weekRate}%` | `yield` |
| 이슈 건수 | `issueCnt` | 건 | `주의 {warnCnt}건 · 위험 {badCnt}건` | — |

### 2-3. 모델별 일일 실적 표 (`XlsTable`, `rows[]`)

`상태`(`signal.label`, tone) · `공정/Process`(Press) · `이슈 항목`(`model`) · `일목표`(k, **qty**) · `실적`(k, **qty**) · `달성률`(**yield**) · `주간누적`(`주간목표 X / 실적 Y / Z%`) · `영향범위(생산장비)`(`Press N대`) · `결정항목 / 기타`(`decision`, wrap) · `DRI` · `기한`
마지막 `tone='total'` 합계행 — `{modelCnt}개 모델` · `total.*` · `주의 N건 · 위험 N건` · `생산관리` · `8/23`
우측 배지 : `정상 {okCnt}` / `주의 {warnCnt}` / `위험 {badCnt}`

### 2-4. 금일 결정 사항·DRI (`/press-morning/decisions`)

DRI(`team`) · 조치 항목(`action`, wrap) · 관련 모델 · 영향 장비 · 기한 · 상태(`Badge`: 정상 green / 주의 amber / 위험 red / 그 외 blue)

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 인쇄 · PDF | `printDocument({nodeId:'rpt-press-morning-doc', title, role})` |
| CSV | `downloadCsv({name:'아침회의자료_PRESS_20260821', head(11), rows})` |
| 엑셀 다운로드 | `downloadXls` 동일 데이터 |
| 조회 | `reload()` + 토스트 |

페이징 없음.

## 4. 그 밖의 기능

- `k` 단위 표기 헬퍼(`kk(n) = comma(n)+'k'`).
- 마스킹은 `canData(field) ? v : '비공개'` 로 셀 문자열 치환.
- 인쇄 시 `role`(로그인 계정 부서)을 함께 넘겨 머리말에 표기.

## 5. 사용 API

총 **4건**

**아침회의 자료 (PRESS)** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 107 | `getReportsPressMorning` | PRESS 아침회의 자료 조회 | GET | `/api/v1/reports/press-morning` | baseDate, processScope, state | summary{dayTarget,dayActual,avgRate,issueCnt}, rows[{state,process,issue,dayTarget,dayActual,rate,weekTarget,weekActual,weekRate,impactEqptCnt,decision,dri,due}], total{} | 생산관리팀·제조팀·통합관리자 | qty, yield | 1 |
| 108 | `getReportsPressMorningDecisions` | 금일 결정 사항·DRI 조회 | GET | `/api/v1/reports/press-morning/decisions` | baseDate | items[{team,action,dri,due}] | 생산관리팀·제조팀·통합관리자 | — | 2 |

**보고서 공통** — 2건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 125 | `postReportsByReportIdExport` | 보고서 출력 (엑셀·CSV·PDF) | POST | `/api/v1/reports/{reportId}/export` | format(xls|csv|pdf), scope(view|all), fileName | file(binary) | 보고서별 열람 권한 | * | 1 |
| 126 | `getReportsByReportIdPrint` | 보고서 인쇄용 조회 | GET | `/api/v1/reports/{reportId}/print` | — | html | 보고서별 열람 권한 | * | 2 |


## 6. 개발 체크리스트

- [ ] `ReportDoc` 인쇄 노드 구성
- [ ] 요약 4카드 (k 단위 · 마스킹)
- [ ] 11열 `XlsTable` + 신호등 tone + 합계행
- [ ] 정상/주의/위험 배지 집계
- [ ] 결정 사항·DRI 표
- [ ] 인쇄 · CSV · 엑셀 3종 출력
- [ ] 조회 조건 3종
- [ ] 빈 상태 처리
