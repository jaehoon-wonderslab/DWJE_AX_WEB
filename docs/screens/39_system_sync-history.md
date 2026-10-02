# 39. `/system/sync-history` — 데이터 연동 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/sync-history` |
| 화면 ID | `sys-sync` (메뉴 태그 **필수**) |
| 라우트 파일 | `app/(main)/system/sync-history.jsx` |
| MVC | `domains/system/view/SyncHistoryView.jsx` · `controller/useSyncHistoryController.js` · `model/syncModel.js`(가림·재실행 판정·상태 줄 문구) · `model/gridExport.js`(조회 목록 엑셀) |
| 기능 ID | SY-15 |
| 접근 권한 | 조회 — `sys-sync` 화면 권한(전산팀 · 통합관리자). 재실행·드리프트 해소 — `sys-sync` **쓰기 권한**(R-06, 서버 `requireWrite`) |
| 기획 | `web 기획/12_sys-sync_데이터연동이력.md` (2026-10-01 SYN-01·02·03·05·07·14·15 반영) |

사내 MES(**MSSQL**) → AX 플랫폼(**PostgreSQL**) 이관 작업 이력. (머리말의 "실패 건은 원인 확인 후 재실행할 수 있습니다" 문구는 2026-09-08 삭제 — 재실행 자체는 표의 「재실행」 버튼으로 계속 됩니다)

## 1. 컴포넌트

`PageHead`(동작 단추 없음 — 머리말 엑셀 단추는 2026-10-01 **제거됨**, 연동 테스트 · 수동 이관 버튼은 2026-09-08 삭제) · `FormAlert`(조회 일부 실패) · **연동 상태 줄** · `StatCard`×**2** · `Filters`(기간 · 상태) · `Card`+`TabulatorGrid`(엔진 실행 이력, 카드 오른쪽 위 `ExportMenuButton`) · `Card`+`TabulatorGrid`(이관 작업 이력 + `Pagination`, 카드 오른쪽 위 `ExportMenuButton`) · 모달 5종

**스키마 드리프트 · 연동 매핑 카드는 숨김** (2026-09-08 요청, 뷰의 `SHOW_DRIFT_CARD` · `SHOW_MAP_CARD` 플래그 — 코드는 남아 있어 `true` 로 되돌릴 수 있습니다). 두 카드의 엑셀 단추도 카드 안에 있어 함께 숨고 함께 돌아옵니다.

표는 모두 `TabulatorGrid` 입니다 — 머리글 클릭 정렬(shift 로 다중) · 열 폭 조절. 행 자료는 응답 그대로 두고 배지·버튼은 셀 formatter(HTML `.tag` · `.tbtn`)로 그립니다. 각 열의 width/minWidth 는 그대로이고 좁은 화면은 카드 안에서 가로 스크롤합니다. **연동 정책 카드는 제거**했습니다 (2026-09-08, `GET /sync/policy` 는 이 화면에서 더 부르지 않습니다).

엑셀 패널은 공통 `ExportMenuButton` 이 포털로 그려 카드에 가리지 않습니다(2단계에 두었던 카드 `zIndex` 회피 코드는 **제거됨**).

## 2. 화면에 출력해야 하는 정보

### 2-0. 연동 상태 줄 (`GET /sync/jobs/summary`, SYN-03)

카드 위 한 줄. 카드 수는 늘리지 않습니다(2026-09-08 요청).

| healthState | 표시 |
| :--- | :--- |
| `OK` | 회색 — "정상 · 마지막 정상 이관 09-30 12:25 (3분 전) · 최근 실행 완료" |
| `WARN` | 주황 — 「주의」 배지 + `healthReason` |
| `DOWN` | 빨강 — 「중단」 배지 + `healthReason` |
| (필드 없음 — 이전 서버) | 회색 "연동 상태 판정 대기 — 마지막 배치 …" |
| 요약 조회 실패 | 회색 "연동 상태를 확인하지 못했습니다 — {서버 메시지}", 카드 값 `—` |

