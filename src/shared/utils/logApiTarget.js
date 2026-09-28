/**
 * 접속 대상(target) 진단 — 브라우저 콘솔에 현재 붙어 있는 서버를 한 번 찍습니다.
 *
 * 사내 IP 를 하드코딩하지 않습니다 — `scripts/targets.cjs` 한 곳에만 둡니다 (AGENTS.md).
 * 아래 주소는 번들에 들어간 EXPO_PUBLIC_API_URL 에서 읽습니다.
 *
 * 배지 대신 콘솔로 알립니다. 화면을 더럽히지 않으면서도
 * 개발자 도구(F12)에서 「지금 로컬인가 실서버인가」를 바로 확인할 수 있습니다.
 *
 * 왜 필요한가
 *  · 사내 실서버는 VPN 이 켜져 있어야만 닿습니다.
 *    VPN 이 꺼져 있으면 화면은 뜨지만 모든 API 요청이 실패합니다.
 *  · 번들에 박히는 API 주소는 **빌드·실행 시점에 이미 정해집니다.** HMR 로는 바뀌지 않습니다.
 *  · 실서버면 등록·수정·삭제가 그대로 운영 DB 에 반영됩니다.
 *
 * 대상 이름(`EXPO_PUBLIC_TARGET_LABEL`)은 `scripts/targets.cjs` 가 주입합니다.
 * 그 값이 없으면(직접 `expo start` 등) 주소만으로 뭔지 말해 줍니다.
 */
import { API_BASE_URL, USE_MOCK, LIVE_AUTH } from '@services/api/client';

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/;

/** 표시용 — 포트까지 (192.168.2.8:8080) */
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * 루프백 판정용 — **포트 없이 호스트만** 봅니다.
 *
 * 주의: 표시값(host)에는 포트가 붙어 `localhost:8080` 이 됩니다.
 * `LOOPBACK` 은 `^localhost$` 라 포트가 붙으면 매칭되지 않습니다.
 * 2026-09-28 에 이 구분을 하지 않아 로컬 개발이
 * 「실서버 — 운영 DB 에 반영됩니다」 로 잘못 경고했습니다.
 * 판정과 표시는 다른 값을 씁니다.
 */
function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

let printed = false;

/** 앱이 뜰 때 한 번만 찍습니다 (그룹 이동마다 찍히면 콘솔이 지저분해집니다) */
export function logApiTarget() {
  if (printed) return;
  printed = true;

  const host = hostOf(API_BASE_URL);
  // 판정은 포트 없는 hostname 으로 — 포트가 붙으면 루프백 정규식이 통하지 않습니다
  const isServer = !USE_MOCK && !!host && !LOOPBACK.test(hostnameOf(API_BASE_URL));
  const target = process.env.EXPO_PUBLIC_TARGET_LABEL || '(대상 이름 없음 — expo 를 직접 실행한 경우)';

  const lines = [
    '',
    '┌─ [접속 대상] ' + target,
    `│  API 주소    ${API_BASE_URL || '(없음)'}`,
    `│  모드        ${USE_MOCK ? '목(mock) — 백엔드 없음' : isServer ? '실서버 — VPN 필요' : '로컬 API'}`,
    `│  인증        ${LIVE_AUTH ? '실 서버' : '목'}`,
  ];

  if (isServer) {
    lines.push('│');
    lines.push('│  ⚠ 실서버입니다 — 등록·수정·삭제가 그대로 운영 DB 에 반영됩니다.');
    lines.push(`│  ⚠ ${host} 은 VPN 이 활성화되어 있어야만 닿습니다.`);
    lines.push('│    (VPN 이 꺼져 있으면 화면은 뜨지만 모든 API 요청이 실패합니다)');
  }

  lines.push('└──────────────────────────────────────');
  try {
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  } catch {
    // 진단 출력이 실패해도 앱이 죽으면 안 됩니다 (이 함수는 useEffect 에서 돕니다)
  }
}
