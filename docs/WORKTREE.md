# 세션별 작업 폴더 (git worktree)

여러 세션이 **한 폴더·한 브랜치**를 같이 쓰다가 2026-09-07 에 두 번 작업을 잃었습니다.
한 세션이 작업 트리를 되돌리면 다른 세션의 **커밋 안 된 파일**이 함께 지워지는데,
그건 git 으로 되살릴 수 없습니다(그날은 세션 기록에서 겨우 복구했습니다).

그래서 폴더를 나눴습니다. 폴더가 다르면 서로의 작업 트리에 닿지 않습니다.

## 어디서 무엇을 하나 (2026-09-28 기준)

| 폴더 | 브랜치 | 맡은 곳 | 개발 서버 |
|---|---|---|---|
| `WEB` | `new_dashboard` | **합치는 곳.** 여기서 코드를 고치지 않습니다 | 띄우지 않음 |
| `WEB-ai_concep_design` | `wt/ai_concep_design` | AI 채팅 · 대시보드 · 공용 컴포넌트 · 검사 | 8081 |

> `WEB-ai`(wt/ai-dashboard) · `WEB-process`(wt/process-dashboard) · `WEB-production`(wt/production) 은
> 2026-09 에 작업을 합치며 정리되었습니다. 현재 남은 worktree 는 위 2개입니다.
> `git worktree list` 로 실제 목록을 보십시오.

저장소는 하나를 공유합니다(`.git` 은 `WEB` 에 있습니다). 폴더마다 사본이 생기지 않아
디스크는 거의 늘지 않습니다. `node_modules` 는 `WEB` 것을 심볼릭 링크로 씁니다.

## 개발 서버 — 대상(target)을 고릅니다

```bash
npm run web            # 로컬 API (localhost:8080) — VPN 불필요
npm run web:server     # 실서버 API (192.168.2.8:8080) — VPN 필요
npm run web:mock       # 백엔드 없이 목 데이터
```

포트를 바꾸려면 뒤에 인자를 붙입니다.

```bash
npm run web -- --port 8082
```

> ⚠ `192.168.2.8` 은 VPN 이 켜져 있어야만 닿는 사내 실서버입니다.
> 사내 배포는 **WEB `:8081`** · **API `:8080`** 이고, 개발 서버 기본값도 8081 입니다.
> 서버 주소의 유일한 출처는 `scripts/targets.cjs` 입니다 (README §2).

### IntelliJ 에서 실행할 때

`npm run <script>` 를 그대로 쓰십시오. IntelliJ Run 설정 3종이 저장소에 들어 있습니다
(`.idea/runConfigurations/`, 개인 `.idea` 설정은 git 에서 제외됩니다).

| Run 설정 | 하는 일 |
| :--- | :--- |
| `WEB - dev (로컬 API)` | `npm run web` — 로컬 API 로 개발 |
| `WEB - dev (실서버 API · VPN)` | `npm run web:server` — 실서버 API 로 개발 (VPN 필요) |
| `WEB - build (실서버 배포본)` | `npm run build:web` — 배포 번들 생성 |

> ⚠ IntelliJ 에서 `expo` 를 직접 실행(`npx expo start`)하면 대상 스크립트를 거치지 않으므로
> `.env` 값이 그대로 쓰입니다. `.env` 는 기본값(로컬)만 두고 대상은 npm 스크립트로 고르십시오.
> 실행 후 브라우저 콘솔 첫 줄에 `[접속 대상]` 이 찍혀 붙은 서버를 확인할 수 있습니다.

검사는 자기 서버를 보게 합니다. 8081 이 기본값이라 그 외 포트는 지정해야 합니다.

```bash
WEB_URL=http://localhost:8082 npm test

# 실서버 API 로 검사만 돌리기 (VPN 필요)
API_URL=http://192.168.2.8:8080 npm run test:api
```

## 합치는 흐름

```bash
# 1) 자기 폴더에서 커밋
cd "…/WEB-ai_concep_design" && git add <내가 만진 경로> && git commit

# 2) 남의 작업을 받아 옵니다
git fetch origin && git merge origin/new_dashboard

# 3) 합치는 곳으로 올립니다
cd "…/WEB" && git merge wt/ai_concep_design && git push origin new_dashboard
```

## 지키기로 한 것

- **만들면 바로 커밋합니다.** 완성 전이어도 WIP 로 남기면 잃지 않습니다
- `git add -A` 대신 **자기가 만진 경로만** 담습니다
- `git checkout .` · `git restore .` · `git clean` 을 폴더 전체에 걸지 않습니다.
  되돌릴 때는 파일을 지정합니다
- 공용 파일(`src/shared/**`)을 고치면 커밋 메시지에 적고 다른 세션에 알립니다

## 폴더를 새로 만들거나 지울 때

```bash
git worktree add "…/WEB-새이름" -b wt/새브랜치 new_dashboard
ln -s "…/WEB/node_modules" "…/WEB-새이름/node_modules"
cp "…/WEB-ai_concep_design/.env" "…/WEB-새이름/.env"

git worktree remove "…/WEB-새이름"      # 다 쓴 뒤
git worktree list                        # 지금 있는 것
```
