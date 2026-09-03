/**
 * 시스템관리 목 핸들러 (API 107건)
 *
 * SY-01 ~ SY-15 화면의 조회·등록·수정·삭제를 모두 다룹니다.
 * 등록·수정 결과는 mockState 에 남아 같은 세션 동안 유지됩니다.
 */
import { USERS } from '@shared/constants/accounts';
import { DATA_FIELDS, DEPTS } from '@shared/constants/dataFields';
import { permRows } from '@shared/constants/menu';
import { nowStamp, gradeOf } from '@shared/utils/formatUtil';
import { AGENT_DEFS } from '@shared/constants/dataFields';
import {
  AGENT_PIPELINE, AGENT_RUNS, ALERT_CONDITIONS, AUDIT_LOGS, CHAT_HISTORY_SEED, CHAT_HISTORY_SUMMARY,
  DATA_ACCESS_AUDIT, DATA_PERM_PREVIEW, DEPLOY_LOGS, DOWNLOAD_LOGS, DUTIES, ESCALATION_RULES,
  FAMILY_RANK_LOGS, FINETUNE_BUILDS, GLOSSARY, GLOSSARY_DOMAINS, MASK_RULES, METRIC_HISTORY,
  METRIC_STANDARDS, MODEL_CONFIG, MODEL_RELEASES, PERFORMANCE_TREND, PERM_LOGS, RECIPIENT_GROUPS,
  RECIPIENTS, RETENTION_POLICY, SYNC_DRIFTS, SYNC_FAIL_REASON, SYNC_JOBS, SYNC_MAPS, SYNC_POLICY,
  VECTOR_BUILDS,
} from './data/system';
import { AGENTS } from './data/dashboard';
import { FAMILY_ORDER_DEFAULT, PRODUCTS } from './data/masters';
import { mockState } from './state';

function store() {
  if (!mockState.store.system) {
    mockState.store.system = {
      users: JSON.parse(JSON.stringify(USERS)),
      depts: JSON.parse(JSON.stringify(DEPTS)),
      permLogs: [...PERM_LOGS],
      conditions: JSON.parse(JSON.stringify(ALERT_CONDITIONS)),
      recipients: JSON.parse(JSON.stringify(RECIPIENTS)),
      groups: JSON.parse(JSON.stringify(RECIPIENT_GROUPS)),
      duties: JSON.parse(JSON.stringify(DUTIES)),
      escalation: JSON.parse(JSON.stringify(ESCALATION_RULES)),
      glossary: JSON.parse(JSON.stringify(GLOSSARY)),
      products: JSON.parse(JSON.stringify(PRODUCTS)),
      rankLogs: [...FAMILY_RANK_LOGS],
      chatHistory: [...CHAT_HISTORY_SEED],
      modelConfig: JSON.parse(JSON.stringify(MODEL_CONFIG)),
      maskRules: JSON.parse(JSON.stringify(MASK_RULES)),
      releases: JSON.parse(JSON.stringify(MODEL_RELEASES)),
      vectorBuilds: JSON.parse(JSON.stringify(VECTOR_BUILDS)),
      finetuneBuilds: JSON.parse(JSON.stringify(FINETUNE_BUILDS)),
      deployLogs: [...DEPLOY_LOGS],
      metrics: JSON.parse(JSON.stringify(METRIC_STANDARDS)),
      metricHistory: [...METRIC_HISTORY],
      downloadLogs: [...DOWNLOAD_LOGS],
      syncJobs: JSON.parse(JSON.stringify(SYNC_JOBS)),
      syncDrifts: JSON.parse(JSON.stringify(SYNC_DRIFTS)),
    };
  }
  return mockState.store.system;
}

