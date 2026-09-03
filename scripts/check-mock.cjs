// 목 핸들러 키가 실제 엔드포인트 키와 일치하는지 검사
//  · live: true 로 표시된 엔드포인트는 실 서버로 호출하므로 목이 없어도 정상입니다
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname, '..', 'src');
const ep=fs.readFileSync(path.join(SRC,'services','api','endpoints.js'),'utf8');
const keys=new Set([...ep.matchAll(/^  (\w+): \{$/gm)].map(m=>m[1]));

// 각 정의 블록에서 live: true 인 키를 골라냅니다
const live=new Set();
for (const m of ep.matchAll(/^  (\w+): \{\n([\s\S]*?)\n  \},$/gm)) {
  if (/live: true/.test(m[2])) live.add(m[1]);
}

let bad=0, covered=new Set();
for (const f of fs.readdirSync(path.join(SRC,'services','mock'))) {
  if (!/Mock\.js$/.test(f)) continue;
  const src=fs.readFileSync(path.join(SRC,'services','mock',f),'utf8');
  for (const m of src.matchAll(/^  (\w+):\s/gm)) {
    const k=m[1];
    if (!keys.has(k)) { console.log(`UNKNOWN mock key ${k} in ${f}`); bad++; }
    else covered.add(k);
  }
}
const missing=[...keys].filter(k=>!covered.has(k) && !live.has(k));
console.log(`endpoints: ${keys.size}, mocked: ${covered.size}, 실 서버 전용(live): ${live.size}, unmocked: ${missing.length}`);
if (missing.length) console.log('unmocked keys:', missing.join(', '));
process.exit(bad?1:0);
