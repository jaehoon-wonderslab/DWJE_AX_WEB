# 덕우전자 AX 시스템 — 우분투(Ubuntu) 실서버 배포 및 운영 가이드

본 문서는 덕우전자 AX 시스템(Spring Boot 백엔드 API 및 React Native Web 프론트엔드)을 **IntelliJ IDEA에서 빌드하여 우분투 실서버에 배포하고 안전하게 운영(start / stop / status)** 하기 위한 종합 가이드입니다.

---

## 1. 프로젝트 구성 및 빌드 산출물 요약

| 구분 | 모듈명 | 기술 스택 | IntelliJ 빌드 산출물 | 기본 포트 |
| :--- | :--- | :--- | :--- | :--- |
| **API (백엔드)** | `API` (dwje-api) | Kotlin 2.1, Spring Boot 3.4.4, JDK 21 | `build/libs/dwje-api-0.0.1.jar` | `8080` |
| **WEB (프론트)** | `WEB-ai_concep_design` (dwje-ax-web) | React Native for Web, Expo SDK 57, Node 20+ | `dist/` (정적 번들 디렉토리) | `8081` (또는 Nginx 80) |

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

우분투 서버 또는 Nginx에서 호스팅할 수 있는 정적 웹 번들을 빌드합니다.

#### IntelliJ에서 빌드 실행
1. IntelliJ에서 `WEB-ai_concep_design` 프로젝트를 엽니다.
2. IntelliJ 하단 **Terminal** 창을 엽니다.
3. 로컬 개발용 `.env`는 그대로 두고 배포 빌드를 실행합니다. `npm run build:web`이 배포용 API 주소를 자동으로 주입합니다:
   ```bash
   # 배포 빌드에만 자동 적용됩니다.
   # EXPO_PUBLIC_API_URL=http://192.168.2.8:8080
   # EXPO_PUBLIC_USE_MOCK=false
   ```
4. 빌드 명령어 실행:
   ```bash
   npm run build:web
   ```
   *(배포 API 주소와 실 API 모드를 주입한 뒤 `expo export --platform web`을 실행하고, 전체 라우트가 HTML/JS/CSS 번들로 컴파일됩니다)*

#### 산출물 위치
- **생성 경로**: `WEB-ai_concep_design/dist/`
- **구성 요소**: `dist/index.html`, `dist/login.html`, `dist/_expo/static/` 등 87개 이상의 최적화된 정적 페이지 및 번들

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
sudo apt install -y curl psmisc lsof iproute2 bash nginx

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

웹 프론트엔드는 **Node 기반 단독 실행(방법 1)** 과 **Nginx 리버스 프록시(방법 2 - 권장)** 중 선택할 수 있습니다.

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

- **Nginx 설정의 장점**:
  - `http://<서버IP>/` 접속 시 `/opt/dwje/web/dist`의 정적 리소스 초고속 서빙 (Gzip 압축 및 정적 번들 1년 캐싱 자동 적용).
  - `http://<서버IP>/api/*` 요청은 백엔드 Spring Boot `http://127.0.0.1:8080`으로 자동 안전 프록시 (CORS 문제 원천 차단).
  - 대용량 파일 업로드(50MB) 및 웹소켓(WebSocket) 지원 포함.

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
