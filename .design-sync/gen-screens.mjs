// 앱 화면(라우트)을 claude.ai/design 컴포넌트로 노출하는 파일들을 생성합니다 — 실행: node .design-sync/gen-screens.mjs
//  · .design-sync/screens/index.jsx  : 라우트 표 등록 + DwjeApp(전체 앱 셸) + Screen* (화면 단위) export
//  · .design-sync/docs/<Name>.md     : 화면 설명 (category: screens)
//  · .design-sync/previews/<Name>.tsx: 미리보기 (없는 것만 생성 — 손으로 고친 파일은 보존)
//  · config.json                     : componentSrcMap · dtsPropsFor · overrides 갱신
// 메뉴 정의(src/shared/constants/menu.js)가 진실이므로 메뉴가 바뀌면 다시 실행합니다.
import { build } from '../.ds-sync/node_modules/esbuild/lib/main.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const r = await build({
  stdin: { contents: `export { permRows, MENU, EXTRA_PAGES, HOME_PATH } from './src/shared/constants/menu.js';`, resolveDir: root, loader: 'js' },
  bundle: true, format: 'esm', write: false, platform: 'neutral',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@shared\// }, (a) => ({ path: join(root, 'src/shared', a.path.slice(8)) + (a.path.endsWith('.js') ? '' : '.js') })); } }],
});
const menu = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
const rows = menu.permRows();
const hubs = menu.MENU.filter((g) => g.hubPath && !g.hidden);

const pascal = (id) => id.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('');
const routeFile = (path) => {
  for (const cand of [`app/(main)${path}.jsx`, `app/(main)${path}/index.jsx`]) if (existsSync(join(root, cand))) return cand;
  return null;
};

const screens = []; // { name, path, file, title, description, group }
for (const row of rows) {
  const file = routeFile(row.path);
  if (!file) { console.error(`! 라우트 파일 없음: ${row.path}`); continue; }
  screens.push({ name: `Screen${pascal(row.id)}`, id: row.id, path: row.path, file, title: row.name, description: row.description || '', group: row.group });
}
for (const g of hubs) {
  const file = routeFile(g.hubPath);
  if (!file) continue;
  screens.push({ name: `ScreenMenu${pascal(g.hubPath.split('/').pop())}`, id: `hub:${g.group}`, path: g.hubPath, file, title: `${g.group} 허브`, description: g.description || `${g.group} 대메뉴의 하위 화면 카드 목록입니다.`, group: g.group });
}
const auth = [
  { name: 'LoginScreen', path: '/login', file: 'app/(auth)/login.jsx', title: '로그인', description: '사번·비밀번호 로그인 화면. 데모에서는 어떤 값으로 제출해도 기본 계정으로 로그인됩니다.' },
  { name: 'SignupScreen', path: '/signup', file: 'app/(auth)/signup.jsx', title: '회원가입', description: '계정 신청 화면.' },
  { name: 'ForgotPasswordScreen', path: '/forgot-password', file: 'app/(auth)/forgot-password.jsx', title: '비밀번호 찾기', description: '비밀번호 재설정 요청 화면.' },
];
// 라우트 표에는 exports 가 아닌 것도 넣습니다(리다이렉트·not-found·숨은 허브)
const extraRoutes = [
  { path: '/', file: 'app/index.jsx' },
  { path: '/menu/production', file: 'app/(main)/menu/production.jsx' },
  { path: '/menu/quality', file: 'app/(main)/menu/quality.jsx' },
  { path: '/menu/alert', file: 'app/(main)/menu/alert.jsx' },
].filter((x) => existsSync(join(root, x.file)));

