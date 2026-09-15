const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files = [];
function visit(dir) {
 for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
  const relative = path.join(dir, entry.name);
  if (entry.isDirectory()) visit(relative);
  else if (relative.startsWith('src/shared/components/') || relative.startsWith('src/shared/theme/') || relative.includes('/view/') || relative.startsWith('assets/')) files.push(relative);
 }
}
visit('src'); visit('assets');
const mismatches = files.filter(file => !fs.existsSync(path.join(__dirname, file)) || hash(path.join(root, file)) !== hash(path.join(__dirname, file)));
if (mismatches.length) throw new Error('Style/view mismatch: ' + mismatches.join(', '));
fs.writeFileSync(path.join(__dirname, 'style-parity.json'), JSON.stringify({ files: files.length, sha256: Object.fromEntries(files.map(file => [file, hash(path.join(root, file))])) }, null, 2) + '\n');
console.log(`PASS: ${files.length} view, shared component, theme and asset files match the source byte-for-byte`);
