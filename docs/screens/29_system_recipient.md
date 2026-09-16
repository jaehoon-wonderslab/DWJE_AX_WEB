# 29. `/system/recipient` — 알림 수신자 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/recipient` |
| 화면 ID | `sys-recip` |
| 라우트 파일 | `app/(main)/system/recipient.jsx` |
| MVC | `domains/system/view/RecipientView.jsx` · `controller/useRecipientController.js` |
| 기능 ID | SY-05 |
| 접근 권한 | 전산팀 · 통합관리자 |

**「누구에게 · 어떤 연락처로」** 보낼지를 관리합니다. 발송 조건(SY-04)은 여기서 만든 **수신 그룹 이름만 참조**하므로 멤버·연락처 변경은 이 화면에서만 합니다.

> **2026-09-16 변경** — 「당번 · 승격」 탭을 걷어냈습니다. 당번은 서버 API 4건과 표(`ax.tb_alm_duty`)까지 정리했고,
> 승격 규칙은 [알림 현황] 의 「승격 대상」이 계속 읽으므로 서버 API·표를 남긴 채 이 화면에서만 뺐습니다.
> 표는 공통 `Table`(React 포털) 대신 **`TabulatorGrid`** 로 그립니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 발송 조건 관리 · `Button primary(수신 그룹 등록)`) · `StatCard`×4 · `Hint` · **`Tabs`(수신 그룹 / 수신자)** · 탭별 `Card`+`TabulatorGrid` · `openFormModal`(그룹/수신자)

### 1-1. 표 규칙 (두 탭 공통)

`TabulatorGrid` 에 `autoWidth` · `bordered` · `inset` 을 줍니다.

| 옵션 | 효과 |
| :--- | :--- |
| `autoWidth` | 열 너비를 내용에 맞춰 잡습니다(Tabulator `layout:'fitData'`). 합이 카드보다 넓으면 표 안에서 가로 스크롤 — 열을 숨기거나 압축하지 않습니다 |
| 크기 조절 | 머리글 경계를 끌어 사람이 직접 폭을 바꿉니다 (`columnDefaults.resizable:'header'`) |
| `bordered` | 머리글·칸에 세로 줄을 그어 어느 값이 어느 열인지 갈립니다 |
| 머리글 검색 | 데이터 열마다 검색 입력칸. 배지·버튼 열은 제외(`headerFilter:false`) |

칸 안의 배지·버튼은 formatter 가 HTML 로 그리고(`.tag` · `.tbtn` · `.mono` · `.nowrap`), 클릭은 열의 `cellClick` 에서 `data-act` 로 가려냅니다.

