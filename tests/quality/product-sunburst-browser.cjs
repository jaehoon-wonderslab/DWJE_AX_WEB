const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];let product;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error' && /same key|Encountered two children/.test(m.text()))errors.push(m.text())});
 page.on('response',async r=>{if(r.url().includes('/quality/defects/by-product?')&&r.ok())product=(await r.json()).data;});
 try {
  if(process.env.PRODUCT_FIXTURE==='1') await page.route('**/quality/defects/by-product?**',route=>route.fulfill({json:{success:true,data:{items:[
    {level:'item',itemCd:'A',itemNm:'제품 A',totalQty:1000,ngQty:100,defectRate:10,ratio:100,children:[
      {level:'defect',itemCd:'A',itemNm:'제품 A',defectNm:'찍힘',totalQty:1000,ngQty:100,defectRate:10,ratio:100,children:[
        {level:'eqpt',itemNm:'제품 A',eqptCd:'L1',eqptNm:'설비 1',totalQty:500,ngQty:100,defectRate:20,ratio:100,children:[
          {level:'wc',wcNm:'공정 1',plantNm:'공장 1',totalQty:500,ngQty:100,defectRate:20,ratio:100}
        ]}
      ]}
    ]}
  ]}}}));
  await page.goto(WEB+'/quality/defect');
  const grid=page.locator('.tabulator').nth(2);
  await grid.locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
  assert.ok(product.items.length);assert.ok(product.items.every(r=>r.level==='item'));
  const validate = nodes => nodes.forEach(n=>{
    if(n.children?.length){assert.equal(n.children.reduce((sum,c)=>sum+c.ngQty,0),n.ngQty);validate(n.children);}
    if(n.totalQty>0) assert.ok(Math.abs(n.defectRate-n.ngQty/n.totalQty*100)<0.011);
  });
  validate(product.items);

  assert.equal(await grid.locator('[data-current-stage="true"]').first().getAttribute('title'),'1단계 제품');
  await grid.locator('.dw-tree-toggle').first().click();
  assert.ok((await grid.locator('.tabulator-tree-level-1 [data-tree-stage]').first().getAttribute('title')).includes('불량 유형'));
  assert.equal(await page.getByText('불량별 비중',{exact:true}).count(),1);
  assert.equal(await page.getByText('불량 유형별 분포',{exact:true}).count(),1);
  const typeGrid=page.locator('.tabulator').nth(1);
  assert.equal(await typeGrid.locator('[data-current-stage="true"]').first().getAttribute('title'),'1단계 불량 유형');
  await typeGrid.locator('.dw-tree-toggle').first().click();
  assert.ok((await typeGrid.locator('.tabulator-tree-level-1 [data-tree-stage]').first().getAttribute('title')).includes('제품'));
  for(const name of ['불량 유형별 상세 구성','제품별 불량 구성','라인별 불량 구성']){
    const chart=page.locator('[data-sunburst="'+name+'"]');
    await chart.locator('svg path').first().waitFor({timeout:60000});
    const original=await chart.locator('[data-sunburst-path]').innerText();
    await chart.locator('svg path').first().press('Enter');
    assert.notEqual(await chart.locator('[data-sunburst-path]').innerText(),original);
    await chart.getByRole('button',{name:'상위로',exact:true}).click();
    assert.equal(await chart.locator('[data-sunburst-path]').innerText(),original);
    await chart.getByRole('textbox').fill('없는항목검색');
    assert.equal(await chart.locator('button').filter({hasText:'·'}).count(),0);
    await chart.getByRole('textbox').fill('');
  }
  await page.setViewportSize({width:1000,height:900});
  await page.waitForTimeout(300);
  const overflow=await page.locator('[data-sunburst]').evaluateAll(es=>es.map(e=>({name:e.dataset.sunburst,width:e.clientWidth,scroll:e.scrollWidth})));
  overflow.forEach(e=>assert.ok(e.scroll<=e.width+1));
  const rail=page.getByRole('region',{name:'표 가로 스크롤'}).nth(2);
  await rail.evaluate(e=>{e.scrollLeft=e.scrollWidth});await page.waitForTimeout(200);
  const last=await grid.evaluate(e=>{const h=e.querySelector('.tabulator-tableholder'),c=e.querySelector('.tabulator-row .tabulator-cell:last-child');return {right:c.getBoundingClientRect().right,bound:h.getBoundingClientRect().right};});
  assert.ok(last.right<=last.bound+2);
  await page.locator('[data-sunburst=\"라인별 불량 구성\"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/quality-product-sunburst.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log({products:product.items.length,overflow,last});
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
