/*
 * 항목 단위 데이터 권한 — 로컬 API 실측 시험 (2026-10-07, V82)
 *   node tests/system/data-item-perm-live.cjs          (로컬 API 8080 · V82 적용 DB)
 *
 * 전산팀(10004)에게 「불량 수량」 항목만 숨기고, 같은 묶음(생산·출하 수량)의 다른 항목은 그대로 보이는지 확인합니다.
 * 끝나면 원래대로 돌려 놓습니다(전산팀 · 불량 수량 = 원래 값).
 *
 *  · PUT /system/data-fields/item-perms — 불량 수량(ngQty …) 항목을 재사용하고 전산팀만 비공개
 *  · /auth/me — 기본 묶음 qty 는 느슨한 판정으로 그대로(dataPerms 에 qty), 불량 수량 항목 key 는 빠짐
 *  · GET /dashboard/ai/summary — ngQty 는 null, okQty · todayQty 는 값 그대로
 *  · GET /quality/aoi/dimension/summary (있으면) — failCnt(불량 수량의 다른 이름)도 null
 *  · 되돌린 뒤 ngQty 가 다시 보임
 */
const assert = require('node:assert/strict');
const { get, send, login, data } = require('../lib/api');

const DEPT_IT = '전산팀';
const NG_ATTRS = ['ngQty', 'defectQuantity', 'failCnt', 'ngCnt', 'ngFinalCnt', 'prodNgCnt', 'totalNgQty', 'typedNgQty', 'untypedNgQty'];

(async () => {
  const perms = await data('/system/data-perms');
  const it = perms.depts.find((d) => d.deptNm === DEPT_IT);
  assert(it, 'dept 전산팀');
  const ngKind = perms.fields.find((f) => (f.attrs || []).includes('ngQty'));
  assert(ngKind, 'ngQty item kind');
  assert.deepEqual([...ngKind.attrs].sort(), [...NG_ATTRS].sort(), `ngQty kind attrs ${ngKind.attrs}`);
  const before = (perms.matrix[String(it.deptId)] || []).includes(ngKind.key);
  const okKind = perms.fields.find((f) => (f.attrs || []).includes('okQty'));
  assert((perms.matrix[String(it.deptId)] || []).includes(okKind.key), '전산팀 can see okQty before');

  try {
    // 1) 불량 수량만 숨기기 — 같은 필드명 묶음이라 항목을 재사용해야 합니다
    const r = await send('PUT', '/system/data-fields/item-perms', { name: '불량 수량', attrs: NG_ATTRS, perms: { [String(it.deptId)]: false } });
    assert(r.ok, `item-perms ${r.status} ${r.body?.message}`);
    assert.equal(r.body.data.fieldKey, ngKind.key, 'reused existing item');
    assert.equal(r.body.data.created, false);

    // 2) 전산팀 계정의 권한
    const me = await data('/auth/me', {}, 'it');
    assert(me.dataPerms.includes('qty'), 'qty group stays (lenient)');
    assert(!me.dataPerms.includes(ngKind.key), 'ngQty item hidden');
    assert(me.dataPerms.includes(okKind.key), 'okQty item visible');

    // 3) 실제 응답 — 같은 묶음의 다른 값은 보이고 불량 수량만 null
    const sum = await get('/dashboard/ai/summary', {}, 'it');
    assert.equal(sum.status, 200, `summary ${sum.status}`);
    const s = sum.body.data;
    assert.equal(s.ngQty ?? null, null, `ngQty masked (${s.ngQty})`);
    assert.notEqual(s.okQty ?? null, null, 'okQty visible');
    assert.notEqual(s.todayQty ?? null, null, 'todayQty visible');
    assert((sum.body.masked || []).includes(ngKind.key), `masked lists item key ${sum.body.masked}`);

    const lines = await get('/dashboard/ai/lines', { size: 5 }, 'it');
    if (lines.status === 200) {
      const rows = lines.body.data?.lines || lines.body.data?.items || [];
      if (rows.length) {
        assert(rows.every((x) => x.ngQty == null), 'lines ngQty masked');
        assert(rows.some((x) => x.qty != null), 'lines qty visible');
      }
    }
  } finally {
    const back = await send('PUT', '/system/data-fields/item-perms', { name: '불량 수량', attrs: NG_ATTRS, perms: { [String(it.deptId)]: before } });
    assert(back.ok, 'restore');
  }

  // 3-2) 생산관리팀 — 불량 현황 유형표의 cnt(뜻 = 불량 수량)도 함께 가려짐(화면마다 뜻이 다른 이름이라 항목 필드명으로 판정)
  {
    const prod = perms.depts.find((d) => d.deptNm === '생산관리팀');
    const was = (perms.matrix[String(prod.deptId)] || []).includes(ngKind.key);
    try {
      assert((await send('PUT', '/system/data-fields/item-perms', { name: '불량 수량', attrs: NG_ATTRS, perms: { [String(prod.deptId)]: false } })).ok);
      const byType = await get('/quality/defects/by-type', { from: '2026-09-01', to: '2026-09-30' }, 'prod');
      assert.equal(byType.status, 200, `by-type ${byType.status}`);
      const rows = byType.body.data?.items || [];
      if (rows.length) assert(rows.every((x) => x.cnt == null), 'by-type cnt masked with 불량 수량');
      const line = await get('/quality/defects/by-line', { from: '2026-09-01', to: '2026-09-30' }, 'prod');
      const lrows = line.body.data?.items || [];
      if (lrows.length) {
        assert(lrows.every((x) => x.ngQty == null), 'by-line ngQty masked');
        assert(lrows.some((x) => x.okQty != null), 'by-line okQty visible');
      }
      console.log(`  생산관리팀: 유형표 cnt ${rows.length}행 · 라인 ngQty ${lrows.length}행 가림, okQty 보임`);
    } finally {
      assert((await send('PUT', '/system/data-fields/item-perms', { name: '불량 수량', attrs: NG_ATTRS, perms: { [String(prod.deptId)]: was } })).ok);
    }
  }

  // 4) 되돌린 뒤
  const me2 = await data('/auth/me', {}, 'it');
  assert.equal(me2.dataPerms.includes(ngKind.key), before, 'restored');
  console.log('PASS: data-item-perm-live — item reuse, lenient group qty kept, ngQty item hidden only, summary ngQty null · okQty/todayQty visible, restored');
})().catch((e) => { console.error(e); process.exit(1); });