- `openFailJobCnt > 0` 이면 「실패 작업 보기」 — 상태 `FAIL` + 기간 시작일 = `oldestOpenFailAt` 날짜(종료일 오늘)로 조회합니다(SYN-08). 기본 기간(최근 7일) 밖의 미조치 실패도 보입니다.
- 요약에 `alert` 가 오면 "실패 알림 조건 N건 · 미확인 알림 M건" + 「알림 목록」(`/alert/list`). 조건이 0건이면 "이관 실패 알림 조건이 없습니다" + 「발송 조건 등록」(`alert-cond` 권한이 있을 때만).

### 2-1. 요약 카드 2종 (`GET /sync/jobs/summary`)

금일 이관 건수(`todayRows`, 보조 "성공 기준" · 진행 중·예약 대기 작업이 있으면 `30초마다 새로고침` 안내) · **미조치 실패**(`openFailJobCnt` 건, 보조 "오늘 실패 실행 N회 · 오래된 예약 N건", 0 이면 "조치할 실패 없음")

- 서버가 `openFailJobCnt` 를 아직 주지 않으면 실패 작업 수(`failedJobCnt`)를 "서버 판정 대기" 보조 문구와 함께 보여 줍니다.
- 예전 「실패 건수(행수)」 카드는 2026-10-01 **제거됨**(작업 상세에서 봅니다). 평균 소요 · 진행 중 · 스키마 드리프트 카드는 2026-09-08 요청으로 **삭제**했습니다.

### 2-2. 조회 조건

기간 시작 · 기간 종료(비우면 서버 기본 최근 7일, 최대 92일, 「조회」 로 적용, 실행 이력과 공유) · **원본 테이블**(연동 매핑 `GET /sync/maps` 의 `srcTable` — 스키마 없는 테이블명, 고르면 바로 조회, SYN-08) · 상태(공통코드 `SYNC_STATE` — 값은 코드 `PENDING`·`RUNNING`·`DONE`·`FAIL`·`RETRY_DONE`·`ABORTED`, 표시는 `code_nm`. 고르면 바로 조회). 공통코드가 오기 전에는 「전체」 만 보이고 안내 문구가 붙습니다. 한글 표시값을 서버에 보내지 않습니다(SYN-01 — 보내면 400).

방식(증분/전체) 선택과 `kind` 요청 파라미터는 **제거됨**(서버가 받지 않는 파라미터).

### 2-3. 엔진 실행 이력 표 (`GET /sync/runs`, SYN-09)

카드 안 조건 — 결과(`SYNC_RUN_STATE`) · 출처(`MES 이관`(기본, 그룹웨어 제외) / `그룹웨어 인사정보` / `전체` → `source=MES|GROUPWARE`, 기획 8장 Q7 제안 이름). 기간은 위 조건과 공유. 표 아래 `Pagination`(20 · 50 · 100).
출처·실행(`runId`)은 서버가 거릅니다(API 3단계). 3단계에 두었던 화면 쪽 이중 거름은 **제거됨**.

행 클릭 — 표 작업이 있는 실행(대상 테이블 > 0, 점검 실패·대상 없음·건너뜀 제외)이면 작업 이력을 그 `runId` 로 거르고 작업 카드 부제가 "실행 RUN-… 의 작업 N건" + 「실행 조건 해제」 로 바뀝니다. 작업이 없는 실행이면 **엔진 실행 상세** 모달(상태 · 시작 · 종료 · 소요 · 실행 주체 · 옵션 · 모의 · 대상 테이블 · 엔진 버전 · 메시지 전문(가림), 호스트는 넣지 않음).

실행 ID · 방식(+「모의」) · 시작 · 소요 · 대상 테이블 · 성공 · 실패 · 이관 행수 · 상태 · 메모(**내부 주소 가림**, SYN-05 — 서버가 가리고 화면이 한 번 더 같은 규칙을 적용: IPv4 → `***.***.***.***`, `호스트 X, 포트 N`·`host X, port N` 의 호스트 → `(가림)`, `jdbc:` 접속 문자열 → `(접속 문자열 가림)`. 포트·원인 문구는 남깁니다). 메모 전문은 마우스를 올려 봅니다.

### 2-4. 이관 작업 이력 표 (`GET /sync/jobs`)

