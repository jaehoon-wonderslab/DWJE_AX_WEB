# 41. `/system/upload-doc` — 업로드 문서 목록

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/upload-doc` |
| 화면 ID | `sys-upload-doc` |
| 라우트 파일 | `app/(main)/system/upload-doc.jsx` |
| MVC | `domains/system/view/UploadDocView.jsx` · `controller/useUploadDocController.js` · `model/systemRepository.js`(SY-16 구역) · `model/gridExport.js`(조회 목록 엑셀) |
| 기능 ID | SY-16 |
| 접근 권한 | 조회 — `sys-upload-doc` 화면 권한. 숨기기·복원 — `sys-upload-doc` **쓰기 권한**(R-06, 서버 `requireWrite`) |
| 기획 | `web 기획/11_sys-upload-doc_업로드문서목록.md` (2026-10-01 UPD-01·02·06·07·08·09·10·12·15 화면 반영) |

AI 통합 대시보드 「업로드 리포트」 에 올라온 엑셀 문서와 버전 이력을 조회하고, 잘못 올린 문서를 숨기거나 복원합니다(2026-10-02 결정 R-19 · D-13 — 문서 단위 소프트 삭제, 원본 파일·버전은 그대로). 편집·버전 삭제는 없습니다. 원본 파일은 대시보드에서 받습니다(시스템관리 원본 다운로드 UPD-11 은 열지 않음). 예전 설명의 「읽기 전용」 문구는 2026-10-02 정리했습니다.

## 1. 컴포넌트

`PageHead`(+`ExportMenuButton`) · `StatCard`×4 · `Filters`(검색어 · 업로더 · 파싱 상태 · 기간 · 조회 · 초기화) · `FormAlert`(조회 오류) · `Card`+`TabulatorGrid`(+`Pagination`) · 드로어(문서 정보 + 버전 이력)

카드는 서버 `summary`, 표는 **조회 조건 결과**(서버 쪽 나눔)입니다. 엑셀 패널은 공통 컴포넌트가 포털로 그립니다(2단계의 `zIndex` 회피 코드는 **제거됨**). 첫 정렬(`initialSort`)은 모듈 상수로 넘겨, 조건을 입력할 때 표가 다시 만들어지지 않게 합니다.

## 2. 화면에 출력해야 하는 정보

### 2-1. 카드 4종 (`GET /system/uploads` 응답 `summary`, UPD-07)

요약은 서버 단계에 따라 두 모양이 오고, 저장소(`normalizeUploadSummary`)가 하나로 맞춥니다.

| 서버 | 모양 | 기준 | 화면 |
| :--- | :--- | :--- | :--- |
| API 3단계(현재) | 아래 표 필드 + `total·ok·warn·fail` | 조건 무관 전체(`docCnt…`) | 아래 표 그대로 |
| API 2단계(이전) | `{ total, ok, warn, fail }` 만 | 파싱 상태 조건만 뺀 지금 조회 조건 | 문서 수 = `total` + "정상 a · 경고 b · 실패 c · 조회 조건 기준(파싱 상태 제외)", 나머지 3장 `—` (하위 호환으로만 남김) |

| 카드 | 값 | 보조 |
| :--- | :--- | :--- |
| 문서 수 | `docCnt` 건 | `failDocCnt` 가 있으면 "최신 버전 파싱 실패 N건"(빨강), 없으면 "숨김 제외 전체" |
| 총 버전 | `versionCnt` 개 | "이번 달 `monthVersionCnt`개" |
| 원본 용량 | `totalBytes` (KB/MB) | "1건 상한 `maxBytesPerFile`" (기본 20 MB) |
| 최근 업로드 | `lastUploadedAt` (MM-dd HH:mm) | 연도 |

서버가 `summary` 를 아직 주지 않으면 값은 `—` 입니다. 예전 클라이언트 계산(「이번 달 업로드」 카드)은 **제거됨**.

### 2-2. 조회 조건 (「조회」 를 눌러야 서버에 갑니다, UPD-01·06)

- 검색어 — 안내 "문서명 · 메모 · 파일명 · 문서 ID" (Enter 로도 조회)
- 업로더 — 서버 `uploaders[{empNo, name, cnt}]`(문서 전체 기준, `cnt` 는 올린 버전 수 — 기획안 `{userId, userName, docCnt}` 도 받음) — 값은 사번, 표시는 이름(동명이인은 `이름 (사번)`). 조회 결과에 따라 줄지 않습니다. 서버가 `uploaders` 를 주지 않으면 목록의 이름으로 만듭니다(이름 부분 일치 하위 호환).
- 파싱 상태 — 전체 / 정상(`OK`) / 경고(`WARN`) / 실패(`FAIL`)
- 최근 업로드 시작 · 종료 — 최신 버전 업로드일(KST). 비우면 전 기간. 시작 > 종료면 화면이 먼저 막고, 서버 400 은 `FormAlert` 로 보여 줍니다.

### 2-3. 업로드 문서 표 (`GET /system/uploads?page&size`)

8열 — 문서명(+메모, 최신 버전 원본이 없거나 크기가 다르면 빨간 「원본 없음」·「크기 불일치」 태그 — 행 `fileState`, 열 추가 없음) · 최신 버전 · 버전 수 · 최초 등록자 · 최근 업로더 · 최근 업로드 · 크기 · 파싱 상태. width/minWidth 유지(최소 합 962px), 좁은 화면은 표 안 가로 스크롤. 카드 부제 `조건 결과 {meta.total}건 · 최근 업로드 순 …`, 표 아래 `Pagination`(기본 50). 예전 `ALL_SIZE=500` 한 번에 받기는 **제거됨**.

| 상태 | 표시 |
| :--- | :--- |
| 첫 조회 중 | `Loading compact` |
| 조건 결과 0건(또는 조건 적용 중) | "조회 조건에 맞는 업로드 문서가 없습니다. 조건을 넓혀 보십시오." — 카드는 전체 값 유지 |
| 전체 0건 | "업로드 문서가 없습니다. 권한이 있는 담당자가 … 엑셀을 올리면 여기에 쌓입니다." |
| 오류 | `FormAlert`(서버 메시지), 카드·표는 직전 값 유지 |

### 2-4. 드로어 — 버전 이력 (`GET /system/uploads/{docId}/versions`)

문서 ID · 메모 · 최초 등록 · 최근 업로드 + 버전 카드(최신 먼저)

- `v{n}` · 파싱 배지 · 원본 상태 배지(`fileState` 가 `MISSING` "원본 없음" / `SIZE_MISMATCH` "크기 불일치", 빨강 + 각주 "API 서버 저장소를 확인하십시오", UPD-08)
- "경고 N건 ▾" — 누르면 `warnings[]` 문장 펼침, FAIL 버전은 기본으로 펼침, `warningTruncated` 면 "앞 20건만 표시합니다"(UPD-09)
- 파일명 · 업로더 · 업로드 시각 · "메모: {memo}"(없으면 줄 없음, UPD-02) · "직전 버전과 같은 파일"(`duplicateOf` 또는 sha256 비교, UPD-10) · sha256

### 2-5. 숨기기 · 복원 (R-19 · D-13)

- 조회 조건 끝의 「숨긴 문서 포함 (N건)」 체크 — 누르면 바로 `includeDeleted=true` 로 다시 조회(체크하지 않으면 보내지 않음, 서버 기본 false). N 은 요약 `deletedDocCnt`.
- 숨긴 행은 흐리게(불투명도 0.55) 그리고 문서명 옆 「숨김」 태그 + 아래 "숨긴 사유 — …". 드로어에 「숨김」 줄(숨긴 사람 · 시각 · 사유).
- 표 마지막 열 「관리」(폭 96) — 숨기지 않은 문서 「숨기기」, 숨긴 문서 「복원」.
  - 숨기기: 사유 필수·200자 모달 → `DELETE /system/uploads/{docId}` 본문 `{ reason }` (공통 request() 가 DELETE 에 본문을 싣지 않아 axios `data` 로 보냄 — 사유가 주소에 남지 않음). 숨기면 대시보드 업로드 리포트·AI 패널 문서 선택·기본 목록에서 빠집니다.
  - 복원: 확인 없이 `POST /system/uploads/{docId}/restore`.
  - 이미 숨김·숨기지 않음 409, 사유 오류 400, 쓰기 권한 없음 403(`E-AUTH-004`)은 서버 문구를 토스트로.
- 쓰기 권한(`canWrite('sys-upload-doc')`)이 없으면 두 단추를 비활성으로 두고 툴팁 "이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요."
- 카드 「문서 수」 는 숨김 제외(`docCnt`)이고, 숨긴 문서가 있으면 보조에 "숨긴 문서 N건 별도".
- 엑셀 — 숨긴 문서 포함으로 조회했으면 「숨김」·「숨긴 사유」 열에 값이 들어가고 조건 요약에 "숨긴 문서 포함".
- 대시보드 업로드 리포트는 서버가 숨긴 문서를 빼고 주므로 화면 변경이 없습니다.

## 3. 버튼

| 버튼 | 동작 |
| :--- | :--- |
| 엑셀 다운로드 ▾ | 패널 — 「조회 목록 다운로드(n건)」 / 「전체 다운로드(N건, N=`summary.docCnt`)」 |
| 조회 · 초기화 | 조건 적용 / 비움(1쪽으로) |
| 행 클릭 | 드로어 |
| 숨기기 / 복원 (관리 열) | 2-5 — 쓰기 권한 없으면 비활성 |
| 숨긴 문서 포함 | 체크하면 바로 다시 조회 |

### 3-1. 엑셀 (UPD-12·15, 공통 CMN-07)

| 항목 | 범위 | 원천 | 이력 |
| :--- | :--- | :--- | :--- |
| 조회 목록 | 표에 보이는 현재 쪽 — 표 정렬·열 필터·열 순서 그대로, 그리드 열 뒤에 문서 ID · 메모 · 최초 등록 · 크기(byte) · 최신 파일명 | TabulatorGrid 인스턴스(`instanceRef`) → 브라우저 생성 | `scope=VIEW`, `condSummary` 예 `검색어=회의 · 파싱 상태=경고 · 기간=2026-09-01~2026-09-30 · 쪽 1/3` |
| 전체(N건 — 전체 기준 요약이거나 파싱 상태 말고 다른 조건이 없을 때만 건수 표기) | 조건·쪽 무시, 숨김 제외 전 문서 | `GET /system/uploads?page=1&size=0` (10,000건 상한, `meta.truncated` 면 "상한 10,000건까지 내려받았습니다") | `scope=ALL`, `condSummary=조건 무시(전체)` |

- 파싱 상태는 표시명(정상/경고/실패), 크기는 표시 열(KB/MB)과 byte 열을 함께 둡니다.
- `attrs`(열 순서의 응답 필드명)를 넘겨 로그인 계정의 데이터 접근 권한으로 가립니다(R-10). 지금 이 화면 필드에 대응한 데이터 종류는 없어 「비공개 처리 0건」 이 정상입니다.
- 조회 목록이 비면 안내 토스트를 띄웁니다(전체는 조건 결과 0건이어도 받을 수 있음).
- 내려받기는 조회 권한이면 됩니다(쓰기 권한 불필요).

## 4. 연결 화면 — 대시보드 업로드 리포트 (`dash-ai-upload`)

이 화면의 값은 대시보드 업로드가 만듭니다. 2026-10-01 함께 바꾼 것:

- 업로드·새 버전 단추는 `dash-ai-upload` 화면 권한이 있으면 보이고, **쓰기 권한**(`canWrite('dash-ai-upload')`)이 없으면 비활성 + 옆 안내 "이 화면의 쓰기 권한이 없습니다. 전산팀에 요청하세요." (UPD-14 · R-06, 서버 `requireWrite` 가 정본, 403 `E-AUTH-004` 는 서버 문구 토스트)
- 매크로 포함 통합문서(`.xlsm`)는 고르는 단계에서 "매크로 포함 통합문서(xlsm)는 올릴 수 없습니다 — …xlsx 로 다시 저장해 올려 주세요" 로 막습니다. 포맷 안내에도 적었습니다(UPD-03, 서버도 400).
- 메모는 앞뒤 공백을 지우고 보내며 1000자를 넘으면 폼에서 막습니다. 새 문서 메모는 서버가 버전 1 메모에도 넣습니다(UPD-02). 고른 버전의 메모를 문서 정보 줄에 보여 줍니다.
- 같은 파일 재업로드면 결과 토스트에 "v{n} 과 같은 파일입니다" (UPD-10, 서버 `duplicateOf`).

## 5. 사용 API

| # | 서비스 함수 | Method | Path | 요청 | 응답 주요 필드 | 권한 |
|---|---|---|---|---|---|---|
| 199.5 | `getSystemUploads` | GET | `/api/v1/system/uploads` | keyword, uploadedBy(사번), parseState, from, to, includeDeleted, page, size(0=전체) | items[{docId,title,memo,latestVersion,versionCnt,createdBy,createdByName,createdAt,updatedBy,updatedByName,updatedAt,fileName,sizeBytes,parseState,fileState,deleted,deletedAt,deletedByName,deleteReason}], summary{docCnt(숨김 제외),deletedDocCnt,versionCnt,monthVersionCnt,totalBytes,failDocCnt,lastUploadedAt,maxBytesPerFile · total,ok,warn,fail}, uploaders[{userId,userName,docCnt}], meta{page,size,total,totalPages,truncated} | `sys-upload-doc` 조회 |
| 199.7 | `deleteSystemUploadsByDocId` | DELETE | `/api/v1/system/uploads/{docId}` | body `{ reason }`(필수 · 200자) | docId, deleted, deletedAt — 이미 숨김 409 | `sys-upload-doc` **쓰기** |
| 199.8 | `postSystemUploadsByDocIdRestore` | POST | `/api/v1/system/uploads/{docId}/restore` | — | docId, deleted — 숨기지 않음 409 | `sys-upload-doc` **쓰기** |
| 199.6 | `getSystemUploadsByDocIdVersions` | GET | `/api/v1/system/uploads/{docId}/versions` | docId | items[{version,fileName,sizeBytes,sha256,uploadedBy,uploadedByName,uploadedAt,parseState,warningCnt,memo,warnings[],warningTruncated,fileState,duplicateOf}] | `sys-upload-doc` 조회 |

## 6. 개발 체크리스트

- [x] 서버 쪽 나눔 · 파싱 상태 · 기간 조건 (UPD-01)
- [x] 카드 4종 서버 summary (UPD-07)
- [x] 업로더 선택지 서버 uploaders · 검색 안내 문구 (UPD-06)
- [x] 드로어 메모 · 원본 상태 · 경고 펼침 · 중복 안내 (UPD-02·08·09·10)
- [x] 엑셀 옵션 패널 · 표시명 · byte 열 (UPD-12·15)
- [x] 대시보드 업로드 쓰기 권한 비활성 · xlsm 안내 · 메모 길이 (UPD-03·14)
- [ ] (조건부) 시스템관리 원본 다운로드 (UPD-11, 결정 대기)
- [x] 문서 숨김·복원 (R-19 · D-13 결정 2026-10-02) — 서버 API 는 API 터미널 진행 중, 화면은 page.route 흉내로 시험

시험 — `node tests/system/upload-doc-hide-route-browser.cjs`(숨기기·복원, 실 API 모드 + page.route), `node tests/system/upload-doc-browser.cjs`(목 모드 `WEB_URL=http://localhost:8090`), `node tests/system/sync-upload-live-browser.cjs`(실 API), `SPEC=15-system NO_BROWSER=1 node tests/run.js`.
