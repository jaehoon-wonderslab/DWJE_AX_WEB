const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();
 try{
  for(const route of ['/quality/defect','/production/result']){
   await page.goto(WEB+route);
   const indexes=route.includes('quality')?[1,2,3]:[0];
   for(const index of indexes){
    const grid=page.locator('.tabulator').nth(index);
    await grid.locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
    const roots=grid.locator('.tabulator-row.tabulator-tree-level-0');
    const count=await roots.count();
    const target=roots.nth(Math.max(0,count-2));
    const toggle=target.locator('.dw-tree-toggle,.tabulator-data-tree-control:visible').first();
    await toggle.scrollIntoViewIfNeeded();await toggle.click();
    for(let depth=1;depth<3;depth++){
      const buttons=grid.locator('.tabulator-tree-level-'+depth+' .dw-tree-toggle[aria-expanded="false"],.tabulator-tree-level-'+depth+' .tabulator-data-tree-control:visible');
      if(await buttons.count()){await buttons.last().scrollIntoViewIfNeeded();await buttons.last().click();}
    }
    await page.waitForTimeout(350);
    await grid.locator('.tabulator-tableholder').evaluate(h=>{h.scrollTop=h.scrollHeight});
    await page.waitForTimeout(250);
    await grid.locator('.tabulator-tableholder').evaluate(h=>{h.scrollTop=h.scrollHeight});
    await page.waitForTimeout(150);
    const state=await grid.evaluate(el=>{
      const h=el.querySelector('.tabulator-tableholder');

      const rows=[...h.querySelectorAll('.tabulator-row')];
      return {rows:rows.length,client:h.clientHeight,scroll:h.scrollHeight,top:h.scrollTop,
        last:rows.at(-1).getBoundingClientRect().bottom,viewportTop:h.getBoundingClientRect().top,bottom:h.getBoundingClientRect().bottom,overflow:getComputedStyle(h).overflowY};
    });
    console.log(route,index,state);
    if(process.env.INSPECT!=='1'){
      assert.ok(state.rows>0);
      assert.ok(state.last<=state.bottom+2);
      assert.ok(state.last>state.viewportTop);
      assert.ok(state.scroll<=state.client+1 || (state.top>0 && ['auto','scroll'].includes(state.overflow)));
    }
   }
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
