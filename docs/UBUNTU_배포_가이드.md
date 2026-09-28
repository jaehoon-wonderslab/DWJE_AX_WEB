# 덕우전자 AX 시스템 — 우분투(Ubuntu) 실서버 배포 및 운영 가이드

본 문서는 덕우전자 AX 시스템(Spring Boot 백엔드 API 및 React Native Web 프론트엔드)을 **IntelliJ IDEA에서 빌드하여 우분투 실서버에 배포하고 안전하게 운영(start / stop / status)** 하기 위한 종합 가이드입니다.

---

## 0. 먼저 알아둘 것

### 0-1. 실서버 주소는 VPN 이 필요합니다

### 0-1. 두 포트의 역할이 다릅니다 — WEB 8081 · API 8080

| | 주소 | 무엇이 serve 하나 | 비고 |
| :--- | :--- | :--- | :--- |
| **WEB** | `http://192.168.2.8:8081` | 정적 번들 (HTML/JS/CSS) | `start.sh` · `stop.sh` · `status.sh` · `serve.cjs` 의 기본 `PORT` |
| **API** | `http://192.168.2.8:8080` | 업무 API · `/api/ai/chat` (SSE) | 번들 빌드 시 `EXPO_PUBLIC_API_URL` 로 주입 |

**사람이 여는 주소는 8081, 번들이 호출하는 주소는 8080 입니다.**
화면이 8081 에서 열렸는데 API 는 8080 — 즉 **교차 출처**라서 API 쪽 CORS 가 필요합니다.
API 의 `CorsConfig.kt` 는 `http://192.168.2.8:*` 를 허용하므로 정상 동작합니다.
WEB 포트를 바꾸려면 API CORS 허용 목록도 같이 고치십시오.

`192.168.2.8` 은 사내망 주소입니다. VPN 이 꺼져 있으면 **브라우저는 열리지만 모든 API 요청이 실패**하여
화면이 조용히 비어 보입니다. 실서버에 파일을 올리기 전에 반드시 VPN 을 켜십시오.

웹 프로젝트에는 접속 확인 명령이 있습니다.

```bash
cd WEB-ai_concep_design
npm run env:check -- list     # 대상 4종 설명
npm run env:check             # 실서버(:8080) 접속 확인 — VPN 이 꺼져 있으면 여기서 걸립니다
```

### 0-2. 빌드 대상(target) 3종

서버 주소는 `WEB-ai_concep_design/scripts/targets.cjs` 한 곳에 있습니다. 빌드 때 고릅니다.

| 명령 | 번들이 부르는 API | 언제 씀 |
| :--- | :--- | :--- |
| `npm run build:web` | `http://192.168.2.8:8080` | **기본값.** 사내 배포 (WEB 은 8081 에서 서빙) |
| `npm run build:web:local` | `http://localhost:8080` | 빌드 결과물을 로컬에서 확인 |
| `npm run web:server` | (개발 서버) `http://192.168.2.8:8080` | VPN 로 실서버 DB 를 붙여 화면 디버깅 |

> ⚠ 빌드는 **`.env` 를 고치지 않습니다.** 대상 값은 빌드 프로세스 환경변수로만 주입됩니다.
> 이전 스크립트는 빌드 중 `.env` 를 바꿨다가 되돌렸는데, 그 사이 `Ctrl-C` 로 끊기면
> 배포 주소가 남아 로컬 개발이 실서버를 보게 되는 문제가 있었습니다.

---

## 1. 프로젝트 구성 및 빌드 산출물 요약

| 구분 | 모듈명 | 기술 스택 | IntelliJ 빌드 산출물 | 기본 포트 |
| :--- | :--- | :--- | :--- | :--- |
| **API (백엔드)** | `API` (dwje-api) | Kotlin 2.1, Spring Boot 3.4.4, JDK 21 | `build/libs/dwje-api-0.0.1.jar` | `8080` |
| **WEB (프론트)** | `WEB-ai_concep_design` (dwje-ax-web) | React Native for Web, Expo SDK 57, Node 20+ | `dist/` (정적 번들 디렉토리) | **8081** (사람이 여는 주소) |

---

## 2. IntelliJ IDEA 에서 빌드하는 방법 (우분투 실행용)

### 2.1 백엔드 API 빌드 (`dwje-api-0.0.1.jar`)

우분투 서버에서 `java -jar` 명령어로 단독 실행할 수 있는 **Executable Fat JAR**를 빌드합니다.

