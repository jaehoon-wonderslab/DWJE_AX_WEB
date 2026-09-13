const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { open, WEB } = require('../lib/browser');
(async()=>{
 const {browser,page}=await open();const errors=[];let trend;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(r.url().includes('/production/results/trend?')&&r.ok())trend=(await r.json()).data;});
 try{
  await page.goto(WEB+'/production/result');
  const gridButton=page.getByRole('button',{name:'집계 결과 엑셀 다운로드',exact:true});
  await gridButton.waitFor({timeout:60000});
  await page.waitForFunction(()=>!document.querySelector('[aria-label="집계 결과 엑셀 다운로드"]')?.disabled);
  await page.locator('.tabulator-row .tabulator-cell').first().waitFor({timeout:60000});
  const dates=page.getByPlaceholder('YYYY-MM-DD');
  const expected=await page.evaluate(()=>{const f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const to=new Date(),from=new Date();from.setDate(from.getDate()-7);return [f(from),f(to)];});
  assert.deepEqual(await dates.evaluateAll(es=>es.map(e=>e.value)),expected);
  assert.equal(await page.getByText('집계 단위',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'제품 선택 (전체)',exact:true}).count(),0);
  assert.equal((await page.locator('body').innerText()).includes('덕파트장'),false);
  assert.ok((await page.locator('body').innerText()).includes('덕반장 AI'));
  const chartLabels=await page.locator('.production-date-label').allTextContents();
  assert.deepEqual(chartLabels,trend.labels.map(x=>String(x).length>10?String(x).slice(5):String(x)));
  const last=page.locator('.production-date-label').last();
  assert.ok(await last.count());
  await last.evaluate(e=>{e.closest('svg').parentElement.scrollLeft=e.closest('svg').parentElement.scrollWidth;});
  const lastFits=await last.evaluate(e=>{const svg=e.closest('svg');const box=e.getBoundingClientRect();const bounds=svg.parentElement.getBoundingClientRect();return box.left>=bounds.left && box.right<=bounds.right;});
  assert.ok(lastFits,'last date should be readable at end of horizontal scroll');
  await dates.nth(0).fill('2026-01-01');
  const pending=page.waitForEvent('download');await gridButton.click();const download=await pending;
  assert.ok(download.suggestedFilename().includes(expected.join('_')),'filename must use applied range');
  const book=new ExcelJS.Workbook();await book.xlsx.readFile(await download.path());
  const ws=book.worksheets[0];assert.equal(ws.getRow(1).getCell(5).text,'설비 코드');assert.equal(ws.getRow(1).getCell(6).text,'설비명');
  assert.ok(ws.rowCount>2);
  let rows=0;const data=await page.evaluate(()=>window._dwje_tabulator.getData());
  const count=rs=>rs.forEach(r=>{rows++;count(r._children||[])});count(data);assert.equal(ws.rowCount,rows+1);
  // API가 준비되기 전에도 프론트의 요청 계약/바이너리 저장을 검증합니다.
  // 실제 API 배포 후에는 SCREEN_EXPORT_LIVE=1로 같은 테스트를 실행합니다.
  if (process.env.SCREEN_EXPORT_LIVE !== '1') {
    const fixture=new ExcelJS.Workbook();
    ['조회 요약','일별 추이','집계 결과'].forEach(name=>fixture.addWorksheet(name).addRow(['계약 검증용']));
    const buffer=await fixture.xlsx.writeBuffer();
    await page.route('**/production/results/export?**',async route=>{
      const request=route.request();
      assert.equal(new URL(request.url()).searchParams.get('scope'),'screen');
      assert.equal(new URL(request.url()).searchParams.get('unit'),'day');
      assert.deepEqual(request.postDataJSON(),{from:expected[0],to:expected[1],format:'xlsx'});
      await route.fulfill({status:200,body:buffer,headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','content-disposition':'attachment; filename="production_screen.xlsx"'}});
    });
  }
  const fullDownload=page.waitForEvent('download',{timeout:120000});
  await page.getByRole('button',{name:'화면 전체 엑셀 다운로드',exact:true}).click();
  const full=await fullDownload;
  const fullBook=new ExcelJS.Workbook();await fullBook.xlsx.readFile(await full.path());
  assert.ok(fullBook.worksheets.length>=3,'full export needs summary, trend and result sheets');
  console.log('screen export',process.env.SCREEN_EXPORT_LIVE==='1'?'live API':'contract fixture',fullBook.worksheets.map(s=>s.name));
  assert.deepEqual(errors,[]);
  console.log({dates:expected,chartLabels:chartLabels.length,lastLabel:chartLabels.at(-1),file:download.suggestedFilename(),excelRows:ws.rowCount});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