작업 ID(mono, 재실행 작업이면 아래에 회색 `← 원 작업 ID`, 방금 등록한 재실행 작업은 1분 동안 「방금 등록」 태그) · 원본(MSSQL, mono) · 대상(PostgreSQL, mono) · 방식(공통코드 표시명, 폭 64) · **시작**(예약 대기면 `예약 {scheduledAt}`) · 소요 · 대상 건수 · 성공 · **실패**(있으면 `Badge red`) · 상태(공통코드 `SYNC_STATE` 표시명 — 색은 `jobStateTone`. 예약 시각이 10분 넘게 지난 예약 대기는 「지연」 amber 태그) · 관리
행 클릭 → 상세 모달.

**관리 열** (SYN-02·14)

| 조건 | 단추 |
| :--- | :--- |
| 재실행 대상(서버 `retryable`, 없으면 상태 FAIL·ABORTED) · 쓰기 권한 있음 | 「재실행」 |
| 재실행 대상 · 쓰기 권한 없음 | 「재실행」 비활성 + 툴팁 "이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요." (카드 아래 각주에도 같은 안내) |
| 그 밖(완료·진행 중·이미 재실행 예약됨) | 「상세」 |

예전 기준(`ngRows > 0`)은 2026-10-01 **제거됨** — 행 실패 없이 검증만 어긋난 FAIL 을 놓쳤습니다.

빈 상태 : "선택한 조건의 이관 작업이 없습니다. 기간을 넓히거나 상태를 「전체」로 바꿔 보십시오." 조회가 실패하면 빈 상태 문구 대신 "불러오지 못했습니다 — {서버 메시지}" (SYN-01).

### 2-5. 스키마 드리프트 표 (`GET /sync/schema-drift`) — **숨김**

발견 위치(`SOURCE`→`원본 (MES)` / `TARGET`→`대상 (AX)`) · 구분(`NEW`→`신규`(blue) / `MISSING`→`유실`(red)) · 테이블(mono) · 이관 정의(`map {mapId}` / `없음`) · 최초 발견 · 최종 발견 · **발견 횟수**(3회 이상이면 `Badge red`) · 관리(`해소`(green) / `Button(해소 처리)` — 쓰기 권한 없으면 비활성)

카드 부제 : 미해소 건이 있으면 `미해소 N건 · 원본 신규 A / 원본 유실 B / 대상 신규 C / 대상 유실 D`, 없으면 "이관 정의와 원본·대상 테이블 구성이 일치합니다"
카드 우측 : `Button(전체 위치 / 원본 (MES) / 대상 (AX))` 순환 토글 · `Button(미해소만 / 해소 건 포함)` 토글 · `ExportMenuButton`

### 2-6. 연동 매핑 (`GET /sync/maps`) — **숨김**

원본(MSSQL, mono) · 대상(PostgreSQL, mono) · 방식 · 기준 컬럼(mono) · 주기. 카드 우측 `전체 다운로드 (N건)` 단일 단추(13행 남짓이라 패널 없음).

## 3. 버튼 · 모달

| 버튼 | 동작 |
| :--- | :--- |
| 재실행 | 상세를 먼저 받아 문구를 채운 확인 모달 → `POST /sync/jobs/{jobId}/retry`. 쓰기 권한이 없으면 비활성 |
| 상세 / 행 클릭 | 모달(`GET /sync/jobs/{jobId}`). 실패하면 토스트 "작업 상세를 불러오지 못했습니다 — {메시지}" |
| 해소 처리 | 폼(내용 static + 조치 내용 textarea 필수) → `POST /sync/schema-drift/{driftId}/resolve`. 쓰기 권한이 없으면 비활성 |
| 드리프트 행 클릭 | 상세 모달 |
| 실패 작업 보기 | 상태 FAIL · 기간 시작 = `oldestOpenFailAt` |
| 엑셀 다운로드 ▾ (카드마다) | 패널 — 「조회 목록 다운로드(n건)」 / 「전체 다운로드」 (아래 3-3) |
| 조회 · 초기화 | 기간 적용 / 조건 비움 |

### 3-1. 이관 작업 상세 모달

