/**
 * 대상(target) 접속 확인 — VPN 이 필요한지, API 가 살아 있는지 미리 봅니다.
 *
 *   node scripts/check-target.cjs          # 기본 = server
 *   node scripts/check-target.cjs local
 *   node scripts/check-target.cjs list
 *
 * 실서버 대상(192.168.2.8)은 VPN 이 꺼져 있으면 연결 자체가 되지 않습니다.
 * 화면을 열었다 멈춘 이유를 여기서 먼저 밝힙니다.
 */
const { resolveTarget, allTargets, banner, probeUrl, DEFAULT_TARGET, TargetError } = require('./targets.cjs');

const args = process.argv.slice(2);
const first = args.find((a) => !a.startsWith('-'));

if (first === 'list' || args.includes('--list')) {
  console.log('\n확인 가능한 대상:');
  allTargets().forEach((t) => console.log(`  ${t.id.padEnd(8)} ${t.desc}`));
  console.log('');
  process.exit(0);
}

let target;
try {
  target = resolveTarget(first || DEFAULT_TARGET);
} catch (e) {
  if (e instanceof TargetError) {
    console.error(`\n[대상 오류] ${e.message}\n`);
    process.exit(1);
  }
  throw e;
}
const url = probeUrl(target.id);
process.stdout.write(banner(target.id));
console.log(`  확인 중  ${url}\n`);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5000);

fetch(url, { signal: controller.signal })
  .then((res) => {
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`  ✗ 응답 ${res.status} — 서버는 닿지만 이 경로가 없거나 권한이 걸렸습니다.\n`);
      process.exit(1);
    }
    console.log('  ✓ 접속 가능 (API 문서 경로 응답)\n');
  })
  .catch((e) => {
    clearTimeout(timer);
    const aborted = e.name === 'AbortError';
    console.error(`  ✗ 접속 실패 — ${aborted ? '5초 안에 응답이 없습니다 (타임아웃)' : e.message}\n`);
    if (target.needsVpn) {
      console.error('  사내 주소입니다. 가장 흔한 원인은 VPN 이 꺼져 있는 것입니다.\n');
      console.error('    · VPN 연결 후 다시 실행:  npm run env:check -- ' + target.id + '\n');
      console.error('    · 대상 자체를 바꾸기:   npm run web  (로컬) / npm run web:server  (실서버)\n');
    } else {
      console.error('    · 로컬 API 를 띄웠는지 보십시오:  cd ../API && ./gradlew bootRun --args=\'--spring.profiles.active=local\'\n');
    }
    process.exit(1);
  });
