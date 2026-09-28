/**
 * 접속 대상 진단(`shared/utils/logApiTarget.js`) 실행 검사
 *
 * 왜 필요한가
 *  `check:syntax` 는 파싱만 합니다 — **미선언 변수는 잡지 못합니다.**
 *  실제로 2026-09-28 에 이 유틸 때문에 두 번 문제가 났습니다.
 *    ① `host` 를 선언하지 않고 참조 → 앱이 크래시 ("host is not defined")
 *    ② 루프백에 포트가 붙은 것을 실서버로 오판 → 로컬 개발에 운영 DB 경고
 *  Console.log 하나를 넣었다가 앱 전체가 죽거나, 정반대 경고를 내는 셈이라
 *  이 유틸은 파싱이 아니라 **실행으로** 확인합니다.
 *
 *   node scripts/check-target-log.cjs
 *
 * 원본 모듈을 그대로 쓰고 `@services/api/client` 주입만 바꿔 다섯 경우를 각각 실행합니다.
 * (문자열을 복사하지 않으니 로직이 갈라지지 않습니다)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { TARGETS } = require('./targets.cjs');

const srcPath = path.resolve(__dirname, '../src/shared/utils/logApiTarget.js');
const IMPORT_LINE = "import { API_BASE_URL, USE_MOCK, LIVE_AUTH } from '@services/api/client';";

/** 원본을 그대로 쓰되 client 주입만 바꾼 임시 모듈을 만들어 실행합니다 */
async function runWith({ apiUrl, useMock, liveAuth, id }) {
  const source = fs.readFileSync(srcPath, 'utf8');
  if (!source.includes(IMPORT_LINE)) {
    throw new Error(`client import 패턴이 없습니다 — logApiTarget.js 의 import 를 확인하십시오 (${IMPORT_LINE})`);
  }

  const stub = [
    `const API_BASE_URL = ${JSON.stringify(apiUrl)};`,
    `const USE_MOCK = ${useMock ? 'true' : 'false'};`,
    `const LIVE_AUTH = ${liveAuth ? 'true' : 'false'};`,
  ].join('\n');

  const file = path.join(os.tmpdir(), `logApiTarget-${id}.mjs`);
  fs.writeFileSync(file, source.replace(IMPORT_LINE, stub));

  const out = [];
  const originalLog = console.log;
  console.log = (...args) => out.push(args.map(String).join(' '));
  try {
    const mod = await import(pathToFileURL(file).href + '?t=' + Date.now());
    mod.logApiTarget();
  } finally {
    console.log = originalLog;
    fs.rmSync(file, { force: true });
  }
  return out.join('\n');
}

const CASES = [
  { id: 'local', apiUrl: TARGETS.local.env.EXPO_PUBLIC_API_URL, useMock: false, liveAuth: true,
    expect: ['로컬 API', 'http://localhost:8080'], reject: ['실서버', '운영 DB', '⚠'] },
  { id: 'mock', apiUrl: TARGETS.mock.env.EXPO_PUBLIC_API_URL, useMock: true, liveAuth: false,
    expect: ['목(mock) — 백엔드 없음', '인증        목'], reject: ['실서버', '운영 DB'] },
  { id: 'server', apiUrl: TARGETS.server.env.EXPO_PUBLIC_API_URL, useMock: false, liveAuth: true,
    expect: ['실서버 — VPN 필요', '운영 DB 에 반영', 'VPN 이 활성화되어 있어야'], reject: [] },

  // 회귀 방지 — 루프백에 포트가 붙어도 실서버로 오판하면 안 됩니다
  { id: 'loopback-8787', apiUrl: 'http://127.0.0.1:8787', useMock: false, liveAuth: true,
    expect: ['로컬 API'], reject: ['실서버', '운영 DB'] },
  { id: 'loopback-ipv6', apiUrl: 'http://[::1]:8080', useMock: false, liveAuth: true,
    expect: ['로컬 API'], reject: ['실서버', '운영 DB'] },

  // 주소가 비었거나 형식이 틀려도 죽지 않고 판단 없이 원본을 보여 줍니다
  { id: 'empty-url', apiUrl: '', useMock: false, liveAuth: true,
    expect: ['(없음)', '로컬 API'], reject: ['실서버'] },
  { id: 'broken-url', apiUrl: ':::not a url', useMock: false, liveAuth: true,
    expect: [':::not a url', '로컬 API'], reject: ['실서버'] },
];

(async () => {
  let failed = 0;
  console.log('\n[접속 대상 진단 실행 검사]\n');

  for (const c of CASES) {
    try {
      const out = await runWith(c);
      const missing = c.expect.filter((e) => !out.includes(e));
      const leaked = (c.reject || []).filter((e) => out.includes(e));
      if (missing.length || leaked.length) {
        failed += 1;
        if (missing.length) console.error(`  ✗ ${c.id} — 출력에 없는 문자열: ${missing.join(', ')}`);
        if (leaked.length) console.error(`  ✗ ${c.id} — 나오면 안 되는 문자열: ${leaked.join(', ')}`);
        console.error(out);
      } else {
        console.log(`  ✓ ${c.id}`);
      }
    } catch (e) {
      failed += 1;
      console.error(`  ✗ ${c.id} — 예외: ${e.message}`);
    }
  }

  if (failed) {
    console.error(`\n실행 검사 실패 ${failed}건 — 앱을 죽이거나 정반대로 경고할 수 있습니다.\n`);
    process.exit(1);
  }
  console.log(`\n실행 검사 통과 (${CASES.length}건) — 참조 오류 없음, 로컬/실서버 판정 정확.\n`);
})();