`KeyValue` — 원본(MSSQL) · 대상(PostgreSQL) (목록 행 값, 없으면 `params`) · 소속 실행(`runId`) · 원본 DB · 키 컬럼 · 증분 기준 컬럼 · 주기(`params`) · 시작 시각 · 종료 시각 · 소요 시간 · 대상 건수 · 이관 성공 · 실패(`ngRows>0` 이면 "N 건(스테이징 적재 실패)", FAIL 이고 0 이면 "행 실패 없음 — 아래 실패 원인 참고") · **정합성 검증**(`true` 일치(green) / `false` 불일치(red) / `null` 검증 전(또는 미수행)) · 실행 경로(공통코드 `SYNC_TRIGGER` 표시명 + 요청자) · 재시도 · 상태
각주 — 실패 원인(`remark`, 가림 적용) · 재실행됨 → {새 작업 ID} ({상태}) · 이후 정상 완료 {작업 ID} · 쓰기 권한 안내 · 재실행할 수 없는 이유(`retryBlockedReason`).
**오류 상세 표**(SYN-07) — `TabulatorGrid`: 순번(64) · 오류 코드(90) · 메시지(minWidth 320, 줄바꿈) · 원본 키(minWidth 200, mono — `srcKey`, 없으면 `rawData` 의 키 부분). 행을 누르면 아래에 원본 행 JSON(`payload` → `rawData`)을 펼칩니다. 500건을 넘으면 "앞 500건만 표시합니다".
푸터 — 재실행 대상이면 `재실행`(쓰기 권한 없으면 비활성).

재실행 확인 문구 (SYN-07)
- 부제: `{작업 ID} · {원본} → {대상}` (값이 없으면 빼고 `undefined` 를 쓰지 않음)
- 전체(FULL): "{대상} 을(를) 원본 전체로 다시 이관합니다. 대상 테이블 내용이 원본 기준으로 교체됩니다."
- 증분(INCR): "{대상} 을(를) 마지막 정상 이관 시점(워터마크) 이후 구간으로 다시 이관합니다."
- 끝문장: "원인이 남아 있으면 같은 오류가 반복됩니다." `supersededBy` 가 있으면 "이후 {시각} 작업 {ID} 가 정상 완료되었습니다. 재실행이 필요한지 확인하십시오."
- 예전 문구 "실패 N건만 재실행합니다 (성공 M건은 건너뜁니다)…" 는 **제거됨**(엔진은 테이블 단위로 다시 돌립니다).

재실행 성공 토스트: "재실행을 등록했습니다 — {newJobId}. 이관 엔진이 1분 안에 실행합니다". 같은 작업은 요청 중·등록 직후 다시 누를 수 없고, 새 목록이 오면 서버 `retryable` 을 따릅니다. 409(대상 상태 아님·이미 예약됨)·403(`E-AUTH-004` 쓰기 권한 없음)은 서버 문구를 토스트로 보여 줍니다.

### 3-2. 스키마 드리프트 상세 모달

`KeyValue` — 대상 테이블 · 이관 정의 · 최초 발견 · 최종 발견 · 발견 횟수 · 상태 · (해소 시) 해소 일시 · 해소 처리 · 조치 내용. 각주 `detail`.
해소 폼 안내 : "원인이 남아 있으면 다음 배치에서 이관 엔진이 같은 건을 다시 엽니다."

### 3-3. 엑셀 다운로드 옵션 패널 (SYN-15 · 공통 CMN-07)

| 표 | 조회 목록 다운로드(n건) — `scope=VIEW` | 전체 다운로드 — `scope=ALL` |
| :--- | :--- | :--- |
| 이관 작업 이력 | 그리드 현재 쪽 행(정렬·열 필터·열 순서 그대로) + 종료 · 원 작업 · 정합성 · 재시도 · 실행 경로 · 소속 실행 · 실패 원인(가림) 열. 브라우저 생성 | `POST /sync/export {target:'JOBS'}` 서버 생성 xlsx (상한 50,000) |
| 엔진 실행 이력 | 현재 20건 + 종료 · 모의 여부 · 실행 주체 · 엔진 버전(호스트 제외) | `{target:'RUNS'}` (상한 10,000) |
| (숨김) 스키마 드리프트 | 표에 보이는 행 | `{target:'DRIFTS'}` (상한 10,000) |
| (숨김) 연동 매핑 | — | 단일 「전체 다운로드(N건)」 브라우저 생성 |

