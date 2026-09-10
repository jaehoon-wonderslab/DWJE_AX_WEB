# 리디자인 — 인수인계 메모 (2차: Soft-matte 워크스페이스)

기준 문서
- 워크스페이스(로그인 이후 전체): `docs/duckwoo-ax-style-reference.md`
- 로그인: 앱과 같은 화이트 **패널 한 장**(왼쪽 브랜드 · 오른쪽 폼, 헤어라인으로 구분). 파티클 성좌는 잉크 계열 팔레트(`LIGHT_PALETTE`)로 옅게.
- 로고 CI: `docs/덕우전자-CI.jpg`
작업 브랜치: `wt/ai_concep_design` (워크트리 `WEB-ai_concep_design`)

## 디자인 원칙 (2차)
- 테마는 **라이트 하나**. 다크 토큰·전환 단추·ThemeScope 모두 삭제(로그인 포함).
- 셸: 캔버스 `#f4f5f7` 위에 흰 패널(24px 반지름, `rgba(0,0,0,.03)` 테두리, `0 10px 30px rgba(0,0,0,.04)` 그림자)이 16px 여백을 두고 떠 있음. 셸은 스크롤하지 않고 패널마다 스크롤.
- 글자: Pretendard(한글)+Inter(숫자). 500/600 만. 제목·수치 -0.02em. `word-break: keep-all`.
- 색: 잉크 `#0B1440`(제목·수치·채움 버튼), `#787878` 캡션, 앰버 `#F2C14E` 는 데이터 채움·활성 점에만.
- 카드 두 단계: 흰 카드(#DFE1E7 테두리) 안에 `#FAFAFA` 중첩 카드(보더 없음).
- 차트는 d3 유지(계열색만 잉크 계열로), 표는 전부 Tabulator.

## 기능 변경
- 첫 화면 = 자연어 질의(`/ai/chat`). 빈 대화 상태에 인사말("000님, 좋은 아침입니다.") + AI 브리핑(불량률 · 공정 현황 · 현재 이슈) 문단. 문단을 누르면 바로 질의.
  - `src/domains/ai/model/homeBriefingModel.js`(순수 문장 생성) · `homeBriefingRepository.js`(summary · process-yield · alerts 3건) · `controller/useHomeBriefing.js` · `view/ChatHome.jsx`
- 메뉴(2026-09-09): 생산 모니터링 → 대시보드 그룹. 생산관리 + 품질관리 → **생산 및 품질 관리**(`/menu/operation`, 실적 집계·조회 · 불량 현황 조회 · AOI 판정 분석·예측). 일일 생산현황 보고 → 보고서 그룹(EXTRA_PAGES 의 daily-history 도 보고서). 옛 허브 `/menu/production` · `/menu/quality` 는 새 허브로 Redirect. 이상 알림 그룹은 `hidden: true` — 상단 종(`layout/AlertBell.jsx`)으로 통합(미확인 배지 + 최근 5건 팝오버 + 전체 보기).
- `HOME_SCREEN_ID='ai-chat'`, `HOME_PATH='/ai/chat'`.

## 파일 지도
- 토큰: `src/shared/theme/colors.js`(LIGHT 만), `theme.js`(METRICS · divider/surface/panelShadow), `useTheme.js`, `styles.js`
- 셸: `app/(main)/_layout.jsx`, `layout/Sidebar.jsx`(접힘 64px 레일 포함), `Topbar.jsx`, `AlertBell.jsx`, `AiChatPanelHost.jsx`(레일 패널/작업 모드), `UserMenu.jsx`, `MenuHub.jsx`, `PageHead.jsx`, `PageContainer.jsx`
- 표: `ui/Table.jsx` = Tabulator 래퍼. `render` 셀은 **React 포털**로 채우고(`createPortal`), 채운 뒤 `row.normalizeHeight()`. `TabulatorGrid.jsx` 에 `instanceRef` prop 추가.
  - `XlsTable`(보고서 병합 셀 문서표)·`PermMatrix`(체크박스 매트릭스)는 Tabulator 로 옮기지 않았음 — 병합/체크 격자는 문서·매트릭스 성격.
- 로그인: `layout/AuthCard.jsx`(화이트 단일 패널), `ui/Field.jsx` 의 `PasswordField`(눈 아이콘이 칸 안에 있고 `tabIndex=-1` — Tab 이 사번 → 비밀번호 → 로그인 순으로 감), `brand/ConstellationField.jsx`(`activity` · `palette` prop)

## 보고서 메뉴 (2026-09-09 최종: 드롭다운 선택형 + 자주 쓰는 보고서)
- 사이드바에는 「보고서」 한 줄만(`single: true`). 허브 `/menu/report` 는 `domains/report/view/ReportPicker.jsx` — "보고서 선택" 드롭다운으로 고르면 그 보고서의 컨트롤러·뷰가 같은 화면에 렌더링됩니다(`?report=<화면 ID>` 로 유지). 선택 패널 아래 **"자주 쓰는 보고서" 버튼 최대 5개**(계정별 만든 횟수 순, 마지막 선택에 점). 전체 보고서 카드 목록은 **없음** — 고르지 않았을 때는 안내 카드 한 장.
- 자주 쓰는 보고서의 원본은 **DB**: `stores/useReportUsageStore.js` 가 `GET /api/v1/reports/usage?top=5` 로 읽고, 고를 때 `POST /api/v1/reports/usage {screenId}` 로 1회 기록(응답 top 목록으로 갱신). 브라우저 저장 없음. 서버가 없으면 버튼 줄에 안내만 나오고 드롭다운은 그대로 동작. API 요청 문서: `docs/requests/API_REQUEST_report_usage_20260909.md`(회신 대기 중이면 목 응답으로 동작 확인 가능).
- 새 보고서 추가: 라우트 파일 + 메뉴 정의 한 줄 + `ReportPicker.jsx` 의 `REPORTS` 맵 한 줄.
- D안(카탈로그 사이드바 · 보고서 센터 · 즐겨찾기 · 작성 상태 컨트롤)은 사용자 요청으로 **롤백**했습니다. 단, API 팀이 구현한 `GET/PUT /users/me/favorites` · `GET/PUT /reports/status`(DB V23) 는 서버에 남아 있고 웹 엔드포인트 카탈로그·서비스·목도 남겨 두었습니다(화면에서는 호출하지 않음). 필요하면 다시 붙일 수 있습니다. 회신 문서: `docs/requests/API_REQUEST_report_center_20260909.md`.

## 걷어낸 프로토타입 잔재
- 우상단 계정 메뉴의 "계정 전환" 목록(`useAccountSwitch` 의 switch-targets 조회·`switchableUsers`) 제거 — 현재 계정 + 로그아웃만. 계정 관리 표의 「전환」 배지도 제거.
- 채팅 응답의 `agents` 가 `[{ no: '②' }]`, `followups` 가 `[{ q }]` 객체로 와서 `<Text>` 에 객체가 들어가 던지던 오류 → `labelOf()` 로 문자열화, 블록이 없으면 `answerHtml` 을 글로 표시. 질문·답이 같은 messageId 를 쓰므로 키에 who·순번 포함.

## 재현 메모
- `<Link asChild>`(Radix Slot) 는 함수형 style 을 버림 → `Hoverable`(`hoverStyle`).
- Tabulator formatter 안에서 `flushSync` 로 React 루트를 그리면 Tabulator 초기 렌더와 재진입해 `this.element.appendChild is not a function` 이 남 → 포털 방식으로 교체.
- Metro 가 이 워크트리의 파일 변경을 놓침 → 반영 안 되면 `npx expo start --web --port 8090 --clear` 로 재시작.
- 대시보드 API 가 느려(수십 초) 스크린샷은 "불러오는 중" 문구가 사라진 뒤에 찍어야 함.

## 검증
```bash
npm run check          # syntax · api · mock · routes
npm run web            # 또는 npx expo start --web --port 8090
```
tests/navigation/menu-hubs-browser.cjs 는 새 메뉴 구조(대시보드 3 · 생산 및 품질 관리 3 · 보고서 7(드롭다운을 열어 확인) · 시스템관리 15 · 이상 알림 없음)로 갱신.

## 셸 변경 (2026-09-10 · 요구사항 9건 — docs/requests/REQ_20260910_ai_panel_upload_aoi.md)
- **덕파트장 AI**(구 자연어 질의, id `ai-chat`): 사이드바 「메뉴 접기」 아래 **고정 카드 버튼**(스크롤 영향 없음) — 잉크 틴트 채움 + 아이콘 + 캡션 "AI를 통해 궁금한 것을 물어보세요". 활성이면 잉크 채움. `Sidebar.jsx` 의 `aiItem`.
- **계정 메뉴**: 상단바에서 제거. 사이드바 하단 사용자 카드를 누르면 `UserMenu placement="up"` 팝오버(현재 계정 · 로그아웃). 사이드바 패널이 `overflow: hidden` 이라 팝오버는 카드 폭에 맞춤.
- **AI 레일**(`AiChatPanelHost`): `/ai/chat` 을 뺀 모든 화면에서 **기본 열림**. 폭은 본문과 레일 사이 **드래그 핸들**(responder 이벤트)로 조절 — `useUiStore.aiChatWidth`(기본 400, 최소 320, 최대 창 폭 40% 이면서 본문 480px 확보), `aiChatOpen`·`aiChatWidth` 는 localStorage(`dwje.ax.aiChatOpen/aiChatWidth`)에 기억. 크기 3단(compact/medium/full)·`+` 단추·workspaceMode 는 삭제. 새 대화는 머리의 「새 대화」 텍스트 링크.
- **닫힘 상태**: 본문 패널 오른쪽 가장자리에 36px **세로 단추**(글자를 한 글자씩 쌓음)가 붙어 다시 연다. 창 폭 900 미만이면 레일·단추 모두 숨김.
- 상단바의 채움 버튼은 「덕파트장 AI / AI 닫기」 토글로 유지.
- 메뉴: `qc-aoi` 이름 「AOI 판정 분석」, 시스템관리에 `sys-upload-doc`(`/system/upload-doc`) 추가, `EXTRA_PAGES` 에 **동작 권한 행** `dash-ai-upload`(경로 `/dashboard/ai#upload` — `check-routes` 는 `#` 경로를 건너뜀). 기본 권한: 통합관리자 `*`, 전산팀에 두 항목 추가.
- 엔드포인트 카탈로그: 업로드 문서 6건(`getDashboardUploads` …), 시스템 목록 `getSystemUploads`, AOI 불량 3건(`getQualityAoiDefects`, `…ByDefectId`, `getFilesAoiImagesByImageId`).
- 업로드 리포트: `domains/dashboard/{controller/useUploadReportController, model/uploadReportRepository·uploadReportModel, view/UploadReportView}` + `mock/data/uploads.js`(세션 스토어). 탭 상태 `useAppStore.aiDashTab`. 시스템 목록 `domains/system/*UploadDoc*`. AOI 불량 상세: `domains/quality/{controller/useAoiDefectsController, model/aoiDefectRepository, view/components/AoiDefectSection}`.
- `services/api/client.js` 목 분기: 핸들러가 경로 변수(`{defectId}` 등)를 params 로 받도록 한 줄 변경(실 서버 분기 무변경).
- 계약 확정본은 `docs/requests/REQ_20260910_ai_panel_upload_aoi.md` 의 API·DB 회신 절. 로컬 API(8080)에 V25~V27·새 엔드포인트 10개 반영됨.

## AOI 판정 분석 (2026-09-10 · 2차 요구 반영)
- 화면(`domains/quality/view/AoiPredictionView.jsx`)을 **불량 판정 원본·사진 중심**으로 줄였습니다.
  1. 「불량 목록」 과 「출하 전 위험 LOT」 을 `Grid cols={2}` 로 한 줄에. 2. 「불량 이미지」 는 목록에서 **행을 고른 뒤에만** 아래에 붙습니다(`defects.selectedId` 가 있을 때).
  3. 제거: 「이상 가능성 분석 — 추정」 머리·조건 줄·예측 KPI 4종·안내, 「설비별 위험도 · 권고 조치」, 「잔여 시간 추가 발생 추정」, 「AOI 검사기별 판정 드리프트」. 4. 「지금 상태 — 추정의 근거」 제목 제거.
  5. 남은 목록 3종(불량 목록 · 출하 전 위험 LOT · 불량 유형 구성 변화)은 모두 `TabulatorGrid` — `Table`·`XlsTable` 은 이 화면에서 더 쓰지 않습니다.
- `components/AoiDefectSection.jsx` 는 `part` prop 으로 나뉩니다 — `list`(조회 조건 + 불량 목록) · `viewer`(사진 카드). 반폭 배치라 열을 7개로 줄였고(검사·양품·금형·등급은 사진 카드 상세에), 실 설비명이 길어 **한 칸은 두 줄까지만**(둘째 줄 `.nowrap` 로 …) 씁니다.
- `useAoiDefectsController` 는 **첫 행 자동 선택을 하지 않습니다**(요구 2). 조회·쪽 이동으로 고른 행이 사라지면 선택이 풀려 사진 카드도 닫힙니다.
- `model/qualityRepository.loadAoiPrediction` 에서 화면에서 없어진 세 조회(equipment-risk · remaining-estimate · inspector-drift)를 뺐습니다. `summary` 는 그리지 않지만 **임계값 출처**라 남겨 둡니다(band 응답의 threshold 가 비어 오는 환경이 있음).
- 실 API 주의: `prediction/summary`·`lot-risk` 가 로컬에서 14~17초 걸려 추이 밴드·불량 유형 카드가 늦게 뜹니다(API 성능 이슈, 화면 문제 아님). AOI 라벨 데이터는 ~2026-08-13 까지라 기본 기간(최근 7일)에서는 목록이 비어 보입니다.

## 되살린 것 (2026-09-10)
- `app/(main)/system/product-rank.jsx` 와 `menu.js` 의 `sys-rank`(제품군 순위 관리) 행이 이번 세션 중 **의도 없이 지워져** 있어 되살렸습니다(요구 사항에 없던 삭제). `npm run check:routes` 가 32↔32 로 일치하는지로 확인합니다.

## AOI 판정 분석 (2026-09-11 · 3차 요구 + MSSQL 원천 준비)
- **한 행씩**: 「불량 목록」·「출하 전 위험 LOT」 카드를 각각 화면 폭 전체로 쌓았습니다(2열 배치 해제). 불량 목록은 열을 10개로 되돌렸고(작업장·검사·양품 복원), 한 칸은 두 줄까지만 씁니다.
- **조회 조건은 검사일 하루만** — 설비(AOI)·LOT/모델 검색 제거. 리포지토리는 `date` 와 `from`·`to`(같은 날)를 **함께** 보냅니다: 지금 API(from·to)와 앞으로 올 MSSQL API(date) 양쪽에 그대로 붙습니다(현재 API 가 추가 파라미터를 무시함을 확인).
- **행 클릭 → 모달**(`view/components/AoiDefectModal.jsx`): 왼쪽 NAS 사진(확대·썸네일·경로 복사), 오른쪽 판정 정보, 아래 **검사 항목 표**(DIMENSION `measurements[]` — MSSQL 원천이 붙기 전에는 나오지 않습니다). 상세는 모달이 직접 받습니다(`controller/useAoiDefectDetail.js`) — 전역 모달은 바깥 상태 변화로 다시 그려지지 않기 때문입니다.
- 화면에 붙어 있던 「불량 이미지」 카드와 「불량 상세 — MES 판정 원본 · NAS 사진」 제목은 제거했습니다.
- **출하 전 위험 LOT 쪽 나눔**: 서버에 page·size 가 없어 `useAoiPredictionController` 가 받은 목록을 화면에서 자릅니다(기본 10건). 서버 쪽 나눔이 생기면 `lotRiskPage`·`lotRiskMeta` 계산을 지우고 응답 meta 를 쓰면 됩니다.
- **추이 밴드는 d3**(`charts-d3/LineChart`). 시간 단위 점이 많아 기본 간격(44px/점)이면 카드가 가로로 스크롤돼 추정 구간이 화면 밖으로 나갑니다 → `LineChart` 에 **`minPointWidth`**(기본 44, 여기서는 16) 옵션을 추가했습니다. 다른 화면은 기본값이라 영향 없습니다.
- `TabulatorGrid` 의 ResizeObserver 가 **높이 변화도** 다시 그립니다 — 모달·드로어처럼 0 높이에서 열리는 자리에 표를 놓으면 한 줄만 보이던 문제를 고쳤습니다.
- 목: `qualityMock.js` 의 상세 응답에 `measurements`(SEQ 당 FAI 1개 · 불량 1~3개 고정 생성)와 `seqCnt`·`failSeqCnt`·`passed` 를 넣었고, `AOI_TREND_BAND` 를 실 API 모양(labels/actual/estimated/bandLow/bandHigh/splitIndex)으로 바꿨습니다 — 목 모드에서도 밴드가 그려집니다.
- **MSSQL 전환 준비**: 요청서 `docs/requests/REQ_20260911_aoi_dimension_mssql.md`. `defectId` 는 지금 `plant-wc-lot-serial`, 전환 후 `wc~eqpt~lot~serial` — 화면은 문자열로만 다루고 목은 두 형식을 모두 받습니다. 수량 3종은 `sampleQty ?? seqCnt` · `ngQty ?? failSeqCnt` 로 양쪽 응답을 함께 읽습니다.
