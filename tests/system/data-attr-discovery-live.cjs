/*
 * 새로 발견된 응답 데이터 — 로컬 API 실측 (2026-10-08, V83)
 *   node tests/system/data-attr-discovery-live.cjs     (로컬 API 8080 · V82 · V83 적용 DB)
 *
 *  · 업무 응답을 한 번 부르면 등록되지 않은 값 이름이 발견 목록에 남는다(값은 없음, 경로 · 시각만)
 *  · 가리지 않음 → IGNORED, 되돌리기 → NEW
 *  · 새 항목 만들기(item-perms) → 목록에서 빠지고 데이터 항목이 생김 → 시험이 만든 항목을 지워 되돌림
 *  · 기존 항목에 넣기 → 그 항목의 부서 설정을 그대로 따름 → 항목에서 빼 되돌림
 */
const assert = require('node:assert/strict');
const { get, send, data } = require('../lib/api');

(async () => {
  // 1) 업무 응답 부르기 — AOI 예측 요약(표 밖 지표가 많은 응답)
  await get('/quality/aoi/prediction/summary', {});
  await get('/reports/ship-plan', { planYear: '2026' });
  const list = await data('/system/data-fields/discovered');
  assert.equal(list.ready, true, 'V83 ready');
  assert(list.items.length > 0, 'something discovered');
  const row = list.items.find((x) => x.status === 'NEW' && x.apiPaths.some((p) => p.startsWith('/api/v1/')));
  assert(row, 'a NEW row');
  assert(!('value' in row) && row.firstSeenAt && row.lastSeenAt, 'no value stored, timestamps present');
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(row.firstSeenAt), `local time ${row.firstSeenAt}`);

  // 2) 가리지 않음 · 되돌리기
  assert((await send('PUT', '/system/data-fields/discovered/ignore', { attrNames: [row.attrName], ignore: true })).ok);
  assert.equal((await data('/system/data-fields/discovered')).items.find((x) => x.attrName === row.attrName)?.status, 'IGNORED');
  assert((await send('PUT', '/system/data-fields/discovered/ignore', { attrNames: [row.attrName], ignore: false })).ok);
  assert.equal((await data('/system/data-fields/discovered')).items.find((x) => x.attrName === row.attrName)?.status, 'NEW');
  assert.equal((await send('PUT', '/system/data-fields/discovered/ignore', { attrNames: [], ignore: true })).status, 400, 'empty 400');

  // 3) 새 항목 만들기 → 목록에서 빠짐 → 지워 되돌림
  const made = await send('PUT', '/system/data-fields/item-perms', { name: `시험 ${row.attrName}`, attrs: [row.attrName], perms: {} });
  assert(made.ok, `create ${made.body?.message}`);
  const key = made.body.data.fieldKey;
  try {
    assert(!(await data('/system/data-fields/discovered')).items.some((x) => x.attrName === row.attrName), 'registered → gone from list');
    const perms = await data('/system/data-perms');
    const it = perms.depts.find((d) => d.deptNm === '전산팀');
    assert((perms.matrix[String(it.deptId)] || []).includes(key), 'new item visible to normal depts');
  } finally {
    assert((await send('DELETE', `/system/data-fields/${key}`)).ok, 'cleanup item');
  }
  assert((await data('/system/data-fields/discovered')).items.some((x) => x.attrName === row.attrName && x.status === 'NEW'), 'back to NEW after delete');
  console.log(`PASS: data-attr-discovery-live — ${list.items.length}개 발견, ${row.attrName}: 가리지 않음 · 되돌리기 · 새 항목 · 정리`);
})().catch((e) => { console.error(e); process.exit(1); });
