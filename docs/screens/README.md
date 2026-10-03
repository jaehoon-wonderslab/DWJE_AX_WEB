> **이 문서는 2026-10-01 기준으로 실제 코드와 대조해 갱신했습니다.**
> 명세 원본(ver01)은 화면 36 + API 236 이었고, 실서버 화면 목록에 맞춰 정리하고 시스템관리 개선을 반영한 결과는
> **메뉴 29건 · API 244건**입니다. 제거된 화면은 아래에 「제거된 화면」 으로 표시했습니다.

# 덕우전자 AX — WEB 화면별 개발 목록 (URL 기준)

`004. 개발/WEB-ai_concep_design` 프로젝트의 **URL(화면) 단위 개발 명세**입니다.
각 문서는 ① 컴포넌트 ② 화면 출력 정보 ③ 버튼·페이징 ④ 그 밖의 기능 ⑤ 사용 API ⑥ 개발 체크리스트 순서로 되어 있습니다.

- 메뉴 **29건** (사이드바 27 + 하위 화면 2) · 인증 4화면 별도(로그인 · 회원가입 · 비밀번호 찾기/잠금 해제 · 초기 비밀번호 변경)
- API 카탈로그 **244건** (`src/services/api/endpoints.js`)
- **대시보드 2화면(`/dashboard/ai` · `/dashboard/process`)과 품질 화면의 차트는 d3.js (웹 전용)** — [40. 차트 d3 전환 명세](./40_charts_d3.md)
- 공통 규약은 **[00. 공통](./00_공통.md)** 에 모아 두었고, 화면 문서에서는 반복하지 않습니다.
- 서버 주소(로컬/실서버)는 이 문서 범위가 아닙니다 — `README.md` §2 와 `scripts/targets.cjs` 를 보십시오.

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
| `/ai/chat` | `ai-chat` | 덕반장 AI — 자연어 질의 *(기본 화면)* | [04](./04_ai_chat.md) | 10 |

## 3. 대시보드

> 이 2화면의 차트는 **`charts-d3` (d3.js · 웹 전용)** 을 씁니다. → [40번 문서](./40_charts_d3.md)

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard/ai` | `dash-ai` | AI 통합 대시보드 | [05](./05_dashboard_ai.md) | 22 |
| `/dashboard/process` | `dash-proc` | 공정 및 제품 대시보드 | [06](./06_dashboard_process.md) | 12 |
| ~~`/dashboard/kpi`~~ | ~~`dash-kpi`~~ | 성과지표 대시보드 — **제거됨** (문서 [07](./07_dashboard_kpi.md) 참고) | | ~~11~~ |

## 4. 생산 · 품질 관리 (2026-09-09 두 그룹을 합쳤습니다)

> 사이드바 그룹은 「생산 및 품질 관리」(`/menu/operation`) 하나로 묶였습니다.
> 옛 허브 `/menu/production` · `/menu/quality` 는 새 허브로 리다이렉트합니다.
> 생산 모니터링만 「대시보드」 그룹으로 옮겼습니다.

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/production/monitor` | `prod-monitor` | 생산 모니터링 (10초 폴링) — *대시보드 그룹* | [08](./08_production_monitor.md) | 2 |
| `/production/result` | `prod-result` | 실적 집계·조회 | [09](./09_production_result.md) | 2 |
| `/production/daily-report` | `prod-daily` | 일일 생산현황 보고 — *보고서 그룹* | [10](./10_production_daily-report.md) | 2 |
| `/production/daily-report/history` | `daily-history` | 이전 보고서 *(하위)* — *보고서 그룹* | [11](./11_production_daily-report_history.md) | 0 |
| ~~`/production/downtime`~~ | ~~`prod-down`~~ | 비가동 관리 — **제거됨** (문서 [12](./12_production_downtime.md) 참고) | | ~~5~~ |
| `/quality/defect` | `qc-defect` | 불량 현황 조회 | [13](./13_quality_defect.md) | 5 |
| `/quality/aoi` | `qc-aoi` | AOI 판정 분석·예측 | [14](./14_quality_aoi.md) | 12 |

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
| `/system/account` | `sys-account` | 계정 관리 | [25](./25_system_account.md) | 16 |
| `/system/gw-dept-map` | `sys-gw-dept` | 그룹웨어 부서 매핑 | [42](./42_system_gw-dept-map.md) | 7 |
| `/system/menu-perm` | `sys-menu` | 메뉴 접근 권한 | [26](./26_system_menu-perm.md) | 5 |
| `/system/data-perm` | `sys-data` | 데이터 접근 권한 | [27](./27_system_data-perm.md) | 13 |
| `/system/alert-condition` | `alert-cond` | 이상 알림 발송 조건 관리 | [28](./28_system_alert-condition.md) | 9 |
| `/system/recipient` | `sys-recip` | 알림 수신자 관리 | [29](./29_system_recipient.md) | 16 |
| `/system/glossary` | `sys-gloss` | 용어 사전 관리 | [30](./30_system_glossary.md) | 13 |
| `/system/audit-log` | `sys-audit` | 보안 감사 로그 | [33](./33_system_audit-log.md) | 3 |
| `/system/download-log` | `sys-dl` | 보고서 다운로드 이력 | [38](./38_system_download-log.md) | 6 |
| `/system/upload-doc` | `sys-upload-doc` | 업로드 문서 목록 (읽기 전용) | [41](./41_system_upload-doc.md) | 2 |
| `/system/sync-history` | `sys-sync` | 데이터 연동 이력 (조건부 30초 폴링) | [39](./39_system_sync-history.md) | 13 |
| `/system/chat-history` | `sys-chat-history` | 전사 자연어 질의 이력 (2026-10-03 신규 · 관리자 전용 · 전 사용자 · 세션 보기 · 학습 데이터 답변) | [44](./44_system_chat-history-admin.md) | 9 |

