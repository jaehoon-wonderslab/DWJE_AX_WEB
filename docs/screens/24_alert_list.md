# 24. `/alert/list` — 알림 목록·상세

| 항목 | 값 |
| :--- | :--- |
| URL | `/alert/list` |
| 화면 ID | `alert-list` |
| 라우트 파일 | `app/(main)/alert/list.jsx` |
| MVC | `domains/alert/view/AlertListView.jsx` · `controller/useAlertListController.js` · `model/alertRepository.js` |
| 기능 ID | AL-01 |
| 접근 권한 | 전 부서 (발송 로그 카드는 전산팀·통합관리자) |

임계값 초과 건과 패턴 이상을 목록으로 관리합니다. **확인되지 않은 건은 상위 담당으로 승격됩니다.**

## 1. 컴포넌트

| # | 영역 | 컴포넌트 |
| :-- | :--- | :--- |
| 0 | 페이지 헤드 | `PageHead` + `Button(엑셀 다운로드)` · `Button(발송 조건 관리)`(`alert-cond` 권한자만) |
| 1 | 탭 | `Tabs` — `미확인 {unread}` / `확인됨 {read}` / `전체` |
| 2 | 조회 조건 | `Filters` + `SelectField`(심각도 / 설비 / 기간) + `Button primary(조회)` |
| 3 | 알림 목록 | `Card(tight)` + `Table`(minWidth 940) |
| 4 | 승격 대기 | `Card(tight)` + `Table`(minWidth 760) |
| 5 | 알림 발송 로그 | `Card(tight)` + `Table`(minWidth 860) |
| 6 | 상세 모달 | `openModal` + `AlertDetail`(`KeyValue` + `TextAreaField` + 확인 버튼) |

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 | 비고 |
| :--- | :--- | :--- | :--- |
| 탭(상태) | `미확인` | 미확인 / 확인됨 / 전체 | 건수 배지 동반 |
| 심각도 | `전체` | 전체 / 심각 / 경고 / 주의 | 서버는 `CRIT\|WARN\|LOW` — 리포지토리가 변환 |
| 설비 | `전체` | **조회 결과 `eqptCd` 유니크** (범위 표기로는 서버가 못 거름) |
| 기간 | `오늘` | 오늘 / 최근 7일 / 최근 30일 | |

### 2-2. 알림 목록 (`GET /alerts`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 등급 `level` | 58 중앙 | `Dot`(red/amber/gray) |
| 제목 `title` | flex 1.4 | |
| 대상 `target` | 120 mono | |
| 근거 수치 `metric` | 150 | |
| 감지 Agent `agent` | 130 | |
| 발생 `elapsed` | 90 | |
| 상태 | 96 | `확인됨`→`Badge(green)` / 아니면 `Button(확인)` |

행 클릭 → 상세 모달. 빈 상태 : "해당 조건의 알림이 없습니다."

### 2-3. 승격 대기 (`GET /alerts/escalation-targets`)

알림 · 대상(mono) · 경과(`{elapsedMin}분`) · 다음 승격(`Badge amber`) · 승격 시점 · 전달 대상
부제 : "미확인 상태가 지속되면 아래 순서로 상위 담당에게 전달됩니다"

### 2-4. 알림 발송 로그 (`GET /alerts/send-logs`)

발송 시각(mono) · 알림 ID(mono) · 채널 · 수신 그룹 · 수신자 수 · 결과(`성공`→green / 그 외 amber)

### 2-5. 알림 상세 모달 (`GET /alerts/{alertId}`)

제목 = `alert.title`, 부제 = `{target} · {elapsed} · {agent} Agent`

`KeyValue` : 대상 설비(`target (targetName)`) · 대상 LOT · 근거 수치 · 주 불량 유형 · 원인 후보 · 권고 조치 · 발생 시각 · 상태
+ `TextAreaField(조치 내용)` · 안내 "미확인 상태가 지속되면 상위 담당으로 자동 전달됩니다."
+ 미확인이면 `Button primary(확인 처리)`
푸터 : `닫기` / `관련 화면 열기`(상세에 `detail.link` 가 있을 때)

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 엑셀 다운로드 | 알림 목록 xls (등급·제목·대상·근거 수치·감지 Agent·발생·상태) |
| 발송 조건 관리 | `/system/alert-condition` |
| 조회 | `reload()` |
| 확인 / 행 클릭 | 상세 모달 |
| 확인 처리 | `POST /alerts/{alertId}/ack` (`actionNote`) → 목록 갱신 후 모달 닫기 |
| 관련 화면 열기 | 상세가 지정한 화면으로 이동 |

**페이징** — 서버 API 는 `page`/`size` 지원, 현재 화면 미노출. → **개선 항목**

## 4. 그 밖의 기능

- 마스킹 : 상세 응답은 `yield`, `mold` 가 blind 대상.
- 설비 선택지는 결과에서 생성 — 기간·탭을 바꾸면 함께 바뀝니다.
- 대시보드(`/dashboard/ai`)의 「이상 알림」 카드에서도 이 화면으로 진입합니다.

## 5. 사용 API

총 **5건**

**알림 목록·상세** — 5건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 102 | `getAlerts` | 알림 목록 조회 | GET | `/api/v1/alerts` | type(CRIT|WARN|LOW), eqptCd, period(today|7d|30d), ackState(OPEN|ACKED|CLOSED), page, size | items[{alertId,level,type,eqptCd,basisValue,threshold,agent,occurredAt,elapsed,ackState}], meta | 전 부서 | — | 1 |
| 103 | `getAlertsByAlertId` | 알림 상세 조회 | GET | `/api/v1/alerts/{alertId}` | — | eqptCd, eqptNm, lotNo, basisValue, threshold, mainDefectType, causeCandidates[], recommendation, agent | 전 부서 | yield, mold | 1 |
| 104 | `postAlertsByAlertIdAck` | 알림 확인 처리 | POST | `/api/v1/alerts/{alertId}/ack` | actionNote | ackAt, ackBy | 전 부서 | — | 1 |
| 105 | `getAlertsEscalationTargets` | 승격 대상 조회 | GET | `/api/v1/alerts/escalation-targets` | — | stages[{stage,waitMin,targets[]}] | 전 부서 | — | 2 |
| 106 | `getAlertsSendLogs` | 알림 발송 로그 조회 | GET | `/api/v1/alerts/send-logs` | from, to, condId, channel, page, size | items[{ts,condNm,channel,recipient,result,delaySec}], meta | 전산팀·통합관리자 | — | 2 |


## 6. 개발 체크리스트

- [ ] 탭 3종 + 건수 배지
- [ ] 조회 조건 3종 (심각도 라벨↔코드 변환, 설비 = 결과 기반)
- [ ] 알림 목록 표 + `Dot` 등급 + 확인 버튼
- [ ] 상세 모달 (원인 후보 · 권고 조치 · 조치 내용 입력 · 확인 처리)
- [ ] 관련 화면 이동 링크
- [ ] 승격 대기 표
- [ ] 발송 로그 표 (전산팀·통합관리자)
- [ ] 엑셀 다운로드 · 발송 조건 화면 이동(권한 분기)
- [ ] (개선) 목록 페이징
