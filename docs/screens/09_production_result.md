# 09. `/production/result` — 실적 집계·조회

- 화면 ID: `prod-result` / 기능 ID: PR-02
- 라우트: `app/(main)/production/result.jsx`
- 화면·컨트롤러·모델: `src/domains/production/` 아래 ProductionResultView, useProductionResultController, productionRepository
- 접근 권한: 품질보증팀·생산관리팀·경영진·통합관리자

## 조회 조건

시작일과 종료일만 제공합니다. 집계는 일별(`unit=day`), 제품은 전체로 고정합니다.
기본 시작일은 브라우저 로컬 오늘의 7일 전, 종료일은 오늘입니다(양끝 포함).
입력값은 조회 버튼을 눌러 적용하며, 잘못된 날짜·역전된 날짜·92일을 초과하는 간격은 요청하지 않습니다.
종료일 변경 시 시작일을 임의로 바꾸지 않습니다.

차트 제목·파일명·다운로드 조건은 입력 중인 날짜가 아닌 마지막 적용된 조회 기간을 사용합니다.

## 화면

- 일별 생산·불량 추이: 생산량·불량량 막대와 불량률 선, 좌우 이중 축. 마지막 날짜까지 모든 API 라벨을 표시하고 가로 스크롤을 제공합니다. 실적이 없는 날짜를 임의로 만들지 않습니다.
- 집계 결과: TabulatorTable의 일자 → 제품 → 설비 트리. 서버에서 조회 기간 전체를 받고 표 내부에서 페이지를 나눕니다(서버 요청 size=100, 최대 날짜 간격 92일).
- 표 열: 일자, 제품명, 공장, 공정, 설비 코드, 설비명, 투입, 양품, 불량, 불량률, 가동률, 비가동 시간.
- 열 너비 자동 조정, 수동 드래그, 머리글 검색, 다중 정렬, 상단 가로 스크롤 지원.
- 합계 요약: 투입·양품·불량 합계, 평균 불량률·가동률, 비가동 합계.
- 공정명의 괄호 내용이 별도 공장명과 정확히 중복될 때만 제거합니다. 설비 코드와 이름은 별도 열로 유지합니다.

## 다운로드

| 위치 | 버튼 | 동작 |
| --- | --- | --- |
| 페이지 헤드 | 화면 전체 엑셀 다운로드 | 서버가 조회 조건·요약, 일별 추이, 전체 집계 트리를 XLSX로 생성 |
| 집계 결과 카드 | 집계 결과 엑셀 다운로드 | 클라이언트가 조회된 전체 트리를 XLSX로 생성, Excel outline 0/1/2 지원 |
| 추이 카드 | 차트 이미지 저장 | 스크롤 밖 구간까지 포함한 SVG 전체 PNG 저장 |

집계 엑셀은 화면과 같은 12열을 사용하며, 접힌 자식과 표 내부의 다른 페이지도 포함합니다.
다운로드 중 버튼을 비활성화하며, 다운로드 실패는 안내합니다.
전체 엑셀 서버 연동 계약:

```http
POST /api/v1/production/results/export?scope=screen&unit=day
Content-Type: application/json
Authorization: Bearer <accessToken>

{"from":"2026-09-05","to":"2026-09-12","format":"xlsx"}
```

응답: XLSX 바이너리, Content-Disposition 파일명. scope 미지정은 기존 서버 export 동작입니다.
API 구현 요청 터미널: `term_0e612ecc-1a9e-4236-a377-bf41da641e5b`.

## 데이터 조회 경로

- `GET /production/results`: 일별 실적·요약·건수
- `GET /production/results/trend`: 기간 전체 추이
- `GET /dashboard/process/product-production`: 일자별 제품 소계
- `GET /dashboard/ai/line-products`: 일자별 제품·공정·설비 상세

`qty`, `yield` 권한 마스킹 및 미측정 null 값을 보존합니다.

## 검증

- `WEB_URL=http://localhost:8092 node tests/tables/production-result-browser.cjs`: 열 드래그·가로 스크롤·분리 항목·차트 글자/색
- `WEB_URL=http://localhost:8092 node tests/tables/production-export-browser.cjs`: 기본 날짜·검색 항목 제거·명칭·마지막 차트 라벨·실제 집계 XLSX
- `SCREEN_EXPORT_LIVE=1 WEB_URL=http://localhost:8092 node tests/tables/production-export-browser.cjs`: 실제 API로 화면 전체 XLSX 3개 시트 다운로드 검증

투입·양품·불량·불량률 열은 검색 필터 없이 정렬만 제공합니다.

트리 표는 자식 행이 페이지 제한으로 잘리지 않도록 페이지 나누기 대신 높이 560px의 내부 세로 스크롤을 제공합니다. 펼친 행과 전체 최상위 항목을 같은 스크롤 영역에서 조회하며 가로 스크롤도 유지합니다. 비트리 표의 페이지 나누기는 기존대로입니다.
