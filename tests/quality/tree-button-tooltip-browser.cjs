const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(WEB+'/quality/defect');
  for(const index of [1,2,3]){
   const grid=page.locator('.tabulator').nth(index);
   const root=grid.locator('.tabulator-tree-level-0').first();
   const toggle=root.locator('.dw-tree-toggle');
   await toggle.waitFor({timeout:60000});
   assert.equal(await grid.locator('[data-tree-stage]').count(),0);
   const title=await toggle.getAttribute('title');
   assert.ok(title && title.includes('펼치기'));
   assert.equal((await root.locator('[tabulator-field="outline"]').innerText()).trim(),'+');
   await toggle.click();
   assert.equal(await toggle.innerText(),'−');
   assert.ok((await toggle.getAttribute('title')).includes('접기'));
   const child=grid.locator('.tabulator-tree-level-1').first().locator('.dw-tree-toggle');
   await page.waitForTimeout(100);
   const childTitle=await child.getAttribute('title');
   assert.ok(childTitle.includes(' → '));
   assert.ok(childTitle.startsWith(title.split(' · ')[0]));
   await child.click();
   assert.ok((await child.getAttribute('title')).includes('접기'));
   await toggle.click();
   assert.ok((await toggle.getAttribute('title')).includes('펼치기'));
   console.log({grid:index,root:title,child:childTitle});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
