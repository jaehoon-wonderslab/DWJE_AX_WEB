const p = require('@babel/parser');
const fs = require('fs'), path = require('path');
function walk(d, out=[]) {
  for (const f of fs.readdirSync(d, {withFileTypes:true})) {
    const fp = path.join(d, f.name);
    if (f.isDirectory()) walk(fp, out);
    else if (/\.(js|jsx)$/.test(f.name)) out.push(fp);
  }
  return out;
}
let bad = 0;
const targets = process.argv[2]
  ? [path.resolve(process.cwd(), process.argv[2])]
  : [path.join(__dirname, '..', 'app'), path.join(__dirname, '..', 'src')];
const files = targets.flatMap((t) => walk(t));
for (const f of files) {
  try {
    p.parse(fs.readFileSync(f,'utf8'), {sourceType:'module', plugins:['jsx']});
  } catch (e) { bad++; console.log('SYNTAX FAIL', f, '->', e.message); }
}
console.log(bad ? `${bad} file(s) failed` : 'all files parse OK');
