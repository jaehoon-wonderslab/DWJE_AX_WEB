const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');
const base = process.env.DEMO_URL || 'http://localhost:8095';
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 const errors = [], external = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
 await page.route('**/*', route => {
   const url = route.request().url();
   if (/^https?:/.test(url) && (!url.startsWith(base + '/') || url.includes('/api/'))) { external.push(url); return route.abort(); }
   return route.continue();
 });
 try {
  await page.goto(base + '/login');
  await page.locator('input').first().fill('admin');
  await page.locator('input[type=password]').fill('wrong');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByText('아이디 또는 비밀번호가 올바르지 않습니다.', { exact: true }).waitFor();
  await page.locator('input[type=password]').fill('Demo!2026');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForURL('**/ai/chat', { timeout: 20000 });
  const routes = [...fs.readFileSync(__dirname + '/src/shared/constants/menu.js', 'utf8').matchAll(/path: '([^'#]+)'/g)].map(m => m[1]);
  for (const route of [...new Set(routes)]) {
   await page.goto(base + route);
   await page.waitForTimeout(900);
   const text = await page.locator('body').innerText();
   console.log(JSON.stringify({ route, grids: await page.locator('.tabulator').count(), rows: await page.locator('.tabulator-row').count(), issue: text.match(/샘플 데이터가 준비되지 않았습니다[^\n]*|오류가 발생[^\n]*/g) }));
   assert(!text.includes('샘플 데이터가 준비되지 않았습니다'), route + ': missing fixture');
  }
  await page.goto(base + '/system/menu-perm'); await page.waitForTimeout(800);
  assert.equal(await page.locator('.tabulator-header-filter').count(), 0);
  await page.getByRole('button', { name: '대시보드 접기', exact: true }).click(); await page.waitForTimeout(250);
  assert.equal(await page.getByRole('button', { name: '대시보드 펼치기', exact: true }).count(), 1);
  await page.setViewportSize({ width: 1000, height: 900 });
  const scrolled = await page.locator('.tabulator').evaluate(async el => {
    const holder = el.querySelector('.tabulator-tableholder'); holder.scrollLeft = holder.scrollWidth;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const header = [...el.querySelectorAll('.tabulator-col')].at(-1).getBoundingClientRect();
    return holder.scrollLeft > 0 && header.right <= holder.getBoundingClientRect().right + 2;
  });
  assert(scrolled);
  await page.screenshot({ path: '/tmp/dwje-demo-menu.png', fullPage: true });
  assert.deepEqual(external, [], 'no external/API traffic');
  assert.deepEqual(errors, [], 'no browser errors');
  console.log('PASS: demo authentication, all menu routes, local assets, collapsible grid, horizontal scroll');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
