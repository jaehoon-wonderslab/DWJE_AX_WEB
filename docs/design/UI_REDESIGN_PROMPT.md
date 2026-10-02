# UI 리디자인 — 컴포넌트 목록과 디자인 적용 프롬프트 (3차)

작성일 2026-10-01 · 브랜치 `wt/ai_concep_design`

이 문서는 두 부분으로 되어 있습니다.

1. 현재 사이트가 쓰는 컴포넌트 전체 목록 (코드 기준 실측)
2. 로그인을 포함한 전 화면에 적용할 디자인 프롬프트 (기본 글자 크기 15px)

2부의 「프롬프트 본문」 블록은 그대로 복사해 코딩 에이전트에 넣으면 됩니다.

---

## 1부. 현재 사용 중인 컴포넌트

스택: Expo Router + React Native for Web · 상태 zustand · 표 Tabulator 6 · 차트 d3 7 · 아이콘 react-native-svg 인라인 SVG(외부 아이콘 폰트 없음).
글꼴: Pretendard(한글) + Inter(숫자) + JetBrains Mono. 테마는 라이트 하나입니다.

### 1-1. 공통 UI — `src/shared/components/ui` (`@shared/components/ui` 에서 일괄 import)

| 분류 | 컴포넌트 | 파일 |
|---|---|---|
| 기반 | `Icon` (선 아이콘 60종) · `Hoverable` (hover/pressed 계산) | Icon.jsx · Hoverable.jsx |
| 동작 | `Button` (primary/outline/ghost/danger, md/sm) · `IconButton` · `ButtonRow` | Button.jsx |
| 카드 | `Card` (title·sub·right·tight) · `CardBody` · `SourceNote` · `StatCard` (up/down) | Card.jsx · StatCard.jsx |
| 상태 표시 | `Badge` (green/blue/amber/red) · `StateBadge` · `Dot` | Badge.jsx |
| 칩 | `Chip` · `SourceChip` · `SelectChip` · `ChipRow` | Chip.jsx |
| 입력 | `Field` · `TextField` · `TextAreaField` · `SelectField` · `DateField` · `PasswordField` · `CheckRow` · `RadioRow` · `Filters` | Field.jsx |
| 날짜 | `DatePickerPopover` · `DatePickerModal` | DatePicker*.jsx |
| 표 | `Table` (Tabulator 래퍼, 포털 셀) · `TabulatorTable` · `TabulatorGrid` · `Pagination` · `XlsTable` · `XlsLegend` (보고서 병합표) · `PermMatrix` (권한 체크 격자) | Table.jsx 외 · tabulatorHeaders.css |
| 탐색 | `Tabs` · `Steps` | Tabs.jsx · Steps.jsx |
| 데이터 표시 | `KeyValue` · `ListRow` · `ProgressBar` · `Pred` · `ConfTag` · `Drift` (AI 예측값·신뢰도·편차) · `BlindValue` · `BlindNote` (권한 가림) · `Markdown` | 각 파일 |
| 피드백 | `Hint` · `HelpTip` · `NoteText` · `EmptyState` · `Loading` · `Pulse` · `NoAccess` · `FormAlert` | Feedback.jsx |
| 오버레이 | `ToastHost` · `ModalHost` · `DrawerHost` · `openFormModal` · `openConfirmModal` | Overlays.jsx · FormModal.jsx |
| 진행 | `GlobalApiSpinner` · `SparkleSpinner` | 각 파일 |

### 1-2. 레이아웃 셸 — `src/shared/components/layout`

`Sidebar` (228px, 접힘 64px 레일) · `Topbar` (64px) · `AlertBell` (미확인 배지 + 최근 5건 팝오버) · `UserMenu` · `AiChatPanelHost` (AI 질의 레일/작업 모드) · `MenuHub` (메뉴 그룹 허브) · `PageHead` · `PageContainer` · `Grid` · `Gap` · `ReportDoc` (보고서 문서 틀) · `AuthCard` (로그인·가입·재설정 공통 패널)

### 1-3. 브랜드·모션 — `src/shared/components/brand`

