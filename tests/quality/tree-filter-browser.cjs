const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];let products;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(r.url().includes('/quality/defects/by-product?')&&r.ok())products=(await r.json()).data.items});
 try{
  await page.goto(WEB+'/quality/defect');
  await page.locator('.tabulator').nth(3).locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
  const flat=[];const walk=rs=>rs.forEach(r=>{flat.push(r);walk(r.children||[])});walk(products);
  const sample=flat.find(r=>r.wcNm&&r.eqptCd&&r.itemCd&&r.defectNm);
  for(const index of [1,2,3]){
    const grid=page.locator('.tabulator').nth(index);
    for(const field of ['itemNm','eqptCd','wcNm','plantNm','defectNm']){
      const input=grid.locator('.tabulator-col[tabulator-field="'+field+'"] input');
      if(!sample[field]||!await input.count())continue;
      await input.fill(sample[field]);await page.waitForTimeout(600);
      assert.ok(await grid.locator('.tabulator-row .tabulator-cell').count()>0,index+' '+field+' should match descendant');
      await input.fill('no-such-value-987654');await page.waitForTimeout(500);
      assert.equal(await grid.locator('.tabulator-row .tabulator-cell').count(),0);
      await input.fill('');await page.waitForTimeout(500);
    }
  }
  const target=products.find(p=>String(p.itemCd).toLowerCase()==='d53bps-yl');
  console.log({filterFields:'itemNm,eqptCd,wcNm,plantNm,defectNm',targetPresent:!!target});
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
