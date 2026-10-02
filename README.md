# 덕우전자 AX — AI 의사결정 지원 계층 (Web)

사내 MES 위에 얹는 **AI 의사결정 지원 계층**의 프론트엔드입니다.
`기능 및 API 명세/ver01` 의 명세를 코드로 반영했으며, **2026-09 기준 운영에 맞춘 결과는
메뉴 29건 · API 244건**입니다(2026-10-02 시스템관리 개선 반영). (명세 원본 36화면/236건에서 실서버 화면 목록에 맞춰 정리한 상태)

- **메뉴 하나 = 라우트 하나 = 소스 파일 하나** (파일 기반 라우팅)
- **MVC 3계층** — Model(데이터) / View(화면) / Controller(상태·동작)
- 공통 UI·차트·레이아웃·유틸은 `src/shared` 로 분리
- **로컬 / 실서버는 명령으로 구분** — 서버 주소는 `scripts/targets.cjs` 한 곳에 있습니다 (§2)

> ⚠ **실서버(`192.168.2.8`)는 VPN 이 활성화되어 있어야만 접근됩니다.**
> VPN 없이 그 주소로 열면 화면은 뜨지만 모든 API 요청이 실패합니다.
> 실서버 대상 명령은 실행할 때마다 이를 상기시키고, 상단바에도 「실서버」 배지가 붙습니다.

---

## 1. 기술 스택

`개발스팩_및_코딩_작성_규칙.md` 3장을 따릅니다.

| 구분 | 기술 | 비고 |
| :--- | :--- | :--- |
| 프론트엔드 | React Native for Web (Expo SDK 57) | 하나의 코드로 웹·앱 동시 지원 |
| 라우팅 | **Expo Router** (파일 기반) | `/dashboard/ai` 처럼 실제 URL. 새 탭·북마크·뒤로가기 동작 |
| 웹 출력 | 정적 렌더링 (`web.output: "static"`) | 빌드 시 **메뉴별 HTML 파일**이 각각 생성 |
| 상태 관리 | Zustand | 전역 스토어 4종 (`src/shared/stores`) |
| API 통신 | Axios 래퍼 + 리포지토리 계층 | 화면은 서비스 함수를 직접 부르지 않음 |
| AI 채팅 | `fetch` + SSE (`llmStream.js`) | axios 는 본문을 조각으로 못 읽어 점진 표시가 안 됨 |
| 차트 | react-native-svg 인라인 SVG + d3 | `charts/` SVG · `charts-d3/` 대시보드·품질(웹 전용) |
| 표 | Tabulator 6 (`TabulatorTable` · `TabulatorGrid`) | 가로 스크롤 기본 제공 (AGENTS.md) |
| AI | 사내 LLM `dwje-ax` | 스트리밍 · 세션 이력 · 질의 이력 저장 |

---

## 2. 실행 — 대상(target) 3종

로컬과 실서버는 **명령으로 고릅니다.** `.env` 를 손댈 필요가 없습니다.

```bash
npm install          # 최초 1번
cp .env.example .env # 최초 1번
```

| 명령 | 붙는 곳 | VPN | 하는 일 |
| :--- | :--- | :-: | :--- |
| `npm run web` | 로컬 API `localhost:8080` | — | 개발 서버 → `http://localhost:8081` |
| `npm run web:mock` | 백엔드 없음 (목 데이터) | — | 화면만 보기 |
| `npm run web:server` | **실서버 API `192.168.2.8:8080`** | **필요** | 실서버 DB 로 개발 (디버깅) |
| `npm run build:web` | **실서버 `:8080`** | **필요** | 배포용 빌드 → `dist/` + `dwje-web-deploy.zip` |
| `npm run build:web:local` | 로컬 `:8080` | — | 로컬에서 결과물 확인 |
| `npm run check` | — | — | 구문 · 서비스 참조 · 목 · 라우트 · 화면 열 검사 |

> ### ⚠ 두 포트의 역할이 다릅니다 — 8081(WEB) · 8080(API)
>
> ```
>   사람이 여는 주소      http://192.168.2.8:8081   ← WEB  (start.sh · serve.cjs 가 정적 번들 서빙)
>   번들이 호출하는 주소  http://192.168.2.8:8080   ← API  (Spring Boot)
> ```
> 화면은 **8081** 에서 열렸는데 API 주소는 **8080** 입니다 — 교차 출처라서 API CORS 가 필요합니다.
> API 는 `http://192.168.2.8:*` 를 허용하므로 정상 동작합니다
> (`../API/src/main/kotlin/com/dwje/api/config/CorsConfig.kt`).
> WEB 포트 기본값 8081 은 `start.sh` · `stop.sh` · `status.sh` · `serve.cjs` 에서 정합니다.

> ### ⚠ 192.168.2.8 은 VPN 이 켜져 있어야만 닿습니다
>
> 사내망 주소입니다. VPN 이 꺼져 있으면 **브라우저는 열리지만 모든 요청이 실패**합니다 —
> 화면이 조용히 비어 원인을 알기 어렵습니다.
> 실서버 대상 명령은 실행할 때마다 VPN 필요를 상기시킵니다.
> 앱이 뜨면 **브라우저 콘솔 첫 줄에 `[접속 대상]`** 이 찍혀 붙어 있는 서버를 알려 줍니다
> (`shared/utils/logApiTarget.js`). 화면을 더럽히지 않으면서 로컬 착각을 막습니다.

대상 정의는 **`scripts/targets.cjs` 한 곳**에 있습니다. 목록과 현재 상태를 보려면:

```bash
npm run env:check -- list     # 대상 3종 설명
npm run env:check             # 실서버 API(:8080) 접속 확인 (5초 타임아웃)
npm run env:check -- local    # 로컬 API(:8080) 접속 확인
```

### 실서버에서 직접 디버깅

```bash
npm run env:check -- server   # ① VPN 과 API 생존 먼저 확인
npm run web:server            # ② 개발 서버(HMR) → http://localhost:8081
```

`web:server` 는 소스 수정·저장마다 곧바로 반영하면서 **API 만 실서버(8080)** 를 봅니다.
재빌드 없이 실서버 데이터를 붙여 화면을 고칠 수 있습니다.

### 어느 서버에 붙었는지 확인하기

| 방법 | 쓰임 |
| :--- | :--- |
| 터미널 시작Banner | `npm run web*` 실행 직후 대상·API 주소·VPN 필요 여부 |
| **브라우저 콘솔** | 앱이 뜨면 `[접속 대상]` — 주소·모드·대상 이름, 실서버면 운영 DB 경고까지 |
| `npm run env:check` | 터미널에서 API 생존 확인 (5초 타임아웃) |

