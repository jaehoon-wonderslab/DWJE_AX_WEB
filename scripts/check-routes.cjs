/**
 * 메뉴 정의(shared/constants/menu.js)와 실제 라우트 파일(app/)이 1:1 인지 검사합니다.
 * 사용: node scripts/check-routes.cjs
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MENU_SRC = fs.readFileSync(path.join(ROOT, 'src/shared/constants/menu.js'), 'utf8');

// 메뉴 정의에서 { id, path } 를 뽑습니다
const defined = [...MENU_SRC.matchAll(/id: '([\w-]+)', name: '[^']*', path: '([^']*)'/g)].map((m) => ({ id: m[1], path: m[2] }));

// app/(main) 아래 라우트 파일 → URL 경로
function walk(dir, base = '', out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp, `${base}/${f.name}`, out);
    else if (/\.jsx?$/.test(f.name) && !f.name.startsWith('_') && !f.name.startsWith('+')) {
      const name = f.name.replace(/\.jsx?$/, '');
      out.push(name === 'index' ? base : `${base}/${name}`);
    }
  }
  return out;
}
const routes = walk(path.join(ROOT, 'app/(main)'));

let bad = 0;
defined.forEach((d) => {
  if (!routes.includes(d.path)) { console.log(`라우트 없음  ${d.id.padEnd(20)} → ${d.path}`); bad++; }
});
routes.forEach((r) => {
  if (!defined.some((d) => d.path === r)) { console.log(`메뉴 정의 없음  ${r}`); bad++; }
});
console.log(bad ? `${bad}건 불일치` : `메뉴 ${defined.length}건 ↔ 라우트 ${routes.length}건 모두 일치`);
process.exit(bad ? 1 : 0);
