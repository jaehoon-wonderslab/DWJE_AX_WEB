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

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 발송 조건 관리 · `Button primary(수신 그룹 등록)`) · `StatCard`×4 · `Hint` · **`Tabs`(수신 그룹 / 수신자 / 당번 · 승격)** · 탭별 `Card`+`Table` · `openFormModal`(그룹/수신자/당번) · `openConfirmModal`(당번 삭제)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /alert-recipients/summary`)

수신 그룹(`groupCnt`, 보조 "발송 조건이 참조하는 단위") · 수신자(`recipientCnt.receiving` 명, 보조 `야간 수신 N명`) · 부재(`recipientCnt.absent`, 보조 "대리 수신 지정 필요") · 당번 등록(`activeDutyCnt`)

### 2-2. 탭 1 — 수신 그룹 (`GET /alert-recipient-groups`)

그룹명 · 발송 채널 · 유효 시간대 · 멤버 수 · 구성원(`memberNames` 를 ` · ` 로 연결, 1줄) · 참조 조건 수 · 관리(`편집` · `테스트 발송`)

### 2-3. 탭 2 — 수신자 (`GET /alert-recipients`)

조회 조건 : 그룹(`전체` + 그룹명) · 상태(`전체` / 수신 / 부재) + `Button(조회)` · `Button(수신자 등록)`

| 열 | 폭 | 비고 |
| :--- | :--- | :--- |
| 이름 / 부서 / 직급 | 90 / 110 / 70 | |
| 메일 · 휴대전화 · 메신저 | 200 / 140 / 100 (mono) | **`worker` 데이터 권한 없으면 마스킹** |
| 야간 `night` | 70 | `수신`(green) / `미수신` |
| 소속 그룹 `groups` | flex | ` · ` 연결 |
| 상태 `state` | 80 | `수신`(green) / `부재`(amber) |
| 관리 | 150 | `편집` · `수신/부재` 토글 |

### 2-4. 탭 3 — 당번 · 승격

**당번 · 부재 시 대리 수신** (`GET /alert-duties`) : 시작 · 종료 · 수신 그룹 · 주 담당 · 대리 · 사유 · `Button danger(삭제)` + `Button(당번 등록)`
부제 : "기간 동안 대리 수신자에게 함께 발송됩니다"

**미확인 건 승격 단계** (`GET /alert-escalation-rules`) : 단계(`Badge amber`) · 경과 · 전달 대상 · 채널 · 조건(wrap)

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 수신 그룹 등록 / 편집 | 폼 → `POST /alert-recipient-groups` · `PUT /{groupId}` |
| 테스트 발송 | `POST /alert-recipient-groups/{groupId}/test-send` → 토스트 |
| 수신자 등록 / 편집 | 폼 → `POST /alert-recipients` · `PUT /{recipientId}` |
| 수신 / 부재 토글 | `PATCH /alert-recipients/{recipientId}/state` |
| 당번 등록 | 폼 → `POST /alert-duties` |
| 당번 삭제 | 확인 모달(danger) → `DELETE /alert-duties/{dutyId}` |
| 발송 조건 관리 | `/system/alert-condition` |
| 엑셀 다운로드 | 수신자 목록 xls (9열) |

### 3-1. 폼 필드

**수신 그룹** — 그룹명(필수) · 발송 채널(select) · 유효 시간대(select: 24시간 상시 / 08:00~20:00 / 06:00~18:00)
안내 : "그룹 멤버는 아래 수신자 목록에서 지정합니다. 야간 수신 여부는 수신자별로 관리됩니다."

**수신자** — 사번(필수) · 메일(필수) · 휴대전화 · 사내 메신저 · 야간 수신(radio 수신/미수신)
안내 : "연락처는 알림 발송에만 사용되며, 데이터 접근 권한 worker 항목이 없는 계정에는 마스킹되어 보입니다."

**당번** — 수신 그룹(select, 필수) · 주 담당자(필수) · 대리 수신자(필수) · 시작일 · 종료일(date, 필수) · 사유

**페이징** — 수신자 목록 API `page`/`size` 지원, 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

`Hint` : "발송 조건(SY-04)은 '언제 보낼지', 이 화면은 '누구에게 보낼지'를 담당합니다. **그룹 이름을 바꾸면 발송 조건의 참조도 함께 바뀌니 주의하세요.**"

## 5. 사용 API

총 **15건**

**알림 수신자 관리** — 15건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 157 | `getAlertRecipientsSummary` | 수신자 관리 요약 | GET | `/api/v1/alert-recipients/summary` | — | groupCnt, recipientCnt{receiving,absent}, nightCnt, activeDutyCnt | 전산팀·통합관리자 | — | 2 |
| 158 | `getAlertRecipientGroups` | 수신 그룹 목록 | GET | `/api/v1/alert-recipient-groups` | — | items[{groupId,name,channels[],validWindow,night,members[]}] | 전산팀·통합관리자 | worker | 1 |
| 159 | `postAlertRecipientGroups` | 수신 그룹 등록 | POST | `/api/v1/alert-recipient-groups` | name, channels[], validWindow, night, memberEmpNos[] | groupId | 전산팀·통합관리자 | — | 1 |
| 160 | `putAlertRecipientGroupsByGroupId` | 수신 그룹 수정 | PUT | `/api/v1/alert-recipient-groups/{groupId}` | 동일 | success | 전산팀·통합관리자 | — | 1 |
| 161 | `postAlertRecipientGroupsByGroupIdTestSend` | 수신 그룹 테스트 발송 | POST | `/api/v1/alert-recipient-groups/{groupId}/test-send` | — | sentCnt | 전산팀·통합관리자 | — | 2 |
| 162 | `getAlertRecipients` | 수신자 목록 | GET | `/api/v1/alert-recipients` | state, page, size | items[{empNo,name,dept,pos,mail,hp,messenger,night,state}], meta | 전산팀·통합관리자 | worker | 1 |
| 163 | `postAlertRecipients` | 수신자 등록 | POST | `/api/v1/alert-recipients` | empNo, mail, hp, messenger, night | recipientId | 전산팀·통합관리자 | — | 1 |
| 164 | `putAlertRecipientsByRecipientId` | 수신자 수정 | PUT | `/api/v1/alert-recipients/{recipientId}` | mail, hp, messenger, night | success | 전산팀·통합관리자 | — | 1 |
| 165 | `patchAlertRecipientsByRecipientIdState` | 수신/부재 토글 | PATCH | `/api/v1/alert-recipients/{recipientId}/state` | state(수신|부재) | success | 전산팀·통합관리자 | — | 1 |
| 166 | `getAlertDuties` | 당번·대리 목록 | GET | `/api/v1/alert-duties` | from, to, groupId | items[{dutyId,from,to,group,main,sub,reason}] | 전산팀·통합관리자 | worker | 1 |
| 167 | `postAlertDuties` | 당번 등록 | POST | `/api/v1/alert-duties` | from, to, groupId, mainEmpNo, subEmpNo, reason | dutyId | 전산팀·통합관리자 | — | 1 |
| 168 | `putAlertDutiesByDutyId` | 당번 수정 | PUT | `/api/v1/alert-duties/{dutyId}` | 동일 | success | 전산팀·통합관리자 | — | 2 |
| 168 | `deleteAlertDutiesByDutyId` | 당번 삭제 | DELETE | `/api/v1/alert-duties/{dutyId}` | 동일 | success | 전산팀·통합관리자 | — | 2 |
| 169 | `getAlertEscalationRules` | 승격 규칙 조회 | GET | `/api/v1/alert-escalation-rules` | stages[{stage,waitMin,targetGroupId}] | success | 전산팀·통합관리자 | — | 2 |
| 169 | `putAlertEscalationRules` | 승격 규칙 수정 | PUT | `/api/v1/alert-escalation-rules` | stages[{stage,waitMin,targetGroupId}] | success | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] 탭 3종 전환
- [ ] 수신 그룹 표 + 등록/편집/테스트 발송
- [ ] 수신자 표 + 필터(그룹·상태) + 등록/편집/수신·부재 토글 + **`worker` 마스킹**
- [ ] 당번 표 + 등록/삭제
- [ ] 승격 단계 표
- [ ] 엑셀 다운로드 · 발송 조건 화면 연계
- [ ] (개선) 수신자 페이징
