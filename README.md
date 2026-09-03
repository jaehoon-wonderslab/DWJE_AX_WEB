# 덕우전자 AX — AI 의사결정 지원 계층 (Web)

사내 MES 위에 얹는 **AI 의사결정 지원 계층**의 프론트엔드입니다.
`기능 및 API 명세/ver01` 의 **화면 36종 · API 236건** 을 코드로 반영했습니다.

- **메뉴 하나 = 라우트 하나 = 소스 파일 하나** (파일 기반 라우팅)
- **MVC 3계층** — Model(데이터) / View(화면) / Controller(상태·동작)
- 공통 UI·차트·레이아웃·유틸은 `src/shared` 로 분리

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
| 차트 | react-native-svg 인라인 SVG 8종 | 외부 차트 라이브러리 없음 |

---

## 2. 실행

```bash
npm install          # 최초 1회
cp .env.example .env # 최초 1회

npm run web          # 개발 서버 → http://localhost:8081
npm run build:web    # 정적 빌드 → dist/ (메뉴별 HTML 생성)
npm run check        # 구문 · 서비스 참조 · 목 커버리지 · 라우트 일치 검사
```

### 환경 변수 (`.env`)

| 키 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` | API 서버 주소 |
| `EXPO_PUBLIC_USE_MOCK` | `false` | `false` = 실 서버 호출 (기본) / `true` = 명세 기반 목 응답 |
| `EXPO_PUBLIC_MOCK_DELAY` | `180` | 목 응답 지연 (ms) |
| `EXPO_PUBLIC_LIVE_AUTH` | `true` | 목 모드에서도 인증 API 만 실 서버로 (`false` 면 인증도 목 + 자동 로그인) |
| `EXPO_PUBLIC_API_TIMEOUT` | `45000` | 요청 제한 시간 (ms). 대용량 집계 조회가 있어 넉넉히 둡니다 |

> **백엔드 연동 전환** — `.env` 의 `EXPO_PUBLIC_USE_MOCK=false` 한 줄만 바꾸면 됩니다.
> 화면·컨트롤러·리포지토리 코드는 고치지 않습니다.

### 실 API 연동 상태

**업무 API 전 도메인이 실 DB 에 연결되어 있습니다** (`EXPO_PUBLIC_USE_MOCK=false`).
카탈로그 251건이 서버 구현과 1:1로 대조되어 누락 0건임을 확인했습니다
(`/v3/api-docs` 대조 · 2026-09-01).

목 레이어는 지운 게 아니라 남겨 두었습니다. API 서버 없이 화면만 볼 때는
`EXPO_PUBLIC_USE_MOCK=true` + `EXPO_PUBLIC_LIVE_AUTH=false` 로 두면 예전처럼 동작합니다.
`live: true` 로 표시된 인증 13건은 목 모드에서도 실 서버로 나갑니다
(판정은 `src/services/api/client.js` 의 `shouldMock()` 한 곳).

```bash
# API 서버 (별도 터미널)
cd "../API"
./src/main/resources/db/local/setup_local_db.sh          # DB 준비 (최초 1회, Docker 필요)
./gradlew bootRun --args='--spring.profiles.active=local'
```

로컬은 SMTP 없이 **인증 코드를 서버 로그에 출력**합니다 (`인증 코드 : 382831  (유효 5분)`).
시드 계정은 `10000`~`10005`, 비밀번호는 모두 `Dwje!2026`, 이메일은 `사번@dwje.co.kr` 입니다.

백엔드 없이 화면만 보려면 `.env` 에 `EXPO_PUBLIC_LIVE_AUTH=false` 를 두세요.
로그인 화면을 건너뛰고 기본 계정으로 자동 로그인합니다.

---

## 3. 폴더 구조

```text
app/                                  라우트 (Expo Router) — 파일 = URL = 메뉴
├── _layout.jsx                       루트: 목 등록 · 저장된 세션 복원 · 테마 · 오버레이
├── index.jsx                         / → 기본 화면 리다이렉트
├── +not-found.jsx                    404
├── (auth)/                           사이드바 없는 인증 화면 그룹 (비로그인 전용)
│   ├── _layout.jsx                   로그인 상태면 기본 화면으로 되돌림
│   ├── login.jsx                     /login
│   ├── signup.jsx                    /signup            (3단계 + 승인 대기 안내)
│   └── forgot-password.jsx           /forgot-password   (3단계 + 완료 안내)
└── (main)/                           사이드바 + 상단바가 붙는 레이아웃 그룹
    ├── _layout.jsx                   3분할 레이아웃 + 로그인 여부 · 메뉴 접근 권한 판정
    ├── ai/chat.jsx                   /ai/chat
    ├── dashboard/{ai,process,kpi}.jsx
    ├── production/{monitor,result,downtime}.jsx
    ├── production/daily-report/{index,history}.jsx
    ├── quality/{defect,aoi,report,report-forms}.jsx
    ├── alert/list.jsx
    ├── report/{press-morning,plating-morning,ship-plan,yield-by-model,lrr-by-customer}.jsx
    ├── report/scrap/{index,new}.jsx
    └── system/{account,menu-perm,data-perm,alert-condition,recipient,glossary,
                product-rank,chat-history,audit-log,model-config,model-version,
                agent,metric-standard,download-log,sync-history}.jsx