const all = [...screens, ...auth];
const imp = (file) => `../../${file}`;
let out = `/**
 * 앱 화면을 디자인 시스템 컴포넌트로 노출합니다 — node .design-sync/gen-screens.mjs 가 생성 (직접 고치지 마세요)
 *
 * 실제 앱과 같은 파일(app/**, 레이아웃, 컨트롤러, 뷰)을 그대로 번들합니다. 차이는 셋뿐입니다.
 *  1) expo-router → 메모리 라우터 셤(.design-sync/shims/expo-router.jsx)   2) API → 목 데이터(process.env 셤)
 *  3) 인증 → 데모 자동 로그인: 기본 계정(20140901 시스템 · 통합관리자 · 전체 권한)
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { registerRoutes, router } from 'expo-router';
import '@services/setup';
import { DEFAULT_USER } from '@shared/constants/accounts';
import { HOME_PATH } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useAppStore } from '@shared/stores/useAppStore';
import { fetchDataRange } from '@domains/common/model/dataRangeRepository';
import RootLayout from '${imp('app/_layout.jsx')}';
import MainLayout from '${imp('app/(main)/_layout.jsx')}';
import AuthLayout from '${imp('app/(auth)/_layout.jsx')}';
import NotFound from '${imp('app/+not-found.jsx')}';
`;
const seen = new Map();
const varOf = (file) => { if (!seen.has(file)) seen.set(file, `Page${seen.size}`); return seen.get(file); };
for (const s of [...all, ...extraRoutes]) out += `import ${varOf(s.file)} from '${imp(s.file)}';\n`;
out += `
/* ── 데모 로그인 — 번들이 로드되는 순간 기본 계정(통합관리자, 전체 권한)으로 들어갑니다 ── */
const demoAuth = useAuthStore.getState();
if (!demoAuth.isLoggedIn) {
  demoAuth.setLogin(DEFAULT_USER, { accessToken: 'demo-access', refreshToken: 'demo-refresh' });
  demoAuth.setMe({ user: DEFAULT_USER, dept: DEFAULT_USER.dept, menuPerms: '*', dataPerms: '*', servingModelVer: 'v2.3.1' });
}
// 화면들의 날짜 기본값 — 목 실적 보유 기간을 한 번 받아 둡니다 (단독 화면도 레이아웃 없이 쓰기 위함)
if (!useAppStore.getState().dataRange) fetchDataRange().then((res) => { if (res?.ok) useAppStore.getState().setDataRange(res.range); }).catch(() => {});

/* ── 라우트 표 ── */
const AUTH_PATHS = new Set(['/login', '/signup', '/forgot-password']);
registerRoutes({
  layouts: [
    { match: (p) => AUTH_PATHS.has(p), component: AuthLayout },
    { match: (p) => p !== '/' && !AUTH_PATHS.has(p), component: MainLayout },
  ],
  pages: {
${[...all, ...extraRoutes].map((s) => `    '${s.path}': ${varOf(s.file)},`).join('\n')}
  },
  notFound: NotFound,
});

/**
 * 덕우전자 AX 웹 앱 전체 — 사이드바·상단바·AI 질의 레일을 포함한 실제 셸에 화면을 띄웁니다.
 * 메뉴를 누르면 메모리 라우터로 화면이 바뀝니다(주소창은 바뀌지 않음). 부모에 높이를 주지 않으면 100vh 를 씁니다.
 * 데모 계정(통합관리자)으로 자동 로그인되고 모든 데이터는 목(mock)입니다.
 */
export function DwjeApp({ initialPath = HOME_PATH, height = '100vh', width = '100%' }) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => { router.replace(initialPath); setReady(true); }, [initialPath]);
  return (
    <div style={{ height, width, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {ready ? <RootLayout /> : null}
    </div>
  );
}

/* ── 화면 단위 컴포넌트 — 셸 없이 본문만. 부모(div)에 높이를 주고 넣으세요 ── */
function Frame({ path, children }) {
  useLayoutEffect(() => { router.replace(path); }, [path]);
  // 실적 보유 기간(목 응답)을 받은 뒤 화면을 올립니다 — 컨트롤러의 날짜 기본값이 baseDate(마지막 실적일)를 쓰기 때문
  const dataRange = useAppStore((s) => s.dataRange);
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 1500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', background: '#fff' }}>
      {dataRange || waited ? children : null}
    </div>
  );
}
`;
for (const s of all) {
  out += `\n/** ${s.title} — ${s.path}${s.description ? ` · ${s.description}` : ''} */\nexport const ${s.name} = () => <Frame path="${s.path}"><${varOf(s.file)} /></Frame>;\n`;
}
mkdirSync(join(here, 'screens'), { recursive: true });
writeFileSync(join(here, 'screens', 'index.jsx'), out);

