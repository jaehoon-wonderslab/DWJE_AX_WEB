/**
 * 브라우저 헬퍼 — 화면에 실제로 무엇이 그려졌는지 확인합니다
 *
 * 시스템에 설치된 Chrome 을 그대로 씁니다(브라우저 내려받기 없음).
 * 웹 개발 서버(기본 http://localhost:8081)가 떠 있어야 합니다.
 */
const { chromium } = require('playwright-core');
const { BASE, PASSWORD, ACCOUNTS } = require('./api');

const WEB = process.env.WEB_URL || 'http://localhost:8081';

/** 화면이 그려질 때까지 기다리는 기본 시간 (ms) — 대용량 집계 조회가 있어 넉넉히 둡니다 */
const SETTLE_MS = Number(process.env.TEST_SETTLE_MS || 3500);

/**
 * 브라우저를 띄우고 로그인한 페이지를 돌려줍니다.
 * @param {string} [who] 계정 키 (admin · qa · prod · mfg · it · exec)
 */
async function open(who = 'admin') {
  // 웹 서버가 떠 있는지 먼저 확인 — 안 떠 있으면 원인을 분명히 알립니다
  const probe = await fetch(WEB).catch(() => null);
  if (!probe) throw new Error(`웹 개발 서버에 연결할 수 없습니다 (${WEB}). 'npm run web' 으로 먼저 띄워 주세요.`);

  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  const acc = ACCOUNTS[who] || { empNo: who };
  const res = await page.request.post(`${BASE}/api/v1/auth/login`, {
    data: { loginId: acc.empNo, password: PASSWORD },
  });
  const t = (await res.json()).data;

  await page.goto(`${WEB}/login`);
  await page.evaluate((s) => {
    localStorage.setItem('dwje.ax.session', JSON.stringify(s));
  }, { accessToken: t.accessToken, refreshToken: t.refreshToken, userInfo: t.user });

  return { browser, page, user: t.user };
}

/**
 * 화면 하나를 열고 관찰 결과를 돌려줍니다.
 *
 * @param {import('playwright-core').Page} page
 * @param {string} path 앱 경로 (예: '/dashboard/ai')
 * @param {object} [opts] { settle: 대기 ms }
 * @returns {Promise<{path,url,text,errors,failed,stuck}>}
 */
async function visit(page, path, opts = {}) {
  const errors = [];
  const failed = [];
  const onErr = (e) => errors.push(`CRASH: ${String(e.message || e).slice(0, 200)}`);
  const onMsg = (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // 개발 서버가 만드는 소음은 제외합니다
    if (/Download the React DevTools|source map/i.test(text)) return;
    errors.push(text.slice(0, 200));
  };
  const onRes = (r) => {
    if (r.status() >= 400 && r.url().includes('/api/v1/')) {
      failed.push(`${r.status()} ${r.url().replace(`${BASE}/api/v1`, '')}`);
    }
  };

  page.on('pageerror', onErr);
  page.on('console', onMsg);
  page.on('response', onRes);
  try {
    await page.goto(`${WEB}${path}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(opts.settle || SETTLE_MS);
    // 로딩이 아직이면 조금 더 기다립니다 (25초 넘는 집계 조회 대비)
    for (let i = 0; i < 12; i += 1) {
      const busy = await page.evaluate(() => document.body.innerText.includes('조회 중입니다'));
      if (!busy) break;
      await page.waitForTimeout(2500);
    }
    const text = await page.evaluate(() => document.body.innerText);
    const url = await page.evaluate(() => location.pathname);
    return { path, url, text, errors: [...new Set(errors)], failed: [...new Set(failed)], stuck: text.includes('조회 중입니다') };
  } finally {
    page.off('pageerror', onErr);
    page.off('console', onMsg);
    page.off('response', onRes);
  }
}

/** 화면 글자에서 라벨 다음에 오는 숫자를 읽습니다 (쉼표 제거) */
function numberAfter(text, label) {
  const re = new RegExp(`${label}\\s*\\n\\s*([\\d,.]+)`);
  const m = text.match(re);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

/** 화면 글자에 라벨이 있는지 */
const has = (text, s) => text.includes(s);

module.exports = { WEB, SETTLE_MS, open, visit, numberAfter, has };
