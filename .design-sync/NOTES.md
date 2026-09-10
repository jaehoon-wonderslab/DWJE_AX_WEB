# design-sync 메모 — 덕우전자 AX 웹 (dwje-ax-web)

저장소는 디자인 시스템 패키지가 아니라 **Expo(React Native for Web) 앱**입니다. dist·.d.ts 가 없고 전부 JSX 라, 아래 방식으로 변환합니다.

- **진입점**: `.design-sync/entry.js` (repo 커밋). 공용 UI(`src/shared/components/ui`) 배럴 + brand + layout 일부(PageHead·PageContainer·Grid·ReportDoc) + d3 차트(웹 구현 직접 import) + 테마 훅. 앱 화면·라우터·API 계층은 넣지 않음. Sidebar·Topbar·MenuHub·AuthCard 는 expo-router·인증 스토어에 묶여 제외.
- **컴포넌트 목록**: .d.ts 가 없어 `componentSrcMap` 에 이름→소스 경로를 전부 나열(자동 발견 불가). 컴포넌트를 추가하면 entry.js 와 componentSrcMap 둘 다 갱신.
- **react-native → react-native-web 별칭**: esbuild 에 alias 가 없어 `.design-sync/tsconfig.json` 의 `paths` 로 해결(`react-native` → `node_modules/react-native-web/dist/index.js`, `react-native-svg` → `lib/module/elements.web.js`(ReactNativeSVG.web.js 는 ./elements 를 상대 import 해 esbuild 가 네이티브 elements.js 를 집어 fabric 모듈까지 끌려옴)). 정확 매칭 규칙은 **파일 경로**여야 함(디렉터리를 주면 esbuild 가 디렉터리를 읽으려다 실패).
- **테마**: Provider 없음. `useTheme()` 이 zustand 스토어(mode 'light' 고정)에서 읽으므로 미리보기에 래퍼 불필요.
- **토큰 CSS**: 컴포넌트는 JS theme 객체를 쓰고 CSS 변수를 읽지 않음. `.design-sync/gen-tokens.mjs` 가 `src/shared/theme/{colors,theme}.js` 에서 `tokens/dwje-tokens.css` 와 `ds-styles.css`(토큰 + ds-global.css 결합, `cssEntry`) 를 생성(커밋). 토큰이나 ds-global.css 를 바꾸면 다시 실행. `tokensGlob` 은 node_modules 패키지(`tokensPkg`) 전용이라 repo 파일에는 못 씀.
- **글꼴**: `cssEntry` 내용은 `_ds_bundle.css` **끝에 append** 되므로 그 안의 `@import` 는 CSS 규칙상 무시됨(첫 동기화에서 CDN 글꼴이 전혀 로드되지 않았음). 해결: `node .design-sync/fetch-fonts.mjs` 가 Pretendard Variable(92 subset)·Inter·JetBrains Mono(54 파일, 약 4.5MB) woff2 를 `.design-sync/fonts/` 에 내려받고 `fonts.css` 를 만들며, `extraFonts` 로 동봉. woff2 는 gitignore — **새 클론에서는 이 스크립트를 먼저 실행**해야 `[FONT_DANGLING]` 이 안 남.
- **전역 CSS**: `app/+html.jsx` 의 GLOBAL_CSS 를 `ds-global.css` 에 복제(body 글꼴·keyframes ax-*). +html.jsx 를 바꾸면 함께 갱신.
- **개발 서버 주의**: 이 워크트리의 Metro 는 파일 변경을 감지하지 않음 — design-sync 와 무관하지만 같은 node_modules 를 쓰므로 `npm ci` 로 재설치하지 않았음(설치본 그대로 사용).
- **렌더 검증**: 캐시된 chromium 1234 에 맞춰 `.ds-sync` 에 `playwright@1.62.1` 설치(저장소 playwright-core 와 같은 버전).
- **렌더 검증 브라우저**: 캐시된 chromium 이 1217 빌드라 playwright 1.62(1234) 와 안 맞음. 내려받지 않고 `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` 으로 시스템 Chrome 을 씀(validate·capture 모두 지원).
- **검증기 오판 방지**: react-native-web 이 `<head>` 에 만드는 `<style id="react-native-stylesheet">` 가 validate 의 `[id^="r"]` 마운트 루트 탐색에 먼저 잡혀 작성된 카드가 전부 `[RENDER] root empty` 로 나옴. `previews/_rnw.ts` 가 그 id 를 `x-rnw-stylesheet`(r 로 시작하지 않게) 로 바꾸며, **모든 previews/<Name>.tsx 는 첫 줄에 `import './_rnw';`** 를 둔다.
- **글꼴 스택**: `"Apple SD Gothic Neo"` 는 macOS 시스템 글꼴 폴백이라 동봉 불가 → `runtimeFontPrefixes` 로 `[FONT_MISSING]` 억제(의도된 것). `Pretendard`(비가변 이름)는 fonts.css 에서 같은 subset 파일을 별칭 선언.