#### 방법 A: IntelliJ Gradle 도구 창 이용 (가장 간편)
1. IntelliJ IDEA에서 `API` 프로젝트를 엽니다.
2. **SDK 설정 확인**:
   - 메뉴: `File` → `Project Structure` → `Project` → **SDK**가 `21` (OpenJDK 21 / Corretto 21 / Temurin 21)로 설정되어 있는지 확인합니다.
   - 메뉴: `Settings` (또는 `Preferences`) → `Build, Execution, Deployment` → `Build Tools` → `Gradle` → **Gradle JVM**이 `Java 21`로 설정되어 있는지 확인합니다.
3. 오른쪽 사이드바의 **Gradle 탭(코끼리 아이콘)** 을 클릭합니다.
4. 트리 메뉴 이동:
   ```
   dwje-api (또는 API)
   └── Tasks
       └── build
           └── bootJar   <-- 더블 클릭하여 실행
   ```
5. 하단 `Run` 탭에 `BUILD SUCCESSFUL` 메시지가 표시되면 빌드가 완료됩니다.

#### 방법 B: IntelliJ 하단 Terminal 이용
IntelliJ 하단의 **Terminal** 창(`Alt + F12` 또는 `View > Tool Windows > Terminal`)에서 아래 명령어를 실행합니다:
```bash
./gradlew clean bootJar -x test
```
*(운영 배포용 빌드 시 테스트 시간을 단축하기 위해 `-x test` 플래그를 권장합니다)*

#### 산출물 위치
- **생성 경로**: `API/build/libs/dwje-api-0.0.1.jar`
- **크기**: 약 53MB (Spring Boot 및 내장 Tomcat, 모든 의존성 라이브러리가 포함된 완전 독립 실행형 JAR)

---

### 2.2 프론트엔드 WEB 빌드 (`dist/`)

#### 빌드 대상 선택 — 서버 주소를 고르는 단계

`npm run build:web` 는 `.env` 를 읽지 않습니다. `scripts/targets.cjs` 에서 대상을 골라
**빌드 프로세스 환경변수로만** 주입한 뒤 `expo export` 를 실행합니다.

| 명령 | 번들이 부르는 API | 설명 |
| :--- | :--- | :--- |
| `npm run build:web` | `http://192.168.2.8:8080` | **기본값.** 사내 배포 |
| `npm run build:web:local` | `http://localhost:8080` | 로컬 API 주소로 빌드 (결과물 확인용) |
| `node scripts/build-deploy.cjs --list` | — | 대상 목록 출력 |

> **8081 과 8080 을 혼동하지 마십시오.**
> WEB 이 8081 에서 서빙된다는 사실과 번들이 8080 을 호출한다는 것은 별개입니다.
> 번들에 박히는 값은 언제나 **API 주소**이고, WEB 포트는 `start.sh --port=` 로 정합니다.

#### IntelliJ에서 빌드 실행
1. IntelliJ에서 `WEB-ai_concep_design` 프로젝트를 엽니다.
2. IntelliJ 하단 **Terminal** 창을 엽니다.
3. (실서버로 올릴 번들이라면) **VPN 이 켜져 있는지 확인**합니다.
   ```bash
   npm run env:check          # ✓ 접속 가능 이 나오면 진행
   ```
4. 빌드 명령어 실행:
   ```bash
   npm run build:web
   ```
   *(대상 `server` 의 값 — `EXPO_PUBLIC_API_URL=http://192.168.2.8:8080`, `EXPO_PUBLIC_USE_MOCK=false`,
   `EXPO_PUBLIC_LLM_API_URL=`(빈 값) — 을 빌드 프로세스에만 주입하고 `expo export --platform web` 을 실행합니다.
   전체 라우트가 HTML/JS/CSS 번들로 컴파일되고, 이어서 `dist/` 에 `start.sh`·`stop.sh`·`status.sh`·
   `nginx/dwje-ax.conf` 가 배치되며 `dwje-web-deploy.zip` 이 만들어집니다.)*

#### 산출물 위치
- **생성 경로**: `WEB-ai_concep_design/dist/`
- **전송용 압축**: `WEB-ai_concep_design/dwje-web-deploy.zip` (dist/ 를 루트로 압축)
- **구성 요소**: `dist/index.html`, `dist/login.html`, `dist/_expo/static/` 등 87개 이상의 최적화된 정적 페이지 및 번들

#### 번들이 어느 서버를 보는지 확인

