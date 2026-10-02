# 28. `/system/alert-condition` — 이상 알림 발송 조건 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/alert-condition` |
| 화면 ID | `alert-cond` |
| 라우트 파일 | `app/(main)/system/alert-condition.jsx` |
| MVC | `domains/system/view/AlertCondView.jsx` · `view/AlertCondForm.jsx` · `controller/useAlertCondController.js` · `model/alertFormModel.js` · `model/systemRepository.js`(SY-04 구역) |
| 기능 ID | SY-04 |
| 접근 권한 | 조회 `alert-cond` · 쓰기(등록·수정·활성/중지·테스트) `alert-cond` 쓰기 권한 · 삭제 통합관리자만(R-13) |

**「언제 · 무엇을 기준으로」** 보낼지를 정의합니다. **「누구에게 · 어떤 연락처로」** 는 [29. 알림 수신자 관리](./29_system_recipient.md) 담당이며, 여기서는 **수신 그룹을 골라 연결**합니다.

2026-10-01 기획 05(`05_alert-cond_이상알림발송조건관리.md`)의 P0(ALC-01~05·ALC-16), ALC-17(엑셀 옵션 패널), 3단계 P1(ALC-06~12)을 반영했습니다. 4단계 P2(ALC-13 삭제 가능 표시, ALC-15 목·문구·문서 정리)를 마쳤습니다. ALC-14(감사 기록)는 서버 몫입니다.

## 1. 컴포넌트

