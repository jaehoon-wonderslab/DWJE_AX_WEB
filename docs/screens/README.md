# 덕우전자 AX — WEB 화면별 개발 목록 (URL 기준)

`004. 개발/WEB` 프로젝트의 **URL(화면) 단위 개발 명세**입니다.
각 문서는 ① 컴포넌트 ② 화면 출력 정보 ③ 버튼·페이징 ④ 그 밖의 기능 ⑤ 사용 API ⑥ 개발 체크리스트 순서로 되어 있습니다.

- 화면 **40개** (메뉴 36 + 인증 3 + 하위 화면 포함)
- API 카탈로그 **255건** (`src/services/api/endpoints.js`)
- **대시보드 3화면의 차트는 d3.js (웹 전용)** — [40. 대시보드 차트 d3.js 전환 명세](./40_charts_d3.md)
- 공통 규약은 **[00. 공통](./00_공통.md)** 에 모아 두었고, 화면 문서에서는 반복하지 않습니다.

---

## 0. 먼저 읽을 문서

| 문서 | 내용 |
| :--- | :--- |
| **[00_공통.md](./00_공통.md)** | 레이아웃 3종 · 공통 UI 40여 종 · 차트 8종(2벌) · 권한 2종 · 페이징 · 내려받기 · 감사 기록 · 전역 스토어 · 공통 API 16건 |
| **[40_charts_d3.md](./40_charts_d3.md)** | **대시보드 차트 d3.js 전환 명세** — 의존성 · 폴더 구조 · props 계약 · 색/null/반응형/테마 규칙 · 차트 8종 d3 매핑 · 검증 |

---

## 1. 인증 (사이드바 없음)

| URL | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- |
| `/login` | 로그인 | [01](./01_login.md) | 4 |
| `/signup` | 회원가입 (3단계 + 승인 대기) | [02](./02_signup.md) | 5 |
| `/forgot-password` | 비밀번호 찾기 (3단계) | [03](./03_forgot-password.md) | 2(+1) |

## 2. AI 어시스턴트

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/ai/chat` | `ai-chat` | 자연어 질의 | [04](./04_ai_chat.md) | 7 |

## 3. 대시보드

> 이 3화면의 차트는 **`charts-d3` (d3.js · 웹 전용)** 을 씁니다. → [40번 문서](./40_charts_d3.md)

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard/ai` | `dash-ai` | AI 통합 대시보드 **(기본 화면)** | [05](./05_dashboard_ai.md) | 12 |
| `/dashboard/process` | `dash-proc` | 공정 및 제품 대시보드 | [06](./06_dashboard_process.md) | 11 |
| `/dashboard/kpi` | `dash-kpi` | 성과지표 대시보드 | [07](./07_dashboard_kpi.md) | 11 |

## 4. 생산관리

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/production/monitor` | `prod-monitor` | 생산 모니터링 (10초 폴링) | [08](./08_production_monitor.md) | 2 |
| `/production/result` | `prod-result` | 실적 집계·조회 | [09](./09_production_result.md) | 3 |
| `/production/daily-report` | `prod-daily` | 일일 생산현황 보고 | [10](./10_production_daily-report.md) | 7 |
| `/production/daily-report/history` | `daily-history` | 이전 보고서 *(하위 · API 없음)* | [11](./11_production_daily-report_history.md) | 0 |
| `/production/downtime` | `prod-down` | 비가동 관리 | [12](./12_production_downtime.md) | 5 |

## 5. 품질관리

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/quality/defect` | `qc-defect` | 불량 현황 조회 | [13](./13_quality_defect.md) | 3 |
| `/quality/aoi` | `qc-aoi` | AOI 판정 분석·예측 | [14](./14_quality_aoi.md) | 9 |

## 6. 보고서

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/report/press-morning` | `rpt-press-morning` | 아침회의 자료 (PRESS) | [17](./17_report_press-morning.md) | 2(+2) |
| `/report/plating-morning` | `rpt-plating-morning` | 아침회의 자료 (Plating·Coating) | [18](./18_report_plating-morning.md) | 1 |
| `/report/ship-plan` | `rpt-ship-plan` | 연간 출하계획 | [19](./19_report_ship-plan.md) | 1 |
| `/report/yield-by-model` | `rpt-yield-model` | 제품별 수율 | [20](./20_report_yield-by-model.md) | 1 |
| `/report/lrr-by-customer` | `rpt-lrr-customer` | 고객사별 LRR | [21](./21_report_lrr-by-customer.md) | 1 |
| `/report/scrap` | `rpt-scrap` | 폐기 보고서 | [22](./22_report_scrap.md) | 1 |

## 7. 이상 알림

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/alert/list` | `alert-list` | 알림 목록·상세 | [24](./24_alert_list.md) | 5 |