빌드 후 번들에 실제로 박힌 **API 주소**를 확인할 수 있습니다.

```bash
grep -rho '192\.168\.2\.8[:0-9]*' dist/_expo/static/js/ | sort -u
```

`build:web` 로 빌드했다면 `192.168.2.8:8080` 이 나와야 합니다.
(WEB 포트 8081 은 번들에 없습니다 — 서빙은 서버의 `start.sh` 가 합니다.)


---

## 3. 우분투 실서버 환경 준비 (Ubuntu Server)

우분투 서버(Ubuntu 22.04 LTS / 24.04 LTS 권장) 터미널에서 필수 패키지를 설치합니다:

```bash
# 1. 시스템 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# 2. OpenJDK 21 설치 (API 실행용)
sudo apt install -y openjdk-21-jdk

# 3. Node.js 20+ 설치 (웹 서버 단독 실행 시 필요)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. 필수 네트워크 및 프로세스 관리 유틸리티 설치 (psmisc: fuser 명령어 제공)
sudo apt install -y curl psmisc lsof iproute2 bash
# nginx 는 §5.2 방법 2(Nginx 프록시)를 쓸 때만 — 현재 운영은 방법 1 이라 필요 없습니다
# sudo apt install -y nginx

# 5. 설치 버전 확인
java -version    # OpenJDK 21 이상 확인
node -v          # v20 이상 확인
fuser -V         # psmisc 패키지 정상 확인
```

---

## 4. 우분투 서버 배포 디렉토리 구성

우분투 서버의 권장 배포 디렉토리 구조는 다음과 같습니다 (예: `/opt/dwje` 또는 사용자 홈 `~/dwje`):

```
/opt/dwje/
├── api/
│   ├── dwje-api-0.0.1.jar        # IntelliJ에서 빌드한 JAR 파일
│   ├── start.sh                  # 백엔드 기동 스크립트
│   ├── stop.sh                   # 백엔드 안전 중지 스크립트 (커넥션 종료)
│   ├── status.sh                 # 백엔드 상태 확인 스크립트
│   └── config/
│       └── api.env               # 운영 환경변수 (DB 암호, JWT 시크릿 등)
│
└── web/
    ├── dist/                     # 빌드된 dist 디렉토리 전체
    ├── scripts/
    │   └── serve.cjs             # Node 경량 정적 서빙 스크립트 (무의존성)
    ├── start.sh                  # 웹 기동 스크립트 (Node 모드)
    ├── stop.sh                   # 웹 안전 중지 스크립트 (커넥션 종료)
    ├── status.sh                 # 웹 상태 확인 스크립트
    └── nginx/
        └── dwje-ax.conf          # Nginx 리버스 프록시 설정 템플릿
```

### 파일 전송 및 실행 권한 부여
로컬 PC에서 우분투 서버로 파일을 복사(`scp` 또는 `rsync`)한 후 실행 권한을 부여합니다:
```bash
# 실행 권한 부여
chmod +x /opt/dwje/api/*.sh
chmod +x /opt/dwje/web/*.sh
```

---

## 5. `start.sh` 및 `stop.sh` 기능 및 상세 사용법

### 5.1 백엔드 API (`/opt/dwje/api`)

#### 1) 기동 (`start.sh`)
```bash
cd /opt/dwje/api

# 운영 모드로 백그라운드 기동 (기본 포트: 8080, profile: prod)
./start.sh

# 다른 포트로 기동할 경우
./start.sh --port=8080

# 개발(dev) 프로파일로 기동할 경우
./start.sh --profile=dev

# 터미널에서 콘솔 로그를 직접 보며 기동할 경우 (포그라운드)
./start.sh -f
```
- **주요 동작**:
  - `config/api.env` 파일이 있으면 환경변수를 자동 로드합니다.
  - JDK 21 설치 여부 및 필수 환경변수(`PROD_DB_PASSWORD`, `PROD_JWT_SECRET` 등) 사전 검증.
  - 중복 프로세스 및 포트 충돌 자동 검사.
  - `nohup`으로 백그라운드 기동 후 PID를 `run/dwje-api.pid`에 저장.
  - 최대 30초간 `http://localhost:8080/api/v1/health` 헬스체크를 수행하여 정상 기동을 검증합니다.

