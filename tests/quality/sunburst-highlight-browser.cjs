const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();
 try{
  await page.goto(WEB+'/production/result');
  await page.locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
  for(const field of ['inputQty','okQty','ngQty','defectRate']){
    assert.equal(await page.locator('.tabulator-col[tabulator-field="'+field+'"] input').count(),0);
    assert.equal(await page.locator('.tabulator-col[tabulator-field="'+field+'"] .custom-sort-indicator').count(),1);
  }
  assert.equal(await page.locator('.tabulator-col[tabulator-field="date"] input').count(),1);
  await page.goto(WEB+'/quality/defect');
  for(const name of ['불량 유형별 상세 구성','제품별 불량 구성','라인별 불량 구성']){
    const chart=page.locator('[data-sunburst="'+name+'"]');
    const first=chart.locator('[data-sunburst-item]').first();
    await first.waitFor({timeout:60000});await first.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
    await first.hover();
    assert.equal(await chart.locator('[data-sunburst-highlight]').count(),1);
    assert.ok(await chart.locator('[data-sunburst-node][data-highlight="dimmed"]').count()>0);
    assert.equal(await first.getAttribute('data-highlight'),'active');
    const key=await chart.locator('[data-sunburst-highlight]').getAttribute('data-sunburst-highlight');
    assert.ok(await chart.locator('[data-sunburst-node]').evaluateAll((es,key)=>es.some(e=>e.dataset.sunburstNode===key&&e.dataset.highlight==='active'),key));
    await page.mouse.move(0,0);
    assert.equal(await chart.locator('[data-sunburst-highlight]').count(),0);
    assert.equal(await chart.locator('[data-sunburst-node][data-highlight="dimmed"]').count(),0);
    await chart.locator('svg').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
    await chart.locator('path[role="button"]').first().focus();
    assert.equal(await chart.locator('[data-sunburst-highlight]').count(),1);
    assert.ok(await chart.locator('[data-sunburst-item][data-highlight="active"]').count()>0);
    await page.keyboard.press('Escape');
    assert.equal(await chart.locator('[data-sunburst-highlight]').count(),0);
  }
  console.log('production: 4 filters removed, sorting retained; 3 sunbursts: linked highlight, dimming and reset passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
