/**
 * 배포용 정적 번들 생성기 — 대상(target)을 골라 빌드합니다.
 *
 *   node scripts/build-deploy.cjs                 # 기본 = server (실서버 :8080 직접)
 *   node scripts/build-deploy.cjs --target=nginx  # 실서버 Nginx(:80) 경유
 *   node scripts/build-deploy.cjs --target=local  # 로컬 API 주소로 빌드 (로컬에서 결과물 확인)
 *   node scripts/build-deploy.cjs --list          # 대상 목록
 *
 * .env 는 고치지 않습니다 (2026-09-28 부터).
 *  이전에는 빌드 중에 .env 를 고쳤다 되돌렸는데, 그 사이 Ctrl-C 로 끊기면
 *  배포 주소가 그대로 남아 로컬 개발이 실서버를 보게 되는 사고가 났습니다.
 *  지금은 자식 프로세스 환경변수로만 주입합니다 —
 *  @expo/env 는 시스템 환경변수를 .env 보다 먼저 씁니다.
 */
const { spawnSync } = require('child_process');
const {
  resolveTarget,
  targetEnv,
  banner,
  allTargets,
  DEFAULT_TARGET,
  probeUrl,
  TargetError,
} = require('./targets.cjs');

// ── 1. 인자에서 대상 고르기 ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--list') || args.includes('list')) {
  console.log('\n빌드 대상:');
  allTargets().forEach((t) => {
    console.log(`  ${t.id.padEnd(8)} ${t.desc}`);
  });
  console.log(`\n  기본값: ${DEFAULT_TARGET}\n`);
  process.exit(0);
}

const targetArg =
  args.find((a) => a.startsWith('--target='))?.slice('--target='.length) || args[0] || DEFAULT_TARGET;

let target;
try {
  target = resolveTarget(targetArg);
} catch (e) {
  if (e instanceof TargetError) {
    console.error(`\n[대상 오류] ${e.message}\n`);
    process.exit(1);
  }
  throw e;
}

// ── 2. 번들 생성 ────────────────────────────────────────────────────────────────
process.stdout.write(banner(target.id));

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['expo', 'export', '--platform', 'web', '--clear'], {
  stdio: 'inherit',
  env: { ...process.env, ...targetEnv(target.id) },
});

if (result.error) {
  console.error(`[배포 빌드 실패] ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);

// ── 3. 배포 패키지 구성 ─────────────────────────────────────────────────────────
const prepare = spawnSync(process.execPath, ['scripts/prepare-deploy.cjs'], {
  stdio: 'inherit',
  env: { ...process.env, BUILD_TARGET: target.id },
});

if (prepare.error) {
  console.error(`[배포 패키지 구성 실패] ${prepare.error.message}`);
  process.exit(1);
}

// ── 4. 어디에 올릴 수 있는지까지 한 번 더 ───────────────────────────────────────
console.log('──────────────────────────────────────────────────────────────────────');
console.log(`  빌드 대상   : ${target.label} (${target.id})`);
console.log(`  번들 API    : ${target.env.EXPO_PUBLIC_API_URL}`);
console.log(`  접속 확인   : ${probeUrl(target.id)}`);
if (target.needsVpn) {
  console.log('  ⚠ 실서버 주소입니다 — 전송·확인 전에 VPN 이 켜져 있는지 보십시오.');
  console.log(`    상태 확인: npm run env:check -- ${target.id}`);
}
console.log('──────────────────────────────────────────────────────────────────────\n');

process.exit(prepare.status || 0);
