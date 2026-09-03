# 27. `/system/data-perm` — 데이터 접근 권한

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/data-perm` |
| 화면 ID | `sys-data` |
| 라우트 파일 | `app/(main)/system/data-perm.jsx` |
| MVC | `domains/system/view/DataPermView.jsx` · `controller/useDataPermController.js` |
| 기능 ID | SY-03 |
| 접근 권한 | 전산팀 · 통합관리자 |

부서별로 열람 가능한 **데이터 항목 7종**을 지정합니다. 허용되지 않은 항목은 메뉴 접근이 가능해도 **화면·보고서·인쇄물·CSV 전 구간에서 blind** 처리됩니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 메뉴 접근 권한 · `Button primary(변경 저장)`) · `Hint` · `Card(tight)`+`PermMatrix` · `Grid cols=2` → `Card`(적용 미리보기, `KeyValue`+`BlindValue`) / `Card(tight)`(계정별 적용 결과, `Table`) · `Card(tight)`+`Table`(데이터 접근 감사)

## 2. 화면에 출력해야 하는 정보

### 2-1. 권한 매트릭스 (`GET /system/data-perms`, `GET /system/data-fields`)

- 행 : `fields[{key, name, desc}]` — 7종 (`qty`·`yield`·`price`·`customer`·`plan`·`mold`·`worker`), 행 라벨 폭 150, 설명(`descOf`) 표시
- 열 : 부서 (`adminDepts` 잠금)
- 푸터 : `허용 항목 수`

`Hint` : "체크를 바꾸면 해당 부서 전 계정의 화면에 즉시 반영됩니다. 현재 로그인 계정은 {name} · {dept} 입니다 — 아래 적용 미리보기에서 결과를 바로 확인할 수 있습니다."

### 2-2. 적용 미리보기 (`GET /system/data-perms/preview?empNo=`)

`items[{field, label, value}]` → `KeyValue` + `BlindValue` 로 **실제 렌더 결과**를 그대로 보여 줍니다.
각주 : "blind 항목은 값 자체가 화면·인쇄물·CSV 어디에도 포함되지 않습니다."

### 2-3. 계정별 적용 결과 (`GET /system/data-perms/by-user`)

계정(`name` + `pos`) · 부서 · 허용 항목 수(`allowedCnt` 또는 `allowedFields.length`) · 비공개(`maskedFields` 를 ` · ` 로 연결, 없으면 `—`)

### 2-4. 데이터 접근 감사 (`GET /system/data-perms/audit`)

시각(mono) · 계정 · 부서 · 화면 · 항목 · 결과(`열람`→green / 그 외 기본) · 비고

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| 셀 체크 | `PUT /system/data-perms` (deptId · fieldKey · allowed) → 목록 + `/auth/me` 재조회 |
| 변경 저장 | 안내 토스트 ("데이터 접근 권한을 저장했습니다 — 변경 이력은 감사 로그에 기록됩니다") — 실제 저장은 셀 단위 즉시 반영 |
| 엑셀 다운로드 | `데이터 항목 · 포함 데이터 · 부서별 O/-` xls |
| 메뉴 접근 권한 | `/system/menu-perm` |

페이징 없음 (감사·계정별 API 는 `page`/`size` 지원 → **개선 항목**).

## 4. 그 밖의 기능

- 마스킹은 **원칙적으로 API 응답 생성 단계**에서 수행되고(응답의 `masked` 배열로 통보), 프론트는 `비공개` 배지로 렌더합니다.
- 미리보기 대상 사번(`previewEmpNo`)은 기본값이 로그인 계정 — 컨트롤러에 `setPreviewEmpNo` 가 있으나 화면 UI 미노출. → **개선 항목**

## 5. 사용 API

총 **6건**

**데이터 접근 권한** — 6건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 145 | `getSystemDataFields` | 데이터 항목 목록 | GET | `/api/v1/system/data-fields` | — | items[{key,name,desc,columns[]}] | 전산팀·통합관리자 | — | 1 |
| 146 | `getSystemDataPerms` | 데이터 권한 매트릭스 조회 | GET | `/api/v1/system/data-perms` | — | fields[], depts[], matrix{deptId:[fieldKey]} | 전산팀·통합관리자 | — | 1 |
| 147 | `putSystemDataPerms` | 데이터 권한 변경 | PUT | `/api/v1/system/data-perms` | deptId, fieldKey, allowed | success | 전산팀·통합관리자 | — | 1 |
| 148 | `getSystemDataPermsPreview` | 적용 미리보기 | GET | `/api/v1/system/data-perms/preview` | empNo | items[{fieldKey,name,rendered,masked}] | 전산팀·통합관리자 | — | 2 |
| 149 | `getSystemDataPermsByUser` | 계정별 적용 결과 | GET | `/api/v1/system/data-perms/by-user` | page, size | items[{empNo,name,dept,allowedFields[],maskedFields[]}], meta | 전산팀·통합관리자 | — | 2 |
| 150 | `getSystemDataPermsAudit` | 데이터 접근 감사 조회 | GET | `/api/v1/system/data-perms/audit` | from, to, empNo, fieldKey, page, size | items[{ts,empNo,dept,fieldKey,screen,action}], meta | 전산팀·통합관리자 | — | 1 |


## 6. 개발 체크리스트

- [ ] 데이터 항목 7종 × 부서 매트릭스 (설명 · 관리자 열 잠금 · 푸터 합계)
- [ ] 셀 변경 즉시 반영 + `/auth/me` 재조회
- [ ] 적용 미리보기 (`BlindValue` 실렌더)
- [ ] 계정별 적용 결과 표
- [ ] 데이터 접근 감사 표
- [ ] 엑셀 다운로드
- [ ] (개선) 미리보기 대상 계정 선택 UI · 감사/계정별 페이징
