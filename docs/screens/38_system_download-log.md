# 38. `/system/download-log` — 보고서 다운로드 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/download-log` |
| 화면 ID | `sys-dl` |
| 라우트 파일 | `app/(main)/system/download-log.jsx` |
| MVC | `domains/system/view/DownloadLogView.jsx` · `controller/useDownloadLogController.js` |
| 기능 ID | SY-14 |
| 접근 권한 | 전산팀 · 통합관리자 (기록 API `POST /download-logs` 는 전 부서) |

보고서·화면에서 내려받은 파일 이력을 **계정 단위**로 기록합니다. **인쇄·PDF 출력도 함께 기록**되며, blind 처리된 항목은 파일에서 제외된 채 저장됩니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · `Button(보존 정책)`) · `StatCard`×4 · `Filters`(시작일 / 종료일 / 보고서 / 부서 / 형식) · `Grid cols=[3,1]` → `Card(tight)`(다운로드 이력 `Table` minWidth 1080 + `Pagination`) / `Card(tight)`(계정별 이용 `Table` + `ProgressBar`) · `openModal`(보존 정책)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /download-logs/summary`)

누적 다운로드(`total`, 보조 "이번 세션 기록 포함") · 금일(`today`, 보조 `lastDataDate()`) · blind 포함(`blindCnt`, 보조 "비공개 항목 제외 후 저장") · 최다 이용(`topUser`, 보조 "계정 기준")

### 2-2. 조회 조건

| 항목 | 기본값 | 선택지 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `recentDays(8)` — 오늘 기준 | |
| 보고서 | `전체` | `MENU` 의 「보고서」 그룹 항목명 |
| 부서 | `전체` | `DEPTS[].id` |
| 형식 | `전체` | 엑셀 (.xls) / CSV (.csv) / 인쇄 · PDF |

### 2-3. 다운로드 이력 표 (`GET /download-logs`)

일시(mono) · 계정 · 부서 · 보고서·화면 · 형식 · 대상 범위 · 행 수(없으면 `—`) · **blind 항목**(있으면 `Badge(amber) N건 제외`) · IP(mono)
부제 : "최근 순 · 이번 세션에서 내려받으면 맨 위에 추가됩니다"

### 2-4. 계정별 이용

계정 · 건수 · 비중(`ProgressBar`) — `summary.byUser`

### 2-5. 보존 정책 모달 (`GET /download-logs/retention-policy`)

`KeyValue`(보존 기간 / 보존 대상) + 각주. 부제 `현재 N건 보관 중`

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 조회 | `reload()` + 건수 토스트 |
| 엑셀 다운로드 | 이력 xls (9열) |
| 보존 정책 | 모달 |

**페이징** — `usePaging({resetKey: from\|to\|report\|dept\|format})` + `Pagination`.

## 4. 그 밖의 기능

- 모든 화면의 내려받기·인쇄가 `POST /download-logs` 로 자동 기록되어야 합니다 (전 부서 권한).
- 보존 기간 기본 3년(`retentionYears`), 아카이브 예정 시점 제공.

## 5. 사용 API

총 **4건**

**보고서 다운로드 이력** — 4건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 222 | `getDownloadLogsSummary` | 다운로드 이력 요약 | GET | `/api/v1/download-logs/summary` | from, to | totalCnt, todayCnt, blindIncludedCnt, topUser{name,cnt}, byReport[], byUser[] | 전산팀·통합관리자 | — | 1 |
| 223 | `getDownloadLogs` | 다운로드 이력 조회 | GET | `/api/v1/download-logs` | from, to, reportId, deptId, format, page, size | items[{ts,empNo,name,dept,report,format,scope,rowCnt,blindCnt,ip}], meta | 전산팀·통합관리자 | — | 1 |
| 224 | `postDownloadLogs` | 다운로드 이력 기록 | POST | `/api/v1/download-logs` | reportId, reportNm, format, scope, rowCnt, blindCnt | logId | 전 부서 | — | 1 |
| 225 | `getDownloadLogsRetentionPolicy` | 보존 정책 조회 | GET | `/api/v1/download-logs/retention-policy` | — | retentionYears(3), archivedCnt, nextArchiveAt | 전산팀·통합관리자 | — | 3 |


## 6. 개발 체크리스트

- [ ] 요약 4카드
- [ ] 조회 조건 5종
- [ ] 이력 표 9열 + blind 배지 + 페이징
- [ ] 계정별 이용 비중
- [ ] 보존 정책 모달
- [ ] **전 화면 내려받기·인쇄 시 기록 API 호출 연동 확인**
- [ ] 엑셀 다운로드