#### 2) 안전 중지 (`stop.sh`) — 커넥션 안전 종료 (Graceful Shutdown)
```bash
# 기본 정상 중지 (최대 30초간 커넥션 정리 대기)
./stop.sh

# 대기 시간을 60초로 늘려 종료할 경우
./stop.sh --timeout=60

# 비상 강제 종료 (커넥션 즉시 차단 및 SIGKILL)
./stop.sh --force
```

#### 🛡️ `stop.sh`의 커넥션 안전 종료 메커니즘 (핵심)
1. **활성 커넥션 상태 감지**:
   - `ss` / `lsof` / `netstat`를 통해 포트 8080의 인바운드 **클라이언트 TCP 커넥션(ESTABLISHED)** 과 백엔드 **PostgreSQL DB 커넥션 풀(5432)** 소켓 수를 측정합니다.
2. **정상 종료 신호(SIGTERM) 전송**:
   - 프로세스에 `SIGTERM` 신호를 전송하여 Spring Boot의 `server.shutdown: graceful` 로직을 트리거합니다.
   - **신규 요청 수신 차단**: 새 클라이언트의 TCP 연결 요청을 즉시 거부합니다.
   - **인플라이트 요청 완료**: 처리 중인 HTTP 비즈니스 로직 요청이 완료될 때까지 안전하게 대기합니다.
   - **DB 커넥션 풀 회수**: Spring ApplicationContext가 닫히면서 HikariCP 풀이 PostgreSQL과의 트랜잭션을 정리하고 모든 DB 연결을 정상 `TCP FIN`으로 닫습니다.
3. **카운트다운 및 실시간 모니터링**:
   - 초 단위 루프를 돌며 잔여 클라이언트 커넥션 수와 DB 커넥션 수가 0으로 떨어지고 프로세스가 종료되는 것을 모니터링합니다.
   - 리눅스 좀비 프로세스 감지(`is_zombie`)를 통해 프로세스가 이미 끝난 경우 대기 없이 즉시 정리합니다.
4. **타임아웃 초과 시 강제 소켓 차단 (Fail-Safe)**:
   - 지정된 제한 시간(기본 30초) 내에 응답이 없는 커넥션이 남아있을 경우:
   - `fuser -k -KILL 8080/tcp` 명령어로 해당 포트에 물려있는 모든 소켓을 강제로 절단/회수합니다.
   - 프로세스에 `kill -KILL $TARGET_PID`를 전송하여 프로세스 자원을 100% 회수합니다.
5. **사후 검증**:
   - PID 파일 삭제 및 포트가 완전히 LISTEN 해제되었는지 검증하고 완료를 알립니다.

#### 3) 상태 확인 (`status.sh`)
```bash
./status.sh
```
- 실행 중인 프로세스 PID, CPU/메모리 점유율, 가동 시간, 현재 연결된 활성 TCP 커넥션 수, 헬스체크 응답 결과를 한눈에 출력합니다.

---

### 5.2 프론트엔드 WEB (`/opt/dwje/web`)

웹 프론트엔드는 **Node 기반 단독 실행(방법 1 — 현재 운영)** 과 **Nginx 리버스 프록시(방법 2 — 선택)** 중 선택할 수 있습니다.

> ⚠ 두 포트를 구분하십시오: **WEB 은 8081, API 는 8080** 입니다 (§0-1).

#### 방법 1: Node 기반 단독 실행 스크립트 사용

프로젝트에 내장된 `scripts/serve.cjs`는 외부 npm 패키지 없이 Node.js 표준 라이브러리만으로 동작하여 폐쇄망에서도 즉시 실행됩니다.

```bash
cd /opt/dwje/web

# 기동 (기본 포트: 8081)
./start.sh
# 포트 지정 기동
./start.sh --port=3000

# 상태 확인
./status.sh

# 안전 중지 (클라이언트 keep-alive 소켓 안전 해제 후 종료)
./stop.sh
```
- `stop.sh`는 8081 포트에 연결된 브라우저 HTTP keep-alive 소켓을 안전하게 정리(drain)한 뒤 프로세스를 종료하며, 잔여 소켓 발생 시 `fuser`로 강제 회수합니다.

---

#### 방법 2: Nginx 리버스 프록시 배포 (운영 환경 강력 권장)

운영 환경에서는 Nginx가 80/443 포트를 담당하고, 웹 정적 파일 서빙과 백엔드 API 프록시를 일괄 처리하는 구성이 가장 안정적이고 빠릅니다.

1. 제공된 설정 템플릿 복사:
   ```bash
   sudo cp /opt/dwje/web/nginx/dwje-ax.conf /etc/nginx/sites-available/dwje-ax
   ```
