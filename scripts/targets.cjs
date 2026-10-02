/**
 * 실행 대상(target) 정의 — 「어느 서버에 붙는가」를 한 곳에서 관리합니다.
 *
 * 왜 한 곳에 모았나
 *  · 192.168.2.8 은 **VPN 이 켜져 있어야만 닿는 사내 실서버**입니다.
 *    VPN 없이 그 주소로 열면 모든 요청이 조용히 실패합니다 —
 *    화면만 보면 원인을 알기 어려우므로, 대상을 명령 한 글자로 고르고 상태를 미리 찍습니다.
 *  · `.env` 를 손대지 않고도 대상을 고를 수 있게 했습니다.
 *    주입은 자식 프로세스의 환경변수로 합니다.
 *    (@expo/env 는 시스템 환경변수를 .env 보다 우선하므로 .env 는 고쳐지지 않습니다)
 *
 * 사내 배포 구조 — 두 개 포트가 역할이 다릅니다
 *   192.168.2.8:8081   WEB  (정적 번들을 serve.cjs 가 서빙) ← 사람이 여는 주소
 *   192.168.2.8:8080   API  (Spring Boot)                  ← 번들이 호출하는 주소
 *   번들은 8081 에서 열렸는데도 API 주소는 8080 입니다 (교차 출처).
 *   API CORS 는 http://192.168.2.8:* 를 허용하므로 문제없습니다
 *   (../API/src/main/kotlin/com/dwje/api/config/CorsConfig.kt).
 *
 * 대상 3종
 *   local   로컬 API (localhost:8080) — VPN 불필요
 *   mock    백엔드 없이 목 데이터 — API 주소 자체를 쓰지 않음
 *   server  실서버 API (192.168.2.8:8080) — **VPN 필요**
 */

/** 사내 실서버 — VPN 이 활성화되어 있어야만 접근됩니다 */
const SERVER_HOST = '192.168.2.8';
/** 사내 실서버의 WEB 포트 — 사람이 여는 주소 (start.sh 기본값) */
const SERVER_WEB_PORT = 8081;
/** 사내 실서버의 API 포트 — 번들이 호출하는 주소 */
const SERVER_API_PORT = 8080;
/**
 * GPU 서버 vLLM — 채팅(OpenAI 호환, 모델 dwje-ax · google/gemma-4-26B-A4B-it). VPN 필요.
 * 번들은 이 주소를 부르지 않습니다. 로컬 LLM 프록시(scripts/local-gateway-proxy.cjs)만 씁니다.
 * (2026-10-02 게이트웨이 :11436 에서 옮김)
 */
const SERVER_LLM_PORT = 8000;
/** GPU 서버 임베딩(BAAI/bge-m3, /v1/embeddings) — API 서버만 부릅니다 */
const SERVER_EMBED_PORT = 8001;

const TARGETS = {
  local: {
    id: 'local',
    label: '로컬',
    desc: '로컬에서 띄운 API 서버 (localhost:8080)',
    needsVpn: false,
    env: {
      EXPO_PUBLIC_API_URL: 'http://localhost:8080',
      EXPO_PUBLIC_USE_MOCK: 'false',
      EXPO_PUBLIC_LIVE_AUTH: 'true',
      // 로컬 LLM 시험용 loopback gateway proxy (scripts/local-gateway-proxy.cjs).
      // 비우고 싶으면 '' — 그러면 로컬 API 서버의 /api/ai/chat 을 경유합니다.
      EXPO_PUBLIC_LLM_API_URL: 'http://localhost:8787',
      EXPO_PUBLIC_TARGET_LABEL: '로컬 (npm run web)',
    },
  },
  mock: {
    id: 'mock',
    label: '목(mock)',
    desc: '백엔드 없이 명세 기반 목 데이터로 화면만',
    needsVpn: false,
    env: {
      EXPO_PUBLIC_API_URL: 'http://localhost:8080',
      EXPO_PUBLIC_USE_MOCK: 'true',
      EXPO_PUBLIC_LIVE_AUTH: 'false',
      EXPO_PUBLIC_LLM_API_URL: '',
      EXPO_PUBLIC_TARGET_LABEL: '목(mock) (npm run web:mock)',
    },
  },
  server: {
    id: 'server',
    label: '실서버',
    desc: `사내 실서버 API (${SERVER_HOST}:${SERVER_API_PORT}) — VPN 필요`,
    needsVpn: true,
    env: {
      EXPO_PUBLIC_API_URL: `http://${SERVER_HOST}:${SERVER_API_PORT}`,
      EXPO_PUBLIC_USE_MOCK: 'false',
      EXPO_PUBLIC_LIVE_AUTH: 'true',
      // 비워 두면 번들이 EXPO_PUBLIC_API_URL/api/ai/chat 을 부릅니다.
      // LLM 서버 주소를 클라이언트 번들에 넣지 않는 방식입니다.
      EXPO_PUBLIC_LLM_API_URL: '',
      EXPO_PUBLIC_TARGET_LABEL: '실서버 (npm run web:server / build:web)',
    },
  },
};

