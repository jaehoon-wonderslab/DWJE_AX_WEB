#!/usr/bin/env node
/**
 * 화면별 「보이는 열」 목록 생성 — 데이터 항목 관리(화면 보고 가리기)용
 *
 * 관리자는 「이 화면의 단가 열을 가리고 싶다」 로 생각합니다. 그러려면 화면에 **실제로 보이는 열 제목**과
 * 그 열이 읽는 값의 이름(응답 필드명)이 짝지어져 있어야 합니다. 그 짝은 화면 코드의 열 정의에 이미 있습니다.
 *   { title: '단가', field: 'unitPrice', … }   · Tabulator 열
 *   { key: 'unitPrice', title: '단가', … }     · 공통 Table 열
 * 메뉴(menu.js) → 라우트 파일(app/(main)/<path>.jsx) → 그 파일이 가져오는 src/domains 파일을 따라가며
 * 열 정의를 모아 화면별로 적습니다. 사람이 손으로 목록을 관리하지 않습니다.
 *
 *   node scripts/build-screen-columns.cjs          생성
 *   node scripts/build-screen-columns.cjs --check  생성물이 최신인지만 확인(다르면 exit 1)
 *
 * 산출물: src/domains/system/model/screenColumns.generated.js (커밋합니다 — 빌드 없이도 화면이 씁니다)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/domains/system/model/screenColumns.generated.js');

/** 값이 아니라 화면 장치인 열 — 가릴 대상이 아닙니다 */
const UI_ONLY = new Set(['act', 'action', 'actions', 'state', 'status', 'no', 'idx', 'index', 'check', 'select', 'selected', 'rank', 'screens', 'meaning', 'buttons', 'edit', 'delete', 'more', 'expand', 'toggle', 'sparkline', 'chart', 'bar']);
const isValueKey = (k) => /^[a-z][A-Za-z0-9]*$/.test(k) && !UI_ONLY.has(k) && !/^(c|col|dept_|m)\d+$/.test(k) && !k.startsWith('dept_');

/** menu.js 에서 { id, name, path, group } 를 읽습니다(import 하지 않고 글자로 — 빌드 도구 없이 돌게) */
function readMenu() {
  const src = fs.readFileSync(path.join(ROOT, 'src/shared/constants/menu.js'), 'utf8');
  const items = [];
  let group = '';
  for (const line of src.split('\n')) {
    const g = /group:\s*'([^']+)'/.exec(line);
    if (g) group = g[1];
    const m = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*path:\s*'([^']+)'/.exec(line);
    if (m) items.push({ id: m[1], name: m[2], path: m[3], group });
  }
  return items;
}

const fileOf = (base) => {
  for (const ext of ['', '.jsx', '.js', '/index.jsx', '/index.js']) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
};

/**
 * 공통 컴포넌트 묶음(`@shared/components/ui` 등)의 index — 이름 → 파일.
 * 묶음을 통째로 따라가면 모든 표가 모든 화면에 붙습니다. **화면이 실제로 가져온 이름**의 파일만 따라갑니다.
 * (예: 실적 집계·조회의 표는 공통 폴더의 TabulatorTable 안에 열이 정의돼 있습니다)
 */
const barrelCache = new Map();
function barrelMap(indexFile) {
  if (barrelCache.has(indexFile)) return barrelCache.get(indexFile);
  const map = new Map();
  const src = fs.readFileSync(indexFile, 'utf8');
  for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const target = fileOf(path.resolve(path.dirname(indexFile), m[2]));
    if (!target) continue;
    m[1].split(',').forEach((part) => {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) map.set(name, target);
    });
  }
  barrelCache.set(indexFile, map);
  return map;
}

/** import 문 하나 → 따라갈 파일들. src/domains 전부 · src/shared 는 가져온 이름의 파일만 */
function resolveImport(from, spec, names) {
  let base;
  if (spec.startsWith('@domains/')) base = path.join(ROOT, 'src/domains', spec.slice('@domains/'.length));
  else if (spec.startsWith('@shared/components/')) base = path.join(ROOT, 'src/shared/components', spec.slice('@shared/components/'.length));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return [];
  const f = fileOf(base);
  if (!f) return [];
  if (/[\\/]index\.jsx?$/.test(f) && f.includes(`${path.sep}src${path.sep}shared${path.sep}`)) {
    const map = barrelMap(f);
    return names.map((n) => map.get(n)).filter(Boolean);
  }
  return [f];
}

const inScope = (f) => f.includes(`${path.sep}src${path.sep}domains${path.sep}`) || f.includes(`${path.sep}src${path.sep}shared${path.sep}components${path.sep}`);

