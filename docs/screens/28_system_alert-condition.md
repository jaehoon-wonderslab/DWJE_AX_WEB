# 28. `/system/alert-condition` — 이상 알림 발송 조건 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/alert-condition` |
| 화면 ID | `alert-cond` |
| 라우트 파일 | `app/(main)/system/alert-condition.jsx` |
| MVC | `domains/system/view/AlertCondView.jsx` · `controller/useAlertCondController.js` |
| 기능 ID | SY-04 |
| 접근 권한 | 전산팀 · 통합관리자 |

**「언제 · 무엇을 기준으로」** 보낼지를 정의합니다. **「누구에게 · 어떤 연락처로」** 는 [29. 알림 수신자 관리](./29_system_recipient.md) 담당이며, 여기서는 **수신 그룹 이름만 참조**합니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 알림 수신자 관리 · `Button primary(조건 등록)`) · `StatCard`×4 · `Hint` · `Filters`(심각도 / 상태 / 검색) · `Card(tight)`+`Table`(minWidth 1400) · `openFormModal`(조건 등록·편집, wide) · `openModal`(테스트 미리보기)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /alert-conditions/summary`)

등록 조건(`total`, 보조 `활성 N · 중지 M`) · 위험 등급(`severityRisk`, 보조 "즉시 발송 대상") · 수신 그룹(`groupCnt`) · 중지 조건(`disabled`)

### 2-2. 조회 조건

심각도(`전체` / 위험 / 주의 / 낮음) · 상태(`전체` / 활성 / 중지) · 검색(`TextField` — 조건명 · 지표)

### 2-3. 발송 조건 표 (`GET /alert-conditions`) — 12열

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 조건명 `name` | 170 | |
| 감지 지표 `metric` | 190 | |
| 비교 · 임계값 | 150 | `{op} {threshold}` |
| 지속 조건 `duration` | 130 | 예) `10분 연속`, `즉시` |
| 대상 범위 `target` | 160 | 예) `PR-01 ~ PR-10` |
| 심각도 `severity` | 84 | `위험`→red / `주의`→amber / 그 외 기본 |
| 발송 채널 `channels` | 150 | |
| 수신 그룹 `groups` | 200 | |
| 유효 시간대 `window` | 120 | |
| 중복 억제 `dedup` | 90 | |
| 상태 `enabled` | 80 | `활성`(green) / `중지` |
| 관리 | 200 | `편집` · `중지/활성` · `테스트` |

`Hint` : "발송 조건은 '언제 · 무엇을 기준으로' 보낼지를 정합니다. '누구에게 · 어떤 연락처로' 보낼지는 알림 수신자 관리(SY-05)에서 관리하며, 여기서는 수신 그룹 이름만 참조합니다."

## 3. 버튼 및 폼

| 버튼 | 동작 |
| :--- | :--- |
| 조건 등록 / 편집 | 폼(wide) → `POST /alert-conditions` · `PUT /alert-conditions/{condId}` |
| 중지 / 활성 | `PATCH /alert-conditions/{condId}/state` |
| 테스트 | `POST /alert-conditions/{condId}/test-send` → **미리보기 모달**(제목·본문·각주) → `테스트 발송` 버튼 |
| 엑셀 다운로드 | 조건 목록 xls (11열) |
| 알림 수신자 관리 | `/system/recipient` |
| 조회 | `reload()` |

### 3-1. 조건 등록·편집 폼

| 필드 | 타입 | 선택지 / 예시 |
| :--- | :--- | :--- |
| 조건명 | text (필수) | `예) 불량률 임계 초과` |
| 감지 지표 | text (필수) | `예) 공정 불량률 (%)` |
| 비교 | select | `>=` `>` `<=` `<` `=` |
| 임계값 | text (필수) | `예) 3.0 %` |
| 지속 조건 | text | `예) 10분 연속 · 즉시` |
| 대상 범위 | text | `예) PR-01 ~ PR-10` |
| 심각도 | select | 위험 / 주의 / 낮음 |
| 발송 채널 | select | 메일 / 시스템 팝업 / SMS / 메일 · 시스템 팝업 / 메일 · SMS |
| 수신 그룹 | select (전폭) | `groupNames` (수신자 관리에서 만든 그룹) |
| 유효 시간대 | select | 24시간 상시 / 08:00 ~ 20:00 / 09:00 일 1회 / 18:00 일 1회 |
| 중복 억제 | select | 없음 / 15분 / 30분 / 60분 / 120분 / 일 1회 |

안내 : "임계값은 지표 측정 데이터 관리(SY-13)의 기준 수치와 함께 판정에 사용됩니다. 수신 그룹의 멤버와 연락처는 알림 수신자 관리(SY-05)에서만 바꿉니다."

**페이징** — 서버 API `page`/`size` 지원, 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- ⚠️ 심각도·채널 선택지가 화면 상수(`SEVERITIES`, `CHANNELS`)로 하드코딩 — 공통코드 연동 검토.
- 서버 요청 시 `metricStdId` 로 지표 기준을 참조합니다(SY-13 연동).

## 5. 사용 API

총 **6건**

**이상 알림 발송 조건 관리** — 6건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 151 | `getAlertConditionsSummary` | 발송 조건 요약 | GET | `/api/v1/alert-conditions/summary` | — | activeCnt, totalCnt, todaySentCnt{byChannel}, dedupCnt, avgDelaySec | 전산팀·통합관리자 | — | 2 |
| 152 | `getAlertConditions` | 발송 조건 목록 조회 | GET | `/api/v1/alert-conditions` | severity, channel, state, page, size | items[{condId,on,name,metric,op,threshold,duration,target,severity,channels[],groups[],validWindow,dedupMin}], meta | 전산팀·통합관리자 | — | 1 |
| 153 | `postAlertConditions` | 발송 조건 등록 | POST | `/api/v1/alert-conditions` | name, metricStdId, op, threshold, duration, target, severity, channels[], groupIds[], validWindow, dedupMin | condId | 전산팀·통합관리자 | — | 1 |
| 154 | `putAlertConditionsByCondId` | 발송 조건 수정 | PUT | `/api/v1/alert-conditions/{condId}` | 동일 | success | 전산팀·통합관리자 | — | 1 |
| 155 | `patchAlertConditionsByCondIdState` | 발송 조건 활성/중지 | PATCH | `/api/v1/alert-conditions/{condId}/state` | on(true|false) | success | 전산팀·통합관리자 | — | 1 |
| 156 | `postAlertConditionsByCondIdTestSend` | 발송 조건 테스트 | POST | `/api/v1/alert-conditions/{condId}/test-send` | — | sentCnt, recipients[] | 전산팀·통합관리자 | — | 1 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] 조회 조건 3종(심각도·상태·검색)
- [ ] 12열 조건 표 + 상태/심각도 배지
- [ ] 등록·편집 폼(11필드, wide)
- [ ] 활성/중지 토글
- [ ] 테스트 발송 미리보기 모달
- [ ] 수신자 관리 화면 연계
- [ ] 엑셀 다운로드
- [ ] (개선) 페이징 · 선택지 공통코드화
