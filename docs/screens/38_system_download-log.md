# 38. `/system/download-log` — 보고서 다운로드 이력

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/download-log` |
| 화면 ID | `sys-dl` |
| 라우트 파일 | `app/(main)/system/download-log.jsx` |
| MVC | `domains/system/view/DownloadLogView.jsx` · `controller/useDownloadLogController.js`(+`controller/gridExport.js`) · `model/systemRepository.js`(SY-14 구역) · 기록 유틸 `shared/utils/exportUtil.js` |
| 기능 ID | SY-14 |
| 접근 권한 | 전산팀 · 통합관리자 (기록 API `POST /download-logs` 는 **그 화면의 조회 권한자**) |

보고서·화면에서 내려받은 파일과 인쇄 기록을 **계정 단위**로 봅니다. 권한 밖 값은 파일에 「비공개」 로 채워지고 그 셀 수가 남습니다. 기록은 고칠 수 없습니다.

**2026-09-08 개편** — 계정별 이용 카드 · blind 포함 · 최다 이용 카드 제거(되살리지 않음, 「제거됨」). 이력 표는 `TabulatorGrid`, **쪽을 나누지 않습니다**(`size=1000` 한 번에, 14건 넘으면 표 안 스크롤 높이 620).

**2026-10-01 개편** — 기획 10 DLG-02 · 03 · 04 · 05 · 06 · 08 · 09 · 10 · 12 · 15 · 16 과 공통 10.6(CMN-07)을 반영했습니다.

## 1. 컴포넌트

`PageHead`(+`ExportMenuButton` [엑셀 다운로드 ▾] · `Button(보존 정책)`) · `StatCard`×2 · `Filters`(시작일 / 종료일 / 화면 / 부서 / 형식 / 범위 / 계정·검색어 / blind 포함만 + 조회) · `Card`(다운로드 이력 `TabulatorGrid`, 열 이동 가능) · `openModal`(행 상세 · 보존 정책)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드 (`GET /download-logs/summary`)

「조회 기간」(`totalCnt`) · 「금일」(`todayCnt`). 요약 요청에도 목록과 같은 조건(from · to · 화면 · 부서 · 형식 · 범위 · 검색어)을 넘겨 카드 수와 표 total 이 같게 합니다. 「누적」 이라는 말은 보존 정책 모달의 보관 건수에만 씁니다. 요약만 실패하면 카드에 `—`.

### 2-2. 조회 조건

| 항목 | 기본값 | 선택지 · 서버 파라미터 |
| :--- | :--- | :--- |
| 시작일 / 종료일 | `recentDays(7)` — 오늘 기준(감사 로그와 같은 7일) | from · to |
| 화면 | `전체` | `permRows()` 중 동작 권한 행 제외, 메뉴 순서대로 「그룹 · 화면」 → `menuId`. 예전 「보고서」 선택(보고서 7종만)은 제거됨 |
| 부서 | `전체` | 서버 부서 목록 → `deptId`(부서 **ID**) |
| 형식 | `전체` | 공통코드 `RPT_FORMAT`(XLS · XLSX · CSV · PDF · PNG · JSONL) → `format` |
| 범위 | `전체` | 조회 목록(VIEW) · 전체 다운로드(ALL) · 미상(UNKNOWN = 2026-10 이전 기록) → `scopeCd` |
| 출처 | `전체` | 브라우저(CLIENT) · 서버(SERVER) · 미상(UNKNOWN) → `origin` |
| 계정·검색어 | 빈 값 | 사번·이름·보고서명·조건 → `keyword`. **Enter·「조회」 에서만** |
| blind 포함만 | 끔 | 켰을 때만 `blindOnly=true` |

### 2-3. 다운로드 이력 표 (`GET /download-logs`) — 13열

| 열 | 필드 | 폭 | 렌더 |
| :--- | :--- | :--- | :--- |
| 일시 | `ts` | minWidth 150 | mono |
| 계정 | `empNo` | 84 | mono |
| 이름 | `name` | 90 | |
| 부서 | `dept` | minWidth 110 | |
| 보고서 | `report` | minWidth 220 · grow 2 | |
| 화면 | `menuId` (없으면 예전 기록의 `reportId`) | minWidth 170 | 메뉴명 + 페이지 URL 두 줄. 메뉴에 없는 ID 는 그대로 |
| 형식 | `format` | 110 | `RPT_FORMAT` 표시명 |
| **범위** | `scopeCd` | 96 | 조회 목록 / 전체 / — |
| **조회 조건** | `condSummary`(없으면 `scope`) | minWidth 200 | muted. attrs 없이 만든 파일(`params.note='attrs-missing'`)은 amber 「attrs 누락」 |
| 행 수 | `rowCnt` | 80 | 오른쪽 정렬 |
| blind 항목 | `blindCnt` | 104 | amber 배지 `N건` (비공개로 채운 셀 수) |
| **출처** | `origin` | 80 | 브라우저(CLIENT) / 서버(SERVER) / — |
| IP | `ip` | 116 | mono (마지막 열) |

- 최소 폭 합 1,610px. 열을 숨기거나 줄이지 않고 표 안에서 가로로 밉니다. 폭 390px 에서 오른쪽 끝까지 밀면 「IP」 머리글과 값이 보이고 머리글·본문이 함께 움직입니다.
- 부제: 「전체 {total}건 중 최근 {n}건 · 열 제목으로 정렬할 수 있습니다」. `total > n` 이면 「— 전량은 엑셀 다운로드로 받으세요」 를 덧붙입니다(서버 `meta.total` 기준).

### 2-4. 행 상세 (`GET /download-logs/{dlId}`)

일시 · 계정 · 화면 · 보고서 · 형식 · 출처 · 범위·조회 조건 · 행 수 · 비공개 처리 n건(셀) · 항목별 합계 m건(서버 `blindCellSum`, 서버 `blindMismatch=true` 면 amber 「항목별 합계와 다름」. `blindBasis=LEGACY`(2026-10 이전 서버 기록, 항목 키 수)는 비교하지 않고 「항목 수 기준(구)」 표시) · 파일·크기 · IP. 「생성 조건」(`params` 키·값, 브라우저 기록은 「생성 조건 없음(브라우저 생성)」) · 「제외된 항목」(항목명·셀 수, 없으면 「제외된 항목 없음」). 상세 API 가 실패하면 목록 값만 보여 주고 안내합니다.

### 2-5. 보존 정책 모달 (`GET /download-logs/retention-policy`)

보존 기간 · 보관 중 · 보존 기간 경과(아카이브 대기) · 아카이브 보관 · 가장 오래된 기록 · 마지막 아카이브 · 다음 아카이브. 2026-10-02 결정 R-20 으로 배치가 켜져(감사 로그와 같은 매월 1일 03:00) 다음 아카이브 시각을 보이고, 각주는 「보존 기간(3년)이 지난 기록은 비공개 내역과 함께 매월 1일 03:00 배치로 아카이브 표로 옮겨집니다…」 입니다. 「배치 꺼짐」 안내는 제거했고, 서버 설정이 아직 꺼져 있으면 다음 아카이브 칸만 「— (서버 설정 꺼짐)」 `archivedCnt` 는 2026-10 부터 아카이브 표 건수입니다(옛 뜻은 `archiveTargetCnt`).

### 2-6. 상태별 화면

화면 전체 `Loading` 은 없앴습니다 — 머리글·필터는 늘 보이고 카드 안에서만 로딩합니다. 목록 오류는 카드 안 「다운로드 이력을 불러오지 못했습니다 — {메시지}」 + 「다시 시도」.

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 조회 | 입력칸(계정·검색어) 반영. 같은 값이면 다시 조회. 예전 「다시 조회했습니다」 토스트는 즉시 조회와 겹쳐 제거 |
| 엑셀 다운로드 ▾ → **조회 목록 다운로드(n건)** | 그리드에 지금 보이는 행(열 필터 반영)을 **그리드의 정렬·열 순서**대로 `.xlsx`(브라우저 생성, 2026-10-06 이전 `.xls`). n = 그리드 행 수. `attrs = [ts,empNo,name,dept,report,menuId,format,scopeCd,condSummary,rowCnt,blindCnt,origin,ip]`. 기록 `scopeCd=VIEW` · `condSummary`(「{from}~{to} · 화면 · 부서 · 형식 · 범위 · 검색어」) · `menuId=sys-dl` |
| 엑셀 다운로드 ▾ → **전체 다운로드(N건)** | `POST /download-logs/export {scope:'ALL', menuId:'sys-dl', format:'xlsx', condSummary:'전체 · 최근 순'}` — 조건 무관 보관 중 전체(서버 생성, 서버가 이력 기록). 기간·검색어는 보내지 않습니다. N = 보존 정책 `totalCnt`. 상한 50,000(서버 3단계) 초과는 헤더 `X-Export-Truncated`·`X-Export-Total`·`X-Export-Limit` 로 받아 토스트. 서버 파일의 「비공개 처리 n건」 은 별도 「안내」 시트 |
| 보존 정책 | 모달 |

받은 뒤에는 목록·보존 정책을 다시 불러 방금 기록이 맨 위에 보이게 합니다. 두 항목 모두 조회 권한으로 받습니다(R-10).

**페이징 없음** — `size=1000` 으로 한 번에 받아 표 안에서 스크롤합니다 (2026-09-08).

## 4. 내려받기 기록 규칙 (`exportUtil.js`, 2026-10-01)

| 규칙 | 내용 | 기획 |
| :--- | :--- | :--- |
| 기록 선행 | (기록 실패 응답 코드는 서버 `E-SERVER` — 화면은 코드와 무관하게 실패로 봅니다) 파일을 저장하기 **전에** `POST /download-logs` 를 기다립니다. 실패하면 파일을 만들지 않고 「내려받기 기록을 남기지 못해 파일을 만들지 않았습니다. 잠시 뒤 다시 시도해 주세요.」. 인쇄는 창을 연 뒤 기록하고 실패하면 창을 닫습니다. 목 모드는 기록 결과와 관계없이 저장 | DLG-05 |
| 형식 코드 | 표시명 대신 `FORMAT` 상수 — downloadXls `XLS` · downloadXlsx/downloadXlsxTree `XLSX` · downloadCsv `CSV` · printDocument `PDF` · saveChartAsPng `PNG` | DLG-02 |
| 화면 식별자 | 현재 URL 의 화면 ID 를 `menuId` 로 보냅니다(`reportId` 는 보내지 않음). 호출부가 `menuId` 를 주면 그 값 | DLG-03 |
| 범위·조건 | 인자 `scope`('VIEW'\|'ALL') → 본문 `scopeCd`, `condSummary`(500자). 사람이 읽는 범위 문구는 기존 본문 `scope`(100자) — 인쇄 「인쇄 창 열림 — 실제 인쇄·PDF 저장 여부는 확인할 수 없음」, 차트 이미지는 차트 부제 | DLG-15 · DLG-13 · 공통 10.6 |
| 비공개 건수 | 권한 밖 값은 `비공개` 로 채우고 파일 첫 줄(xlsx 는 머리 정보 줄, xlsxTree 는 1행)에 「비공개 처리 n건(데이터 접근 권한 기준)」. 같은 n 을 `blindCnt`(셀 수)로 보냄 | DLG-15 · R-10 |
| attrs 누락 | `attrs` 없는 호출은 개발 모드 콘솔 오류 + 본문 `params.note='attrs-missing'` → 이 화면 「조회 조건」 칸에 「attrs 누락」 | DLG-15 |
| 누락 경로 | 차트 이미지 저장(`saveChartAsPng`)도 기록. 업로드 원본·AI 응답 내려받기·서버 생성 파일(`downloadFromServer`)은 서버가 기록하므로 브라우저는 부르지 않음 | DLG-04 |
| 기타 | `fileSize`(byte)를 함께 보냄. 인쇄 행 수 — 보고서 5화면(아침회의 PRESS·Plating, 연간 출하계획, 제품별 수율, 고객사별 LRR)이 인쇄 대상 행 수를 `rowCount` 로 넘김(2026-10-01 3단계) | DLG-13 |

파일 저장 지점 점검(2026-10-01): `exportUtil.saveBlob`(downloadCsv · downloadXls · downloadXlsx · downloadXlsxTree · saveChartAsPng · downloadFromServer) — 앞의 다섯은 기록 선행, `downloadFromServer` 는 서버 기록. `uploadReportRepository.js` 업로드 원본 · `aiRepository.js` AI 응답/불량 Top 10 — 서버 기록 경로(업로드 원본 서버 기록은 서버 DLG-04 작업).

## 5. 사용 API

총 **6건**

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | 우선순위 |
|---|---|---|---|---|---|---|---|---|
| 222 | `getDownloadLogsSummary` | 다운로드 이력 요약 | GET | `/api/v1/download-logs/summary` | from, to + 목록과 같은 필터 | totalCnt, todayCnt | 전산팀·통합관리자 | 1 |
| 223 | `getDownloadLogs` | 다운로드 이력 조회 | GET | `/api/v1/download-logs` | from, to, menuId, reportId(호환), deptId, format, scopeCd, keyword, empNo, blindOnly, origin(CLIENT·SERVER·UNKNOWN), page, size | items[{dlId,ts,empNo,name,dept,deptId,report,menuId,menuNm,reportId,format,formatRaw,origin,scope,scopeCd,condSummary,rowCnt,blindCnt,fileNm,fileSize,params,ip,result}], meta | 전산팀·통합관리자 | 1 |
| 224 | `postDownloadLogs` | 다운로드 이력 기록 | POST | `/api/v1/download-logs` | menuId, reportNm, format(코드), scopeCd, condSummary, scope(문구), rowCnt, blindCnt, fileSize, params | logId | 그 화면의 조회 권한 | 1 |
| 225 | `getDownloadLogsRetentionPolicy` | 보존 정책 조회 | GET | `/api/v1/download-logs/retention-policy` | — | retentionYears, enabled, totalCnt, expiredCnt, archivedCnt, archiveTargetCnt, oldestAt, lastArchiveAt, nextArchiveAt | 전산팀·통합관리자 | 3 |
| - | `getDownloadLogsByDlId` | 다운로드 이력 상세 (신규) | GET | `/api/v1/download-logs/{dlId}` | dlId | 목록 필드 + params, fileNm, fileSize, result, origin, blindFields[{fieldKey,fieldNm,cellCnt}], blindCellSum, blindMismatch, blindBasis(CELL·LEGACY) | 전산팀·통합관리자 | 2 |
| - | `postDownloadLogsExport` | 다운로드 이력 전체 내려받기 (신규) | POST | `/api/v1/download-logs/export` | body: scope(ALL), menuId | 파일(xlsx), 헤더 X-Export-Truncated · X-Export-Total | 전산팀·통합관리자(조회 권한) | 2 |

## 6. 시험

`tests/system/download-log-browser.cjs` — `page.route` 로 응답 고정(실 API 모드 개발 서버 필요). 부서 ID · 화면 menuId · 범위 scopeCd 요청, 요약 기간·카드 이름, 1,500/1,000 부제, 상세(생성 조건·제외 항목·불일치 표시), 390px 가로 스크롤, 목록 500 오류, 패널 두 항목·건수, 조회 목록(그리드 정렬·열 순서·기록 선행·VIEW·condSummary), 전체(서버만), 360px 패널, 출하계획 CSV 기록 선행·첫 줄 비공개 건수·기록 500 이면 파일 없음.

## 7. 개발 체크리스트

- [x] 요약 2카드(조회 기간 · 금일)
- [x] 조회 조건 9종
- [x] 이력 표 13열(Tabulator) + 범위 · 조회 조건 · 출처 · 페이징 없음
- [x] 계정별 이용 비중 (제거)
- [x] 보존 정책 모달(새 필드)
- [x] 행 상세(생성 조건 · 제외된 항목)
- [x] 엑셀 옵션 패널(조회 목록 VIEW · 전체 ALL)
- [x] 전 화면 내려받기·인쇄 기록 선행 · 형식 코드 · menuId (`exportUtil`)
- [x] 보고서 5화면 인쇄 호출부 `rowCount` 전달(DLG-13)
- [x] 실 API 시험 `tests/system/audit-download-live-browser.cjs`(18081: 목록·실 상세·VIEW 기록)