`Logo` · `logoCloud` · `ConstellationField` (로그인 파티클 성좌) · `ParticleSwarm` · `AiGatherField` · `AiThinking` · `AiLiveDot` · `EntryTransition` · `PageTransition`

### 1-4. 차트 — `src/shared/components/charts-d3` (현행) · `charts` (구버전)

d3: `LineChart` · `BarChart` · `GroupedBarChart` · `HBarChart` · `BandChart` · `ParetoChart` · `DonutChart` · `Gauge` · `RadarChart` · `HeatMap` · `DotPlot` · `ZoomableSunburst` · `Tooltip` · `d3Theme` · `useChartSize` · `useDataChanged` · `axisLabelWidth`
구버전(`charts/`): BarChart · DonutChart · DotPlot · Gauge · HBarChart · HeatMap · LineChart · RadarChart · chartData

### 1-5. 도메인 화면 전용 컴포넌트

| 도메인 | 컴포넌트 |
|---|---|
| auth | `LoginView` · `SignupView` · `PasswordResetView` · `PasswordFields` · `EmailCodeFields` |
| ai | `ChatHome` (인사말 + AI 브리핑) · `ChatView` |
| dashboard | `AiDashboardView` · `KpiDashboardView` · `ProcessDashboardView` · `UploadReportView` · `ProductPicker` · `AiBriefingCard` · `AiCausePrescriptionCard` · `AiEvidenceModal` · `EquipmentMatrix` · `EquipmentDetail` · `HourlyDefectPivotMatrix` · `HourlyDetailModalContent` · `ProcessYieldView` |
| production | `ProductionMonitorView` · `ProductionResultView` · `DailyReportView` · `DailyHistoryView` · `PressTopView` · `ProductionTrendD3Chart` |
| quality | `DefectStatusView` · `AoiPredictionView` · `AoiBriefingCard` · `AoiAgentAnalysisCard` · `AoiDefectSection` · `AoiDefectModal` |
| report | `ReportPicker` · `MorningSheet` · `PressMorningView` · `PlatingMorningView` · `ShipPlanView` · `YieldByModelView` · `LrrByCustomerView` · `ScrapReportView` |
| alert | `AlertListView` |
| system | `AccountView` · `AccountGrid` · `AccountMenuPicker` · `GwDeptMapView` · `MenuPermView` · `MenuPermGrid` · `DataPermView` · `DataPermGrid` · `DataFieldManager` · `AlertCondView` · `RecipientView` · `GlossaryView` · `ChatHistoryView` · `AuditLogView` · `DownloadLogView` · `UploadDocView` · `SyncHistoryView` |

### 1-6. 아이콘 60종 (`Icon.jsx` PATHS)

menu search bell moon chevronDown chevronRight chevronLeft chevronUp close check download upload printer info help message plus edit trash refresh alert filter arrowUp arrowDown arrowRight arrowLeft play copy external clock file user users settings mic send sparkles thumbsUp thumbsDown eye eyeOff lock database activity layers grid chart save calendar shield link history book image minus sun logout triangle star starFilled

### 1-7. 현재 토큰 요약 (바뀌기 전 값)

- 색: 캔버스 #F4F5F7 · 패널 #FFFFFF · 잉크 #0B1440 · 캡션 #787878 · 포인트 앰버 #F2C14E · 성공 #2E9E57 · 오류 #E5482D · 구분선 #DFE1E7
- 반지름: 패널 24 · 카드 16 · 주요 버튼 14 · 입력/행 12 · 하위 메뉴 10 · 캡슐 999
- 글자: 본문 16.5 · 보조 16 · 캡션 14.5 · 라벨 15 · 카드 제목 17 · 제목 22 · 페이지 제목 25 · 수치 25/21. 굵기 500/600 만
- 전환: 140ms (background/border/color/opacity)
- 하드코딩 현황: `fontSize:` 숫자 직접 지정 218곳(59개 파일), 도메인·라우트 파일의 HEX 직접 지정 24곳 — 토큰만 바꾸면 이 자리는 따라오지 않습니다.

---

## 2부. 디자인 적용 프롬프트

### 레퍼런스 사이트에서 가져올 것