function reachableFiles(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
      const names = [...(m[1].match(/\{([^}]*)\}/)?.[1] || '').split(',').map((x) => x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)];
      // 공통 폴더에서는 화면 전용 표만 — 공통 부품(Table · TabulatorGrid …)끼리 서로 가져오는 것은 따라가지 않습니다
      if (f.includes(`${path.sep}src${path.sep}shared${path.sep}`)) continue;
      resolveImport(f, m[2], names).filter(inScope).forEach((r) => stack.push(r));
    }
  }
  return [...seen].filter(inScope);
}

/** 파일 → [{ title, field }] — title 과 가장 가까운 field/key 를 짝짓습니다(같은 객체 안, 앞뒤 240자) */
function columnsOf(file) {
  // 주석 속 사용 예(`{ key:'id', title:'설비', width:90 }`)를 열로 읽지 않게 블록 주석을 지웁니다
  const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const out = [];
  const titles = [...src.matchAll(/\btitle:\s*(['"`])([^'"`$\n]{1,40})\1/g)];
  titles.forEach((t, i) => {
    const start = Math.max(i ? titles[i - 1].index + titles[i - 1][0].length : 0, t.index - 240);
    const end = Math.min(i + 1 < titles.length ? titles[i + 1].index : src.length, t.index + t[0].length + 240);
    const win = src.slice(start, end);
    const rel = t.index - start;
    let best = null;
    for (const m of win.matchAll(/\b(field|key):\s*(['"])([A-Za-z_$][\w$]*)\2/g)) {
      const d = Math.abs(m.index - rel);
      // 사이에 객체 경계(`},`)가 있으면 다른 열의 것입니다
      const between = win.slice(Math.min(m.index, rel), Math.max(m.index, rel));
      if ((between.match(/\}\s*,/g) || []).length) continue;
      if (!best || d < best.d) best = { d, field: m[3], at: m.index };
    }
    // 표의 열인지 — 열 정의에는 폭·정렬·그리기 속성이 붙습니다. 탭·모달 제목·폼 필드(title+key)를 걸러 냅니다
    if (best) {
      const lo = Math.min(best.at, rel);
      const obj = win.slice(Math.max(0, lo - 120), Math.min(win.length, Math.max(best.at, rel) + 160));
      if (!/\b(width|minWidth|widthGrow|flex|formatter|render|hozAlign|align|sorter)\s*:/.test(obj)) best = null;
    }
    const title = t[2].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (best && isValueKey(best.field) && title && !/^[A-Za-z_]+$/.test(title)) out.push({ title, field: best.field });
  });
  return out;
}

function build() {
  const screens = [];
  for (const item of readMenu()) {
    // 라우트는 파일(`/report/ship-plan.jsx`) 이거나 폴더(`/report/scrap/index.jsx`)입니다
    const route = [`${item.path}.jsx`, `${item.path}/index.jsx`].map((r) => path.join(ROOT, 'app/(main)', r)).find((r) => fs.existsSync(r));
    if (!route) continue;
    const byField = new Map();
    for (const f of reachableFiles(route)) {
      for (const c of columnsOf(f)) {
        // 같은 값이 여러 표에 나오면 처음 제목 하나만 — 제목이 다르면 둘 다 보여 줍니다
        const k = `${c.field}|${c.title}`;
        if (!byField.has(k)) byField.set(k, c);
      }
    }
    const columns = [...byField.values()];
    if (columns.length) screens.push({ id: item.id, name: item.name, group: item.group, columns });
  }
  const body = `/**
 * 자동 생성 — 직접 고치지 마십시오. \`node scripts/build-screen-columns.cjs\` 로 다시 만듭니다.
 *
 * 화면(메뉴)마다 실제로 보이는 표의 열 제목과 그 열이 읽는 값 이름(응답 필드명)입니다.
 * 데이터 항목 관리(화면 보고 가리기)가 이 목록으로 「이 화면의 어떤 열을 가릴지」를 보여 줍니다.
 */
export const SCREEN_COLUMNS = ${JSON.stringify(screens, null, 2)};
`;
  return body;
}

const next = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== next) {
    console.error('screenColumns.generated.js 가 화면 코드와 다릅니다 — node scripts/build-screen-columns.cjs 로 다시 만드세요.');
    process.exit(1);
  }
  console.log('화면 열 목록 최신');
} else {
  fs.writeFileSync(OUT, next);
  const data = JSON.parse(next.slice(next.indexOf('['), next.lastIndexOf(']') + 1));
  console.log(`화면 ${data.length}곳 · 열 ${data.reduce((a, s) => a + s.columns.length, 0)}개 → ${path.relative(ROOT, OUT)}`);
}