- 「조회 목록」 은 `downloadXls({ head, attrs, rows, scope:'VIEW', condSummary, menuId:'sys-sync' })` — `attrs` 는 열 순서의 응답 필드명(데이터 접근 권한 마스킹, R-10). `condSummary` 예: `기간=기본(최근 7일) · 상태=FAIL · 쪽 1/3`.
- 「전체」 는 건수를 미리 모르므로 건수 없이 표기합니다. 다운로드 이력은 서버가 남기므로 화면은 `logDownload` 를 부르지 않습니다(`downloadFromServer`).
- 내려받기는 조회 권한이면 됩니다(쓰기 권한 불필요).

**페이징** — 작업 이력(50)·실행 이력(20) 모두 `Pagination`(서버 `meta`). 서버 생성 「전체」 파일이 상한에 걸리면 응답 헤더 `X-Export-Truncated`·`X-Export-Total` 로 안내합니다.

## 4. 그 밖의 기능

- **조회 범위(SYN-10)** — 진입·폴링마다 요약·작업·실행 3건만 부릅니다. 연동 매핑(`GET /sync/maps`, 원본 테이블 선택지)은 진입 때 한 번만, 숨긴 드리프트 카드의 요약·목록은 카드가 보일 때(`SHOW_DRIFT_CARD`, `model/syncModel.js`)만 부릅니다.
- **조건부 폴링 30초** — 작업 중 진행 중(`RUNNING`) 또는 예약 대기(`PENDING`)가 있거나 요약 `runningJobCnt > 0` 일 때 (`hasRunning`, SYN-06).
- 조회는 `silent: true`, 첫 로드에만 `Loading`. 한 조회가 실패해도 나머지는 그리고, 머리말 아래 `FormAlert` 에 "일부 조회가 실패했습니다 (영역) — {대표 오류}" (`firstError`).
- 수동 이관 안내 : "전체 이관은 대상 테이블을 비우고 다시 채우므로 조회가 잠시 느려질 수 있습니다." (버튼 삭제, 컨트롤러 `runManual` 은 남김)

## 5. 사용 API

