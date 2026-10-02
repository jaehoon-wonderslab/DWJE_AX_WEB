'use strict';

const { fork } = require('node:child_process');
const path = require('node:path');

/** 기존 프록시는 재사용하고, 이번 개발 서버가 띄운 프록시만 함께 종료합니다. */
async function ensureLocalLlm(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!response.ok || !(await response.text()).includes('DWJE LLM 로컬 연결 확인')) {
      throw new Error('프록시 포트에서 다른 서비스가 실행 중입니다.');
    }
    console.log('[LLM] 실행 중인 로컬 프록시를 사용합니다.');
    return null;
  } catch (error) {
    if (error.message !== 'fetch failed' && error.name !== 'TimeoutError') throw error;
  }
  const proxy = fork(path.join(__dirname, 'local-gateway-proxy.cjs'), [], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: { ...process.env, LOCAL_GATEWAY_PROXY_PORT: new URL(url).port },
  });
  await new Promise((resolve, reject) => {
    proxy.once('message', (message) => { if (message.ready) resolve(); });
    proxy.once('error', reject);
    proxy.once('exit', (code) => reject(new Error(`로컬 LLM 프록시 시작 실패 (${code})`)));
  });
  process.once('exit', () => proxy.kill());
  return proxy;
}

module.exports = { ensureLocalLlm };
