const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(WEB+'/quality/defect');
  await page.locator('[data-sunburst="불량 유형별 상세 구성"] svg path').first().waitFor({timeout:60000});
  const overlaps=await page.locator('.tabulator-col.tabulator-sortable .tabulator-col-title-holder').evaluateAll(es=>es.map(e=>{
   const t=e.querySelector('.tabulator-col-title'),s=e.querySelector('.tabulator-col-sorter');
   return t&&s ? {text:t.textContent,overlap:t.getBoundingClientRect().right>s.getBoundingClientRect().left+1}:null;
  }).filter(Boolean).filter(x=>x.overlap));
  assert.deepEqual(overlaps,[]);
  const depths=[];
  for(const name of ['불량 유형별 상세 구성','제품별 불량 구성','라인별 불량 구성']){
    const chart=page.locator('[data-sunburst="'+name+'"]');
    await chart.locator('svg path').first().waitFor();
    for(let depth=0;depth<3;depth++){
      const first=chart.locator('[data-sunburst-item]').first();
      const label=await first.locator('strong').innerText();
      await first.click();
      const trail=await chart.locator('[data-sunburst-path]').innerText();
      assert.ok(trail.includes(label));
      assert.ok(await chart.locator('[data-sunburst-label]').count()>0,'labels required after zoom '+name+' '+depth);
      const fills=await chart.locator('[data-sunburst-label]').evaluateAll(es=>es.map(e=>e.getAttribute('fill')));
      assert.ok(fills.every(c=>c==='#ffffff'));
      const items=await chart.locator('[data-sunburst-item]').allTextContents();
      items.forEach(t=>assert.ok(t.includes(label),'child row must include parent context'));
      depths.push({name,depth:depth+1,trail,labels:await chart.locator('[data-sunburst-label]').count()});
    }
    await chart.screenshot({path:'/tmp/sunburst-'+name+'.png'});
    await chart.getByRole('button',{name:'전체 보기',exact:true}).click();
  }
  await page.goto(WEB+'/production/result');
  await page.locator('.custom-sort-indicator').first().waitFor({timeout:60000});
  const production=await page.locator('.custom-sort-indicator').evaluateAll(es=>es.map(e=>{
    const t=e.parentElement.querySelector('.tabulator-col-title');
    return t.getBoundingClientRect().right<=e.getBoundingClientRect().left+1;
  }));
  assert.ok(production.every(Boolean));
  assert.deepEqual(errors,[]);
  console.log({headerOverlaps:overlaps.length,productionHeaders:production.length,depths});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