| 사이트 | 가져올 것 | 가져오지 않을 것 |
|---|---|---|
| great-ui.com/components | Animated Link 밑줄, Accordion, Avatar Stack, Revision Timeline(이력 화면), Blur Fade 전환, Text Reveal(로그인·홈 인사말 1회) | 스크롤 연출, 마키, 목업류 — 업무 화면에서 정보 읽기를 방해합니다 |
| shadercn.run | GPU 오브 셰이더 → AI 상태 표시(덕반장 AI 대기·생각 중) 한 곳 | 배경 전면 셰이더 |
| 23rd.dev | Shader Gradient(로그인 왼쪽 브랜드 영역 배경), Live Orb(AI 아바타), Dithered 404 → `+not-found` | ASCII·CRT 효과 — 제조 업무 화면 톤과 맞지 않습니다 |
| gooey-shyt.vercel.app | 끈적한 지시자(Tabs·세그먼트·Pagination), 트리거에서 솟아나는 Tooltip/Popover, 스위치·라디오 전환, 칩 선택 | 모든 요소에 일괄 적용 — 선택 지시자와 오버레이 등장에만 씁니다 |
| uselayouts.com | 공유 요소 전환(카드 → 모달 확장), 펼침 툴바, 레이아웃 애니메이션(필터 칩 추가/삭제, 목록 재정렬) | — |
| coolors 팔레트 | 880D1E · DD2D4A · F26A8D · F49CBB · D1D5DE · EDE3E9 | — |

### 프롬프트 본문

