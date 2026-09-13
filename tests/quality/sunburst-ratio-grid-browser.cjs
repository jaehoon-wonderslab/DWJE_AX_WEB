const assert=require('node:assert/strict');
const {open,WEB}=require('../lib/browser');
(async()=>{
 const {browser,page}=await open();
 try{
  await page.route('**/quality/defects/by-product?**',route=>route.fulfill({json:{success:true,data:{items:[
   {level:'item',itemCd:'A',itemNm:'A',totalQty:1000,ngQty:100,children:[
    {level:'defect',defectCd:'X',defectNm:'X',itemNm:'A',ngQty:25},
    {level:'defect',defectCd:'Y',defectNm:'Y',itemNm:'A',ngQty:75}]},
   {level:'item',itemCd:'B',itemNm:'B',totalQty:1000,ngQty:300,children:[
    {level:'defect',defectCd:'X',defectNm:'X',itemNm:'B',ngQty:300}]}
  ]}}}));
  await page.goto(WEB+'/quality/defect');
  const chart=page.locator('[data-sunburst="제품별 불량 구성"]');
  const arc=chart.locator('path[role="button"][aria-label*="제품: A"][aria-label*="불량 유형: X"]');
  await arc.waitFor({timeout:60000});
  await chart.locator('svg').scrollIntoViewIfNeeded();await page.waitForTimeout(250);await arc.focus();
  const tooltip=page.getByRole('tooltip');await tooltip.waitFor();
  const cell=label=>tooltip.getByRole('row').filter({has:page.getByRole('rowheader',{name:label,exact:true})}).getByRole('cell');
  assert.equal(await cell('전체 대비').innerText(),'6.3%');
  assert.equal(await cell('그룹 내 비율').innerText(),'25.0%');
  assert.equal(await tooltip.getByRole('rowheader',{name:'그룹 기준',exact:true}).count(),0);
  const y1=(await cell('전체 대비').boundingBox()).y,y2=(await cell('그룹 내 비율').boundingBox()).y;
  assert.ok(y2>y1);
  assert.equal(await tooltip.getByRole('rowheader',{name:'제품',exact:true}).count(),0);assert.equal(await cell('불량 유형').innerText(),'X');
  await page.keyboard.press('Escape');
  await chart.locator('[data-sunburst-item]').filter({has:page.getByText('제품: A',{exact:true})}).click();
  await chart.locator('svg').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  await chart.locator('path[role="button"][aria-label*="불량 유형: X"]').focus();
  await tooltip.waitFor();
  assert.equal(await cell('전체 대비').innerText(),'6.3%');
  assert.equal(await cell('그룹 내 비율').innerText(),'25.0%');
  console.log('ratio table: 25/400=6.3% overall, 25/100=25% parent, separate rows and zoom invariance passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
