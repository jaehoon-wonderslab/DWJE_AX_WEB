/**
 * 환경 점검 — `.env` 와 대상(target) 정의를 대조합니다.
 *
 * 왜 필요한가 (2026-09-28)
 *  · 과거 `build-deploy.cjs` 는 빌드 중 `.env` 를 **고쳤다 되돌리는** 방식이었습니다.
 *    그 사이 `Ctrl-C` 로 끊기면 실서버 주소가 `.env` 에 남습니다.
 *    남은 채로 `npm run web`(로컬)를 띄우면 로컬 개발이 조용히 실서버 DB 를 봅니다.
 *  · 지금은 대상 값을 프로세스 환경변수로만 주입하므로 `.env` 는 손대지 않습니다.
 *    이 스크립트는 「혹시 예전 방식으로 .env 가 오염됐는가」를 막아 줍니다.
 *
 *   node scripts/check-env.cjs
 *
 * `.env` 가 없으면 통과시킵니다 — 대상 스크립트는 .env 없이도 동작하기 때문입니다.
 */
const fs = require('fs');
const path = require('path');
const { TARGETS, SERVER_HOST, resolveTarget } = require('./targets.cjs');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

let problems = 0;
const fail = (msg) => {
  problems += 1;
  console.error(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

if (!fs.existsSync(envPath)) {
  console.log('\n.env 가 없습니다 — 대상 스크립트만 쓰면 문제없습니다 (npm run web / web:server)\n');
  process.exit(0);
}

console.log(`\n[환경 점검] ${envPath}\n`);
const text = fs.readFileSync(envPath, 'utf8');

/** .env 에서 키 값을 읽습니다 */
function readKey(key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : undefined;
}

const apiUrl = readKey('EXPO_PUBLIC_API_URL');

// ── 1. .env 에 사내 주소가 남아 있나 ──────────────────────────────────────────────
if (apiUrl && apiUrl.includes(SERVER_HOST)) {
  fail(`EXPO_PUBLIC_API_URL 이 사내 주소입니다: ${apiUrl}`);
  console.error(`    ${SERVER_HOST} 은 VPN 이 필요한 실서버입니다.`);
  console.error('    로컬 개발은 기본값을 되돌리십시오:');
  console.error(`      EXPO_PUBLIC_API_URL=http://localhost:8080`);
  console.error('    실서버로 개발하려면 npm run web:server 를 쓰십시오 (스크립트가 주입합니다).');
} else if (apiUrl === 'http://localhost:8080' || apiUrl === undefined) {
  ok(`EXPO_PUBLIC_API_URL 기본값 (${apiUrl ?? '없음'}) — 대상 스크립트가 실행 시 덮어씁니다`);
} else {
  console.log(`  · EXPO_PUBLIC_API_URL=${apiUrl} (기본값 아님 — 대상 스크립트가 덮어씁니다)`);
}

// ── 2. LLM 주소가 실서버 번들에 새어 나가진 않았나 ───────────────────────────────
// local 대상은 gateway proxy(localhost:8787) 를 쓰는 것이 정상입니다.
// 위험한 건 사내 주소를 .env 에 남겨 두는 것 — 그 값이 실서버 빌드까지 따라갑니다.
const llmUrl = readKey('EXPO_PUBLIC_LLM_API_URL') || '';
const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(llmUrl);
if (!llmUrl) {
  ok('EXPO_PUBLIC_LLM_API_URL 비어 있음 — 실서버 번들이 LLM 주소를 노출하지 않습니다');
} else if (isLoopback) {
  ok(`EXPO_PUBLIC_LLM_API_URL=${llmUrl} (루프백 gateway proxy — 실서버 빌드에서는 비워집니다)`);
} else {
  fail(`EXPO_PUBLIC_LLM_API_URL 에 사내 주소가 있습니다: ${llmUrl}`);
  console.error('    LLM 서버 주소가 클라이언트 번들에 들어가면 안 됩니다.');
  console.error('    실서버 번들은 API 의 /api/ai/chat 을 경유하도록 비워 두십시오:');
  console.error('      EXPO_PUBLIC_LLM_API_URL=');
}

// ── 3. 대상 정의를 모순 없이 읽을 수 있나 ────────────────────────────────────────
try {
  for (const id of Object.keys(TARGETS)) resolveTarget(id);
  ok(`대상 정의 ${Object.keys(TARGETS).length}종 정상 (${Object.keys(TARGETS).join(' · ')})`);
} catch (e) {
  fail(`대상 정의 오류 — ${e.message}`);
}

if (problems) {
  console.error(`\n환경 점검 실패 ${problems}건. 위를 고치고 나서 작업하십시오.\n`);
  process.exit(1);
}
console.log('\n환경 점검 통과.\n');