/* ── docs ── */
const docsDir = join(here, 'docs'); mkdirSync(docsDir, { recursive: true });
const appDoc = `---
category: screens
---
# DwjeApp — 앱 전체 셸

덕우전자 AX 웹 앱을 그대로 띄우는 컴포넌트입니다. 좌측 사이드바(메뉴), 상단바(브레드크럼 · AI 질의 버튼 · 알림 종 · 계정), 본문 패널, 필요 시 AI 질의 레일까지 실제 레이아웃(app/(main)/_layout.jsx)입니다. 메뉴를 누르면 화면이 바뀌고, 각 화면은 실제 컨트롤러·뷰가 목(mock) 데이터로 동작합니다.

- \`initialPath\`: 처음 보여 줄 경로. 예 \`/ai/chat\`(기본) · \`/dashboard/ai\` · \`/production/result\` · \`/menu/report\` · \`/system/account\`.
- \`height\`(기본 \`100vh\`) · \`width\`(기본 \`100%\`): 셸이 채울 크기. 셸은 스크롤하지 않고 패널마다 스크롤합니다.
- 로그인: 데모 계정 **20140901 시스템(통합관리자, 전체 메뉴·데이터 권한)** 으로 자동 로그인됩니다. 로그인 화면은 \`LoginScreen\` 을 따로 쓰세요.
- 페이지에 \`DwjeApp\` 은 **하나만** 두세요(라우터 상태를 공유합니다).

\`\`\`jsx
<DwjeApp initialPath="/dashboard/ai" height="100vh" />
\`\`\`

경로 목록: ${screens.map((s) => `\`${s.path}\`(${s.title})`).join(' · ')}
`;
writeFileSync(join(docsDir, 'DwjeApp.md'), appDoc);
for (const s of all) {
  const body = `---
category: screens
---
# ${s.name} — ${s.title}

경로 \`${s.path}\`${s.group ? ` · 메뉴 그룹 **${s.group}**` : ''}. ${s.description || ''}

실제 앱의 라우트 파일(\`${s.file}\`)을 그대로 렌더한 **화면 본문**입니다(사이드바·상단바 없음). 컨트롤러가 목(mock) API 를 호출해 데이터를 채우고, 데모 계정(통합관리자)으로 로그인된 상태입니다. 부모 컨테이너에 높이를 주세요(내부 PageContainer 가 그 높이 안에서 스크롤). 셸까지 포함한 화면은 \`<DwjeApp initialPath="${s.path}" />\` 를 쓰세요.

\`\`\`jsx
<div style={{ height: 800 }}><${s.name} /></div>
\`\`\`
`;
  writeFileSync(join(docsDir, `${s.name}.md`), body);
}

/* ── previews (없는 것만) ── */
const prevDir = join(here, 'previews');
const appPrev = join(prevDir, 'DwjeApp.tsx');
if (!existsSync(appPrev)) {
  const cells = [
    ['Home', '/ai/chat'], ['DashboardAi', '/dashboard/ai'], ['DashboardProcess', '/dashboard/process'], ['ProductionResult', '/production/result'],
    ['QualityDefect', '/quality/defect'], ['ReportPicker', '/menu/report'], ['SystemAccount', '/system/account'],
  ];
  writeFileSync(appPrev, `import './_rnw';\nimport React from 'react';\nimport { DwjeApp } from 'dwje-ax-web';\n\n` +
    cells.map(([n, p]) => `/** ${p} */\nexport const ${n} = () => (\n  <div style={{ width: 1440, height: 900 }}>\n    <DwjeApp initialPath="${p}" height={900} />\n  </div>\n);\n`).join('\n'));
}
for (const s of all) {
  const f = join(prevDir, `${s.name}.tsx`);
  if (existsSync(f)) continue;
  writeFileSync(f, `import './_rnw';\nimport React from 'react';\nimport { ${s.name} } from 'dwje-ax-web';\n\n/** ${s.title} — ${s.path} (데모 계정 · 목 데이터) */\nexport const Default = () => (\n  <div style={{ width: 1280, height: 800 }}>\n    <${s.name} />\n  </div>\n);\n`);
}

/* ── config ── */
const cfgPath = join(here, 'config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.componentSrcMap ??= {}; cfg.dtsPropsFor ??= {}; cfg.overrides ??= {};
cfg.componentSrcMap.DwjeApp = '.design-sync/screens/index.jsx';
cfg.dtsPropsFor.DwjeApp = "/** 처음 보여 줄 경로 (기본 '/ai/chat') */ initialPath?: string; /** 셸 높이 (기본 '100vh') */ height?: number | string; /** 셸 폭 (기본 '100%') */ width?: number | string;";
cfg.overrides.DwjeApp = { cardMode: 'single', primaryStory: 'Home', viewport: '1440x900' };
for (const s of all) {
  cfg.componentSrcMap[s.name] = '.design-sync/screens/index.jsx';
  cfg.dtsPropsFor[s.name] = '/** props 없음 — 데모 계정·목 데이터로 렌더합니다. 부모 컨테이너에 높이를 주세요 */';
  cfg.overrides[s.name] = { cardMode: 'single', primaryStory: 'Default', viewport: '1320x860' };
}
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`screens: ${screens.length} + auth ${auth.length} + DwjeApp → screens/index.jsx, docs, previews, config`);