## 8-1. 자연어 질의 이력 (2026-10-01 시스템관리에서 이동, 허브 `/menu/history`)

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/history/chat` | `chat-history` | 자연어 질의 이력 (2026-10-03 본인 이력 전용 · 질의 표 · 대화 보기) | [32](./32_system_chat-history.md) | 7 |

## 8-2. 용어 사전 (2026-10-01 신설, 허브 `/menu/glossary`)

| URL | 화면 ID | 화면명 | 문서 | API |
| :--- | :--- | :--- | :--- | :--- |
| `/glossary/view` | `gloss-view` | 용어 사전 조회 (조회 전용 · 관리 화면 `/system/glossary` 와 조회 API 공유) | [43](./43_glossary_view.md) | 2 |

### 제거된 화면 (2026-09 정리)

아래 화면은 라우트와 메뉴에서 뺐습니다. 문서는 남겨 두었으니 필요할 때 되살리십시오.

| URL | 화면 ID | 문서 | 사유 |
| :--- | :--- | :--- | :--- |
| ~~`/system/product-rank`~~ | ~~`sys-rank`~~ | [31](./31_system_product-rank.md) | AI 운영 화면 일괄 정리 (2026-09-13) |
| ~~`/system/model-config`~~ | ~~`base-model`~~ | [34](./34_system_model-config.md) | 위와 함께 정리 |
| ~~`/system/model-version`~~ | ~~`sys-model-ver`~~ | [35](./35_system_model-version.md) | 위와 함께 정리 |
| ~~`/system/agent`~~ | ~~`ai-agent`~~ | [36](./36_system_agent.md) | 위와 함께 정리 |
| ~~`/system/metric-standard`~~ | ~~`sys-metric`~~ | [37](./37_system_metric-standard.md) | 위와 함께 정리 |
| ~~`/quality/report`~~ | ~~`qc-report`~~ | — | 보고서 정리와 중복 |
| ~~`/quality/report-forms`~~ | ~~`report-forms`~~ | — | 위와 함께 |
| ~~`/report/scrap/new`~~ | ~~`rpt-scrap-new`~~ | — | `/report/scrap` 안으로 통합 |

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
| ~~`/dashboard/kpi`~~ | — | — | — | — | — | — | — | — | — |
| `/production/monitor` | 3 | 4 | | 1 | **●** | | xls | | **10초** |
| `/production/result` | 4 | | 1 | 1 | △ | | xls | | |
| `/production/daily-report` | | | | | | 모달 1 | xls | | |
| `/production/daily-report/history` | | | | ● | | | xls | | |
| ~~`/production/downtime`~~ | — | — | — | — | — | — | — | — | — |
| `/quality/defect` | 4 | | | 2 | | | xls | | |
| `/quality/aoi` | 3 | 4(Pred) | 1 | 4 | | 모달 1 | xls | | |
| `/report/press-morning` | 3 | 4 | | 2 | | xls·csv | ● | |
| `/report/plating-morning` | 3 | 4 | | 2 | | xls·csv | ● | |
| `/report/ship-plan` | 4 | 4 | | 2 | | xls·csv | ● | |
| `/report/yield-by-model` | 3 | 4 | | 2 | **●** | | xls·csv | ● | |
| `/report/lrr-by-customer` | 3 | 4 | | 3 | | xls·csv | ● | |
| `/report/scrap` | 3 | 4 | | 2 | **●** | 모달 1 | xls·csv | ● | |
| `/alert/list` | 3+탭 | | | 3 | △ | 모달 1 | xls | | |
| `/system/account` | | 4 | | 4 | △ | 모달 7 | xls | | |
| `/system/menu-perm` | | 4 | | 매트릭스+1 | | 모달 1 | xls | | |
| `/system/data-perm` | | | | 매트릭스+3 | △ | | xls | | |
| `/system/alert-condition` | 3 | 4 | | 1 | △ | 모달 2 | xls | | |
| `/system/recipient` | 2+탭 | 4 | | 4 | △ | 모달 4 | xls | | |
| `/system/glossary` | 3 | 4 | | 1 | **●** | 모달 4 | xls | | |
| `/history/chat` | 3 | 4 | | 1 | **●** | 모달 1 | xls·jsonl | | |
| `/system/audit-log` | 4 | | | 1 | **●** | | xls | | |
| `/system/download-log` | 5 | 2 | | 1 | | 모달 1 | xls | | |
| `/system/sync-history` | 1 | 2 | | 2 | △ | 모달 3 | xls | | **조건부 30초** |
| `/system/upload-doc` | | 2 | | ● | | xls | | |

**●** 구현됨 · **△** 서버 API 는 지원하나 화면 미노출(개선 대상)

차트 열의 대시보드 2화면(`/dashboard/ai` · `/dashboard/process`)과 품질 화면은 **d3.js(`charts-d3`)** 로 그립니다.
나머지 화면은 `react-native-svg` 차트(`charts/`)를 씁니다. 두 벌의 규칙은 [40번 문서](./40_charts_d3.md) 를 보십시오.

표는 `AGENTS.md` 규약대로 **Tabulator** 로 그립니다. 마지막 열이 가용 너비를 넘어가면
가로 스크롤을 제공하고, 열을 숨기거나 과도하게 압축하지 않습니다.

---

## 10. 공통 개선 과제 (문서 작성 중 확인된 항목)

> 제거된 화면(`/system/product-rank` · `model-config` · `model-version` · `agent` · `metric-standard` ·
> `/production/downtime` · `/quality/report-forms` · `/report/scrap/new`)은 이 표에서 뺐습니다.

| 구분 | 대상 화면 | 내용 |
| :--- | :--- | :--- |
| 페이징 미노출 | `/production/result`, `/alert/list`, `/system/account`, `/system/data-perm`, `/system/alert-condition`, `/system/recipient` (`/system/sync-history` 는 2026-10-01 작업·실행 이력 모두 적용) | 서버 API 는 `page`/`size` 를 받지만 `Pagination` 미적용 |
| 선택지 하드코딩 | `/report/ship-plan`(모델·고객사), `/system/alert-condition`(심각도·채널) | 서버 기준정보/공통코드 연동 필요 |
| 서버 export 미사용 | `/production/result` | `postProductionResultsExport` 대신 클라이언트 xls 생성 중 — 대용량 대비 필요 |
| 미노출 필드 | `/system/data-perm`(미리보기 대상 계정 선택) | 컨트롤러/API 에는 있으나 화면 UI 없음 |
| 데이터 공백 | 알림 · 수신 그룹 · 품질 보고서 테이블 0행 | 시드는 실제 설비·불량 코드에 맞춰 만들어야 합니다 |

---

## 11. 개발 진행 순서 (역사 — 참고용)

> 아래는 화면을 만들던 당시 순서입니다. 현재 구현 상태는 `README.md` §6 과 §11 을 보십시오.

1. **[00. 공통](./00_공통.md)** — 레이아웃 · 권한 · 페이징 · 마스킹 · 내려받기 기반부터 고정
2. 인증 3화면 (01~03) — 로그인 없이는 아무 화면도 못 봄
3. **[40. 차트 d3 전환](./40_charts_d3.md)** — `charts-d3` 8종을 먼저 만들어 두어야 대시보드를 한 번에 붙일 수 있음
4. 기본 화면 — `HOME_PATH` 는 `/ai/chat`(덕반장 AI) 입니다 (2026-09 변경, 이전 `/dashboard/ai`)
5. 시스템관리 권한 3종 (25·26·27) — 나머지 화면의 접근·마스킹 검증 전제
6. 생산·품질 업무 화면 (08~14)
7. 보고서 화면 (17~22) — 인쇄·출력 규약 공통 적용
8. 알림 · AI 채팅·이력 (24, 28·29·32)

## 12. 서버 접속 (로컬 / 실서버)

이 절은 화면 명세와 별개입니다. 어느 서버에 붙는지는 `README.md` §2 와 `scripts/targets.cjs` 에 있습니다.

| 명령 | 붙는 곳 | VPN |
| :--- | :--- | :-: |
| `npm run web` | 로컬 API `localhost:8080` | — |
| `npm run web:mock` | 목 데이터 | — |
| `npm run web:server` | **실서버 API `192.168.2.8:8080`** | **필요** |
| `npm run env:check` | 접속 확인 + VPN 안내 | — |

> 사내 배포는 **WEB `192.168.2.8:8081`** · **API `192.168.2.8:8080`** 이며 역할이 다릅니다.
> 사람이 여는 주소는 8081 이고, 번들이 호출하는 API 주소는 8080 입니다.
