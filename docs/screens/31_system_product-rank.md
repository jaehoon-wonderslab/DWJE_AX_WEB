# 31. `/system/product-rank` — 제품군 순위 관리

| 항목 | 값 |
| :--- | :--- |
| URL | `/system/product-rank` |
| 화면 ID | `sys-rank` |
| 라우트 파일 | `app/(main)/system/product-rank.jsx` |
| MVC | `domains/system/view/ProductRankView.jsx` · `controller/useProductRankController.js` |
| 기능 ID | SY-07 |
| 접근 권한 | 전산팀 · 경영진 · 통합관리자 |

**제품의 매출 순위 = 제품군 순위 × 제품군 내 순서.** 순서를 바꾸면 **[06. 공정 및 제품 대시보드](./06_dashboard_process.md)** 의 주력 제품 Top N 이 함께 바뀝니다.

## 1. 컴포넌트

`PageHead`(+엑셀 다운로드 · 공정 및 제품 대시보드 · `Button primary(기본 순서 복원)`) · `StatCard`×4 · `Hint` · `Grid cols=[3,2]` → `Card(tight)`(제품군 순위 `Table`) / `Card(tight)`(현재 순위 상위 N `Table` + `SelectField`) · (펼침 시) `Card(tight)`(제품군 내 순서) · `Card(tight)`(순위 변경 이력)

## 2. 화면에 출력해야 하는 정보

### 2-1. 요약 카드

제품군(`families.length`, 보조 "순위 부여 단위") · 전체 제품(`Σ productCnt`) · 순위 기준(`기본` / `사용자 지정`, 보조 "제품군 순위 × 제품군 내 순서") · 변경 이력(`logs.length`, 보조 "감사 로그에 함께 기록")

### 2-2. 제품군 순위 표 (`GET /products/families`)

순위(중앙, bold) · 제품군 `name` · 제품 수 `productCnt` · **이동**(`▲` / `▼` / 목표 순위 `SelectField`) · 상세(`제품 순서` / `닫기`)
행 클릭으로도 펼침 토글.

### 2-3. 현재 순위 상위 N (`GET /products/ranking?topN=`)

`#`(순위) · 제품(mono) · 제품군 · 고객사(**customer** blind)
카드 우측 `SelectField`(5 / 10 / 20)

### 2-4. 제품군 내 순서 (`GET /products/families/{familyCd}/products`) — 펼쳤을 때만

순서 `seq` · 제품(mono) · 고객사 · 프로젝트 · 전체 순위 `rank` · 이동(`▲`/`▼`, 양끝 비활성)

### 2-5. 순위 변경 이력 (`GET /products/rank-logs`)

시각(mono) · 구분(`Badge`) · 변경 내용 · 수행자
부제 : "변경 내역은 감사 로그에도 함께 기록됩니다"

## 3. 버튼 및 페이징

| 버튼 | 동작 |
| :--- | :--- |
| `▲` / `▼` (제품군) | `PUT /products/families/order` (direction) |
| 목표 순위 선택 | `PUT /products/families/order` (toRank) |
| `▲` / `▼` (제품) | `PUT /products/families/{familyCd}/products/order` |
| 기본 순서 복원 | 확인 모달 → `POST /products/families/order/reset` → **대시보드 제품 선택도 초기화**(`setDashModels([])`) |
| 엑셀 다운로드 | 제품군 순위 xls (순위·제품군·제품 수) |
| 공정 및 제품 대시보드 | `/dashboard/process` |

페이징 — 변경 이력 API 는 `page`/`size` 지원, 화면 미노출. → **개선 항목**

`Hint` : "위/아래 버튼으로 제품군 순서를 바꾸거나, 순위 칸에서 목표 순위를 골라 한 번에 이동할 수 있습니다. 순위를 바꾸면 전체 제품의 매출 순위가 다시 계산됩니다."

## 4. 그 밖의 기능

- 순위 변경 성공 시 목록 + 펼친 제품군 상세를 함께 재조회.
- 복원 확인 문구 : "제품군 순위와 제품군 내 순서를 모두 기본값으로 되돌립니다. 되돌린 순위는 대시보드 주력 제품 Top N 에도 바로 반영됩니다."

## 5. 사용 API

총 **7건**

**제품군 순위 관리** — 7건

| # | 서비스 함수 | API 명 | Method | Path | 요청 파라미터 | 응답 주요 필드 | 접근 권한 | blind | 우선순위 |
|---|---|---|---|---|---|---|---|---|---|
| 179 | `getProductsFamilies` | 제품군 순위 조회 | GET | `/api/v1/products/families` | — | items[{familyCd,familyNm,rank,productCnt,repProduct}] | 전산팀·경영진·통합관리자 | — | 1 |
| 180 | `putProductsFamiliesOrder` | 제품군 순위 변경 | PUT | `/api/v1/products/families/order` | orders[{familyCd,rank}] | success, recalculatedCnt | 상동 | — | 1 |
| 181 | `getProductsFamiliesByFamilyCdProducts` | 제품군 내 제품 순서 조회 | GET | `/api/v1/products/families/{familyCd}/products` | — | items[{code,name,customer,project,seq}] | 상동 | customer | 1 |
| 182 | `putProductsFamiliesByFamilyCdProductsOrder` | 제품군 내 제품 순서 변경 | PUT | `/api/v1/products/families/{familyCd}/products/order` | orders[{code,seq}] | success | 상동 | — | 1 |
| 183 | `postProductsFamiliesOrderReset` | 기본 순서 복원 | POST | `/api/v1/products/families/order/reset` | — | success | 상동 | — | 2 |
| 184 | `getProductsRanking` | 현재 순위 상위 N 조회 | GET | `/api/v1/products/ranking` | topN(20) | items[{rank,code,family,customer,segment}] | 상동 | customer | 1 |
| 185 | `getProductsRankLogs` | 순위 변경 이력 | GET | `/api/v1/products/rank-logs` | page, size | items[{ts,type,detail,by}], meta | 상동 | — | 2 |


## 6. 개발 체크리스트

- [ ] 요약 4카드 (기본/사용자 지정 표시)
- [ ] 제품군 순위 표 + ▲▼ + 목표 순위 직접 선택
- [ ] 제품군 펼침 → 제품군 내 순서 표 + ▲▼
- [ ] 현재 순위 상위 N (topN 5/10/20, `customer` 마스킹)
- [ ] 기본 순서 복원 + 대시보드 선택 초기화 연동
- [ ] 변경 이력 표
- [ ] 엑셀 다운로드 · 대시보드 이동
