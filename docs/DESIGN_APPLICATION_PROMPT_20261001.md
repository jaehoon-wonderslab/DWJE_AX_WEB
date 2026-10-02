# 전체 화면 디자인 적용 프롬프트

아래 프롬프트를 디자인·프런트엔드 작업 에이전트에게 전달한다. 컴포넌트의 파일별 전체 목록은 같은 폴더의 `COMPONENT_INVENTORY_20261001.md`를 함께 제공한다.

---

당신은 제조업 업무 시스템을 설계하는 제품 디자이너이자 프런트엔드 개발자다. 현재 덕우전자 AX 웹사이트의 로그인부터 모든 업무 화면까지 하나의 디자인 시스템으로 개선하라. 실제 제품 코드에 적용하고 화면별 결과를 검증하라.

핵심 방향은 **버건디와 로즈를 브랜드 포인트로 사용한 밝고 정돈된 제조업 AI 업무 콘솔**이다. 기본 글자 크기는 **15px**이다. 사용자가 생산·품질 수치를 읽고, 필터를 조작하고, 보고서를 비교하고, AI 분석의 근거를 확인하는 일이 편해져야 한다.

## 1. 작업 범위와 현재 구현

- 작업 루트의 `AGENTS.md`를 먼저 읽고 준수한다.
- 운영 코드인 `app/`, `src/`를 대상으로 한다. `proto/`와 보관 HTML은 별도 요청 없이 수정하지 않는다.
- `docs/COMPONENT_INVENTORY_20261001.md`를 시작 목록으로 사용하고 현재 소스와 대조한다. 목록의 정적 참조는 실제 런타임 노출 여부와 다를 수 있다.
- 스택은 React 19, Expo Router, React Native Web, Zustand, Tabulator, D3, react-native-svg다. 참고 사이트의 Tailwind·Next.js·shadcn 코드를 그대로 설치하는 것으로 작업을 대체하지 않는다. 기존 컴포넌트의 props와 플랫폼 분기를 존중하며 디자인을 이식한다.
- 인증, 계산, API 요청, 데이터 접근 제한, 마스킹, 다운로드, 업로드, 보고서 편집·결재 흐름을 유지한다.
- MVC 구조를 유지한다. 계산·API는 model, 상태·동작은 controller, JSX는 view, 라우트는 app에서 결선한다.
- 화면 ID, 메뉴 경로, DB 메뉴, `/auth/me`의 menuPerms 판정은 디자인 작업으로 변경하지 않는다.
- 서버 대상은 `scripts/targets.cjs`를 사용한다. 주소를 코드나 문서에 추가하지 않는다. 실서버 확인은 VPN이 활성화된 상태에서만 가능하며 WEB과 API 대상의 역할을 구분한다.
- 현재 조사에서 `check:routes`는 메뉴 28건·라우트 28건, ENDPOINTS 카탈로그는 215항목이다. 로그인·허브·하위 화면·동작 권한을 구분하고, 작업 시 다시 검사한다. 기존 문서의 메뉴 27건·API 209건을 그대로 복사하지 않는다.
- 연결이 확인되지 않은 컴포넌트나 제거된 화면은 삭제하지 않는다. 상태를 기록하고 제거 화면은 「제거됨」으로 남긴다.

## 2. 참고 사이트의 적용 방향

다음 사이트를 직접 확인한 후 아래 방향으로 해석한다. 링크의 실제 컴포넌트와 동작을 확인하고 적용 기록에 남긴다. 확인하지 못한 데모는 이름이나 URL만으로 동작을 추정하지 않는다.

1. https://www.great-ui.com/components
   - Minimal Buttons, Card, Accordion 등의 절제된 형태와 hover·press 피드백을 참고한다.
   - 페이지 전환은 짧은 fade와 작은 이동으로 구현한다. 업무 화면에는 픽셀 분해·커튼·비행 카드 같은 큰 전환을 추가하지 않는다.
2. https://www.shadercn.run/docs/components
   - GPU 기반 Orb의 빛·깊이·색의 흐름을 로그인 브랜드 영역과 AI 상태 표시에 참고한다.
   - WebGL은 선택적 향상으로 구현한다. 로딩 실패·컨텍스트 손실·저성능 기기에서는 정적인 그라데이션/SVG로 대체한다. 폼과 데이터 표 뒤에는 움직이는 셰이더를 배치하지 않는다.
3. https://23rd.dev/docs
   - Shader Gradient의 은은한 색면과 Live Orb·Logo Burst의 브랜드 표현을 검토한다.
   - 기존 로고·ParticleSwarm·AiLiveDot·AiThinking 계열에 필요한 표현만 반영한다. 로그인 입력을 기다리게 하는 로고 연출은 만들지 않는다.
