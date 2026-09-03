/** import 했지만 쓰지 않는 식별자를 찾습니다 (간이 검사) */
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, f.name);
    if (f.isDirectory()) walk(fp, out); else if (/\.(js|jsx)$/.test(f.name)) out.push(fp);
  }
  return out;
}
let total = 0;
for (const f of walk(SRC)) {
  const src = fs.readFileSync(f, 'utf8');
  const unused = [];
  for (const m of src.matchAll(/^import\s+(?:(\w+)\s*,\s*)?(?:\{([^}]+)\})?\s*from\s*'[^']+';$/gm)) {
    const names = [];
    if (m[1]) names.push(m[1]);
    if (m[2]) m[2].split(',').forEach((x) => { const n = x.trim().split(/\s+as\s+/).pop().trim(); if (n) names.push(n); });
    for (const n of names) {
      const body = src.replace(m[0], '');
      const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!re.test(body)) unused.push(n);
    }
  }
  if (unused.length) { console.log(`${path.relative(path.join(__dirname, '..'), f)}: ${unused.join(', ')}`); total += unused.length; }
}
console.log(total ? `${total} unused import(s)` : 'no unused imports');