src/
├── domains/<도메인>/                  업무 도메인별 MVC (auth · ai · dashboard · production
│   ├── model/                        │           quality · alert · report · system)
│   │   ├── *Repository.js            [M] API 접근 — 화면 단위로 필요한 API 묶음을 제공
│   │   └── *Model.js                 [M] 도메인 계산 규칙 (판정·환산). React 의존 없음
│   ├── controller/use*Controller.js  [C] 화면 상태 · 데이터 로딩 · 도메인 동작 (JSX 없음)
│   └── view/*View.jsx                [V] 렌더링 · 폼/모달 구성 · 컨트롤러 동작 호출
│
├── shared/                           공통 (도메인에 종속되지 않는 것만)
│   ├── components/ui/                버튼·카드·표·모달·폼·배지·권한매트릭스 등 (CM-05)
│   ├── components/charts/            SVG 차트 8종 (CM-06)
│   ├── components/layout/            사이드바·상단바·그리드·페이지 컨테이너·보고서 틀 (CM-01)
│   ├── constants/                    메뉴·권한·계정·조직·보고서 열 정의
│   ├── hooks/                        useAsync(조회) · useAppNavigation(화면 이동)
│   ├── navigation/routes.js          화면 ID ↔ URL 경로 매핑
│   ├── stores/                       Zustand — auth · ui · theme · app
│   ├── theme/                        컬러 토큰 · 테마 · 공통 StyleSheet
│   └── utils/                        포맷 · 마스킹 · 내려받기 · 인쇄
│
└── services/                         원격 데이터 소스 (Model 계층이 사용)
    ├── api/client.js                 Axios 클라이언트 · 목 스위치 · 토큰 갱신
    ├── api/endpoints.js              API 카탈로그 244건 (명세 236 + 인증 확장 8)
    ├── api/request.js                unwrap(조회) · command(등록·수정) 헬퍼
    ├── api/*Service.js               도메인별 서비스 함수 244개
    ├── mock/                         목 핸들러 + 목 데이터 (실 서버 전환 시 불필요)
    └── setup.js                      목 등록 side-effect 모듈
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

1. `src/shared/constants/menu.js` 에 `{ id, name, path }` 추가
2. `src/domains/<도메인>/model/` 에 리포지토리 함수 추가
3. `src/domains/<도메인>/controller/use<화면>Controller.js` 작성
4. `src/domains/<도메인>/view/<화면>View.jsx` 작성
5. `app/(main)/<path>.jsx` 라우트 파일 작성
6. `src/shared/constants/dataFields.js` 의 `MENU_ACCESS_DEFAULT` 에 부서별 권한 부여
7. `npm run check:routes` 로 메뉴 ↔ 라우트 일치 확인

---

## 6. 화면 · API 매핑

| 구분 | 경로 | 화면 ID | API |
| :--- | :--- | :--- | ---: |
| AI | `/ai/chat` | ai-chat | 6 |
| 대시보드 | `/dashboard/ai` · `/dashboard/process` · `/dashboard/kpi` | dash-ai / dash-proc / dash-kpi | 34 |
| 생산관리 | `/production/monitor` · `/production/result` · `/production/daily-report` · `/production/daily-report/history` · `/production/downtime` | prod-monitor / prod-result / prod-daily / daily-history / prod-down | 18 |
| 품질관리 | `/quality/defect` · `/quality/aoi` · `/quality/report` · `/quality/report-forms` | qc-defect / qc-aoi / qc-report / report-forms | 29 |
| 이상 알림 | `/alert/list` | alert-list | 5 |
| 보고서 | `/report/press-morning` · `/report/plating-morning` · `/report/ship-plan` · `/report/yield-by-model` · `/report/lrr-by-customer` · `/report/scrap` · `/report/scrap/new` | rpt-* | 20 |
| 시스템관리 | `/system/*` 15종 | sys-* | **110** |
| 인증·공통 | (화면 없음) | — | 13 |
| **합계** | **36 화면** | | **236** |

> 시스템관리 110건 = 명세 ver01 의 107건 + SY-15 스키마 드리프트 3건(추가분).

---

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

```bash
npm test              # 전체 — API 계약 + 36화면 렌더 + 화면 값 ↔ API 값
npm run test:api      # API 만 (웹 서버·브라우저 없이)
npm run test:screens  # 화면 렌더만
npm run test:values   # 화면 숫자가 API 와 맞는지
```

목을 쓰지 않고 실제 서버·화면을 대상으로 돕니다. 자세한 내용은 `tests/README.md` 를 보세요.
화면을 추가하면 화면 목록(`menu.js`)에서 자동으로 검사 대상이 되고,
응답 필드는 `tests/contracts/response.contract.js` 에 한 줄 적으면 이름 어긋남을 잡아 줍니다.

### 정적 검사

```bash
npm run check          # 아래 4종 한 번에
npm run check:syntax   # app/ · src/ 전 소스 구문 검사
npm run check:api      # 코드가 부르는 서비스 함수가 실제로 있는지
npm run check:mock     # 엔드포인트에 목 핸들러가 다 있는지
npm run check:routes   # 메뉴 정의 ↔ 라우트 파일 1:1 일치
npm run check:unused   # 쓰지 않는 import 탐지
```

---

## 11. 남은 작업

### 서버 쪽 확인이 필요한 것

1. **하위 화면 4개가 어떤 계정으로도 열리지 않습니다.**
   `GET /system/menu-perms` 의 매트릭스에는 `daily-history` · `qc-report` · `report-forms` ·
   `rpt-scrap-new` 가 부서별로 들어 있는데, 같은 계정의 `GET /auth/me` `menuPerms` 에서는 빠져 옵니다.
   (통합관리자 기준 매트릭스 36건 ↔ `/auth/me` 32건)
   화면 진입 판정은 `/auth/me` 를 쓰므로 이 4개 화면이 막혀 있습니다. 서버 정합성 확인이 필요합니다.
2. `GET /quality/defects/by-line` 약 25초. 인덱스·집계 방식 검토가 필요합니다.
3. 화면 ID `sys-model-ver` — 명세서(ver01)에는 `sys-mver` 로 적혀 있어 웹을 서버 값에 맞췄습니다.
   명세서도 같이 고쳐 두는 편이 좋습니다.

### 웹 쪽 남은 것

4. **계정 전환(CM-02)** 은 명세상 우선순위 3(데모 기능)입니다. 목록은 `GET /auth/switch-targets`
   에서 받아 오며, 운영 전환 시 `UserMenu.jsx` 의 전환 영역을 제거하세요.
   `src/shared/constants/accounts.js` 의 `USERS` 는 데모 모드에서만 쓰입니다.
5. `src/shared/constants/organization.js` 의 결재선 후보는 사내 인사/조직 API 로 대체하세요.
6. 토큰을 `localStorage` 에 두고 있습니다. 사내망 밖에 노출한다면
   `shared/utils/authStorage.js` 를 httpOnly 쿠키 방식으로 바꾸는 것을 검토하세요.