> 실서버 대상은 **운영 DB 를 직접 읽고 씁니다.** 등록·수정·삭제가 그대로 반영되므로
> 되돌릴 수 없는 작업은 실서버에서 하지 마십시오. 화면 시연은 실서버,
> 개발·디버깅은 로컬이 안전합니다.

### 대상을 바꿀 때 Metro 캐시를 비웁니다 — 이유가 있습니다

번호들에 박히는 API 주소는 **빌드·실행 시점에 정해집니다.** 그런데 Metro 의 변환 캐시 키에는
`process.env` 값이 들어가지 않습니다(`metro-transform-worker/src/index.js` 의 `getCacheKey` —
파일 목록 · 설정 · babel 키만 해시). 그래서 대상을 `local` → `server` 로 바꿔도
캐시가 살아 있으면 **옛 API 주소로 빌드**됩니다.

화면은 열렸는데 실서버(또는 로컬)가 아닌 엉뚱한 곳을 보고 있는, 가장 찾기 어려운 오동작입니다.
그래서 `npm run web*` 는 대상을 고를 때마다 기본적으로 `--clear` 를 붙입니다.
같은 대상을 계속 이어 갈 때만 `SKIP_CLEAR=1` 로 끄십시오 — 대상이 달라졌는데 이 플래그가
 켜져 있으면 스크립트가 경고합니다.

### IntelliJ 에서 실행할 때

`npm run <script>` 를 그대로 쓰십시오. Run 설정 3종이 저장소에 들어 있습니다
(`.idea/runConfigurations/` — 개인 `.idea` 설정은 git 에서 제외, 실행 설정만 공유).

| Run 설정 | 하는 일 |
| :--- | :--- |
| `WEB - dev (로컬 API)` | `npm run web` — 로컬 API 로 개발 |
| `WEB - dev (실서버 API · VPN)` | `npm run web:server` — 실서버 API 로 개발 (VPN 필요) |
| `WEB - build (실서버 배포본)` | `npm run build:web` — 배포 번들 생성 |

> ⚠ IntelliJ 에서 `npx expo start` 를 **직접** 실행하면 대상 스크립트를 거치지 않으므로
> `.env` 값이 그대로 쓰입니다. `.env` 는 기본값(로컬)만 두고 대상은 npm 스크립트로 고르십시오.

### 빌드는 `.env` 를 건드리지 않습니다

`npm run build:web` 는 `scripts/targets.cjs` 의 대상 값을 **빌드 프로세스 환경변수로만** 주입합니다
(`@expo/env` 는 시스템 환경변수를 `.env` 보다 먼저 씁니다).
이전 스크립트는 빌드 중 `.env` 를 고쳤다 되돌렸는데, 그 사이 `Ctrl-C` 로 끊기면
배포 주소가 그대로 남아 **로컬 개발이 실서버를 보게 되는** 문제가 났습니다. 이제 그런 일이 없습니다.

### 환경 변수 (`.env`)

`.env` 는 위 대상 명령이 덮어쓰므로 **기본값만 남겨 두십시오.** 직접 `expo` 를 띄울 때만 봅니다.

| 키 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` | API 주소. 대상 명령이 실행할 때마다 덮어씁니다 |
| `EXPO_PUBLIC_USE_MOCK` | `false` | `false` = 실 서버 호출 (기본) / `true` = 명세 기반 목 응답 |
| `EXPO_PUBLIC_MOCK_DELAY` | `180` | 목 응답 지연 (ms) |
| `EXPO_PUBLIC_LIVE_AUTH` | `true` | 목 모드에서도 인증 API 만 실 서버로 (`false` 면 인증도 목 + 자동 로그인) |
| `EXPO_PUBLIC_API_TIMEOUT` | `45000` | 요청 제한 시간 (ms). 대용량 집계 조회가 있어 넉넉히 둡니다 |
| `EXPO_PUBLIC_DEMO_AUTOLOGIN` | `true` | 목 인증에서 로그인 화면을 건너뛰고 자동 로그인 |
| `EXPO_PUBLIC_LLM_API_URL` | (local) `http://localhost:8787` | 로컬 gateway proxy 주소. 실서버 대상은 비워 둡니다 |

> **백엔드 연동 전환** — `EXPO_PUBLIC_USE_MOCK=false` 가 기본값입니다.
> 화면·컨트롤러·리포지토리 코드는 고치지 않습니다.

`build:web`(server)는 API `http://192.168.2.8:8080` 을 박은 번들을 만듭니다.
배포된 화면이 `http://192.168.2.8:8081` 에서 열린다는 사실은 번들에 영향이 없습니다 —
**8080(API)은 빌드 시점에 이미 정해져 있으므로**, 화면 포트와 API 포트를 혼동하지 마십시오 (§2).

### 로컬 LLM 게이트웨이 확인

웹앱의 LLM 요청만 로컬 프록시를 거쳐 원격 게이트웨이에 전달합니다.
`npm run web`(local)가 `EXPO_PUBLIC_LLM_API_URL=http://localhost:8787` 을 자동으로 물립니다.
별도 터미널에서 프록시를 먼저 띄우십시오.

```bash
# DWJE_GATEWAY_API_KEY는 비밀 저장소/실행 환경에서 프로세스에 주입
npm run dev:gateway-proxy
npm run web
```

키는 프록시 프로세스 환경변수로만 전달하며 `.env`, `EXPO_PUBLIC_*`, 브라우저 입력란에 저장하지 않습니다.
프록시 UI는 `http://localhost:8787`에서 헬스·모델 목록·채팅을 확인할 수 있습니다.

### 실 API 연동 상태

**업무 API 전 도메인이 실 DB 에 연결되어 있습니다** (`EXPO_PUBLIC_USE_MOCK=false`).
카탈로그 209건이 서버 구현과 1:1로 대조되어 누락 0건임을 확인했습니다
(`/v3/api-docs` 대조 · 2026-09-01, 카탈로그 정리 이후 재확인).
2026-09-30 에 추가한 그룹웨어 부서 매핑(SY-17) 6건은 **서버 미구현**입니다 — 요청서 `docs/requests/REQ_20260930_gw_dept_map.md`.

