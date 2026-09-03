# 33. `/system/audit-log` — 보안 감사 로그

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/audit-log` |
| 화면 ID | `sys-audit` |
| 라우트 파일 | `app/(main)/system/audit-log.jsx` |
| MVC | `domains/system/view/AuditLogView.jsx` · `controller/useAuditLogController.js` |
| 기능 ID | SY-09 |
| 접근 권한 | 전산팀 · 통합관리자 |

보안 필터링 처리 이력 · 사용자 접속 이력 · 데이터 접근 이력을 통합 관리합니다.
**권한 변경 · 마스킹 · 출력 · 모델 전환은 자동으로 기록됩니다.**

## 1. 컴포넌트

`PageHead`(+`Button(엑셀 다운로드)`) · `Filters`(시작일 / 종료일 / 유형 / 사용자 그룹 + `Button primary(조회)`) · `Card(tight)`+`Table`(minWidth 900)+`Pagination`

## 2. 화면에 출력해야 하는 정보

### 2-1. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `recentDays(7)` — **오늘 기준** | |
| 유형 | `전체` | 전체 / 마스킹 처리 / 마스킹 해제 요청 / 원본 조회 / 권한 변경 / 자동 생성 / 로그인 |
| 사용자 그룹 | `전체` | `repo.loadDeptOptions()` 서버 부서 목록 |

### 2-2. 감사 로그 표 (`GET /audit-logs`)

| 열 | 폭 | 렌더 |
| :--- | :--- | :--- |
| 시각 `ts` | 140 mono | |
| 유형 `type` | 140 | `Badge` — `해제` 포함→amber / `마스킹` 포함→기본 / 그 외→blue |
| 대상 `target` | 250 | |
| 사용자 그룹 `dept` | 110 | |
| 처리 결과 `result` | 180 | |
| 비고 `detail` | flex | wrap |

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 조회 | `reload()` |
| 엑셀 다운로드 | 감사 로그 xls (시각·유형·대상·사용자 그룹·처리 결과·비고) |

**페이징** — `usePaging({resetKey: from\|to\|type\|group})` + `Pagination`. 로그가 계속 쌓이므로 필수.

## 4. 그 밖의 기능

- 감사 로그는 **시스템이 지금 남기는 기록**이라 실적 기준일이 아니라 오늘 기준으로 조회합니다.
- 기록 원천 : 권한 변경(SY-01/02/03) · 마스킹 해제 요청(QC-03) · 보고서 출력(SY-14) · 모델 전환(SY-11) · 단가 수기 조정(RP-07) · 로그인/로그아웃(CM-03) 등.

## 5. 사용 API

총 **1건**

**보안 감사 로그** — 1건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 190 | `getAuditLogs` | 감사 로그 조회 | GET | `/api/v1/audit-logs` | from, to, type, userGroup, empNo, page, size | items[{ts,type,empNo,dept,target,detail,ip}], meta | 전산팀·통합관리자 | — | 1 |


## 6. 개발 체크리스트

- [ ] 기간·유형·사용자 그룹 조회 (오늘 기준)
- [ ] 감사 로그 표 6열 + 유형 배지 색 규칙
- [ ] 서버 페이징
- [ ] 엑셀 다운로드
- [ ] 자동 기록 대상(권한·마스킹·출력·모델 전환) 실제 적재 확인
