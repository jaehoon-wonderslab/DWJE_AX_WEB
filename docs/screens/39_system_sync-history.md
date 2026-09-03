# 39. `/system/sync-history` — 데이터 연동 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/sync-history` |
| 화면 ID | `sys-sync` (메뉴 태그 **필수**) |
| 라우트 파일 | `app/(main)/system/sync-history.jsx` |
| MVC | `domains/system/view/SyncHistoryView.jsx` · `controller/useSyncHistoryController.js` |
| 기능 ID | SY-15 |
| 접근 권한 | 전산팀 · 통합관리자 |

사내 MES(**MSSQL**) → AX 플랫폼(**PostgreSQL**) 이관 작업 이력. 실패 건은 원인 확인 후 재실행합니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 연동 테스트 · `Button primary(수동 이관)`) · `StatCard`×**5** · `Filters`(상태 / 방식) · `Card(tight)`+`Table`(이관 작업 이력, minWidth 1280) · `Card(tight)`+`Table`(**스키마 드리프트**, minWidth 1180) · `Grid cols=[3,2]` → `Card(tight)`(연동 매핑) / `Card`(연동 정책 `KeyValue`) · 모달 5종

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 5종 (`GET /sync/jobs/summary`, `/sync/schema-drift/summary`)

금일 이관 건수(`todayRows`, 보조 "성공 기준") · 실패 건수(`failRows`, 보조 `실패 작업 N건` / `전체 정상`) · 평균 소요(`avgDurationMin` 분) · 진행 중(`runningCnt`, 보조 `30초마다 자동 새로고침` / `진행 중 작업 없음`) · **스키마 드리프트**(`openCnt`, 보조 `최다 발견 N회` / `이관 정의와 일치`)

### 2-2. 조회 조건

상태(`전체` / 예약 대기 / 완료 / 진행 중 / 실패 / 재시도 완료) · 방식(`전체` / 증분 / 전체)

### 2-3. 이관 작업 이력 표 (`GET /sync/jobs`)

작업 ID(mono) · 원본(MSSQL, mono) · 대상(PostgreSQL, mono) · 방식(중앙) · **시작**(예약 대기면 `예약 {scheduledAt}`) · 소요 · 대상 건수 · 성공 · **실패**(있으면 `Badge red`) · 상태(`완료`/`재시도 완료`→green, `실패`→red, **`예약 대기`→amber**, 그 외 blue) · 관리(`재실행`(실패 시) / `상세`)
행 클릭 → 상세 모달.

### 2-4. 스키마 드리프트 표 (`GET /sync/schema-drift`)

발견 위치(`SOURCE`→`원본 (MES)` / `TARGET`→`대상 (AX)`) · 구분(`NEW`→`신규`(blue) / `MISSING`→`유실`(red)) · 테이블(mono) · 이관 정의(`map {mapId}` / `없음`) · 최초 발견 · 최종 발견 · **발견 횟수**(3회 이상이면 `Badge red`) · 관리(`해소`(green) / `Button(해소 처리)`)

카드 부제 : 미해소 건이 있으면 `미해소 N건 · 원본 신규 A / 원본 유실 B / 대상 신규 C / 대상 유실 D`, 없으면 "이관 정의와 원본·대상 테이블 구성이 일치합니다"
카드 우측 : `Button(전체 위치 / 원본 (MES) / 대상 (AX))` 순환 토글 · `Button(미해소만 / 해소 건 포함)` 토글

### 2-5. 연동 매핑 (`GET /sync/maps`)

원본(MSSQL, mono) · 대상(PostgreSQL, mono) · 방식 · 기준 컬럼(mono) · 주기

### 2-6. 연동 정책 (`GET /sync/policy`)

`KeyValue` — 원본 · 대상 · 이관 방식 · 정합성 검증 · 재시도 + `note`

## 3. 버튼 · 모달

| 버튼 | 동작 |
| :--- | :--- |
| 연동 테스트 | `POST /sync/connection-test` → 모달(대상별 성공/실패 배지 + 응답 ms) |
| 수동 이관 | 폼(대상 테이블 select / 이관 방식 증분·전체 / 실행 시점 지금·다음 배치 02:00) → `POST /sync/jobs/manual` |
| 재실행 | 확인 모달 → `POST /sync/jobs/{jobId}/retry` |
| 상세 / 행 클릭 | 모달(`GET /sync/jobs/{jobId}`) |
| 해소 처리 | 폼(내용 static + 조치 내용 textarea 필수) → `POST /sync/schema-drift/{driftId}/resolve` |
| 드리프트 행 클릭 | 상세 모달 |
| 엑셀 다운로드 | 이관 이력 xls (11열) |
| 조회 | `reload()` |

### 3-1. 이관 작업 상세 모달

`KeyValue` — 원본(MSSQL) · 대상(PostgreSQL) · 시작 시각 · 종료 시각(없으면 `진행 중`) · 소요 시간 · 대상 건수 · 이관 성공 · 실패 · **정합성 검증**(`일치 — 건수·체크섬 대조 완료`(green) / `불일치 — 원본·대상 건수 차이 N`(red)) · 상태
실패 원인이 있으면 각주. 실패 건이 있으면 푸터에 `재실행`.