목 레이어는 지운 게 아니라 남겨 두었습니다. API 서버 없이 화면만 볼 때는
`npm run web:mock` — 화면·컨트롤러·리포지토리 코드는 그대로 두고 목 응답만 씁니다.
`live: true` 로 표시된 23건은 목 모드에서도 실 서버로 나갑니다
(판정은 `src/services/api/client.js` 의 `shouldMock()` 한 곳).

```bash
# API 서버 (별도 터미널) — 로컬
cd "../API"
./src/main/resources/db/local/setup_local_db.sh          # DB 준비 (최초 1회, Docker 필요)
./gradlew bootRun --args='--spring.profiles.active=local'

# 그다음 이 웹에서
npm run web          # 로컬 API 를 보고 개발
```

> 실서버 API 로 개발하려면 로컬 API 서버를 띄우지 말고 `npm run web:server` 를 쓰십시오.
> 로컬 API 가 떠 있으면 `npm run web` 가 그쪽을 봅니다.

로컬은 SMTP 없이 **인증 코드를 서버 로그에 출력**합니다 (`인증 코드 : 382831  (유효 5분)`).
시드 계정은 `10000`~`10005`, 비밀번호는 모두 `Dwje!2026`, 이메일은 `사번@dwje.co.kr` 입니다.

백엔드 없이 화면만 보려면 `npm run web:mock` 을 쓰세요.
로그인 화면을 건너뛰고 기본 계정으로 자동 로그인합니다.

---

## 3. 폴더 구조

```text
app/                                  라우트 (Expo Router) — 파일 = URL = 메뉴
├── _layout.jsx                       루트: 목 등록 · 저장된 세션 복원 · 오버레이
├── index.jsx                         / → 기본 화면(덕반장 AI) 리다이렉트
├── +html.jsx                         정적 출력용 HTML 뼈대
├── +not-found.jsx                    404
├── (auth)/                           사이드바 없는 인증 화면 그룹 (비로그인 전용)
│   ├── _layout.jsx                   로그인 상태면 기본 화면으로 되돌림
│   ├── login.jsx                     /login
│   ├── signup.jsx                    /signup            (3단계 + 승인 대기 안내)
│   └── forgot-password.jsx           /forgot-password   (3단계 + 완료 안내)
└── (main)/                           사이드바 + 상단바가 붙는 레이아웃 그룹
    ├── _layout.jsx                   3분할 레이아웃 + 로그인 여부 · 메뉴 접근 권한 판정
    ├── ai/chat.jsx                   /ai/chat                    덕반장 AI (기본 화면)
    ├── dashboard/{ai,process}.jsx    AI 통합 · 공정 및 제품
    ├── production/{monitor,result}.jsx  모니터링 · 실적 집계·조회
    ├── production/daily-report/{index,history}.jsx
    ├── quality/{defect,aoi}.jsx
    ├── alert/list.jsx
    ├── report/{press-morning,plating-morning,ship-plan,
    │           yield-by-model,lrr-by-customer,scrap/index}.jsx
    ├── menu/{dashboard,operation,report,alert,system,production,quality}.jsx
    │                                  그룹 허브 (사이드바 한 줄 → 드롭다운)
    └── system/{account,menu-perm,data-perm,alert-condition,recipient,
                glossary,chat-history,audit-log,download-log,upload-doc,
                sync-history}.jsx

src/
├── domains/<도메인>/                  업무 도메인별 MVC (auth · ai · dashboard · production
│   ├── model/                        │           quality · alert · report · system · common)
│   │   ├── *Repository.js            [M] API 접근 — 화면 단위로 필요한 API 묶음을 제공
│   │   └── *Model.js                 [M] 도메인 계산 규칙 (판정·환산). React 의존 없음
│   ├── controller/use*Controller.js  [C] 화면 상태 · 데이터 로딩 · 도메인 동작 (JSX 없음)
│   └── view/*View.jsx                [V] 렌더링 · 폼/모달 구성 · 컨트롤러 동작 호출
│
├── shared/                           공통 (도메인에 종속되지 않는 것만)
│   ├── components/ui/                버튼·카드·표(Tabulator)·모달·폼·배지·권한매트릭스
│   ├── components/charts/            react-native-svg 차트 (선버스트 · 게이지 · 히트맵 등)
│   ├── components/charts-d3/         d3 차트 (대시보드·품질 — 웹 전용)
│   ├── components/brand/             로고 · 진입 전환 · AI 입력창
│   ├── components/layout/            사이드바·상단바·그리드·페이지 컨테이너·보고서 틀
│   ├── constants/                    메뉴·권한·계정·조직·보고서 열 정의
│   ├── hooks/                        useAsync(조회) · useAppNavigation(화면 이동)
│   ├── navigation/routes.js          화면 ID ↔ URL 경로 매핑
│   ├── stores/                       Zustand — auth · ui · theme · app
│   ├── theme/                        컬러 토큰 · 테마 · 공통 StyleSheet
│   └── utils/                        포맷 · 마스킹 · 내려받기 · 인쇄
│
└── services/                         원격 데이터 소스 (Model 계층이 사용)
    ├── api/client.js                 Axios 클라이언트 · 목 스위치 · 토큰 갱신
    ├── api/endpoints.js              API 카탈로그 215건
    ├── api/llmStream.js              사내 LLM 스트리밍 (fetch · SSE)
    ├── api/request.js                unwrap(조회) · command(등록·수정) 헬퍼
    ├── api/*Service.js               도메인별 서비스 함수 215개
    ├── mock/                         목 핸들러 + 목 데이터 (실 서버 전환 시 불필요)
    └── setup.js                      목 등록 side-effect 모듈

scripts/
├── targets.cjs                       ★ 실행 대상(local·mock·server) 정의 — 서버 주소의 유일한 출처
├── dev-target.cjs                    대상을 골라 개발 서버 실행 (npm run web) — 기본 8081
├── build-deploy.cjs                  대상을 골라 배포 빌드 (npm run build:web*)
├── check-target.cjs                  대상 접속 확인 + VPN 안내 (npm run env:check)
├── local-gateway-proxy.cjs           로컬 LLM gateway 프록시 (비공개 키를 프로세스 안에만 둠)
├── prepare-deploy.cjs                dist/ 에 배포 스크립트 배치 + zip 생성
├── check-*.cjs / build-screen-columns.cjs   정적 검사 5종
```

### 경로 별칭

상대경로(`../../../`) 대신 별칭을 씁니다. (`jsconfig.json`)

| 별칭 | 실제 경로 |
| :--- | :--- |
| `@domains/*` | `src/domains/*` |
| `@shared/*` | `src/shared/*` |
| `@services/*` | `src/services/*` |