2. 심볼릭 링크 생성:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dwje-ax /etc/nginx/sites-enabled/
   # 기본 default 사이트가 있다면 비활성화
   sudo rm -f /etc/nginx/sites-enabled/default
   ```
3. Nginx 설정 테스트 및 재시작:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
- **Nginx 설정의 장점** (해당 설정을 운영에 설치하고 `nginx -t` 및 API 프록시를 검증한 경우):
  - `http://<서버IP>/` 접속 시 `/opt/dwje/web/dist`의 정적 리소스 초고속 서빙 (Gzip 압축 및 정적 번들 1년 캐싱 자동 적용).
  - `http://<서버IP>/api/*` 요청은 백엔드 Spring Boot `http://127.0.0.1:8080`으로 자동 안전 프록시 (CORS 문제 원천 차단).
  - 대용량 파일 업로드(50MB) 및 웹소켓(WebSocket) 지원 포함.
  - `/api/ai/chat`은 정확 경로 프록시에서 SSE 버퍼링·압축을 끄고 150초까지 기다립니다.

#### 방법 2 는 선택 사항입니다 (Nginx 를 쓰는 경우)

> **현재 운영은 방법 1 입니다.** `start.sh` + `serve.cjs` 로 WEB `:8081` 에서 직접 서빙하고,
> 번들이 API `:8080` 을 직접 호출합니다. 프록시가 없으니 CORS 만 API 가 처리합니다.

Nginx 를 앞단에 두려면(`:80` 에서 정적 파일 + `/api/` 프록시 + `/api/ai/chat` 무버퍼링을 함께 처리):

1. `dwje-ax.conf` 의 `root` 를 `/opt/dwje/web/dist` 로 맞춘 상태로 설치합니다(위 1~3번).
   Nginx 는 80 번을 쓰므로 WEB(:8081) 와는 충돌하지 않습니다. 둘 다 띄워도 됩니다.
2. **`:80` 으로 배포하려면 번들을 다시 만들어야 합니다.**
   번들에 박힌 API 주소가 `http://192.168.2.8:8080` 이기 때문에 프록시를 거치지 않습니다.
   `scripts/targets.cjs` 에 `nginx` 대상을 되살려 추가하십시오:
   ```js
   nginx: {
     id: 'nginx',
     label: '실서버 (Nginx)',
     desc: `사내 실서버 Nginx 프록시 경유 (${SERVER_HOST}:80) — VPN 필요`,
     needsVpn: true,
     env: { EXPO_PUBLIC_API_URL: `http://${SERVER_HOST}`, /* … */ },
   }
   ```
   그리고 `npm run build:web:nginx` 를 실행합니다.
3. 브라우저 Origin 이 `http://192.168.2.8:8081` 에서 `http://192.168.2.8` 으로 바뀌므로,
   API CORS 허용 목록(`CorsConfig.kt` 의 `allowedOriginPatterns`)에
   `http://192.168.2.8` (포트 없는 형식) 이 포함되는지 확인하십시오.
   지금은 `http://192.168.2.8:*` 만 있어서 **이 단계에서 API 수정이 필요합니다**.

| | 방법 1 (기본, `:8081`) | 방법 2 (선택, `:80`) |
| :--- | :--- | :--- |
| 구성 | `start.sh` + `serve.cjs` | Nginx 설치 필요 |
| 번들이 부르는 API | `192.168.2.8:8080` | `192.168.2.8` (프록시 경유) |
| CORS | API 가 `:8081` 출처 허용 | API 가 `:80` 출처까지 허용해야 함 |
| SSE 스트리밍 | 직결 — 정상 | `proxy_buffering off` 필요 |

---

## 6. 장애 대응 및 문제 해결 (Troubleshooting)

### Q1. `./start.sh` 실행 시 "포트 8080이 이미 사용 중입니다" 오류 발생
- **원인**: 이전 프로세스가 비정상 종료되었거나 다른 서비스가 포트를 점유함.
- **해결**:
  ```bash
  # 점유 중인 프로세스 확인
  sudo lsof -i :8080
  # 또는
  sudo fuser -v 8080/tcp

  # 점유 프로세스 강제 종료
  sudo fuser -k -KILL 8080/tcp
  ```

