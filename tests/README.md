# 테스트

실 API·실 화면을 대상으로 도는 통합 테스트입니다. 목(mock)을 쓰지 않습니다 —
확인하려는 것이 **"API 결과와 화면 내용이 맞는가"** 이기 때문입니다.

## 실행

```bash
npm test              # 전체 (API + 브라우저)
npm run test:api      # API 만 — 웹 개발 서버·브라우저 없이 돕니다
npm run test:screens  # 전 화면 렌더만
npm run test:values   # 화면 값 ↔ API 값만

SPEC=05 npm test      # 파일명에 '05' 가 든 스펙만
node tests/run.js 권한 # 묶음 이름에 '권한' 이 든 것만
```

### 준비물

| 대상 | 필요 | 없으면 |
| :--- | :--- | :--- |
| API 서버 `:8080` | 항상 | 전부 건너뜀 |
| 웹 개발 서버 `:8081` | 화면 스펙(06·07) | 그 스펙만 준비 실패로 표시 |
| Chrome | 화면 스펙 | 〃 (시스템 Chrome 을 그대로 씁니다) |

```bash
# 별도 터미널
cd "../API" && ./gradlew bootRun --args='--spring.profiles.active=local'
npm run web
```

### 환경변수

| 이름 | 기본값 | 쓰임 |
| :--- | :--- | :--- |
| `API_URL` | `http://localhost:8080` | API 서버 |
| `WEB_URL` | `http://localhost:8081` | 웹 개발 서버 |
| `TEST_PASSWORD` | `Dwje!2026` | 시드 계정 공통 비밀번호 |
| `TEST_VERIFY_CODE` | — | 이메일 인증 고정 코드 (아래 참고) |
| `API_LOG` | — | 서버 로그 파일 (고정 코드가 없을 때 코드를 읽습니다) |
| `HEADED=1` | — | 브라우저를 눈에 보이게 |
| `NO_BROWSER=1` | — | 화면 스펙 건너뛰기 |
| `TEST_SETTLE_MS` | `3500` | 화면 한 장을 기다리는 시간 |

## 구성

```
tests/
├── run.js                     실행 진입점
├── lib/
│   ├── runner.js              최소 러너 (suite · test · skip · 단언)
│   ├── api.js                 로그인·요청 헬퍼 (계정별 토큰 캐시)
│   ├── browser.js             Chrome 으로 화면을 열고 글자를 읽습니다
│   ├── appmeta.js             앱 소스에서 화면·엔드포인트 목록을 파싱
│   └── fixtures.js            날짜·공정·제품을 서버에서 받아 씁니다
├── contracts/
│   └── response.contract.js   화면이 읽는 응답 필드 목록
└── specs/
    ├── 01-endpoints.spec.js     카탈로그 ↔ 서버 구현 대조
    ├── 02-get-all.spec.js       화면이 쓰는 GET 전수 호출
    ├── 03-contracts.spec.js     응답 필드 계약
    ├── 03b-permissions.spec.js  부서별 권한
    ├── 04-auth.spec.js          로그인·회원가입·비번찾기·가입승인
    ├── 05-consistency.spec.js   API 끼리 같은 사실을 같게 말하는가
    ├── 06-screens.spec.js       36개 화면 렌더 (크래시·4xx·로딩멈춤)
    ├── 07-screen-values.spec.js 화면 숫자 ↔ API 숫자
    ├── 08-paging.spec.js        목록 페이징 (API 동작 + 화면 표시)
    ├── 09-filters.spec.js       필터가 실제로 걸리는가 (조용히 무시되는 필터 잡기)
    ├── 10-writes.spec.js        등록·수정·삭제가 반영되는가 + 401·400·404·403 안전장치
    └── 11-columns.spec.js       표 컬럼 키가 응답 필드에 있는가 (빈 칸으로 그려지는 열 잡기)
```

## 설계 원칙

**날짜·코드를 테스트에 박지 않습니다.** `fixtures.js` 가 실적 보유 기간과 실적이 있는
공정·제품을 서버에서 받아 씁니다. 데이터가 바뀌어도 테스트가 깨지지 않습니다.

**화면 목록을 다시 적지 않습니다.** `appmeta.js` 가 `src/shared/constants/menu.js` 와
`src/services/api/endpoints.js` 를 파싱합니다. 화면을 추가하면 테스트 대상도 같이 늘어납니다.

**실패와 건너뜀을 구분합니다.** 실패(`✕`)는 고쳐야 할 것, 건너뜀(`○`)은 이 환경에서
확인할 수 없는 것입니다. 건너뛸 때는 무엇을 갖추면 도는지 함께 적습니다.

**비율(%)의 분모는 원장입니다.** 표시된 항목들의 합을 분모로 쓰면 빠진 몫만큼 비중이
부풀려집니다. 불량 유형 비중은 `summary.ngQty` 를 분모로 확인합니다.

## 새 화면을 추가했다면

1. `menu.js` 에 화면을 등록하면 **06 스펙이 자동으로 그 화면을 검사**합니다.
2. 그 화면이 쓰는 API 응답 필드를 `contracts/response.contract.js` 에 적으면
   **03 스펙이 필드 이름 어긋남을 잡아 줍니다.** (이 프로젝트에서 가장 자주 났던 사고입니다)
3. 화면에 찍히는 대표 숫자가 있으면 `07-screen-values.spec.js` 에 한 줄 추가하세요.

## 인증 코드가 필요한 테스트

회원가입·비밀번호 찾기는 이메일 인증을 거칩니다. 로컬은 메일을 보내지 않으므로
테스트가 코드를 알 방법이 있어야 합니다. 둘 중 하나를 갖추면 됩니다.

- **(권장) 서버가 로컬에서 고정 코드를 쓰게 하고 알려 주기**
  ```bash
  TEST_VERIFY_CODE=000000 npm test
  ```
- **(대안) 서버 출력을 파일로 남기고 경로 알려 주기**
  ```bash
  ./gradlew bootRun --args='--spring.profiles.active=local' > /tmp/api.log 2>&1
  API_LOG=/tmp/api.log npm test
  ```

없으면 해당 두 건은 건너뜁니다 (실패가 아닙니다).

## 주의

`04-auth.spec.js` 는 **계정을 실제로 만들었다 반려 처리**합니다.
운영 DB 를 바라보게 하지 마세요. 로컬 개발 DB 전용입니다.