/** 변경 이력 한 줄 추가 */
function logPerm(target, act, detail) {
  store().permLogs.unshift({ ts: nowStamp(), target, act, detail, by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
}

const ok = (message, data = { success: true }) => ({ success: true, code: 'SUCCESS', message, data });
const fail = (code, message) => ({ success: false, code, message, data: null });

/** 부서의 메뉴 권한 배열 ('*' 는 전체) */
const menuAccessOf = (dept) => mockState.menuAccess[dept] ?? [];
const dataScopeOf = (dept) => mockState.dataScope[dept] ?? [];
const menuCount = (dept) => (menuAccessOf(dept) === '*' ? permRows().length : menuAccessOf(dept).length);
const dataCount = (dept) => (dataScopeOf(dept) === '*' ? DATA_FIELDS.length : dataScopeOf(dept).length);

export const systemMock = {
  /* ═══════════ SY-01 계정 관리 ═══════════ */
  getSystemAccountsSummary: () => {
    const st = store();
    return {
      userCnt: { total: st.users.length, active: st.users.filter((u) => u.state === '사용').length, suspended: st.users.filter((u) => u.state !== '사용').length },
      deptCnt: st.depts.length,
      switchableCnt: st.users.filter((u) => u.switchable && u.state === '사용').length,
      currentUser: mockState.currentUser,
    };
  },

  getSystemUsers: ({ keyword, deptId, state, page = 1, size = 100 }) => {
    let items = store().users.map((u) => ({ ...u, menuPermCnt: menuCount(u.dept), dataPermCnt: dataCount(u.dept) }));
    if (keyword) items = items.filter((u) => `${u.empNo}${u.name}`.includes(keyword));
    if (deptId && deptId !== '전체') items = items.filter((u) => u.dept === deptId);
    if (state && state !== '전체') items = items.filter((u) => u.state === state);
    return { items, meta: { page, size, total: items.length } };
  },

  postSystemUsers: ({ empNo, name, deptId, pos, state, switchable }) => {
    const st = store();
    if (!empNo || !name) return fail('E-VALID-001', '아이디와 이름은 필수입니다.');
    if (st.users.some((u) => u.empNo === empNo)) return fail('E-VALID-002', '이미 등록된 아이디입니다.');
    st.users.push({ empNo, name, dept: deptId, pos: pos || '사원', state: state || '사용', lastLoginAt: '—', switchable: !!switchable });
    logPerm(`${name} (${deptId})`, '계정', '계정 신규 등록');
    return ok('계정을 등록했습니다.', { empNo });
  },

  putSystemUsersByEmpNo: ({ empNo, name, deptId, pos, state }) => {
    const u = store().users.find((x) => x.empNo === empNo);
    if (!u) return fail('E-NOTFOUND', '대상 계정을 찾을 수 없습니다.');
    const before = u.dept;
    if (name) u.name = name;
    if (deptId) u.dept = deptId;
    if (pos) u.pos = pos;
    if (state) u.state = state;
    logPerm(`${u.name} (${u.dept})`, '계정', before !== u.dept ? `부서 변경 ${before} → ${u.dept}` : '계정 정보 수정');
    return ok('계정을 수정했습니다.', { empNo });
  },

  deleteSystemUsersByEmpNo: ({ empNo }) => {
    const st = store();
    if (empNo === mockState.currentUser.empNo) return fail('E-RULE-001', '로그인 중인 계정은 삭제할 수 없습니다.');
    const u = st.users.find((x) => x.empNo === empNo);
    if (!u) return fail('E-NOTFOUND', '대상 계정을 찾을 수 없습니다.');
    st.users = st.users.filter((x) => x.empNo !== empNo);
    logPerm(`${u.name} (${u.dept})`, '계정', '계정 삭제');
    return ok(`${u.name} 계정을 삭제했습니다.`);
  },

  patchSystemUsersByEmpNoState: ({ empNo, state }) => {
    const u = store().users.find((x) => x.empNo === empNo);
    if (!u) return fail('E-NOTFOUND', '대상 계정을 찾을 수 없습니다.');
    if (empNo === mockState.currentUser.empNo) return fail('E-RULE-001', '로그인 중인 계정은 정지할 수 없습니다.');
    u.state = state || (u.state === '사용' ? '정지' : '사용');
    logPerm(`${u.name} (${u.dept})`, '계정', `계정 ${u.state}`);
    return ok(`${u.name} 계정을 ${u.state} 처리했습니다.`, { state: u.state });
  },

  putSystemUsersByEmpNoDept: ({ empNo, deptId }) => {
    const u = store().users.find((x) => x.empNo === empNo);
    if (!u) return fail('E-NOTFOUND', '대상 계정을 찾을 수 없습니다.');
    const before = u.dept;
    u.dept = deptId;
    logPerm(u.name, '계정', `${before} → ${deptId} 부서 이동 (권한도 함께 변경)`);
    return ok(`${u.name} 계정을 ${deptId} 로 옮겼습니다 — 권한도 함께 바뀝니다.`, { dept: deptId });
  },

  getSystemDepts: () => ({
    items: store().depts.map((d) => ({
      ...d,
      userCnt: store().users.filter((u) => u.dept === d.id).length,
      menuPermCnt: menuCount(d.id),
      dataPermCnt: dataCount(d.id),
    })),
  }),

  postSystemDepts: ({ name, av, desc, copyFrom }) => {
    const st = store();
    if (!name || !av) return fail('E-VALID-001', '부서명과 약칭은 필수입니다.');
    if (st.depts.some((d) => d.id === name)) return fail('E-VALID-002', '이미 등록된 부서명입니다.');
    st.depts.push({ id: name, av: String(av).toUpperCase(), desc: desc || '—' });
    // 권한 복사 대상이 있으면 그대로 가져오고, 없으면 기본 화면 하나만 엽니다
    const src = copyFrom && copyFrom !== '빈 권한' ? copyFrom : null;
    mockState.menuAccess[name] = src && mockState.menuAccess[src] !== '*' ? [...mockState.menuAccess[src]] : ['dash-ai'];
    mockState.dataScope[name] = src && mockState.dataScope[src] !== '*' ? [...mockState.dataScope[src]] : [];
    logPerm(name, '부서', `부서 신규 등록${src ? ` · ${src} 권한 복사` : ' · 빈 권한'}`);
    return ok(`${name} 부서를 등록했습니다 — 권한을 지정하세요.`, { deptId: name });
  },

  putSystemDeptsByDeptId: ({ deptId, name, av, desc }) => {
    const st = store();
    const d = st.depts.find((x) => x.id === deptId);
    if (!d) return fail('E-NOTFOUND', '대상 부서를 찾을 수 없습니다.');
    if (name && name !== deptId && st.depts.some((x) => x.id === name)) return fail('E-VALID-002', '이미 등록된 부서명입니다.');
    if (name && name !== deptId) {
      // 부서명을 바꾸면 소속 계정과 권한 설정이 함께 따라갑니다
      mockState.menuAccess[name] = mockState.menuAccess[deptId];
      mockState.dataScope[name] = mockState.dataScope[deptId];
      delete mockState.menuAccess[deptId];
      delete mockState.dataScope[deptId];
      st.users.forEach((u) => {
        if (u.dept === deptId) u.dept = name;
      });
      d.id = name;
    }
    if (av) d.av = String(av).toUpperCase();
    if (desc !== undefined) d.desc = desc;
    logPerm(d.id, '부서', '부서 정보 수정');
    return ok('부서를 수정했습니다.', { deptId: d.id });
  },

  deleteSystemDeptsByDeptId: ({ deptId }) => {
    const st = store();
    if (deptId === '통합관리자') return fail('E-RULE-001', '통합관리자 부서는 삭제할 수 없습니다.');
    const members = st.users.filter((u) => u.dept === deptId);
    if (members.length) return fail('E-RULE-001', `${deptId} 소속 계정 ${members.length}개를 먼저 다른 부서로 옮기세요.`);
    st.depts = st.depts.filter((d) => d.id !== deptId);
    delete mockState.menuAccess[deptId];
    delete mockState.dataScope[deptId];
    logPerm(deptId, '부서', '부서 삭제');
    return ok(`${deptId} 부서를 삭제했습니다.`);
  },

  getSystemDeptsPermCompare: () => ({
    depts: store().depts.map((d) => ({ dept: d.id, menuCnt: menuCount(d.id), dataCnt: dataCount(d.id) })),
    screenTotal: permRows().length,
    fieldTotal: DATA_FIELDS.length,
  }),

  getSystemPermLogs: ({ page = 1, size = 20 }) => ({ items: store().permLogs.slice(0, size), meta: { page, size, total: store().permLogs.length } }),

  /* ═══════════ SY-02 메뉴 접근 권한 ═══════════ */
  getSystemMenuPerms: () => ({
    screens: permRows(),
    depts: store().depts.map((d) => d.id),
    matrix: Object.fromEntries(
      store().depts.map((d) => [d.id, menuAccessOf(d.id) === '*' ? permRows().map((r) => r.id) : menuAccessOf(d.id)])
    ),
    adminDepts: store().depts.filter((d) => menuAccessOf(d.id) === '*').map((d) => d.id),
  }),

  putSystemMenuPerms: ({ deptId, screenId, allowed }) => {
    const perms = mockState.menuAccess[deptId];
    if (perms === '*') return fail('E-RULE-001', '통합관리자는 항목별 조정 대상이 아닙니다.');
    const i = perms.indexOf(screenId);
    if (allowed === undefined) {
      if (i >= 0) perms.splice(i, 1);
      else perms.push(screenId);
    } else if (allowed && i < 0) perms.push(screenId);
    else if (!allowed && i >= 0) perms.splice(i, 1);
    const nowAllowed = perms.indexOf(screenId) >= 0;
    const name = permRows().find((r) => r.id === screenId)?.name || screenId;
    logPerm(deptId, '메뉴 권한', `${name} 접근 ${nowAllowed ? '허용' : '차단'}`);
    return ok(`${deptId} · ${name} 접근을 ${nowAllowed ? '허용' : '차단'}했습니다.`, { allowed: nowAllowed });
  },

  putSystemMenuPermsGroup: ({ deptId, group, allowed }) => {
    const perms = mockState.menuAccess[deptId];
    if (perms === '*') return fail('E-RULE-001', '통합관리자는 항목별 조정 대상이 아닙니다.');
    permRows()
      .filter((r) => r.group === group)
      .forEach((r) => {
        const i = perms.indexOf(r.id);
        if (allowed && i < 0) perms.push(r.id);
        if (!allowed && i >= 0) perms.splice(i, 1);
      });
    logPerm(deptId, '메뉴 권한', `${group} 그룹 전체 ${allowed ? '허용' : '차단'}`);
    return ok(`${deptId} · ${group} 그룹을 전체 ${allowed ? '허용' : '차단'}했습니다.`);
  },

  postSystemMenuPermsCopy: ({ fromDeptId, toDeptId }) => {
    if (fromDeptId === toDeptId) return fail('E-VALID-001', '원본과 대상 부서가 같습니다.');
    if (mockState.menuAccess[toDeptId] === '*') return fail('E-RULE-001', '통합관리자는 대상이 아닙니다.');
    const src = mockState.menuAccess[fromDeptId];
    mockState.menuAccess[toDeptId] = src === '*' ? permRows().map((r) => r.id) : [...src];
    logPerm(toDeptId, '메뉴 권한', `${fromDeptId} 권한 복사 (${mockState.menuAccess[toDeptId].length}개 화면)`);
    return ok(`${fromDeptId} → ${toDeptId} 메뉴 권한을 복사했습니다.`);
  },

  getSystemMenuPermsDeptStatus: () => ({
    items: store().depts.map((d) => ({
      dept: d.id,
      allowedCnt: menuCount(d.id),
      totalCnt: permRows().length,
      userCnt: store().users.filter((u) => u.dept === d.id).length,
    })),
  }),

  /* ═══════════ SY-03 데이터 접근 권한 ═══════════ */
  getSystemDataFields: () => ({ fields: DATA_FIELDS }),

  getSystemDataPerms: () => ({
    fields: DATA_FIELDS,
    depts: store().depts,
    matrix: Object.fromEntries(store().depts.map((d) => [d.id, dataScopeOf(d.id) === '*' ? DATA_FIELDS.map((f) => f.key) : dataScopeOf(d.id)])),
    adminDepts: store().depts.filter((d) => dataScopeOf(d.id) === '*').map((d) => d.id),
  }),

  putSystemDataPerms: ({ deptId, fieldKey, allowed }) => {
    const perms = mockState.dataScope[deptId];
    if (perms === '*') return fail('E-RULE-001', '통합관리자는 항목별 조정 대상이 아닙니다.');
    const i = perms.indexOf(fieldKey);
    if (allowed === undefined) {
      if (i >= 0) perms.splice(i, 1);
      else perms.push(fieldKey);
    } else if (allowed && i < 0) perms.push(fieldKey);
    else if (!allowed && i >= 0) perms.splice(i, 1);
    const nowAllowed = perms.indexOf(fieldKey) >= 0;
    const name = DATA_FIELDS.find((f) => f.key === fieldKey)?.name || fieldKey;
    logPerm(deptId, '데이터 권한', `${name} 접근 ${nowAllowed ? '허용' : '차단'}`);
    return ok(`${deptId} · ${name} 접근을 ${nowAllowed ? '허용' : '차단'}했습니다.`, { allowed: nowAllowed });
  },

  getSystemDataPermsPreview: () => ({ items: DATA_PERM_PREVIEW, dept: mockState.currentUser.dept, user: mockState.currentUser.name }),

  getSystemDataPermsByUser: () => ({
    items: store().users
      .filter((u) => u.state === '사용')
      .map((u) => {
        const scope = dataScopeOf(u.dept);
        const all = scope === '*';
        const allowed = DATA_FIELDS.filter((f) => all || scope.indexOf(f.key) >= 0);
        const blocked = DATA_FIELDS.filter((f) => !(all || scope.indexOf(f.key) >= 0));
        return { empNo: u.empNo, name: u.name, pos: u.pos, dept: u.dept, allowedCnt: allowed.length, blockedNames: blocked.map((f) => f.name) };
      }),
  }),

  getSystemDataPermsAudit: ({ page = 1, size = 50 }) => ({ items: DATA_ACCESS_AUDIT, meta: { page, size, total: DATA_ACCESS_AUDIT.length } }),

  /* ═══════════ SY-04 이상 알림 발송 조건 ═══════════ */
  getAlertConditionsSummary: () => {
    const items = store().conditions;
    return {
      total: items.length,
      enabled: items.filter((c) => c.enabled).length,
      disabled: items.filter((c) => !c.enabled).length,
      severityRisk: items.filter((c) => c.severity === '위험').length,
      groupCnt: new Set(items.flatMap((c) => c.groups.split(' · '))).size,
    };
  },

  getAlertConditions: ({ severity, enabled, keyword, page = 1, size = 50 }) => {
    let items = store().conditions;
    if (severity && severity !== '전체') items = items.filter((c) => c.severity === severity);
    if (enabled === '활성') items = items.filter((c) => c.enabled);
    if (enabled === '중지') items = items.filter((c) => !c.enabled);
    if (keyword) items = items.filter((c) => c.name.includes(keyword) || c.metric.includes(keyword));
    return { items, meta: { page, size, total: items.length } };
  },

  postAlertConditions: (body) => {
    const st = store();
    if (!body.name) return fail('E-VALID-001', '조건명은 필수입니다.');
    if (st.conditions.some((c) => c.name === body.name)) return fail('E-VALID-002', '이미 등록된 조건명입니다.');
    const condId = `AC-${String(st.conditions.length + 1).padStart(2, '0')}`;
    st.conditions.unshift({ condId, enabled: true, ...body });
    logPerm(body.name, '알림 조건', '발송 조건 등록');
    return ok('발송 조건을 등록했습니다.', { condId });
  },

  putAlertConditionsByCondId: ({ condId, ...body }) => {
    const c = store().conditions.find((x) => x.condId === condId);
    if (!c) return fail('E-NOTFOUND', '대상 조건을 찾을 수 없습니다.');
    Object.assign(c, body);
    logPerm(c.name, '알림 조건', '발송 조건 수정');
    return ok('발송 조건을 수정했습니다.');
  },

  patchAlertConditionsByCondIdState: ({ condId, enabled }) => {
    const c = store().conditions.find((x) => x.condId === condId);
    if (!c) return fail('E-NOTFOUND', '대상 조건을 찾을 수 없습니다.');
    c.enabled = enabled === undefined ? !c.enabled : !!enabled;
    logPerm(c.name, '알림 조건', `조건 ${c.enabled ? '활성화' : '중지'}`);
    return ok(`'${c.name}' 조건을 ${c.enabled ? '활성화' : '중지'}했습니다.`, { enabled: c.enabled });
  },

  postAlertConditionsByCondIdTestSend: ({ condId }) => {
    const c = store().conditions.find((x) => x.condId === condId);
    if (!c) return fail('E-NOTFOUND', '대상 조건을 찾을 수 없습니다.');
    return ok(`테스트 메시지를 발송했습니다 — ${c.channels} / ${c.groups}`, {
      preview: {
        title: `[덕우 AX] ${c.name}`,
        body: `${c.metric} ${c.op} ${c.threshold} (${c.duration}) 조건에 해당하는 이벤트가 감지되었습니다.\n대상 ${c.target} · 심각도 ${c.severity}\n상세 내역은 이상 알림 > 알림 목록·상세 에서 확인하십시오.`,
        note: '메시지 본문에는 민감정보를 포함하지 않으며, 상세는 시스템 링크로만 연결합니다.',
      },
    });
  },

  deleteAlertConditionsByCondId: ({ condId }) => {
    const s = store();
    const idx = s.conditions.findIndex((x) => x.condId === condId);
    if (idx === -1) return fail('E-NOTFOUND', '대상 조건을 찾을 수 없습니다.');
    const [c] = s.conditions.splice(idx, 1);
    logPerm(c.name, '알림 조건', '발송 조건 삭제');
    return ok(`'${c.name}' 발송 조건을 삭제했습니다.`);
  },
  /* ═══════════ SY-05 알림 수신자 관리 ═══════════ */
  getAlertRecipientsSummary: () => {
    const st = store();
    return {
      groupCnt: st.groups.length,
      recipientCnt: st.recipients.length,
      absentCnt: st.recipients.filter((r) => r.state !== '수신').length,
      nightCnt: st.recipients.filter((r) => r.night).length,
      dutyCnt: st.duties.length,
    };
  },

  getAlertRecipientGroups: () => ({
    items: store().groups.map((g) => ({
      ...g,
      memberCnt: g.members.length,
      condCnt: store().conditions.filter((c) => c.groups.indexOf(g.name) >= 0).length,
      memberNames: g.members.map((emp) => store().users.find((u) => u.empNo === emp)?.name || emp),
    })),
  }),

  postAlertRecipientGroups: ({ name, channels, window: win, members }) => {
    const st = store();
    if (!name) return fail('E-VALID-001', '그룹명은 필수입니다.');
    if (st.groups.some((g) => g.name === name)) return fail('E-VALID-002', '이미 등록된 그룹명입니다.');
    st.groups.push({ groupId: `G${st.groups.length + 1}`, name, channels: channels || '메일', window: win || '24시간 상시', night: false, members: members || [] });
    return ok('수신 그룹을 등록했습니다.', { groupId: `G${st.groups.length}` });
  },

  putAlertRecipientGroupsByGroupId: ({ groupId, ...body }) => {
    const g = store().groups.find((x) => x.groupId === groupId);
    if (!g) return fail('E-NOTFOUND', '대상 그룹을 찾을 수 없습니다.');
    Object.assign(g, body);
    return ok('수신 그룹을 수정했습니다.');
  },

  postAlertRecipientGroupsByGroupIdTestSend: ({ groupId }) => {
    const g = store().groups.find((x) => x.groupId === groupId);
    if (!g) return fail('E-NOTFOUND', '대상 그룹을 찾을 수 없습니다.');
    return ok(`${g.name} 그룹 ${g.members.length}명에게 테스트 메시지를 발송했습니다.`, { sentCnt: g.members.length });
  },

  getAlertRecipients: ({ groupId, state, page = 1, size = 50 }) => {
    const st = store();
    let items = st.recipients.map((r) => {
      const u = st.users.find((x) => x.empNo === r.empNo) || { name: r.empNo, dept: '—', pos: '—' };
      return { ...r, name: u.name, dept: u.dept, pos: u.pos, groups: st.groups.filter((g) => g.members.includes(r.empNo)).map((g) => g.name) };
    });
    if (groupId && groupId !== '전체') items = items.filter((r) => r.groups.includes(groupId));
    if (state && state !== '전체') items = items.filter((r) => r.state === state);
    return { items, meta: { page, size, total: items.length } };
  },

  postAlertRecipients: ({ empNo, mail, phone, messenger, night }) => {
    const st = store();
    if (st.recipients.some((r) => r.empNo === empNo)) return fail('E-VALID-002', '이미 등록된 수신자입니다.');
    st.recipients.push({ recipientId: `R${st.recipients.length + 1}`, empNo, mail, phone, messenger, night: !!night, state: '수신' });
    return ok('수신자를 등록했습니다.');
  },

  putAlertRecipientsByRecipientId: ({ recipientId, ...body }) => {
    const r = store().recipients.find((x) => x.recipientId === recipientId);
    if (!r) return fail('E-NOTFOUND', '대상 수신자를 찾을 수 없습니다.');
    Object.assign(r, body);
    return ok('수신자 정보를 수정했습니다.');
  },

  patchAlertRecipientsByRecipientIdState: ({ recipientId }) => {
    const r = store().recipients.find((x) => x.recipientId === recipientId);
    if (!r) return fail('E-NOTFOUND', '대상 수신자를 찾을 수 없습니다.');
    r.state = r.state === '수신' ? '부재' : '수신';
    return ok(`수신 상태를 '${r.state}' 로 바꿨습니다.`, { state: r.state });
  },

  getAlertDuties: () => ({ items: store().duties }),

  postAlertDuties: (body) => {
    const st = store();
    st.duties.unshift({ dutyId: `D${st.duties.length + 1}`, ...body });
    return ok('당번을 등록했습니다.');
  },

  putAlertDutiesByDutyId: ({ dutyId, ...body }) => {
    const st = store();
    const d = st.duties.find((x) => x.dutyId === dutyId);
    if (!d) return fail('E-NOTFOUND', '대상 당번을 찾을 수 없습니다.');
    Object.assign(d, body);
    return ok('당번 정보를 수정했습니다.');
  },

  deleteAlertDutiesByDutyId: ({ dutyId }) => {
    const st = store();
    const idx = st.duties.findIndex((d) => d.dutyId === dutyId);
    if (idx === -1) return fail('E-NOTFOUND', '대상 당번을 찾을 수 없습니다.');
    st.duties.splice(idx, 1);
    return ok('당번을 삭제했습니다.');
  },

  getAlertEscalationRules: () => ({ items: store().escalation }),

  putAlertEscalationRules: ({ stages, rules }) => {
    const st = store();
    st.escalation = stages || rules || st.escalation;
    return ok('승격 규칙을 수정했습니다.', { items: st.escalation });
  },

  /* ═══════════ SY-06 용어 사전 ═══════════ */
  getGlossaryDomains: () => ({
    domains: GLOSSARY_DOMAINS.map((d, i) => ({ domainId: `DOM_${i + 1}`, code: d, name: d })),
  }),

  getGlossarySummary: () => {
    const st = store();
    const me = mockState.currentUser.empNo;
    return {
      termCnt: st.glossary.length,
      variantCnt: st.glossary.reduce((n, g) => n + g.variants.length, 0),
      mineCnt: st.glossary.reduce((n, g) => n + g.variants.filter((v) => v.by === me).length, 0),
      emptyCnt: st.glossary.filter((g) => !g.variants.length).length,
      domainCnt: new Set(st.glossary.map((g) => g.domain)).size,
      domains: GLOSSARY_DOMAINS,
      canEditTerm: mockState.currentUser.dept === '통합관리자',
    };
  },

  getGlossaryTerms: ({ keyword, domain, mineOnly, page = 1, size = 200 }) => {
    const st = store();
    const me = mockState.currentUser.empNo;
    let items = st.glossary.map((g) => ({
      ...g,
      variants: g.variants.map((v) => {
        const u = st.users.find((x) => x.empNo === v.by);
        return { ...v, byName: u ? u.name : '(삭제된 계정)', byDept: u ? u.dept : '—', mine: v.by === me };
      }),
    }));
    if (domain && domain !== '전체') items = items.filter((g) => g.domain === domain);
    if (mineOnly) items = items.filter((g) => g.variants.some((v) => v.mine));
    if (keyword) {
      const q = String(keyword).toLowerCase();
      items = items.filter((g) => g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q) || g.variants.some((v) => v.word.toLowerCase().includes(q)));
    }
    return { items, meta: { page, size, total: items.length } };
  },

  postGlossaryTerms: ({ term, definition, domain }) => {
    const st = store();
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-002', '공식 용어는 통합관리자만 등록할 수 있습니다.');
    if (!term) return fail('E-VALID-001', '용어는 필수입니다.');
    if (st.glossary.some((g) => g.term.toLowerCase() === String(term).toLowerCase())) return fail('E-VALID-002', '이미 등록된 용어입니다.');
    const termId = `T${Date.now().toString(36)}`;
    st.glossary.push({ termId, term, definition, domain, variants: [] });
    return ok('공식 용어를 등록했습니다.', { termId });
  },

  putGlossaryTermsByTermId: ({ termId, term, definition, domain }) => {
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-002', '공식 용어는 통합관리자만 수정할 수 있습니다.');
    const g = store().glossary.find((x) => x.termId === termId);
    if (!g) return fail('E-NOTFOUND', '대상 용어를 찾을 수 없습니다.');
    if (term) g.term = term;
    if (definition) g.definition = definition;
    if (domain) g.domain = domain;
    return ok('공식 용어를 수정했습니다.');
  },

  deleteGlossaryTermsByTermId: ({ termId }) => {
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-002', '공식 용어는 통합관리자만 삭제할 수 있습니다.');
    const st = store();
    const idx = st.glossary.findIndex((x) => x.termId === termId);
    if (idx === -1) return fail('E-NOTFOUND', '대상 용어를 찾을 수 없습니다.');
    const [removed] = st.glossary.splice(idx, 1);
    return ok(`'${removed.term}' 용어를 삭제했습니다.`);
  },

  postGlossaryTermsByTermIdVariants: ({ termId, word }) => {
    const st = store();
    const g = st.glossary.find((x) => x.termId === termId);
    if (!g) return fail('E-NOTFOUND', '대상 용어를 찾을 수 없습니다.');
    if (!word) return fail('E-VALID-001', '유사어를 입력하세요.');
    const dup = st.glossary.find((t) => t.variants.some((v) => v.word.toLowerCase() === String(word).toLowerCase()));
    if (dup) return fail('E-VALID-002', `이미 '${dup.term}' 에 등록된 유사어입니다.`);
    const variantId = `V${Date.now().toString(36)}`;
    g.variants.push({ variantId, word, by: mockState.currentUser.empNo, at: nowStamp().slice(0, 10) });
    return ok(`'${word}' 유사어를 등록했습니다.`, { variantId });
  },

  putGlossaryVariantsByVariantId: ({ variantId, word, termId }) => {
    const st = store();
    let found = null;
    let owner = null;
    st.glossary.forEach((g) => {
      const v = g.variants.find((x) => x.variantId === variantId);
      if (v) {
        found = v;
        owner = g;
      }
    });
    if (!found) return fail('E-NOTFOUND', '대상 유사어를 찾을 수 없습니다.');
    // 유사어는 등록한 본인만 수정·삭제할 수 있습니다
    if (found.by !== mockState.currentUser.empNo) return fail('E-AUTH-002', '본인이 등록한 유사어만 수정할 수 있습니다.');
    if (word) found.word = word;
    if (termId && termId !== owner.termId) {
      owner.variants = owner.variants.filter((x) => x.variantId !== variantId);
      const target = st.glossary.find((g) => g.termId === termId);
      if (target) target.variants.push(found);
    }
    return ok('유사어를 수정했습니다.');
  },

  deleteGlossaryVariantsByVariantId: ({ variantId }) => {
    const st = store();
    let allowed = false;
    st.glossary.forEach((g) => {
      const v = g.variants.find((x) => x.variantId === variantId);
      if (v && v.by === mockState.currentUser.empNo) {
        allowed = true;
        g.variants = g.variants.filter((x) => x.variantId !== variantId);
      }
    });
    if (!allowed) return fail('E-AUTH-002', '본인이 등록한 유사어만 삭제할 수 있습니다.');
    return ok('유사어를 삭제했습니다.');
  },

  /** 현장 표현을 공식 용어로 바꿔 보여 줍니다 */
  postGlossaryNormalize: ({ text }) => {
    const st = store();
    const replacements = [];
    let result = String(text || '');
    st.glossary.forEach((g) => {
      g.variants.forEach((v) => {
        if (!v.word) return;
        const idx = result.toLowerCase().indexOf(v.word.toLowerCase());
        if (idx >= 0) {
          replacements.push({ from: v.word, to: g.term, domain: g.domain });
          result = result.replace(new RegExp(v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), g.term);
        }
      });
    });
    return ok(replacements.length ? `${replacements.length}건을 공식 용어로 바꿨습니다.` : '바꿀 유사어를 찾지 못했습니다.', { original: text, normalized: result, replacements });
  },

  postGlossaryReindex: () => ok('용어 임베딩 재생성을 시작했습니다 — 완료 시 알림이 발송됩니다.', { jobId: `GLS-${Date.now()}` }),

  /* ═══════════ SY-07 제품군 순위 관리 ═══════════ */
  getProductsFamilies: () => {
    const order = mockState.familyOrder;
    return {
      items: order.map((family, i) => ({
        familyCd: family,
        name: family,
        rank: i + 1,
        productCnt: store().products.filter((p) => p.family === family).length,
      })),
      isDefault: JSON.stringify(order) === JSON.stringify(FAMILY_ORDER_DEFAULT),
    };
  },

  putProductsFamiliesOrder: ({ order, familyCd, direction, toRank }) => {
    let list = [...mockState.familyOrder];
    if (order) list = order;
    else if (familyCd) {
      const i = list.indexOf(familyCd);
      if (i < 0) return fail('E-NOTFOUND', '대상 제품군을 찾을 수 없습니다.');
      let target = toRank !== undefined ? toRank - 1 : direction === 'up' ? i - 1 : i + 1;
      target = Math.max(0, Math.min(list.length - 1, target));
      list.splice(i, 1);
      list.splice(target, 0, familyCd);
    }
    mockState.familyOrder = list;
    recalcRanks();
    store().rankLogs.unshift({ ts: nowStamp(), act: '제품군 순위', detail: familyCd ? `${familyCd} 순위 변경` : '제품군 순위 일괄 변경', by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok('제품군 순위를 변경했습니다 — 대시보드 주력 제품 Top N 도 함께 바뀝니다.', { order: list });
  },

  getProductsFamiliesByFamilyCdProducts: ({ familyCd }) => ({
    items: store().products.filter((p) => p.family === familyCd).sort((a, b) => a.seq - b.seq),
  }),

  putProductsFamiliesByFamilyCdProductsOrder: ({ familyCd, code, direction }) => {
    const list = store().products.filter((p) => p.family === familyCd).sort((a, b) => a.seq - b.seq);
    const i = list.findIndex((p) => p.code === code);
    if (i < 0) return fail('E-NOTFOUND', '대상 제품을 찾을 수 없습니다.');
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return fail('E-VALID-001', '더 이동할 수 없습니다.');
    const tmp = list[i].seq;
    list[i].seq = list[j].seq;
    list[j].seq = tmp;
    recalcRanks();
    return ok(`${code} 제품 순서를 변경했습니다.`);
  },

  postProductsFamiliesOrderReset: () => {
    mockState.familyOrder = [...FAMILY_ORDER_DEFAULT];
    store().products.forEach((p, i) => {
      p.seq = PRODUCTS[i].seq;
    });
    recalcRanks();
    store().rankLogs.unshift({ ts: nowStamp(), act: '제품군 순위', detail: '기본 순서로 복원', by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok('기본 순서로 복원했습니다.');
  },

  getProductsRanking: ({ topN = 10 }) => ({ items: [...store().products].sort((a, b) => a.rank - b.rank).slice(0, Number(topN)) }),

  getProductsRankLogs: () => ({ items: store().rankLogs }),

  /* ═══════════ SY-08 자연어 질의 이력 ═══════════ */
  getAiChatHistorySummary: () => CHAT_HISTORY_SUMMARY,

  getAiChatHistory: ({ from, to, group, page = 1, size = 50 }) => {
    // 이번 세션 질의(aiMock) 와 시드 이력을 함께 보여 줍니다
    const session = mockState.store.ai?.history || [];
    let items = [...session, ...store().chatHistory];
    if (group && group !== '전체') items = items.filter((h) => (h.dept || '').includes(group));
    return { items, meta: { page, size, total: items.length } };
  },

  getAiChatHistoryByMessageId: ({ messageId }) => {
    const session = mockState.store.ai?.history || [];
    const row = [...session, ...store().chatHistory].find((h) => h.messageId === messageId);
    if (!row) return null;
    const message = (mockState.store.ai?.messages || []).find((m) => m.messageId === messageId);
    return { ...row, blocks: message?.blocks || [] };
  },

  postAiChatHistoryExportTrainset: ({ ratingFilter }) => {
    const items = store().chatHistory.filter((h) => !ratingFilter || ratingFilter === '전체' || h.rating === ratingFilter);
    return ok(`학습데이터 ${items.length}건을 내보냈습니다 — 파인튜닝 후보로 사용됩니다.`, { count: items.length });
  },

  /* ═══════════ SY-09 보안 감사 로그 ═══════════ */
  getAuditLogs: ({ type, group, page = 1, size = 100 }) => {
    let items = [...AUDIT_LOGS, ...store().permLogs.map((l) => ({ ts: l.ts.slice(11), type: '권한 변경', target: l.target, group: '관리자', result: l.detail, note: l.by }))];
    if (type && type !== '전체') items = items.filter((x) => x.type === type);
    if (group && group !== '전체') items = items.filter((x) => x.group === group);
    return { items, meta: { page, size, total: items.length } };
  },

  /* ═══════════ SY-10 AI 모델 설정 ═══════════ */
  getAiModelConfig: () => store().modelConfig,

  putAiModelConfig: ({ anomaly, classify }) => {
    const st = store();
    if (anomaly) st.modelConfig.anomaly = { ...st.modelConfig.anomaly, ...anomaly };
    if (classify) st.modelConfig.classify = { ...st.modelConfig.classify, ...classify };
    logPerm('AI 모델 설정', '설정', '이상 탐지 임계치 · 분류 기준 저장');
    return ok('설정을 저장했습니다.');
  },

  getAiMaskRules: () => ({ items: store().maskRules }),

  putAiMaskRulesByRuleId: ({ ruleId, ...body }) => {
    const st = store();
    if (!ruleId) {
      const newId = `MR${st.maskRules.length + 1}`;
      st.maskRules.push({ ruleId: newId, enabled: true, ...body });
      logPerm(body.name, '보안 필터링', '패턴 등록');
      return ok('보안 필터링 패턴을 등록했습니다.', { ruleId: newId });
    }
    const r = st.maskRules.find((x) => x.ruleId === ruleId);
    if (!r) return fail('E-NOTFOUND', '대상 패턴을 찾을 수 없습니다.');
    Object.assign(r, body);
    logPerm(r.name, '보안 필터링', '패턴 수정');
    return ok('보안 필터링 패턴을 수정했습니다.');
  },

  /* ═══════════ SY-11 AI 모델 버전 관리 ═══════════ */
  getAiModelReleasesSummary: () => {
    const st = store();
    const serving = st.releases.find((r) => r.state === '서비스 중') || st.releases[0];
    const ft = st.finetuneBuilds.find((f) => f.ftId === serving?.ftId);
    return {
      servingVer: serving?.ver,
      servingSince: serving?.ts,
      releaseCnt: st.releases.length,
      vectorCnt: st.vectorBuilds.filter((v) => v.state === '완료').length,
      finetuneCnt: st.finetuneBuilds.filter((f) => f.state === '완료').length,
      evaluation: ft?.evaluation || { intent: 0, cite: 0, refuse: 0, halluc: 0 },
    };
  },

  getAiModelReleases: () => ({ items: store().releases }),

  postAiModelReleases: ({ ver, vecId, ftId, note, applyNow }) => {
    const st = store();
    if (!ver) return fail('E-VALID-001', '버전을 입력하세요.');
    if (st.releases.some((r) => r.ver === ver)) return fail('E-VALID-002', '이미 등록된 버전입니다.');
    if (applyNow) st.releases.forEach((r) => { if (r.state === '서비스 중') r.state = '대기'; });
    st.releases.unshift({ ver, vecId, ftId, ts: nowStamp(), by: `${mockState.currentUser.name} (${mockState.currentUser.dept})`, state: applyNow ? '서비스 중' : '대기', mode: '즉시 전환', note: note || '—' });
    if (applyNow) mockState.servingModelVer = ver;
    st.deployLogs.unshift({ ts: nowStamp(), act: '릴리스 등록', detail: `${ver} · ${vecId} + ${ftId}${applyNow ? ' · 즉시 서비스 전환' : ''}`, by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok(`${ver} 릴리스를 등록했습니다${applyNow ? ' — 서비스 전환 완료' : ''}.`, { ver });
  },

  getAiModelReleasesByVerApplyPreview: ({ ver }) => {
    const st = store();
    const target = st.releases.find((r) => r.ver === ver);
    const current = st.releases.find((r) => r.state === '서비스 중');
    const evalOf = (rel) => st.finetuneBuilds.find((f) => f.ftId === rel?.ftId)?.evaluation || { intent: 0, cite: 0, refuse: 0, halluc: 0 };
    const a = evalOf(current);
    const b = evalOf(target);
    return {
      current: { ver: current?.ver, ...a },
      target: { ver: target?.ver, ...b },
      diff: [
        { label: '의도 파악 정확도', before: a.intent, after: b.intent, lowerIsBetter: false },
        { label: '근거 인용률', before: a.cite, after: b.cite, lowerIsBetter: false },
        { label: '권한 밖 질의 거부 정확도', before: a.refuse, after: b.refuse, lowerIsBetter: false },
        { label: '환각률 (낮을수록 좋음)', before: a.halluc, after: b.halluc, lowerIsBetter: true },
      ],
      rollbackOptions: st.releases.filter((r) => r.ver !== ver).map((r) => r.ver),
    };
  },

  postAiModelReleasesByVerApply: ({ ver, mode, reason }) => {
    const st = store();
    const target = st.releases.find((r) => r.ver === ver);
    if (!target) return fail('E-NOTFOUND', '대상 버전을 찾을 수 없습니다.');
    if (target.state === '서비스 중') return fail('E-RULE-001', `${ver} 은(는) 이미 서비스 중입니다.`);
    const current = st.releases.find((r) => r.state === '서비스 중');
    st.releases.forEach((r) => { if (r.state === '서비스 중') r.state = '대기'; });
    target.state = '서비스 중';
    target.mode = mode || '즉시 전환';
    target.ts = nowStamp();
    target.by = `${mockState.currentUser.name} (${mockState.currentUser.dept})`;
    if (reason) target.note = reason;
    mockState.servingModelVer = ver;
    st.deployLogs.unshift({ ts: nowStamp(), act: '서비스 전환', detail: `${current?.ver} → ${ver} (${target.mode})`, by: target.by });
    return ok(`${ver} 로 전환했습니다 — 자연어 질의가 새 버전으로 응답합니다.`, { ver });
  },

  postAiModelReleasesRollback: () => {
    const st = store();
    const current = st.releases.find((r) => r.state === '서비스 중');
    const prev = st.releases.find((r) => r.state === '대기');
    if (!prev) return fail('E-RULE-001', '되돌릴 대기 버전이 없습니다.');
    st.releases.forEach((r) => { if (r.state === '서비스 중') r.state = '대기'; });
    prev.state = '서비스 중';
    mockState.servingModelVer = prev.ver;
    st.deployLogs.unshift({ ts: nowStamp(), act: '롤백', detail: `${current?.ver} → ${prev.ver} 로 되돌림`, by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok(`${prev.ver} 로 되돌렸습니다.`, { ver: prev.ver });
  },

  postAiModelReleasesByVerArchive: ({ ver }) => {
    const r = store().releases.find((x) => x.ver === ver);
    if (!r) return fail('E-NOTFOUND', '대상 버전을 찾을 수 없습니다.');
    if (r.state === '서비스 중') return fail('E-RULE-001', '서비스 중인 버전은 보관할 수 없습니다.');
    r.state = r.state === '보관' ? '대기' : '보관';
    return ok(`${ver} 을(를) ${r.state === '보관' ? '보관 처리' : '대기로 복원'}했습니다.`, { state: r.state });
  },

  getAiVectorBuilds: () => ({ items: store().vectorBuilds }),

  postAiVectorBuilds: ({ mode, embedding, runNow }) => {
    store().deployLogs.unshift({ ts: nowStamp(), act: '벡터 색인', detail: `${mode || '증분 색인'} 요청 · ${embedding || 'bge-m3-ko'}`, by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok(runNow ? '벡터 재색인을 시작했습니다 — 완료 시 알림이 발송됩니다.' : '다음 배치에 재색인을 예약했습니다.', { jobId: `VEC-${Date.now()}` });
  },

  getAiVectorBuildsByVecId: ({ vecId }) => store().vectorBuilds.find((v) => v.vecId === vecId) || null,

  getAiFinetuneBuilds: () => ({ items: store().finetuneBuilds }),

  postAiFinetuneBuilds: ({ method, epoch, runNow }) => {
    // r=64 이상은 과거 OOM 으로 실패한 이력이 있어 사전에 막습니다
    if (String(method).indexOf('r=64') >= 0) {
      return fail('E-RULE-001', 'r=64 는 이전 실행에서 OOM 으로 실패했습니다 — 학습 방식을 다시 확인하세요.');
    }
    store().deployLogs.unshift({ ts: nowStamp(), act: '파인튜닝', detail: `${method} · epoch ${epoch} 학습 요청`, by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok(runNow ? '파인튜닝 작업을 시작했습니다 — 완료까지 6시간 내외 소요됩니다.' : '파인튜닝 작업을 예약했습니다 — 완료까지 6시간 내외 소요됩니다.', { jobId: `FT-${Date.now()}` });
  },

  getAiFinetuneBuildsByFtId: ({ ftId }) => store().finetuneBuilds.find((f) => f.ftId === ftId) || null,

  getAiModelReleasesPerformanceTrend: () => PERFORMANCE_TREND,

  getAiModelReleasesDeployLogs: () => ({ items: store().deployLogs }),

  /* ═══════════ SY-12 Agent 실행 현황 ═══════════ */
  getAiAgentsSummary: () => ({
    master: { state: '정상', mode: 'Active-Standby 이중화' },
    agentCnt: AGENTS.length,
    allNormal: AGENTS.every((a) => a.state !== '오류'),
    eventsPerMin: 1204,
    avgResponseSec: 1.8,
  }),

  getAiAgents: () => ({ items: AGENTS.map((a) => ({ ...a, role: AGENT_DEFS.find((d) => d.no === a.no)?.role || '', screens: AGENT_DEFS.find((d) => d.no === a.no)?.screens || '' })) }),

  getAiAgentsPipeline: () => ({ stages: AGENT_PIPELINE }),

  postAiAgentsByAgentCdRestart: ({ agentCd, reason }) => {
    const a = AGENTS.find((x) => x.no === agentCd);
    return ok(`${a ? a.name : agentCd} Agent 를 재시작했습니다.${reason ? ` (${reason})` : ''}`, { agentCd, restartedAt: nowStamp() });
  },

  getAiAgentsByAgentCdRuns: ({ agentCd }) => ({ items: agentCd ? AGENT_RUNS.filter((r) => r.agentCd === agentCd) : AGENT_RUNS }),

  /* ═══════════ SY-13 지표 측정 데이터 관리 ═══════════ */
  getMetricsStandardsSummary: () => {
    const items = store().metrics;
    const graded = items.filter((m) => m.enabled).map((m) => gradeOf(m.current, m));
    return {
      total: items.length,
      enabled: items.filter((m) => m.enabled).length,
      disabled: items.filter((m) => !m.enabled).length,
      badCnt: graded.filter((g) => g === 'bad').length,
      warnCnt: graded.filter((g) => g === 'warn').length,
      lastUpdatedAt: '2026-08-25',
      lastUpdatedBy: '한도현 (전산팀)',
    };
  },

  getMetricsStandards: ({ category, enabled, grade, page = 1, size = 100 }) => {
    let items = store().metrics.map((m) => ({ ...m, grade: gradeOf(m.current, m) }));
    if (category && category !== '전체') items = items.filter((m) => m.category === category);
    if (enabled === '적용') items = items.filter((m) => m.enabled);
    if (enabled === '미적용') items = items.filter((m) => !m.enabled);
    if (grade && grade !== '전체') {
      const map = { 정상: 'ok', 주의: 'warn', 위험: 'bad' };
      items = items.filter((m) => m.grade === map[grade]);
    }
    return { items, meta: { page, size, total: items.length } };
  },

  postMetricsStandards: (body) => {
    const st = store();
    if (!body.name) return fail('E-VALID-001', '지표명은 필수입니다.');
    if (st.metrics.some((m) => m.name === body.name)) return fail('E-VALID-002', '이미 등록된 지표명입니다.');
    const stdId = `M${st.metrics.length + 1}`;
    st.metrics.push({
      stdId,
      current: 0,
      enabled: true,
      lowerIsBetter: Number(body.bad) >= Number(body.warn),
      updatedAt: nowStamp().slice(0, 10),
      updatedBy: mockState.currentUser.name,
      ...body,
      ok: Number(body.ok),
      warn: Number(body.warn),
      bad: Number(body.bad),
    });
    logPerm(body.name, '지표 기준', '지표 기준 등록');
    return ok('지표 기준을 등록했습니다.', { stdId });
  },

  putMetricsStandardsByStdId: ({ stdId, field, value }) => {
    const m = store().metrics.find((x) => x.stdId === stdId);
    if (!m) return fail('E-NOTFOUND', '대상 지표를 찾을 수 없습니다.');
    const num = parseFloat(value);
    if (Number.isNaN(num)) return fail('E-VALID-001', '숫자를 입력하세요.');
    const labels = { ok: '정상 기준', warn: '주의 임계', bad: '위험 임계' };
    const before = m[field];
    m[field] = num;
    m.updatedAt = nowStamp().slice(0, 10);
    m.updatedBy = mockState.currentUser.name;
    store().metricHistory.unshift({ ts: nowStamp(), metric: m.name, field: labels[field] || field, before: String(before), after: String(num), by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
    return ok(`${m.name} · ${labels[field] || field} ${before} → ${num} 로 변경했습니다.`, { stdId });
  },

  patchMetricsStandardsByStdIdState: ({ stdId }) => {
    const m = store().metrics.find((x) => x.stdId === stdId);
    if (!m) return fail('E-NOTFOUND', '대상 지표를 찾을 수 없습니다.');
    m.enabled = !m.enabled;
    return ok(`${m.name} 기준을 ${m.enabled ? '적용' : '해제'}했습니다.`, { enabled: m.enabled });
  },

  getMetricsStandardsHistory: ({ page = 1, size = 20 }) => ({ items: store().metricHistory.slice(0, size), meta: { page, size, total: store().metricHistory.length } }),

  getMetricsStandardsByStdIdUsage: ({ stdId }) => {
    const m = store().metrics.find((x) => x.stdId === stdId);
    return {
      metric: m?.name,
      usages: [
        { area: '이상 알림 발송 조건', detail: store().conditions.filter((c) => c.metric.includes(m?.name || '')).map((c) => c.name).join(' · ') || '연결된 조건 없음' },
        { area: '대시보드 목표선', detail: 'AI 통합 대시보드 · 공정 및 제품 대시보드' },
        { area: '보고서 신호등', detail: '아침회의 자료 · 제품별 수율' },
      ],
    };
  },

  /* ═══════════ SY-14 보고서 다운로드 이력 ═══════════ */
  getDownloadLogsSummary: () => {
    const items = store().downloadLogs;
    const byUser = {};
    items.forEach((d) => {
      byUser[d.user] = (byUser[d.user] || 0) + 1;
    });
    const top = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0];
    return {
      total: items.length,
      today: items.filter((d) => d.ts.startsWith('2026-08-28')).length,
      blindCnt: items.filter((d) => d.blindCount > 0).length,
      topUser: top ? `${top[0]} ${top[1]}건` : '—',
      byUser: Object.entries(byUser).map(([user, cnt]) => ({ user, cnt, ratio: Math.round((cnt / items.length) * 100) })).sort((a, b) => b.cnt - a.cnt),
    };
  },

  getDownloadLogs: ({ from, to, reportName, dept, format, page = 1, size = 100 }) => {
    let items = store().downloadLogs;
    if (from) items = items.filter((d) => d.ts.slice(0, 10) >= from);
    if (to) items = items.filter((d) => d.ts.slice(0, 10) <= to);
    if (reportName && reportName !== '전체') items = items.filter((d) => d.reportName === reportName);
    if (dept && dept !== '전체') items = items.filter((d) => d.dept === dept);
    if (format && format !== '전체') items = items.filter((d) => d.format === format);
    return { items, meta: { page, size, total: items.length } };
  },

  postDownloadLogs: ({ reportName, format, rowCount, blindCount }) => {
    store().downloadLogs.unshift({
      ts: nowStamp() + ':00',
      user: mockState.currentUser.name,
      dept: mockState.currentUser.dept,
      reportName: reportName || '화면 조회 결과',
      format,
      scope: '현재 조회 결과',
      rowCount: rowCount || 0,
      blindCount: blindCount || 0,
      ip: '10.20.14.31',
    });
    return ok('다운로드 이력을 기록했습니다.');
  },

  getDownloadLogsRetentionPolicy: () => RETENTION_POLICY,

  /* ═══════════ SY-15 데이터 연동 이력 ═══════════ */
  getSyncJobsSummary: () => {
    const items = store().syncJobs;
    const today = items.filter((m) => m.startAt.startsWith('2026-08-28'));
    const durations = items.filter((m) => m.duration).map((m) => parseInt(m.duration, 10) || 0);
    return {
      todayRows: today.reduce((a, m) => a + m.okRows, 0),
      failRows: items.reduce((a, m) => a + m.ngRows, 0),
      avgDurationMin: durations.length ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)) : 0,
      runningCnt: items.filter((m) => m.state === '진행 중').length,
      failCnt: items.filter((m) => m.state === '실패').length,
    };
  },

  getSyncJobs: ({ state, kind, page = 1, size = 100 }) => {
    let items = store().syncJobs;
    if (state && state !== '전체') items = items.filter((m) => m.state === state);
    if (kind && kind !== '전체') items = items.filter((m) => m.kind === kind);
    return { items, meta: { page, size, total: items.length } };
  },

  getSyncJobsByJobId: ({ jobId }) => {
    const m = store().syncJobs.find((x) => x.jobId === jobId);
    if (!m) return null;
    return { ...m, failReason: m.ngRows ? SYNC_FAIL_REASON : null, validated: m.ngRows === 0 };
  },

  // 실행은 이관 엔진이 하므로 '예약 대기' 로 만들어 둡니다 (실서버 No.229 와 동일)
  postSyncJobsByJobIdRetry: ({ jobId }) => {
    const st = store();
    const m = st.syncJobs.find((x) => x.jobId === jobId);
    if (!m) return fail('E-NOTFOUND', '대상 작업을 찾을 수 없습니다.');
    if (!m.ngRows) return fail('E-RULE-001', '재실행할 실패 건이 없습니다.');
    const newJobId = `SYNC-${Date.now().toString(36).toUpperCase().slice(-12)}`;
    st.syncJobs.unshift({
      jobId: newJobId,
      srcTable: m.srcTable,
      dstTable: m.dstTable,
      kind: m.kind,
      startAt: '',
      scheduledAt: nowStamp(),
      endAt: '',
      duration: '',
      rows: 0,
      okRows: 0,
      ngRows: 0,
      state: '예약 대기',
    });
    return ok('재실행을 등록했습니다. 이관 엔진이 곧 실행합니다.', { newJobId, state: 'PENDING' });
  },

  postSyncJobsManual: ({ srcTables = [], kind = 'incremental', scheduledAt }) => {
    const st = store();
    if (!srcTables.length) return fail('E-VALID-001', '이관할 대상 테이블을 선택해 주세요.');

    const jobIds = srcTables.map((table, idx) => {
      const jobId = `SYNC-${Date.now().toString(36).toUpperCase().slice(-10)}-${idx + 1}`;
      st.syncJobs.unshift({
        jobId,
        srcTable: table,
        dstTable: (SYNC_MAPS.find((x) => x.srcTable === table) || {}).dstTable || 'ax.unknown',
        kind: kind === 'full' ? '전체' : '증분',
        startAt: '',
        scheduledAt: scheduledAt || nowStamp(),
        endAt: '',
        duration: '',
        rows: 0,
        okRows: 0,
        ngRows: 0,
        state: '예약 대기',
      });
      return jobId;
    });

    return ok('수동 이관을 예약했습니다. 이관 엔진이 곧 실행합니다.', {
      jobIds, scheduledCnt: jobIds.length, state: 'PENDING',
    });
  },

  postSyncConnectionTest: () => ok('연동 테스트 완료 — MSSQL(DWJ_MES) 및 PostgreSQL(ax) 모두 정상 응답했습니다.', {
    results: [
      { target: 'MSSQL — DWJ_MES', result: '성공', elapsedMs: 142 },
      { target: 'PostgreSQL — ax', result: '성공', elapsedMs: 38 },
      { target: '사업관리시스템 (smart-factory.kr)', result: '성공', elapsedMs: 421 },
    ],
  }),

  getSyncMaps: () => ({ items: SYNC_MAPS }),

  getSyncPolicy: () => SYNC_POLICY,

  getSyncSchemaDriftSummary: () => {
    const open = store().syncDrifts.filter((d) => !d.resolved);
    const cnt = (side, kind) => open.filter((d) => d.side === side && d.kind === kind).length;
    return {
      driftState: open.length ? 'DRIFT' : 'CLEAN',
      openCnt: open.length,
      sourceNewCnt: cnt('SOURCE', 'NEW'),
      sourceMissingCnt: cnt('SOURCE', 'MISSING'),
      targetNewCnt: cnt('TARGET', 'NEW'),
      targetMissingCnt: cnt('TARGET', 'MISSING'),
      maxDetectCnt: open.reduce((a, d) => Math.max(a, d.detectCnt), 0),
      lastCheckedAt: open.reduce((a, d) => (d.lastSeenAt > a ? d.lastSeenAt : a), ''),
    };
  },

  getSyncSchemaDrift: ({ side, kind, resolved, page = 1, size = 100 }) => {
    let items = store().syncDrifts;
    if (side && side !== '전체') items = items.filter((d) => d.side === side);
    if (kind && kind !== '전체') items = items.filter((d) => d.kind === kind);
    if (resolved !== undefined && resolved !== null && resolved !== '전체') {
      items = items.filter((d) => d.resolved === resolved);
    }
    // 오래 방치된 건이 위로 오도록 미해소 → 발견 횟수 내림차순
    items = [...items].sort((a, b) => a.resolved - b.resolved || b.detectCnt - a.detectCnt);
    return { items, meta: { page, size, total: items.length } };
  },

  postSyncSchemaDriftByDriftIdResolve: ({ driftId, note }) => {
    const d = store().syncDrifts.find((x) => x.driftId === driftId);
    if (!d) return fail('E-NOTFOUND', '스키마 드리프트를 찾을 수 없습니다.');
    if (d.resolved) return fail('E-RULE-001', '이미 해소 처리된 드리프트입니다.');
    d.resolved = true;
    d.resolvedAt = nowStamp();
    d.resolvedBy = 'admin';
    d.resolveNote = note || '';
    return ok('드리프트를 해소 처리했습니다.', { driftId, resolved: true });
  },
};

/** 제품군 순서 · 제품군 내 순서로 전체 rank 를 다시 매깁니다 */
function recalcRanks() {
  const st = store();
  let rank = 0;
  mockState.familyOrder.forEach((family) => {
    st.products
      .filter((p) => p.family === family)
      .sort((a, b) => a.seq - b.seq)
      .forEach((p) => {
        rank += 1;
        p.rank = rank;
      });
  });
}
