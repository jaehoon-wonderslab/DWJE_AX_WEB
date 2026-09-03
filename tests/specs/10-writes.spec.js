/**
 * 쓰기 동작 — 등록·수정·삭제가 실제로 반영되는가
 *
 * 카탈로그 253건 중 96건이 쓰기인데 지금까지 검사가 회원가입·가입승인 2건뿐이었습니다.
 * "화면이 그려진다" 와 "저장이 된다" 는 다른 이야기입니다.
 *
 * 원칙
 *  · 만든 것은 반드시 지웁니다. 지울 수단이 없는 흐름은 만들지 않습니다
 *  · 지울 수 없는 엔드포인트는 데이터를 남기지 않는 방식으로만 확인합니다
 *    (인증 거절 · 입력 검증 · 없는 ID)
 *  · 검사 이름에 무엇이 깨지는지가 드러나야 합니다
 */
const { suite, test, beforeAll, afterAll, eq, ok, contains, skip } = require('../lib/runner');
const api = require('../lib/api');

/** 이번 실행을 알아볼 수 있게 붙이는 꼬리표 — 남으면 이걸로 찾습니다 */
const TAG = `자동테스트${Date.now().toString().slice(-6)}`;

suite('쓰기 — 되돌리기 가능한 흐름', () => {
  const ctx = { trash: [] };

  beforeAll(async () => {
    await api.ping();
  });

  // 테스트가 중간에 실패해도 만든 것은 지웁니다 (못 지우면 그 사실을 출력합니다)
  afterAll(() => api.cleanup(ctx.trash, '쓰기 테스트가 만든 자료'));

  test('부서를 등록하면 목록에 나오고, 수정·삭제가 반영된다', async () => {
    const created = await api.send('POST', '/system/depts', { deptNm: `${TAG}부서`, abbr: '자동', desc: '자동 테스트용' });
    eq(created.status, 200, `등록 실패: ${created.body?.message}`);
    const deptId = created.body?.data?.deptId;
    ok(deptId, '등록 응답이 deptId 를 줘야 화면이 방금 만든 부서를 가리킬 수 있습니다');
    ctx.trash.push(['DELETE', `/system/depts/${deptId}`]);

    const after = await api.data('/system/depts');
    const found = (after.depts || after.items || []).find((d) => d.deptId === deptId);
    ok(found, '등록했는데 목록에 없습니다');
    eq(found.deptNm, `${TAG}부서`, '등록한 이름 그대로 나와야 합니다');

    const renamed = `${TAG}수정`;
    const updated = await api.send('PUT', `/system/depts/${deptId}`, { deptNm: renamed, abbr: '수정', desc: '수정됨' });
    eq(updated.status, 200, `수정 실패: ${updated.body?.message}`);
    const reread = await api.data('/system/depts');
    eq((reread.depts || reread.items || []).find((d) => d.deptId === deptId)?.deptNm, renamed, '수정이 반영되지 않았습니다');

    const removed = await api.send('DELETE', `/system/depts/${deptId}`);
    eq(removed.status, 200, `삭제 실패: ${removed.body?.message}`);
    ctx.trash.pop();
    const gone = await api.data('/system/depts');
    eq(!!(gone.depts || gone.items || []).find((d) => d.deptId === deptId), false, '삭제했는데 목록에 남아 있습니다');
  });

  test('계정을 등록하면 목록에 나오고, 수정·부서이동·삭제가 반영된다', async () => {
    const empNo = `T${Date.now().toString().slice(-7)}`;
    const dd = await api.data('/system/depts');
    const depts = dd.items || dd.depts || [];
    ok(depts.length >= 2, '부서가 2개 이상이어야 부서 이동을 확인할 수 있습니다');
    const [d1, d2] = depts.filter((d) => !d.superAdmin).slice(0, 2);

    const created = await api.send('POST', '/system/users', { empNo, name: '자동테스트', deptId: d1.deptId });
    eq(created.status, 200, `등록 실패: ${created.body?.message}`);
    ctx.trash.push(['DELETE', `/system/users/${empNo}`]);

    const find = async () => (await api.data('/system/users', { size: 200, keyword: empNo })).items?.find((u) => u.empNo === empNo);
    const made = await find();
    ok(made, '등록했는데 목록에 없습니다');
    eq(made.deptId, d1.deptId, '등록한 부서로 들어가야 합니다');

    eq((await api.send('PUT', `/system/users/${empNo}`, { name: '자동테스트수정', deptId: d1.deptId, pos: 'STAFF' })).status, 200, '수정 실패');
    eq((await find()).name, '자동테스트수정', '수정이 반영되지 않았습니다');

    // 상태 전환 — 서버는 바꿀 상태를 본문으로 받습니다.
    // 웹이 state 를 안 보내던 시절엔 성공 메시지만 뜨고 아무것도 바뀌지 않았습니다.
    eq((await api.send('PATCH', `/system/users/${empNo}/state`, { state: 'SUSPENDED' })).status, 200, '상태 변경 실패');
    eq((await find()).state, 'SUSPENDED', '상태를 바꿨는데 그대로입니다 — 성공 응답만 오고 반영이 안 됩니다');
    eq((await api.send('PATCH', `/system/users/${empNo}/state`, { state: 'ACTIVE' })).status, 200);
    eq((await find()).state, 'ACTIVE', '상태가 되돌아가야 합니다');

    const moved = await api.send('PUT', `/system/users/${empNo}/dept`, { deptId: d2.deptId });
    eq(moved.status, 200, `부서 이동 실패: ${moved.body?.message}`);
    eq((await find()).deptId, d2.deptId, '부서 이동이 반영되지 않았습니다');
    ok(moved.body?.data?.appliedMenuCnt > 0, '옮긴 부서의 메뉴 권한 건수를 알려 줘야 화면이 안내할 수 있습니다');

    eq((await api.send('DELETE', `/system/users/${empNo}`)).status, 200, '삭제 실패');
    ctx.trash.pop();
    eq(!!(await find()), false, '삭제했는데 목록에 남아 있습니다');
  });

  test('계정 상태는 정해진 값만 받는다', async () => {
    // 정본은 ACTIVE · SUSPENDED · PENDING 입니다.
    // 아무 문자열이나 저장되면 계정이 정의되지 않은 상태로 남습니다(stateNm 이 null 이 됩니다).
    const empNo = `T${Date.now().toString().slice(-7)}`;
    const dd = await api.data('/system/depts');
    const deptId = (dd.items || dd.depts || []).find((d) => !d.superAdmin)?.deptId;
    eq((await api.send('POST', '/system/users', { empNo, name: '상태검증', deptId })).status, 200);
    ctx.trash.push(['DELETE', `/system/users/${empNo}`]);

    const bad = [];
    for (const v of ['아무거나', '', 'ZZZZZZ', '12345', 'INACTIVE']) {
      const r = await api.send('PATCH', `/system/users/${empNo}/state`, { state: v });
      if (r.status < 400) bad.push(`state=${JSON.stringify(v)} → ${r.status} ${JSON.stringify(r.body?.data)}`);
    }
    eq((await api.send('DELETE', `/system/users/${empNo}`)).status, 200);
    ctx.trash.pop();

    eq(bad, [], '열거값을 벗어난 상태가 저장되면 계정이 어떤 상태인지 알 수 없게 됩니다');
  });

  test('로그인 중인 본인 계정은 정지할 수 없다', async () => {
    // 관리자가 자기 계정을 잠그면 아무도 계정 관리에 들어갈 수 없습니다.
    // 예전엔 SUSPENDED 만 막아서, 다른 값(INACTIVE·PENDING)으로 보내면 우회됐습니다.
    const me = await api.data('/auth/me');
    const empNo = me.empNo || me.user?.empNo;
    ok(empNo, '내 사번을 알 수 없습니다');

    const bad = [];
    for (const v of ['SUSPENDED', 'PENDING']) {
      const r = await api.send('PATCH', `/system/users/${empNo}/state`, { state: v });
      if (r.status < 400) bad.push(`state=${v} → ${r.status} (막히지 않았습니다)`);
    }
    eq(bad, [], '본인 계정을 사용 상태에서 내릴 수 있으면 스스로 잠깁니다');

    // 막힌 뒤에도 내 계정은 그대로여야 합니다
    const still = await api.data('/auth/me');
    ok(still.empNo || still.user?.empNo, '본인 계정 상태가 바뀌어 조회가 막혔습니다');
  });

  test('용어와 유사어를 등록하면 사전에 반영된다', async () => {
    // 분류는 기준정보에서 받습니다 — 화면도 같은 목록을 씁니다
    const dom = await api.data('/glossary/domains');
    const domainCd = (dom.domains || [])[0]?.code;
    ok(domainCd, '용어 분류 기준정보가 비어 있으면 용어를 하나도 만들 수 없습니다');

    // 용어 삭제는 소프트 삭제(use_flg='N')라 실행마다 새 이름을 쓰면 숨은 행이 쌓입니다.
    // 같은 이름으로 다시 등록하면 서버가 그 행을 되살리므로(restored:true) 이름을 고정해 둡니다.
    const TERM = '자동테스트용어';
    const created = await api.send('POST', '/glossary/terms', { term: TERM, definition: '자동 테스트용 용어입니다', domainCd });
    if (created.status === 400) skip(`용어 등록에 더 필요한 값이 있습니다: ${created.body?.message}`);
    eq(created.status, 200, `용어 등록 실패: ${created.body?.message}`);
    const termId = created.body?.data?.termId;
    ok(termId, '등록 응답이 termId 를 줘야 합니다');
    ctx.trash.push(['DELETE', `/glossary/terms/${termId}`]);


    const reread = await api.data('/glossary/terms', { keyword: TERM, size: 5 });
    ok((reread.items || []).some((t) => t.term === TERM), '등록했는데 사전에 없습니다');

    const variant = await api.send('POST', `/glossary/terms/${termId}/variants`, { word: `${TAG}유사어` });
    eq(variant.status, 200, `유사어 등록 실패: ${variant.body?.message}`);
    const variantId = variant.body?.data?.variantId;
    ok(variantId, '등록 응답이 variantId 를 줘야 합니다');
    ctx.trash.push(['DELETE', `/glossary/variants/${variantId}`]);

    const removed = await api.send('DELETE', `/glossary/variants/${variantId}`);
    eq(removed.status, 200, `유사어 삭제 실패: ${removed.body?.message}`);
    ctx.trash.pop();

    // 용어까지 지워 사전을 원래대로 되돌립니다
    const removedTerm = await api.send('DELETE', `/glossary/terms/${termId}`);
    eq(removedTerm.status, 200, `용어 삭제 실패: ${removedTerm.body?.message}`);
    ctx.trash.pop();
    const after = await api.data('/glossary/terms', { keyword: TERM, size: 5 });
    eq((after.items || []).some((t) => t.term === TERM), false, '삭제했는데 사전에 남아 있습니다');
  });

  test('지운 용어의 이름을 다시 쓸 수 있다', async () => {
    // 삭제가 소프트 삭제라, 중복 검사가 use_flg 를 안 보면 지운 이름이 영구히 막힙니다.
    // 관리자가 잘못 지운 용어를 다시 만들 수 없고, 목록에 없으니 이유도 알 수 없습니다.
    const dom = await api.data('/glossary/domains');
    const domainCd = (dom.domains || [])[0]?.code;
    const TERM = '자동테스트재등록';

    const first = await api.send('POST', '/glossary/terms', { term: TERM, definition: '1회차', domainCd });
    eq(first.status, 200, `등록 실패: ${first.body?.message}`);
    const id = first.body?.data?.termId;
    ctx.trash.push(['DELETE', `/glossary/terms/${id}`]);

    eq((await api.send('DELETE', `/glossary/terms/${id}`)).status, 200, '삭제 실패');
    ctx.trash.pop();

    const again = await api.send('POST', '/glossary/terms', { term: TERM, definition: '2회차', domainCd });
    eq(again.status, 200,
      `지운 이름을 다시 쓸 수 없습니다: ${again.body?.message}\n` +
      '      목록에 없는 용어가 이름만 점유하면 관리자가 원인을 알 수 없습니다.');
    ctx.trash.push(['DELETE', `/glossary/terms/${again.body?.data?.termId}`]);

    const shown = await api.data('/glossary/terms', { keyword: TERM, size: 5 });
    eq((shown.items || []).find((t) => t.term === TERM)?.definition, '2회차', '다시 등록한 내용으로 갱신돼야 합니다');

    eq((await api.send('DELETE', `/glossary/terms/${again.body?.data?.termId}`)).status, 200);
    ctx.trash.pop();
  });

  test('삭제된 용어가 이름을 점유하면 그 사실을 알려 준다', async () => {
    // 삭제는 소프트 삭제인데 UNIQUE 는 컬럼 전체에 걸려 있어, 지워진 이름으로는 개명이 막힙니다.
    // 목록에 없는 이름이 막히면 관리자는 이유를 알 수 없으므로 메시지가 구분돼야 합니다.
    const dom = await api.data('/glossary/domains');
    const domainCd = (dom.domains || [])[0]?.code;

    const taken = await api.send('POST', '/glossary/terms', { term: '자동테스트점유', definition: '점유용', domainCd });
    eq(taken.status, 200, `등록 실패: ${taken.body?.message}`);
    const takenId = taken.body?.data?.termId;
    ctx.trash.push(['DELETE', `/glossary/terms/${takenId}`]);
    eq((await api.send('DELETE', `/glossary/terms/${takenId}`)).status, 200);
    ctx.trash.pop();

    const other = await api.send('POST', '/glossary/terms', { term: '자동테스트개명', definition: '개명용', domainCd });
    eq(other.status, 200, `등록 실패: ${other.body?.message}`);
    const otherId = other.body?.data?.termId;
    ctx.trash.push(['DELETE', `/glossary/terms/${otherId}`]);

    // 지워진 이름으로 개명 시도
    const renamed = await api.send('PUT', `/glossary/terms/${otherId}`, { term: '자동테스트점유', definition: '개명용', domainCd });
    ok(renamed.status >= 400, '지워진 용어가 점유한 이름으로 개명이 되면 안 됩니다');
    contains(renamed.body?.message || '', '삭제',
      `왜 막히는지 알 수 없는 메시지입니다: "${renamed.body?.message}"\n` +
      '      목록에 없는 이름이 막힐 때는 삭제된 용어가 점유 중이라는 사실을 알려 줘야 합니다.');

    eq((await api.send('DELETE', `/glossary/terms/${otherId}`)).status, 200);
    ctx.trash.pop();
    // 점유하던 행도 되살렸다 지워 정리합니다
    const revive = await api.send('POST', '/glossary/terms', { term: '자동테스트점유', definition: '정리', domainCd });
    if (revive.status === 200) await api.send('DELETE', `/glossary/terms/${revive.body.data.termId}`);
  });

  test('제품군 순서를 바꾸고 기본 순서로 되돌린다', async () => {
    const before = await api.data('/products/families');
    const families = before.families || before.items || [];
    if (families.length < 2) skip('제품군이 2개 미만이라 순서를 바꿀 수 없습니다');

    const moved = await api.send('PUT', '/products/families/order', {
      familyCd: families[1].familyCd, toIndex: 0,
    });
    if (moved.status === 400) skip(`순서 변경 요청 형식이 다릅니다: ${moved.body?.message}`);
    eq(moved.status, 200, `순서 변경 실패: ${moved.body?.message}`);

    const reset = await api.send('POST', '/products/families/order/reset', {});
    eq(reset.status, 200, `기본 순서 복원 실패: ${reset.body?.message} — 복원이 안 되면 테스트가 데이터를 바꿔 놓습니다`);
  });
});