## 8. 시스템관리

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/system/account` | `sys-account` | 계정 관리 | [25](./25_system_account.md) | 15 |
| `/system/menu-perm` | `sys-menu` | 메뉴 접근 권한 | [26](./26_system_menu-perm.md) | 5 |
| `/system/data-perm` | `sys-data` | 데이터 접근 권한 | [27](./27_system_data-perm.md) | 6 |
| `/system/alert-condition` | `alert-cond` | 이상 알림 발송 조건 관리 | [28](./28_system_alert-condition.md) | 6 |
| `/system/recipient` | `sys-recip` | 알림 수신자 관리 | [29](./29_system_recipient.md) | 15 |
| `/system/glossary` | `sys-gloss` | 용어 사전 관리 | [30](./30_system_glossary.md) | 11 |
| `/system/product-rank` | `sys-rank` | 제품군 순위 관리 | [31](./31_system_product-rank.md) | 7 |
| `/system/chat-history` | `chat-history` | 자연어 질의 이력 | [32](./32_system_chat-history.md) | 4 |
| `/system/audit-log` | `sys-audit` | 보안 감사 로그 | [33](./33_system_audit-log.md) | 1 |
| `/system/model-config` | `base-model` | AI 모델 설정 | [34](./34_system_model-config.md) | 6 |
| `/system/model-version` | `sys-model-ver` | AI 모델 버전 관리 | [35](./35_system_model-version.md) | 15 |
| `/system/agent` | `ai-agent` | Agent 실행 현황 (30초 폴링) | [36](./36_system_agent.md) | 5 |
| `/system/metric-standard` | `sys-metric` | 지표 측정 데이터 관리 | [37](./37_system_metric-standard.md) | 7 |
| `/system/download-log` | `sys-dl` | 보고서 다운로드 이력 | [38](./38_system_download-log.md) | 4 |
| `/system/sync-history` | `sys-sync` | 데이터 연동 이력 (조건부 30초 폴링) | [39](./39_system_sync-history.md) | 11 |

---

## 9. 화면 × 기능 요소 매트릭스

| URL | 조회조건 | 통계카드 | 차트 | 표 | 페이징 | 폼/모달 | 내려받기 | 인쇄 | 폴링 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `/login` | | | | | | | | | |
| `/signup` | | | | | | 마법사 3 | | | |
| `/forgot-password` | | | | | | 마법사 3 | | | |
| `/ai/chat` | | | ● | ● | | 드로어 | xls | | |
| `/dashboard/ai` | 기준일 | 4 | 7 | 3 | **●** | 모달 1 | xls | | |
| `/dashboard/process` | 공정·제품 | 4 | 7 | 1 | | 모달 1 | xls | | |
| `/dashboard/kpi` | | 3 | 8 | 1 | | 모달 1 | xls·증빙 | | |
| `/production/monitor` | 3 | 4 | | 1 | **●** | | xls | | **10초** |
| `/production/result` | 4 | | 1 | 1 | △ | | xls | | |
| `/production/daily-report` | | | | | | 모달 1 | xls | | |
| `/production/daily-report/history` | `daily-history` | 이전 보고서 *(하위 · API 없음)* | [11](./11_production_daily-report_history.md) | 0 |
| `/production/downtime` | 3 | 4 | | 1 | **●** | 모달 1 | xls | | |
| `/quality/defect` | 4 | | | 2 | | | xls | | |
| `/quality/aoi` | 3 | 4(Pred) | 1 | 4 | | 모달 1 | xls | | |
| `/report/press-morning` | 3 | 4 | | 2 | | | xls·csv | ● | |
| `/report/plating-morning` | 3 | 4 | | 2 | | | xls·csv | ● | |
| `/report/ship-plan` | 4 | 4 | | 2 | | | xls·csv | ● | |
| `/report/yield-by-model` | 3 | 4 | | 2 | **●** | | xls·csv | ● | |
| `/report/lrr-by-customer` | 3 | 4 | | 3 | | | xls·csv | ● | |
| `/report/scrap` | `rpt-scrap` | 폐기 보고서 | [22](./22_report_scrap.md) | 1 |
| `/alert/list` | 3+탭 | | | 3 | △ | 모달 1 | xls | | |
| `/system/account` | | 4 | | 4 | △ | 모달 7 | xls | | |
| `/system/menu-perm` | | 4 | | 매트릭스+1 | | 모달 1 | xls | | |
| `/system/data-perm` | | | | 매트릭스+3 | △ | | xls | | |
| `/system/alert-condition` | 3 | 4 | | 1 | △ | 모달 2 | xls | | |
| `/system/recipient` | 2+탭 | 4 | | 4 | △ | 모달 4 | xls | | |
| `/system/glossary` | 3 | 4 | | 1 | **●** | 모달 4 | xls | | |
| `/system/product-rank` | | 4 | | 4 | △ | 모달 1 | xls | | |
| `/system/chat-history` | 3 | 4 | | 1 | **●** | 모달 1 | xls·jsonl | | |
| `/system/audit-log` | 4 | | | 1 | **●** | | xls | | |
| `/system/model-config` | | | | 1 | | 모달 1 | | | |
| `/system/model-version` | 탭 4 | 4 | 1 | 4 | △ | 모달 6 | | | |
| `/system/agent` | | 4 | | 2 | △ | 모달 1 | xls | | **30초** |
| `/system/metric-standard` | 3 | 4 | | 2 | △ | 모달 2 | xls | | |
| `/system/download-log` | 5 | 4 | | 2 | **●** | 모달 1 | xls | | |
| `/system/sync-history` | 2 | 5 | | 4 | △ | 모달 5 | xls | | **조건부 30초** |

**●** 구현됨 · **△** 서버 API 는 지원하나 화면 미노출(개선 대상)

차트 열의 대시보드 3화면(`/dashboard/ai` · `/dashboard/process` · `/dashboard/kpi`)은 **d3.js 로 그립니다.** 나머지 화면은 기존 `react-native-svg` 차트를 그대로 씁니다.

---

## 10. 공통 개선 과제 (문서 작성 중 확인된 항목)

| 구분 | 대상 화면 | 내용 |
| :--- | :--- | :--- |
| 페이징 미노출 | `/production/result`, `/alert/list`, `/report/scrap/new`(전표), `/system/account`, `/system/data-perm`, `/system/alert-condition`, `/system/recipient`, `/system/product-rank`, `/system/model-version`, `/system/agent`, `/system/metric-standard`, `/system/sync-history` | 서버 API 는 `page`/`size` 를 받지만 `Pagination` 미적용 |
| 선택지 하드코딩 | `/report/ship-plan`(모델·고객사), `/report/scrap/new`(공정·모델), `/production/downtime`(폼 내 설비 목록), `/quality/report-forms`(유형·정책), `/system/alert-condition`(심각도·채널), `/system/metric-standard`(구분·단위·구간), `/system/model-version`(모델·임베딩·데이터셋) | 서버 기준정보/공통코드 연동 필요 |
| 서버 export 미사용 | `/production/result` | `postProductionResultsExport` 대신 클라이언트 xls 생성 중 — 대용량 대비 필요 |
| 미노출 필드 | `/system/data-perm`(미리보기 대상 계정 선택), `/system/metric-standard`(`direction`) | 컨트롤러/API 에는 있으나 화면 UI 없음 |

---

## 11. 개발 진행 순서 제안

1. **[00. 공통](./00_공통.md)** — 레이아웃 · 권한 · 페이징 · 마스킹 · 내려받기 기반부터 고정
2. 인증 3화면 (01~03) — 로그인 없이는 아무 화면도 못 봄
3. **[40. 차트 d3 전환](./40_charts_d3.md)** — `charts-d3` 8종을 먼저 만들어 두어야 대시보드를 한 번에 붙일 수 있음
4. 기본 화면 `/dashboard/ai` (05) — `HOME_PATH` 이므로 항상 먼저 뜸
5. 시스템관리 권한 3종 (25·26·27) — 나머지 화면의 접근·마스킹 검증 전제
6. 생산·품질 업무 화면 (08~16)
7. 보고서 7화면 (17~23) — 인쇄·출력 규약 공통 적용
8. 알림 · AI 운영 (24, 28·29·34·35·36)
9. 로그·기준 관리 (30~33, 37~39)