재실행 확인 문구 : "실패 N건만 재실행합니다 (성공 M건은 건너뜁니다). 재실행 전에 대상 스키마를 먼저 수정해야 같은 오류가 반복되지 않습니다."

### 3-2. 스키마 드리프트 상세 모달

`KeyValue` — 대상 테이블 · 이관 정의 · 최초 발견 · 최종 발견 · 발견 횟수 · 상태 · (해소 시) 해소 일시 · 해소 처리 · 조치 내용. 각주 `detail`.
해소 폼 안내 : "원인이 남아 있으면 다음 배치에서 이관 엔진이 같은 건을 다시 엽니다."

**페이징** — 작업 이력·드리프트 API 모두 `page`/`size` 지원, 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- **조건부 폴링 30초** — `items` 중 `state === '진행 중'` 이 있을 때만 (`hasRunning`).
- 조회는 `silent: true`, 첫 로드에만 `Loading`.
- 수동 이관 안내 : "전체 이관은 대상 테이블을 비우고 다시 채우므로 조회가 잠시 느려질 수 있습니다."

## 5. 사용 API

총 **11건**

**데이터 연동 이력** — 11건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 226 | `getSyncJobsSummary` | 연동 요약 | GET | `/api/v1/sync/jobs/summary` | date | syncState, todayRows, failedRows, failedJobCnt, avgDurationMin, lastBatchAt | 전산팀·통합관리자 | — | 1 |
| 227 | `getSyncJobs` | 이관 작업 이력 조회 | GET | `/api/v1/sync/jobs` | from, to, srcTable, state, page, size | items[{jobId,srcTable,dstTable,kind,startedAt,endedAt,duration,rows,okRows,ngRows,state}], meta | 전산팀·통합관리자 | — | 1 |
| 228 | `getSyncJobsByJobId` | 이관 작업 상세 | GET | `/api/v1/sync/jobs/{jobId}` | — | job{}, params{}, errors[{rowNo,message,rawData}] | 전산팀·통합관리자 | — | 1 |
| 229 | `postSyncJobsByJobIdRetry` | 이관 작업 재실행 | POST | `/api/v1/sync/jobs/{jobId}/retry` | — | newJobId | 전산팀·통합관리자 | — | 1 |
| 230 | `postSyncJobsManual` | 수동 이관 예약 | POST | `/api/v1/sync/jobs/manual` | srcTables[], kind(full|incremental), scheduledAt | jobIds[] | 전산팀·통합관리자 | — | 1 |
| 231 | `postSyncConnectionTest` | 연결 테스트 | POST | `/api/v1/sync/connection-test` | target(mssql|postgresql|all) | results[{target,connected,responseMs,version}] | 전산팀·통합관리자 | — | 1 |
| 232 | `getSyncMaps` | 연동 매핑 조회 | GET | `/api/v1/sync/maps` | srcTable | items[{srcTable,srcColumn,dstSchema,dstTable,dstColumn,transform}] | 전산팀·통합관리자 | — | 1 |
| 233 | `getSyncPolicy` | 연동 정책 조회 | GET | `/api/v1/sync/policy` | — | batchCron, incrementalKey, retryPolicy, failAlertCondId, retentionDays | 전산팀·통합관리자 | — | 2 |
| 234 | `getSyncSchemaDriftSummary` | 스키마 드리프트 요약 | GET | `/api/v1/sync/schema-drift/summary` | — | driftState, openCnt, sourceNewCnt, sourceMissingCnt, targetNewCnt, targetMissingCnt, maxDetectCnt, lastCheckedAt | 전산팀·통합관리자 | — | 1 |
| 235 | `getSyncSchemaDrift` | 스키마 드리프트 목록 조회 | GET | `/api/v1/sync/schema-drift` | side(SOURCE|TARGET), kind(NEW|MISSING), resolved, page, size | items[{driftId,side,kind,objectName,mapId,detail,firstSeenAt,lastSeenAt,detectCnt,resolved}], meta | 전산팀·통합관리자 | — | 1 |
| 236 | `postSyncSchemaDriftByDriftIdResolve` | 스키마 드리프트 해소 처리 | POST | `/api/v1/sync/schema-drift/{driftId}/resolve` | note | driftId, resolved | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 5카드 (드리프트 포함)
- [ ] 이관 이력 표 11열 + 예약 대기 상태 구분 + 재실행 버튼
- [ ] 작업 상세 모달 + 정합성 검증 배지 + 실패 원인
- [ ] 스키마 드리프트 표 + 위치/해소 필터 토글 + 발견 횟수 강조
- [ ] 드리프트 상세 · 해소 처리 폼
- [ ] 연동 매핑 표 · 연동 정책 카드
- [ ] 연동 테스트 모달
- [ ] 수동 이관 예약 폼
- [ ] 조건부 30초 폴링
- [ ] 엑셀 다운로드
- [ ] (개선) 목록 페이징
