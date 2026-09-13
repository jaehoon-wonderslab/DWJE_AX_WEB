const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();
 try{
  await page.goto(WEB+'/quality/defect');
  let compact=0,multiple=0;
  for(const index of [1,2,3]){
    const grid=page.locator('.tabulator').nth(index);
    await grid.locator('.dw-tree-toggle').first().waitFor({timeout:60000});
    await grid.locator('.tabulator-tree-level-0 .dw-tree-toggle').first().click();
    await grid.locator('.tabulator-tree-level-1 .dw-tree-toggle').first().click();
    const rows=grid.locator('.tabulator-tree-level-2');
    await rows.first().waitFor();
    for(let i=0;i<Math.min(await rows.count(),8);i++){
      const row=rows.nth(i);
      if(await row.locator('.dw-tree-toggle').count()) multiple++;
      else{
        compact++;
        assert.ok((await row.innerText()).trim().length>0);
        const detail=await row.locator('[tabulator-field="wcNm"],[tabulator-field="defectNm"]').allTextContents();
        assert.ok(detail.some(t=>t.trim()));
      }
    }
  }
  assert.ok(compact>0);
  console.log({compactRows:compact,multiChildRows:multiple});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
