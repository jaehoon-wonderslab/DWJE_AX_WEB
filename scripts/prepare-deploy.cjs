/**
 * build:web 후 배포 산출물 디렉토리(dist/)에 *.sh 및 배포 유틸리티를 복사하고
 * 우분투 실서버 배포용 압축 파일(dwje-web-deploy.zip)을 자동 생성합니다.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('[오류] dist 디렉토리가 없습니다. 먼저 expo export 를 수행하십시오.');
  process.exit(1);
}

// 1. 필요한 하위 폴더 생성
const distScriptsDir = path.join(distDir, 'scripts');
const distNginxDir = path.join(distDir, 'nginx');
fs.mkdirSync(distScriptsDir, { recursive: true });
fs.mkdirSync(distNginxDir, { recursive: true });

// 2. 복사할 배포 파일 목록 정의
const filesToCopy = [
  { src: path.join(rootDir, 'start.sh'), dst: path.join(distDir, 'start.sh'), chmod: 0o755 },
  { src: path.join(rootDir, 'stop.sh'), dst: path.join(distDir, 'stop.sh'), chmod: 0o755 },
  { src: path.join(rootDir, 'status.sh'), dst: path.join(distDir, 'status.sh'), chmod: 0o755 },
  { src: path.join(rootDir, 'scripts', 'serve.cjs'), dst: path.join(distScriptsDir, 'serve.cjs'), chmod: 0o755 },
  { src: path.join(rootDir, 'scripts', 'serve.cjs'), dst: path.join(distDir, 'serve.cjs'), chmod: 0o755 },
  { src: path.join(rootDir, 'nginx', 'dwje-ax.conf'), dst: path.join(distNginxDir, 'dwje-ax.conf') },
];

let copiedCount = 0;
for (const item of filesToCopy) {
  if (fs.existsSync(item.src)) {
    fs.copyFileSync(item.src, item.dst);
    if (item.chmod) {
      try {
        fs.chmodSync(item.dst, item.chmod);
      } catch (e) {}
    }
    copiedCount++;
  }
}

// 3. 우분투 실서버 전송용 압축파일(dwje-web-deploy.zip) 생성
const zipFile = path.join(rootDir, 'dwje-web-deploy.zip');
let zipSuccess = false;
let zipSizeMb = '0';

try {
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }
  // dist 폴더 내부 파일들을 루트로 하여 압축 (서버에서 풀었을 때 바로 폴더 구조가 나오도록)
  execSync(`cd "${distDir}" && zip -qr "${zipFile}" .`, { stdio: 'pipe' });
  const stat = fs.statSync(zipFile);
  zipSizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  zipSuccess = true;
} catch (err) {
  // zip 명령어가 실패해도 dist 폴더 복사는 완료되었으므로 계속 진행
}

console.log(`\n======================================================================`);
console.log(`🚀 [배포 패키지 구성 완료] dist/ 폴더 내에 배포 스크립트가 자동 배치되었습니다.`);
console.log(`----------------------------------------------------------------------`);
console.log(`  · 정적 번들 및 스크립트 폴더 : ${distDir}`);
console.log(`  · 배치된 스크립트          : start.sh, stop.sh, status.sh, scripts/serve.cjs`);
if (zipSuccess) {
  console.log(`  · 실서버 전송용 압축 파일    : ${zipFile} (${zipSizeMb} MB)`);
}
console.log(`======================================================================\n`);