---

## 4. MVC 계층 규칙

새 화면을 만들 때 아래 역할 구분을 지킵니다.

| 계층 | 위치 | 하는 일 | 하지 않는 일 |
| :--- | :--- | :--- | :--- |
| **Model** | `domains/*/model/` | API 호출, 응답 정규화, 도메인 계산 | React 훅·JSX 사용 |
| **Controller** | `domains/*/controller/` | 화면 상태, 데이터 로딩, 도메인 동작 함수 | **JSX 작성**, 모달·토스트 조립 |
| **View** | `domains/*/view/` | 렌더링, 폼·모달 구성, 컨트롤러 동작 호출 | API 직접 호출, 비즈니스 계산 |
| **Route** | `app/(main)/**` | MVC 결선 + 페이지 컨테이너 선택 | 그 외 모든 것 |

라우트 파일은 항상 이 모양입니다.

```jsx
// app/(main)/dashboard/ai.jsx
import PageContainer from '@shared/components/layout/PageContainer';
import { useAiDashboardController } from '@domains/dashboard/controller/useAiDashboardController';
import AiDashboardView from '@domains/dashboard/view/AiDashboardView';

export default function AiDashboardPage() {
  const controller = useAiDashboardController();
  return (
    <PageContainer>
      <AiDashboardView {...controller} />
    </PageContainer>
  );
}
```

### 데이터 흐름

```text
View  ──(사용자 조작)──▶  Controller  ──▶  Repository(Model)  ──▶  Service  ──▶  API / Mock
  ▲                          │
  └────(props 로 값 전달)──────┘
```

```jsx
// [Model] 화면이 필요로 하는 API 묶음
export function loadAiDashboard(date) {
  return unwrapAll({
    summary: dashboardService.getDashboardAiSummary({ date }),
    trend:   dashboardService.getDashboardAiDefectTrend({ date, interval: '2h' }),
  });
}

// [Controller] 상태 + 로딩 + 동작
const { data, loading, reload } = useAsync(() => loadAiDashboard(baseDate), [baseDate]);

// [View] 받은 값만 그림
export default function AiDashboardView({ loading, summary, trend, refresh }) { ... }
```

---

## 5. 새 메뉴 추가 절차

1. `src/shared/constants/menu.js` 의 해당 그룹 `items` 에 `{ id, name, path, description }` 추가
   (메뉴에 못 띄우는 하위 화면은 `EXTRA_PAGES` 에 넣습니다)
2. `src/domains/<도메인>/model/` 에 리포지토리 함수 추가
3. `src/domains/<도메인>/controller/use<화면>Controller.js` 작성
4. `src/domains/<도메인>/view/<화면>View.jsx` 작성
5. `app/(main)/<path>.jsx` 라우트 파일 작성
6. **DB 에 화면 행을 넣습니다** — `ax.tb_sys_menu`. 부서 권한은
   [시스템관리 > 메뉴 접근 권한] 화면에서 줍니다(`ax.tb_sys_dept_menu_perm`).
   화면 진입 판정은 `GET /auth/me` 의 `menuPerms` 를 씁니다 — DB 에 없으면 URL 을 직접 쳐도 막힙니다.
7. 목 모드도 쓰려면 `src/shared/constants/dataFields.js` 의 `MENU_ACCESS_DEFAULT` 에 추가
8. `npm run check:routes` 로 메뉴 ↔ 라우트 1:1 확인, `npm run check` 전체 통과

> **화면 ID 는 바꾸지 않습니다.** API 명세·DB `tb_sys_menu` 과 같은 값이라야 합니다.
> 설계를 바꿔도 ID 를 새로 만들지 마십시오.

---

## 6. 화면 · API 매핑

메뉴 29건 = 라우트 29건 (`npm run check:routes` 로 항상 대조).
API 카탈로그는 `src/services/api/endpoints.js` 의 `domain` 값 기준 244건입니다.

| 구분 | 경로 | 화면 ID | API |
| :--- | :--- | :--- | ---: |
| AI 어시스턴트 | `/ai/chat` | ai-chat | 10 |
| 대시보드 | `/dashboard/ai` · `/dashboard/process` | dash-ai / dash-proc | 45 |
| 생산 · 품질 | `/production/monitor` · `/production/result` · `/production/daily-report` · `/production/daily-report/history` · `/quality/defect` · `/quality/aoi` | prod-monitor / prod-result / prod-daily / daily-history / qc-defect / qc-aoi | 33 |
| 보고서 | `/report/press-morning` · `/report/plating-morning` · `/report/ship-plan` · `/report/yield-by-model` · `/report/lrr-by-customer` · `/report/scrap` | rpt-* | 9 |
| 이상 알림 | `/alert/list` | alert-list | 5 |
| 시스템관리 | `/system/*` 11종 | sys-* | **115** |
| 자연어 질의 이력 | `/history/chat` | chat-history | (시스템관리에 포함) |
| 용어 사전 | `/glossary/view` | gloss-view | 2 |
| 인증·공통 | (화면 없음) | — | 25 |
| **합계** | **메뉴 29건** | | **244** |

> 건수는 `endpoints.js` 의 `domain` 값으로 셉니다(생산 16 + 품질 17 = 33). 인증·공통 25건은 로그인·회원가입·비밀번호 찾기·잠금 해제·비밀번호 변경 외 공통 API 를 포함합니다.
> 화면에서 쓰지 않는 API (MES AOI 불량·즐겨찾기·보고서 상태 등) 는 2026-09-23 에 정리했습니다.

### 6-1. 제거된 화면

다음 화면은 2026-09 에 실서버 화면 목록과 맞춰 정리했습니다. 라우트·메뉴·문서에서 모두 뺐습니다.

| 제거된 화면 | 사유 |
| :--- | :--- |
| `/dashboard/kpi` (성과지표 대시보드) | 대시보드 2화면으로 통합 |
| `/production/downtime` (비가동 관리) | 대시보드·생산 모니터링으로 대체 |
| `/quality/report` · `/quality/report-forms` | 보고서 정리와 중복 |
| `/report/scrap/new` (폐기 위저드) | `/report/scrap` 안으로 통합 |
| `/system/product-rank` · `model-config` · `model-version` · `agent` · `metric-standard` | AI 운영 화면 일괄 정리 (2026-09-13) |
| `/system/chat-history` 는 유지 | 자연어 질의 이력으로 사용 중 |