suite('쓰기 — 안전장치', () => {
  const ctx = {};

  beforeAll(async () => {
    await api.ping();
  });

  /** 데이터를 만들지 않고 확인할 수 있는 쓰기들 */
  const GUARDED = [
    ['부서 등록', 'POST', '/system/depts', 'deptNm'],
    ['계정 등록', 'POST', '/system/users', 'empNo'],
    ['용어 등록', 'POST', '/glossary/terms', 'term'],
    ['당번 등록', 'POST', '/alert-duties', 'groupId'],
    ['지표 기준 등록', 'POST', '/metrics/standards', 'name'],
  ];

  test('토큰 없이 부르면 401 이다', async () => {
    const bad = [];
    for (const [name, method, path] of GUARDED) {
      const r = await api.send(method, path, {}, null);
      if (r.status !== 401) bad.push(`${name}: ${r.status}`);
    }
    eq(bad, [], '인증 없이 쓰기가 통하면 안 됩니다');
  });

  test('필수값이 비면 400 과 함께 어느 입력란인지 알려 준다', async () => {
    // 화면은 error.field 로 해당 입력란 아래에 메시지를 붙입니다.
    // field 가 없으면 폼 상단에만 뜨고 사용자는 어디를 고쳐야 할지 모릅니다.
    const bad = [];
    for (const [name, method, path, field] of GUARDED) {
      const r = await api.send(method, path, {});
      if (r.status !== 400) { bad.push(`${name}: 빈 요청인데 ${r.status}`); continue; }
      if (!r.body?.error?.field) bad.push(`${name}: 400 인데 error.field 가 없습니다 — "${r.body?.message}"`);
      else if (r.body.error.field !== field) bad.push(`${name}: field 가 ${r.body.error.field} 입니다 (기대 ${field})`);
    }
    eq(bad, [], '어느 칸이 잘못됐는지 알려 주지 않으면 사용자가 고칠 수 없습니다');
  });

  test('없는 대상을 수정·삭제하면 404 다 (500 이 아니라)', async () => {
    const bad = [];
    const cases = [
      ['부서 수정', 'PUT', '/system/depts/999999', { deptNm: '없음' }],
      ['부서 삭제', 'DELETE', '/system/depts/999999', null],
      // 없는 대상인데 소유권부터 따지면 "본인 것만 삭제할 수 있다" 로 안내됩니다 — 존재 확인이 먼저여야 합니다
      ['유사어 삭제', 'DELETE', '/glossary/variants/999999', null],
      ['용어 삭제', 'DELETE', '/glossary/terms/999999', null],
      ['당번 삭제', 'DELETE', '/alert-duties/999999', null],
    ];
    for (const [name, method, path, body] of cases) {
      const r = await api.send(method, path, body);
      if (r.status >= 500) bad.push(`${name}: HTTP ${r.status} — 없는 대상은 오류가 아니라 404 여야 합니다`);
      else if (r.status !== 404) bad.push(`${name}: HTTP ${r.status} (기대 404)`);
    }
    eq(bad, []);
  });

  test('권한 없는 부서는 계정을 만들 수 없다 (403)', async () => {
    // qa 계정은 품질보증팀입니다. 계정 관리는 통합관리자 전용입니다.
    const r = await api.send('POST', '/system/depts', { deptNm: '권한없음', abbr: 'x' }, 'qa');
    ok(r.status === 403 || r.status === 401,
      `품질보증팀이 부서를 만들 수 있으면 안 됩니다 — HTTP ${r.status} ${r.body?.message}`);
  });
});