4. https://gooey-shyt.vercel.app/
   - Tabs, toggle/radio, pagination의 선택 표시 이동과 spinner·버튼의 상태 연결을 참고한다.
   - 액체 효과는 배경·선택 표시 도형에만 적용한다. 글자·숫자·아이콘·표에는 blur 필터를 적용하지 않는다. 기존 선택 이벤트와 키보드 동작을 유지한다.
5. https://uselayouts.com/browse
   - Bento Card의 정보 그룹화, Filter Interaction의 선택 피드백, Status Button의 대기·진행·성공 상태를 참고한다.
   - 대시보드는 지표→변화→원인→상세 순으로 읽히도록 구성한다. 필터와 저장 버튼은 실제 요청 상태에 연결하며 성공 애니메이션을 타이머로 꾸며내지 않는다.
6. https://coolors.co/visualizer/880d1e-dd2d4a-f26a8d-f49cbb-d1d5de-ede3e9
   - URL에 지정된 6색을 브랜드 팔레트로 사용한다. 본문·상태·차트에는 가독성을 확보하는 보조 토큰을 추가한다.

## 3. 색상 시스템

중앙 테마에서 의미 기반 토큰으로 정의하고 화면에서 같은 HEX를 반복하지 않는다.

| 역할 | 기준색 | 적용 |
|---|---|---|
| brandDeep | #880D1E | 주요 버튼, 활성 메뉴 아이콘·텍스트, 브랜드 제목 |
| brandAccent | #DD2D4A | 작은 강조점, 선택 표시, 강조 데이터 |
| brandRose | #F26A8D | 로그인 시각 효과, 강조 계열색 |
| brandSoft | #F49CBB | 장식·선택 배경의 낮은 농도 변형 |
| neutral | #D1D5DE | 구분선·중립 요소의 기준 |
| canvasTint | #EDE3E9 | 로그인 색면 및 전체 캔버스의 옅은 변형 |
| surface | #FFFFFF | 카드·표·입력 영역 |
| foreground | #24212A | 기본 본문·데이터 |
| mutedForeground | #625B67 | 설명·부가 정보 |

- 브랜드 버건디와 오류 색을 분리한다. 오류는 별도의 destructive 토큰, 경고는 amber, 정상은 green, 정보는 blue로 정의한다. 각 상태는 아이콘과 문구를 함께 제공한다.
- 기본 버튼은 #880D1E 배경과 흰 글자, hover는 더 깊은 버건디, pressed는 명확한 눌림, disabled는 중립색으로 구분한다.
- #DD2D4A·#F26A8D·#F49CBB를 작은 본문 글자나 흰색 위의 일반 라벨에 그대로 적용하지 않는다. 실제 배경과의 대비를 측정해 사용한다.
- 본문 대비 4.5:1, 큰 텍스트 및 필요한 UI 경계·상태 표시 대비 3:1을 검증한다.
- 밝은 화면을 기본으로 완성한다. 기존 라이트 테마 구조에서 별도의 다크 테마를 만들며 범위를 늘리지 않는다.
- 차트의 여러 계열을 로즈 계열만으로 구분하지 않는다. 버건디 포인트에 teal·blue·amber 등 구별 가능한 계열을 배정하고 라벨·선 형태·범례를 병행한다. 같은 계열의 색은 화면 간 고정하며 기존 seriesAt 정책과 조화시킨다.

## 4. 타이포그래피 — 기본 15px

기존 Pretendard를 기본 서체로 유지하고 수치에는 Inter와 tabular-nums를 활용한다. 글자 크기·행간·굵기를 중앙 토큰으로 만든다.

| 용도 | 크기 | 행간 | 굵기 |
|---|---:|---:|---:|
| 일반 본문·폼·버튼·탭·메뉴·표 헤더/값 | 15px | 22px | 400 또는 500, 헤더 600 |
| 설명·보조 라벨·범례 | 14px | 20px | 400~500 |
| 캡션·단위·메타 정보 | 13px | 18px | 400~500 |
| 카드 제목·모달 소제목 | 17px | 24px | 600 |
| 섹션 제목 | 20px | 28px | 600 |
| 페이지 제목 | 26px | 34px | 600 |
| 로그인 브랜드 제목 | 32px | 42px | 600 |
| KPI 수치 | 30px | 38px | 600 |

