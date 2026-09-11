#!/usr/bin/env bash
# =====================================================================================
#  덕우전자 AX 시스템 Web (dwje-ax-web) — 기동 스크립트
#
#  사용법 (백그라운드 실행, PID 파일 생성)
#    ./start.sh                           기본 포트(8081)로 기동
#    ./start.sh --port=3000               포트 지정 (예: 3000)
#
#  사용법 (포그라운드 실행 — 터미널에 콘솔 실시간 출력)
#    ./start.sh --foreground
#    ./start.sh -f --port=8081
#
#  빌드 산출물:
#    배포 전 반드시 'npm run build:web' 으로 dist/ 디렉토리를 생성해야 합니다.
# =====================================================================================
if [ -z "${BASH_VERSION:-}" ]; then
    if command -v bash >/dev/null 2>&1; then
        exec bash "$0" "$@"
    fi
    echo "[오류] 이 스크립트는 bash 가 필요합니다. 설치하십시오: sudo apt install -y bash" >&2
    exit 1
fi

set -euo pipefail

APP_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$APP_HOME/run"
PID_FILE="${PID_FILE:-$PID_DIR/dwje-web.pid}"
LOG_DIR="${LOG_DIR:-$APP_HOME/logs}"
CONSOLE_LOG="$LOG_DIR/console.out"
DIST_DIR="$APP_HOME/dist"

PORT="${PORT:-8081}"
FOREGROUND=0

log()  { printf '\033[1;34m[Web 기동]\033[0m %s\n' "$*"; }
info() { printf '\033[1;32m[성공]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[주의]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[오류]\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. 인자 파싱 ─────────────────────────────────────────────────────────────────────
for arg in "$@"; do
    case "$arg" in
        --port=*)       PORT="${arg#*=}" ;;
        -f|--foreground) FOREGROUND=1 ;;
        -h|--help)
            sed -n '2,/^# =\{10,\}$/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            warn "알 수 없는 옵션: $arg (무시됩니다)"
            ;;
    esac
done

# ── 2. Node.js 환경 검증 ─────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
    die "Node.js 실행 파일을 찾을 수 없습니다. Node 20 이상을 설치하십시오. (예: sudo apt install -y nodejs)"
fi

NODE_VER="$(node --version | tr -d 'v')"
NODE_MAJOR="$(echo "$NODE_VER" | cut -d. -f1)"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
    warn "Node.js 20 이상을 권장합니다. (현재 버전: v$NODE_VER)"
fi

# ── 3. 정적 배포 산출물 검증 ─────────────────────────────────────────────────────────
if [[ -f "$APP_HOME/index.html" ]]; then
    DIST_DIR="$APP_HOME"
elif [[ -d "$APP_HOME/dist" && -f "$APP_HOME/dist/index.html" ]]; then
    DIST_DIR="$APP_HOME/dist"
else
    die "정적 웹 배포 산출물(index.html)을 찾을 수 없습니다. 먼저 빌드를 수행하십시오:
    · 명령어: npm run build:web"
fi

# ── 4. 중복 기동 및 포트 점유 검사 ───────────────────────────────────────────────────
if [[ -f "$PID_FILE" ]]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
        die "Web 서버가 이미 실행 중입니다 (PID: $OLD_PID). 중지 후 다시 시도하십시오: ./stop.sh"
    fi
    rm -f "$PID_FILE"
fi

PORT_OCCUPIED=0
if command -v ss >/dev/null 2>&1; then
    if ss -tln | grep -q ":${PORT}\b"; then PORT_OCCUPIED=1; fi
elif command -v lsof >/dev/null 2>&1; then
    if lsof -ti ":$PORT" >/dev/null 2>&1; then PORT_OCCUPIED=1; fi
fi

if [[ "$PORT_OCCUPIED" -eq 1 ]]; then
    die "포트 ${PORT} 가 이미 다른 프로세스에 의해 사용 중입니다. 점유 중인 프로세스를 확인하십시오."
fi

mkdir -p "$PID_DIR" "$LOG_DIR"

log "배포 디렉토리 : $DIST_DIR"
log "서비스 포트   : $PORT"
log "Node 버전     : v$NODE_VER"

# ── 5. 기동 (포그라운드 / 백그라운드) ─────────────────────────────────────────────────
SERVE_SCRIPT=""
if [[ -f "$APP_HOME/scripts/serve.cjs" ]]; then
    SERVE_SCRIPT="$APP_HOME/scripts/serve.cjs"
elif [[ -f "$APP_HOME/serve.cjs" ]]; then
    SERVE_SCRIPT="$APP_HOME/serve.cjs"
else
    die "서빙 스크립트를 찾을 수 없습니다: serve.cjs"
fi

if [[ "$FOREGROUND" -eq 1 ]]; then
    log "포그라운드 모드로 시작합니다 (Ctrl+C 로 종료)..."
    exec node "$SERVE_SCRIPT" --port="$PORT" --dir="$DIST_DIR"
fi

log "백그라운드 모드로 기동합니다..."
nohup node "$SERVE_SCRIPT" --port="$PORT" --dir="$DIST_DIR" >> "$CONSOLE_LOG" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

log "PID $NEW_PID 발급 완료. 서버 초기화 대기 중..."

# ── 6. 기동 상태 헬스체크 (최대 15초 대기) ───────────────────────────────────────────
STARTED=0
for ((i=1; i<=15; i++)); do
    if ! kill -0 "$NEW_PID" 2>/dev/null; then
        rm -f "$PID_FILE"
        printf '\n'
        warn "서버 프로세스가 기동 중 비정상 종료되었습니다. 콘솔 로그를 확인하십시오:"
        echo "----------------------------------------------------------------------"
        tail -n 25 "$CONSOLE_LOG" || true
        echo "----------------------------------------------------------------------"
        die "기동 실패. 로그 파일: $CONSOLE_LOG"
    fi

    if command -v curl >/dev/null 2>&1; then
        HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" 2>/dev/null || true)"
        if [[ "$HTTP_STATUS" == "200" ]]; then
            STARTED=1
            break
        fi
    fi
    sleep 1
    printf '.'
done
printf '\n'

if [[ "$STARTED" -eq 1 ]]; then
    info "Web 서버가 성공적으로 기동되었습니다! (PID: $NEW_PID, PORT: $PORT, 소요: ${i}초)"
    echo "  · 서비스 URL   : http://localhost:${PORT}"
    echo "  · 헬스체크 URL : http://localhost:${PORT}/health"
    echo "  · 콘솔 로그    : tail -f $CONSOLE_LOG"
    echo "  · 중지 명령어 : ./stop.sh"
else
    if kill -0 "$NEW_PID" 2>/dev/null; then
        info "프로세스 실행 중 (PID: $NEW_PID). 응답 확인 중입니다. 로그를 확인하십시오: tail -f $CONSOLE_LOG"
    else
        rm -f "$PID_FILE"
        die "서버 기동에 실패했습니다. 로그를 확인하십시오: $CONSOLE_LOG"
    fi
fi
