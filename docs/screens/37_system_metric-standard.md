# 37. `/system/metric-standard` — 지표 측정 데이터 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/metric-standard` |
| 화면 ID | `sys-metric` |
| 라우트 파일 | `app/(main)/system/metric-standard.jsx` |
| MVC | `domains/system/view/MetricStdView.jsx` · `controller/useMetricStdController.js` |
| 기능 ID | SY-13 |
| 접근 권한 | 전산팀 · 통합관리자 |

여기서 정한 **정상 / 주의 / 위험** 값이 **이상 알림 발송 조건(SY-04)** 과 **화면 색상 판정**에 그대로 사용됩니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 발송 조건 관리(권한자) · `Button primary(지표 등록)`) · `Hint` · `StatCard`×4 · `Filters`(구분 / 적용 상태 / 판정) · `Card(tight)`+`Table`(minWidth 1360, **인라인 숫자 편집**) · `Card(tight)`+`Table`(변경 이력) · `openFormModal`(지표 등록) · `openModal`(사용처)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /metrics/standards/summary`)

관리 지표(`total`, 보조 `적용 N · 미적용 M`) · 현재 위험(`badCnt`, tone down) · 현재 주의(`warnCnt`) · 최종 수정(`lastUpdatedAt`, 보조 `lastUpdatedBy`)

### 2-2. 조회 조건

구분(`전체` + 불량 / 설비 장애 / 생산 / 데이터 수집 / 원가) · 적용 상태(`전체` / 적용 / 미적용) · 판정(`전체` / 정상 / 주의 / 위험)

### 2-3. 알림 기준 수치 표 (`GET /metrics/standards`) — 13열

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 구분 `category` | 90 | |
| 지표명 `name` | 160 | bold |
| 단위 `unit` | 68 중앙 | |
| **현재값 `current`** | 96 우측 | `BlindValue(yield)` — 판정별 색(bad=destructive / warn=warningText) |
| **정상 기준 `ok`** | 100 | **`NumberCell`** — 표 안에서 직접 입력, 포커스 아웃 시 저장 |
| **주의 임계 `warn`** | 100 | `NumberCell` |
| **위험 임계 `bad`** | 100 | `NumberCell` |
| 집계 구간 `window` | 104 | |
| 산출 근거 `basis` | flex | wrap |
| 판정 `grade` | 78 | `위험`(red) / `주의`(amber) / `정상`(green) |
| 적용 `enabled` | 80 | `적용`(green) / `미적용` |
| 최종 수정 | 120 | `{updatedAt}\n{updatedBy}` |
| 관리 | 150 | `적용/해제` · `사용처` |

`Hint` : "표 안의 숫자 칸은 직접 입력할 수 있습니다. 값을 바꾸면 즉시 저장되고, 변경 이력은 감사 로그에 기록됩니다. 주의 임계를 넘으면 노랑, 위험 임계를 넘으면 빨강으로 판정합니다."

### 2-4. 기준 수치 변경 이력 (`GET /metrics/standards/history`, 최근 6건)

시각(mono) · 지표 · 항목 · `변경 전 → 후` · 수행자

### 2-5. 사용처 모달 (`GET /metrics/standards/{stdId}/usage`)

`usages[{area, detail}]` → `KeyValue` — 알림 조건 / 대시보드 / 보고서

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| `NumberCell` 편집 | 포커스 아웃 + 값 변경 시 `PUT /metrics/standards/{stdId}` |
| 적용 / 해제 | `PATCH /metrics/standards/{stdId}/state` |
| 사용처 | 모달 |
| 지표 등록 | 폼 → `POST /metrics/standards` |
| 엑셀 다운로드 | 지표 기준 수치 xls (11열) |
| 발송 조건 관리 | `/system/alert-condition` (`alert-cond` 권한자만) |
| 조회 | `reload()` |

### 3-1. 지표 등록 폼

구분(select 필수: 불량 / 설비 장애 / 생산 / 데이터 수집 / 원가) · 지표명(필수) · 단위(select: % / 건 / 분 / 초 / 시간 / EA / 천타 / 백만원) · 정상 기준(number 필수) · 주의 임계(number 필수) · 위험 임계(number 필수) · 집계 구간(select: 즉시 / 5분 연속 / 10분 이동 / 2시간 이동 / 일 마감 / 일 평균 / 월 누계 / 배치별) · 산출 근거(전폭 필수)
안내 : "등록한 기준 수치는 이상 알림·대시보드·보고서 판정에 함께 사용되며, 변경 이력은 감사 로그에 기록됩니다."

**페이징** — 목록·이력 API 모두 `page`/`size` 지원, 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- ⚠️ 구분·단위·집계 구간 선택지가 화면 상수 하드코딩 — 공통코드 연동 검토.
- `direction`(방향) 파라미터가 등록 API 에 있으나 화면 폼 미노출. → 확인 필요

## 5. 사용 API

총 **7건**

**지표 측정 데이터 관리** — 7건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 215 | `getMetricsStandardsSummary` | 지표 기준 요약 | GET | `/api/v1/metrics/standards/summary` | — | totalCnt, appliedCnt, criticalCnt, warnCnt, lastUpdated{at,by} | 전산팀·통합관리자 | — | 2 |
| 216 | `getMetricsStandards` | 지표 기준 목록 조회 | GET | `/api/v1/metrics/standards` | category, applied, level, page, size | items[{stdId,category,name,unit,currentValue,normal,warn,critical,window,basis,level,applied,updatedAt,updatedBy}], meta | 전산팀·통합관리자 | — | 1 |
| 217 | `postMetricsStandards` | 지표 기준 등록 | POST | `/api/v1/metrics/standards` | category, name, unit, normal, warn, critical, window, basis, applied, direction | stdId | 전산팀·통합관리자 | — | 1 |
| 218 | `putMetricsStandardsByStdId` | 지표 기준 수치 수정 | PUT | `/api/v1/metrics/standards/{stdId}` | normal, warn, critical, window, basis | success, level | 전산팀·통합관리자 | — | 1 |
| 219 | `patchMetricsStandardsByStdIdState` | 지표 적용/해제 | PATCH | `/api/v1/metrics/standards/{stdId}/state` | applied(true|false) | success | 전산팀·통합관리자 | — | 1 |
| 220 | `getMetricsStandardsHistory` | 기준 수치 변경 이력 | GET | `/api/v1/metrics/standards/history` | stdId, page, size | items[{ts,metric,field,before,after,by}], meta | 전산팀·통합관리자 | — | 1 |
| 221 | `getMetricsStandardsByStdIdUsage` | 기준 수치 사용처 조회 | GET | `/api/v1/metrics/standards/{stdId}/usage` | — | alertConditions[], dashboards[], reports[] | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] 조회 조건 3종
- [ ] 13열 표 + **인라인 숫자 편집(`NumberCell`, blur 저장)**
- [ ] 판정 색 규칙(정상/주의/위험) · 현재값 마스킹
- [ ] 적용/해제 토글
- [ ] 사용처 모달
- [ ] 지표 등록 폼(8필드)
- [ ] 변경 이력 표
- [ ] 엑셀 다운로드 · 발송 조건 연계
- [ ] (개선) 페이징 · 선택지 공통코드화 · `direction` 필드