const DEFAULT_TARGET = 'server';
const DEFAULT_DEV_TARGET = 'local';

class TargetError extends Error {}

/** 대상 이름을 검증합니다. 잘못된 이름이면 TargetError 를 던집니다 (스택트레이스 없이) */
function resolveTarget(name) {
  const id = String(name || '').trim();
  if (!id) return null;
  if (!TARGETS[id]) {
    throw new TargetError(
      `대상 '${id}' 는 없습니다. 사용 가능: ${Object.keys(TARGETS).join(' · ')}  (npm run env:check -- list)`,
    );
  }
  return TARGETS[id];
}

/** 대상의 EXPO_PUBLIC_* 값 모음 (자식 프로세스 환경변수로 그대로 씁니다) */
function targetEnv(name) {
  return { ...resolveTarget(name).env };
}

/** 대상 정의 전체 (표시용) */
function allTargets() {
  return Object.values(TARGETS);
}

/**
 * 시작할 때 찍는 안내창.
 * 어느 서버에 붙는지 · VPN 이 필요한지 · 실서버면 「운영 데이터」 경고까지 한눈에 보이게 합니다.
 */
function banner(name) {
  const t = resolveTarget(name);
  const line = '─'.repeat(66);
  const rows = [
    `대상        ${t.label}  (${t.id})`,
    `API 주소    ${t.env.EXPO_PUBLIC_API_URL}`,
    `모드        ${t.env.EXPO_PUBLIC_USE_MOCK === 'true' ? '목(mock)' : '실 서버'}`,
  ];
  if (t.env.EXPO_PUBLIC_LLM_API_URL) rows.push(`LLM 직접    ${t.env.EXPO_PUBLIC_LLM_API_URL}  (로컬 gateway proxy)`);
  if (t.needsVpn) {
    rows.push('');
    rows.push(`⚠  ${SERVER_HOST} 은 사내망 주소입니다.`);
    rows.push('   VPN 이 활성화되어 있어야만 닿습니다. 안 켜면 모든 요청이 실패합니다.');
    rows.push(`   배포된 화면: http://${SERVER_HOST}:${SERVER_WEB_PORT}`);
    rows.push('   상태 확인: npm run env:check');
  }
  if (t.id === 'server') {
    rows.push('');
    rows.push('   이 대상은 사내 실서버 DB 를 직접 읽고 씁니다. 등록·수정·삭제도 반영됩니다.');
  }
  return [`\n┌${line}\n│ ${t.desc}\n├${line}`, ...rows.map((r) => `│ ${r}`), `└${line}\n`].join('\n');
}

/** 접속 확인에 쓸 URL — 대상별 API 서버에서 실제로 받는 경로 */
function probeUrl(name) {
  return `${resolveTarget(name).env.EXPO_PUBLIC_API_URL}/v3/api-docs`;
}

module.exports = {
  SERVER_HOST,
  SERVER_WEB_PORT,
  SERVER_API_PORT,
  SERVER_LLM_PORT,
  SERVER_EMBED_PORT,
  TARGETS,
  TargetError,
  DEFAULT_TARGET,
  DEFAULT_DEV_TARGET,
  resolveTarget,
  targetEnv,
  allTargets,
  banner,
  probeUrl,
};
