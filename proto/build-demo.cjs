const { spawnSync } = require('node:child_process');
// Never inherit the production .env. The demo client itself has no network transport.
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'], {
  cwd: __dirname, stdio: 'inherit', env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_USE_MOCK: 'true', EXPO_PUBLIC_LIVE_AUTH: 'false' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
