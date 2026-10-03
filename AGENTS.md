# 작업 지침

## 서버 대상 (target) — 고치지 말고 스크립트를 쓸 것

- 서버 주소는 **`scripts/targets.cjs` 한 곳**에만 있습니다. `192.168.2.8` 같은 사내 주소를
  코드·문서에 새로 쓰지 마십시오.
- `192.168.2.8` 은 **VPN 이 활성화되어 있어야만 닿는 실서버**입니다. 로컬과 실서버를 나눠 말할 때
  이 사실을 함께 적으십시오.
- **두 포트의 역할이 다릅니다** — WEB 은 `192.168.2.8:8081`, API 는 `192.168.2.8:8080`.
  사람이 여는 주소는 8081 이고 번들이 호출하는 주소는 8080 입니다. 둘을 섞어 쓰지 마십시오.
  화면 8081 → API 8080 은 교차 출처라 API `CorsConfig.kt` 의 허용 목록이 필요합니다.
- 개발 서버는 `npm run web`(로컬) · `npm run web:server` · `npm run web:mock`,
  빌드는 `npm run build:web` · `npm run build:web:local`, 확인은 `npm run env:check [대상]` 을 씁니다.
- `.env` 는 기본값만 둡니다. 대상 값은 스크립트가 프로세스 환경변수로 주입합니다.
  **`.env` 에 사내 주소를 적어 두지 마십시오.** `npm run check:env` 가 걸어 냅니다.
- 대상을 바꾸면 Metro 캐시를 비워야 합니다. 번들에 박히는 API 주소는 빌드 시점에 정해지고
  Metro 캐시 키에는 `process.env` 가 들어가지 않습니다. `npm run web*` 가 기본으로 `--clear` 합니다.
- IntelliJ Run 설정 3종(로컬 / 실서버 / 빌드)을 `.idea/runConfigurations/` 에 두었습니다.
  `expo` 를 직접 실행하지 말고 `npm run <script>` 를 쓰십시오.

## 문서

- 화면 수·API 수·폴더 구조를 적을 때 `npm run check:routes` · `endpoints.js` 와 대조하십시오.
  README 는 **메뉴 29건 · API 241건** 기준입니다(2026-10-03).
- 제거한 화면은 삭제하지 말고 「제거됨」 으로 표시해 두십시오 (되살릴 수 있어야 합니다).

## 표 UI 작업 기준

- Tabulator 표에서 마지막 열 또는 항목이 가용 너비를 넘어가면 가로 스크롤을 기본 제공한다.
- 열을 숨기거나 과도하게 압축하여 해결하지 않는다. 각 열의 명시된 width/minWidth를 유지하고, 별도 지정이 없는 데이터 열은 읽을 수 있는 최소 너비를 확보한다.
- 공통 Table, TabulatorGrid, TabulatorTable을 우선 사용한다. 스크롤 영역은 부모 카드 너비 안에 제한하고, 헤더와 본문의 가로 위치가 함께 이동하도록 한다.
- 변경 후 좁은 화면에서도 오른쪽 끝까지 스크롤하여 마지막 열의 헤더와 값을 볼 수 있는지 확인한다.

## MVC

- `domain/model` (API·계산) → `domain/controller` (상태·동작, JSX 금지) → `domain/view` (JSX) → `app/(main)/**` (결선).
- 화면 ID 는 API 명세·DB `tb_sys_menu` 과 같은 값으로 고정합니다. 임의로 새로 만들지 않습니다.
- 새 화면은 `menu.js` · 라우트 · **DB 화면 행** 세 곳이 모두 있어야 열립니다.
  진입 판정은 `GET /auth/me` 의 `menuPerms` 기준입니다.
