/** 실행: WEB_URL=http://localhost:8091 node tests/tables/render-stability.cjs (로그인 가능한 데모 서버) */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const routes = ['/quality/defect', '/system/account', '/system/product-rank', '/system/chat-history', '/system/agent', '/system/metric-standard'];
const web = process.env.WEB_URL || 'http://localhost:8091';

async function observe(page) {
  return page.evaluate(async () => {
    const tables = [...document.querySelectorAll('.tabulator')];
    const cells = [...document.querySelectorAll('.ax-cell')];
    const heights = tables.map(t => t.getBoundingClientRect().height);
    let mutations = 0;
    const observer = new MutationObserver(records => { mutations += records.filter(r => r.type === 'childList').length; });
    tables.forEach(t => observer.observe(t, { childList: true, subtree: true }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    observer.disconnect();
    return { tables: tables.length, cells: cells.length, detached: cells.filter(c => !c.isConnected).length,
      heightChanged: tables.some((t, i) => t.getBoundingClientRect().height !== heights[i]), mutations };
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const route of routes) {
      await page.goto(web + route);
      await page.locator('.tabulator .ax-cell').first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500);
      const idle = await observe(page);
      assert.ok(idle.tables && idle.cells, `${route}: populated tables`);
      assert.equal(idle.detached, 0, `${route}: idle cells replaced`);
      assert.equal(idle.heightChanged, false, `${route}: idle height changed`);
      assert.equal(idle.mutations, 0, `${route}: idle DOM redraw loop`);
      await page.setViewportSize({ width: 960, height: 800 });
      await page.waitForTimeout(700);
      const resized = await observe(page);
      assert.equal(resized.detached, 0, `${route}: resize did not settle`);
      assert.equal(resized.heightChanged, false, `${route}: resize height did not settle`);
      const scroll = await page.evaluate(() => {
        const overflowing = [...document.querySelectorAll('div')].filter(el => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth + 2);
        return overflowing.map(el => { el.scrollLeft = 100; return el.scrollLeft > 0; });
      });
      assert.ok(scroll.length && scroll.every(Boolean), `${route}: horizontal scrolling unavailable`);
      console.log(JSON.stringify({ route, idle, resized, scrollContainers: scroll.length }));
      await page.setViewportSize({ width: 1440, height: 960 });
    }
    assert.deepEqual(errors, [], 'browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