### 6-2. 그룹 허브 화면

사이드바는 그룹당 한 줄(또는 접힘 레일)만 그리고, 하위 화면은 허브 화면의 드롭다운에서 고릅니다.
`/menu/{dashboard,operation,report,alert,system}` — 옛 `/menu/production` · `/menu/quality` 는 새 허브로 리다이렉트합니다.
이상 알림 그룹은 `hidden: true` — 상단 종(`AlertBell.jsx`)으로 통합했습니다.

### 6-3. 배포 포트 — WEB 8081 · API 8080

| | 주소 | 무엇이 serve 하나 | 기본값出处 |
| :--- | :--- | :--- | :--- |
| **WEB** | `http://192.168.2.8:8081` | 정적 번들 (HTML/JS/CSS) | `start.sh` · `stop.sh` · `status.sh` · `serve.cjs` 의 `PORT` |
| **API** | `http://192.168.2.8:8080` | 업무 API + `/api/ai/chat` SSE | 번들 빌드 시 `EXPO_PUBLIC_API_URL` 로 주입 |

**교차 출처라서 CORS 가 걸립니다** — 화면은 8081 에서 열렸는데 API 는 8080 입니다.
API 쪽 `CorsConfig.kt` 가 `http://192.168.2.8:*` 를 허용하므로 정상입니다.
WEB 포트를 바꾸면(`--port=`) 허용 목록에 없는 출처가 될 수 있으니, 바꾸려면 API CORS 를 같이 고치십시오.

> Nginx(`nginx/dwje-ax.conf`) 설정은 **선택**입니다. `:80` 에서 정적 파일 + `/api/` 프록시 +
> `/api/ai/chat` 무버퍼링을 함께 처리하는 구성으로, 필요할 때 씁니다.
> 현재 운영은 `start.sh` + `serve.cjs` 로 8081 에서 직접 서빙하는 형태입니다.

## 7. 권한 모델 (2계층)

접근 권한은 계정이 아니라 **부서** 에 부여하고, 계정은 소속 부서의 권한을 상속합니다.

1. **메뉴 접근 권한** (부서 × 화면) — 사이드바 노출과 화면 진입을 결정합니다.
   `app/(main)/_layout.jsx` 가 본문 렌더 전에 판정하고, 권한이 없으면 기본 화면으로 되돌립니다.
   **URL 을 직접 입력해도 차단됩니다.**
2. **데이터 접근 권한** (부서 × 데이터 항목 7종) — `qty · yield · price · customer · plan · mold · worker`.
   허용되지 않은 항목은 화면·보고서·인쇄물·CSV 전 구간에서 `비공개` 로 표시됩니다.

```jsx
<BlindValue field="price" value="48,320,000원" />
```

---

## 8. 인증 (로그인 · 회원가입 · 비밀번호 찾기)

명세는 `../API/docs/AUTH_API_FOR_WEB.md` 입니다. 세 화면 모두 `src/domains/auth` 안에서 MVC 로 나뉩니다.

| 화면 | 경로 | 단계 |
| :--- | :--- | :--- |
| 로그인 | `/login` | 사번·비밀번호 → 토큰 저장 → `GET /auth/me` 로 권한 로딩 |
| 회원가입 | `/signup` | ① 기본 정보(사번 중복 확인·부서) → ② 이메일 인증 → ③ 비밀번호 → ④ 승인 대기 안내 |
| 비밀번호 찾기 | `/forgot-password` | ① 본인 확인 → ② 이메일 인증 → ③ 새 비밀번호 → ④ 완료 |
| 가입 승인 | `/system/account` | 전산팀이 승인해야 `PENDING` → `ACTIVE` 로 바뀌어 로그인됩니다 |

②단계는 두 화면이 같은 컨트롤러(`useEmailVerification`)와 같은 뷰(`EmailCodeFields`)를 씁니다.
발송 방식만 다르므로 `sender` 로 주입합니다 — 가입은 `/auth/email/send-code`, 재설정은 `/auth/password/forgot`.

### 지켜야 하는 규칙

| 규칙 | 구현 위치 |
| :--- | :--- |
| 실패 메시지는 서버 문구 그대로 (사번 없음 ≡ 비밀번호 불일치 — 계정 열거 방지) | `LoginView` — 화면에서 가공하지 않음 |
| `error.field` 가 있으면 그 입력란 아래, 없으면 폼 상단 | `model/authError.js` `toFormError()` → `<Field error>` / `<FormAlert>` |
| 비밀번호 찾기 1단계는 계정이 없어도 성공 응답 → 언제나 다음 단계로 | `usePasswordResetController.requestCode()` |
| 이메일은 서버가 마스킹해서 보냄 (`ho**@dwje.co.kr`). 원본을 다시 표시하지 않음 | `EmailCodeFields` 는 `sentInfo.email` 만 출력 |
| 재발송 버튼은 `resendAvailableInSec`(60초) 동안 비활성 | `useEmailVerification` 의 `resendIn` 카운트다운 |
| 비밀번호 정책 (8자 · 공백 불가 · 2종 이상 · 사번 불가) | `model/passwordPolicy.js` — 서버 `validatePolicy` 와 같은 규칙 |

### verificationToken 을 다루는 방식

`verificationToken` 은 **가입/재설정에 성공한 시점에** 소모되는 10분짜리 1회용입니다.
서버의 `signup` · `resetPassword` 는 `@Transactional` 이라
**입력값 오류로 실패하면 토큰 소모까지 함께 롤백**됩니다. (AUTH_API_FOR_WEB.md 6-2 · 양쪽 세션에서 실측 확인)

그래서 실패했다고 무조건 인증 단계로 되돌리지 않습니다.

- 토큰 만료·재사용 (`E-RULE-001` + 인증/토큰 문구) → ②단계로 되돌리고 코드를 다시 받게 합니다
- 사번 중복·비밀번호 정책 위반 같은 입력값 오류 → 그 자리에 오류만 표시하고 같은 토큰으로 재요청합니다

판정은 `model/authError.js` 의 `needsReverify()` 한 곳입니다.

### 가입 승인 (SY-01 계정 관리)

회원가입은 `PENDING` 으로 쌓이고 **승인 전에는 로그인할 수 없습니다.**
계정 관리 화면 맨 위에 「가입 승인 대기」 카드가 뜨고, 대기 건이 없으면 카드째 사라집니다.

- **승인** — `POST /system/users/{empNo}/approve` (`approve:true`) → `ACTIVE`.
  신청한 부서의 메뉴·데이터 접근 권한이 그대로 적용됩니다.
