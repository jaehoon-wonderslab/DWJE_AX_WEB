# 세션별 작업 폴더 (git worktree)

여러 세션이 **한 폴더·한 브랜치**를 같이 쓰다가 2026-09-07 에 두 번 작업을 잃었습니다.
한 세션이 작업 트리를 되돌리면 다른 세션의 **커밋 안 된 파일**이 함께 지워지는데,
그건 git 으로 되살릴 수 없습니다(그날은 세션 기록에서 겨우 복구했습니다).

그래서 폴더를 나눴습니다. 폴더가 다르면 서로의 작업 트리에 닿지 않습니다.

## 어디서 무엇을 하나

| 폴더 | 브랜치 | 맡은 곳 | 개발 서버 |
|---|---|---|---|
| `WEB` | `new_dashboard` | **합치는 곳.** 여기서 코드를 고치지 않습니다 | 띄우지 않음 |
| `WEB-ai` | `wt/ai-dashboard` | AI 통합 대시보드 · 공용 컴포넌트 · 검사 | 8081 |
| `WEB-process` | `wt/process-dashboard` | 공정 및 제품 대시보드 | 8082 |
| `WEB-production` | `wt/production` | 실적 집계·조회 · 생산 모니터링 | 8083 |

저장소는 하나를 공유합니다(`.git` 은 `WEB` 에 있습니다). 폴더마다 사본이 생기지 않아
디스크는 거의 늘지 않습니다. `node_modules` 는 `WEB` 것을 심볼릭 링크로 씁니다.

## 개발 서버

```bash
cd "…/WEB-process"
npx expo start --web --port 8082
```

검사는 자기 서버를 보게 합니다. 8081 이 기본값이라 그 외 폴더는 지정해야 합니다.

```bash
WEB_URL=http://localhost:8082 npm test
```

## 합치는 흐름

```bash
# 1) 자기 폴더에서 커밋
cd "…/WEB-process" && git add <내가 만진 경로> && git commit

# 2) 남의 작업을 받아 옵니다
git fetch origin && git merge origin/new_dashboard

# 3) 합치는 곳으로 올립니다
cd "…/WEB" && git merge wt/process-dashboard && git push origin new_dashboard
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
cp "…/WEB/.env" "…/WEB-새이름/.env"

git worktree remove "…/WEB-새이름"      # 다 쓴 뒤
git worktree list                        # 지금 있는 것
```
