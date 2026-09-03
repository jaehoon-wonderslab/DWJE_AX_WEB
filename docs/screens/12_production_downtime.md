# 12. `/production/downtime` — 비가동 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/downtime` |
| 화면 ID | `prod-down` |
| 라우트 파일 | `app/(main)/production/downtime.jsx` |
| MVC | `domains/production/view/DowntimeView.jsx`(+`components/DowntimeForm.jsx`) · `controller/useDowntimeController.js` |
| 기능 ID | PR-05 |
| 접근 권한 | 생산관리팀 · 제조팀 · 통합관리자 |

설비 정지 사유를 등록·관리합니다. **⑨ 이상 알림 Agent 가 사유 후보를 제안**하며, 등록 결과는 설비 가동률 산출 근거가 됩니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(엑셀 다운로드)` · `Button primary(비가동 등록)` |
| 1 | 미등록 경고 | `Hint` — 미등록 건이 있을 때만 |
| 2 | 요약 | `StatCard` × 4 (`Grid cols=4`) |
| 3 | 조회 조건 | `Filters` + `DateField`(일자) + `SelectField`(설비 / 사유) + `Button primary(조회)` |
| 4 | 비가동 이력 | `Card(tight)` + `Table`(minWidth 900) + `Pagination` |
| 5 | 등록·수정 모달 | `openModal` + `DowntimeForm` |

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /production/downtimes/summary`)

| 카드 | 값 | 보조 |
| :--- | :--- | :--- |
| 총 비가동 | `minutesText(totalMin)` | `{date} 기준` |
| 사유 등록 | `registeredCnt` 건 | 가동률 산출 반영 |
| 사유 미등록 | `unregisteredCnt` 건 | 원인 불명 집계 (tone down) |
| 최다 사유 | `byReason` 중 `min` 최대 항목의 `reason` | `{minutesText(min)} 누계` |

미등록 경고 : "사유가 등록되지 않은 정지 구간은 가동률 산출에서 원인 불명으로 집계됩니다. 현재 미등록 N건이 있습니다."

### 2-2. 비가동 이력 표 (`GET /production/downtimes`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 설비 `eqptCd` | 88 mono | |
| 정지 시각 `stopAt` | 92 중앙 | |
| 복구 시각 `resumeAt` | 92 중앙 | 없으면 `—` |
| 정지 시간 `elapsedMin` | 92 우측 | `minutesText()` |
| 사유 `reasonNm` | flex | 미등록이면 `Badge(red) 미등록` |
| 제안 사유 `suggestion` | flex | 없으면 `—` |
| 등록 | 92 | 등록됨 → `Button(수정)` / 미등록 → `Button primary(등록)` |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 비가동 등록 | 빈 폼 모달 (`row = null`) |
| 등록 / 수정 (행) | 해당 행으로 폼 모달 |
| 조회 | `reload()` + 건수 토스트 |
| 엑셀 다운로드 | 이력 xls (설비·정지·복구·정지 시간·사유·제안 사유·비고) |

**페이징** — `usePaging({resetKey: date|eqptCd|reasonCd})` + `Pagination`.

### 3-1. 비가동 사유 등록·수정 폼 (`DowntimeForm`)

| 항목 | 컴포넌트 | 비고 |
| :--- | :--- | :--- |
| 설비 | `SelectField` (required) | 설비가 바뀌면 Agent 제안을 다시 받음 |
| 정지 시각 | `TextField` (required) | `예) 08:12` |
| 복구 시각 | `TextField` | 미복구면 비움 |
| **Agent 제안 사유** | 카드형 선택 목록 | `reasonNm` · `basis`(근거) · `confidence`(%) — 클릭 시 사유 선택 |
| 사유 (표준 분류) | `SelectField` (required) | 공통코드 `codes[]` |
| 비고 | `TextAreaField` (2행) | 조치 내용·특이사항 |
| 각주 | `SourceNote` | "등록한 사유는 설비 가동률 산출과 이상 알림 판정 근거로 함께 쓰입니다. 제안 사유는 … 반드시 확인 후 선택하세요." |
| 제출 | `Button primary(등록/수정)` | 사유 미선택 시 토스트로 막음 |

`downtimeId` 유무로 `POST /production/downtimes` ↔ `PUT /production/downtimes/{downtimeId}` 분기.

## 4. 그 밖의 기능

- Agent 제안은 `GET /production/downtimes/reason-suggestion?eqptCd=&stopAt=` — 폼 안에서 설비/시각이 바뀔 때마다 재조회(`alive` 플래그로 경쟁 방지).
- 설비 선택지는 `loadEquipmentOptions()` 서버 기준정보, 사유 선택지는 응답 `codes` 기반.
- ⚠️ `DowntimeForm` 상단의 `EQUIPMENTS = ['PR-01'…'PR-10']` 는 하드코딩 잔재 — **서버 기준정보로 교체 필요**.

## 5. 사용 API

총 **5건**

**비가동 관리** — 5건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 68 | `getProductionDowntimesSummary` | 비가동 요약 | GET | `/api/v1/production/downtimes/summary` | date | totalMin, registeredCnt, unregisteredCnt, byReason[] | 생산관리팀·제조팀·통합관리자 | — | 1 |
| 69 | `getProductionDowntimes` | 비가동 이력 조회 | GET | `/api/v1/production/downtimes` | date, eqptCd, reasonCd, registered, page, size | items[{eqptCd,stopAt,resumeAt,elapsedMin,registered,reasonCd,reasonNm,remark}], meta | 생산관리팀·제조팀·통합관리자 | — | 1 |
| 70 | `getProductionDowntimesReasonSuggestion` | Agent 사유 후보 제안 | GET | `/api/v1/production/downtimes/reason-suggestion` | eqptCd, stopAt | candidates[{reasonCd,reasonNm,confidence,basis}] | 생산관리팀·제조팀·통합관리자 | — | 1 |
| 71 | `postProductionDowntimes` | 비가동 사유 등록 | POST | `/api/v1/production/downtimes` | eqptCd, stopAt, resumeAt, reasonCd, remark | downtimeId | 생산관리팀·제조팀·통합관리자 | — | 1 |
| 72 | `putProductionDowntimesByDowntimeId` | 비가동 사유 수정 | PUT | `/api/v1/production/downtimes/{downtimeId}` | reasonCd, remark, resumeAt | success | 생산관리팀·제조팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드 + 미등록 경고
- [ ] 이력 표 + 미등록 배지 + 행별 등록/수정 버튼
- [ ] 서버 페이징
- [ ] 등록·수정 폼 모달 (등록/수정 분기)
- [ ] Agent 사유 후보 제안 카드 (근거 · 신뢰도) + 선택 연동
- [ ] 설비/사유 선택지 서버 연동 (**폼 내 하드코딩 제거**)
- [ ] 엑셀 다운로드
