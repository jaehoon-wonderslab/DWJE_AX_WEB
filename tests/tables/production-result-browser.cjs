const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
(async () => {
 const {browser,page}=await open();
 try {
  await page.goto(WEB+'/production/result');
  await page.locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
  const header=page.locator('.tabulator-col[tabulator-field="date"]');
  const before=await header.evaluate(e=>e.getBoundingClientRect().width);
  const handle=page.locator('.tabulator-header .tabulator-col-resize-handle').first();
  const box=await handle.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+15);
  await page.mouse.down(); await page.mouse.move(box.x+box.width/2+80,box.y+15,{steps:8}); await page.mouse.up();
  const after=await header.evaluate(e=>e.getBoundingClientRect().width);
  assert.ok(after>before+50,`drag resize failed: ${before} -> ${after}`);
  const rail=page.getByRole('region',{name:'집계 결과 가로 스크롤'});
  await page.waitForTimeout(300);
  await rail.evaluate(e=>{e.scrollLeft=e.scrollWidth});
  await page.waitForTimeout(200);
  const scroll=await page.evaluate(()=>{
   const h=document.querySelector('.tabulator-tableholder');const r=document.querySelector('[aria-label="집계 결과 가로 스크롤"]');
   const t=window._dwje_tabulator;const last=t.getColumns().at(-1);const cell=t.getRows()[0].getCell(last.getField()).getElement().getBoundingClientRect();
   return {rail:r.scrollLeft,body:h.scrollLeft,right:cell.right,bound:h.getBoundingClientRect().right};
  });
  assert.ok(scroll.rail>0 && Math.abs(scroll.rail-scroll.body)<2 && scroll.right<=scroll.bound+2,JSON.stringify(scroll));
  const detail=await page.evaluate(()=>{const t=window._dwje_tabulator;for(const p of t.getRows()){p.treeExpand();for(const c of p.getTreeChildren()){c.treeExpand();for(const r of c.getTreeChildren()){const d=r.getData();if(d.plantNm)return d;}}}});
  assert.ok(detail.equipCd && detail.equipNm);
  assert.ok(!detail.processNm.includes(`(${detail.plantNm})`));
  assert.ok(!detail.equipNm.startsWith(detail.equipCd+' ('));
  const chart=await page.locator('#production-trend-d3-svg').evaluate(e=>({minFont:Math.min(...[...e.querySelectorAll('text')].map(t=>Number(t.getAttribute('font-size')))),line:e.querySelector('path[stroke]')?.getAttribute('stroke')}));
  assert.ok(chart.minFont>=15);assert.equal(chart.line,'#be123c');
  await rail.evaluate(e=>{e.scrollLeft=0});
  await page.screenshot({path:'/tmp/production-result-fixed.png',fullPage:true});
  console.log({resize:[before,after],scroll,detail:{plant:detail.plantNm,process:detail.processNm,code:detail.equipCd,name:detail.equipNm},chart});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
