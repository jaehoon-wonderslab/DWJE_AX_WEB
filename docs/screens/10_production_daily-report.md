# 10. `/production/daily-report` — 일일 생산현황 보고

| 항목 | 값 |
| :--- | :--- |
| URL | `/production/daily-report` |
| 화면 ID | `prod-daily` |
| 라우트 파일 | `app/(main)/production/daily-report/index.jsx` |
| MVC | `domains/production/view/DailyReportView.jsx` · `controller/useDailyReportController.js` · `model/productionRepository.js` |
| 기능 ID | PR-03 |
| 접근 권한 | 생산관리팀 · 통합관리자 |

**집계 구간은 전날 08:00 ~ 당일 08:00 고정.** ⑥ 보고서 생성 Agent 가 초안을 만들고 담당자가 보정 후 확정합니다.

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(이전 보고서)` · `Button(엑셀 다운로드)` · `Button primary(초안 재생성)` |
| 1 | 안내 | `Hint` — 집계 구간 고정 안내 |
| 2 | 보고서 초안 | `Card` + `StateBadge` + 섹션별 `TextInput(multiline, 점선 테두리)` + `SourceNote` + 하단 액션 4종 — `Grid cols=[2,1]` 좌 |
| 3 | 집계 요약 | `Card` + `KeyValue` — 〃 우 |
| 4 | 생성 이력 | `Card(tight)` + `ListRow` × 6 — 〃 우 |
| 5 | 반려 폼 | `openFormModal` — 반려 사유 textarea |

## 2. 화면에 출력해야 하는 정보

### 2-1. 보고서 초안 (`GET /production/daily-reports/draft?targetDate=`)

| 항목 | 값 |
| :--- | :--- |
| 카드 제목 | `보고서 초안 · {targetDate}` |
| 카드 부제 | `생성 {generatedAt} · v{version} · 상태 {state}` |
| 상태 배지 | `StateBadge(state)` — 검토 대기 / 확정 / 반려 |
| 섹션 | `sections[{key, title, body, who}]` — `who='auto'` → 초록 `자동 기입`, 아니면 주황 `확인 필요` |
| 섹션 본문 | **인라인 편집 가능** (`TextInput multiline`) |
| 출처 각주 | `draft.source` |
| 미저장 표시 | 편집 내용이 서버 값과 다르면 "수정한 내용이 저장되지 않았습니다" |

### 2-2. 집계 요약 (`draft.summary`)

대상 기간 `period` · 대상 라인 `lines` · 투입 `inputQty EA` · 양품 `okQty EA` · 불량 `ngQty EA ({defectRate}%)` · 가동률 `uptimeRate%` · 이상 알림 `alertCnt건`

### 2-3. 생성 이력 (`GET /production/daily-reports/{reportId}/events`)

`type`(제목) · `{detail} · {by}`(설명) · `ts`(MM-DD HH:mm) — 최근 6건

## 3. 버튼 및 페이징

| 버튼 | 위치 | 동작 |
| :--- | :--- | :--- |
| 이전 보고서 | 헤드 | `/production/daily-report/history` |
| 엑셀 다운로드 | 헤드 | 섹션 제목·본문 xls (개행 → 공백) |
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
- 대상 일자는 `useAppStore.baseDate`.

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


## 6. 개발 체크리스트

- [ ] 초안 조회 + 상태 배지
- [ ] 섹션 인라인 편집 (자동 기입 / 확인 필요 배지)
- [ ] 미저장 변경 표시(`dirty`)
- [ ] 임시 저장 / 항목 보정 / 확정 / 반려(사유 필수) 4액션
- [ ] 초안 재생성
- [ ] 집계 요약 `KeyValue`
- [ ] 생성 이력 목록
- [ ] 이전 보고서 화면 이동
- [ ] 엑셀 다운로드
