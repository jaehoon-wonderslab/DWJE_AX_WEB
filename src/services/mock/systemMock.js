/**
 * 시스템관리 목 핸들러 (API 107건)
 *
 * SY-01 ~ SY-15 화면의 조회·등록·수정·삭제를 모두 다룹니다.
 * 등록·수정 결과는 mockState 에 남아 같은 세션 동안 유지됩니다.
 */
import { USERS } from '@shared/constants/accounts';
import { DATA_FIELDS, DEPTS } from '@shared/constants/dataFields';
import { permRows } from '@shared/constants/menu';
import { nowStamp } from '@shared/utils/formatUtil';
import {
  ALERT_CONDITIONS, AUDIT_LOGS, CHAT_HISTORY_SEED, CHAT_HISTORY_SUMMARY,
  DATA_ACCESS_AUDIT, DATA_PERM_PREVIEW, DOWNLOAD_LOGS, ESCALATION_RULES,
  GLOSSARY, GLOSSARY_DOMAINS, PERM_LOGS, RECIPIENT_GROUPS,
  RECIPIENTS, RETENTION_POLICY, SYNC_DRIFTS, SYNC_FAIL_REASON, SYNC_JOBS, SYNC_MAPS, SYNC_POLICY,
} from './data/system';
import { mockState } from './state';
import { listDocs, versionsOf } from './data/uploads';
import { allDataFields, ownerOfAttr } from './data/dataFieldStore';

