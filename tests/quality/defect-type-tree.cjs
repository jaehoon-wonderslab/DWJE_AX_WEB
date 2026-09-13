const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const {defectTypeTree}=await import('data:text/javascript;base64,'+fs.readFileSync('src/domains/quality/model/defectTypeTree.js').toString('base64'));
 const type=(code,ng)=>({defectCd:code,defectNm:code,totalQty:100,ngQty:ng,defectRate:ng,_children:[]});
 const products=[
  {itemCd:'P1',totalQty:100,ngQty:30,_children:[type('A',10),type('B',20)]},
  {itemCd:'P2',totalQty:200,ngQty:30,_children:[{...type('A',30),totalQty:200}]}
 ];
 const copy=JSON.stringify(products);
 const rows=defectTypeTree(products),a=rows.find(r=>r.defectCd==='A');
 assert.equal(a.ngQty,40);assert.equal(a.totalQty,300);assert.equal(a.defectRate,13.33);assert.equal(a.ratio,66.67);
 assert.deepEqual(a._children.map(r=>r.ratio),[75,25]);
 assert.equal(rows.reduce((n,r)=>n+r.ngQty,0),60);
 assert.equal(JSON.stringify(products),copy);
 assert.equal(defectTypeTree([{totalQty:null,ngQty:null,_children:[{defectCd:'A',ngQty:null}]}])[0].ngQty,null);
 assert.deepEqual(defectTypeTree([]),[]);
 console.log('type regrouping: totals, denominators, ratios, null and immutability passed');
})().catch(e=>{console.error(e);process.exitCode=1});
