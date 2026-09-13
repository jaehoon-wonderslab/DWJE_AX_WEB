const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];let tree;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(r.url().includes('/quality/defects/tree?')&&r.ok()) tree=(await r.json()).data;});
 try {
  await page.setViewportSize({width:1100,height:1000});
  await page.goto(WEB+'/quality/defect');
  const grid=page.locator('.tabulator').nth(3);
  await grid.locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
  assert.ok(tree.items.length);
  assert.ok(tree.items.every(r=>r.level==='eqpt'));
  assert.equal(new Set(tree.items.map(r=>r.eqptCd)).size,tree.items.length);
  assert.equal(await grid.locator('[data-current-stage="true"]').first().getAttribute('title'),'1단계 라인');
  await grid.locator('.dw-tree-toggle').first().click();
  await grid.locator('.tabulator-tree-level-1').first().waitFor();
  assert.ok((await grid.locator('.tabulator-tree-level-1 [data-tree-stage]').first().getAttribute('title')).includes('공정'));
  const head=grid.locator('.tabulator-col[tabulator-field="eqptCd"]');
  const before=await head.evaluate(e=>e.getBoundingClientRect().width);
  const box=await head.boundingBox();
  const h={x:box.x+box.width-3,y:box.y,width:4};
  await page.mouse.move(h.x+h.width/2,h.y+10);await page.mouse.down();await page.mouse.move(h.x+h.width/2+65,h.y+10,{steps:8});await page.mouse.up();
  const after=await head.evaluate(e=>e.getBoundingClientRect().width);
  assert.ok(after>before+40);
  await page.waitForTimeout(300);
  const rail=page.getByRole('region',{name:'표 가로 스크롤'}).nth(3);
  await rail.evaluate(e=>{e.scrollLeft=e.scrollWidth});
  await page.waitForTimeout(200);
  const scroll=await grid.evaluate(e=>{const h=e.querySelector('.tabulator-tableholder'),last=e.querySelector('.tabulator-row .tabulator-cell:last-child');return {left:h.scrollLeft,last:last.getBoundingClientRect().right,bound:h.getBoundingClientRect().right};});
  console.log(scroll);assert.ok(scroll.left>0);assert.ok(scroll.last<=scroll.bound+2);
  const charts=await page.locator('svg[role="img"]').evaluateAll(es=>es.filter(e=>e.querySelector('.x-axis-label')).map(e=>{
    const boxes=[...e.querySelectorAll('.x-axis-label')].map(t=>t.getBoundingClientRect());
    const fonts=[...e.querySelectorAll('text')].map(t=>Number(t.getAttribute('font-size')));
    return {labels:boxes.length,overlap:boxes.some((b,i)=>i&&boxes[i-1].right>b.left),minFont:Math.min(...fonts),scroll:e.parentElement.scrollWidth>e.parentElement.clientWidth};
  }));
  assert.equal(charts.length,1);
  charts.forEach(c=>{assert.equal(c.overlap,false);assert.ok(c.minFont>=17)});
  assert.deepEqual(errors,[]);
  console.log({lines:tree.items.length,resize:[before,after],scroll,charts});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
