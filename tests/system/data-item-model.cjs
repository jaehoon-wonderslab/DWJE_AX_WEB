/*
 * 항목(이름) 묶기 계산 시험 — src/domains/system/model/dataItemModel.js (2026-10-07)
 *   node tests/system/data-item-model.cjs
 *
 *  · 같은 제목 · 같은 값 이름으로 잇기(불량 수량 ↔ 불량, ngQty)
 *  · 공용 키(value)는 잇지 않고 고를 수 없음 — 다른 항목(Loss 수량)과 섞이지 않음
 *  · 이름이 같아도 뜻이 다른 제목(모델)은 값 이름별로 나눔
 *  · 종류에만 있는 값도 항목으로 · 예약어 잠금
 *  · 상태: 보임 / 가림 / 일부만 가림 / 고를 수 없음
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { buildDataItems, itemState } = await import(`data:text/javascript;base64,${fs.readFileSync('src/domains/system/model/dataItemModel.js').toString('base64')}`);
  const screens = [
    { name: 'AI 대시보드', rows: [{ field: 'ngQty', title: '불량 수량' }, { field: 'value', title: '확인된 값' }, { field: 'product', title: '제품' }] },
    { name: '불량 현황', rows: [{ field: 'value', title: '불량 수량' }, { field: 'defectRate', title: '불량률' }, { field: 'itemNm', title: '제품명' }, { field: 'itemNm', title: '제품' }] },
    { name: '실적', rows: [{ field: 'ngQty', title: '불량' }, { field: 'productNm', title: '제품명' }] },
    { name: 'AOI', rows: [{ field: 'failRate', title: '불량률' }, { field: 'model', title: '모델' }] },
    { name: '수율', rows: [{ field: 'value', title: 'Loss 수량' }, { field: 'question', title: '질문' }] },
    { name: '질의 이력', rows: [{ field: 'llmModel', title: '모델' }] },
  ];
  const kinds = [{ key: 'qty', name: '수량', attrs: ['ngQty', 'hourlyThroughput'] }, { key: 'yield', name: '수율', attrs: [{ attrName: 'defectRate' }] }];
  const items = buildDataItems({ screens, kinds, reserved: new Set(['question']), titleOfAttr: (k, a) => (a === 'hourlyThroughput' ? '시간당 처리량' : a) });
  const by = (name) => items.find((x) => x.name === name);

  const ng = by('불량 수량');
  assert(ng, `items ${items.map((x) => x.name)}`);
  assert.deepEqual(ng.titles, ['불량']);
  assert.deepEqual(ng.keys.map((k) => [k.attr, k.lock]), [['ngQty', ''], ['value', 'generic']]);
  assert.deepEqual(ng.selectable, ['ngQty']);
  assert.deepEqual(ng.screens.sort(), ['AI 대시보드', '불량 현황', '실적'].sort());
  // value 로 잇지 않으므로 「Loss 수량」 · 「확인된 값」 은 따로, 고를 수 없음
  assert(by('Loss 수량') && by('확인된 값'), 'generic titles stay separate');
  assert.equal(by('Loss 수량').selectable.length, 0);

  const rate = by('불량률');
  assert.deepEqual(rate.selectable.sort(), ['defectRate', 'failRate']);
  // 제품 · 제품명 — itemNm 이 두 제목에 걸쳐 productNm 과 이어지고, product(공용)도 「제품」 제목으로 들어옴
  const prod = items.find((x) => x.selectable.includes('itemNm'));
  assert.deepEqual(prod.selectable.sort(), ['itemNm', 'productNm']);
  assert(prod.keys.some((k) => k.attr === 'product' && k.lock === 'generic'));

  // 모델 — 이름으로 잇지 않음 → 값 이름별 두 항목, 이름에 값 이름을 붙여 구분
  assert(by('모델 (model)') && by('모델 (llmModel)'), `models ${items.map((x) => x.name)}`);
  // 종류에만 있는 값 · 예약어
  assert(by('시간당 처리량')?.screens.length === 0, 'kind-only attr item');
  assert.equal(by('질문').keys[0].lock, 'reserved');

  const owner = { ngQty: 'qty', defectRate: 'yield' };
  const kindOf = (a) => owner[a] || '';
  assert.deepEqual(itemState(ng, kindOf), { state: 'all', kind: 'qty', hidden: 1, total: 1 });
  assert.equal(itemState(rate, kindOf).state, 'partial', 'defectRate hidden, failRate not');
  assert.equal(itemState(prod, kindOf).state, 'none');
  assert.equal(itemState(by('Loss 수량'), kindOf).state, 'locked');
  owner.failRate = 'qty';
  assert.equal(itemState(rate, kindOf).state, 'partial', 'two different kinds is partial');
  owner.failRate = 'yield';
  assert.deepEqual(itemState(rate, kindOf), { state: 'all', kind: 'yield', hidden: 2, total: 2 });

  console.log('PASS: data-item-model — title/field joins, generic keys excluded, split titles, kind-only attrs, reserved, states(all/partial/none/locked)');
})().catch((e) => { console.error(e); process.exit(1); });
