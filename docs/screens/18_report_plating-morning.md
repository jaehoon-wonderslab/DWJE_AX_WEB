# 18. `/report/plating-morning` — 아침회의 자료 (Plating · Coating)

| 항목 | 값 |
| :--- | :--- |
| URL | `/report/plating-morning` |
| 화면 ID | `rpt-plating-morning` |
| 라우트 파일 | `app/(main)/report/plating-morning.jsx` |
| MVC | `domains/report/view/PlatingMorningView.jsx` · `controller/usePlatingMorningController.js` |
| 기능 ID | RP-02 |
| 접근 권한 | 생산관리팀 · 제조팀 · 통합관리자 |
| 인쇄 노드 | `rpt-plating-morning-doc` |

구조는 **[17. PRESS](./17_report_press-morning.md)** 와 같고, 공정 범위와 표 구성이 다릅니다.

## 1. 컴포넌트

`PageHead`(인쇄·CSV·엑셀) · `Filters`(기준일 / 공정 / 상태) · `ReportDoc` → `ReportTitle`(`생산관리팀 (Plating, Coating)`) · `StatCard`×4 · `Card`+`XlsTable`(11열, 합계행) · `Card`+`Table`(공정별 요약) · `Hint`(하단 이슈 설명) · `EmptyState`

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

기준일 · 공정(`전체` / `A Plating` / `B Plating` / `Coating`) · 상태(`전체` / 정상 / 주의 / 위험)

### 2-2. 요약 카드 (`summary`)

| 카드 | 값 | 보조 |
| :--- | :--- | :--- |
| 일목표 합계 (`qty`) | `dayTarget` k | `11개 라인 · {actualDate}` |
| 실적 합계 (`qty`) | `dayActual` k | `목표 대비 {gap}` |
| 평균 달성률 (`yield`) | `avgRate` % | `주간누적 {weekRate}%` |
| 위험 공정 | `riskCnt` 건 | `riskDetail` |

### 2-3. 일일 실적 현황 표 (`XlsTable`, 11열)

`상태`(`toneOf`: 위험 bad / 주의 warn / 그 외 ok) · `공정/Process` · `이슈 항목` · `일목표`(**qty**) · `실적`(**qty**) · `달성률`(**yield**, tone) · `주간누적`(목표/실적/율) · `영향범위` · `결정항목 / 기타`(wrap) · `DRI` · `기한` + `tone='total'` 합계행
우측 배지 : `위험 N` / `정상 N`
부제 : "신호등 규칙 — 달성률 95% 이상 정상 / 95% 미만 주의 / 85% 미만 위험"

### 2-4. 공정별 요약 표 (`processSummary`)

공정 · 대상 라인 · 일목표 · 실적 · 일 달성률 · 주간 달성률 · 가동 설비 · 비고(`Badge(noteTone)` 또는 `-`)

### 2-5. 하단 안내 (`Hint`)

"B Plating BOI 라인은 JIG 라인 도금조 석출로 가동이 중단되어 일 달성률 62.0%입니다. 미달성 수량은 주말 작업으로 만회 예정이며, 기한은 8/23 입니다."

## 3. 버튼 및 페이징

인쇄 · PDF / CSV(`아침회의자료_PlatingCoating_20260821`) / 엑셀 다운로드 / 조회. 페이징 없음.

## 4. 그 밖의 기능

- 각주 : "도금조 액 분석·석출 이력은 IoT 연동 후 자동 반영됩니다."
- 서버 API 1건으로 `summary` · `rows` · `total` · `processSummary` 를 모두 받습니다.

## 5. 사용 API

총 **1건**

**아침회의 자료 (Plating·Coating)** — 1건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 109 | `getReportsPlatingMorning` | Plating·Coating 아침회의 자료 조회 | GET | `/api/v1/reports/plating-morning` | baseDate, processScope(all|A Plating|B Plating|Coating), state | summary{}, rows[], total{} | 생산관리팀·제조팀·통합관리자 | qty, yield | 1 |


## 6. 개발 체크리스트

- [ ] `ReportDoc` 인쇄 노드
- [ ] 요약 4카드
- [ ] 11열 `XlsTable` + 신호등 tone + 합계행
- [ ] 공정별 요약 표
- [ ] 인쇄 · CSV · 엑셀
- [ ] 조회 조건 3종 · 빈 상태
