/**
 * 계정 관리 화면(/system/account) 시험 도우미
 *
 * 2026-10-02 개편으로 계정 · 부서 · 계정·권한 변경 이력 표가 탭(CardTabs)으로 나뉘었습니다.
 * 고른 탭의 표만 그리므로, 다른 표를 쓰기 전에 그 탭을 열어야 합니다.
 */

/** 표 이름(AccountGrid label) → 탭 값 */
const TAB_OF = { 계정: 'users', 부서: 'depts', '변경 이력': 'logs' };

/**
 * 그 표의 탭을 열고 표를 돌려줍니다. 이미 열려 있으면 그대로 둡니다.
 * @param {import('playwright-core').Page} page
 * @param {'계정'|'부서'|'변경 이력'} label
 * @param {{ waitRows?: boolean }} [opts] 행이 그려질 때까지 기다릴지(기본 true)
 */
async function openAccountTab(page, label, { waitRows = true } = {}) {
  const tab = page.locator(`#account-tab-${TAB_OF[label]}`);
  await tab.waitFor();
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  const grid = page.locator(`[id="account-grid-${label}"]`);
  if (waitRows) await grid.locator('.tabulator-row').first().waitFor();
  else await grid.waitFor();
  return grid;
}

/**
 * 목록 머리글 필터(`filter: 'list'`)에서 값을 고릅니다 — 머리글 칸을 눌러 목록을 열고 그 글자를 누릅니다.
 * @param {import('playwright-core').Locator} grid
 * @param {string} field 열 field (예: 'state')
 * @param {string} label 고를 값 (예: '잠김', 전체는 '전체')
 */
async function pickListFilter(grid, field, label) {
  const page = grid.page();
  await grid.locator(`.tabulator-col[tabulator-field="${field}"] .tabulator-header-filter input`).click();
  const item = page.locator('.tabulator-edit-list .tabulator-edit-list-item').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first();
  await item.waitFor();
  await item.click();
  await page.waitForTimeout(400);
}

module.exports = { openAccountTab, pickListFilter, TAB_OF };