- **반려** — `approve:false` + 사유 → `SUSPENDED`. 사유는 감사 로그에 남습니다.

부서를 바꿔서 승인해야 하면 먼저 승인한 뒤 계정 표에서 「부서 이동」을 쓰세요.

### 세션 유지

`accessToken` · `refreshToken` · 표시용 사용자 정보만 `localStorage` 에 둡니다 (`shared/utils/authStorage.js`).
권한(`menuPerms` · `dataPerms`)은 저장하지 않고 앱이 뜰 때마다 `GET /auth/me` 로 다시 받습니다.
401 이 오면 `client.js` 인터셉터가 `/auth/refresh` 로 한 번 갱신하고, 실패하면 로그아웃 → `/login` 입니다.

> 현행은 **사내망 한정**입니다. 사내망 밖에 노출하려면 `authStorage.js` 를 httpOnly 쿠키 방식으로 바꾸십시오 (§11).

---

## 8.1 AI 채팅 (덕반장 AI)

`/ai/chat` 은 로그인 직후 뜨는 기본 화면입니다 (`HOME_SCREEN_ID = 'ai-chat'`).

| 구성 | 위치 | 하는 일 |
| :--- | :--- | :--- |
| 스트리밍 | `services/api/llmStream.js` | `fetch` + SSE. axios 는 본문을 조각으로 못 읽습니다 |
| 세션 | `domains/ai/controller/useChatController.js` | 대화 세션 · 중단 · 후속 질의 |
| 브리핑 | `domains/ai/model/homeBriefingModel.js` | 빈 화면 인사말 + AI 브리핑 문장 (하드코딩 아님 — API 결과로 만듭니다) |
| 이력 | `domains/system/view/ChatHistoryView.jsx` | 자연어 질의 이력 |

요청 경로는 `{API 주소}/api/ai/chat` 하나입니다. `EXPO_PUBLIC_LLM_API_URL` 이 있으면
로컬 gateway proxy 를 거칩니다(개발용). **`role: "system"` 은 보내지 않습니다** —
모델에 내장된 덕우전자 지시문을 통째로 대체하기 때문입니다. 근거는 `context` 로 보냅니다.

AI 스트리밍 경로는 배포와 동일하게 API `:8080` 의 `/api/ai/chat` 입니다.
실서버에서 확인하려면 `npm run web:server` 로 붙으십시오 — 프록시 없이 직결이라
조각이 도착하는 즉시 표시됩니다(지연이 있다면 LLM 응답 시간이 아니라 LLM 서버 쪽 대기열을 보십시오).

---

## 9. 실 DB 연동에서 지킬 것

목 데이터에서는 드러나지 않다가 실 DB 를 붙이면서 나온 규칙들입니다.
새 화면을 만들 때 같은 함정을 반복하지 않으려면 아래를 따르세요.

### 9-1. 기준일을 `오늘` 로 두지 말 것

MES 실적은 당일 마감 전에는 없습니다. 기준일을 오늘로 잡으면 화면이 전부 0 으로 보입니다.
앱은 업무 화면에 들어가기 전에 `GET /api/v1/common/data-range` 를 **한 번** 부르고
결과를 `useAppStore.dataRange` 에 넣습니다. (`domains/common/controller/useDataRangeBootstrap`)

```js
import { lastDataDate, recentRange, currentMonthRange } from '@shared/stores/useAppStore';

const [date, setDate] = useState(lastDataDate());            // 마지막 실적일
const [{ from, to }] = useState(recentRange(7));             // 최근 7일
const [range] = useState(currentMonthRange());               // 이번 달 1일 ~ 마지막 실적일
```

`<DateField>` 는 별도 설정 없이 선택 범위를 `fromDate ~ toDate` 로 제한합니다.
범위 밖을 열어야 하면 `min={null}` · `max={null}` 을 명시하세요.

### 9-2. 화면 표시값을 그대로 보내지 말 것

선택 목록에는 `'전체'`, `'일별'`, `'2026년 7월'` 처럼 사람이 읽는 말이 들어 있고
API 는 코드값을 받습니다. 목 핸들러는 한글을 받아 줬지만 실 서버는 400 을 냅니다.

- `'전체'` 같은 **조건 없음** 값은 `client.js` 의 `dropEmptyParams()` 가 요청에서 통째로 뺍니다.
- 코드 변환이 필요한 값은 **리포지토리에서** `domains/common/model/paramModel` 로 바꿉니다.
  (`periodUnit` · `amountUnit` · `driftSide` · `driftKind` · `yearOf` · `yearMonthOf`)

화면은 계속 읽기 좋은 말을 쓰고, 변환은 Model 계층 한 곳에서만 합니다.

### 9-3. 계산값은 비어 올 수 있다

불량률 · 수율 · 가동률은 저장된 칼럼이 아니라 계산값입니다.
서버가 계산해 주면 그 값을 쓰고, 비어 있으면 같은 응답의 원천 수량으로 채웁니다.

```js
import { fillRates, fillRatesAll } from '@domains/common/model/metricModel';
return { ...data, items: fillRatesAll(data.items) };
```

원천 수량조차 없으면 `null` 로 둡니다. 0 으로 채우면 실제 측정값과 구분되지 않습니다.
차트는 `charts/chartData` 의 `num` · `withValues` 로 `null` 을 걸러 내고,
그릴 값이 하나도 없으면 `<ChartEmpty />`("데이터 없음")를 그립니다.

> 설비 가동률은 지표 측정값(`ax.tb_met_metric_value`)과 비가동 실적이 모두 0행이라
> 현재 계산 원천 자체가 없습니다. 관련 위젯은 "데이터 없음" 으로 표시됩니다.

### 9-4. 빈 배열은 오류가 아니다

용어 사전 · 알림 조건 · 수신자 · 보고서 양식처럼 **사용자가 화면에서 만드는 데이터**는
목록 API 가 `{"items": []}` 를 정상 반환합니다. 빈 상태 UI 로 그리세요.

조회 결과가 없을 때 `if (loading || !data) return <Loading />` 로 두면
로딩 화면에서 영원히 멈춥니다. `loading` 과 `데이터 없음` 을 반드시 나눠 판정하세요.

```jsx
if (loading) return <Loading />;
if (!data) return <EmptyState text="조회 조건에 해당하는 자료가 없습니다." />;
```

### 9-5. 세션 만료 · 오류별 처리