`PageHead`(+`ExportMenuButton` · `조건 등록`) · 읽기 전용 `Hint` · 선택지 오류 `FormAlert` · `StatCard`×4 · `Hint` · `Filters`(심각도 / 상태 / 검색) · `Card(tight)`+`Table`(minWidth 1590, 가로 스크롤) · `openFormModal`(조건 등록·편집, wide, `AlertCondForm`) · `openModal`(테스트 결과, `AlertTestResult`) · `AlertGuardButton`(권한으로 막힌 버튼 — 비활성 + `title` 툴팁)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /alert-conditions/summary`)

카드 4종(ALC-07): ① 등록 조건(`totalCnt`, 보조 `활성 N · 중지 M`) ② 오늘 발송(`todaySentCnt`=SENT, 보조 「억제 `todaySuppressedCnt` · 제외 `todaySkippedCnt` · 실패 `todayFailCnt`」, 실패가 있으면 강조) ③ 판정 이상 조건(`evalIssueCnt{breach,stale}`, 보조 「발생 N · 수집 중단 N」) ④ 엔진 상태(`engine.judge` 또는 `lagSec` — 정상 / 지연 N분 / 중지 의심(65분 초과), 보조 「마지막 실행 HH:mm · 대기 N건」).
- 수신 그룹 수는 카드 대신 머리 링크 「수신 그룹 N개 관리 →」(`sys-recip` 권한자만)로 옮겼습니다.
- 엔진이 「중지 의심」 이면 상단 배너 「알림 엔진 마지막 실행이 N분 전입니다. 조건을 저장해도 판정되지 않습니다.」
- 서버가 새 필드를 아직 주지 않으면 그 칸은 「—」 입니다(옛 값으로 채우지 않습니다).

### 2-2. 조회 조건

심각도(`ALM_SEVERITY`) · 상태(`state=ON|OFF`) · **발송 채널**(`channel`) · **수신 그룹**(`groupId`) · 검색(`keyword`, 조건명 · 지표). 검색어는 **조회 버튼·Enter 에만** 서버로 보냅니다(ALC-11).

### 2-3. 발송 조건 표 (`GET /alert-conditions`) — 16열, minWidth 2380

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 상태 `on` | 90 | `활성`(green) / `중지` — 맨 앞(명세 순서) |
| 조건명 `name` | 170 | |
| 감지 지표 `metric` | 190 | |
| 비교 · 임계값 | 150 | `{ALM_OP 표기} {threshold}`. 임계값에 데이터 권한(`blindFieldKey`)이 걸려 서버가 null 로 주면 `●●●● 비공개` |
| 지속 조건 `duration` | 130 | `ALM_DURATION` 표기 |
| 대상 범위 `targetScope` | 160 | `ALM_TARGET` 표기. `PICK` 은 「개별 설비 N대」 |
| 심각도 `severity` | 110 | `CRIT`→red / `WARN`→amber |
| 발송 채널 `channels` | 150 | `ALM_CHANNEL` 표기 |
| 수신 그룹 `groups` | 200 | `groups[{groupId,name,useFlg,…}]`. 사용 중지 그룹은 회색·취소선 |
| 수신 인원 `receivingCnt` | 100 | 0 이면 붉은 「0명」. 행에 없으면 그룹별 수신 인원 합 |
| 유효 시간대 `validWindow` | 120 | `ONCE` 는 「09:00 1회」 |
| 중복 억제 `dedupMin` | 110 | |
| 판정 `evalState`·`metricStale` | 130 | 발생 N(red) / 감시중 N(amber) / 정상 / 수집 중단(amber) |
| 마지막 평가 `evalState.lastEvalAt` | 120 | 상대 시각 |
| 최근 7일 `alert7dCnt` | 90 | 건수. `alert-list` 권한자는 눌러 `/alert/list?condId=` (알림 목록 쪽 필터는 짝 작업) |
| 관리 | 260 | `편집` · `중지/활성` · `테스트` · `삭제` |

열을 숨기지 않습니다. 좁은 화면에서는 카드 안에서 가로로 스크롤해 「관리」 열까지 봅니다(머리글·본문 함께 이동).

`Hint` : "발송 조건은 언제 · 무엇을 기준으로 보낼지 정합니다. 수신 그룹을 골라 연결합니다. 멤버·연락처는 알림 수신자 관리에서 바꿉니다."

### 2-4. 상태별 화면

| 상태 | 표시 |
| :--- | :--- |
| 첫 진입 | `Loading`. 재조회·필터 변경은 화면을 갈아엎지 않습니다 |
| 빈 데이터 | 「등록된 발송 조건이 없습니다. 먼저 알림 수신자 관리에서 수신 그룹을 만든 뒤 '조건 등록' 으로 첫 조건을 만드세요.」 |
| 필터 결과 없음 | 「조회 조건에 맞는 조건이 없습니다.」 |
| 목록 조회 오류 | 카드 안 `FormAlert` 「발송 조건을 불러오지 못했습니다 — {메시지}」 + `다시 시도` |
| 선택지 오류(ALC-02) | 감지 지표·수신 그룹 조회가 막히면 상단·폼 위에 「… 목록을 불러오지 못했습니다(권한: …)」, `조건 등록` 비활성 |
| 읽기 전용(R-06) | 쓰기 권한이 없으면 `조건 등록`·`편집`·`중지/활성`·`테스트` 를 숨기지 않고 비활성 + 툴팁 「이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요.」, 상단 「읽기 전용」 안내. 목록·요약·엑셀은 그대로 |
| 삭제(R-13) | 통합관리자가 아니면 모든 행의 `삭제` 비활성 + 툴팁 「삭제는 통합관리자만 할 수 있습니다. 사용하지 않는 조건은 중지하세요.」. 통합관리자에게는 `deletable=false` 행만 비활성 |

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 조건 등록 | 폼(wide) → `POST /alert-conditions` |
| 편집 | **`GET /alert-conditions/{condId}` 상세로 폼을 채운 뒤** → `PUT /alert-conditions/{condId}` 에 **바뀐 키만** + `updatedAt` (ALC-04). 상세를 못 받으면 폼을 열지 않습니다 |
| 중지 | 확인 창 「이 조건은 판정 대상에서 빠집니다. 이미 난 알림은 남습니다.」 → `PATCH …/state` `{ on:false }` |
| 활성 | 바로 `PATCH …/state` `{ on:true }` (ALC-01 — 본문 없는 요청은 서버가 400) |
| 테스트 | `POST …/test-send` → 결과 모달: 「발송 대기 N건 — 1분 안에 메일이 나갑니다…」, 수신 예정(이름·부서·채널), 제외(이름·사유), 엔진 중지 경고, `알림 목록에서 보기`(`alert-list` 권한자만) |
| 삭제 | 통합관리자만. 확인 창 → `DELETE /alert-conditions/{condId}`. 서버 403 `E-AUTH-002` 도 R-13 문구로 토스트 |
| 엑셀 다운로드 ▾ | 옵션 패널(아래 3-2) |
| 조회 | `reload()` |

서버가 403 `E-AUTH-004`(쓰기 권한 없음)를 주면 서버 메시지를 토스트로 보입니다.

### 3-1. 조건 등록·편집 폼 (`AlertCondForm`)

| 필드 | 키 | 타입 | 규칙 |
| :--- | :--- | :--- | :--- |
| 조건명 | `name` | text (필수) | 100자 |
| 감지 지표 | `metricStdId` | select (필수, 전폭) | `GET /metrics/standards` |
| 비교 | `op` | select | `ALM_OP` |
| 임계값 | `thresholdVal` | number (필수) | 숫자, 소수 4자리. 서버에는 `thresholdVal`(숫자)과 `threshold`(문자열)를 함께 보냅니다 |
| 지속 조건 | `duration` | select | `ALM_DURATION` |
| 대상 범위 | `targetScope` | select | 엔진이 해석하는 `ALL_EQPT` · `PICK` 만 선택. 그 밖의 `ALM_TARGET` 은 「엔진 미지원」 안내 |
| 개별 설비 | `pickTargets[]` | custom | `targetScope=PICK` 일 때만. `GET /common/masters/equipments?keyword=` 검색 → 칩. 1~500대 |
| 대상 설명 | `target` | text | 200자. 비우면 서버가 대상 범위 표기명을 넣습니다 |
| 심각도 | `severity` | select | `ALM_SEVERITY` |
| 발송 채널 | `channels[]` | check (필수) | 메일 · 시스템 팝업. SMS·메신저는 연동 전(저장값이면 보이고 남음) |
| 수신 그룹 | `groupIds[]` | check (필수, 전폭) | 그룹 목록. 저장값에 사용 중지 그룹이 있어도 지우지 않고 보입니다 |
| 유효 시간대 | `validWindow` | select | `ALM_WINDOW` |
| 중복 억제 | `dedupMin` | select | `ALM_DEDUP` |
| 도달 미리보기 | — | custom | 그룹별 「수신 N/M명 · 채널 일치」, 합계. 0명이면 붉은 경고, 저장 때 한 번 더 확인(ALC-06) |
| 고급 설정 | — | 접이식 | 기본과 다른 값이 있으면 펼쳐서 엽니다(ALC-09) |
| └ 평가 단위 | `scopeDim` | select | `ALM_SCOPE_DIM`, 기본 「지표 수집 단위 따름」(NONE) |
| └ 평가 주기 | `evalIntervalSec` | select | 60·300·600·1800·3600초 |
| └ 지정 시각 | `windowTime` | text | 유효 시간대 `ONCE` 또는 지속 `DAY_CLOSE`·`DAY_ONCE` 일 때만. `ONCE` 이면 필수, HH:mm |
| └ 시간대 무시 · 해제 기록 | `ignoreWindow` · `autoClose` | check | 위험 등급이면 시간대 무시 검토 안내 |
| └ 메시지 틀 | `msgTemplate` | textarea | 4,000자. 변수 칩 클릭 삽입, 예시 1건 미리보기, 허용 밖 `{{…}}` 는 저장 전 확인 |
| └ 승격 적용 | `escalation[{stage,on}]` | check 3개 | 승격 규칙에 대상 그룹이 없으면 「대상 그룹 미지정 — 승격해도 아무도 받지 못합니다」 |

감지 지표를 고르면 임계값 옆에 단위와 「지표 기준 정상·주의·위험」 이 보이고 「주의값 넣기」·「위험값 넣기」 로 채웁니다. 선택지 라벨은 「공정 불량률 · DEFECT (%) — 수집 중」 / 「— 수집 없음(판정 안 됨)」 입니다(ALC-10). 임계값은 숫자(소수 4자리)만 받습니다(ALC-12).

수정 요청에서 `target`·`pickTargets` 의 빈 값은 「비우기」 이므로 `endpoints.js` 의 `preserveEmpty` 로 그대로 보냅니다. 메시지 틀·평가 단위 등 폼에 없는 값은 보내지 않아 서버에 그대로 남습니다.

안내 : "판정은 이 조건의 임계값으로 합니다. 지표 기준값은 참고용입니다. 수신 그룹을 골라 연결하며, 멤버·연락처는 알림 수신자 관리에서 바꿉니다."

### 3-2. 엑셀 다운로드 옵션 패널 (ALC-17, R-10 · R-16)

| 항목 | 범위 | 데이터 | 이력 |
| :--- | :--- | :--- | :--- |
| 조회 목록 다운로드(n건) | 현재 쪽 표에 보이는 행. 정렬·열 순서 반영, 관리 열 제외(11열) | 표 인스턴스의 `getData('active')` | `scopeCd=VIEW`, `condSummary` 「심각도=… · 상태=… · 검색=… · 쪽=N」 |
| 전체 다운로드(N건) | 조회 조건·쪽과 관계없이 전 조건. N = 요약 `totalCnt` | `GET /alert-conditions?size=0`, 상한 1,000건(`meta.truncated` 면 「상한 1,000건까지 내려받았습니다」) | `scopeCd=ALL`, `condSummary` 「전체 조건」 |

두 항목 모두 조회 권한이면 받습니다. 임계값 칸은 행의 `blindFieldKey` 권한이 없으면 `비공개` 로 채우고 그 건수를 `blindCnt` 로 남깁니다. 열마다 응답 필드명(`attrs`)도 함께 넘깁니다.

## 4. 그 밖의 기능

- 선택지·표기는 서버 공통코드(`ALM_SEVERITY` · `ALM_CHANNEL` · `ALM_TARGET` · `ALM_OP` · `ALM_WINDOW` · `ALM_DEDUP` · `ALM_DURATION`)에서 받습니다.
- 알림 목록의 발송 로그는 응답 `test=true` 인 행에 「테스트」 배지를 붙입니다(`AlertListView`).
- 목(`systemMock.js`)은 서버와 같은 본문·응답 모양(코드값, `on`, `groupIds`, `targetScope`, 테스트 `queuedCnt`)으로 동작합니다.
- 테스트 결과의 「알림 목록에서 보기」 는 `alertId`·`includeTest=true`, 「최근 7일」 은 `condId` 를 넘기고 알림 목록이 조회 조건으로 씁니다([24. 알림 목록](./24_alert_list.md) 2-1a).
- 등록·수정 응답의 `warnings[]` 는 저장 뒤 「확인 필요: …」 로 알립니다(3단계 서버 계약).
- 삭제(ALC-13): 통합관리자에게도 `deletable=false`(운영 알림 있음) 행은 비활성 + 「운영 알림이 있어 삭제할 수 없습니다 — 중지를 사용하십시오」. 확인 창은 「연결된 채널·수신 그룹·승격 설정·판정 상태가 함께 지워지며 복구할 수 없습니다」. 서버 409 는 그대로 둡니다(이중 방어).

## 5. 사용 API

총 **9건** (감지 지표 1 · 발송 조건 7 · 공통 설비 1)

| # | 서비스 함수 | API 명 | Method | Path | 요청 | 응답 주요 필드 | 권한 |
|---|---|---|---|---|---|---|---|
| 323 | `getAlertConditionMetrics` | 감지 지표 목록 | GET | `/api/v1/metrics/standards` | page, size | items[{stdId,category,name,unit}] | 조회 |
| 151 | `getAlertConditionsSummary` | 발송 조건 요약 | GET | `/api/v1/alert-conditions/summary` | — | activeCnt, totalCnt, todaySentCnt, dedupCnt | 조회 |
| 152 | `getAlertConditions` | 발송 조건 목록 | GET | `/api/v1/alert-conditions` | severity, state, keyword, page, size(0=전체) | items[{condId,on,name,metric,op,threshold,thresholdVal,targetScope,target,pickTargets[],severity,channels[],groupIds[],groups[],validWindow,dedupMin,blindFieldKey,updatedAt}], meta{truncated} | 조회 |
| 152.2 | `getAlertConditionsByCondId` | 발송 조건 상세 **(신규)** | GET | `/api/v1/alert-conditions/{condId}` | condId | 기획 05 4.4.2 예시 전 필드 | 조회 |
| 153 | `postAlertConditions` | 발송 조건 등록 | POST | `/api/v1/alert-conditions` | name, metricStdId, op, thresholdVal, threshold, duration, targetScope, target, pickTargets[], severity, channels[], groupIds[], validWindow, dedupMin | condId | 쓰기 |
| 154 | `putAlertConditionsByCondId` | 발송 조건 수정 | PUT | `/api/v1/alert-conditions/{condId}` | 바뀐 키만 + updatedAt (`preserveEmpty: target, pickTargets`) | success / 409 동시 수정 | 쓰기 |
| 155 | `patchAlertConditionsByCondIdState` | 활성/중지 | PATCH | `/api/v1/alert-conditions/{condId}/state` | **on(필수)** | on, changed | 쓰기 |
| 156 | `postAlertConditionsByCondIdTestSend` | 테스트 발송 | POST | `/api/v1/alert-conditions/{condId}/test-send` | — | alertId, queuedCnt, sentCnt, channels[], recipients[], skipped[], engine{judge} | 쓰기 |
| 152.5 | `deleteAlertConditionsByCondId` | 발송 조건 삭제 | DELETE | `/api/v1/alert-conditions/{condId}` | — | success | 통합관리자 |
| 9 | `getCommonMastersEquipments` | 설비 목록(개별 설비 검색) | GET | `/api/v1/common/masters/equipments` | keyword, size | equipments[{eqptCd,eqptNm}] | 전 부서 |

## 6. 개발 체크리스트

- [x] 요약 4카드
- [x] 조회 조건 3종(심각도·상태·검색)
- [x] 12열 조건 표(상태 맨 앞), 가로 스크롤
- [x] 등록·편집 폼 — 상세로 채움, 바뀐 키만 저장, 채널·그룹 여러 개, 대상 범위 코드·개별 설비
- [x] 활성/중지 — `on` 본문, 중지 확인
- [x] 테스트 발송 결과 모달(대기 N건·수신 예정·제외 사유)
- [x] 쓰기 권한 UI(R-06) · 삭제 통합관리자만(R-13)
- [x] 엑셀 옵션 패널(조회 목록 / 전체, `attrs`·`scope`·`condSummary`)
- [x] (P1) 도달 미리보기 · 카드 재구성·엔진 배너 · 판정/수신 인원/마지막 평가/최근 7일 열 · 고급 설정 · 지표 기준값 넣기 · 채널/그룹 필터·검색 Enter
- 시험: `API_URL=http://localhost:18081 WEB_URL=<로컬 대상 개발 서버> node tests/system/alert-cond-browser.cjs` (`page.route` 로 API 흉내), 실 API 계약은 `node tests/system/alert-recip-live.cjs`