- default 15px은 본문 기준이다. 제목과 KPI까지 모두 15px로 만들지 않는다.
- 현재 `styles.js`의 본문 16.5px, 채팅 17px 및 각 View의 인라인 크기를 토큰 기준으로 정리한다. 기존 크기에 일괄 감산하거나 브라우저 zoom으로 줄이지 않는다.
- RN Text/TextInput은 CSS body 크기를 자동 상속한다고 가정하지 않는다. 공통 텍스트 스타일, inputStyle, DOM select, Tabulator CSS, D3/SVG, Markdown, 툴팁, 달력, 토스트를 함께 점검한다.
- 채팅의 기본 본문도 15px·24px로 맞춘다. 13px 캡션으로 기능상 중요한 값·입력값·표 데이터를 압축하지 않는다.
- iOS 좁은 화면에서는 입력 포커스 시 확대 여부를 확인한다. 필요하면 모바일 입력값만 16px 예외로 두고 기록한다.
- 한글은 단어 단위 줄바꿈, 숫자는 열 정렬과 자릿수 가독성을 우선한다. 긴 ID·URL은 컨테이너를 넘지 않게 처리한다.
- 200% 확대 시 버튼 라벨, 폼 오류, 모달 콘텐츠가 잘리지 않도록 한다.

## 5. 공간·형태·레이아웃

- 간격 토큰: 4 / 8 / 12 / 16 / 24 / 32px. 카드 padding은 20~24px, 좁은 화면은 16px.
- 모서리: 입력·버튼 10px, 카드 16px, 모달 20px, 상위 패널 24px. 칩·선택 표시만 pill 형태를 사용한다.
- 일반 컨트롤은 높이 40~44px, 터치 화면의 조작 영역은 최소 44px. 표 행은 기본 44px 이상으로 읽기 편하게 한다.
- 카드의 구분은 배경과 얇은 테두리로 만든다. 그림자는 떠 있는 메뉴·모달과 최상위 패널에 절제해서 사용한다.
- 상단바·사이드바·페이지 헤더·필터·본문·푸터의 정렬선을 통일한다. 큰 표는 가용 너비를 활용하고 채팅/인증 폼은 읽기 좋은 폭을 제한한다.
- 권한으로 보이는 메뉴만 표시한다. 접힌 사이드바의 아이콘에는 툴팁과 접근 가능한 이름을 제공한다.
- 1440 / 1280 / 1024 / 768 / 390px에서 확인한다. 좁아지면 필터·KPI·분할 패널은 재배치하고 표는 독립 스크롤로 처리한다.

## 6. 컴포넌트 적용 항목

아래 묶음과 별도 목록 문서의 모든 파일을 점검한다. 같은 이름의 SVG/D3 구현은 별도로 확인한다. 목록 문서에 있는 파일 내부 부분 컴포넌트도 포함한다.

- 앱 셸: Sidebar, Topbar, AlertBell, UserMenu, PageContainer/FullPageContainer, PageHead/BackLink, Grid/Gap, MenuHub, AiChatPanelHost.
- 인증·문서: AuthCard/AuthLinks, ReportDoc/ReportTitle/SignalLegend, LoginView, SignupView, PasswordResetView, PasswordFields, EmailCodeFields, MorningSheet.
- 액션: Button/IconButton/ButtonRow, Hoverable, Icon.
- 카드·지표: Card/CardBody/SourceNote, StatCard, KeyValue, ListRow, ProgressBar, Steps, Pred/ConfTag/Drift.
- 상태·선택: Badge/StateBadge/Dot, Chip/SourceChip/SelectChip/ChipRow, Tabs, Pagination.
- 폼: Field, TextField, TextAreaField, SelectField, DateField, PasswordField, CheckRow, RadioRow, Filters, DatePickerPopover, DatePickerModal.
- 표·권한: Table, TabulatorGrid, TabulatorTable, XlsTable/XlsLegend, PermMatrix, AccountGrid, MenuPermGrid, DataPermGrid, AccountMenuPicker, DataFieldManager, BlindValue/BlindNote.
- 피드백: Hint, HelpTip, NoteText, EmptyState, Loading/Pulse, NoAccess, FormAlert, GlobalApiSpinner, SparkleSpinner, ToastHost, ModalHost, DrawerHost, FormModal의 폼·확인 콘텐츠, Markdown의 표·인라인 표현.
- 차트: LineChart, BarChart, HBarChart, GroupedBarChart, DotPlot, HeatMap, DonutChart, RadarChart, Gauge, ParetoChart, BandChart, ZoomableSunburst, Tooltip, ChartEmpty, ProductionTrendD3Chart.
- 브랜드·AI 효과: LogoMark, LogoLockup, ConstellationField, ParticleSwarm, EntryTransition, PageTransition, AiGatherField, AiLiveDot, AiThinking 및 내부 효과 레이어.
- 업무 부분 UI: ReportPicker, ProductPicker, PressTopView, EquipmentMatrix, EquipmentDetail, ProcessYieldView, HourlyDefectPivotMatrix, HourlyDetailModalContent, AiEvidenceModal, AiBriefingCard, AiCausePrescriptionCard, AoiBriefingCard, AoiAgentAnalysisCard, AoiDefectSection, AoiDefectModal, ChatHome/ChatView 내부 메시지·질의·근거·입력 UI.