`401` 만 토큰 만료·미인증입니다. 화면 인터셉터도 401 에서만 갱신·로그아웃을 탑니다.

| 응답 | 처리 |
| :--- | :--- |
| `401` | 토큰 갱신 1회 → 실패하면 로그아웃 → `/login` |
| `403` · `E-AUTH-002` | 메뉴 접근 권한 없음 → 화면 내 안내 (로그아웃 금지) |
| `404` · `E-NOTFOUND` | 대상 없음 → 빈 상태 (로그아웃 금지) |
| `E-TIMEOUT` | 제한 시간 초과 → "조회 기간을 좁혀 주세요" 안내 |

로그인 전에 부르는 경로(`/auth/login` 등)는 401 이 나도 토큰 갱신을 시도하지 않습니다.

**응답 없는 실패도 세션 만료로 의심합니다.** 서버가 인증 필터에서 401 을 만들면 CORS 헤더가
붙지 않는 경우가 있고, 그러면 브라우저가 응답을 막아 axios 에는 상태 코드 없이 네트워크 오류로
들어옵니다. 이때 그냥 실패로 두면 화면이 조용히 비어 원인을 알 수 없으므로,
로그인 상태에서 난 응답 없는 실패는 갱신을 한 번 시도하고 실패하면 안내 후 로그인 화면으로 보냅니다.

**조회 실패는 카드가 아니라 화면 위에 알립니다.** `unwrapAll` 은 실패를 `errors` 에 모아 주고
`firstError()` 로 대표 오류 하나를 꺼낼 수 있습니다. 등록되지 않은 공정 코드처럼 사용자가
고칠 수 있는 오류는 위젯을 비워 두지 말고 이유를 띄우세요.

### 9-6. 폼은 `required` 만 붙이면 검증됩니다

`openFormModal` 이 제출 직전에 `required: true` 인 칸이 비었는지 확인하고,
비었으면 그 칸 아래에 안내를 붙이고 제출을 막습니다. (조사는 받침에 맞춰 붙습니다)
`onSubmit` 이 `false` 를 돌려주면 모달을 유지하며, `async` 함수도 결과를 기다린 뒤 판정합니다.

### 9-7. 목록은 페이징을 붙이세요

서버 목록 API 는 `page`·`size` 를 받고 `meta {page, size, total, totalPages}` 를 돌려줍니다.
안 보내면 **서버 기본값 50건만 받아 놓고 화면에는 아무 표시가 없습니다** —
설비 1,331건 중 50건이 나오는데 사용자는 그게 전부인 줄 압니다.

```jsx
// 컨트롤러
const paging = usePaging({ resetKey: `${from}|${to}` });   // 조건이 바뀌면 1쪽으로
const { data } = useAsync(
  () => repo.loadLogs({ from, to, ...paging.params }),
  [from, to, paging.page, paging.size],
);
return { ..., paging, itemsMeta: data?.meta };

// 리포지토리 — meta 를 살려서 넘깁니다
export const loadLogs = (params) => unwrapPaged(systemService.getAuditLogs(params));
// unwrapAll 을 쓰는 화면은 data.metas.<키> 로 꺼냅니다

// 뷰
<Table ... />
<Pagination meta={itemsMeta} {...paging.bind} />
```

`unwrap()` 은 `data` 만 꺼내 `meta` 를 버립니다. 목록은 `unwrapPaged()` 를 쓰세요.

### 9-8. 시스템 로그의 기준일은 실적 기준일이 아닙니다

감사 로그·내려받기 이력·질의 이력은 **시스템이 지금 남기는 기록**입니다.
MES 실적 기준일(`lastDataDate()`)을 쓰면 오늘 쌓인 로그가 범위 밖으로 빠져 0건이 됩니다.
이 화면들은 `recentDays(n)` 을 쓰세요 — 오늘 기준입니다.

### 9-9. 표의 행 key 는 겹칠 수 있다

같은 설비가 공정별로 여러 줄 오는 식으로 실데이터에는 식별자가 겹칩니다.
`Table` 이 중복 key 에 순번을 덧붙여 갈라 주지만, 의미상 정확한 key 를 주는 편이 낫습니다.

```jsx
<Table keyExtractor={(row) => `${row.eqptCd}·${row.processId}`} … />
```

### 9-10. 알아둘 데이터 특성

- 고객사(`customer`)는 MES 에 정보가 없어 전부 `null` 입니다. 빈 값 처리를 해두세요.
- 제품군은 MES 품목코드에서 파생한 값이라 `미분류` 가 가장 큽니다. 버그가 아닙니다.
- **불량 수량·불량률은 라벨이력(`label_hist.defect`) 기준**입니다. 불량 *유형* 구성만
  불량이력을 쓰되 재작업·반품 코드((R) 12종 · T 1종)를 뺍니다. 자세한 근거는
  `../API/docs/MES_QUERY_GUIDE.md` 2-4 절에 있습니다.
- `quality/defects/by-type` 의 `cnt` 는 **건수가 아니라 수량**입니다(전 유형 합 = `ngQty`).
  `quality/defects/summary` 의 `totalCnt` 만 건수(불량이 발생한 라벨 수)입니다.
- `dashboard/ai/defect-trend` 은 **불량률(%)과 유형별 수량(EA)을 한 배열에 섞어** 줍니다.
  리포지토리가 `rateSeries` · `countSeries` 로 갈라 두었으니 같은 축에 함께 그리지 마세요.
- **대시보드 기본 선택은 실적이 있는 것으로 잡으세요.** 공정 목록은 ID 순이고 제품 순위는
  판매 기준이라, 그대로 기본값을 쓰면 그날 실적이 없는 조합이 잡혀 화면이 0 으로 열립니다.
  공정은 `dashboard/ai/process-yield`(그날 실적 있는 공정), 제품은
  `dashboard/process/products`(그날 그 공정이 만든 제품)에서 고릅니다.
  공정 코드를 화면에 하드코딩하지 마세요 — 서버 코드는 `W110`·`W150`·`W120` 처럼
  사업장마다 다르고 개편될 수 있습니다.
- **공정마다 마지막 실적일이 다릅니다.** (W120 은 2026-08-30, W110·W150 은 08-29)
  공정을 바꿀 때 `GET /common/data-range?processId=…` 로 그 공정의 구간을 다시 받아
  기준일을 `toDate` 로 옮깁니다. 안 그러면 공정만 바꿨는데 0 으로 보입니다.

---

## 10. 테스트 · 검증

