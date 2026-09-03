/**
 * 표 컬럼 ↔ 응답 필드 — 빈 칸으로 그려지는 열이 없는가
 *
 * 감사 로그가 `group` · `note` 열을 그리고 있었는데 서버는 `dept` · `detail` 로 줍니다.
 * 두 열이 계속 비어 있었지만 화면은 멀쩡히 그려져서 렌더 검사에 걸리지 않았습니다.
 *
 * 뷰 파일에서 컬럼 키를 뽑아, 그 화면이 쓰는 API 의 실제 행에 그 키가 있는지 봅니다.
 */
const fs = require('fs');
const path = require('path');
const { suite, test, beforeAll, eq, skip } = require('../lib/runner');
const api = require('../lib/api');
const { fixtures } = require('../lib/fixtures');

const SRC = path.join(__dirname, '..', '..', 'src', 'domains');
const CATALOG = path.join(__dirname, '..', '..', 'src', 'services', 'api', 'endpoints.js');

/**
 * 자료가 0건인 표는 응답에서 필드를 뽑을 수 없습니다.
 * 그때는 카탈로그에 적힌 응답 형태(`items[{a,b,c}]`)로 대신 확인합니다.
 * 로컬에 자료가 없는 화면이 많아, 이게 없으면 검사가 대부분 건너뜁니다.
 */
function declaredFields(apiPath) {
  const src = fs.readFileSync(CATALOG, 'utf8');
  const re = new RegExp(`path: '/api/v1${apiPath.replace(/[.*+?^$()|[\\]\\\\]/g, '\\$&')}',[\\s\\S]{0,400}?response: '([^']*)'`);
  const m = src.match(re);
  if (!m) return [];
  const inner = m[1].match(/\{([^}]*)\}/);
  if (!inner) return [];
  return inner[1].split(',').map((x) => x.split(':')[0].trim().replace(/\[\]$/, '')).filter(Boolean);
}

/**
 * 화면 표 ↔ 그 표를 채우는 API
 *
 * 한 화면에 표가 여러 개인 경우가 있어(AI 대시보드는 설비·알림·Agent 3개) 엔드포인트를 여러 개 받습니다.
 * 컬럼 키가 그중 **하나에라도** 있으면 통과입니다.
 * [뷰 파일, [[엔드포인트, 파라미터, 목록 키], …]]
 */
const TABLES = (f) => [
  ['system/view/AuditLogView.jsx', [['/audit-logs', { size: 5 }, 'items']]],
  ['system/view/ChatHistoryView.jsx', [['/ai/chat/history', { size: 5 }, 'items']]],
  ['production/view/ProductionMonitorView.jsx', [['/production/monitor/equipments', { size: 5 }, 'items']]],
  ['production/view/ProductionResultView.jsx', [['/production/results', { from: f.monthFrom, to: f.monthTo, unit: 'day' }, 'items']]],
  ['system/view/MetricStdView.jsx', [
    ['/metrics/standards', { size: 5 }, 'items'],
    ['/metrics/standards/history', { size: 5 }, 'items'],
  ]],
  ['system/view/AlertCondView.jsx', [
    ['/alert-conditions', { size: 5 }, 'items'],
    ['/alert-recipient-groups', {}, 'items'],
  ]],
  ['system/view/RecipientView.jsx', [
    ['/alert-recipients', { size: 5 }, 'items'],
    ['/alert-recipient-groups', {}, 'items'],
    ['/alert-duties', {}, 'items'],
    ['/alert-escalation-rules', {}, 'items'],
  ]],
  ['system/view/SyncHistoryView.jsx', [
    ['/sync/jobs', { size: 5 }, 'items'],
    ['/sync/runs', { size: 5 }, 'items'],
    ['/sync/schema-drift', {}, 'items'],
    ['/sync/maps', {}, 'items'],
  ]],
  ['alert/view/AlertListView.jsx', [
    ['/alerts', { size: 5 }, 'items'],
    ['/alerts/escalation-targets', {}, 'items'],
    ['/alerts/send-logs', {}, 'items'],
  ]],
  ['system/view/AccountView.jsx', [
    ['/system/users', { size: 5 }, 'items'],
    ['/system/depts', {}, 'items'],
    ['/system/perm-logs', { size: 5 }, 'items'],
  ]],
  ['dashboard/view/AiDashboardView.jsx', [
    ['/dashboard/ai/lines', { date: f.baseDate, size: 5 }, 'lines'],
    ['/dashboard/ai/agents', {}, 'agents'],
    ['/dashboard/ai/alerts', { hours: 24 }, 'alerts'],
  ]],
];

