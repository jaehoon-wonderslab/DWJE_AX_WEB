# 10. `/production/daily-report` — 일일 생산현황 보고

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/daily-report` |
| 화면 ID | `prod-daily` |
| 라우트 파일 | `app/(main)/production/daily-report/index.jsx` |
| MVC | `domains/production/view/DailyReportView.jsx` · `controller/useDailyReportController.js` · `model/productionRepository.js` |
| 기능 ID | PR-03 |
| 접근 권한 | 생산관리팀 · 통합관리자 |

**집계 구간은 전날 20:00 ~ 당일 08:00 (야간 근무분).**
「생산관리팀 (PRESS) 아침회의자료」 양식 그대로 보여 줍니다 — **한 행 = 한 제품**이고, 양식의
「이슈 항목」 자리에 **제품명**이 들어갑니다. **대상일은 화면에서 고릅니다**(전역 기준일은 처음 한 번만).
⑥ 보고서 생성 Agent 가 초안을 만들고 담당자가 보정 후 확정합니다.

> **서버 구간 미반영** — 서버 초안(`periodFrom`·`periodTo`)은 아직 08:00~08:00 입니다.
> 화면은 20:00~08:00 구간을 표기하고, 실적은 일 단위 조회로 채웁니다.
> 서버가 구간을 갖도록 요청해 두었습니다(2026-09-04). 붙으면 조회만 바꾸면 됩니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(이전 보고서)` · `Button(엑셀 다운로드)` · `Button primary(초안 재생성)` |
| 1 | 조회 조건 | `DateField(대상일)` · `SelectField(공정)` · `SelectField(표시 개수)` |
| 2 | 안내 | `Hint` — 집계 구간 표기 |
| 3 | 양식 머리 | 날짜 배지 `26.09.02` · 가운데 `생산관리팀 (PRESS)` · 오른쪽 범례 3색 + `26.09.01(화)실적` |
| 4 | 양식 본문 | `XlsTable` 11열 — 아래 2-1 |
| 5 | 각주 | `SourceNote` + 기준선·수기 칸 안내 |
| 6 | 특이사항 | 초안의 `note` 항목 한 칸 (`TextInput multiline`) |
| 7 | 결재선 | 상태 배지 + `반려` · `임시 저장` · `항목 보정 반영` · `검토 완료 · 확정` |
| 8 | 구간 합계 | `Card` + `KeyValue` — `Grid cols=[1,1]` 좌 |
| 9 | 생성 이력 | `Card(tight)` + `ListRow` × 6 — 〃 우 |
| 10 | 반려 폼 | `openFormModal` — 반려 사유 textarea |

## 2. 화면에 출력해야 하는 정보

### 2-1. 양식 본문 — 한 행 = 한 제품

열 순서는 스크린샷(`보고서 스크린샷/생산관리팀 (PRESS)_아침회의자료.png`) 그대로입니다.

| # | 열 | 값 | 출처 |
| :-- | :--- | :--- | :--- |
| 1 | 상태 | `정상` / `주의` / `지연` — 달성률 구간에 따라 칸 배경색 | 달성률 계산 |
| 2 | 공정/Process | 공정을 고르면 그 작업장명, '프레스 전체' 면 `Press` | 공정 마스터 |
| 3 | **이슈 항목** | **제품명**(`productNm`) | 제품별 실적 |
| 4 | 일목표 | 최근 7일 평균 실적 (**목표 마스터 미연동**) | 기준선 계산 |
| 5 | 실적 | 대상일 생산량 `qty` | 제품별 실적 |
| 6 | 달성률 | `실적 ÷ 일목표 × 100` | 계산 |
| 7 | 주간누적 | 3줄 — `주간목표` / `주간실적` / **달성률(굵게)**. 그 주 월요일부터 대상일까지 | 계산 |
| 8 | 영향범위 | `Press {대수}대` — 조회 대상 작업장 설비 대수 합 | 공정 마스터 `eqptCnt` |
| 9 | 결정항목 / 기타 | **작성자 입력** (화면 상태) | — |
| 10 | DRI | **작성자 입력** (화면 상태) | — |
| 11 | 기한 | **작성자 입력** (화면 상태) | — |

수량 칸(일목표·실적·주간누적)은 `qty` 마스킹 대상이라 권한이 없으면 비공개 배지만 그립니다.

범례 — 🟢 95% 이상 `정상` · 🟡 95% 미만 `주의` · 🔴 85% 미만 `지연`

### 2-2. 보고서 초안 (`GET /production/daily-reports/draft?targetDate=`)

| 항목 | 값 |
| :--- | :--- |
| 상태 배지 | `dailyStateTone(state)` — 초안 / 임시저장 / 확정 / 반려 |
| 결재선 부제 | `v{version} · 생성 {generatedAt} · 보정 {correctionCnt}건` |
| 특이사항 | 초안 항목 중 `fieldCode='note'` 한 칸만 양식 아래로 뺍니다 |
| 미저장 표시 | 편집 내용이 서버 값과 다르면 `미저장` 배지 |

### 2-3. 구간 합계

대상일 · 실적 일자(전날) · 표시 제품 수 · 실적 합계 · 일목표 합계 · 불량 합계

### 2-4. 생성 이력 (`GET /production/daily-reports/{reportId}/events`)

`type`(제목) · `{detail} · {by}`(설명) · `ts`(MM-DD HH:mm) — 최근 6건

## 3. 버튼 및 페이징

