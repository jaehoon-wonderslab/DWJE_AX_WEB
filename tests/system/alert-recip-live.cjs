/*
 * 이상 알림 발송 조건(alert-cond)·알림 수신자(sys-recip) 실 API 계약 시험 — 기획 05·06 6.2, API 2단계 「WEB 이 쓸 계약」
 *
 * 화면이 기대하는 응답 모양을 실제 서버로 확인합니다. DB 를 바꾸지 않는 호출만 합니다
 * (같은 값으로 상태 바꾸기 → changed:false, 옛 updatedAt 으로 수정 → 409, 조회).
 * 테스트 발송은 대기열에 행을 만들므로 부르지 않습니다.
 *   API_URL=http://localhost:18081 node tests/system/alert-recip-live.cjs
 */
const assert = require('node:assert/strict');
const { get, send } = require('../lib/api');

const ok = (r, what) => { assert(r.body.success, `${what}: ${r.status} ${r.body.message}`); return r.body.data; };

(async () => {
  const skipped = [];
  // ── 05 발송 조건 ──
  const list = ok(await get('/alert-conditions', { size: 0 }, 'it'), '조건 전체');
  assert(list.items.length > 0, '로컬 조건이 있어야 합니다');
  const row = list.items[0];
  assert(Array.isArray(row.groups) && (row.groups.length === 0 || typeof row.groups[0] === 'object'), 'groups 는 객체 배열');
  assert(Array.isArray(row.groupNames), 'groupNames[] 가 따로 옵니다');
  assert(Array.isArray(row.groupIds), 'groupIds[]');
  const detail = ok(await get(`/alert-conditions/${row.condId}`, {}, 'it'), '조건 상세');
  for (const k of ['metricStdId', 'thresholdVal', 'targetScope', 'pickTargets', 'channels', 'groupIds', 'updatedAt', 'deletable']) {
    assert(k in detail, `상세에 ${k}`);
  }
  // 같은 값으로 상태 바꾸기 → changed:false (DB 그대로)
  const same = ok(await send('PATCH', `/alert-conditions/${row.condId}/state`, { on: !!detail.on }, 'it'), '상태 같은 값');
  assert.equal(same.changed, false, '같은 값이면 changed:false');
  // 본문 없는 상태 변경 → 400 field on
  const noBody = await send('PATCH', `/alert-conditions/${row.condId}/state`, {}, 'it');
  assert.equal(noBody.status, 400, '본문 없는 PATCH 는 400');
  // 옛 updatedAt 으로 수정 → 409 (DB 그대로)
  const stale = await send('PUT', `/alert-conditions/${row.condId}`, { name: detail.name, updatedAt: '2000-01-01 00:00:00' }, 'it');
  assert.equal(stale.status, 409, `동시 수정 409 (받은 ${stale.status})`);
  // 전산팀 삭제는 통합관리자만 (R-13) — 403 E-AUTH-002
  const del = await send('DELETE', `/alert-conditions/${row.condId}`, null, 'it');
  assert.equal(del.status, 403); assert.equal(del.body.code, 'E-AUTH-002');
  // 감지 지표 선택지 (ALC-02 권한)
  ok(await get('/metrics/standards', { size: 200 }, 'it'), '감지 지표');

  // ── 06 수신자 ──
  const groups = ok(await get('/alert-recipient-groups', {}, 'it'), '그룹 목록');
  const g = groups.items[0];
  assert(Array.isArray(g.members) && typeof g.members[0] === 'object', 'members 는 객체 배열');
  for (const k of ['memberCnt', 'receivingCnt', 'useFlg', 'updatedAt']) assert(k in g, `그룹 목록에 ${k}`);
  const gd = ok(await get(`/alert-recipient-groups/${g.groupId}`, {}, 'it'), '그룹 상세');
  assert(Array.isArray(gd.deptOptions) && gd.deptOptions.length, 'deptOptions');
  assert(!gd.deptOptions.some((o) => o.label === '미배정'), '미배정은 부서 선택지에서 빠집니다');
  const staleG = await send('PUT', `/alert-recipient-groups/${g.groupId}`, { name: gd.name, updatedAt: '2000-01-01 00:00:00' }, 'it');
  assert.equal(staleG.status, 409, `그룹 동시 수정 409 (받은 ${staleG.status})`);
  const all = await get('/alert-recipients', { size: 0 }, 'it');
  assert(all.body.success && all.body.meta, '수신자 size=0');
  assert('userState' in (all.body.data.items[0] || { userState: 1 }), '수신자 행에 userState');
  const cand = ok(await get('/alert-recipients/candidates', { size: 20 }, 'it'), '후보 계정');
  assert(Array.isArray(cand.items), '후보 items');

  // worker 권한 없는 계정(품질보증팀)은 연락처가 가려지고, 수신자 등록은 403
  const qa = await get('/alert-recipients', { size: 5 }, 'qa');
  if (qa.status === 200 && qa.body.success) {
    const r = qa.body.data.items[0];
    if (r) assert.equal(r.mail, null, 'worker 없으면 mail null');
    const post = await send('POST', '/alert-recipients', { empNo: '99999999', mail: 'x@y.z' }, 'qa');
    assert.equal(post.status, 403, '권한 없는 수신자 등록은 403');
  } else {
    skipped.push(`품질보증팀 계정은 sys-recip 조회 권한이 없어(${qa.status}) 마스킹 확인을 건너뜀`);
  }

  // 3단계(P1) 계약 — 목록 판정 열·요약 엔진·영향·알림 목록 condId/alertId
  const listRow = list.items[0];
  for (const k of ['evalState', 'metricStale', 'alert7dCnt', 'receivingCnt', 'deletable']) assert(k in listRow, `목록 행에 ${k}`);
  const summary = ok(await get('/alert-conditions/summary', {}, 'it'), '요약');
  assert(summary.engine && ['OK', 'STOPPED', 'UNKNOWN'].includes(summary.engine.judge), 'engine.judge');
  assert(summary.evalIssueCnt && 'breach' in summary.evalIssueCnt, 'evalIssueCnt');
  for (const k of ['todaySuppressedCnt', 'todaySkippedCnt', 'todayFailCnt']) assert(k in summary, `요약에 ${k}`);
  const rsum = ok(await get('/alert-recipients/summary', {}, 'it'), '수신자 요약');
  // 부재 · 야간은 2026-10-03 에 없앴습니다 — recipientCnt 는 숫자, nightWindow 없음
  assert.equal(typeof rsum.recipientCnt, 'number', 'recipientCnt 숫자');
  assert(!('nightWindow' in rsum) && !('nightCnt' in rsum), '야간 키 없음');
  for (const k of ['receivableCnt', 'condCnt']) assert(k in g, `그룹 행에 ${k}`);
  assert(!('escStages' in g), '승격 대상(escStages)은 2026-10-03 에 없앴습니다');
  const rid = all.body.data.items[0]?.recipientId;
  const impact = ok(await get(`/alert-recipients/${rid}/impact`, {}, 'it'), '영향');
  assert(Array.isArray(impact.zeroGroups) && Array.isArray(impact.groups), 'impact 모양');
  // 같은 상태로 그룹 사용 → changed:false (DB 그대로)
  const gs = await send('PATCH', `/alert-recipient-groups/${g.groupId}/state`, { on: g.useFlg !== 'N' }, 'it');
  assert(gs.body.success && gs.body.data.changed === false, `그룹 상태 같은 값 changed:false (${gs.status} ${gs.body.message})`);
  const gsNo = await send('PATCH', `/alert-recipient-groups/${g.groupId}/state`, {}, 'it');
  assert.equal(gsNo.status, 400, '그룹 상태 본문 없음 400');
  // 수신/부재 전환 API 는 없앴습니다(2026-10-03)
  const rsNo = await send('PATCH', `/alert-recipients/${rid}/state`, { state: 'ABSENT' }, 'it');
  assert(rsNo.status === 404 || rsNo.status === 405, `수신/부재 전환 없음 ${rsNo.status}`);
  // 알림 목록 — condId 로 거르고, 없는 alertId 는 0건
  const byCond = await get('/alerts', { condId: row.condId, period: '30d', includeTest: true, size: 5 }, 'it');
  assert(byCond.body.success, `alerts condId ${byCond.status}`);
  assert((byCond.body.data.items || []).every((x) => x.condId === undefined || String(x.condId) === String(row.condId)), 'condId 로 걸러짐');
  const byId = await get('/alerts', { alertId: 987654321, size: 5 }, 'it');
  assert(byId.body.success && (byId.body.data.items || []).length === 0, 'alertId 없는 값은 0건');

  console.log(`PASS: alert-cond/sys-recip live contract${skipped.length ? ` (건너뜀: ${skipped.join(' · ')})` : ''}`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
