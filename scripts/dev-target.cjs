/**
 * 개발 서버 실행 — 대상(target)을 골라 붙입니다.
 *
 *   node scripts/dev-target.cjs local  --port 8081
 *   node scripts/dev-target.cjs server
 *   node scripts/dev-target.cjs mock
 *
 * .env 는 고치지 않습니다.
 *  @expo/env 는 시스템 환경변수를 .env 보다 먼저 씁니다
 *  (node_modules/@expo/env/build/index.js — "already defined and IS NOT overwritten")
 *  그래서 여기서 자식 프로세스 환경변수로만 주입하면 .env 는 그대로 남습니다.
 *
 * ★ 왜 대상마다 --clear 를 붙이느냐 (Metro 캐시)
 *   번들에 박히는 API 주소는 **빌드 시점에 정해집니다.** 그런데 Metro 의 변환 캐시 키에는
 *   process.env 값이 들어가지 않습니다
 *   (metro-transform-worker/src/index.js 의 getCacheKey — 파일 목록 · 설정 · babel 키만 해시).
 *   그래서 대상을 local → server 로 바꿔도 캐시가 살아 있으면 옛 API 주소로 빌드됩니다.
 *   화면은 열리는데 실서버(또는 로컬)를 보고 있지 않은, 가장 찾기 어려운 종류의 오동작입니다.
 *   그래서 대상을 고르면 기본적으로 캐시를 비웁니다.
 *   같은 대상을 계속 이어 가려면 SKIP_CLEAR=1 로 끄십시오 (그러면 시작이 빠릅니다).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { resolveTarget, targetEnv, banner, DEFAULT_DEV_TARGET, TargetError } = require('./targets.cjs');

const argv = process.argv.slice(2);
const first = argv.find((a) => !a.startsWith('-'));
const targetName = first || DEFAULT_DEV_TARGET;
const passthrough = argv.filter((a) => a !== first);

let target;
try {
  target = resolveTarget(targetName);
} catch (e) {
  if (e instanceof TargetError) {
    console.error(`\n[대상 오류] ${e.message}\n`);
    process.exit(1);
  }
  throw e;
}
// 직전에 실행한 대상을 기억해 두고, 대상이 달라졌는데 캐시를 안 비우는 실수를 막습니다.
const stampFile = path.join(os.tmpdir(), 'dwje-ax-dev-target');
let previous = '';
try {
  previous = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, 'utf8').trim() : '';
} catch {
  previous = '';
}

const skipClear = process.env.SKIP_CLEAR === '1';
if (skipClear && previous && previous !== target.id) {
  console.warn(
    `  [주의] 대상이 ${previous} → ${target.id} 로 바뀌었는데 SKIP_CLEAR=1 입니다.`,
  );
  console.warn('          Metro 캐시에 옛 API 주소가 남아 있을 수 있습니다. (npm run web 은 항상 비웁니다)');
}

const expoArgs = ['expo', 'start', '--web', ...(skipClear ? [] : ['--clear']), ...passthrough];

try {
  fs.writeFileSync(stampFile, target.id);
} catch {
  /* 임시 파일 못 쓰는 환경은 무시합니다 */
}

process.stdout.write(banner(targetName));

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
async function start() {
  const { ensureLocalLlm } = require('./ensure-local-llm.cjs');
  const proxy = target.id === 'local' && target.env.EXPO_PUBLIC_LLM_API_URL
    ? await ensureLocalLlm(target.env.EXPO_PUBLIC_LLM_API_URL)
    : null;
  const child = spawn(npx, expoArgs, {
    stdio: 'inherit',
    env: { ...process.env, ...targetEnv(targetName) },
  });

  child.on('exit', (code, signal) => {
    process.exit(signal ? 1 : code ?? 0);
  });
  ['SIGINT', 'SIGTERM'].forEach((sig) =>
    process.on(sig, () => {
      proxy?.kill(sig);
      child.kill(sig);
    }),
  );
}
start().catch((error) => {
  console.error(`[개발 서버] ${error.message}`);
  process.exit(1);
});