## 미리보기 작성에서 배운 것 (웨이브 1, 2026-09-09)
- **RNW `alignSelf: 'flex-start'` 는 부모가 flex 컨테이너일 때만 동작** — 배지·ConfTag·Tabs 트랙을 일반 block `<div>` 에 두면 가로로 늘어남. 미리보기·디자인 glue 에서는 `<div style={{ display: 'flex' }}>` 로 감쌀 것(conventions 에도 반영).
- **그리드 셀은 320px(minmax)** — 그보다 넓은 셀은 `overrides.<Name>.cardMode = "column"`. `Grid` 는 `useWindowDimensions` 로 1100px 미만이면 접히므로 `viewport: "1200x700"` 필요(viewport 는 채점 키에 들어가 바꾸면 재채점).
- **hover·press·focus·팝오버 열림은 정적 캡처 불가** — Hoverable 은 `hoverStyle` 을 객체로 주면 항상 적용되는 점으로 시뮬레이션. SelectField/DateField 팝오버는 내부 useState 라 닫힌 상태만.
- **스토어 의존**: BlindValue/BlindNote/StatCard(field) 는 `useAuthStore.dataPerms`(기본 `[]` → 항상 비공개) — entry.js 가 `useAuthStore` 를 export 하므로 셀 안 `useEffect` 로 권한을 세팅해 "보이는 값" 상태를 만들 수 있음. DateField 는 `useAppStore.dataRange` 를 읽지만 닫힌 상태 렌더에는 무관.
- `ICON_PATHS` 가 `ui/index.js` 에서 재export 되지 않아 `previews/Icon.tsx` 가 아이콘 이름 59개를 하드코딩 — 아이콘을 추가하면 그 목록과 `docs/Icon.md` 를 손으로 갱신.

## 소스 관찰 (동기화 중 발견 · src 는 수정하지 않음)
- 비활성 표현 부재: TextAreaField/SelectField/DateField 는 `...rest` 도 없어 읽기 전용 표현 불가, `Chip disabled` 는 시각 변화 없음, `IconButton` 에 `disabled` 없음(Button 과 비대칭).
- `Field` hint 가 `fontWeight: '300'`(글자 500/600 규칙의 유일한 예외). `DateField` 값 글꼴만 Inter(`s.num`).
- 간격 모델 충돌: `SelectChip` 자체 margin 6 + `ChipRow gap 6` → 12px. `RadioRow paddingTop 6`, `Filters marginBottom 16` 고정.
- `Drift` 는 항상 `toFixed(1)`(정수 단위 부적합) · 0 을 ▼ 로 표시. `Pagination` SizePicker 선택 판정이 `meta.size` 무시. `STATE_TONE` 띄어쓰기 변형 혼재. `Steps` key 가 title.
- `ReportDoc` prop 이름 `nodeId` vs `Card nativeID`. `Grid` 반응형이 창 폭 기준(본문 패널 폭 아님). `PageContainer` 내용은 왼쪽 정렬.

## Known render warns
- `[RENDER_THIN]`/`[RENDER_BLANK]` 는 **아직 미작성(floor card) 컴포넌트에서만** 나옴 — 작성되면 사라짐. 작성 후에도 남으면 새 문제.
- `[FONT_MISSING] "Apple SD Gothic Neo"` 는 `runtimeFontPrefixes` 로 억제(시스템 폴백 글꼴).
- **소스 수정 1건(2026-09-09, design-sync 중 발견)**: `src/shared/components/charts-d3/RadarChart.jsx` 축 라벨 루프의 `const ly = Math.sin(a) * (R + 18);` 가 커밋 e6453dc 에서 지워져 값이 있는 레이더가 `ReferenceError: ly is not defined` 로 빈 화면(앱의 AI 대시보드 레이더도 동일)이었음 → 한 줄 복구. 그 외 소스는 건드리지 않음.
- `src/shared/components/charts/chartData.js` → `.jsx` 로 이름만 바꿈(JSX 가 든 .js 는 esbuild 기본 로더가 못 읽음; Metro 는 확장자 없는 import 라 영향 없음).