### 아이콘

- 기존 `Icon.jsx`의 이름 계약을 유지하고 SVG 선 아이콘의 시각 규칙을 통일한다. 꼭 필요한 새 아이콘은 이 공통 경로에 추가한다.
- 24×24 기준 도형, stroke 1.75~2, 둥근 linecap/linejoin. 버튼 내부 18px, 메뉴 20px, 강조 영역 24px을 기본으로 한다.
- 검색·필터·달력·다운로드·업로드·편집·삭제·알림·사용자·권한·AI·근거·복사·펼침의 의미를 일관되게 매핑한다.
- 아이콘 버튼에는 accessible name과 툴팁을 제공한다. 장식 SVG는 보조 기술에서 숨긴다. 클릭 대상을 도형 크기만큼 작게 만들지 않는다.

### 표 — 반드시 지킬 조건

- 공통 Table/TabulatorGrid/TabulatorTable을 우선 개선한다. XlsTable, 권한 표, 피벗, Markdown 표도 같은 스크롤 원칙으로 점검한다.
- 각 열의 width/minWidth를 유지하고 별도 지정이 없는 데이터 열은 읽을 수 있는 최소 너비를 확보한다.
- 마지막 열이 넘치면 부모 카드 안에서 가로 스크롤을 제공한다. 열 숨김·과도한 압축·전역 body 가로 스크롤로 해결하지 않는다.
- 헤더와 본문은 같은 가로 위치로 이동해야 한다. 오른쪽 끝에서 마지막 열의 헤더·값·행 액션을 확인한다.
- 정렬·필터·편집·선택·합계·페이지 이동·마스킹·엑셀 다운로드 동작을 유지한다. 편집 셀과 읽기 전용 셀, 선택 행과 hover 행을 구분한다.
- 고정 헤더·열이 있다면 스크롤 중 겹침과 경계선을 확인한다. 15px 적용 후 행 높이·그룹 헤더·셀 편집기가 잘리지 않게 조정한다.

## 7. 화면별 적용

- 로그인: 넓은 화면에는 브랜드 영역과 400~440px 인증 폼을 배치한다. 브랜드 영역에는 버건디·로즈의 은은한 흐름과 기존 로고를 사용한다. 좁은 화면은 폼을 우선 배치한다. 사번→비밀번호→로그인의 흐름, Enter 제출, 자동완성, 오류, pending, mock 전용 안내를 유지한다. 서버 인증 실패 문구를 임의로 나누거나 mock 안내를 실환경에 노출하지 않는다.
- 회원가입·비밀번호 찾기: 로그인과 같은 AuthCard 시스템, 단계·이메일 인증·비밀번호 기준·오류·성공 피드백을 일관되게 표시한다.
- AI 채팅: 질문 입력과 추천 질문을 중심으로 구성한다. 사용자 메시지·AI 답변·근거·데이터 출처·복사·피드백·후속 액션을 구분한다. AI 효과는 입력·분석·응답 상태와 연결하고 읽는 동안 계속 흔들리지 않게 한다. 대화/본문 스크롤 동작을 유지한다.
- AI 통합 대시보드: KPI→AI 브리핑→시각화→근거·처방→상세 데이터의 위계를 만든다. 업로드 리포트와 KPI 하위 뷰, 분석 근거 모달도 개선한다.
- 공정·제품 대시보드와 생산 모니터링: 제품·설비 선택, 공정 수율, 설비 매트릭스, 시간별 피벗, 상세 모달을 같은 카드·상태 규칙으로 통일한다.
- 실적 조회·불량 현황·AOI 판정 분석: 필터와 조회 액션을 정렬하고 결과 건수·단위·기간·판정 상태·상세·이미지·AI 분석의 위계를 개선한다. 기존 이미지 접근 제한과 데이터 권한을 유지한다.
- 보고서: 일일 생산현황·이전 보고서·PRESS 아침회의·Plating/Coating 아침회의·연간 출하계획·제품별 수율·고객사별 LRR·폐기 보고서를 모두 적용한다. 문서 제목·기간·단위·합계·편집·결재·다운로드의 위치를 통일한다. 기존 출력·엑셀 서식과 보고서 수치가 바뀌지 않도록 한다.
- 알림: 목록·상세·상단 알림 메뉴에 중요도·발생 시각·처리 상태·근거·액션을 명확하게 배치한다.
- 시스템관리: 계정·그룹웨어 부서 매핑·메뉴 권한·데이터 권한·알림 조건·수신자·용어 사전·질의 이력·보안 감사 로그·다운로드 이력·업로드 문서·연동 이력을 모두 적용한다. 권한 매트릭스는 체크 상태와 저장 결과를 쉽게 읽도록 한다. 조회·추가·수정·삭제 버튼의 규칙을 통일한다.
- 메뉴 허브·하위 화면·모달·드로어·404·권한 없음·빈 결과·실패·로딩도 범위에 포함한다. 이전 메뉴 경로는 호환 동작을 유지한다.

