/** WEB_URL=http://localhost:8092 node tests/dashboard/ai-loading-charts-browser.cjs */
const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
(async () => {
  const { browser, page } = await open();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let releaseBriefing, releaseCause;
  const briefingGate = new Promise(resolve => { releaseBriefing = resolve; });
  const causeGate = new Promise(resolve => { releaseCause = resolve; });
  await page.route('**/dashboard/ai/briefing?**', async route => {
    await briefingGate;
    await route.fulfill({ json: { success: true, data: { modelVer: 'test', lines: [{ text: '검증용 브리핑 결과', verified: true, evidence: [{ kind: 'qty', label: '생산량', value: 100, unit: 'EA' }] }] } } });
  });
  await page.route('**/dashboard/ai/cause-prescription?**', async route => {
    await causeGate;
    await route.fulfill({ json: { success: true, data: { reason: 'MODEL_NOT_READY', targets: [] } } });
  });
  try {
    await page.goto(`${WEB}/dashboard/ai`);
    await page.getByText('총 생산 수량', { exact: true }).waitFor({ timeout: 60000 });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 900, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      for (const id of ['chart-card-plan-actual', 'chart-card-defect-composition', 'chart-card-hourly-ng-count']) {
        const result = await page.locator(`#${id}`).evaluate(card => {
          const labels = [...card.querySelectorAll('.x-axis-label')];
          const boxes = labels.map(el => el.getBoundingClientRect());
          const svg = card.querySelector('svg[role="img"]');
          const svgBox = svg.getBoundingClientRect();
          const scroller = svg.parentElement;
          scroller.scrollLeft = 100;
          return { count: labels.length, overlaps: boxes.slice(1).filter((r, i) => r.left < boxes[i].right + 8).length,
            clipped: boxes.some(r => r.left < svgBox.left || r.right > svgBox.right),
            scrolls: scroller.scrollWidth <= scroller.clientWidth || scroller.scrollLeft > 0 };
        });
        assert.ok(result.count > 0, `${id}: missing labels`);
        assert.equal(result.overlaps, 0, `${id}: axis labels overlap at ${viewport.width}`);
        assert.equal(result.clipped, false, `${id}: edge labels clipped`);
        assert.ok(result.scrolls, `${id}: cannot scroll`);
        console.log(viewport.width, id, result);
      }
    }
    await page.getByText('AI 분석 요청', { exact: true }).click();
    const spinners = page.locator('[role="progressbar"][aria-busy="true"]');
    await spinners.nth(1).waitFor();
    assert.equal(await spinners.count(), 2, 'briefing and queued cause each have spinner');
    assert.equal(await spinners.locator('canvas').count(), 2);
    await spinners.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    await page.screenshot({ path: '/tmp/dashboard-ai-spinners.png' });
    releaseBriefing();
    await page.getByText('검증용 브리핑 결과', { exact: true }).waitFor();
    assert.equal(await spinners.count(), 1, 'only cause still loading');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await spinners.count(), 1, 'reduced motion keeps loading status');
    await page.waitForTimeout(300);
    const stillFrame = await spinners.locator('canvas').evaluate(canvas => canvas.toDataURL());
    await page.waitForTimeout(500);
    assert.equal(await spinners.locator('canvas').evaluate(canvas => canvas.toDataURL()), stillFrame, 'reduced motion stays static');
    releaseCause();
    await page.getByText('현재 AI 분석 결과가 없습니다.', { exact: true }).waitFor();
    assert.equal(await spinners.count(), 0, 'spinners removed after completion');
    assert.deepEqual(errors, []);
    console.log('PASS: axes, scrolling, sequential AI loading, reduced motion, cleanup');
  } finally { releaseBriefing(); releaseCause(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
