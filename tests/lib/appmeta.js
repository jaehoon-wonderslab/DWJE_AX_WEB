/**
 * 앱 정의를 테스트에서 그대로 읽어 옵니다
 *
 * 화면 목록·엔드포인트 카탈로그를 테스트에 다시 적어 두면 금방 어긋납니다.
 * 소스(`src/shared/constants/menu.js`, `src/services/api/endpoints.js`)를 직접 파싱해
 * "코드에 있는 것" 을 기준으로 검사합니다.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'src');
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

/** 사이드바 메뉴 + 하위 화면 — [{ id, name, path, sub }] */
function screens() {
  const s = read('shared/constants/menu.js');
  const out = [];
  for (const m of s.matchAll(/\{ id: '([\w-]+)', name: '([^']+)', path: '([^']+)'/g)) {
    out.push({ id: m[1], name: m[2], path: m[3], sub: false });
  }
  for (const m of s.matchAll(/\{ id: '([\w-]+)', name: '([^']+)', path: '([^']+)', group: '([^']+)'/g)) {
    const found = out.find((x) => x.id === m[1]);
    if (found) found.sub = true;
  }
  // EXTRA_PAGES 는 group 을 가지므로 위에서 sub 로 표시됩니다
  return out;
}

/** 엔드포인트 카탈로그 — [{ key, method, path, domain, screen, params, live }] */
function endpoints() {
  const s = read('services/api/endpoints.js');
  const out = [];
  for (const [, key, body] of s.matchAll(/^ {2}(\w+): \{\n([\s\S]*?)\n {2}\},$/gm)) {
    const pick = (re) => (body.match(re) || [])[1];
    out.push({
      key,
      method: pick(/method: '([\w/]+)'/),
      path: pick(/path: '([^']+)'/),
      domain: pick(/domain: '([^']+)'/),
      screen: pick(/screen: '([^']+)'/),
      params: pick(/params: '([^']*)'/) || '',
      live: /live: true/.test(body),
    });
  }
  return out;
}

/** 서비스 함수 → 엔드포인트 키 (services/api/*Service.js) */
function serviceFunctions() {
  const dir = path.join(SRC, 'services', 'api');
  const map = {};
  for (const f of fs.readdirSync(dir)) {
    if (!/Service\.js$/.test(f)) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/export function (\w+)\(params\) \{\s*return request\('(\w+)'/g)) {
      map[m[1]] = m[2];
    }
  }
  return map;
}

/**
 * 화면(도메인)이 실제로 호출하는 엔드포인트 키를 리포지토리에서 찾아냅니다.
 * @returns {object} { 'domains/dashboard/model/dashboardRepository.js': ['getDashboardAiSummary', ...] }
 */
function repositoryCalls() {
  const fnToKey = serviceFunctions();
  const out = {};
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, f.name);
      if (f.isDirectory()) walk(fp);
      else if (/Repository\.js$/.test(f.name)) {
        const src = fs.readFileSync(fp, 'utf8');
        const keys = new Set();
        for (const m of src.matchAll(/\w+Service\.(\w+)\(/g)) {
          if (fnToKey[m[1]]) keys.add(fnToKey[m[1]]);
        }
        out[path.relative(SRC, fp)] = [...keys];
      }
    }
  };
  walk(path.join(SRC, 'domains'));
  return out;
}

module.exports = { screens, endpoints, serviceFunctions, repositoryCalls };
