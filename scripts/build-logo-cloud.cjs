/**
 * CI 심볼 → 점 구름 모듈 생성기
 *
 *   node scripts/build-logo-cloud.cjs
 *
 * `src/assets/logo-mark.png` 의 알파가 있는 픽셀을 고르게 솎아
 * `src/shared/components/brand/logoCloud.js` 를 다시 씁니다.
 * 심볼 이미지를 바꿨을 때만 돌리면 됩니다.
 *
 * PNG 디코딩은 파이썬(Pillow)에 맡깁니다 — 저장소에 이미지 라이브러리를 새로 들이지 않으려고
 * 이미 설치돼 있는 것을 씁니다. 파이썬이 없으면 안내만 하고 멈춥니다.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const py = path.join(__dirname, 'build-logo-cloud.py');
const res = spawnSync('python3', [py], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
if (res.error || res.status !== 0) {
  console.error('점 구름을 만들지 못했습니다 — python3 와 Pillow 가 필요합니다.');
  process.exit(1);
}
