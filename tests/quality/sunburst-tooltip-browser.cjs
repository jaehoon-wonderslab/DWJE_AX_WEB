const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(WEB+'/quality/defect');
  for(const name of ['불량 유형별 상세 구성','제품별 불량 구성','라인별 불량 구성']){
   const chart=page.locator('[data-sunburst="'+name+'"]');
   await chart.locator('svg path[role="button"]').first().waitFor({timeout:60000});
   assert.equal(await chart.locator('[data-sunburst-detail]').count(),0);
   assert.ok(await chart.locator('[data-sunburst-boundaries] path').count()>0);
   assert.equal(await chart.locator('[data-sunburst-overall]').innerText(),'전체 대비 100.0%');
   const first=chart.locator('[data-sunburst-item]').first();
   const nameText=await first.locator('strong').innerText();
   await first.scrollIntoViewIfNeeded();
   await page.waitForTimeout(250);
   await first.hover();
   const tooltip=page.getByRole('tooltip');
   await tooltip.waitFor();
   assert.ok((await tooltip.innerText()).includes(nameText));
   assert.ok((await tooltip.innerText()).includes('전체 대비'));
   const bounds=await tooltip.boundingBox();
   const viewport=page.viewportSize();
   assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=viewport.width && bounds.y+bounds.height<=viewport.height);
   const whole=(await tooltip.innerText()).match(/전체 대비\s+([\d.]+)%/)[1];
   await first.click();
   assert.equal(await chart.locator('[data-sunburst-overall]').innerText(),'전체 대비 '+whole+'%');
   await page.mouse.move(0,0);
   assert.equal(await page.getByRole('tooltip').count(),0);
   await chart.locator('svg').scrollIntoViewIfNeeded();
   await page.waitForTimeout(250);
   await chart.locator('svg path[role="button"]').first().focus();
   await page.getByRole('tooltip').waitFor();
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('tooltip').count(),0);
   await chart.getByRole('button',{name:'전체 보기',exact:true}).click();
  }
  assert.deepEqual(errors,[]);
  console.log('3 charts: hover/focus tooltip, viewport bounds, dismissal, group borders and overall denominator passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