| 버튼 | 위치 | 동작 |
| :--- | :--- | :--- |
| 이전 보고서 | 헤드 | `/production/daily-report/history` |
| 엑셀 다운로드 | 헤드 | 양식 11열 그대로 xls (주간누적은 3열로 폅니다) |
| 초안 재생성 | 헤드 | `POST /production/daily-reports/draft/regenerate` |
| 반려 | 카드 하단 (danger) | 사유 입력 모달 → `POST /{reportId}/reject` — 사유 없으면 토스트로 막음 |
| 임시 저장 | 카드 하단 | `POST /{reportId}/save` |
| 항목 보정 반영 | 카드 하단 | `PUT /{reportId}` (correctionCnt 증가) |
| 검토 완료 · 확정 | 카드 하단 (primary) | `POST /{reportId}/confirm` |

페이징 없음.

## 4. 그 밖의 기능

- 모든 액션은 `runAction()` 으로 처리 — 결과 메시지 토스트 후 `reload()`.
- 편집 중 섹션은 화면 state 로만 보관(`dirty` 계산 = `JSON.stringify` 비교).
- 반려 모달 안내 : "반려하면 ⑥ 보고서 생성 Agent 가 사유를 반영해 초안을 다시 만듭니다."
- 대상 일자는 화면 state. `useAppStore.baseDate` 는 **첫 진입 값**으로만 씁니다.
- 날짜 칸은 직접 타이핑할 수 있어 `2026-0` 같은 중간 상태를 거칩니다 —
  `YYYY-MM-DD` 형식이 갖춰진 값만 조회에 씁니다(`dateInput` ↔ `targetDate` 분리).
- '프레스 전체' 는 **프레스 작업장 전부**를 각각 부른 뒤 제품 단위로 합칩니다.
  공정을 빼고 부르면 용접·도금 제품까지 올라옵니다(실제로 Welding 제품이 올라왔습니다).
- `(날짜, 공정)` 한 쌍당 한 번만 부릅니다 — 주간 구간과 기준선 구간이 겹칩니다.
- 결정항목 · DRI · 기한은 **서버에 자리가 없어** 화면 state 로만 듭니다.
  대상일이나 공정을 바꾸면 비웁니다. 서버 필드를 요청해 두었습니다(2026-09-04).

## 5. 사용 API

총 **7건**

**일일 생산현황 보고** — 7건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 59 | `getProductionDailyReportsDraft` | 보고서 초안 조회 | GET | `/api/v1/production/daily-reports/draft` | targetDate | reportId, version, state, periodFrom, periodTo, generatedAt, sections[], summary | 생산관리팀·통합관리자 | qty, yield | 1 |
| 60 | `postProductionDailyReportsDraftRegenerate` | 보고서 초안 재생성 | POST | `/api/v1/production/daily-reports/draft/regenerate` | targetDate | reportId, version | 생산관리팀·통합관리자 | — | 1 |
| 61 | `putProductionDailyReportsByReportId` | 보고서 항목 보정 | PUT | `/api/v1/production/daily-reports/{reportId}` | sections[], remark | reportId, correctionCnt | 생산관리팀·통합관리자 | — | 1 |
| 62 | `postProductionDailyReportsByReportIdSave` | 보고서 임시 저장 | POST | `/api/v1/production/daily-reports/{reportId}/save` | sections[] | success | 생산관리팀·통합관리자 | — | 2 |
| 63 | `postProductionDailyReportsByReportIdConfirm` | 보고서 확정 | POST | `/api/v1/production/daily-reports/{reportId}/confirm` | — | state, confirmedAt, confirmedBy | 생산관리팀·통합관리자 | — | 1 |
| 64 | `postProductionDailyReportsByReportIdReject` | 보고서 반려 | POST | `/api/v1/production/daily-reports/{reportId}/reject` | reason | state | 생산관리팀·통합관리자 | — | 1 |
| 65 | `getProductionDailyReportsByReportIdEvents` | 보고서 생성 이력 | GET | `/api/v1/production/daily-reports/{reportId}/events` | — | events[{ts,type,detail,by}] | 생산관리팀·통합관리자 | — | 2 |


양식 본문은 제품별 실적 조회(`GET /dashboard/process/products`)와 공정 마스터
(`GET /common/masters/processes`)로 채웁니다. **보고서 전용 엔드포인트가 생기면 이 두 건을 걷어냅니다.**

## 6. 개발 체크리스트

- [x] 대상일 선택 (형식이 갖춰진 값만 조회)
- [x] 집계 구간 20:00~08:00 표기
- [x] 아침회의 자료 양식 11열 (`XlsTable`)
- [x] 이슈 항목 = 제품명
- [x] 달성률 구간별 상태색 (95% / 85%)
- [x] 주간누적 3줄 (달성률 굵게)
- [x] 프레스 작업장만 집계 ('전체' = 프레스 전부 합산)
- [x] 결정항목 · DRI · 기한 입력칸
- [x] 특이사항 (초안 `note`)
- [x] 미저장 변경 표시(`dirty`)
- [x] 임시 저장 / 항목 보정 / 확정 / 반려(사유 필수) 4액션
- [x] 초안 재생성
- [x] 구간 합계 `KeyValue`
- [x] 생성 이력 목록
- [x] 이전 보고서 화면 이동
- [x] 엑셀 다운로드 (양식 열 그대로)
- [ ] **서버 집계 구간 20:00~08:00** — API 요청함
- [ ] **일목표 · 주간목표 마스터** — API 요청함
- [ ] **결정항목 · DRI · 기한 저장** — API 요청함
- [ ] **제품별 설비 대수** — API 요청함
