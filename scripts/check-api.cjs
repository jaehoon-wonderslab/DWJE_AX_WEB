/**
 * 화면 코드가 참조하는 서비스 함수가 실제로 존재하는지 검사합니다.
 * 사용: node check-api.cjs
 */
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');

function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, f.name);
    if (f.isDirectory()) walk(fp, out);
    else if (/\.(js|jsx)$/.test(f.name)) out.push(fp);
  }
  return out;
}

// 서비스 파일에 정의된 함수 목록 수집
const services = {};
for (const f of fs.readdirSync(path.join(SRC, 'services', 'api'))) {
  const m = f.match(/^(\w+)Service\.js$/);
  if (!m) continue;
  const src = fs.readFileSync(path.join(SRC, 'services', 'api', f), 'utf8');
  services[`${m[1]}Service`] = new Set([...src.matchAll(/export function (\w+)/g)].map((x) => x[1]));
}

let bad = 0;
for (const f of walk(SRC)) {
  if (f.includes(`${path.sep}services${path.sep}`)) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\b(\w+Service)\.(\w+)\b/g)) {
    const [, svc, fn] = m;
    if (!services[svc]) { console.log(`UNKNOWN SERVICE ${svc} in ${path.relative(path.join(__dirname, '..'), f)}`); bad++; continue; }
    if (!services[svc].has(fn)) {
      const owner = Object.entries(services).find(([, set]) => set.has(fn));
      console.log(`MISSING ${svc}.${fn} in ${path.relative(path.join(__dirname, '..'), f)}${owner ? `  → 실제 위치: ${owner[0]}` : ''}`);
      bad++;
    }
  }
}
console.log(bad ? `${bad} bad reference(s)` : 'all service references OK');
process.exit(bad ? 1 : 0);