화면이 부르는 API **9건** (연동 정책 `getSyncPolicy` 는 카드 제거로, 수동 이관 `postSyncJobsManual` · 연결 테스트 `postSyncConnectionTest` 는 버튼 삭제로 화면 미사용 — 컨트롤러에는 남아 있음). 2026-10-01 `postSyncExport` 1건 추가.

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | 우선순위 |
|---|---|---|---|---|---|---|---|---|
| 226 | `getSyncJobsSummary` | 연동 요약 | GET | `/api/v1/sync/jobs/summary` | date | syncState, todayRows, failedRows, failedJobCnt, runningJobCnt, lastBatchAt, **healthState, healthReason, lastRun{…}, lastSuccessAt, staleMin, consecutiveFailRuns, todayFailRunCnt, openFailJobCnt, oldestOpenFailAt, stalePendingCnt, alert{condCnt,openAlertCnt,lastAlertAt}** | 조회 | 1 |
| 227 | `getSyncJobs` | 이관 작업 이력 조회 | GET | `/api/v1/sync/jobs` | from, to, state(코드), page, size (서버: srcTable, runId, includePending) | items[{jobId,srcTable,dstTable,kind,startedAt,endedAt,scheduledAt,duration,rows,okRows,ngRows,state,**retryOfJobId,retryable**}], meta | 조회 | 1 |
| 236.5 | `getSyncRuns` | 엔진 실행 이력 | GET | `/api/v1/sync/runs` | size | items[{runId,mode,modeNm,state,stateNm,startedAt,durationSec,tableCnt,successCnt,failCnt,okRows,dryRun,message(가림)…}], meta | 조회 | 1 |
| 228 | `getSyncJobsByJobId` | 이관 작업 상세 | GET | `/api/v1/sync/jobs/{jobId}` | — | job{…,checksumMatch(true\|false\|null),triggeredBy,triggeredByName,remark(가림),**retryable,retryBlockedReason,retriedBy[],supersededBy{}**}, params{srcTable,dstTable,…}, errorTotal, errors[] | 조회 | 1 |
| 229 | `postSyncJobsByJobIdRetry` | 이관 작업 재실행 | POST | `/api/v1/sync/jobs/{jobId}/retry` | — | newJobId, state, supersededBy — FAIL·ABORTED 외 409, 중복 409, 쓰기 권한 없음 403 `E-AUTH-004` | **쓰기** | 1 |
| 232 | `getSyncMaps` | 연동 매핑 조회 | GET | `/api/v1/sync/maps` | srcTable | items[…] | 조회 | 1 |
| 234 | `getSyncSchemaDriftSummary` | 스키마 드리프트 요약 | GET | `/api/v1/sync/schema-drift/summary` | — | driftState, openCnt, … | 조회 | 1 |
| 235 | `getSyncSchemaDrift` | 스키마 드리프트 목록 조회 | GET | `/api/v1/sync/schema-drift` | side, kind, resolved, page, size | items[…], meta | 조회 | 1 |
| 236 | `postSyncSchemaDriftByDriftIdResolve` | 스키마 드리프트 해소 처리 | POST | `/api/v1/sync/schema-drift/{driftId}/resolve` | note | driftId, resolved | **쓰기** | 2 |
| 233.5 | (`downloadFromServer`) `postSyncExport` | 연동 이력 전체 내려받기 | POST | `/api/v1/sync/export` | target(JOBS\|RUNS\|DRIFTS), scope(ALL), menuId, condSummary | xlsx 파일 | 조회 | 2 |

## 6. 개발 체크리스트

- [x] 연동 상태 줄 + 요약 2카드 (금일 이관 · 미조치 실패) — SYN-03
- [x] 상태 선택지 공통코드 코드값 · 영역별 조회 실패 표시 · 상세 실패 토스트 — SYN-01
- [x] 이관 이력 표 11열 + 예약 대기 「지연」 · 원 작업 보조 문구 · retryable 기준 재실행 버튼 — SYN-02·06·08
- [x] 작업 상세 모달 정정(정합성 null · 실행 경로 · 실패 표기) · 확인창 문구 — SYN-07(오류 상세 표는 미구현)
- [x] 쓰기 권한 없을 때 재실행·해소 단추 비활성 + 안내 — SYN-14
- [x] 실행 메시지·실패 원인 내부 주소 가림(화면 이중 적용) — SYN-05
- [x] 카드별 엑셀 옵션 패널(조회 목록 / 전체) — SYN-15
- [x] 조건부 30초 폴링(RUNNING·PENDING)
- [x] 목록 페이징(작업 이력)
- [x] 스키마 드리프트 표 + 위치/해소 필터 토글 + 발견 횟수 강조 (현재 숨김)
- [x] 드리프트 상세 · 해소 처리 폼 (현재 숨김)
- [x] 연동 매핑 표 (현재 숨김 · 연동 정책 카드는 제거)
- [x] 연동 테스트 모달 (버튼 삭제)
- [x] 수동 이관 예약 폼 (버튼 삭제)
- [x] 숨긴 카드 조회 중단 · 매핑 진입 1회 · 내보내기 열 추가(원 작업·정합성·재시도·실행 경로·소속 실행·실패 원인) — SYN-10
- [x] 원본 테이블 조건(SYN-08) · 실행 이력 조건/쪽/행 클릭 필터 · 실행 상세(SYN-09) · 작업 상세 오류 표 · 매핑 파라미터(SYN-07) · 새 작업 강조(SYN-06)

시험 — `node tests/system/sync-history-browser.cjs`(목 모드 `WEB_URL=http://localhost:8090`), `node tests/system/sync-upload-live-browser.cjs`(실 API 모드 개발 서버 + `LIVE_API`), `SPEC=16-system NO_BROWSER=1 node tests/run.js`.