function store() {
  if (!mockState.store.system) {
    mockState.store.system = {
      users: JSON.parse(JSON.stringify(USERS)),
      depts: JSON.parse(JSON.stringify(DEPTS)),
      permLogs: [...PERM_LOGS],
      conditions: JSON.parse(JSON.stringify(ALERT_CONDITIONS)),
      recipients: JSON.parse(JSON.stringify(RECIPIENTS)),
      groups: JSON.parse(JSON.stringify(RECIPIENT_GROUPS)),
      escalation: JSON.parse(JSON.stringify(ESCALATION_RULES)),
      glossary: JSON.parse(JSON.stringify(GLOSSARY)),
      chatHistory: [...CHAT_HISTORY_SEED],
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
  /* ───────── SY-16 업로드 문서 목록 (읽기 전용) — 대시보드 업로드 리포트와 같은 저장소 ───────── */
  getSystemUploads: ({ keyword, uploadedBy, from, to } = {}) => ({ items: listDocs({ keyword, uploadedBy, from, to }) }),
  getSystemUploadsByDocIdVersions: ({ docId } = {}) => versionsOf(docId),

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
  /** 관리 화면용 — 미적용 항목까지 보여 줍니다 */
  getSystemDataFields: () => ({ fields: allDataFields() }),

  postSystemDataFields: ({ key, name, desc, category }) => {
    if (!key || !name) return fail('E-VALID-001', '항목 key 와 이름은 필수입니다.');
    if (!/^[a-z][a-z0-9_]{1,29}$/.test(key)) return fail('E-VALID-001', '항목 key 는 영문 소문자로 시작하는 2~30자여야 합니다.');
    if (allDataFields().some((f) => f.key === key)) return fail('E-DUP-001', `이미 있는 항목 key 입니다 — ${key}`);
    // 등록만으로는 아무것도 가려지지 않습니다. 부서 허용을 정한 뒤 「적용」을 켜야 걸립니다
    allDataFields().push({ key, name, desc: desc || '', category: category || '', attrs: [], applyFlg: 'N' });
    logPerm(name, '항목 등록', `데이터 항목 ${key} 등록 (미적용)`);
    return ok('데이터 항목을 등록했습니다 — 부서 허용을 정한 뒤 「적용」을 켜세요.', { key });
  },

  putSystemDataFieldsByFieldKey: ({ fieldKey, name, desc, category }) => {
    const f = allDataFields().find((x) => x.key === fieldKey);
    if (!f) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    if (name) f.name = name;
    if (desc !== undefined) f.desc = desc;
    if (category !== undefined) f.category = category;
    logPerm(f.name, '항목 수정', `데이터 항목 ${fieldKey} 수정`);
    return ok('데이터 항목을 수정했습니다.');
  },

  deleteSystemDataFieldsByFieldKey: ({ fieldKey }) => {
    const list = allDataFields();
    const i = list.findIndex((x) => x.key === fieldKey);
    if (i < 0) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    const [gone] = list.splice(i, 1);
    logPerm(gone.name, '항목 삭제', `데이터 항목 ${fieldKey} 삭제`);
    return ok('데이터 항목을 삭제했습니다 — 그 항목으로 가려지던 값이 다시 보입니다.');
  },

  postSystemDataFieldsByFieldKeyAttrs: ({ fieldKey, attrName }) => {
    const f = allDataFields().find((x) => x.key === fieldKey);
    if (!f) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    const attr = String(attrName || '').trim();
    if (!attr) return fail('E-VALID-001', '응답 필드명을 입력하세요.');
    // 한 필드명이 두 항목에 붙으면 어느 쪽 권한으로 판정할지 정할 수 없습니다 (서버는 UNIQUE 로 막습니다)
    const owner = ownerOfAttr(attr, fieldKey);
    if (owner) return fail('E-DUP-001', `이미 「${owner.name}」 항목에 등록된 필드명입니다 — ${attr}`);
    if (!f.attrs.includes(attr)) f.attrs.push(attr);
    logPerm(f.name, '필드명 등록', `${fieldKey} ← ${attr}`);
    return ok(`응답 필드명 ${attr} 을(를) 등록했습니다.`);
  },

  deleteSystemDataFieldsByFieldKeyAttrsByAttrName: ({ fieldKey, attrName }) => {
    const f = allDataFields().find((x) => x.key === fieldKey);
    if (!f) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    f.attrs = f.attrs.filter((a) => a !== attrName);
    logPerm(f.name, '필드명 해제', `${fieldKey} ✕ ${attrName}`);
    return ok(`응답 필드명 ${attrName} 을(를) 해제했습니다.`);
  },

  patchSystemDataFieldsByFieldKeyApply: ({ fieldKey, on }) => {
    const f = allDataFields().find((x) => x.key === fieldKey);
    if (!f) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    if (on && !f.attrs.length) return fail('E-RULE-001', '응답 필드명이 하나도 없으면 가릴 값이 없습니다 — 먼저 등록하세요.');
    f.applyFlg = on ? 'Y' : 'N';
    logPerm(f.name, '항목 적용', `데이터 항목 ${fieldKey} ${on ? '적용' : '해제'}`);
    return ok(on ? '적용했습니다 — 다시 로그인하면 화면과 엑셀에 반영됩니다.' : '적용을 해제했습니다.', { applyFlg: f.applyFlg });
  },

  getSystemDataPerms: () => ({
    fields: allDataFields(),
    // 서버와 같은 모양으로 보냅니다 — 예전에는 { id, av } 를 그대로 보내 이름·약칭이 비었습니다
    depts: store().depts.map((d) => ({ deptId: d.id, deptNm: d.id, abbr: d.av, desc: d.desc })),
    matrix: Object.fromEntries(store().depts.map((d) => [d.id, dataScopeOf(d.id) === '*' ? allDataFields().map((f) => f.key) : dataScopeOf(d.id)])),
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
    // 명세 필드명(on · validWindow · dedupMin · channels[] · groups[])으로 맞춰 돌려줍니다 — 화면은 명세 기준으로 읽습니다
    items = items.map((c) => ({ ...c, on: c.on ?? c.enabled, validWindow: c.validWindow ?? c.window, dedupMin: c.dedupMin ?? c.dedup, channels: Array.isArray(c.channels) ? c.channels : c.channels ? [c.channels] : [], groups: Array.isArray(c.groups) ? c.groups : c.groups ? [c.groups] : [] }));
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
    };
  },

  getAlertRecipientGroups: () => ({
    items: store().groups.map((g) => ({
      ...g,
      validWindow: g.validWindow ?? g.window,
      channels: Array.isArray(g.channels) ? g.channels : g.channels ? [g.channels] : [],
      memberCnt: g.members.length,
      condCnt: store().conditions.filter((c) => c.groups.indexOf(g.name) >= 0).length,
      memberNames: g.members.map((emp) => store().users.find((u) => u.empNo === emp)?.name || emp),
    })),
  }),

  postAlertRecipientGroups: ({ name, channels, window: win, members }) => {
    const st = store();
    if (!name) return fail('E-VALID-001', '그룹명은 필수입니다.');
    if (st.groups.some((g) => g.name === name)) return fail('E-VALID-002', '이미 등록된 그룹명입니다.');
    st.groups.push({ groupId: `G${st.groups.length + 1}`, name, channels: Array.isArray(channels) ? channels : channels ? [channels] : ['메일'], window: win || '24시간 상시', validWindow: win || '24시간 상시', night: false, members: members || [] });
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
      // 실 서버 응답 키에 맞춥니다 — 휴대전화는 hp, 직급·상태는 표기값(posNm · stateNm)도 함께 옵니다
      return {
        ...r, name: u.name, dept: u.dept, pos: u.pos, posNm: u.pos, hp: r.phone, stateNm: r.state,
        groups: st.groups.filter((g) => g.members.includes(r.empNo)).map((g) => g.name),
      };
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

/* ───────── 명세 외 · 백엔드 구현분 목 ───────── */

/** 회원가입 신청 대기 — 승인하면 계정 목록으로 넘어갑니다 */
const PENDING_SEED = [
  { empNo: '20260412', name: '한지우', dept: '품질보증팀', deptId: '품질보증팀', pos: '사원', email: 'jiwoo.han@dwje.co.kr', requestedAt: '2026-08-27 14:20' },
  { empNo: '20260415', name: '오세진', dept: '제조팀', deptId: '제조팀', pos: '주임', email: 'sejin.oh@dwje.co.kr', requestedAt: '2026-08-27 16:05' },
  { empNo: '20260418', name: '배현우', dept: '생산관리팀', deptId: '생산관리팀', pos: '사원', email: 'hyunwoo.bae@dwje.co.kr', requestedAt: '2026-08-28 09:12' },
];

function pendingStore() {
  const st = store();
  if (!st.pending) st.pending = PENDING_SEED.map((p) => ({ ...p }));
  return st.pending;
}

Object.assign(systemMock, {
  /** 승인 대기 계정 목록 (SY-01-F06) */
  getSystemUsersPending: ({ keyword, page = 1, size = 50 }) => {
    let items = pendingStore();
    if (keyword) items = items.filter((u) => `${u.empNo}${u.name}${u.dept}`.includes(keyword));
    return { items, meta: { page, size, total: items.length, totalPages: 1 } };
  },

  /** 회원가입 승인·반려 (SY-01-F07) — 승인하면 PENDING 이 사라지고 계정이 생깁니다 */
  postSystemUsersByEmpNoApprove: ({ empNo, approve, reason }) => {
    const list = pendingStore();
    const i = list.findIndex((u) => u.empNo === String(empNo));
    if (i < 0) return fail('E-NOTFOUND', '승인 대기 중인 신청을 찾을 수 없습니다.');
    const [target] = list.splice(i, 1);
    const yes = approve === true || approve === 'true' || approve === 'Y';
    if (yes) {
      store().users.push({
        empNo: target.empNo, name: target.name, dept: target.deptId, pos: target.pos,
        state: '사용', lastLoginAt: '—', switchable: false,
      });
    }
    logPerm(`${target.name} (${target.deptId})`, '계정', yes ? '회원가입 승인' : `회원가입 반려 — ${reason || '사유 없음'}`);
    return ok(yes ? '가입을 승인했습니다.' : '가입을 반려했습니다.', { empNo: target.empNo, state: yes ? 'ACTIVE' : 'REJECTED' });
  },

  /**
   * 엔진 실행 이력 (SY-15-F01)
   *
   * `jobs` 는 테이블 한 건, `runs` 는 엔진 한 번의 실행입니다.
   * 표에 닿지도 못하고 끝난 실행은 jobs 에 남지 않으므로 여기서만 보입니다.
   */
  getSyncRuns: ({ state, mode, page = 1, size = 25 }) => {
    let items = SYNC_RUNS;
    if (state && state !== '전체') items = items.filter((r) => r.stateNm === state || r.state === state);
    if (mode && mode !== '전체') items = items.filter((r) => r.modeNm === mode || r.mode === mode);
    const p = Math.max(1, Number(page) || 1);
    const sz = Math.max(1, Number(size) || 25);
    return {
      success: true,
      code: 'SUCCESS',
      message: '엔진 실행 이력 조회가 완료되었습니다.',
      data: { items: items.slice((p - 1) * sz, p * sz) },
      meta: { page: p, size: sz, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / sz)) },
      masked: [],
    };
  },
});

/** 엔진 실행 이력 — 성공·실패·중단이 섞여 있어야 화면의 상태 배지를 다 볼 수 있습니다 */
const SYNC_RUNS = [
  { runId: 'RUN-260828-02', mode: 'INCR', modeNm: '증분', state: 'RUNNING', stateNm: '진행 중', startedAt: '2026-08-28 09:10:00', endedAt: null, durationSec: null, triggeredByCd: 'SCHEDULE', triggeredBy: '스케줄', options: 'tables=4', dryRun: false, tableCnt: 4, successCnt: 3, failCnt: 0, okRows: 1322730, ngRows: 0, driftOpenCntAtRun: 2, engineVersion: '1.4.2', host: 'ax-mig-01', message: '' },
  { runId: 'RUN-260828-01', mode: 'INCR', modeNm: '증분', state: 'SUCCESS', stateNm: '완료', startedAt: '2026-08-28 02:00:12', endedAt: '2026-08-28 02:19:52', durationSec: 1180, triggeredByCd: 'SCHEDULE', triggeredBy: '스케줄', options: 'tables=3', dryRun: false, tableCnt: 3, successCnt: 3, failCnt: 0, okRows: 1286562, ngRows: 0, driftOpenCntAtRun: 2, engineVersion: '1.4.2', host: 'ax-mig-01', message: '' },
  { runId: 'RUN-260827-03', mode: 'INCR', modeNm: '증분', state: 'FAIL', stateNm: '실패', startedAt: '2026-08-27 02:16:55', endedAt: '2026-08-27 02:21:40', durationSec: 285, triggeredByCd: 'SCHEDULE', triggeredBy: '스케줄', options: 'tables=2', dryRun: false, tableCnt: 2, successCnt: 1, failCnt: 1, okRows: 401906, ngRows: 274, driftOpenCntAtRun: 3, engineVersion: '1.4.2', host: 'ax-mig-01', message: '대상 컬럼 judge_code 길이 초과 — 원본 4자 / 대상 3자' },
  { runId: 'RUN-260827-02', mode: 'FULL', modeNm: '전체', state: 'ABORTED', stateNm: '중단', startedAt: '2026-08-27 01:02:00', endedAt: '2026-08-27 01:02:31', durationSec: 31, triggeredByCd: 'USER', triggeredBy: '관리자 관리자', options: 'dryRun', dryRun: true, tableCnt: 0, successCnt: 0, failCnt: 0, okRows: 0, ngRows: 0, driftOpenCntAtRun: 3, engineVersion: '1.4.2', host: 'ax-mig-02', message: '원본 접속 실패 — 표에 닿지 못하고 끝났습니다' },
  { runId: 'RUN-260826-01', mode: 'FULL', modeNm: '전체', state: 'SUCCESS', stateNm: '완료', startedAt: '2026-08-26 03:00:00', endedAt: '2026-08-26 03:04:12', durationSec: 252, triggeredByCd: 'USER', triggeredBy: '관리자 관리자', options: 'tables=1', dryRun: false, tableCnt: 1, successCnt: 1, failCnt: 0, okRows: 3418, ngRows: 0, driftOpenCntAtRun: 1, engineVersion: '1.4.1', host: 'ax-mig-01', message: '' },
];
