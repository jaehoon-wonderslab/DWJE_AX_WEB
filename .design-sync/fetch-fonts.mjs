// 브랜드 글꼴을 내려받아 번들에 동봉합니다 — 실행: node .design-sync/fetch-fonts.mjs
//  · Pretendard Variable (dynamic subset, jsDelivr v1.3.9) — 한글
//  · Inter 200~700 · JetBrains Mono 400/500 (Google Fonts, woff2) — 라틴·숫자·코드
// 결과: .design-sync/fonts/fonts.css (+ woff2 파일들). woff2 는 gitignore — 새 클론에서는 이 스크립트를 먼저 실행.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = join(dirname(fileURLToPath(import.meta.url)), 'fonts');
mkdirSync(join(here, 'pretendard'), { recursive: true });
mkdirSync(join(here, 'google'), { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const get = async (url, asText) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return asText ? r.text() : Buffer.from(await r.arrayBuffer());
};
const dl = async (url, file) => { if (!existsSync(file)) writeFileSync(file, await get(url)); };
const pool = async (jobs, n = 8) => { const q = [...jobs]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) await q.shift()(); })); };

let out = '/* 덕우전자 AX 글꼴 — node .design-sync/fetch-fonts.mjs 가 생성. Pretendard(OFL) · Inter(OFL) · JetBrains Mono(OFL) */\n';

// 1) Pretendard
const PT_BASE = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9';
let ptCss = await get(`${PT_BASE}/dist/web/variable/pretendardvariable-dynamic-subset.min.css`, true);
const ptJobs = [];
ptCss = ptCss.replace(/url\(([^)]*woff2-dynamic-subset\/([^)/]+))\)/g, (_, rel, name) => {
  ptJobs.push(() => dl(`${PT_BASE}/packages/pretendard/dist/web/variable/woff2-dynamic-subset/${name}`, join(here, 'pretendard', name)));
  return `url(./pretendard/${name})`;
});
await pool(ptJobs);
out += `\n/* Pretendard Variable — ${ptJobs.length} subsets */\n` + ptCss.replace(/}/g, '}\n') + '\n';
// 앱의 글꼴 스택은 "Pretendard Variable" 다음에 "Pretendard" 도 부르므로 같은 파일을 그 이름으로도 선언합니다
out += `\n/* Pretendard (alias of the variable subsets — the app's font stack names both) */\n` + ptCss.replace(/font-family:\s*["']?Pretendard Variable["']?/g, 'font-family:Pretendard').replace(/}/g, '}\n') + '\n';

// 2) Google Fonts (Inter · JetBrains Mono)
let gCss = await get('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap', true);
const gJobs = []; let gi = 0;
gCss = gCss.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, url) => {
  const name = `g${String(gi++).padStart(3, '0')}-${url.split('/').pop().replace(/[^A-Za-z0-9._-]/g, '')}.woff2`.replace(/\.woff2\.woff2$/, '.woff2');
  gJobs.push(() => dl(url, join(here, 'google', name)));
  return `url(./google/${name})`;
});
await pool(gJobs);
out += `\n/* Inter · JetBrains Mono — ${gJobs.length} files */\n` + gCss + '\n';

writeFileSync(join(here, 'fonts.css'), out);
console.log(`fonts.css: ${ptJobs.length} Pretendard + ${gJobs.length} Google files → .design-sync/fonts/`);