/**
 * 뷰 파일에서 **응답 필드를 그대로 읽는** 컬럼 키만 뽑습니다.
 *
 * `render` 가 있는 열은 키가 데이터 경로가 아니라 식별자일 뿐이라 제외합니다.
 * (`key:'current'` 인데 render 안에서 `r.currentValue` 를 쓰는 식)
 */
function columnKeys(file) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  const keys = [];
  // { key: 'x', title: … } 한 덩어리를 통째로 잡아 render 유무를 봅니다
  const re = /\{\s*key:\s*'([^']+)'\s*,\s*title:[\s\S]*?\},?\n/g;
  let m;
  while ((m = re.exec(src))) {
    if (!/\brender:/.test(m[0])) keys.push(m[1]);
  }
  return [...new Set(keys)];
}

/**
 * 요약 카드가 객체를 그대로 그리는지 — 표 검사로는 안 잡히는 자리입니다.
 *
 * `/download-logs/summary` 의 `topUser` 가 `{name, cnt}` 객체인데
 * `<StatCard value={summary.topUser}>` 로 넘겨 화면이 통째로 죽었습니다.
 * 이력이 0건일 때는 null 이라 조용했고, 데이터가 생기자 드러났습니다.
 */
const SUMMARIES = [
  ['/download-logs/summary', {}],
  ['/system/accounts/summary', {}],
  ['/glossary/summary', {}],
  ['/metrics/standards/summary', {}],
  ['/alert-conditions/summary', {}],
  ['/alert-recipients/summary', {}],
  ['/sync/jobs/summary', {}],
  ['/ai/chat/history/summary', {}],
];

suite('표 컬럼 ↔ 응답 필드', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
    ctx.f = await fixtures();
  });

  test('컬럼 키가 응답 행에 존재한다', async () => {
    const bad = [];
    const empty = [];
    for (const [file, sources] of TABLES(ctx.f)) {
      const fields = new Set();
      for (const [path_, params, listKey] of sources) {
        const data = await api.data(path_, params).catch(() => null);
        const row = (data?.[listKey] || data?.items || [])[0];
        if (row) Object.keys(row).forEach((k) => fields.add(k));
        else declaredFields(path_).forEach((k) => fields.add(k)); // 자료가 없으면 카탈로그로
      }
      if (!fields.size) { empty.push(`${file} (${sources.map((x) => x[0]).join(', ')})`); continue; }
      const keys = columnKeys(file);
      // 화면에서 계산해 만드는 열(no · 순번 등)은 응답에 없어도 됩니다
      const computed = new Set(['no', 'idx', 'rank', 'bar', 'action', 'actions', '__total']);
      const missing = keys.filter((k) => !fields.has(k) && !computed.has(k));
      if (missing.length) {
        bad.push(`${file}: ${missing.join(', ')} — 응답 필드는 [${[...fields].join(', ')}]`);
      }
    }
    // 자료가 없는 표 하나 때문에 나머지 검사까지 건너뛰지 않습니다
    if (empty.length === TABLES(ctx.f).length) skip(`모든 표에 자료가 없습니다: ${empty.join(' / ')}`);
    eq(bad, [], `응답에 없는 키로 열을 그리면 그 칸은 늘 비어 있습니다${empty.length ? `
      (자료가 없어 확인 못 한 표: ${empty.join(' / ')})` : ''}`);
  });

  test('요약 응답의 객체 필드를 화면이 값으로 쓰지 않는다', async () => {
    // 객체인 필드를 찾아, 그 이름을 화면이 값 자리에 그대로 넘기는지 봅니다.
    const suspects = [];
    for (const [path_, params] of SUMMARIES) {
      const data = await api.data(path_, params).catch(() => null);
      if (!data) continue;
      Object.entries(data).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) suspects.push({ path: path_, key: k });
      });
    }
    if (!suspects.length) skip('요약 응답에 객체 필드가 없습니다 (자료가 없으면 null 로 옵니다)');

    // value={...summary.<key>} 형태로 넘기는 곳을 찾습니다
    const bad = [];
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? walk(full) : full.endsWith('.jsx') ? [full] : [];
    });
    const views = walk(SRC);
    suspects.forEach(({ path: p2, key }) => {
      views.forEach((file) => {
        const src = fs.readFileSync(file, 'utf8');
        const re = new RegExp(`value=\\{[^}]*summary\\??\\.${key}\\s*(\\?\\?|\\}|\\s)`, 'g');
        if (re.test(src)) bad.push(`${file.replace(SRC + '/', '')}: summary.${key} 는 객체입니다 (${p2})`);
      });
    });
    eq(bad, [], '객체를 값 자리에 넘기면 React 가 렌더하지 못해 화면이 통째로 죽습니다');
  });
});