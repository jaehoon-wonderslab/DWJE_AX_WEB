/**
 * 배포용 웹 번들 생성기
 *
 * 로컬 개발의 .env(API localhost)는 그대로 두고, 정적 배포 번들을 만들 때만
 * 사내 API 서버 주소를 클라이언트 번들에 주입합니다.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEPLOY_API_URL = 'http://192.168.2.8:8080';
const npmCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env');
const hadEnvFile = fs.existsSync(envFile);
const previousEnv = hadEnvFile ? fs.readFileSync(envFile, 'utf8') : '';

// Expo export가 읽는 .env를 배포 빌드 동안에만 바꾸고, 완료 후 원상복구합니다.
const deployEnv = previousEnv
  .replace(/^EXPO_PUBLIC_API_URL=.*$/m, `EXPO_PUBLIC_API_URL=${DEPLOY_API_URL}`)
  .replace(/^EXPO_PUBLIC_USE_MOCK=.*$/m, 'EXPO_PUBLIC_USE_MOCK=false');
fs.writeFileSync(envFile, deployEnv);

let result;
try {
  result = spawnSync(npmCommand, ['expo', 'export', '--platform', 'web', '--clear'], {
    stdio: 'inherit',
    cwd: rootDir,
    env: { ...process.env, EXPO_PUBLIC_API_URL: DEPLOY_API_URL, EXPO_PUBLIC_USE_MOCK: 'false' },
  });
} finally {
  if (hadEnvFile) fs.writeFileSync(envFile, previousEnv);
  else fs.rmSync(envFile, { force: true });
}

if (result.error) {
  console.error(`[배포 빌드 실패] ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);

const prepare = spawnSync(process.execPath, ['scripts/prepare-deploy.cjs'], {
  stdio: 'inherit',
  env: process.env,
});

if (prepare.error) {
  console.error(`[배포 패키지 구성 실패] ${prepare.error.message}`);
  process.exit(1);
}
process.exit(prepare.status || 0);