## 미리보기 작성에서 배운 것 (웨이브 2)
- **번들에 `global` 이 없음** → RNW Animated(`TimingAnimation.stop` 이 `global.cancelAnimationFrame` 참조)가 애니메이션 종료·재시작 시 ReferenceError. `.design-sync/global-shim.js` 를 entry.js 첫 import 로 두어 `globalThis.global` 을 정의(Metro 가 주던 전역을 대신). 몇 미리보기(ToastHost·ModalHost·Loading·GlobalApiSpinner)에 남은 `globalThis.global ??= globalThis` 스톱갭은 무해.
- **캡처 하네스는 `Date.now` 를 고정**(playwright clock) → RN Animated 페이드인이 첫 프레임(opacity 0)에 멈춤. 오버레이 미리보기는 고정 시계에서만 16ms 씩 전진하는 Date.now 심을 씀(실제 브라우저에서는 무동작). Animated 로 등장하는 컴포넌트를 새로 작성하면 같은 처리 필요.
- **오버레이(Toast/Modal/Drawer/Spinner)** 는 셀마다 스토어를 건드려 그리드 렌더에서 서로 덮어쓰므로 `cardMode: "single"` + `primaryStory` 필수.
- **Tabulator 표**는 networkidle 캡처에 모두 그려짐(tableBuilt 대기 불필요). 시트 실사용 폭은 약 860px — 그보다 넓은 표(TabulatorTable 열 minWidth 합 1,080)는 `viewport: "1200x700"`.
- **차트**: `useChartSize` 가 부모 폭을 재므로 셀은 고정 폭 div. 가로 스크롤 임계(Line 44px/점 · Bar 40~68px/막대 · Grouped 116px/그룹 · Pareto 58px/항목)보다 넓게. 캔버스 rAF(ConstellationField)도 프레임이 잡힘; 결정적 캡처가 필요하면 `animate={false}`. PageTransition 은 최종 프레임으로 잡힘(fill-mode both).