### Q2. `./start.sh` 실행 시 "환경변수가 누락되었습니다" 오류 발생
- **원인**: `prod` 프로파일 기동 시 필수 보안 변수가 누락됨.
- **해결**:
  `/opt/dwje/api/config/api.env` 파일을 생성하고 운영 정보를 입력합니다:
  ```bash
  cp /opt/dwje/api/config/api.env.example /opt/dwje/api/config/api.env
  nano /opt/dwje/api/config/api.env
  ```
  *(주요 항목: `PROD_DB_PASSWORD`, `PROD_JWT_SECRET`, `PROD_MAIL_*`)*

### Q3. 우분투 서버에서 `sh start.sh` 실행 시 문법 에러가 나는 경우
- **원인**: 우분투의 기본 `/bin/sh`는 `dash` 쉘입니다.
- **해결**: 제공된 모든 스크립트(`start.sh`, `stop.sh`, `status.sh`)에는 `dash`로 실행되더라도 스스로 `bash`를 찾아 재실행하는 방어 코드가 내장되어 있습니다. 그래도 문제가 있다면 항상 `./start.sh` 또는 `bash start.sh`로 실행하십시오.

### Q4. 브라우저는 열리는데 화면이 모두 비어 있습니다 (가장 흔함)

- **원인 (거의 확실)**: VPN 이 꺼져 있습니다.
  `192.168.2.8` 은 사내망 주소라 VPN 이 활성화되어 있어야 닿습니다.
  브라우저는 WEB(`:8081`) 정적 번들을 내려받으므로 **화면 껍데기는 뜨지만**,
  그 안의 API(`:8080`) 호출은 전부 실패합니다 — 그래서 로그인 화면도, 목록도 비어 보입니다.
- **해결**:
  1. VPN 연결 후 다시 접속
  2. **API(8080) 따로** 확인 — WEB 이 열리는 것과 API 가 떠 있는 것은 별개입니다:
     ```bash
     npm run env:check            # 192.168.2.8:8080 (API)
     curl -s -o /dev/null -w '%{http_code}\n' http://192.168.2.8:8080/v3/api-docs
     curl -s -o /dev/null -w '%{http_code}\n' http://192.168.2.8:8081/health   # WEB
     ```
  3. 번들이 다른 주소를 보고 있을 수도 있습니다 — 실제로 박힌 **API 주소** 확인:
     ```bash
     grep -rho '192\.168\.2\.8[:0-9]*' dist/_expo/static/js/ | sort -u   # → 192.168.2.8:8080 이어야 함
     ```

### Q4-1. WEB(8081)은 되는데 API(8080) 요청이 CORS 로 막혔습니다

- **원인**: WEB 포트를 바꿨거나 Nginx(`:80`) 를 앞단에 두어 **Origin 이 바뀌었는데**
  API 의 CORS 허용 목록에 그 출처가 없습니다.
  API 는 `http://192.168.2.8:*` 만 허용합니다 (`CorsConfig.kt`).
- **해결**: `../API/src/main/kotlin/com/dwje/api/config/CorsConfig.kt` 의
  `allowedOriginPatterns` 에 실제 Origin 을 넣고 API 를 재기동합니다.
  브라우저 콘솔에 차단된 Origin 이 그대로 찍힙니다.

### Q5. 개발 중인데 실서버 DB 에 데이터가 기록됐습니다

- **원인**: `npm run web:server` 로 실서버(API `192.168.2.8:8080`)에 붙은 상태에서 등록·수정·삭제를 했습니다.
  실서버 대상은 운영 DB 를 직접 읽고 씁니다.
- **확인 방법**: 상단바에 `API 192.168.2.8:8080 (http) · 실서버` 배지가 붙어 있습니다.
  로컬(`localhost:8080`)에서는 배지가 나오지 않습니다.
- **해결**: 개발·디버깅은 `npm run web`(로컬)로 하십시오.
  실서버는 화면 시연과 최종 확인에만 씁니다.

### Q6. 빌드했는데 로컬 개발이 실서버를 봅니다

- **원인 (2026-09-28 이전 스크립트)**: 빌드 중 `.env` 를 고쳤다 되돌리는 방식이어서,
  `Ctrl-C` 로 끊기면 배포 주소가 `.env` 에 남았습니다.
- **현재**: 대상 값을 빌드 프로세스 환경변수로만 주입합니다. `.env` 는 건드리지 않습니다.
- **옛 상태가 남아 있다면** 수동으로 정리하십시오:
  ```bash
  grep -n 'EXPO_PUBLIC_API_URL' .env    # http://localhost:8080 로 되돌릴 것
  ```