`worker` 데이터 권한이 없으면 이름 · 메일 · 휴대전화 · 메신저 · 구성원 칸을 `●●●● 비공개` 로 바꿔 그립니다(값 자체를 렌더링하지 않습니다).

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /alert-recipients/summary`)

수신 그룹(`groupCnt`, 보조 "발송 조건이 참조하는 단위") · 수신(`recipientCnt.receiving` 명) · 부재(`recipientCnt.absent`, 보조 "발송 대상에서 제외") · 야간 수신(`nightCnt`)

### 2-2. 탭 1 — 수신 그룹 (`GET /alert-recipient-groups`)

| 열 | 최소폭 | 비고 |
| :--- | :--- | :--- |
| 그룹명 `name` | 120 | |
| 발송 채널 `channels` | 130 | 공통코드 `ALM_CHANNEL` 표기를 `.tag tag-blue` 칩으로 |
| 유효 시간대 `validWindow` | 110 | 공통코드 `ALM_WINDOW` 표기 |
| 야간 `night` | 68 | `발송`(green) / `제외` |
| 멤버 | 68 | `members` 수, 우측 정렬 |
| 구성원 `memberNames` | 180 (max 360) | ` · ` 연결 1줄, 넘치면 말줄임 + tooltip · **`worker` 마스킹** |
| 관리 | 170 | `편집` · `테스트 발송` |

### 2-3. 탭 2 — 수신자 (`GET /alert-recipients`)

조회 조건 : 그룹(`전체` + 그룹명, 현재 쪽 안에서 걸러 냄) · 상태(`전체` / 수신 / 부재) + `Button(조회)` · `Button(수신자 등록)`

| 열 | 최소폭 | 비고 |
| :--- | :--- | :--- |
| 이름 `name` | 90 | **`worker` 마스킹** |
| 부서 `dept` | 100 | |
| 직급 `posNm` | 78 | 서버 공통코드 `SYS_POSITION` 표기 (코드값은 `pos`) |
| 메일 · 휴대전화 · 메신저 | 170 / 130 / 100 (mono) | **`worker` 마스킹** |
| 야간 `night` | 68 | `수신`(green) / `미수신` |
| 소속 그룹 `groups` | 150 (max 320) | ` · ` 연결 1줄 |
| 상태 `state` · `stateNm` | 78 | `수신`(green) / `부재`(amber) |
| 관리 | 150 | `편집` · `수신/부재` 토글 |

표 아래 `BlindNote` · `Pagination`(서버 `page`/`size`).

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 수신 그룹 등록 / 편집 | 폼 → `POST /alert-recipient-groups` · `PUT /{groupId}` |
| 테스트 발송 | `POST /alert-recipient-groups/{groupId}/test-send` → 토스트 |
| 수신자 등록 / 편집 | 폼 → `POST /alert-recipients` · `PUT /{recipientId}` |
| 수신 / 부재 토글 | `PATCH /alert-recipients/{recipientId}/state` |
| 발송 조건 관리 | `/system/alert-condition` |
| 엑셀 다운로드 | 수신자 목록 xls (9열) |

### 3-1. 폼 필드

**수신 그룹** — 그룹명(필수) · 유효 시간대(select) · 발송 채널(check, 복수) · 야간 발송(radio) · 그룹 멤버(check, 등록된 수신자 중에서)
안내 : "그룹 멤버는 수신자 목록에 등록된 계정에서 고릅니다. 야간 수신 여부는 수신자별로도 관리됩니다."

**수신자** — 사번(필수, 편집 시 읽기 전용) · 메일(필수) · 휴대전화 · 사내 메신저 · 야간 수신(radio 수신/미수신)
안내 : "연락처는 알림 발송에만 사용되며, 데이터 접근 권한 worker 항목이 없는 계정에는 마스킹되어 보입니다."

## 4. 그 밖의 기능

`Hint` : "발송 조건(SY-04)은 '언제 보낼지', 이 화면은 '누구에게 보낼지'를 담당합니다. **그룹 이름을 바꾸면 발송 조건의 참조도 함께 바뀌니 주의하세요.**"

## 5. 사용 API

총 **8건**

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 157 | `getAlertRecipientsSummary` | 수신자 관리 요약 | GET | `/api/v1/alert-recipients/summary` | — | groupCnt, recipientCnt{receiving,absent}, nightCnt | 전산팀·통합관리자 | — | 2 |
| 158 | `getAlertRecipientGroups` | 수신 그룹 목록 | GET | `/api/v1/alert-recipient-groups` | — | items[{groupId,name,channels[],validWindow,night,members[],memberEmpNos[]}] | 전산팀·통합관리자 | worker | 1 |
| 159 | `postAlertRecipientGroups` | 수신 그룹 등록 | POST | `/api/v1/alert-recipient-groups` | name, channels[], validWindow, night, memberEmpNos[] | groupId | 전산팀·통합관리자 | — | 1 |
| 160 | `putAlertRecipientGroupsByGroupId` | 수신 그룹 수정 | PUT | `/api/v1/alert-recipient-groups/{groupId}` | 동일 | success | 전산팀·통합관리자 | — | 1 |
| 161 | `postAlertRecipientGroupsByGroupIdTestSend` | 수신 그룹 테스트 발송 | POST | `/api/v1/alert-recipient-groups/{groupId}/test-send` | — | sentCnt | 전산팀·통합관리자 | — | 2 |
| 162 | `getAlertRecipients` | 수신자 목록 | GET | `/api/v1/alert-recipients` | state, page, size | items[{empNo,name,dept,pos,posNm,mail,hp,messenger,night,state,stateNm,groups[]}], meta | 전산팀·통합관리자 | worker | 1 |
| 163 | `postAlertRecipients` | 수신자 등록 | POST | `/api/v1/alert-recipients` | empNo, mail, hp, messenger, night | recipientId | 전산팀·통합관리자 | — | 1 |
| 164 | `putAlertRecipientsByRecipientId` | 수신자 수정 | PUT | `/api/v1/alert-recipients/{recipientId}` | mail, hp, messenger, night | success | 전산팀·통합관리자 | — | 1 |
| 165 | `patchAlertRecipientsByRecipientIdState` | 수신/부재 토글 | PATCH | `/api/v1/alert-recipients/{recipientId}/state` | state(수신\|부재) | success, state | 전산팀·통합관리자 | — | 1 |

> 승격 규칙(`GET/PUT /api/v1/alert-escalation-rules`, No.169)은 서버에 남아 있으나 **이 화면은 부르지 않습니다.**
> 규칙은 [알림 현황] 의 「승격 대상」(`GET /api/v1/alerts/escalation-targets`)이 읽습니다.
> 당번 4건(No.166~168, `/api/v1/alert-duties`)은 서버에서 제거됐습니다.

## 6. 사용 DB 표

`ax.tb_alm_recip_group` · `ax.tb_alm_recip_group_channel` · `ax.tb_alm_recip_group_member` · `ax.tb_alm_recipient`
(테스트 발송은 `ax.tb_alm_alert` · `ax.tb_alm_send_log` 에 기록)

로컬 시드는 `API/src/main/resources/db/local/seed_alert_recipient.sql` — 수신 그룹 4 · 수신자 6(1명은 부재).

## 7. 개발 체크리스트

- [x] 요약 4카드
- [x] 탭 2종 전환
- [x] 수신 그룹 표 + 등록/편집/테스트 발송
- [x] 수신자 표 + 필터(그룹·상태) + 등록/편집/수신·부재 토글 + **`worker` 마스킹**
- [x] Tabulator 자동 열 너비 · 크기 조절 · 칸 경계
- [x] 엑셀 다운로드 · 발송 조건 화면 연계
- [x] 수신자 페이징
