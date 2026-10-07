/*
 * 데이터 접근 권한 — 체크 뒤 스크롤 위치 유지 (2026-10-07 피드백) · 로컬 API(8080) + 개발 서버(8081)
 *   node tests/system/data-perm-scroll-live-browser.cjs
 *
 * 표를 아래로 내린 상태에서 「ai 머시기」 열(시험 부서)의 칸을 체크했다가 되돌립니다.
 * 저장 뒤 다시 읽어도 표를 갈아 끼우지 않고 값만 고치므로(TabulatorGrid updateInPlace) 스크롤 위치가 그대로여야 합니다.
 * 부서 「ai 머시기」 가 없으면 건너뜁니다. 체크한 칸은 되돌려 놓습니다.
 */
const assert = require('node:assert/strict');
const { open, visit } = require('../lib/browser');

(async () => {
  const { browser, page } = await open('admin');
  try {
    await page.setViewportSize({ width: 1616, height: 906 });
    await page.evaluate(() => localStorage.setItem('dwje.ax.aiChatOpen', 'false'));
    await visit(page, '/system/data-perm');
    await page.locator('#data-perm-panel-matrix .tabulator').waitFor();
    await page.mouse.move(900, 600);
    for (let i = 0; i < 12; i += 1) { await page.mouse.wheel(0, 400); await page.waitForTimeout(80); }
    await page.waitForTimeout(500);
    const scrolled = () => page.evaluate(() => Math.max(...[...document.querySelectorAll('*')].map((e) => e.scrollTop), 0));
    const label = await page.evaluate(() => {
      const ins = [...document.querySelectorAll('#data-perm-panel-matrix input[type=checkbox]:not([disabled])')];
      const v = ins.find((i) => { const r = i.getBoundingClientRect(); return r.top > 200 && r.bottom < 850 && /ai 머시기/.test(i.getAttribute('aria-label')); });
      return v ? v.getAttribute('aria-label') : null;
    });
    if (!label) { console.log('SKIP: 시험 부서 「ai 머시기」 칸이 없습니다'); return; }
    const before = await scrolled();
    assert(before > 300, `scrolled down first (${before})`);
    const box = () => page.getByRole('checkbox', { name: label, exact: true });
    const ready = () => page.waitForFunction((l) => { const i = document.querySelector(`input[aria-label="${l}"]`); return i && !i.disabled; }, label, { timeout: 20000 });
    const was = await box().isChecked();
    await box().click(); await ready();
    assert.equal(await box().isChecked(), !was, 'toggled');
    assert(Math.abs((await scrolled()) - before) < 5, `scroll kept after save (${before} → ${await scrolled()})`);
    await box().click(); await ready();
    assert.equal(await box().isChecked(), was, 'restored');
    assert(Math.abs((await scrolled()) - before) < 5, 'scroll kept after restore');
    console.log(`PASS: data-perm scroll — ${label} 체크 · 되돌림 동안 스크롤 ${before}px 유지`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