```text
당신은 덕우전자 AX 웹(Expo Router + React Native for Web) 의 UI 리디자인을 맡은 프런트엔드 엔지니어입니다.
로그인·회원가입·비밀번호 재설정을 포함한 모든 화면(메뉴 27건)의 디자인·아이콘·인터랙션·컬러를 개선합니다.
기능·API 호출·라우트·화면 ID·MVC 구조는 바꾸지 않습니다. 바뀌는 것은 모양과 움직임뿐입니다.

[작업 전 반드시 읽을 것]
- AGENTS.md (표 UI 기준, MVC 규칙, npm 스크립트)
- docs/duckwoo-ax-style-reference.md, docs/REDESIGN_HANDOFF.md (2차 원칙 — 이번 작업이 대체하는 항목은 아래에 명시)
- src/shared/theme/colors.js, theme.js, styles.js, app/+html.jsx (글꼴 로드·전역 CSS)
- src/shared/components/ui/index.js 및 layout/, brand/, charts-d3/

[1. 타이포그래피 — 기본 15px]
글꼴은 Pretendard(한글) + Inter(숫자, tabular-nums) 를 유지합니다. 굵기는 500(본문·라벨) / 600(제목·수치) 두 가지만 씁니다.
styles.js 의 스케일을 아래로 바꿉니다. 줄간격은 px 고정값입니다.

  토큰          크기   줄간격  굵기  자간
  caption       12.5   17     500   0
  label/eyebrow 13.5   18     500/600 +0.01em
  textXs        13     18     500   0
  textSm        14     20     500   0
  text, body    15     22     500   0        ← 기본값
  textMuted     15     22     500   0  (캡션 색)
  chat          15     24     500   0
  heading2xs    16     22     600   -0.01em (카드 제목)
  headingXs     18     24     600   -0.015em (섹션 제목)
  heading/Sm    22     28     600   -0.02em (페이지 제목)
  headingLg     26     32     600   -0.02em (홈 인사말)
  display       30     36     600   -0.025em (로그인 헤드라인)
  numeral       26     30     600   -0.02em  Inter
  numeralSm     20     24     600   -0.015em Inter
  mono          13.5   20     500

- 표(Tabulator): 본문 셀 14px, 헤더 13px/600. tabulatorHeaders.css 와 Table 래퍼에서 한 번에 지정합니다.
- 입력칸·버튼 글자 15px(sm 버튼 14px), 입력 높이 40px(sm 34px), 버튼 높이 40px(sm 32px).
- 차트 d3Theme: 축 눈금 12px, 범례 13px, 툴팁 13.5px, 차트 안 강조 수치 15px/600.
- 화면 파일에 숫자로 박힌 fontSize(약 218곳, 59개 파일)를 모두 찾아 위 토큰으로 바꿉니다.
  토큰으로 옮길 수 없는 자리는 위 표의 값 중 가장 가까운 값으로 맞추고 주석을 남깁니다.
  확인: grep -rEn "fontSize: ?[0-9.]+" src app 결과가 theme/styles.js 와 d3Theme.js 외에 남지 않아야 합니다.

[2. 컬러 컨셉 — Coolors 팔레트 기반 "Burgundy & Blush"]
팔레트: #880D1E · #DD2D4A · #F26A8D · #F49CBB · #D1D5DE · #EDE3E9
colors.js 의 LIGHT_TOKENS(HSL 삼원색)를 아래처럼 다시 매핑합니다. 다크 테마는 만들지 않습니다.

  토큰                값        용도
  background          #F6F1F4   캔버스 (EDE3E9 를 밝게 올린 블러시 그레이)
  card / popover      #FFFFFF   패널
  muted               #FBF8FA   2차 표면(중첩 카드, 보더 없음)
  secondary           #F3ECF0   트랙·호버
  border / input      #E4DDE2   구분선 (D1D5DE 와 EDE3E9 사이)
  foreground          #1E1418   본문 (따뜻한 근흑색)
  secondaryForeground #3D3237   카드 안 문단
  mutedForeground     #7A6E74   캡션·라벨
  primary             #880D1E   제목 강조·채움 버튼·활성 내비·차트 1계열
  primary hover       #6E0A18
  accent / ring       #DD2D4A   포커스 링(2px, 투명도 0.35)·활성 지시자·링크 hover
  spark (포인트)      #F26A8D   데이터 강조 채움·활성 점·AI 생동 표시 (기존 앰버 역할 이전)
  tint                #F49CBB   선택 행/칩 배경은 이 색의 12~18% 투명도로만 사용
  dataMute            #D1D5DE   비강조 데이터·비활성 막대
  success             #2E9E57   유지
  warning             #E8A33D   주의 (기존 앰버를 상태 전용으로 남김)
  destructive         #C81E1E   오류

  차트 계열(고정 순서): #880D1E → #DD2D4A → #F26A8D → #F49CBB → #8A93A6 → #2E9E57
  overlay: rgba(30,20,24,0.32) · panelShadow: 0 10px 30px rgba(136,13,30,0.05)

규칙
- 브랜드가 붉은 계열이므로 붉은색만으로 "오류·불량"을 뜻하게 하지 않습니다.
  오류·불량·초과 표시에는 반드시 아이콘(alert/triangle) 또는 글자 라벨을 함께 둡니다.
  Badge tone="red" 는 destructive(#C81E1E) + 아이콘, 브랜드 강조는 tone="brand"(새로 추가) 로 분리합니다.
- 화면 하나에 채움 버튼(primary)은 주요 동작 하나만 둡니다.
- #F26A8D·#F49CBB 는 글자색으로 쓰지 않습니다(흰 배경 대비 부족). 글자는 primary 또는 foreground 계열만.
- 본문 글자 대비 4.5:1, 큰 글자·아이콘 3:1 이상을 지킵니다.
- 덕우전자 CI 로고(BRAND.deokwooBlue·skyBlue)는 색을 바꾸지 않습니다. 로고 주변에 붉은 배경을 깔지 않습니다.
- 도메인·라우트 파일에 직접 쓴 HEX(약 24곳)는 모두 theme.color / theme.alpha 로 바꿉니다.

[3. 형태 — 반지름·여백·그림자]
- 반지름: 패널 20 · 카드 14 · 주요 버튼 12 · 입력/행 10 · 하위 메뉴 8 · 캡슐 999. (theme.js METRICS)
- 셸 여백 16px, 카드 안쪽 여백 20px(tight 14px), 카드 사이 간격 14px.
- 그림자는 패널 한 단계만. 카드는 테두리(#E4DDE2 1px)로만 구분하고 카드 안에 카드를 넣지 않습니다.
- 위계는 크기보다 색·굵기로 만듭니다.

[4. 아이콘]
- Icon.jsx 의 60종을 lucide 최신 형태와 같은 24 그리드로 정리합니다. stroke 1.75, 끝·모서리 round.
- 크기 단계는 14 / 16 / 18 / 20 네 가지만. 본문 15px 옆은 16, 버튼 안은 16, 사이드바 18, 빈 상태 20(배경 원 40px 위).
- 아이콘 단독 버튼(IconButton)은 34px 히트 영역 + title(툴팁) 필수.
- 추가: arrowUpRight, sliders, factory, cpu, gauge, checkCircle, xCircle, loader, panelLeft, maximize, minimize, sort.
- 상태 아이콘 규칙: 성공 checkCircle, 주의 triangle, 오류 alert, 정보 info. 색과 함께 씁니다.
- 아이콘 hover: 색만 바뀌고(primary) 크기는 바꾸지 않습니다. 새로고침은 누르는 동안 회전합니다.

[5. 인터랙션·모션]
공통 규칙
- 기본 전환 160ms, 등장 220ms, 퇴장 140ms. ease-out cubic-bezier(0.22, 1, 0.36, 1).
  스프링이 필요한 곳(지시자·오버레이)은 stiffness 380 / damping 30 근사값으로 CSS 또는 Animated 로 구현합니다.
- prefers-reduced-motion: reduce 이면 이동·크기 변화는 끄고 opacity 만 남깁니다 (+html.jsx 에 이미 있는 블록을 확장).
- 새 라이브러리(motion, framer-motion 등)는 추가하지 않습니다. RN Animated + 웹 CSS transition/keyframes 로 만듭니다.
  꼭 필요하다고 판단되면 먼저 이유와 번들 크기 영향을 보고하고 승인을 받습니다.

컴포넌트별 (참고: gooey-shyt, uselayouts, great-ui)
- Button: hover 시 배경 한 단계 진하게, press 시 scale 0.98 + 80ms. 로딩 중에는 글자 자리에 스피너, 너비 유지.
- Tabs · Pagination · 세그먼트형 SelectChip: 선택 지시자(캡슐)가 항목 사이를 미끄러져 이동합니다(gooey 의 pill pour 를 블러 없이 단순화).
  이동 중 지시자 가로 길이가 출발·도착 사이로 잠깐 늘어났다 줄어듭니다.
- Tooltip · Popover · AlertBell 팝오버 · UserMenu · DatePickerPopover: 트리거 쪽에서 scale 0.96 → 1, opacity 0 → 1 로 솟아납니다(transform-origin = 트리거 방향).
- Modal: 배경 페이드 + 본문 translateY 8px → 0. 목록 카드를 눌러 여는 상세(AiEvidenceModal, AoiDefectModal, HourlyDetail)는
  카드 위치에서 확장되는 공유 요소 전환을 웹에서만 적용합니다(uselayouts). 불가능한 경우 일반 모달 전환으로 둡니다.
- Drawer: 오른쪽에서 슬라이드 + 배경 페이드.
- Toast: 오른쪽 위에서 쌓이고, 새 토스트가 들어오면 기존 것이 부드럽게 밀립니다. 4초 후 사라짐, hover 중에는 멈춤.
- CheckRow · RadioRow · 스위치: 체크 표시는 선을 그리듯 등장(stroke-dashoffset), 라디오 점은 scale 0 → 1 스프링.
- 필터 칩 추가·삭제, 목록 재정렬: 높이·위치 변화를 160ms 로 이어 줍니다(레이아웃 애니메이션).
- Card 내부 Accordion(펼침 영역이 있는 카드): 높이 전환 + chevron 180도 회전.
- Sidebar: 접힘/펼침 너비 전환 200ms, 접힌 상태에서 아이콘 hover 시 메뉴 이름 툴팁. 활성 항목은 왼쪽 3px 지시자(#DD2D4A) + 배경 tint.
- 링크·텍스트 버튼: 밑줄이 왼쪽에서 오른쪽으로 그려집니다(great-ui Animated Link).
- 페이지 전환(PageTransition): 본문만 opacity + translateY 6px, 셸은 움직이지 않습니다. 블러 페이드는 로그인 → 메인 진입 1회만.
- Loading: 화면 전체 스피너 대신 카드 단위 스켈레톤(shimmer, 1.4s). GlobalApiSpinner 는 상단 2px 진행 막대로 바꿉니다.
- 숫자 갱신(StatCard, Gauge, KPI): 값이 바뀌면 이전 값에서 새 값으로 400ms 카운트. 첫 렌더에는 하지 않습니다.
- 표(Tabulator): 행 hover 배경 secondary, 선택 행 tint 14%, 정렬 헤더 클릭 시 화살표 회전. 행 등장 애니메이션은 넣지 않습니다(데이터 양).
- 차트: 첫 렌더 시 막대·선이 600ms 동안 그려지고, 데이터 변경 시 이전 형태에서 이어서 바뀝니다(useDataChanged 활용). 툴팁은 포인터를 따라 부드럽게 이동합니다.

AI 요소 (shadercn, 23rd Live Orb 참고)
- AiLiveDot · AiThinking · SparkleSpinner 를 하나의 "AI 오브" 언어로 통일합니다:
  대기 = 천천히 숨쉬는 원(4s), 생각 중 = 그라디언트(#880D1E → #F26A8D → #F49CBB)가 회전, 응답 완료 = 한 번 퍼지고 멈춤.
- WebGL 셰이더는 로그인 브랜드 영역과 AI 오브 두 곳에서만 쓰고, 미지원·저사양 환경에서는 CSS 그라디언트로 대체합니다.
- 채팅 응답 텍스트는 스트리밍처럼 단어 단위로 짧게 페이드인(전체 문장 연출 금지, 읽기 속도 우선).

[6. 화면별 지침]
로그인 · 회원가입 · 비밀번호 재설정 (AuthCard, LoginView, SignupView, PasswordResetView)
- 흰 패널 한 장 구조 유지: 왼쪽 브랜드 영역 / 오른쪽 폼.
- 왼쪽: ConstellationField 를 새 팔레트로 바꾸고, 그 아래에 아주 옅은 Shader Gradient(#EDE3E9 → #F49CBB → #F6F1F4, 느린 흐름) 를 깝니다.
  헤드라인은 display(30px) 로, 진입 시 한 줄씩 Text Reveal(1회).
- 오른쪽 폼: 입력 40px, 라벨 13.5px, 오류 메시지는 칸 아래 13px + alert 아이콘. 사번 → 비밀번호 → 로그인 Tab 순서 유지(PasswordField 눈 아이콘 tabIndex=-1 유지).
- 로그인 버튼: 누르면 버튼 안 스피너 → 성공 시 EntryTransition(블러 페이드) 로 메인 진입. 실패 시 폼이 좌우로 4px 짧게 흔들림(1회).
- 960px 미만에서는 브랜드 영역을 위쪽 띠(높이 160px)로 접습니다.

셸 (Sidebar, Topbar, AlertBell, UserMenu, AiChatPanelHost)
- 캔버스 #F6F1F4 위 흰 패널 구조 유지. Topbar 높이 60px, Sidebar 228/64px 유지.
- AlertBell 미확인 배지는 #DD2D4A 원 + 흰 숫자(12px), 새 알림이 오면 종이 한 번 흔들립니다.
- AI 레일 열고 닫기는 너비 전환 220ms, 본문 너비가 함께 줄어듭니다(겹치지 않음).

덕반장 AI (ChatHome, ChatView)
- 홈 인사말 headingLg(26px), 브리핑 문단은 15px/24 로, hover 시 문단 배경 tint + 오른쪽에 arrowUpRight 아이콘.
- 입력창은 하단 고정 캡슐(반지름 999 아님, 16), 포커스 시 링 #DD2D4A 35%.

대시보드 (AI 통합 · 공정 및 제품 · 생산 모니터링)
- StatCard: 라벨 13.5 / 수치 numeral 26 / 증감 Drift 13.5. 증가·감소는 화살표 아이콘 + 색 함께.
- EquipmentMatrix·HeatMap: 셀 상태는 색 + 모양(점/테두리) 이중 표기. 가동 중 셀은 AiLiveDot 와 같은 숨쉬기 점.

생산 및 품질 관리, 보고서, 시스템 관리 (표 위주 화면)
- Filters 영역: 한 줄 카드, 칩·셀렉트 높이 34px 통일, 조회 버튼만 primary.
- 표는 AGENTS.md 「표 UI 작업 기준」을 그대로 따릅니다: 열 숨김·과도한 압축 금지, 넘치면 가로 스크롤, 헤더·본문 함께 이동, 부모 카드 너비 안에서 스크롤.
- XlsTable(보고서 병합표)·PermMatrix 는 구조를 바꾸지 않고 글자·색·선만 새 토큰으로 맞춥니다.
- 이력 화면(감사 로그, 다운로드 이력, 연동 이력, 업로드 문서)의 상세에는 Revision Timeline 형태(세로선 + 점 + 시각)를 씁니다.

빈 상태 · 오류 · 권한 없음 · 404
- EmptyState/NoAccess: 20px 아이콘(배경 원 40px) + 15px 문장 + 필요 시 보조 버튼 하나.
- +not-found: 23rd Dithered 404 를 단순화한 점묘 배경(정적 SVG, 새 팔레트) + "홈으로" 버튼.

[7. 작업 순서]
1) 토큰: colors.js · theme.js(METRICS·overlay·shadow) · styles.js(타이포) · d3Theme.js · tabulatorHeaders.css · +html.jsx 전역 CSS
2) 공통 UI(ui/) → 레이아웃 셸(layout/) → 브랜드·모션(brand/)
3) 화면별 하드코딩 fontSize·HEX 제거 (grep 결과를 표로 남기고 하나씩 지움)
4) 로그인 → 덕반장 AI → 대시보드 → 생산·품질 → 보고서 → 알림 → 시스템 순으로 화면 점검
각 단계가 끝날 때마다 커밋합니다.

[8. 검증]
- npm run check 통과 (env · syntax · api · mock · routes · columns).
- npm run web 로 로컬에서 띄우고, 메뉴 27건 + 로그인·회원가입·비밀번호 재설정 + 404 를 1440px 과 1024px 두 폭에서 스크린샷으로 확인합니다.
- 각 표 화면에서 오른쪽 끝까지 가로 스크롤해 마지막 열 헤더와 값이 보이는지 확인합니다.
- 키보드만으로 로그인 → 메뉴 이동 → 모달 열고 닫기가 되는지, 포커스 링이 보이는지 확인합니다.
- prefers-reduced-motion 을 켠 상태에서 이동 애니메이션이 꺼지는지 확인합니다.
- 결과 보고에 바꾼 토큰 표(전/후), 남은 하드코딩 위치, 적용하지 못한 항목과 이유를 적습니다.

[금지]
- API·라우트·화면 ID·menu.js 구조 변경, 새 화면 추가
- 다크 테마 추가, 새 UI/애니메이션 라이브러리 무단 추가
- .env 나 코드·문서에 사내 서버 주소 새로 쓰기
- 표 열 숨기기, 글자를 12px 미만으로 줄이기
- 붉은색만으로 상태를 구분하기
```

### 결정이 필요한 항목

- 팔레트가 붉은 계열이라 오류·불량 표시와 겹칩니다. 프롬프트는 오류를 #C81E1E + 아이콘으로 분리하는 안을 택했습니다. 품질 화면은 불량 표시가 많으므로, 브랜드는 버건디로 두고 오류만 주황 계열(#D9480F)로 옮기는 안도 함께 검토할 만합니다.
- 기존 2차 원칙(잉크 네이비 #0B1440, 앰버 포인트)을 이번 작업이 대체합니다. 진행이 확정되면 `docs/duckwoo-ax-style-reference.md` 와 `docs/REDESIGN_HANDOFF.md` 를 함께 고쳐야 합니다.
- 기본 15px 는 현행 본문(16.5px)보다 작습니다. 현장 대형 모니터에서 쓰는 화면(생산 모니터링)은 따로 16px 로 둘지 정해야 합니다.