### 통합 테스트 (실 API · 실 화면)

테스트는 **항상 실 서버를 봅니다.** 목으로 돌면 확인할 수 없는 것(화면 값 ↔ API 값 일치)을 보기 때문입니다.

```bash
npm run env:check -- local   # ① API 가 떠 있는지 먼저
npm run web                  # ② 다른 터미널에서 (웹 서버가 필요한 스펙용)
npm test                     # ③ 전체 — API 계약 + 27화면 렌더 + 화면 값 ↔ API 값
npm run test:api             # API 만 (웹 서버·브라우저 없이)
npm run test:screens         # 화면 렌더만
npm run test:values          # 화면 숫자가 API 와 맞는지
```

> **실서버(192.168.2.8)로 돌릴 수도 있습니다.** VPN 이 켜져 있으면:
> ```bash
> npm run web:server                                   # 웹 서버를 실서버 기준으로
> API_URL=http://192.168.2.8:8080 npm run test:api     # API 검사만 실서버로
> API_URL=http://192.168.2.8:8080 WEB_URL=http://localhost:8081 npm test
> ```
> 10·11 번 스펙은 **쓰기**를 포함합니다(계정 생성·권한 변경·문서 등록).
> 운영 DB 를 건드리지 않으려면 로컬 API 로 돌리십시오.

목(mode)을 쓰지 않고 실제 서버·화면을 대상으로 돕니다. 자세한 내용은 `tests/README.md` 를 보세요.
화면을 추가하면 화면 목록(`menu.js`)에서 자동으로 검사 대상이 되고,
응답 필드는 `tests/contracts/response.contract.js` 에 한 줄 적으면 이름 어긋남을 잡아 줍니다.

### 정적 검사

```bash
npm run check              # 아래 7종 한 번에
npm run check:env          # .env 가 기본값인지 (실서버 주소가 남아 있지 않은지)
npm run check:target-log   # 접속 대상 진단을 실제로 실행 — 미선언 변수·판정 오류
npm run check:syntax       # app/ · src/ 전 소스 구문 검사
npm run check:api      # 코드가 부르는 서비스 함수가 실제로 있는지
npm run check:mock     # 엔드포인트에 목 핸들러가 다 있는지
npm run check:routes   # 메뉴 정의 ↔ 라우트 파일 1:1 일치
npm run check:columns  # 화면 열 목록이 최신인지
npm run check:unused   # 쓰지 않는 import 탐지
```

> `check:mock` 이 `unmocked: 1` 을 냅니다 — `getAlertConditionMetrics`.
> 목으로 돌릴 때 이 API 만 빈 응답을 줍니다. 실 서버 연동에는 영향이 없습니다.

> `check:syntax` 는 **파싱만** 하므로 미선언 변수를 잡지 못합니다.
> `check:target-log` 가 그 빈틈을 메웁니다 — 실제로 모듈을 실행해
> 참조 오류와 로컬/실서버 판정 정확성을 함께 봅니다.

---

## 11. 남은 작업

### 서버 쪽 확인이 필요한 것

1. **하위 화면 진입 판정 정합성 (2026-09-27 기준 일부 해소)**
   `GET /system/menu-perms` 매트릭스와 `GET /auth/me` 의 `menuPerms` 가 어긋나면 그 화면은 막힙니다.
   이전에 지적된 4개 중 `qc-report` · `report-forms` · `rpt-scrap-new` 는 **웹에서 라우트를 뺐으므로** 더 이상 문제가 아닙니다.
   `daily-history` 는 라우트가 살아 있어 여전히 확인이 필요합니다 — 매트릭스에는 있는데 `/auth/me` 에서 빠지는지 보십시오.
2. `GET /quality/defects/by-line` 약 25초. 인덱스·집계 방식 검토가 필요합니다.
3. 화면 ID `sys-model-ver` — 명세서(ver01)에는 `sys-mver` 로 적혀 있어 웹을 서버 값에 맞췄습니다.
   명세서도 같이 고쳐 두는 편이 좋습니다.
4. **`nginx/dwje-ax.conf` 는 선택 구성** — 현재 운영은 `start.sh` + `serve.cjs` 로
   WEB `:8081` 에서 직접 서빙하고, 번들이 API `:8080` 을 직접 호출합니다.
   `:80` 으로 프록시하려면 Nginx 를 설치·검증한 뒤 번셀을 다시 만들어야 합니다 (§6-3).
5. **WEB 포트를 바꾸면 API CORS 를 같이 고쳐야 합니다** — 화면 `:8081` 과 API `:8080` 이
   교차 출처라서 `CorsConfig.kt` 의 `allowedOriginPatterns` 가 필요합니다 (§6-3).

### 데이터 공백 (기능은 있으나 표시할 자료 없음)

| 대상 | 상태 |
| :--- | :--- |
| 알림 (`tb_alm_alert`) | 0행 — 알림 목록·승격 대기·발송 로그가 빈 상태 |
| 알림 수신 그룹 | 0행 — 당번 왕복 테스트를 만들 수 없음 |
| 품질 보고서 | 0행 — 화면은 빈 상태로 정상 표시 |
| 설비 가동률 | 지표 측정값·비가동 실적 모두 0행 — 계산 원천 자체가 없어 "데이터 없음" |

알림 시드는 **실제 설비·불량 코드에 맞춰** 만들어야 앞뒤 화면이 맞습니다.

### 웹 쪽 남은 것

6. **계정 전환(CM-02)** 은 명세상 우선순위 3(데모 기능)입니다. 목록은 `GET /auth/switch-targets`
   에서 받아 오며, 운영 전환 시 `UserMenu.jsx` 의 전환 영역을 제거하세요.
   `src/shared/constants/accounts.js` 의 `USERS` 는 데모 모드에서만 쓰입니다.
7. `src/shared/constants/organization.js` 의 결재선 후보는 사내 인사/조직 API 로 대체하세요.
8. 토큰을 `localStorage` 에 두고 있습니다. 사내망 밖에 노출한다면
   `shared/utils/authStorage.js` 를 httpOnly 쿠키 방식으로 바꾸는 것을 검토하세요.
   (현행은 사내망 한정 — WEB `:8081` / API `:8080` 사내망 기준)
9. 목 핸들러 1건(`getAlertConditionMetrics`) 이 없습니다. 실 서버 연동에는 영향이 없습니다.
10. 로컬 DB 의 `가온전자` · `나래테크` · `다온모빌리티` 3건은 시험용 가명이라 교체 대상입니다.
