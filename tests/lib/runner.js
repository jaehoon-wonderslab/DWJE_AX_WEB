/**
 * 최소 테스트 러너
 *
 * 외부 테스트 프레임워크를 두지 않았습니다. 이 프로젝트의 검사 스크립트(scripts/check-*.cjs)와
 * 같은 방식으로 `node` 만으로 돌아가야 CI·현장 PC 어디서든 그대로 실행할 수 있습니다.
 *
 * 사용 예)
 *   const { suite, test, run } = require('./lib/runner');
 *   suite('로그인', () => {
 *     test('시드 계정으로 로그인된다', async (t) => { ... });
 *   });
 *   run();
 */
const RESET = '\x1b[0m';
const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', gray: '\x1b[90m', bold: '\x1b[1m' };

const suites = [];
let current = null;

/** 테스트 묶음을 선언합니다 */
function suite(name, fn) {
  current = { name, tests: [], before: null, after: null };
  suites.push(current);
  fn();
  current = null;
}

/** 묶음 실행 전에 한 번 (브라우저 띄우기 등) */
function beforeAll(fn) {
  current.before = fn;
}
/** 묶음 실행 후에 한 번 */
function afterAll(fn) {
  current.after = fn;
}

/**
 * 테스트 하나를 선언합니다.
 * @param {string} name 무엇을 확인하는지
 * @param {Function} fn async (ctx) => void — 실패는 예외로 알립니다
 */
function test(name, fn) {
  current.tests.push({ name, fn });
}

/**
 * 이 환경에서는 돌릴 수 없는 테스트임을 알립니다.
 *
 * 실패와 구분합니다 — 실패는 "고쳐야 할 것", 건너뜀은 "여기서는 확인할 수 없는 것" 입니다.
 * 이유를 반드시 적어 주세요. 어떻게 하면 돌릴 수 있는지까지 쓰면 좋습니다.
 *
 * @param {string} reason 왜 돌릴 수 없는지 · 어떻게 하면 돌릴 수 있는지
 */
function skip(reason) {
  const e = new Error(reason);
  e.__skip = true;
  throw e;
}

/** 조건이 참이어야 합니다 */
function ok(cond, message) {
  if (!cond) throw new Error(message || '조건이 참이 아닙니다');
}

/** 두 값이 같아야 합니다 */
function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message || '값이 다릅니다'}\n      기대: ${b}\n      실제: ${a}`);
}

/** 숫자가 허용 오차 안이어야 합니다 (반올림·안분 차이 흡수) */
function near(actual, expected, tolerance, message) {
  const diff = Math.abs(Number(actual) - Number(expected));
  if (!(diff <= tolerance)) {
    throw new Error(`${message || '값 차이가 허용 범위를 넘습니다'}\n      기대: ${expected} ±${tolerance}\n      실제: ${actual} (차이 ${diff})`);
  }
}

/** 문자열에 특정 내용이 있어야 합니다 */
function contains(haystack, needle, message) {
  if (!String(haystack).includes(needle)) {
    throw new Error(`${message || '내용을 찾지 못했습니다'}\n      찾는 값: ${needle}`);
  }
}

/**
 * 선언된 묶음을 모두 실행하고 결과를 요약합니다.
 * @param {object} [opts] { filter: '묶음 이름 일부' }
 * @returns {Promise<number>} 실패 건수
 */
async function run(opts = {}) {
  const filter = opts.filter || process.argv.slice(2).find((a) => !a.startsWith('-'));
  const targets = filter ? suites.filter((s) => s.name.includes(filter)) : suites;

  let pass = 0;
  const failures = [];
  const skipped = [];
  const notRun = [];
  const started = Date.now();

  for (const s of targets) {
    console.log(`\n${C.bold}▸ ${s.name}${RESET}`);
    const ctx = {};
    if (s.before) {
      try {
        await s.before(ctx);
      } catch (e) {
        console.log(`  ${C.yellow}건너뜀${RESET} — 준비 실패: ${e.message}`);
        skipped.push({ suite: s.name, reason: e.message });
        continue;
      }
    }
    for (const t of s.tests) {
      try {
        await t.fn(ctx);
        pass += 1;
        console.log(`  ${C.green}✓${RESET} ${t.name}`);
      } catch (e) {
        if (e && e.__skip) {
          notRun.push({ suite: s.name, test: t.name, reason: e.message });
          console.log(`  ${C.yellow}○ ${t.name}${RESET}`);
          console.log(`    ${C.gray}${String(e.message).split('\n').join('\n    ')}${RESET}`);
        } else {
          failures.push({ suite: s.name, test: t.name, error: e });
          console.log(`  ${C.red}✕ ${t.name}${RESET}`);
          console.log(`    ${C.gray}${String(e.message).split('\n').join('\n    ')}${RESET}`);
        }
      }
    }
    if (s.after) {
      try {
        await s.after(ctx);
      } catch (e) {
        console.log(`  ${C.gray}정리 중 오류: ${e.message}${RESET}`);
      }
    }
  }

  const sec = ((Date.now() - started) / 1000).toFixed(1);
  const skipCnt = skipped.length + notRun.length;
  console.log(`\n${C.bold}결과${RESET}  통과 ${C.green}${pass}${RESET} · 실패 ${failures.length ? C.red : ''}${failures.length}${RESET}` +
    `${skipCnt ? ` · 건너뜀 ${C.yellow}${skipCnt}${RESET}` : ''}  (${sec}초)`);

  if (notRun.length) {
    console.log(`\n${C.yellow}건너뛴 항목 (환경이 갖춰지면 확인됩니다)${RESET}`);
    notRun.forEach((n, i) => console.log(`  ${i + 1}. [${n.suite}] ${n.test}\n     ${C.gray}${n.reason.split('\n')[0]}${RESET}`));
  }

  if (failures.length) {
    console.log(`\n${C.red}실패 목록${RESET}`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. [${f.suite}] ${f.test}`));
  }
  return failures.length;
}

module.exports = { suite, test, beforeAll, afterAll, skip, ok, eq, near, contains, run };