## 소스 관찰 (웨이브 2 · src 미수정)
- **팔레트 이탈**: `ParetoChart`(#0284c7/#94a3b8/#ea580c/#ef4444), `HeatMap`(Tailwind slate/blue 5단계, `invert` 미사용, 대시보드가 넘기는 `cellWidth` 는 없는 prop) 이 d3Theme 토큰·LIGHT_SERIES 를 쓰지 않음. `RadarChart` 범례 "목표" 가 빨강인데 선은 앰버. `DotPlot` 미달 편차가 앰버(오류색 아님).
- **라벨 포맷**: `LineChart` 는 값 ≥10 을 정수로 반올림해 수율(96.8~98.0) 눈금이 중복. `BarChart` v/v2 나란히 라벨은 3자리까지만 안 겹침. `GroupedBarChart` 최대 막대 라벨이 막대 안으로 눌림(y 상한 ×1.1 권장).
- 굵기 700 예외: `Gauge` 값(26px/700) · `DonutChart` 가운데 합계 · `XlsTable bold`.
- `XlsTable` 머리 주석의 `headerRows`/`rowSpan` 은 미구현. `TabulatorTable` 이 `window._dwje_tabulator` 디버그 전역 노출. `PermMatrix` `Cell` 이 렌더마다 재정의, `footerValue` 필수(기본값 없음). `TabulatorGrid` 는 `columns` 배열 identity 가 바뀌면 표를 재생성(모듈 상수/useMemo 필수). `DonutChart` 는 useChartSize 미사용(160 고정), `key={seg.l}`.
- `LogoLockup` 은 mono 마크 조합 미지원, `LogoMark` gradient id 고정(`dwBowl`/`dwSlash`). `ConstellationField` 는 `palette` 인라인 배열이면 렌더마다 파티클 재생성.
- `openFormModal`/`openConfirmModal` 은 `dwje-ax-web` 에 export 되는 함수 유틸(컴포넌트 목록에는 없음) — 사용법은 `docs/ModalHost.md` 에.

## 재동기화 절차 (요약)
1. 새 클론이면 `node .design-sync/fetch-fonts.mjs`(woff2 내려받기) → `cd .ds-sync && npm i`(esbuild·ts-morph·@types/react·playwright@1.62.1) 또는 스킬의 `cp -r` 로 스크립트 재스테이징.
2. 토큰·전역 CSS 를 바꿨으면 `node .design-sync/gen-tokens.mjs`.
3. `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/entry.js --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`
4. 컴포넌트 추가 = `entry.js` export + `config.json componentSrcMap` + `dtsPropsFor` + `previews/<Name>.tsx`(첫 줄 `import './_rnw';`) + `docs/<Name>.md`(category).

## Re-sync risks (다음 실행이 지켜볼 것)
- **글꼴 woff2 는 gitignore** — fetch-fonts 를 안 돌리면 `[FONT_DANGLING]`/글꼴 미적용. CDN(jsDelivr pretendard v1.3.9, Google Fonts)이 바뀌면 파일명이 달라져 fonts.css 도 재생성됨(→ styleSha 변경, 전체 재검증 가능).
- **`dtsPropsFor` 75건은 손으로 쓴 계약** — 소스의 props 가 바뀌어도 자동으로 따라오지 않음. 컴포넌트 시그니처를 바꾸면 config 의 해당 항목도 고칠 것(가장 잘 썩는 지점).
- **`previews/Icon.tsx` 의 아이콘 이름 59개 하드코딩** — Icon.jsx PATHS 추가 시 수동 갱신.
- **entry.js 가 소스 파일 경로를 직접 참조** — 파일 이동/이름 변경 시 빌드 실패로 바로 드러남(조용히 썩지 않음).
- **`tsconfig.json` 별칭이 node_modules 내부 파일을 가리킴** — react-native-web/react-native-svg 메이저 업그레이드 시 `dist/index.js`, `lib/module/elements.web.js` 경로 확인.
- **tokens/ds-styles.css 는 생성물** — colors.js/theme.js 를 고치고 gen-tokens 를 안 돌리면 디자인 토큰이 앱과 어긋남.
- **검증 브라우저** 는 시스템 Chrome(`DS_CHROMIUM_PATH`) — Chrome 업데이트로 렌더가 미세하게 달라질 수 있음(픽셀 비교는 하지 않음). ConstellationField 는 `Math.random()` 이라 매번 다름.
- **부분 검증**: hover·focus·팝오버 열림·애니메이션 중간 프레임·다크 팔레트(HeatMap)는 캡처하지 않음. BlindNote "전부 허용→렌더 없음" 상태는 미리보기 없음.
- **빌드 가정**: Node 25 · esbuild(.ds-sync) · react 19.2.3 벤더 · `.js` 에 JSX 를 넣지 않는다는 규칙(chartData.jsx 사례).
- 툴바 `proto/` 디렉터리는 design-sync 와 무관한 저장소 루트의 미추적 프로토타입(사용자 작업)이며 동기화 대상 아님.
- **별칭 디렉터리 import**(`@shared/components/ui` 처럼 index.js 를 가리키는 import)는 변환기의 tsconfig-paths 플러그인이 디렉터리 자체를 돌려줘 esbuild 가 "is a directory" 로 실패함. `tsconfig.json` 에 **정확 매칭 별칭을 와일드카드보다 먼저** 두어 index 파일로 직접 매핑(gen 스크립트 아님 — 새 디렉터리 import 가 생기면 한 줄 추가).

## 앱 전체 화면 동기화 (2026-09-09, 2차)
- `DwjeApp`(셸 전체) + `Screen*` 38개 + 인증 3화면을 `.design-sync/screens/index.jsx` 로 노출 — **`node .design-sync/gen-screens.mjs` 가 생성**(메뉴 정의 → 라우트 표·docs·미리보기·config). 메뉴/라우트가 바뀌면 다시 실행(기존 previews 는 보존, docs 는 덮어씀).
- expo-router 는 `.design-sync/shims/expo-router.jsx` 메모리 라우터(Link asChild·Redirect·Slot·useLocalSearchParams 등)로 대체. Slot 은 depth 로 루트→그룹 레이아웃→페이지를 구분. react-native-safe-area-context 도 셤.
- 인증·데이터: `global-shim.js` 가 `process.env.EXPO_PUBLIC_USE_MOCK=true`, `LIVE_AUTH=false`(데모 모드) 를 넣어 `useAuthBootstrap` 이 기본 계정(20140901 시스템·통합관리자)으로 자동 로그인하고, 번들 로드 시에도 스토어에 같은 계정·'*' 권한을 미리 넣음(단독 Screen 컴포넌트용). 모든 API 는 `src/services/mock` 목 응답.
- 목 데이터 수정 1건: `mock/data/system.js` 의 알림 조건·수신 그룹 `channels`/`groups` 가 문자열('메일 · SMS')이라 화면(`(r.channels||[]).map`)이 죽음 → 배열로 바꾸고 `getAlertConditions` 응답에 명세 필드(on·validWindow·dedupMin) 를 보강. 실 API 에서는 원래 배열.
- 미리보기: DwjeApp 은 `single` 1440x900(라우터 상태를 공유하므로 카드 하나에 1개), Screen* 은 `single` 1320x860. 카드 안에서 메뉴를 누르면 실제로 화면이 바뀜.

- **개발 서버 모드 주의(2026-09-10)**: 서브에이전트가 확인용으로 8090 을 `EXPO_PUBLIC_USE_MOCK=true` 로 재시작해 두어 사용자에게 목 데이터(용어 32건)가 보였음. 확인 작업은 **8091** 등 다른 포트를 쓰고, 8090 은 `.env`(실 API) 그대로 둘 것.
