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
