const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(WEB+'/quality/defect');
  for(const index of [1,2,3]){
   const grid=page.locator('.tabulator').nth(index);
   const root=grid.locator('.tabulator-row.tabulator-tree-level-0').first();
   await root.waitFor({timeout:60000});
   const toggle=root.locator('.dw-tree-toggle');
   assert.equal(await toggle.innerText(),'+');
   await toggle.click();
   assert.equal(await toggle.innerText(),'−');
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   for(const depth of [1,2]){
    const row=grid.locator('.tabulator-tree-level-'+depth).first();
    await row.waitFor();
    assert.equal(await row.locator('[data-tree-stage]').count(),0);
    assert.equal(await row.locator('[data-tree-stage]').count(),0);
    assert.equal((await row.locator('.dw-tree-toggle').getAttribute('title')).split(' · ')[0].split(' → ').length,depth+1);
    const cell=row.locator('.tabulator-cell[tabulator-field="outline"]');
    assert.ok((await cell.boundingBox()).width<=132);
    assert.ok(await cell.evaluate((e,depth)=>parseFloat(getComputedStyle(e).paddingLeft)>=8+depth*14,depth));
    const child=row.locator('.dw-tree-toggle');
    if (!(await child.count())) break;
    await child.click();assert.equal(await child.innerText(),'−');
   }
   const leaf=grid.locator('.tabulator-tree-level-3').first();
   if (await leaf.count()) {
     assert.equal(await leaf.locator('[data-tree-stage]').count(),0);
     assert.equal(await leaf.locator('.dw-tree-toggle').count(),0);
   }
   await toggle.click();assert.equal(await toggle.innerText(),'+');
   assert.equal(await grid.locator('.tabulator-tree-level-1').count(),0);
  }
  assert.deepEqual(errors,[]);
  console.log('3 trees: +/- state, compact outline width, depth guides and tooltips and collapse passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
