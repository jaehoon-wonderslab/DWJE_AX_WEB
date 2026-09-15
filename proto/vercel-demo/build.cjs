/**
 * 데모 사이트 빌드 — `proto/vercel-demo/dist/index.html` **파일 하나**를 만듭니다.
 *
 * ## 왜 한 파일인가
 * 두 가지를 동시에 만족해야 하기 때문입니다.
 *  1. **더블클릭해서 열리기** — `file://` 로 열어도 그대로 돌아야 합니다.
 *  2. **Vercel 에 올리기** — 정적 호스팅에 그대로 올라가야 합니다.
 *
 * Expo 의 정적 내보내기(`expo export`)는 라우트마다 HTML 을 만들고 자산을 `/_expo/...` 절대 경로로
 * 가리킵니다. 서버에 올리면 잘 돌지만 **`file://` 에서는 경로가 어긋나 아무것도 뜨지 않습니다.**
 * 게다가 경로 기반 라우팅이라 `history.pushState` 가 `file://` 에서 막힙니다.
 * 그래서 esbuild 로 **해시 라우팅(`#/quality/aoi`) 단일 번들**을 만들어 HTML 안에 통째로 넣습니다.
 * 글꼴·이미지도 data URI 로 박아 외부 요청이 0건입니다.
 *
 * ## 화면 코드는 본 앱 그대로입니다
 * `app/` 과 `src/` 를 **복사하지 않고 그 자리에서** 번들합니다. 컴포넌트·CSS·레이아웃이 같은 파일이므로
 * 사내 화면과 다를 수가 없습니다. 바뀐 것은 둘뿐입니다.
 *  · `expo-router` → 해시 라우터 대체 구현(`standalone-router.jsx`) — 화면이 쓰는 8개 심볼을 그대로 냅니다
 *  · 데이터 계층 → 목(mock). `EXPO_PUBLIC_*` 을 번들에 박아 넣습니다
 *
 * 만드는 법:  npm run build:proto
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const here = __dirname;
const rootDir = path.resolve(here, '..', '..');
const outDir = path.join(here, 'dist');
const tmpDir = path.join(here, '.tmp');
const entryFile = path.join(rootDir, '__standalone-entry.jsx');
/*
 * 라우터 대체 구현도 **저장소 뿌리에 복사해 두고** 번들합니다.
 *
 * 원본은 `proto/vercel-demo/` 에 두지만, 그 자리에서 번들하면 shim 의 `import React from 'react'` 가
 * 가장 가까운 `proto/node_modules/react` 로 풀립니다. 그러면 React 가 **두 벌** 들어가고,
 * react-dom 이 렌더하는 React 와 shim 이 훅을 부르는 React 가 달라져
 * `ReactSharedInternals.H` 가 null 인 채 `useSyncExternalStore` 에서 터집니다(빈 화면).
 * 뿌리에 두면 앱과 같은 `node_modules/react` 한 벌만 씁니다.
 */
const shimSource = path.join(here, 'standalone-router.jsx');
const shimFile = path.join(rootDir, '__standalone-router.jsx');
const bundleFile = path.join(tmpDir, 'bundle.js');
const fontDir = path.join(rootDir, 'ds-bundle', 'fonts');

/** 번들에 박아 넣을 데모 환경 — 서버가 없으므로 인증까지 목으로 돌립니다 */
const DEMO_ENV = {
  EXPO_PUBLIC_USE_MOCK: 'true',
  EXPO_PUBLIC_LIVE_AUTH: 'false',
  // 로그인 화면을 건너뛰지 않습니다 (요구: 로그인도 더미 데이터로)
  EXPO_PUBLIC_DEMO_AUTOLOGIN: 'false',
  EXPO_PUBLIC_MOCK_DELAY: '120',
  EXPO_PUBLIC_API_URL: '',
};

/** 인증 화면 — 이 셋만 `(auth)` 레이아웃을 씁니다 */
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];

/** `app/` 아래 라우트 파일 (`_layout` · `+not-found` 같은 특수 파일 제외) */
function routeFiles(dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) routeFiles(p, out);
    else if (name.endsWith('.jsx') && !name.startsWith('_') && !name.startsWith('+')) out.push(p);
  }
  return out;
}

/** `app/(main)/quality/aoi.jsx` → `/quality/aoi` — 그룹 `(main)` 은 주소에 들어가지 않습니다 */
function routePath(file) {
  const rel = path.relative(path.join(rootDir, 'app'), file);
  return `/${rel.replace(/\([^/]+\)[\\/]/g, '').replace(/\\/g, '/').replace(/\.jsx$/, '').replace(/(^|\/)index$/, '')}`;
}

console.log('[proto] 단일 파일 데모를 만듭니다 — file:// 로도 열립니다');
fs.copyFileSync(shimSource, shimFile);
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

// ── 1. 진입점 생성 — 라우트를 전부 정적으로 import 해 한 번들에 담습니다 ──────────
const routes = routeFiles(path.join(rootDir, 'app'));
const imports = routes.map((p, i) => `import Page${i} from ${JSON.stringify(`./${path.relative(rootDir, p).replace(/\\/g, '/')}`)};`);
const table = routes.map((p, i) => `${JSON.stringify(routePath(p))}: Page${i}`).join(', ');

