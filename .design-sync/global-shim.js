/**
 * 호스트 환경 폴리필 — Metro/Expo 런타임이 제공하던 전역을 브라우저 번들에도 둡니다. entry.js 의 첫 import 여야 합니다.
 *  · `global`      : react-native-web Animated 가 `global.cancelAnimationFrame` 을 참조(없으면 애니메이션 종료·재시작 시 ReferenceError)
 *  · `process.env` : 서비스 계층(src/services/api/client.js)이 EXPO_PUBLIC_* 로 목 모드·데모 인증을 결정.
 *                    claude.ai/design 안에서는 API 서버가 없으므로 **목 데이터 + 데모 자동 로그인(기본 계정 = 통합관리자)** 으로 고정합니다.
 */
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.global === 'undefined') globalThis.global = globalThis;
  if (typeof globalThis.process === 'undefined') globalThis.process = { env: {} };
  if (!globalThis.process.env) globalThis.process.env = {};
  Object.assign(globalThis.process.env, {
    EXPO_PUBLIC_USE_MOCK: 'true',
    EXPO_PUBLIC_LIVE_AUTH: 'false',
    EXPO_PUBLIC_MOCK_DELAY: '0',
    EXPO_PUBLIC_API_URL: 'http://localhost:8080',
  });
  if (typeof globalThis.__DEV__ === 'undefined') globalThis.__DEV__ = false;
}
