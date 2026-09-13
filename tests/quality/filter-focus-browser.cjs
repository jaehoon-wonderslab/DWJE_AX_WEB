const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{const {browser,page}=await open();try{
 await page.goto(WEB+'/quality/defect');
 const grid=page.locator('.tabulator').nth(1);
 await grid.locator('.dw-tree-toggle').first().waitFor({timeout:60000});
 const input=grid.locator('.tabulator-col[tabulator-field="itemNm"] input');
 await input.fill('D');await page.waitForTimeout(700);
 assert.ok(await input.evaluate(e=>e===document.activeElement));
 await page.keyboard.type('53');await page.waitForTimeout(700);
 assert.equal(await input.inputValue(),'D53');
 assert.ok(await input.evaluate(e=>e===document.activeElement));
 assert.equal(await grid.locator('.dw-tree-toggle[aria-expanded="true"]').count(),0);
 await input.fill('');await page.waitForTimeout(700);
 assert.ok(await input.evaluate(e=>e===document.activeElement));
 assert.equal(await grid.locator('.dw-tree-toggle[aria-expanded="true"]').count(),0);
 console.log('filter typing retains focus and does not expand/collapse tree');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
