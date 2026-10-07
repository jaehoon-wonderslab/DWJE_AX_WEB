# 33. `/system/audit-log` — 보안 감사 로그

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/audit-log` |
| 화면 ID | `sys-audit` |
| 라우트 파일 | `app/(main)/system/audit-log.jsx` |
| MVC | `domains/system/view/AuditLogView.jsx` · `controller/useAuditLogController.js`(+`controller/gridExport.js`) · `model/systemRepository.js`(SY-09 구역) |
| 기능 ID | SY-09 |
| 접근 권한 | 전산팀 · 통합관리자 (조회 전용 — 쓰기 동작 없음) |

로그인·권한 변경·마스킹·내려받기·설정 변경을 한 타임라인으로 봅니다. **기록은 고칠 수 없습니다.**

2026-10-01 개편(기획 09 AUD-05 · 09 · 12 · 15 · 17, 공통 10.6 CMN-07) 내용을 반영했습니다.

## 1. 컴포넌트

`PageHead`(+`Button(보존 정책)` · `ExportMenuButton` [엑셀 다운로드 ▾]) · `Filters`(시작일 / 종료일 / 유형 / 결과 / 부서 / 계정·검색어 / IP / 로그인 성공 제외 + `Button primary(조회)`) · `Card(tight)`+`Table`(minWidth 1,204)+`Pagination` · `openModal`(행 상세 `KeyValue`)

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 · 반영 시점 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `recentDays(7)` — **오늘 기준** | 바꾸는 즉시 조회 |
| 유형 | `전체` | 공통코드 `LOG_AUDIT_TYPE`. 과거 전용 코드(`UNMASK_REQ`)는 끝으로. 공통코드를 못 받으면(목 모드) 화면 기본 표시명 |
| 결과 | `전체` | 공통코드 `LOG_AUDIT_RESULT`(허용 · 반려 · blind · 마스킹 후 제공) — 즉시 조회 |
| 부서 | `전체` | `repo.loadDeptOptions()` 서버 부서 목록 — 즉시 조회. 서버 파라미터 `userGroup` |
| 계정·검색어 | 빈 값 | 사번·이름·대상·비고 부분 일치(`keyword`). **Enter 또는 「조회」 에서만** 반영 |
| IP | 빈 값 | 주소 · CIDR 대역 · IPv4 앞부분(`10.1.`)(`ip`). Enter·「조회」 에서만 |
| 로그인 성공 제외 | 끔 | 켰을 때만 `excludeLoginSuccess=true` 를 보냄 |

### 2-2. 감사 로그 표 (`GET /audit-logs`) — 9열

| 열 | 필드 | 폭 | 렌더 |
| :--- | :--- | :--- | :--- |
| 시각 | `ts` | 150 | mono |
| 유형 | `type` | 130 | `Badge` — 해제 요청 amber · 접근 거부 red · 마스킹·내려받기 기본 · 그 외 blue |
| 계정 | `empNo` | 84 | mono, 없으면 `—`(비로그인 사건) |
| 이름 | `name` | 90 | |
| 부서 | `dept` | 110 | (예전 「사용자 그룹」) |
| 대상 | `target` | minWidth 220 · flex 2 | wrap |
| 처리 결과 | `result` | 120 | `Badge` — 반려 red · blind·마스킹 후 제공 amber |
| 비고 | `detail` | minWidth 180 · flex 1 | wrap |
| IP | `ip` | 120 | mono (마지막 열) |

- 표 최소 폭 1,204px. 열을 숨기거나 줄이지 않고 카드 안에서 가로로 밉니다(머리글·본문이 함께 이동). 폭 390px 에서 오른쪽 끝까지 밀면 「IP」 머리글과 값이 보입니다.
- `keyExtractor` 는 `r.id`(원천 접두어 + 키: `A-` 감사 · `P-` 권한 변경(옛 행) · `L-` 로그인 · `O-` 로그아웃).
- 쪽 경계 고정(4.7): 1쪽에서 받은 가장 새 시각을 기억해 2쪽부터 `asOf` 로 보냅니다(서버 시각만 씀). 조건이 바뀌면 다시 1쪽 기준.
- 부제: `{total}건 · {from} ~ {to}`.

### 2-3. 행 상세 (모달)

id · 시각 · 유형·결과 · 행위자(사번 이름 (부서), 없으면 「비로그인 사건」, 이름이 없으면 「삭제된 계정」) · 화면(`menuNm (menuId)`) · 데이터 항목(`fieldKey`) · 마스킹 건수 · 대상 · 비고 · IP · 접속 환경(`ua`). 목록 응답에 있는 값만 씁니다(상세 API 없음).

### 2-4. 상태별 화면

| 상태 | 표시 |
| :--- | :--- |
| 로딩 | 카드 안 `Loading`. 필터·머리글 그대로 |
| 빈 데이터 | 「조회 조건에 맞는 감사 기록이 없습니다. 기간을 넓히거나 조건을 줄여 보세요.」 |
| 오류 | 카드 안 「감사 로그를 불러오지 못했습니다 — {메시지}」 + 「다시 시도」. 이전 행을 지우고 쪽 이동을 숨김 |
| 읽기 전용 | 화면 전체가 읽기 전용. 수정·삭제 단추가 없습니다(쓰기 권한 R-06 대상 아님) |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 조회 | 입력칸(계정·검색어 · IP)을 반영. 같은 값이면 다시 조회 |
| 엑셀 다운로드 ▾ → **조회 목록 다운로드(n건)** | 지금 표의 **현재 쪽**을 표의 정렬·열 순서 그대로 9열 `.xlsx` 로(브라우저 생성, 2026-10-06 이전 `.xls`). `attrs = [ts,type,empNo,name,dept,target,result,detail,ip]`. 기록 `scopeCd=VIEW` · `condSummary`(「{from}~{to} · 유형 · 결과 · 부서 · 검색어 · {page}쪽/{size}건」) · `menuId=sys-audit` |
| 엑셀 다운로드 ▾ → **전체 다운로드** | `POST /audit-logs/export {scope:'ALL', menuId:'sys-audit', format:'xlsx', condSummary:'전체 · 최근 순'}` — 조건·쪽과 무관한 전체(서버 생성). 서버는 from·to·keyword 를 주면 그것만 보므로 「전체」 에서는 보내지 않습니다. 이력은 서버가 남기므로 화면은 `POST /download-logs` 를 부르지 않습니다. 상한을 넘으면 헤더 `X-Export-Truncated`·`X-Export-Total`(·`X-Export-Limit`)로 받아 토스트 「상한 n건까지 내려받았습니다(전체 N건)」. 상한은 기획 50,000 이지만 2단계 서버는 10,000 이며, 화면은 숫자를 박지 않고 서버 헤더를 따릅니다. N 을 미리 몰라 건수 없이 표기 |
| 보존 정책 | `GET /audit-logs/retention-policy` — 보존 기간 · 마지막/다음 아카이브(`nextArchiveAt`, 2026-10-02 R-20 으로 배치 켜짐 · 매월 1일 03:00. 서버 설정이 아직 꺼져 있으면 그 칸만 「— (서버 설정 꺼짐)」) · 기록 실패(`writeFailSinceBoot`, AUD-13) · 메일 발송 실패(`mailFailSinceBoot`, R-17) · 원천별(감사 기록·권한 변경·로그인 이력) 보관 중 · 경과 · 아카이브 · 가장 오래된 기록. 서버 API 가 없으면(404) 「보존 정책 조회가 아직 서버에 없습니다」 안내 |

- 두 항목 모두 화면 조회 권한으로 받습니다(R-10). 파일 값은 로그인 계정의 데이터 접근 권한으로 가리며, 권한 밖 값은 `비공개` 로 채우고 파일 첫 줄 「비공개 처리 n건(데이터 접근 권한 기준)」 의 n 을 기록 `blindCnt` 로 보냅니다.
- 기록을 먼저 남기고, 기록이 실패하면 파일을 만들지 않습니다(10 DLG-05 — `exportUtil`).

**페이징** — `usePaging({resetKey: 조건 전체})` + `Pagination`. 로그가 계속 쌓이므로 필수.

## 4. 그 밖의 기능

- 감사 로그는 **시스템이 지금 남기는 기록**이라 실적 기준일이 아니라 오늘 기준으로 조회합니다.
- 기록 원천: 감사 표(`tb_log_audit`) · 권한 변경(`tb_sys_perm_log`) · 로그인 이력(`tb_sys_login_hist`) 3원천을 최근 순으로 합칩니다.
- 2026-10-01 서버 1단계(AUD-01 · AUD-16): 로그인 실패·잠금이 롤백되지 않고 남습니다. 5회 실패 잠금·잠금 해제 요청·해제 완료는 유형 「계정 보안」(`ACCOUNT_SEC`)으로 보입니다. 로그인·잠금 해제 화면은 `01_login.md` · `03_forgot-password.md`.
- 보존 정책 모달(AUD-11·13)은 서버 API 로 동작합니다. 2026-10-02 결정 R-20(D-08)으로 보존 배치를 켭니다 — 감사·권한 변경·로그인 이력 3년 경과분을 매월 1일 03:00 아카이브 표로 옮기며(지우지 않아 되돌릴 수 있음), 모달 각주가 그 사실을 알립니다. 「아카이브 배치 꺼짐」 안내는 제거했습니다. 기록 실패 옆에 메일 발송 실패 수(R-17 SMTP, 한비로 계정이 「사용 안 함」 이 되면 여기서 먼저 보임)를 둡니다. 감사 기록 열람 기록(AUD-08)·접근 거부·설정 변경 기록(AUD-10)·권한 변경 중복 제거(AUD-06)는 서버가 남기며, 화면은 유형 선택지(「감사 기록 조회」 등)로 거릅니다. 접속 환경(`ua`)·로그인 부서 스냅샷은 서버가 새 기록부터 채웁니다(AUD-14). 서버 생성 「전체」 파일은 11열(ID 포함), 「비공개 처리 n건」 안내는 별도 「안내」 시트입니다(브라우저 파일은 첫 줄).

## 5. 사용 API

총 **3건**

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | 우선순위 |
|---|---|---|---|---|---|---|---|---|
| 190 | `getAuditLogs` | 감사 로그 조회 | GET | `/api/v1/audit-logs` | from, to, type(쉼표 다중), userGroup, empNo, keyword, ip, result, excludeLoginSuccess, page, size | items[{id,src,ts,type,result,empNo,name,dept,menuId,menuNm,fieldKey,maskedCnt,target,detail,ip,ua}], meta | 전산팀·통합관리자 | 1 |
| - | `postAuditLogsExport` | 감사 로그 전체 내려받기 (2026-10-01 신규) | POST | `/api/v1/audit-logs/export` | body: scope(ALL), menuId, format, condSummary | 파일(xlsx), 헤더 X-Export-Truncated · X-Export-Total | 전산팀·통합관리자(조회 권한) | 2 |
| - | `getAuditLogsRetentionPolicy` | 감사 로그 보존 정책 (2026-10-01 신규) | GET | `/api/v1/audit-logs/retention-policy` | — | retentionYears, enabled, sources[{src,totalCnt,expiredCnt,archivedCnt,oldestAt}], lastArchiveAt, nextArchiveAt, writeFailSinceBoot, mailFailSinceBoot | 전산팀·통합관리자 | 2 |

## 6. 시험

`tests/system/audit-log-browser.cjs` — 보존 정책 모달 포함, `page.route` 로 응답을 고정합니다(실 API 모드 개발 서버 필요, 목 모드 번들은 네트워크를 쓰지 않음). 9열·상세, 390px 가로 스크롤, 패널(단추 바로 아래·Esc·360px), 조회 목록(현재 쪽·정렬 순서·`비공개` 채움·n = blindCnt·기록 선행·기록 실패 시 파일 없음), 전체(서버 경로만·상한 안내), 검색 Enter / 선택 즉시, 500 오류 상태, 「마스킹 후 제공」 배지.

## 7. 개발 체크리스트

- [x] 기간·유형·결과·부서·계정/검색어·IP·로그인 성공 제외 조회 (오늘 기준)
- [x] 감사 로그 표 9열 + 배지 색 규칙 + 행 상세
- [x] 서버 페이징
- [x] 엑셀 옵션 패널(조회 목록 VIEW · 전체 ALL)
- [x] 오류 상태 + 다시 시도
- [x] 보존 정책 모달(AUD-11 · AUD-13 기록 실패 수)
- [x] 쪽 경계 고정 `asOf`, 로그아웃 `O-` 행
- [x] 실 API 시험 `tests/system/audit-download-live-browser.cjs`(18081: 접두어 id·VIEW/ALL 기록)
- [ ] 자동 기록 대상(권한·마스킹·출력·모델 전환) 실제 적재 확인