## 8. 인터랙션과 접근성

- hover/press/focus 피드백 120~160ms, 메뉴·탭 선택 표시 160~220ms, 모달·드로어 180~240ms, 페이지 진입 180~250ms를 기준으로 한다.
- 이동 거리는 4~8px 수준으로 제한한다. 텍스트 blur와 읽기를 방해하는 큰 scale/회전은 피한다.
- 장식은 pointer-events를 차단하고 핵심 UI를 가리지 않는다. 화면 이동 시 효과를 해제하며 비활성 탭·보이지 않는 효과는 멈춘다.
- reduced-motion에서는 셰이더·입자·gooey 이동을 정적 상태나 즉시 전환으로 대체한다.
- 버튼 상태는 기본·hover·pressed·focus·disabled·pending·success·error를 정의한다. 실제 API 성공 후에만 완료를 표시하고 중복 제출을 막는다.
- 필터 적용/초기화, 탭 선택, 달력 선택, 모달 열기/닫기, 행 상세 열기에 즉각적인 피드백을 제공한다.
- Tab 순서, Enter/Space 활성화, 메뉴/탭의 방향키, 모달 포커스 유지·복귀, Escape 닫기, 명확한 focus ring을 확인한다. 로딩·오류·완료 메시지는 필요한 곳에 접근 가능한 알림으로 연결한다.
- 데이터 조회 중 기존 결과를 유지해야 하는 화면은 덮개나 스피너로 상호작용을 과도하게 막지 않는다. 실제 데이터 갱신 상태를 보여준다.

## 9. 실행 순서와 완료 기준

1. 화면/컴포넌트 목록을 현재 코드와 대조하고 적용 체크리스트를 만든다.
2. 중앙 색상·타이포·간격·모션 토큰과 공통 컴포넌트를 개선한다. 기존 스타일 문서의 앰버·16.5px 기준과 새 버건디·15px 기준이 충돌하면 이번 요청을 우선하고 문서를 정리한다.
3. 로그인, AI 채팅, 데이터 표가 많은 업무 화면을 먼저 적용해 공통 기준을 확인한 뒤 전체 화면과 하위 UI에 확장한다. 예시 3화면을 완성한 것으로 전체 작업을 끝내지 않는다.
4. 권한별 접근·인증·필터·표 스크롤·수치·저장·다운로드·모달을 검증한다. 목 데이터 확인과 실서버 검증을 구분해 보고한다. 실서버는 VPN 및 서버 가용성이 필요하다.
5. `npm run web:mock` 또는 `npm run web`으로 확인하고 필요한 `npm run env:check [대상]`, `npm run check`, 관련 기존 화면 테스트를 수행한다. expo를 직접 실행하지 않는다. 빌드 검증은 요청된 대상에 맞는 프로젝트 스크립트를 사용한다.
6. 메뉴 ID/경로, API 계약, 데이터 마스킹, 보고서 계산이 유지되고 모든 표가 좁은 화면에서도 마지막 열까지 스크롤되는지 확인한다.
7. 각 대상 화면의 적용 상태, 대표 전후 캡처, 토큰 표, 아이콘 규칙, 검증 결과, 확인할 수 없었던 항목을 제출한다. 외부 배포는 별도 요청 없이 진행하지 않는다.

완료 결과에는 실제 수정된 파일과 사용자에게 달라지는 동작을 설명한다. 모든 화면의 본문·폼·표 기본 크기 15px, 일관된 버건디·로즈 포인트, 읽기 쉬운 데이터, 가벼운 상태 피드백을 코드와 화면에서 확인할 수 있어야 한다.