fs.writeFileSync(entryFile, `/* 빌드가 만든 파일입니다 — 끝나면 지워집니다 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import RootLayout from './app/_layout';
import AuthLayout from './app/(auth)/_layout';
import MainLayout from './app/(main)/_layout';
// 반드시 'expo-router' 로 가져옵니다 — 상대 경로로 가져오면 alias 로 들어온 것과
// **다른 모듈**이 되어 Slot 의 context 가 둘로 갈립니다(화면이 빈 채로 뜹니다)
import { WithSlot, usePathname } from 'expo-router';
${imports.join('\n')}

const PAGES = { ${table} };
const AUTH = ${JSON.stringify(AUTH_ROUTES)};

function App() {
  const pathname = usePathname();
  const Page = PAGES[pathname] || PAGES['/login'];
  const Layout = AUTH.includes(pathname) ? AuthLayout : MainLayout;
  return (
    <WithSlot slot={<WithSlot slot={<Page />}><Layout /></WithSlot>}>
      <RootLayout />
    </WithSlot>
  );
}

createRoot(document.getElementById('root')).render(<App />);
`);

// ── 2. esbuild 로 한 덩어리 번들 ─────────────────────────────────────────────
const defines = Object.entries(DEMO_ENV).map(([k, v]) => `--define:process.env.${k}="${v}"`);
try {
  execFileSync('npm', [
    'exec', '--yes', '--package=esbuild', '--', 'esbuild',
    path.relative(rootDir, entryFile),
    '--bundle',
    '--format=iife',
    '--platform=browser',
    '--target=es2020',
    '--jsx=automatic',
    '--main-fields=browser,module,main',
    '--resolve-extensions=.web.jsx,.web.js,.jsx,.js,.json',
    '--alias:react-native=react-native-web',
    `--alias:expo-router=${shimFile}`,
    '--define:process.env.NODE_ENV="production"',
    '--define:__DEV__=false',
    '--loader:.js=jsx',
    '--loader:.png=dataurl',
    '--loader:.jpg=dataurl',
    '--loader:.ttf=dataurl',
    ...defines,
    '--tsconfig=jsconfig.json',
    `--outfile=${path.relative(rootDir, bundleFile)}`,
  ], { cwd: rootDir, stdio: 'inherit' });
} finally {
  fs.rmSync(entryFile, { force: true });
  fs.rmSync(shimFile, { force: true });
}

// ── 3. 글꼴·전역 CSS 를 모아 한 파일로 ───────────────────────────────────────
// `</script` 가 본문에 있으면 인라인 스크립트가 거기서 끊깁니다
const js = fs.readFileSync(bundleFile, 'utf8').replace(/<\/script/gi, '<\\/script');

let css = fs.existsSync(path.join(tmpDir, 'bundle.css')) ? fs.readFileSync(path.join(tmpDir, 'bundle.css'), 'utf8') : '';

// 글꼴은 data URI 로 박습니다 — 외부에서 받아 오면 file:// 에서 글꼴이 빠집니다
if (fs.existsSync(path.join(fontDir, 'fonts.css'))) {
  css += fs.readFileSync(path.join(fontDir, 'fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, (_, name) => {
    const file = path.join(fontDir, name.replace(/["']/g, '').trim());
    return fs.existsSync(file) ? `url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')})` : `url(${name})`;
  });
} else {
  console.warn('[proto] 경고 — ds-bundle/fonts 가 없어 글꼴을 넣지 못했습니다');
}

// 앱의 전역 CSS 는 `app/+html.jsx` 안에 문자열로 들어 있습니다
const htmlSource = fs.readFileSync(path.join(rootDir, 'app', '+html.jsx'), 'utf8');
css += htmlSource.split('const GLOBAL_CSS = `')[1]?.split('`;')[0] || '';

// ── 4. 브라우저에 없는 전역을 채웁니다 ───────────────────────────────────────
/*
 * Node 전역을 기대하는 코드가 번들 안에 섞여 있습니다(라이브러리 쪽입니다).
 * `process.env.X` 처럼 **정확한 모양**만 esbuild 가 바꿔 주고, 맨 `process` 참조는 그대로 남아
 * 열자마자 `ReferenceError: process is not defined` 로 화면이 비어 버립니다.
 * 번들보다 먼저 한 번 채워 둡니다.
 */
const SHIM = [
  'var global=globalThis;',
  'if(typeof globalThis.process==="undefined"){globalThis.process={env:{NODE_ENV:"production"},browser:true,platform:"browser",version:"",nextTick:function(cb){Promise.resolve().then(cb)}};}',
  'var process=globalThis.process;',
].join('');

// ── 5. 한 파일로 써 냅니다 ───────────────────────────────────────────────────
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>덕우전자 AX · 데모</title><style>html,body,#root{height:100%;margin:0}body{overflow:hidden}#root{display:flex}${css}</style></head><body><div id="root"></div><script>${SHIM}</script><script>${js}</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);

// Vercel 은 설정이 없어도 index.html 을 그대로 내보냅니다. 캐시만 정리해 둡니다.
fs.writeFileSync(path.join(outDir, 'vercel.json'), `${JSON.stringify({ cleanUrls: true, trailingSlash: false }, null, 2)}\n`);

fs.rmSync(tmpDir, { recursive: true, force: true });

const mb = (fs.statSync(path.join(outDir, 'index.html')).size / 1024 / 1024).toFixed(1);
console.log(`\n[proto] 완료 — proto/vercel-demo/dist/index.html (${mb} MB · 화면 ${routes.length}개)`);
console.log('[proto] 그냥 보기:  더블클릭 (file:// 로 열립니다)');
console.log('[proto] 배포:      npx vercel deploy --prod proto/vercel-demo/dist');
