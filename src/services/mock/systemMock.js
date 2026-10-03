/**
 * 시스템관리 목 핸들러 (API 107건)
 *
 * SY-01 ~ SY-15 화면의 조회·등록·수정·삭제를 모두 다룹니다.
 * 등록·수정 결과는 mockState 에 남아 같은 세션 동안 유지됩니다.
 */
import { USERS } from '@shared/constants/accounts';
import { DATA_FIELDS, DEPTS } from '@shared/constants/dataFields';
import { EXTRA_PAGES, permRows } from '@shared/constants/menu';
import { nowStamp } from '@shared/utils/formatUtil';
import {
  ALERT_CONDITIONS, AUDIT_LOGS, CHAT_HISTORY_SEED, CHAT_HISTORY_SUMMARY,
  DATA_ACCESS_AUDIT, DOWNLOAD_LOGS, ESCALATION_RULES,
  GW_DEPT_MAP_SEED, GW_DEPT_SOURCE, GW_UNASSIGNED_USERS,
  GLOSSARY, GLOSSARY_DOMAINS, PERM_LOGS, RECIPIENT_GROUPS,
  RECIPIENTS, RETENTION_POLICY, SYNC_DRIFTS, SYNC_FAIL_REASON, SYNC_JOBS, SYNC_MAPS, SYNC_POLICY,
} from './data/system';
import { mockState } from './state';
import { listDocs, uploadStore, versionsOf } from './data/uploads';
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
    // 그룹웨어 자동 가입 계정·미배정 부서 — 계정 관리 화면에서도 같은 계정이 보여야 합니다 (SY-17)
    gwStore();
  }
  return mockState.store.system;
}

/** 변경 이력 한 줄 추가 */
function logPerm(target, act, detail) {
  store().permLogs.unshift({ ts: nowStamp(), target, act, detail, by: `${mockState.currentUser.name} (${mockState.currentUser.dept})` });
}

/** 초기 비밀번호 변경 전인지 (ACC-03) — 그룹웨어 자동 가입 계정은 변경 전으로 봅니다 */
const mockPwdChangeRequired = (u) => !!(u.pwdChangeRequired ?? u.gwJoined);

const ok = (message, data = { success: true }) => ({ success: true, code: 'SUCCESS', message, data });
const fail = (code, message) => ({ success: false, code, message, data: null });

/** 부서의 메뉴 권한 배열 ('*' 는 전체) */
const menuAccessOf = (dept) => mockState.menuAccess[dept] ?? [];
const dataScopeOf = (dept) => mockState.dataScope[dept] ?? [];
const menuCount = (dept) => (menuAccessOf(dept) === '*' ? permRows().length : menuAccessOf(dept).length);
const dataCount = (dept) => (dataScopeOf(dept) === '*' ? DATA_FIELDS.length : dataScopeOf(dept).length);

/* ───────── SY-02 · SY-03 권한 화면 목 규칙 (2026-10-01 기획 03 MNP-01~03·15·16 · 04 DTP-01~03·16) ─────────
 * 실서버와 같은 거부 조건·메시지를 냅니다. 목만 쓰는 상수라 화면 코드에는 두지 않습니다(화면은 응답 값으로 판정).
 */
/** 미배정 부서 고정 화면 — 서버 MenuId.UNASSIGNED_SCREENS */
const MOCK_UNASSIGNED_SCREENS = ['dash-ai', 'dash-proc', 'prod-monitor', 'ai-chat', 'chat-history'];
/** 관리 화면 — 통합관리자만 부여·회수 (R-07). 2026-10-03 (2차) 전사 자연어 질의 이력 추가(관리자 전용) */
const MOCK_ADMIN_SCREENS = ['sys-account', 'sys-menu', 'sys-data', 'sys-gw-dept', 'sys-chat-history'];
/** 전사 공통 화면 — 새 부서 기본 부여 (MNP-17) */
const MOCK_COMMON_SCREENS = ['chat-history', 'gloss-view'];
/** 대그룹 이름 → ID (MNP-17) */
const MOCK_GROUP_IDS = {
  'AI 어시스턴트': 'assistant', 대시보드: 'dashboard', '생산 및 품질 관리': 'operation', 보고서: 'report',
  '자연어 질의 이력': 'history', '용어 사전': 'glossary', '이상 알림': 'alert', 시스템관리: 'system',
};
/** 가릴 수 없는 응답 필드명 — 서버 DataFieldService.RESERVED_ATTRS (DTP-01 초기 목록) */
const MOCK_RESERVED_ATTRS = [
  'empNo', 'name', 'dept', 'deptId', 'deptNm', 'pos', 'superAdmin', 'menuPerms', 'dataPerms', 'blindFields',
  'dataFields', 'attrs', 'impersonated', 'servingModelVer', 'userId',
  'id', 'key', 'group', 'groupId', 'label', 'screens', 'depts', 'matrix', 'fields', 'applyFlg', 'category', 'categoryNm',
  'sortSeq', 'desc', 'userCnt', 'menuCnt', 'dataCnt',
  'items', 'meta', 'masked', 'success', 'message', 'code', 'ts', 'title', 'target', 'detail', 'by', 'state', 'status',
];
// (키를 두 칸 들여 쓰면 check-mock 이 목 핸들러 키로 읽으므로 한 줄씩 대입합니다)
const PERM_MSG = {};
PERM_MSG.superAdmin = '통합관리자 부서는 전 권한으로 고정되어 조정할 수 없습니다.';
PERM_MSG.unassignedMenu = '미배정 부서는 대시보드·덕반장 AI·질의 이력 조회 전용으로 고정되어 조정할 수 없습니다.';
PERM_MSG.unassignedData = '미배정 부서의 데이터 권한은 고정되어 조정할 수 없습니다.';
PERM_MSG.adminScreens = '관리 화면 권한은 통합관리자만 부여·회수할 수 있습니다.';

const isSuperDept = (dept) => menuAccessOf(dept) === '*';
const isUnassignedDept = (dept) => dept === UNASSIGNED;
const requesterIsSuper = () => isSuperDept(mockState.currentUser?.dept);
const allScreenIds = () => permRows().map((r) => r.id);
const isActionScreen = (id) => !!EXTRA_PAGES.find((e) => e.id === id)?.action;

/** 부서의 조회 칸 (편집용 배열 — 없으면 만듭니다) */
function readListOf(dept) {
  if (!Array.isArray(mockState.menuAccess[dept])) mockState.menuAccess[dept] = [];
  return mockState.menuAccess[dept];
}
/** 화면에 보일 접근 집합 — 통합관리자는 전체, 미배정은 고정 5화면 (2026-10-03 조회/쓰기 통합 — 쓰기 칸 없음) */
function effectiveRead(dept) {
  if (isSuperDept(dept)) return allScreenIds();
  if (isUnassignedDept(dept)) return [...MOCK_UNASSIGNED_SCREENS];
  return [...readListOf(dept)];
}
/** 권한 행 해시 — 복사 미리보기의 expectedHash (서버 version 과 같은 뜻) */
function permHash(...depts) {
  const text = JSON.stringify(depts.map((d) => [d, effectiveRead(d).sort()]));
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
/** 단건 반영 — 칸 하나 = 접근 */
function applyMenuCell(dept, screenId, allowed) {
  const read = readListOf(dept);
  const i = read.indexOf(screenId);
  if (allowed && i < 0) read.push(screenId);
  if (!allowed && i >= 0) read.splice(i, 1);
  return { allowed: read.includes(screenId) };
}
/** 사람이 읽는 부서 행 (메뉴·데이터 매트릭스 공용) */
function permDeptRow(d) {
  const superAdmin = isSuperDept(d.id);
  const unassigned = isUnassignedDept(d.id);
  return {
    deptId: d.id, deptNm: d.id, desc: d.desc,
    superAdmin, unassigned, locked: superAdmin ? 'SUPER_ADMIN' : unassigned ? 'UNASSIGNED' : null,
    userCnt: store().users.filter((u) => u.dept === d.id).length,
  };
}
const screenNameOf = (id) => permRows().find((r) => r.id === id)?.name || id;
/** 관리 응답의 종류 한 건 — 서버처럼 attrs(문자열) 와 attrDetails[{attrName, remark}] 를 함께 줍니다 */
const fieldView = (f) => {
    const builtIn = DATA_FIELDS.some((b) => b.key === f.key);
    const attrDetails = f.attrs.map((a) => ({ attrName: a, remark: f.attrRemarks?.[a] || '' }));
    return { ...f, builtIn, attrDetails };
};
const rememberRemark = (f, attr, remark) => {
  if (!remark) return;
  f.attrRemarks = { ...(f.attrRemarks || {}), [attr]: String(remark).slice(0, 200) };
};

/* ───────── SY-14 다운로드 이력 목 — 예전 시드(user·reportName·표시명 형식)를 실제 응답 필드로 맞춥니다 (10 DLG-14) ───────── */
const DL_FORMAT_CODE = { '엑셀 (.xls)': 'XLS', '엑셀 (.xlsx)': 'XLSX', 'CSV (.csv)': 'CSV', '인쇄 · PDF': 'PDF' };
const DL_MENU_BY_REPORT = {
  '고객사별 LRR': 'rpt-lrr-customer', '연간 출하계획': 'rpt-ship-plan', '폐기 보고서': 'rpt-scrap', '제품별 수율': 'rpt-yield-model',
  '아침회의 자료 (PRESS)': 'rpt-press-morning', '아침회의 자료 (Plating·Coating)': 'rpt-plating-morning', '보안 감사 로그': 'sys-audit',
};
/** 다음 보존 배치 시각 — 매월 1일 03:00 (R-20) */
function nextMonthArchive() {
  const d = new Date();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01 03:00:00`;
}
function dlRows() {
  const list = store().downloadLogs;
  list.forEach((d, i) => {
    if (d.dlId) return;
    // 시드 날짜(2026-08)는 기본 조회 기간(최근 7일) 밖이라 데모 화면이 비었습니다 — 오늘 기준 최근 며칠로 옮깁니다
    const day = new Date(Date.now() - Math.floor(i / 2) * 86400000).toISOString().slice(0, 10);
    Object.assign(d, {
      ts: `${day}${String(d.ts).slice(10)}`,
      dlId: list.length - i,
      empNo: d.empNo || `1000${(i % 6)}`,
      name: d.name || d.user,
      deptId: d.deptId || d.dept,
      report: d.report || d.reportName,
      menuId: d.menuId || DL_MENU_BY_REPORT[d.reportName] || null,
      format: DL_FORMAT_CODE[d.format] || d.format,
      formatRaw: d.format,
      scopeCd: d.scopeCd ?? (i === 0 ? 'VIEW' : i === 8 ? 'ALL' : null),
      condSummary: d.condSummary ?? d.scope,
      rowCnt: d.rowCnt ?? d.rowCount ?? 0,
      blindCnt: d.blindCnt ?? d.blindCount ?? 0,
      origin: d.origin ?? (i === 8 ? 'SERVER' : null),
      result: 'DONE',
    });
  });
  return list;
}

/* ───────── SY-04·SY-05 알림 목 보조 — 예전 시드(표기값)를 서버 응답 모양(코드값)으로 맞춥니다 ───────── */
const SEV_CODE = { 위험: 'CRIT', 주의: 'WARN', 낮음: 'LOW' };
const CHANNEL_CODE = { 메일: 'MAIL', '시스템 팝업': 'POPUP', SMS: 'SMS', 메신저: 'MSG' };
const OP_CODE = { '>=': 'GE', '>': 'GT', '<=': 'LE', '<': 'LT', '=': 'EQ' };
const TARGET_LABEL = { ALL_EQPT: '전체 설비', PICK: '개별 설비 선택' };
const codeOf = (map, v) => map[v] ?? v;
const stateCode = (v) => (v === '수신' || v === 'RECV' ? 'RECV' : v === '부재' || v === 'ABSENT' ? 'ABSENT' : v || 'RECV');
const userStateCode = (v) => (v === '정지' || v === 'SUSPENDED' ? 'SUSPENDED' : v === '승인 대기' || v === 'PENDING' ? 'PENDING' : 'ACTIVE');
const USER_STATE_NM = { ACTIVE: '사용', SUSPENDED: '정지', PENDING: '승인 대기' };
const userOf = (empNo) => store().users.find((u) => u.empNo === empNo);
const workerOk = () => {
  const scope = mockState.dataScope[mockState.currentUser?.dept] ?? [];
  return scope === '*' || (Array.isArray(scope) && scope.includes('worker'));
};
function groupNamesOf(ids) {
  const groups = store().groups;
  return (ids || []).map((id) => groups.find((g) => g.groupId === id)?.name).filter(Boolean);
}
function normalizeCond(c) {
  const st = store();
  const groupIds = Array.isArray(c.groupIds)
    ? c.groupIds
    : (Array.isArray(c.groups) ? c.groups : [c.groups]).map((n) => st.groups.find((g) => g.name === n)?.groupId).filter(Boolean);
  const thresholdVal = c.thresholdVal ?? (Number.parseFloat(String(c.threshold ?? '').replace(/,/g, '')) || 0);
  const targetScope = c.targetScope || 'ALL_EQPT';
  return {
    condId: c.condId,
    on: c.on ?? c.enabled ?? true,
    name: c.name,
    metricId: c.metricId ?? c.metricStdId ?? 1,
    metric: c.metric ?? '',
    op: codeOf(OP_CODE, c.op),
    threshold: c.threshold !== undefined && c.thresholdVal === undefined ? String(thresholdVal) : String(c.threshold ?? thresholdVal),
    thresholdVal,
    thresholdUnit: c.thresholdUnit ?? null,
    duration: c.duration ?? 'IMMEDIATE',
    targetScope,
    target: c.targetScope ? (c.target || TARGET_LABEL[targetScope] || '') : (c.target || TARGET_LABEL[targetScope]),
    pickTargets: c.pickTargets || [],
    severity: codeOf(SEV_CODE, c.severity),
    channels: (Array.isArray(c.channels) ? c.channels : [c.channels]).filter(Boolean).map((x) => codeOf(CHANNEL_CODE, x)),
    groupIds,
    groups: groupNamesOf(groupIds),
    validWindow: c.validWindow ?? c.window ?? 'ALWAYS',
    dedupMin: c.dedupMin ?? c.dedup ?? 'M30',
    blindFieldKey: c.blindFieldKey ?? c.blindField ?? null,
    msgTemplate: c.msgTemplate ?? '[{{severity}}] {{condNm}} — {{scope}} {{metricNm}} {{value}}{{unit}} ({{op}} {{threshold}}{{unit}}) {{link}}',
    updatedAt: c.updatedAt ?? '2026-09-23 21:57:05',
  };
}
/** 발송 조건 목록 — 처음 한 번 서버 모양으로 바꿔 둡니다 */
function alertConds() {
  const st = store();
  if (!st.condNormalized) {
    normalizeGroups();
    st.conditions = st.conditions.map(normalizeCond);
    st.condNormalized = true;
  }
  return st.conditions;
}
/** 목록 행 — 데이터 권한이 걸린 임계값은 권한이 없으면 비웁니다 (서버 MaskingSupport 와 같게) */
function condListRow(c) {
  const scope = mockState.dataScope[mockState.currentUser?.dept] ?? [];
  const blocked = c.blindFieldKey && !(scope === '*' || (Array.isArray(scope) && scope.includes(c.blindFieldKey)));
  const st = store();
  // 서버와 같이 groups 는 객체 배열, 이름은 groupNames 로 따로 (2단계 계약)
  const groups = (c.groupIds || []).map((id) => st.groups.find((g) => g.groupId === id)).filter(Boolean).map((g) => {
    const receiving = g.members.filter((emp) => stateCode(st.recipients.find((x) => x.empNo === emp)?.state) === 'RECV').length;
    return { groupId: g.groupId, name: g.name, useFlg: g.useFlg || 'Y', memberCnt: g.members.length, receivingCnt: receiving };
  });
  const row = {
    ...c,
    groups,
    groupNames: groups.map((g) => g.name),
    receivingCnt: groups.filter((g) => g.useFlg !== 'N').reduce((n, g) => n + g.receivingCnt, 0),
    evalState: c.evalState || { breach: 0, pending: 0, normal: c.on ? 1 : 0, lastEvalAt: c.on ? nowStamp() : null },
    metricStale: !!c.metricStale,
    alert7dCnt: c.alert7dCnt ?? 0,
    deletable: c.deletable ?? true,
  };
  return blocked ? { ...row, threshold: null, thresholdVal: null } : row;
}
function normalizeGroups() {
  const st = store();
  if (st.groupNormalized) return;
  st.groups.forEach((g) => {
    g.channels = (Array.isArray(g.channels) ? g.channels : [g.channels]).filter(Boolean).map((x) => codeOf(CHANNEL_CODE, x));
    g.validWindow = g.validWindow ?? (g.window === '24시간 상시' ? 'ALWAYS' : g.window || 'ALWAYS');
    g.useFlg = g.useFlg || 'Y';
    g.deptId = g.deptId ?? null;
    g.updatedAt = g.updatedAt || '2026-09-16 21:17:35';
  });
  st.groupNormalized = true;
}
function groupRow(g) {
  normalizeGroups();
  const depts = store().depts;
  return {
    groupId: g.groupId, name: g.name, validWindow: g.validWindow, night: !!g.night, deptId: g.deptId ?? null,
    dept: g.deptId ? (depts.find((d, i) => (d.deptId ?? i + 1) === g.deptId)?.name ?? depts.find((d, i) => (d.deptId ?? i + 1) === g.deptId)?.id ?? '') : '',
    useFlg: g.useFlg, channels: g.channels, memberEmpNos: [...g.members], updatedAt: g.updatedAt,
  };
}
function recipientRow(r) {
  const st = store();
  normalizeGroups();
  const u = userOf(r.empNo) || { name: r.empNo, dept: '—', pos: '—' };
  const userState = userStateCode(u.state);
  const state = stateCode(r.state);
  return {
    recipientId: r.recipientId, empNo: r.empNo, name: u.name, dept: u.dept, pos: u.pos, posNm: u.pos,
    mail: r.mail, hp: r.phone ?? r.hp, messenger: r.messenger, night: !!r.night,
    state, stateNm: state === 'RECV' ? '수신' : '부재', userState, userStateNm: USER_STATE_NM[userState],
    remark: r.remark ?? null,
    groups: st.groups.filter((g) => g.members.includes(r.empNo)).map((g) => g.name),
  };
}
/** 수신자 영향 — 빠지면 받는 사람 0명이 되는 그룹·조건 */
function recipientImpact(empNo) {
  const st = store();
  const recv = (emp) => stateCode(st.recipients.find((x) => x.empNo === emp)?.state) === 'RECV' && ['ACTIVE', 'LOCKED'].includes(userStateCode(userOf(emp)?.state));
  const groups = st.groups.filter((g) => g.members.includes(empNo)).map((g) => ({
    groupId: g.groupId, name: g.name, receivableCntAfter: g.members.filter((e) => e !== empNo && recv(e)).length,
  }));
  const zeroGroups = groups.filter((g) => g.receivableCntAfter === 0).map((g) => ({ groupId: g.groupId, name: g.name }));
  const affectedConds = alertConds().filter((c) => c.on && c.groupIds.some((id) => zeroGroups.some((z) => z.groupId === id))).map((c) => ({ condId: c.condId, name: c.name }));
  return { empNo, groups, zeroGroups, affectedConds, affectedEscStages: [] };
}

/** 테스트 대상 — 그룹 멤버 중 수신 상태·계정 사용·연락처 있음 (엔진 규칙과 같게) */
function testTargets(groupIds, channels) {
  const st = store();
  normalizeGroups();
  const recipients = [];
  const skipped = [];
  const seen = new Set();
  (groupIds || []).forEach((gid) => {
    const g = st.groups.find((x) => x.groupId === gid);
    if (!g) return;
    g.members.forEach((emp) => {
      if (seen.has(emp)) return;
      seen.add(emp);
      const u = userOf(emp);
      const r = st.recipients.find((x) => x.empNo === emp);
      const base = { empNo: emp, name: u?.name || emp, dept: u?.dept || '' };
      if (!r) skipped.push({ ...base, reason: 'NOT_RECIPIENT', reasonNm: '수신자 미등록' });
      else if (stateCode(r.state) !== 'RECV') skipped.push({ ...base, reason: 'ABSENT', reasonNm: '부재' });
      else if (!['ACTIVE', 'LOCKED'].includes(userStateCode(u?.state))) skipped.push({ ...base, reason: 'ACCOUNT_INACTIVE', reasonNm: '계정 정지' });
      else if (!r.mail) skipped.push({ ...base, reason: 'NO_CONTACT', reasonNm: '연락처 없음' });
      else channels.forEach((ch) => recipients.push({ ...base, channel: ch, groupId: gid }));
    });
  });
  return { recipients, skipped };
}

/* ───────── SY-15 목 도우미 ───────── */

/** SYNC_STATE 코드 → 목 자료의 표시명 */
const SYNC_STATE_LABEL = { PENDING: '예약 대기', RUNNING: '진행 중', DONE: '완료', FAIL: '실패', RETRY_DONE: '재시도 완료', ABORTED: '중단' };

/** 'yyyy-MM-dd HH:mm(:ss)' 이후 지난 분 */
function minutesAgo(stamp) {
  const t = new Date(String(stamp).replace(' ', 'T')).getTime();
  return Number.isFinite(t) ? (Date.now() - t) / 60000 : 0;
}

/** 작업이 속한 엔진 실행 — 시작 시각이 실행 구간 안에 드는 것 (목 자료에는 runId 가 없어 계산합니다) */
function syncRunOf(job) {
  const at = String(job.startAt || '');
  if (!at) return null;
  const run = SYNC_RUNS.find((r) => !r.dryRun && String(r.startedAt) <= at && (!r.endedAt || at <= String(r.endedAt)));
  return run ? run.runId : null;
}

/** 미조치 실패 — 실패·중단이면서 같은 원본에 이후 정상 완료가 없고 진행 중 재실행도 없는 것(SYN-03) */
function syncOpenFail(all, m) {
  if (m.state !== '실패' && m.state !== '중단') return false;
  const laterOk = all.some((x) => x.srcTable === m.srcTable && (x.state === '완료' || x.state === '재시도 완료') && String(x.startAt) > String(m.startAt));
  const retrying = all.some((x) => x.retryOfJobId === m.jobId && (x.state === '예약 대기' || x.state === '진행 중'));
  return !laterOk && !retrying;
}

export const systemMock = {
  /* ───────── SY-16 업로드 문서 목록 (읽기 전용) — 대시보드 업로드 리포트와 같은 저장소 ───────── */
  /*
   * 서버 계약(UPD-01·06·07 · 기획 4.4)과 같은 모양 — { items, summary, uploaders } + meta.
   * 검색어: 문서명·메모·최신 파일명 부분 일치 + 문서 ID. 업로더: 사번 정확 일치 또는 이름(하위 호환).
   * 기간은 최신 버전 업로드일, from>to 는 400. size=0 은 전체(10,000건 상한).
   * summary·uploaders 는 조건과 무관한 전체 기준입니다.
   */
  getSystemUploads: ({ keyword, uploadedBy, parseState, from, to, includeDeleted, page = 1, size = 50 } = {}) => {
    if (from && to && from > to) {
      return fail('E-VALID-001', `조회 시작일이 종료일보다 늦습니다. [from=${from}, to=${to}]`);
    }
    if (parseState && !['OK', 'WARN', 'FAIL'].includes(parseState)) {
      return fail('E-VALID-001', `파싱 상태 값이 올바르지 않습니다. [${parseState}] 허용 값은 OK · WARN · FAIL 입니다.`);
    }
    const all = listDocs({});
    // 숨긴 문서 포함(R-19) — 요약 docCnt 는 늘 숨김 제외입니다
    const withHidden = includeDeleted === true || includeDeleted === 'true';
    const pool = withHidden ? listDocs({ includeDeleted: true }) : all;
    const kw = String(keyword || '').trim();
    // 파싱 상태를 뺀 조건 결과 — API 2단계 summary{total,ok,warn,fail} 가 이 집합으로 셉니다
    const condRows = pool
      .filter((d) => !kw || d.title.includes(kw) || d.memo.includes(kw) || String(d.fileName || '').includes(kw) || String(d.docId).includes(kw))
      .filter((d) => !uploadedBy || d.updatedBy === uploadedBy || d.createdBy === uploadedBy
        || String(d.updatedByName || '').includes(uploadedBy) || String(d.createdByName || '').includes(uploadedBy))
      .filter((d) => !from || d.updatedAt.slice(0, 10) >= from)
      .filter((d) => !to || d.updatedAt.slice(0, 10) <= to);
    const rows = condRows.filter((d) => !parseState || d.parseState === parseState);
    const p = Math.max(1, Number(page) || 1);
    const sz = Number(size);
    const LIMIT = 10000;
    // 행 fileState — 목에는 실제 파일이 없어 늘 OK 입니다(UPD-08)
    const items = (sz === 0 ? rows.slice(0, LIMIT) : rows.slice((p - 1) * (sz || 50), p * (sz || 50))).map((d) => ({ ...d, fileState: 'OK' }));
    const versions = all.flatMap((d) => versionsOf(d.docId).items);
    const month = nowStamp().slice(0, 7);
    const uploaders = {};
    all.forEach((d) => {
      versionsOf(d.docId).items.forEach((v) => {
        const u = (uploaders[v.uploadedBy] = uploaders[v.uploadedBy] || { empNo: v.uploadedBy, name: v.uploadedByName, cnt: 0, docs: new Set() });
        u.cnt += 1;
        u.docs.add(d.docId);
      });
    });
    return {
      success: true,
      code: 'SUCCESS',
      message: '업로드 문서 목록 조회가 완료되었습니다.',
      data: {
        items,
        // API 2단계 실제 필드(total·ok·warn·fail, 파싱 상태 조건 제외) + 기획 UPD-07 필드(전체 기준) — 화면은 둘 다 읽습니다
        summary: {
          total: condRows.length,
          ok: condRows.filter((d) => d.parseState === 'OK').length,
          warn: condRows.filter((d) => d.parseState === 'WARN').length,
          fail: condRows.filter((d) => d.parseState === 'FAIL').length,
          docCnt: all.length,
          deletedDocCnt: uploadStore().docs.filter((d) => d.deleted).length,
          versionCnt: versions.length,
          monthVersionCnt: versions.filter((v) => String(v.uploadedAt || '').startsWith(month)).length,
          totalBytes: versions.reduce((a, v) => a + (Number(v.sizeBytes) || 0), 0),
          failDocCnt: all.filter((d) => d.parseState === 'FAIL').length,
          lastUploadedAt: all.reduce((a, d) => (String(d.updatedAt || '') > a ? String(d.updatedAt) : a), '') || null,
          maxBytesPerFile: 20 * 1024 * 1024,
        },
        // 서버(3단계)와 같은 { userId, userName, docCnt } + 2단계 키 { empNo, name, cnt(올린 버전 수) }
        uploaders: Object.values(uploaders).map((u) => ({ userId: u.empNo, userName: u.name, docCnt: u.docs.size, empNo: u.empNo, name: u.name, cnt: u.cnt })),
      },
      meta: sz === 0
        ? { page: 1, size: 0, total: rows.length, totalPages: 1, truncated: rows.length > LIMIT }
        : { page: p, size: sz || 50, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / (sz || 50))) },
    };
  },
  /*
   * 숨기기·복원 (R-19 · D-13) — 소프트 삭제. 쓰기 권한은 목에서 판정하지 않습니다.
   * 사유는 실서버처럼 본문(axios data)으로만 가므로 목 핸들러에는 오지 않습니다 — 길이 검증은 화면 폼이 맡습니다.
   */
  deleteSystemUploadsByDocId: ({ docId, reason } = {}) => {
    const doc = uploadStore().docs.find((d) => String(d.docId) === String(docId));
    if (!doc) return fail('E-NOTFOUND', `업로드 문서를 찾을 수 없습니다. [docId=${docId}]`);
    if (doc.deleted) return fail('E-RULE-001', `이미 숨긴 문서입니다. [docId=${docId}]`);
    const why = String(reason ?? '').trim();
    if (!why) return fail('E-VALID-001', '숨기는 사유를 입력해 주세요.');
    if (why.length > 200) return fail('E-VALID-001', '사유는 200자 이내로 입력해 주세요.');
    Object.assign(doc, { deleted: true, deletedAt: nowStamp(), deletedByName: mockState.currentUser?.name || '', deleteReason: why });
    return ok('문서를 숨겼습니다.', { docId: doc.docId, deleted: true, deletedAt: doc.deletedAt });
  },
  postSystemUploadsByDocIdRestore: ({ docId } = {}) => {
    const doc = uploadStore().docs.find((d) => String(d.docId) === String(docId));
    if (!doc) return fail('E-NOTFOUND', `업로드 문서를 찾을 수 없습니다. [docId=${docId}]`);
    if (!doc.deleted) return fail('E-RULE-001', `숨기지 않은 문서입니다. [docId=${docId}]`);
    Object.assign(doc, { deleted: false, deletedAt: null, deletedByName: null, deleteReason: null });
    return ok('문서를 복원했습니다.', { docId: doc.docId, deleted: false });
  },
  // 버전 항목에 서버와 같은 memo · warnings(최대 20) · fileState · duplicateOf 를 붙입니다 (UPD-02·08·09·10)
  getSystemUploadsByDocIdVersions: ({ docId } = {}) => {
    const res = versionsOf(docId);
    const st = uploadStore();
    const asc = [...res.items].sort((a, b) => a.version - b.version);
    const items = res.items.map((v) => {
      const warnings = (st.data[`${docId}:${v.version}`]?.warnings || []).map((w) => (typeof w === 'string' ? w : w?.message || ''));
      const dup = asc.filter((x) => x.version < v.version && x.sha256 && x.sha256 === v.sha256).pop();
      return {
        ...v,
        memo: v.memo || null,
        warnings: warnings.slice(0, 20),
        warningTruncated: warnings.length > 20,
        fileState: 'OK',
        duplicateOf: dup ? dup.version : null,
      };
    });
    return { ...res, items };
  },

  /* ═══════════ SY-01 계정 관리 ═══════════ */
  getSystemAccountsSummary: () => {
    const st = store();
    const by = (ko) => st.users.filter((u) => u.state === ko).length;
    return {
      // 잠김(LOCKED)은 정지와 따로 셉니다 (2026-10-01 ACC-05)
      userCnt: { total: st.users.length, active: by('사용'), locked: by('잠김'), suspended: by('정지'), pending: 0 },
      deptCnt: st.depts.length,
      switchableCnt: st.users.filter((u) => u.switchable && u.state === '사용').length,
      pwdChangeRequiredCnt: st.users.filter(mockPwdChangeRequired).length,
      currentUser: { ...mockState.currentUser, superAdmin: mockState.currentUser?.dept === '통합관리자' },
      canChangePassword: true,
      // 목에는 조회/쓰기 구분이 없어 쓰기 가능으로 둡니다(R-06). 메일 서버는 없다고 봅니다(R-02)
      canWrite: true,
      // R-17(2026-10-02): SMTP 설정 완료 — 이메일 잠금 해제 사용. 목에는 발송 실패가 없습니다
      mailEnabled: true,
      mailLastFailAt: null,
    };
  },

  getSystemUsers: ({ keyword, deptId, state, page = 1, size = 100 }) => {
    let items = store().users.map((u) => ({
      ...u, menuPermCnt: menuCount(u.dept), dataPermCnt: dataCount(u.dept),
      // 초기 비밀번호 변경 전(ACC-03) — 그룹웨어 자동 가입 계정은 변경 전으로 둡니다
      pwdChangeRequired: mockPwdChangeRequired(u),
      extraMenuIds: u.extraMenuIds || [],
    }));
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

  /** 삭제 사전 확인 (ACC-11) — 목에는 서빙 프로필·문서 작성자가 없어 알림 수신자만 셉니다 */
  getSystemUsersByEmpNoDeleteCheck: ({ empNo }) => {
    const u = store().users.find((x) => x.empNo === empNo);
    if (!u) return fail('E-NOTFOUND', '대상 계정을 찾을 수 없습니다.');
    const recipients = (store().recipients || []).filter((r) => r.empNo === empNo).length;
    return { deletable: true, blocking: { servingProfiles: 0, docs: 0 }, cascade: { recipients, menuGrants: (u.extraMenuIds || []).length, usage: 0 }, joinSrc: u.gwJoined ? 'GROUPWARE' : 'ADMIN' };
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

  patchSystemUsersByEmpNoState: ({ empNo, state, reason, resetPassword }) => {
    const u = store().users.find((x) => x.empNo === empNo);
    if (!u) return fail('E-NOTFOUND', '대상 계정을 찾을 수 없습니다.');
    if (empNo === mockState.currentUser.empNo) return fail('E-RULE-001', '로그인 중인 계정은 정지할 수 없습니다.');
    // 잠김은 로그인 실패로만 생깁니다 (ACC-05)
    if (state === 'LOCKED' || state === '잠김') return fail('E-VALID-001', '잠김 상태는 로그인 실패로만 바뀝니다. 정지하려면 SUSPENDED 를 지정하십시오.');
    const next = { ACTIVE: '사용', SUSPENDED: '정지' }[state] || state || (u.state === '사용' ? '정지' : '사용');
    // 잠김 → 사용 = 관리자 잠금 해제: 실패 횟수 0, 첫 로그인 비밀번호 변경
    const unlocked = u.state === '잠김' && next === '사용';
    u.state = next;
    if (next === '사용') u.loginFailCnt = 0;
    if (unlocked) u.pwdChangeRequired = true;
    if (next === '정지' && reason) u.remark = [u.remark, `[${nowStamp().slice(0, 10)} 정지] ${reason}`].filter(Boolean).join('\n');
    logPerm(`${u.name} (${u.dept})`, '계정', unlocked ? `잠금 해제(관리자)${resetPassword ? ' · 비밀번호 초기화' : ''}` : `계정 ${u.state}${reason ? ` — ${reason}` : ''}`);
    if (unlocked) return ok(`${u.name} 계정의 잠금을 해제했습니다. 첫 로그인 때 비밀번호를 바꿔야 합니다.`, { state: 'ACTIVE', loginFailCnt: 0, pwdChangeRequired: true, unlocked: true });
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
      // 시스템 부서 (ACC-04) — 서버는 이름 설정·is_super_admin 으로 계산합니다
      superAdmin: d.id === '통합관리자',
      systemRole: d.id === '통합관리자' ? 'SUPER_ADMIN' : d.id === '미배정' ? 'UNASSIGNED' : null,
      ...(d.id === '미배정' ? { lockedPerms: true, fixedMenus: ['dash-ai', 'dash-proc', 'prod-monitor', 'ai-chat', 'chat-history'], fixedDataFields: [] } : {}),
      userCnt: store().users.filter((u) => u.dept === d.id).length,
      menuPermCnt: menuCount(d.id),
      dataPermCnt: dataCount(d.id),
    })),
  }),

  // 서버 요청 본문과 같은 키(deptNm · desc · initPermFrom)를 받습니다. 예전 키(name · copyFrom)도 받아 둡니다.
  // 약칭은 2026-10-02 에 없앴습니다(DB 컬럼 삭제) — 보내도 무시합니다.
  postSystemDepts: ({ deptNm, name: legacyName, desc, initPermFrom, copyFrom }) => {
    const st = store();
    const name = String(deptNm ?? legacyName ?? '').trim();
    if (!name) return fail('E-VALID-001', '부서명을 입력해 주세요.');
    if (st.depts.some((d) => d.id === name)) return fail('E-VALID-002', '이미 등록된 부서명입니다.');
    st.depts.push({ id: name, desc: desc || '—' });
    // 권한 복사 대상이 있으면 그대로 가져오고, 없으면 기본 화면 하나만 엽니다
    const from = initPermFrom ?? copyFrom;
    const src = from && from !== '빈 권한' ? from : null;
    mockState.menuAccess[name] = src && mockState.menuAccess[src] !== '*' ? [...mockState.menuAccess[src]] : ['dash-ai'];
    mockState.dataScope[name] = src && mockState.dataScope[src] !== '*' ? [...mockState.dataScope[src]] : [];
    logPerm(name, '부서', `부서 신규 등록${src ? ` · ${src} 권한 복사` : ' · 빈 권한'}`);
    return ok(`${name} 부서를 등록했습니다 — 권한을 지정하세요.`, { deptId: name });
  },

  putSystemDeptsByDeptId: ({ deptId, deptNm, name: legacyName, desc }) => {
    const name = deptNm ?? legacyName;
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

  // 대상 사번·구분 조건 (ACC-09). 목 이력은 날짜 형식이 섞여 있어 기간 조건은 흉내 내지 않습니다
  getSystemPermLogs: ({ page = 1, size = 20, target, targetUserId, actType }) => {
    let items = store().permLogs;
    if (target) items = items.filter((l) => String(l.target || '').includes(target));
    if (targetUserId) items = items.filter((l) => String(l.target || '').includes(targetUserId));
    if (actType) items = items.filter((l) => String(actType).split(',').includes(l.actType));
    return { items: Number(size) === 0 ? items : items.slice(0, size), meta: { page, size, total: items.length } };
  },

  /* ═══════════ SY-02 메뉴 접근 권한 ═══════════ */
  // 2026-10-03 — 부서마다 접근 한 칸(조회/쓰기 통합), 통합관리자·미배정 잠금, 관리 화면 5종 통합관리자 전용, 복사 2단계(기획 03 4.4)
  getSystemMenuPerms: () => {
    const depts = store().depts;
    const grantCounts = {};
    const grants = {};
    store().users.forEach((u) => (u.extraMenuIds || []).forEach((id) => {
      grantCounts[id] = (grantCounts[id] || 0) + 1;
      (grants[id] = grants[id] || []).push({ empNo: u.empNo, name: u.name, deptId: u.dept });
    }));
    // 명단(이름·사번)은 sys-menu 권한 요청에만 줍니다 (MNP-06)
    const showNames = requesterIsSuper() || (menuAccessOf(mockState.currentUser?.dept) || []).includes('sys-menu');
    return {
      screens: permRows().map((r) => {
        const extra = EXTRA_PAGES.find((e) => e.id === r.id);
        return {
          ...r,
          groupId: MOCK_GROUP_IDS[r.group] || null,
          kind: extra?.action ? 'ACTION' : r.sub ? 'SUB' : 'MENU',
          parentId: extra?.parent || null,
          admin: MOCK_ADMIN_SCREENS.includes(r.id),
          common: MOCK_COMMON_SCREENS.includes(r.id),
        };
      }),
      depts: depts.map(permDeptRow),
      matrix: Object.fromEntries(depts.map((d) => [d.id, effectiveRead(d.id)])),
      grantCounts,
      ...(showNames ? { grants } : {}),
      canEditAdminScreens: requesterIsSuper(),
      version: permHash(...depts.map((d) => d.id)),
      adminDepts: depts.filter((d) => isSuperDept(d.id)).map((d) => d.id),
    };
  },

  // perm 은 받아도 무시합니다(2026-10-03)
  putSystemMenuPerms: ({ deptId, screenId, allowed }) => {
    if (isSuperDept(deptId)) return fail('E-RULE-001', PERM_MSG.superAdmin);
    if (isUnassignedDept(deptId)) return fail('E-RULE-001', PERM_MSG.unassignedMenu);
    if (!allScreenIds().includes(screenId)) return fail('E-VALID-001', `존재하지 않거나 사용 중지된 화면 ID 입니다. [${screenId}]`);
    if (MOCK_ADMIN_SCREENS.includes(screenId) && !requesterIsSuper()) return fail('E-AUTH-002', PERM_MSG.adminScreens);
    // allowed 를 빼면 예전처럼 뒤집습니다(하위 호환)
    const next = allowed === undefined ? !readListOf(deptId).includes(screenId) : !!allowed;
    const before = readListOf(deptId).includes(screenId);
    const cell = applyMenuCell(deptId, screenId, next);
    const name = screenNameOf(screenId);
    logPerm(deptId, '메뉴 권한', `${name}(${screenId}) 화면 접근 ${next ? '허용' : '회수'}`);
    return ok(`${deptId} · ${name} 화면 접근을 ${next ? '허용' : '회수'}했습니다.`, { success: true, allowed: cell.allowed, changed: before !== cell.allowed });
  },

  putSystemMenuPermsGroup: ({ deptId, groupId, groupNm, group, allowed, includeActions = false }) => {
    const name = groupId ? Object.keys(MOCK_GROUP_IDS).find((k) => MOCK_GROUP_IDS[k] === groupId) : groupNm || group;
    if (!name) return fail('E-VALID-001', '그룹을 찾을 수 없습니다. [groupId]');
    if (isSuperDept(deptId)) return fail('E-RULE-001', PERM_MSG.superAdmin);
    if (isUnassignedDept(deptId)) return fail('E-RULE-001', PERM_MSG.unassignedMenu);
    const targets = permRows().filter((r) => r.group === name && (includeActions || !isActionScreen(r.id))).map((r) => r.id);
    // 관리 화면이 든 그룹은 일부만 바꾸지 않고 요청 전체를 거부합니다
    if (targets.some((id) => MOCK_ADMIN_SCREENS.includes(id)) && !requesterIsSuper()) return fail('E-AUTH-002', PERM_MSG.adminScreens);
    const added = [];
    const removed = [];
    targets.forEach((id) => {
      const before = readListOf(deptId).includes(id);
      if (before === !!allowed) return;
      applyMenuCell(deptId, id, !!allowed);
      (allowed ? added : removed).push(id);
    });
    logPerm(deptId, '메뉴 권한', `${name} 그룹 일괄 ${allowed ? '허용' : '회수'} [${(allowed ? added : removed).join(',')}]`);
    return ok('그룹 권한이 변경되었습니다.', { changedCnt: added.length + removed.length, added, removed });
  },

  postSystemMenuPermsCopy: ({ fromDeptId, toDeptId, dryRun, expectedHash }) => {
    if (!fromDeptId || !toDeptId) return fail('E-VALID-001', '원본 부서와 대상 부서를 고르세요.');
    if (fromDeptId === toDeptId) return fail('E-RULE-001', '원본 부서와 대상 부서가 같습니다.');
    if (isSuperDept(toDeptId)) return fail('E-RULE-001', '통합관리자 부서는 복사 대상이 될 수 없습니다.');
    if (isUnassignedDept(fromDeptId) || isUnassignedDept(toDeptId)) return fail('E-RULE-001', '미배정 부서는 고정 부서라 복사 대상·원본이 될 수 없습니다.');
    const srcRead = new Set(effectiveRead(fromDeptId));
    const dstRead = new Set(effectiveRead(toDeptId));
    const added = [];
    const removed = [];
    allScreenIds().forEach((id) => {
      if (srcRead.has(id) && !dstRead.has(id)) added.push({ id });
      else if (dstRead.has(id) && !srcRead.has(id)) removed.push({ id });
    });
    const adminScreensChanged = [...added, ...removed].map((x) => x.id).filter((id) => MOCK_ADMIN_SCREENS.includes(id));
    const hash = permHash(fromDeptId, toDeptId);
    if (dryRun) {
      return ok('미리보기입니다. 아직 바뀌지 않았습니다.', {
        dryRun: true,
        from: { deptId: fromDeptId, deptNm: fromDeptId },
        to: { deptId: toDeptId, deptNm: toDeptId, userCnt: store().users.filter((u) => u.dept === toDeptId).length },
        added, removed, adminScreensChanged,
        requiresSuperAdmin: adminScreensChanged.length > 0,
        expectedHash: hash,
      });
    }
    if (adminScreensChanged.length && !requesterIsSuper()) return fail('E-AUTH-002', PERM_MSG.adminScreens);
    if (!expectedHash) return fail('E-VALID-001', '미리보기 후 복사하세요.');
    if (expectedHash !== hash) return fail('E-RULE-001', '미리보기 이후 권한이 바뀌었습니다. 미리보기를 다시 실행하세요.');
    mockState.menuAccess[toDeptId] = [...srcRead];
    logPerm(toDeptId, '메뉴 권한', `${fromDeptId} 권한 복사 · 부여 [${added.map((x) => x.id).join(',')}] · 회수 [${removed.map((x) => x.id).join(',')}]`);
    return ok('권한이 복사되었습니다.', { copiedCnt: srcRead.size, added: added.map((x) => x.id), removed: removed.map((x) => x.id) });
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
  /** 관리 화면용 — 미적용 항목까지 보여 줍니다. 가릴 수 없는 필드명(reservedAttrs)도 함께 (DTP-01) */
  getSystemDataFields: () => ({
    fields: allDataFields().map(fieldView),
    reservedAttrs: MOCK_RESERVED_ATTRS,
  }),

  postSystemDataFields: ({ fieldKey, key, name, desc, category }) => {
    const k = fieldKey || key;
    if (!k || !name) return fail('E-VALID-001', '항목 key 와 이름은 필수입니다.');
    if (!/^[a-z][a-z0-9_-]{1,29}$/.test(k)) return fail('E-VALID-001', '항목 key 는 영문 소문자로 시작하는 2~30자여야 합니다.');
    if (allDataFields().some((f) => f.key === k)) return fail('E-RULE-001', `이미 등록된 항목 key 입니다. [${k}]`);
    // 등록만으로는 아무것도 가려지지 않습니다. 부서 허용을 정한 뒤 「적용」을 켜야 걸립니다
    allDataFields().push({ key: k, name, desc: desc || '', category: category || '', attrs: [], applyFlg: 'N' });
    logPerm(name, '항목 등록', `데이터 항목 ${k} 등록 (미적용)`);
    return ok('데이터 항목을 등록했습니다 — 부서 허용을 정한 뒤 「적용」을 켜세요.', { key: k });
  },

  putSystemDataFieldsByFieldKey: ({ fieldKey, name, desc, category }) => {
    const f = allDataFields().find((x) => x.key === fieldKey);
    if (!f) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    if (name !== undefined && (!String(name).trim() || String(name).length > 50)) return fail('E-VALID-001', '항목 이름은 1~50자로 입력해 주십시오.');
    if (desc && String(desc).length > 300) return fail('E-VALID-001', '설명은 300자 이내로 입력해 주십시오.');
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

  postSystemDataFieldsByFieldKeyAttrs: ({ fieldKey, attrName, remark }) => {
    const f = allDataFields().find((x) => x.key === fieldKey);
    if (!f) return fail('E-NOTFOUND', '항목을 찾을 수 없습니다.');
    const attr = String(attrName || '').trim();
    if (!attr) return fail('E-VALID-001', '응답 필드명을 입력하세요.');
    if (MOCK_RESERVED_ATTRS.includes(attr)) return fail('E-RULE-001', `시스템이 쓰는 필드명이라 가릴 수 없습니다. [${attr}]`);
    // 한 필드명이 두 항목에 붙으면 어느 쪽 권한으로 판정할지 정할 수 없습니다 (서버는 UNIQUE 로 막습니다)
    const owner = ownerOfAttr(attr, fieldKey);
    if (owner) return fail('E-DUP-001', `이미 「${owner.name}」 항목에 등록된 필드명입니다 — ${attr}`);
    if (!f.attrs.includes(attr)) f.attrs.push(attr);
    rememberRemark(f, attr, remark);
    logPerm(f.name, '필드명 등록', `${fieldKey} ← ${attr}`);
    return ok(`응답 필드명 ${attr} 을(를) 등록했습니다.`);
  },

  /**
   * 「화면 열 → 종류」 원자 저장 (DTP-02) — 먼저 전부 검사하고, 통과하면 한꺼번에 반영합니다.
   * 하나라도 걸리면 아무것도 바꾸지 않습니다(새 종류도 만들지 않음).
   */
  putSystemDataFieldsMapping: ({ newFields = [], moves = [], screenId }) => {
    const list = allDataFields();
    if (moves.length > 100) return fail('E-VALID-001', '한 번에 100개 열까지 저장할 수 있습니다.');
    const seen = new Set();
    for (const m of moves) {
      const a = String(m?.attrName || '').trim();
      if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,59}$/.test(a)) return fail('E-VALID-001', `응답 필드명은 영문자·'_'·'$' 로 시작하는 JSON 키 꼴 60자 이내여야 합니다. [${a}]`);
      if (seen.has(a)) return fail('E-VALID-001', `같은 필드명이 두 번 들어 있습니다. [${a}]`);
      seen.add(a);
      if (m.toFieldKey && MOCK_RESERVED_ATTRS.includes(a)) return fail('E-RULE-001', `시스템이 쓰는 필드명이라 가릴 수 없습니다. [${a}]`);
    }
    for (const f of newFields) {
      if (!f?.fieldKey || !String(f.name || '').trim()) return fail('E-VALID-001', '새 종류의 key 와 이름은 필수입니다.');
      if (!/^[a-z][a-z0-9_-]{1,29}$/.test(f.fieldKey)) return fail('E-VALID-001', `항목 key 는 영문 소문자로 시작하는 2~30자여야 합니다. [${f.fieldKey}]`);
      if (list.some((x) => x.key === f.fieldKey)) return fail('E-RULE-001', `이미 등록된 항목 key 입니다. [${f.fieldKey}]`);
    }
    const known = new Set([...list.map((x) => x.key), ...newFields.map((f) => f.fieldKey)]);
    for (const m of moves) {
      if (m.toFieldKey && !known.has(m.toFieldKey)) return fail('E-NOTFOUND', `데이터 항목을 찾을 수 없습니다. [${m.toFieldKey}]`);
    }
    // ── 여기부터 반영 ──
    const created = [];
    newFields.forEach((f) => {
      list.push({ key: f.fieldKey, name: String(f.name).trim(), desc: f.desc || '', category: f.category || '', attrs: [], applyFlg: 'N' });
      created.push(f.fieldKey);
      // 새 종류는 통합관리자·미배정을 뺀 전 부서 허용으로 시작합니다(미배정은 어떤 종류도 보지 못함, DTP-16)
      if (f.grantAllDepts !== false) {
        store().depts.forEach((d) => {
          if (dataScopeOf(d.id) === '*' || isUnassignedDept(d.id)) return;
          if (!Array.isArray(mockState.dataScope[d.id])) mockState.dataScope[d.id] = [];
          if (!mockState.dataScope[d.id].includes(f.fieldKey)) mockState.dataScope[d.id].push(f.fieldKey);
        });
      }
    });
    const moved = [];
    const released = [];
    moves.forEach((m) => {
      const a = String(m.attrName).trim();
      const owner = list.find((x) => x.attrs.includes(a));
      if (owner) owner.attrs = owner.attrs.filter((x) => x !== a);
      if (m.toFieldKey) {
        const target = list.find((x) => x.key === m.toFieldKey);
        target.attrs.push(a);
        rememberRemark(target, a, m.remark);
        moved.push({ attrName: a, from: owner?.key ?? null, to: m.toFieldKey });
      } else if (owner) released.push({ attrName: a, from: owner.key });
    });
    const applied = newFields.filter((f) => f.apply).map((f) => f.fieldKey);
    applied.forEach((k) => { list.find((x) => x.key === k).applyFlg = 'Y'; });
    const notApplied = [...new Set(moved.map((m) => m.to))].filter((k) => list.find((x) => x.key === k)?.applyFlg !== 'Y');
    logPerm(screenId || '-', '데이터 권한', `매핑 저장 [${screenId || '-'}] 새 종류 ${created.length} · 이동 ${moved.length} · 해제 ${released.length} · 적용 ${applied.length}`);
    return ok(`${moved.length + released.length}개 열을 저장했습니다.`, { created, moved, released, applied, notApplied });
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
    if (!on && DATA_FIELDS.some((b) => b.key === fieldKey)) return fail('E-RULE-001', '기본 항목은 서버 판정 코드가 직접 쓰므로 적용을 끌 수 없습니다. 부서 권한으로 조정하세요.');
    f.applyFlg = on ? 'Y' : 'N';
    logPerm(f.name, '항목 적용', `데이터 항목 ${fieldKey} ${on ? '적용' : '해제'}`);
    return ok(on ? '적용했습니다. 서버 응답에는 다음 조회부터 적용됩니다.' : '적용을 해제했습니다.', { applyFlg: f.applyFlg });
  },

  getSystemDataPerms: () => ({
    fields: allDataFields().map(fieldView),
    // 서버와 같은 모양으로 보냅니다 — 잠금(locked)·계정 수까지 (DTP-16)
    depts: store().depts.map(permDeptRow),
    // 미배정 부서는 데이터 권한 0건 고정이라 항상 빈 목록입니다
    matrix: Object.fromEntries(store().depts.map((d) => [d.id, isUnassignedDept(d.id) ? [] : dataScopeOf(d.id) === '*' ? allDataFields().map((f) => f.key) : dataScopeOf(d.id)])),
    adminDepts: store().depts.filter((d) => dataScopeOf(d.id) === '*').map((d) => d.id),
  }),

  putSystemDataPerms: ({ deptId, fieldKey, allowed }) => {
    if (dataScopeOf(deptId) === '*') return fail('E-RULE-001', PERM_MSG.superAdmin);
    if (isUnassignedDept(deptId)) return fail('E-RULE-001', PERM_MSG.unassignedData);
    if (!Array.isArray(mockState.dataScope[deptId])) mockState.dataScope[deptId] = [];
    const perms = mockState.dataScope[deptId];
    const i = perms.indexOf(fieldKey);
    if (allowed === undefined) {
      if (i >= 0) perms.splice(i, 1);
      else perms.push(fieldKey);
    } else if (allowed && i < 0) perms.push(fieldKey);
    else if (!allowed && i >= 0) perms.splice(i, 1);
    const nowAllowed = perms.indexOf(fieldKey) >= 0;
    const name = allDataFields().find((f) => f.key === fieldKey)?.name || fieldKey;
    logPerm(deptId, '데이터 권한', `${name} 접근 ${nowAllowed ? '허용' : '차단'}`);
    return ok(`${deptId} · ${name} 접근을 ${nowAllowed ? '허용' : '차단'}했습니다.`, { allowed: nowAllowed });
  },

  /** 계정 기준 미리보기 (DTP-10) — 그 계정 부서의 데이터 권한으로 종류마다 원본/비공개, 미적용 종류는 가리지 않음 */
  getSystemDataPermsPreview: ({ empNo } = {}) => {
    const u = empNo ? store().users.find((x) => x.empNo === String(empNo)) : mockState.currentUser;
    if (!u) return fail('E-NOTFOUND', `계정을 찾을 수 없습니다. [${empNo}]`);
    const scope = isUnassignedDept(u.dept) ? [] : dataScopeOf(u.dept);
    const items = allDataFields().map((f) => {
      const applied = f.applyFlg === 'Y';
      const masked = applied && !(scope === '*' || scope.includes(f.key));
      return { fieldKey: f.key, name: f.name, applied, rendered: masked ? '비공개' : '원본 노출', masked };
    });
    return { empNo: u.empNo, name: u.name, dept: u.dept, items };
  },

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
  // 응답 모양은 실 서버와 같습니다 — 코드값(CRIT·MAIL·GE), on, groupIds, targetScope (기획 05 ALC-15)
  // 감지 지표 선택지 — 지표 기준 목록 (발송 조건 폼)
  getAlertConditionMetrics: ({ page = 1, size = 200 } = {}) => {
    const items = [
      { stdId: 1, category: 'DEFECT', name: '공정 불량률', unit: 'PCT', unitNm: '%', normal: 2, warn: 3, critical: 5, direction: 'UP', applied: true, collecting: false },
      { stdId: 3, category: 'UPTIME', name: '설비 가동률', unit: 'PCT', unitNm: '%', normal: 85, warn: 75, critical: 65, direction: 'DOWN', applied: true, collecting: true, lastValueAt: nowStamp() },
      { stdId: 9, category: 'DEFECT', name: '공정 불량률(설비)', unit: 'PCT', unitNm: '%', normal: 2, warn: 5, critical: 10, direction: 'UP', applied: true, collecting: true, lastValueAt: nowStamp() },
    ];
    return { items, meta: { page, size, total: items.length } };
  },
  getAlertConditionsSummary: () => {
    const items = alertConds();
    return {
      totalCnt: items.length,
      activeCnt: items.filter((c) => c.on).length,
      todaySentCnt: 0,
      todaySuppressedCnt: 0,
      todaySkippedCnt: 0,
      todayFailCnt: 0,
      dedupCnt: 0,
      byChannel: {},
      avgDelaySec: 0,
      evalIssueCnt: { breach: items.filter((c) => c.on && c.evalState?.breach).length, stale: items.filter((c) => c.metricStale).length },
      engine: { lastRunAt: nowStamp(), lastState: 'OK', lagSec: 40, pendingQueueCnt: 0, deadQueueCnt: 0, judge: 'OK' },
    };
  },

  getAlertConditions: ({ severity, state, channel, groupId, keyword, page = 1, size = 50 }) => {
    let items = alertConds();
    if (severity && severity !== '전체') items = items.filter((c) => c.severity === severity);
    if (channel) items = items.filter((c) => (c.channels || []).includes(channel));
    if (groupId) items = items.filter((c) => (c.groupIds || []).map(String).includes(String(groupId)));
    if (state === 'ON') items = items.filter((c) => c.on);
    if (state === 'OFF') items = items.filter((c) => !c.on);
    if (keyword) items = items.filter((c) => c.name.includes(keyword) || String(c.metric).includes(keyword));
    const total = items.length;
    const n = Number(size);
    // size=0 은 전체 — 서버와 같이 1,000건에서 자릅니다 (엑셀 「전체」, ALC-17)
    const rows = n === 0 ? items.slice(0, 1000) : items.slice((page - 1) * n, page * n);
    return { items: rows.map(condListRow), meta: { page: n === 0 ? 1 : page, size: n, total, totalPages: n ? Math.ceil(total / n) : 1, ...(n === 0 && total > 1000 ? { truncated: true } : {}) } };
  },

  getAlertConditionsByCondId: ({ condId }) => {
    const c = alertConds().find((x) => String(x.condId) === String(condId));
    if (!c) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const groups = store().groups;
    return {
      ...condListRow(c),
      metricStdId: c.metricId,
      metricNm: c.metric,
      groups: c.groupIds.map((id) => groups.find((g) => g.groupId === id)).filter(Boolean).map((g) => ({ groupId: g.groupId, name: g.name, useFlg: 'Y', memberCnt: g.members.length, receivingCnt: g.members.length })),
      windowTime: null, scopeDim: 'NONE', evalIntervalSec: 60, ignoreWindow: false, autoClose: false,
      escalation: [1, 2, 3].map((stage) => ({ stage, on: false })),
    };
  },

  postAlertConditions: (body) => {
    const st = store();
    const list = alertConds();
    if (!body.name) return fail('E-VALID-001', '조건명은 필수입니다.');
    if (list.some((c) => c.name === body.name)) return fail('E-VALID-002', `이미 등록된 조건명입니다. [${body.name}]`);
    if (!(body.channels || []).length) return fail('E-VALID-001', '발송 채널을 1개 이상 선택해 주십시오.');
    if (!(body.groupIds || []).length) return fail('E-VALID-001', '수신 그룹을 1개 이상 선택해 주십시오.');
    if (body.targetScope === 'PICK' && !(body.pickTargets || []).length) return fail('E-VALID-001', '개별 설비 선택은 설비를 1대 이상 골라야 합니다.');
    st.condSeq = (st.condSeq || 100) + 1;
    const condId = st.condSeq;
    list.unshift(normalizeCond({ ...body, condId, on: true, updatedAt: nowStamp() }));
    logPerm(body.name, '알림 조건', '발송 조건 등록');
    return ok('발송 조건을 등록했습니다.', { condId });
  },

  putAlertConditionsByCondId: ({ condId, ...body }) => {
    const c = alertConds().find((x) => String(x.condId) === String(condId));
    if (!c) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    if (body.updatedAt && c.updatedAt && body.updatedAt !== c.updatedAt) return fail('E-RULE-001', '다른 사용자가 먼저 수정했습니다. 다시 열어 확인해 주십시오.');
    // 보낸 키만 바꿉니다(부분 변경) — 메시지 틀·평가 단위 등은 그대로
    const { updatedAt, ...patch } = body; // eslint-disable-line no-unused-vars
    if ('channels' in patch && !(patch.channels || []).length) return fail('E-VALID-001', '발송 채널을 1개 이상 선택해 주십시오.');
    if ('groupIds' in patch && !(patch.groupIds || []).length) return fail('E-VALID-001', '수신 그룹을 1개 이상 선택해 주십시오.');
    if ('target' in patch && !patch.target) patch.target = TARGET_LABEL[patch.targetScope || c.targetScope] || '';
    if ('thresholdVal' in patch) patch.threshold = String(patch.thresholdVal);
    Object.assign(c, patch, { updatedAt: nowStamp() });
    c.groups = groupNamesOf(c.groupIds);
    logPerm(c.name, '알림 조건', '발송 조건 수정');
    return ok('발송 조건을 수정했습니다.', { success: true, condId: c.condId, updatedAt: c.updatedAt });
  },

  // 바꿀 상태(on)가 반드시 있어야 합니다 — 없으면 400 (ALC-01)
  patchAlertConditionsByCondIdState: ({ condId, on, state }) => {
    const c = alertConds().find((x) => String(x.condId) === String(condId));
    if (!c) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const next = on !== undefined ? on === true || on === 'true' : state !== undefined ? String(state).toLowerCase() === 'on' : undefined;
    if (next === undefined) return { success: false, code: 'E-VALID-001', message: '바꿀 상태(on)를 보내 주십시오.', data: null, error: { code: 'E-VALID-001', field: 'on', message: '바꿀 상태(on)를 보내 주십시오.' } };
    if (c.on === next) return ok(`'${c.name}' 조건은 이미 ${next ? '활성' : '중지'} 상태입니다.`, { on: next, changed: false });
    c.on = next;
    c.updatedAt = nowStamp();
    logPerm(c.name, '알림 조건', `조건 ${next ? '활성화' : '중지'}`);
    return ok(`'${c.name}' 조건을 ${next ? '활성화' : '중지'}했습니다.`, { on: next, changed: true });
  },

  // 테스트 발송 — 대기열 경로 응답 모양 (ALC-03). 목은 대기열이 없어 건수만 셉니다
  postAlertConditionsByCondIdTestSend: ({ condId }) => {
    const c = alertConds().find((x) => String(x.condId) === String(condId));
    if (!c) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const channels = (c.channels || []).filter((ch) => ch === 'MAIL' || ch === 'POPUP');
    const { recipients, skipped } = testTargets(c.groupIds, channels.length ? channels : ['MAIL']);
    (c.channels || []).filter((ch) => !channels.includes(ch)).forEach((ch) => skipped.push({ empNo: null, name: null, reason: 'CHANNEL_MISMATCH', reasonNm: `그룹이 받지 않는 채널(${ch})` }));
    return ok(`테스트 알림 ${recipients.length}건을 발송 대기열에 넣었습니다.`, { alertId: 9000 + Number(String(condId).replace(/\D/g, '') || 0), queuedCnt: recipients.length, sentCnt: recipients.length, channels, recipients, skipped });
  },

  deleteAlertConditionsByCondId: ({ condId }) => {
    // 통합관리자만 (R-13)
    if (mockState.currentUser?.dept !== '통합관리자') return fail('E-AUTH-002', '발송 조건 삭제는 통합관리자만 할 수 있습니다.');
    const list = alertConds();
    const idx = list.findIndex((x) => String(x.condId) === String(condId));
    if (idx === -1) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const [c] = list.splice(idx, 1);
    logPerm(c.name, '알림 조건', '발송 조건 삭제');
    return ok(`'${c.name}' 발송 조건을 삭제했습니다.`);
  },
  /* ═══════════ SY-05 알림 수신자 관리 ═══════════ */
  getAlertRecipientsSummary: () => {
    const st = store();
    const rows = st.recipients.map(recipientRow);
    return {
      groupCnt: st.groups.filter((g) => g.useFlg !== 'N').length,
      recipientCnt: { receiving: rows.filter((r) => r.state === 'RECV').length, absent: rows.filter((r) => r.state !== 'RECV').length },
      nightCnt: rows.filter((r) => r.night).length,
      inactiveAccountCnt: rows.filter((r) => !['ACTIVE', 'LOCKED'].includes(r.userState)).length,
      nightWindow: { from: '22:00', to: '06:00' },
    };
  },

  getAlertRecipientGroups: ({ includeInactive } = {}) => {
    const blind = !workerOk();
    const items = store().groups
      .filter((g) => includeInactive === true || includeInactive === 'true' || g.useFlg !== 'N')
      .map((g) => {
        const members = g.members.map((emp) => {
          const u = userOf(emp);
          return { empNo: emp, name: blind ? null : u?.name || emp, dept: u?.dept || '', state: stateCode(store().recipients.find((x) => x.empNo === emp)?.state), userState: userStateCode(u?.state) };
        });
        const receivingCnt = members.filter((m) => m.state === 'RECV' && ['ACTIVE', 'LOCKED'].includes(m.userState)).length;
        const conds = alertConds().filter((c) => c.on && c.groupIds.includes(g.groupId)).map((c) => ({ condId: c.condId, name: c.name, on: c.on }));
        return { ...groupRow(g), memberCnt: members.length, receivingCnt, receivableCnt: receivingCnt, condCnt: conds.length, conds, escStages: [], members };
      });
    return { success: true, code: 'SUCCESS', message: '정상 처리되었습니다.', data: { items }, masked: blind ? ['worker'] : [] };
  },

  getAlertRecipientGroupsByGroupId: ({ groupId }) => {
    const st = store();
    const g = st.groups.find((x) => String(x.groupId) === String(groupId));
    if (!g) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const blind = !workerOk();
    const conds = alertConds().filter((c) => c.groupIds.includes(g.groupId)).map((c) => ({ condId: c.condId, name: c.name, on: c.on }));
    const data = {
      ...groupRow(g),
      members: g.members.map((emp) => {
        const u = userOf(emp);
        const r = st.recipients.find((x) => x.empNo === emp);
        return { empNo: emp, name: blind ? null : u?.name || emp, dept: u?.dept || '', state: stateCode(r?.state), userState: userStateCode(u?.state) };
      }),
      receivableCnt: g.members.filter((emp) => stateCode(st.recipients.find((x) => x.empNo === emp)?.state) === 'RECV').length,
      conds,
      escStages: [],
      deptOptions: st.depts.map((d, i) => ({ value: d.deptId ?? i + 1, label: d.name ?? d.id })),
    };
    return { success: true, code: 'SUCCESS', message: '정상 처리되었습니다.', data, masked: blind ? ['worker'] : [] };
  },

  postAlertRecipientGroups: ({ name, channels, validWindow, night, memberEmpNos, deptId }) => {
    const st = store();
    if (!name) return fail('E-VALID-001', '그룹명은 필수입니다.');
    if (st.groups.some((g) => g.name === name)) return fail('E-VALID-002', `이미 등록된 수신 그룹명입니다. [${name}]`);
    const groupId = `G${st.groups.length + 1}`;
    st.groups.push({ groupId, name, channels: Array.isArray(channels) && channels.length ? channels : ['MAIL'], validWindow: validWindow || 'ALWAYS', night: !!night, members: memberEmpNos || [], deptId: deptId ?? null, useFlg: 'Y', updatedAt: nowStamp() });
    return ok('수신 그룹을 등록했습니다.', { groupId });
  },

  // 보낸 키만 바꿉니다. memberEmpNos 는 보낸 그대로 교체([] 면 전원 제외), 채널은 보내지 않으면 유지 (RCP-02)
  putAlertRecipientGroupsByGroupId: ({ groupId, ...body }) => {
    const g = store().groups.find((x) => String(x.groupId) === String(groupId));
    if (!g) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    if (body.updatedAt && g.updatedAt && body.updatedAt !== g.updatedAt) return fail('E-RULE-001', '다른 사용자가 먼저 수정했습니다. 다시 열어 확인해 주십시오.');
    const { updatedAt, memberEmpNos, ...patch } = body; // eslint-disable-line no-unused-vars
    Object.assign(g, patch);
    if (memberEmpNos !== undefined) g.members = [...memberEmpNos];
    g.updatedAt = nowStamp();
    return ok('수신 그룹을 수정했습니다.');
  },

  postAlertRecipientGroupsByGroupIdTestSend: ({ groupId }) => {
    const g = store().groups.find((x) => String(x.groupId) === String(groupId));
    if (!g) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const { recipients, skipped } = testTargets([g.groupId], groupRow(g).channels);
    return ok(`테스트 알림 ${recipients.length}건을 발송 대기열에 넣었습니다.`, { alertId: 9500, queuedCnt: recipients.length, sentCnt: recipients.length, recipients, skipped });
  },

  getAlertRecipients: ({ groupId, state, userState, keyword, page = 1, size = 50 }) => {
    const st = store();
    let items = st.recipients.map(recipientRow);
    if (groupId && groupId !== '전체') {
      const g = st.groups.find((x) => String(x.groupId) === String(groupId));
      items = items.filter((r) => (g ? g.members.includes(r.empNo) : r.groups.includes(groupId)));
    }
    if (state && state !== '전체') items = items.filter((r) => r.state === state || r.stateNm === state);
    if (userState) items = items.filter((r) => r.userState === userState);
    if (keyword) items = items.filter((r) => [r.name, r.empNo, r.dept].some((v) => String(v || '').includes(keyword)));
    const total = items.length;
    const n = Number(size);
    // size=0 은 전체 — 서버와 같이 5,000건에서 자릅니다 (엑셀 「전체」, RCP-16)
    const rows = n === 0 ? items.slice(0, 5000) : items.slice((page - 1) * n, page * n);
    const blind = !workerOk();
    const out = blind ? rows.map((r) => ({ ...r, name: null, mail: null, hp: null, messenger: null })) : rows;
    return { success: true, code: 'SUCCESS', message: '조회가 완료되었습니다.', data: { items: out }, meta: { page: n === 0 ? 1 : page, size: n, total, totalPages: n ? Math.ceil(total / n) : 1 }, masked: blind ? ['worker'] : [] };
  },

  // 수신자 등록 후보 — 아직 수신자가 아닌 사용 중 계정. 미배정 부서 소속은 뺍니다 (RCP-06, R-14)
  getAlertRecipientsCandidates: ({ keyword, size = 20 }) => {
    const st = store();
    const taken = new Set(st.recipients.map((r) => r.empNo));
    const q = String(keyword || '').trim();
    const blind = !workerOk();
    const items = st.users
      .filter((u) => u.state === '사용' && !taken.has(u.empNo) && u.dept !== '미배정')
      .filter((u) => !q || [u.empNo, u.name, u.dept].some((v) => String(v || '').includes(q)))
      .slice(0, Number(size) || 20)
      .map((u) => ({ empNo: u.empNo, name: u.name, dept: u.dept, posNm: u.pos, email: blind ? null : `${u.empNo}@dukwoo.co.kr` }));
    return { items, meta: { page: 1, size: Number(size) || 20, total: items.length } };
  },

  postAlertRecipients: ({ empNo, mail, hp, phone, messenger, night }) => {
    const st = store();
    if (st.recipients.some((r) => r.empNo === empNo)) return fail('E-VALID-002', '이미 등록된 수신자입니다.');
    if (userOf(empNo)?.dept === '미배정') return fail('E-RULE-001', '부서 배정 전 계정은 알림 수신자로 등록할 수 없습니다.');
    st.recipients.push({ recipientId: empNo, empNo, mail, phone: hp ?? phone, messenger, night: !!night, state: 'RECV' });
    return ok('수신자를 등록했습니다.', { recipientId: empNo });
  },

  putAlertRecipientsByRecipientId: ({ recipientId, hp, ...body }) => {
    const r = store().recipients.find((x) => String(x.recipientId) === String(recipientId));
    if (!r) return fail('E-NOTFOUND', '대상 수신자를 찾을 수 없습니다.');
    Object.assign(r, body, hp !== undefined ? { phone: hp } : {});
    return ok('수신자 정보를 수정했습니다.');
  },

  patchAlertRecipientsByRecipientIdState: ({ recipientId, state, reason }) => {
    const r = store().recipients.find((x) => String(x.recipientId) === String(recipientId));
    if (!r) return fail('E-NOTFOUND', '대상 수신자를 찾을 수 없습니다.');
    if (!state) return fail('E-VALID-001', '바꿀 수신 상태(RECV·ABSENT)를 보내 주십시오.');
    r.state = stateCode(state);
    if (reason !== undefined) r.remark = reason;
    return ok(`수신 상태를 '${r.state === 'RECV' ? '수신' : '부재'}' 로 바꿨습니다.`, { state: r.state });
  },

  // 영향 — 이 사람이 빠지면 받는 사람이 0명이 되는 그룹과 그 그룹을 쓰는 활성 조건 (RCP-07·08)
  getAlertRecipientsByRecipientIdImpact: ({ recipientId }) => {
    const st = store();
    const r = st.recipients.find((x) => String(x.recipientId) === String(recipientId));
    if (!r) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    return recipientImpact(r.empNo);
  },

  deleteAlertRecipientsByRecipientId: ({ recipientId, force }) => {
    const st = store();
    const idx = st.recipients.findIndex((x) => String(x.recipientId) === String(recipientId));
    if (idx === -1) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    const emp = st.recipients[idx].empNo;
    const impact = recipientImpact(emp);
    if (impact.zeroGroups.length && !(force === true || force === 'true')) {
      return { success: false, code: 'E-RULE-001', message: '이 수신자를 지우면 받는 사람이 없어지는 수신 그룹이 있습니다. 확인 후 다시 요청해 주십시오.', data: { zeroGroups: impact.zeroGroups, affectedConds: impact.affectedConds } };
    }
    st.recipients.splice(idx, 1);
    st.groups.forEach((g) => { g.members = g.members.filter((e) => e !== emp); });
    return ok('수신자를 삭제했습니다.');
  },

  // 사용 중지 — 활성 조건이 쓰면 409 (RCP-08)
  patchAlertRecipientGroupsByGroupIdState: ({ groupId, on }) => {
    const g = store().groups.find((x) => String(x.groupId) === String(groupId));
    if (!g) return fail('E-NOTFOUND', '요청하신 대상을 찾을 수 없습니다.');
    if (on === undefined) return fail('E-VALID-001', '바꿀 상태(on)를 보내 주십시오.');
    const next = on === true || on === 'true';
    const using = alertConds().filter((c) => c.on && c.groupIds.includes(g.groupId));
    if (!next && using.length) return fail('E-RULE-001', `발송 조건 ${using.length}건·승격 규칙 0단계가 이 그룹을 씁니다. 먼저 연결을 바꿔 주십시오.`);
    const changed = (g.useFlg !== 'N') !== next;
    g.useFlg = next ? 'Y' : 'N';
    return ok(`'${g.name}' 그룹을 ${next ? '사용' : '사용 중지'}로 바꿨습니다.`, { useFlg: g.useFlg, changed });
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

  /**
   * 요약 — 서버 필드명(myVariantCnt · noVariantTermCnt, 07 GLS-15)으로 줍니다. 옛 이름(mineCnt · emptyCnt)도 함께 둡니다.
   * canWriteVariant 는 sys-gloss 를 연 부서 전부(07 GLS-16 권장안 — 「유사어는 누구나」 정책 유지),
   * riskVariantCnt 는 통합관리자에게만 값이 있습니다(GLS-03).
   */
  getGlossarySummary: () => {
    const st = store();
    const me = mockState.currentUser.empNo;
    const admin = mockState.currentUser.dept === '통합관리자';
    const mine = st.glossary.reduce((n, g) => n + g.variants.filter((v) => v.by === me).length, 0);
    const empty = st.glossary.filter((g) => !g.variants.length).length;
    // 분류별 용어 수 · 유사어 수 · 유사어 없는 용어 수 (07 GLS-13)
    const byDomain = Object.entries(st.glossary.reduce((acc, g) => {
      const d = acc[g.domain] || { termCnt: 0, variantCnt: 0, noVariantTermCnt: 0 };
      return { ...acc, [g.domain]: { termCnt: d.termCnt + 1, variantCnt: d.variantCnt + g.variants.length, noVariantTermCnt: d.noVariantTermCnt + (g.variants.length ? 0 : 1) } };
    }, {}))
      .map(([domain, c], i) => ({ domainId: i + 1, domain, ...c }))
      .sort((a, b) => b.termCnt - a.termCnt);
    const lastChangedAt = st.glossary.flatMap((g) => g.variants.map((v) => v.at)).filter(Boolean).sort().at(-1) || null;
    return {
      termCnt: st.glossary.length,
      variantCnt: st.glossary.reduce((n, g) => n + g.variants.length, 0),
      myVariantCnt: mine,
      noVariantTermCnt: empty,
      mineCnt: mine,
      emptyCnt: empty,
      domainCnt: new Set(st.glossary.map((g) => g.domain)).size,
      byDomain,
      lastChangedAt,
      canEditTerm: admin,
      canWriteVariant: true,
      riskVariantCnt: admin ? glossaryRisks(st).length : null,
    };
  },

  getGlossaryTerms: ({ keyword, domain, domainCd, mineOnly, page = 1, size = 200 }) => {
    const st = store();
    const me = mockState.currentUser.empNo;
    const admin = mockState.currentUser.dept === '통합관리자';
    let items = st.glossary.map((g) => ({
      ...g,
      variants: g.variants.map((v) => {
        const u = st.users.find((x) => x.empNo === v.by);
        // editable = 쓰기 권한 && 본인 등록 (통합관리자는 모두) — 07 GLS-16
        return { ...v, byEmpNo: v.by, byName: u ? u.name : '(삭제된 계정)', byDept: u ? u.dept : '—', mine: v.by === me, editable: v.by === me || admin };
      }),
    }));
    // 고객사 분류 가림(결정 R-18) — customer 데이터 권한이 없으면 「비공개 용어」 로 남깁니다
    items = items.map((g) => (glsBlinded(g) ? { ...g, term: '비공개 용어', definition: null, variants: null, blinded: true } : g));
    const dom = domainCd || domain;
    if (dom && dom !== '전체') items = items.filter((g) => g.domain === dom);
    if (mineOnly === true || mineOnly === 'true') items = items.filter((g) => (g.variants || []).some((v) => v.mine));
    if (keyword) {
      const q = String(keyword).toLowerCase();
      items = items.filter((g) => g.term.toLowerCase().includes(q) || String(g.definition || '').toLowerCase().includes(q) || (g.variants || []).some((v) => v.word.toLowerCase().includes(q)));
    }
    const total = items.length;
    const n = Number(size);
    const p = Number(page) || 1;
    const shown = n ? items.slice((p - 1) * n, p * n) : items;
    return { success: true, code: 'SUCCESS', message: '용어 목록 조회가 완료되었습니다.', data: { items: shown }, meta: { page: p, size: n, total, totalPages: n ? Math.ceil(total / n) : 1 } };
  },

  /** 용어 상세 (GL-01) — 관련 용어는 같은 분류에서 이름이 서로 포함되는 것만 흉내 냅니다 */
  getGlossaryTermsByTermId: ({ termId }) => {
    const st = store();
    const g = st.glossary.find((x) => String(x.termId) === String(termId));
    if (!g) return fail('E-NOTFOUND', `용어를 찾을 수 없습니다. [termId=${termId}]`);
    if (glsBlinded(g)) return { termId: g.termId, term: '비공개 용어', definition: null, domain: g.domain, blinded: true, variants: null, relatedTerms: [] };
    const related = st.glossary
      .filter((x) => x.termId !== g.termId && x.domain === g.domain && x.term.length > 2 && g.term.length > 2
        && (x.term.includes(g.term) || g.term.includes(x.term)))
      .slice(0, 10)
      .map((x) => ({ termId: x.termId, term: x.term, domain: x.domain, reasonCd: 'SAME_DOMAIN_NAME' }));
    return {
      ...g,
      blinded: false,
      variants: g.variants.map((v) => {
        const u = st.users.find((x) => x.empNo === v.by);
        return { variantId: v.variantId, word: v.word, byName: u ? u.name : '(삭제된 계정)', at: v.at };
      }),
      relatedTerms: related,
    };
  },

  // 공식 용어 쓰기는 통합관리자 전용 — 그 밖은 403 E-AUTH-004 (07 GLS-01). 분류 키는 서버와 같은 domainCd
  postGlossaryTerms: ({ term, definition, domainCd, domain }) => {
    const st = store();
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-004', '공식 용어는 통합관리자만 편집할 수 있습니다. [sys-gloss]');
    if (!term) return fail('E-VALID-001', '용어는 필수입니다.');
    if (String(term).length > 50) return fail('E-VALID-001', '공식 용어는 50자 이하로 입력해 주세요.');
    if (st.glossary.some((g) => g.term.toLowerCase() === String(term).toLowerCase())) return fail('E-RULE-001', '이미 등록된 용어입니다.');
    const termId = `T${Date.now().toString(36)}`;
    st.glossary.push({ termId, term, definition, domain: domainCd || domain, variants: [] });
    glsLog(st, 'TERM', 'CREATE', { termId, term }, null, { term, termDef: definition, domainNm: domainCd || domain });
    return ok('공식 용어를 등록했습니다.', { termId });
  },

  putGlossaryTermsByTermId: ({ termId, term, definition, domainCd, domain }) => {
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-004', '공식 용어는 통합관리자만 편집할 수 있습니다. [sys-gloss]');
    const g = store().glossary.find((x) => x.termId === termId);
    if (!g) return fail('E-NOTFOUND', '대상 용어를 찾을 수 없습니다.');
    const before = { term: g.term, termDef: g.definition, domainNm: g.domain };
    if (term) g.term = term;
    if (definition) g.definition = definition;
    if (domainCd || domain) g.domain = domainCd || domain;
    glsLog(store(), 'TERM', 'UPDATE', g, before, { term: g.term, termDef: g.definition, domainNm: g.domain });
    return ok('공식 용어를 수정했습니다.');
  },

  deleteGlossaryTermsByTermId: ({ termId }) => {
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-004', '공식 용어는 통합관리자만 편집할 수 있습니다. [sys-gloss]');
    const st = store();
    const idx = st.glossary.findIndex((x) => x.termId === termId);
    if (idx === -1) return fail('E-NOTFOUND', '대상 용어를 찾을 수 없습니다.');
    const [removed] = st.glossary.splice(idx, 1);
    glsLog(st, 'TERM', 'DELETE', removed, { term: removed.term, termDef: removed.definition }, null);
    return ok(`'${removed.term}' 용어를 삭제했습니다.`);
  },

  // 유사어 등록 규칙(07 GLS-03): 2자 이상 · 숫자/날짜형 거부 · 공식 용어와 같은 낱말 거부, 부분 문자열은 경고
  postGlossaryTermsByTermIdVariants: ({ termId, word }) => {
    const st = store();
    const g = st.glossary.find((x) => x.termId === termId);
    if (!g) return fail('E-NOTFOUND', '대상 용어를 찾을 수 없습니다.');
    const bad = variantRuleError(st, word);
    if (bad) return fail('E-VALID-001', bad);
    const dup = st.glossary.find((t) => t.variants.some((v) => v.word.toLowerCase() === String(word).trim().toLowerCase()));
    if (dup) return fail('E-VALID-002', `이미 '${dup.term}' 에 등록된 유사어입니다.`);
    const variantId = `V${Date.now().toString(36)}`;
    const w = String(word).trim();
    g.variants.push({ variantId, word: w, by: mockState.currentUser.empNo, at: nowStamp().slice(0, 10) });
    glsLog(st, 'VARIANT', 'CREATE', g, null, { word: w }, variantId);
    return ok(`'${w}' 유사어를 등록했습니다.`, { variantId, word: w, warnings: variantWarnings(st, w) });
  },

  putGlossaryVariantsByVariantId: ({ variantId, word }) => {
    const st = store();
    let found = null;
    st.glossary.forEach((g) => {
      const v = g.variants.find((x) => x.variantId === variantId);
      if (v) found = v;
    });
    if (!found) return fail('E-NOTFOUND', '대상 유사어를 찾을 수 없습니다.');
    // 유사어는 등록한 본인(통합관리자는 모두)만 수정·삭제할 수 있습니다 — 수정 본문은 word 하나입니다
    if (found.by !== mockState.currentUser.empNo && mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-004', '본인이 등록한 유사어만 수정할 수 있습니다.');
    const bad = variantRuleError(st, word);
    if (bad) return fail('E-VALID-001', bad);
    const beforeWord = found.word;
    found.word = String(word).trim();
    const ownerTerm = st.glossary.find((g) => g.variants.includes(found));
    glsLog(st, 'VARIANT', 'UPDATE', ownerTerm || {}, { word: beforeWord }, { word: found.word }, variantId);
    return ok('유사어를 수정했습니다.', { warnings: variantWarnings(st, found.word) });
  },

  deleteGlossaryVariantsByVariantId: ({ variantId }) => {
    const st = store();
    let allowed = false;
    const admin = mockState.currentUser.dept === '통합관리자';
    st.glossary.forEach((g) => {
      const v = g.variants.find((x) => x.variantId === variantId);
      if (v && (v.by === mockState.currentUser.empNo || admin)) {
        allowed = true;
        glsLog(st, 'VARIANT', 'DELETE', g, { word: v.word }, null, variantId);
        g.variants = g.variants.filter((x) => x.variantId !== variantId);
      }
    });
    if (!allowed) return fail('E-AUTH-004', '본인이 등록한 유사어만 삭제할 수 있습니다.');
    return ok('유사어를 삭제했습니다.');
  },

  /** 사전 변경 이력 (07 GLS-07) — 이 세션에서 바꾼 것만 남습니다 */
  getGlossaryChanges: ({ termId, page = 1, size = 20 }) => {
    let items = store().glsChanges || [];
    if (termId) items = items.filter((c) => String(c.termId) === String(termId));
    const n = Number(size) || 20;
    const p = Number(page) || 1;
    return { success: true, code: 'SUCCESS', message: '변경 이력 조회가 완료되었습니다.', data: { items: items.slice((p - 1) * n, p * n) }, meta: { page: p, size: n, total: items.length, totalPages: Math.ceil(items.length / n) } };
  },

  /** 점검 필요 유사어 (07 GLS-03) — 통합관리자 전용 */
  getGlossaryVariantsRisks: () => {
    if (mockState.currentUser.dept !== '통합관리자') return fail('E-AUTH-002', '통합관리자만 볼 수 있습니다.');
    return { items: glossaryRisks(store()) };
  },

  /**
   * 현장 표현을 공식 용어로 바꿔 보여 줍니다 (07 GLS-02 흉내)
   * 날짜 표현과 점검 대상 유사어(한 글자·숫자·날짜형·공식 용어와 같은 낱말)는 바꾸지 않고 skipped[] 에 담습니다.
   */
  postGlossaryNormalize: ({ text }) => {
    const st = store();
    const replacements = [];
    const skipped = [];
    const risky = new Map(glossaryRisks(st).filter((r) => r.riskCd !== 'SUBSTRING_OF_TERM').map((r) => [r.word.toLowerCase(), r]));
    let result = String(text || '');
    if (result.length > 2000) return fail('E-VALID-001', '미리보기 문장은 2,000자 이하로 입력해 주세요.');
    st.glossary.forEach((g) => {
      g.variants.forEach((v) => {
        if (!v.word) return;
        const idx = result.toLowerCase().indexOf(v.word.toLowerCase());
        if (idx < 0) return;
        const risk = risky.get(v.word.toLowerCase());
        if (risk) {
          skipped.push({ word: v.word, termId: g.termId, reasonCd: risk.riskCd, reason: risk.riskNm });
          return;
        }
        replacements.push({ from: v.word, to: g.term, termId: g.termId, variantId: v.variantId, start: idx, end: idx + v.word.length });
        result = result.replace(new RegExp(v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), g.term);
      });
    });
    return ok(replacements.length ? `${replacements.length}건을 공식 용어로 바꿨습니다.` : '바꿀 유사어를 찾지 못했습니다.', { original: text, normalizedText: result, normalized: result, replacements, skipped });
  },

  // 제거됨(2026-10, 처리기 없음 — 07 GLS-05): 화면 버튼은 없지만 API 는 남아 있어 목도 둡니다
  postGlossaryReindex: () => ok('처리기가 없어 대기 상태로 남습니다.', { jobId: `GLS-${Date.now()}`, targetCnt: store().glossary.length, stateCd: 'PENDING' }),

  // 서버 생성 파일 — 화면은 downloadFromServer 로 받고, 목 모드에서는 안내 파일을 만듭니다(exportUtil)
  postGlossaryTermsExport: () => ok('용어 사전 파일을 만들었습니다.', { rowCnt: store().glossary.length }),

  /* ═══════════ SY-08 자연어 질의 이력 ═══════════ */
  // 2026-10-03 — scope=mine(기본, chat-history: 본인 행만) · scope=all(sys-chat-history: 전 사용자, 이름 가림 없음)
  // canManage = sys-chat-history 쓰기(접근 && 미배정 아님) — scope=all 일 때만 true 가 될 수 있습니다
  getAiChatHistorySummary: ({ scope } = {}) => {
    const denied = chatScopeDenied(scope);
    if (denied) return denied;
    const rows = chatRows(scope);
    return {
      ...CHAT_HISTORY_SUMMARY,
      questionCnt: rows.length,
      sessionCnt: chatSessions(rows).length,
      answerRate: CHAT_HISTORY_SUMMARY.answerRate ?? 98.4,
      avgResponseSec: CHAT_HISTORY_SUMMARY.avgElapsedSec,
      requeryRate: CHAT_HISTORY_SUMMARY.reAskRate,
      usefulCnt: rows.filter((r) => r.rating === 'USEFUL').length,
      badCnt: rows.filter((r) => r.rating === 'BAD').length,
      reviewedCnt: rows.filter((r) => r.review).length,
      // 보존 3년(1,095일) · 기간 지난 건수 — 결정 R-20
      retentionDays: 1095,
      expiredCnt: 0,
      targetAnswerRate: null,
      canManage: chatScopeAll(scope) && chatCanManage(),
    };
  },

  getAiChatHistory: ({ scope, group, userGroup, empNo, keyword, rating, review, answered, page = 1, size = 50 }) => {
    const denied = chatScopeDenied(scope);
    if (denied) return denied;
    let items = chatFilter(chatRows(scope), { rating, review, answered });
    const g = userGroup || group;
    if (chatScopeAll(scope) && g && g !== '전체') items = items.filter((h) => (h.dept || '').includes(g));
    if (chatScopeAll(scope) && empNo) items = items.filter((h) => String(h.empNo || '') === String(empNo));
    if (keyword) items = items.filter((h) => String(h.question || '').toLowerCase().includes(String(keyword).toLowerCase()));
    const total = items.length;
    const n = Number(size) || 50;
    const p = Number(page) || 1;
    return {
      success: true, code: 'SUCCESS', message: '질의 이력 조회가 완료되었습니다.',
      data: { items: items.slice((p - 1) * n, p * n), maskedRowCnt: items.filter((h) => h.answerHidden).length },
      meta: { page: p, size: n, total, totalPages: Math.ceil(total / n) },
    };
  },

  getAiChatHistoryByMessageId: ({ messageId, scope }) => {
    const denied = chatScopeDenied(scope);
    if (denied) return denied;
    const row = chatRows(scope).find((h) => h.messageId === messageId);
    if (!row) return fail('E-NOTFOUND', `질의를 찾을 수 없습니다. [messageId=${messageId}]`);
    return {
      ...row,
      askedAt: row.ts,
      userName: row.name,
      // 상세 hits — 목록 docs 와 같은 원천(상위 3건 밖까지 docCnt 건)
      hits: [
        ...(row.docs || []).map((d) => ({ docId: CHAT_DOCS.find((x) => x.title === d.title)?.docId || null, ...d })),
        ...CHAT_DOCS.filter((x) => !(row.docs || []).some((d) => d.title === x.title)).map((d, i) => ({ ...d, score: Number((0.6 - i * 0.05).toFixed(2)) })),
      ].slice(0, row.docCnt || 0).map((h, i) => ({ ...h, cited: i === 0, heading: null })),
      ...(chatScopeAll(scope) && chatCanManage() ? { debug: { route: 'metric', parse: 'OK', tool: 'defect_summary', result: 'OK', errorCd: null, period: '2026-09-22~2026-09-30', rows: 12, docs: 1, toolMs: 420, totalMs: Math.round((row.responseSec || 1) * 1000) } } : {}),
    };
  },

  getAiChatHistorySessions: ({ scope, group, userGroup, empNo, keyword, rating, review, answered, page = 1, size = 50 }) => {
    const denied = chatScopeDenied(scope);
    if (denied) return denied;
    let rows = chatFilter(chatRows(scope), { rating, review, answered });
    const g = userGroup || group;
    if (chatScopeAll(scope) && g && g !== '전체') rows = rows.filter((h) => (h.dept || '').includes(g));
    if (chatScopeAll(scope) && empNo) rows = rows.filter((h) => String(h.empNo || '') === String(empNo));
    let sessions = chatSessions(rows);
    if (keyword) {
      const q = String(keyword).toLowerCase();
      sessions = sessions.filter((s) => s.turns.some((t) => String(t.question || '').toLowerCase().includes(q)));
    }
    const total = sessions.length;
    const n = Number(size) || 50;
    const p = Number(page) || 1;
    const items = sessions.slice((p - 1) * n, p * n).map(({ turns, ...s }) => s);
    return { success: true, code: 'SUCCESS', message: '세션 목록 조회가 완료되었습니다.', data: { items }, meta: { page: p, size: n, total, totalPages: Math.ceil(total / n) } };
  },

  getAiChatHistorySessionsBySessionKey: ({ sessionKey, scope }) => {
    const denied = chatScopeDenied(scope);
    if (denied) return denied;
    const s = chatSessions(chatRows(scope)).find((x) => x.sessionKey === sessionKey);
    if (!s) return fail('E-NOTFOUND', `세션을 찾을 수 없습니다. [sessionKey=${sessionKey}]`);
    return s;
  },

  putAiChatHistoryByMessageIdReview: ({ messageId, reviewCd, comment }) => {
    if (!chatCanManage()) return fail('E-AUTH-004', CHAT_MANAGE_DENIED);
    if (!['USEFUL', 'REASK', 'BAD'].includes(reviewCd)) return fail('E-VALID-001', '검토 값은 USEFUL/REASK/BAD 만 허용합니다.');
    const st = store();
    st.chatReviews = st.chatReviews || {};
    st.chatReviews[messageId] = { review: reviewCd, reviewComment: comment || '', reviewedBy: mockState.currentUser.empNo, reviewedAt: nowStamp() };
    return ok('검토 결과를 저장했습니다.', { messageId, ...st.chatReviews[messageId] });
  },

  // 학습 데이터 답변 (2026-10-03) — 빈 문자열·공백이면 지웁니다. 4,000자 상한
  putAiChatHistoryByMessageIdTrainAnswer: ({ messageId, answer }) => {
    if (!chatCanManage()) return fail('E-AUTH-004', CHAT_MANAGE_DENIED);
    if (!chatRows('all').some((h) => h.messageId === messageId)) return fail('E-NOTFOUND', `질의를 찾을 수 없습니다. [messageId=${messageId}]`);
    const text = String(answer ?? '').trim();
    if (text.length > 4000) return fail('E-VALID-001', '학습 데이터 답변은 4,000자까지 입력할 수 있습니다.');
    const st = store();
    st.chatTrainAnswers = st.chatTrainAnswers || {};
    if (!text) {
      delete st.chatTrainAnswers[messageId];
      return ok('학습 데이터 답변을 지웠습니다.', { messageId, trainAnswer: null, trainAnswerAt: null, trainAnswerBy: null, trainAnswerByNm: null });
    }
    st.chatTrainAnswers[messageId] = { trainAnswer: text, trainAnswerAt: `${nowStamp()}:00`.slice(0, 19), trainAnswerBy: mockState.currentUser.empNo, trainAnswerByNm: mockState.currentUser.name };
    return ok('학습 데이터 답변을 저장했습니다.', { messageId, ...st.chatTrainAnswers[messageId] });
  },

  // 서버 생성 파일 — 화면은 downloadFromServer 로 받습니다(목 모드에서는 안내 파일)
  postAiChatHistoryExport: ({ scope } = {}) => ok('질의 이력 파일을 만들었습니다.', { rowCnt: chatRows(scope).length }),

  getAiChatHistoryDebugByRequestId: () => {
    if (!chatCanManage()) return fail('E-AUTH-004', CHAT_MANAGE_DENIED);
    return { route: 'metric', parse: 'OK', tool: 'defect_summary', result: 'OK', errorCd: null, rows: 12, docs: 1, toolMs: 420, totalMs: 1800 };
  },

  getAiChatHistoryGroups: ({ scope } = {}) => {
    const counts = chatRows(scope).reduce((acc, r) => ({ ...acc, [r.dept]: (acc[r.dept] || 0) + 1 }), {});
    return { items: Object.entries(counts).map(([dept, cnt]) => ({ dept, cnt })) };
  },

  // 학습 데이터 답변이 있는 행은 평가와 관계없이 넣습니다(assistant = 학습 답변)
  postAiChatHistoryExportTrainset: ({ ratingFilter }) => {
    if (!chatCanManage()) return fail('E-AUTH-004', CHAT_MANAGE_DENIED);
    const items = chatRows('all').filter((h) => h.trainAnswer || !ratingFilter || ratingFilter === 'ALL' || h.rating === ratingFilter);
    if (!items.length) return fail('E-NOTFOUND', '내보낼 학습 샘플이 없습니다. 기간이나 평가 조건을 바꿔 주세요.');
    return ok(`학습데이터 ${items.length}건을 내보냈습니다 — 파인튜닝 후보로 사용됩니다.`, { sampleCnt: items.length });
  },

  /* ═══════════ SY-09 보안 감사 로그 ═══════════ */
  /**
   * 감사 로그 — 응답 필드를 실 서버와 같게(id·src·empNo·name·ip·ua …) 두고, 유형·결과는 코드로 거릅니다 (09 AUD-15).
   * 예전 목은 표시명('마스킹 처리')으로 거르고 `group` 을 보아, 화면이 보내는 `userGroup`·코드와 맞지 않았습니다.
   */
  getAuditLogs: ({ from, to, type, userGroup, keyword, ip, result, excludeLoginSuccess, asOf, page = 1, size = 50 }) => {
    const day = nowStamp().slice(0, 10);
    const TYPE = { '마스킹 처리': 'MASK', '원본 조회': 'RAW_VIEW', '마스킹 해제 요청': 'UNMASK_REQ', '권한 변경': 'PERM_CHANGE', '자동 생성': 'AUTO_GEN' };
    const GROUP = { 품질: '품질보증팀', 관리자: '통합관리자', 시스템: '—' };
    const seed = AUDIT_LOGS.map((x, i) => ({
      id: `A-${900 + i}`, src: 'AUDIT', ts: `${day} ${x.ts}`, type: TYPE[x.type] || x.type,
      result: x.result === '반려' ? 'REJECT' : /마스킹/.test(x.result) ? 'MASKED' : 'ALLOW',
      empNo: x.group === '시스템' ? null : '10000', name: x.group === '시스템' ? null : '관리자', dept: GROUP[x.group] || x.group,
      target: x.target, detail: `${x.result} · ${x.note}`, ip: x.group === '시스템' ? null : '10.20.1.2', ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/128',
    }));
    const logins = [
      { id: 'L-1510', src: 'LOGIN', ts: `${day} 09:21:05`, type: 'LOGIN', result: 'REJECT', empNo: '10000', name: '관리자', dept: '통합관리자', target: '로그인', detail: '비밀번호 불일치(1회)', ip: '10.1.2.3', ua: 'Mozilla/5.0 (Macintosh) Safari/17' },
      { id: 'O-1509', src: 'LOGIN', ts: `${day} 08:55:40`, type: 'LOGIN', result: 'ALLOW', empNo: '10004', name: '최전산', dept: '전산팀', target: '로그아웃', detail: '로그아웃', ip: '10.1.2.40', ua: 'Mozilla/5.0 (Windows NT 10.0) Edge/128' },
      { id: 'L-1509', src: 'LOGIN', ts: `${day} 08:02:11`, type: 'LOGIN', result: 'ALLOW', empNo: '10004', name: '최전산', dept: '전산팀', target: '로그인', detail: '정상 로그인', ip: '10.1.2.40', ua: 'Mozilla/5.0 (Windows NT 10.0) Edge/128' },
      { id: 'A-950', src: 'AUDIT', ts: `${day} 07:45:30`, type: 'EXPORT', result: 'ALLOW', empNo: '10004', name: '최전산', dept: '전산팀', target: '내려받기 [보고서 다운로드 이력]', detail: 'XLS · 126행', ip: '10.1.2.40', ua: 'Mozilla/5.0 (Windows NT 10.0) Edge/128', menuId: 'sys-dl', menuNm: '보고서 다운로드 이력' },
    ];
    const perms = store().permLogs.map((l, i) => ({ id: `P-${700 + i}`, src: 'PERM', ts: l.ts.length <= 16 ? `${l.ts}:00` : l.ts, type: 'PERM_CHANGE', result: 'ALLOW', empNo: '10000', name: '관리자', dept: '통합관리자', target: l.target, detail: `${l.detail} · ${l.by}`, ip: '10.20.1.2' }));
    let items = [...logins, ...seed, ...perms].sort((a, b) => String(b.ts).localeCompare(String(a.ts)) || String(b.id).localeCompare(String(a.id)));
    if (from) items = items.filter((x) => String(x.ts).slice(0, 10) >= from);
    if (to) items = items.filter((x) => String(x.ts).slice(0, 10) <= to);
    if (asOf) items = items.filter((x) => String(x.ts) <= String(asOf));
    if (type && type !== '전체') {
      const types = String(type).split(',');
      items = items.filter((x) => types.includes(x.type));
    }
    if (result && result !== '전체') items = items.filter((x) => x.result === result);
    if (userGroup && userGroup !== '전체') items = items.filter((x) => x.dept === userGroup);
    if (keyword) {
      const q = String(keyword).toLowerCase();
      items = items.filter((x) => [x.empNo, x.name, x.target, x.detail].some((v) => String(v ?? '').toLowerCase().includes(q)));
    }
    if (ip) items = items.filter((x) => String(x.ip ?? '').startsWith(String(ip).split('/')[0].replace(/\.0$/, '')));
    if (String(excludeLoginSuccess) === 'true') items = items.filter((x) => !(x.type === 'LOGIN' && x.result === 'ALLOW'));
    const n = Number(size) || 50;
    const p = Number(page) || 1;
    return {
      success: true, code: 'SUCCESS', message: '감사 로그 조회가 완료되었습니다.',
      data: { items: items.slice((p - 1) * n, p * n) },
      meta: { page: p, size: n, total: items.length, totalPages: Math.ceil(items.length / n) },
    };
  },

  /** 전체 내려받기 — 실제 파일은 서버가 만듭니다. 목에서는 downloadFromServer 가 데모 파일을 만들어 여기까지 오지 않습니다 */
  /** 보존 정책 — 기획 09 4.4 예시와 같은 모양 (AUD-11) */
  getAuditLogsRetentionPolicy: () => ({
    retentionYears: 3, enabled: true,
    sources: [
      { src: 'AUDIT', totalCnt: 313, expiredCnt: 0, archivedCnt: 0, oldestAt: '2026-09-04 14:18:42' },
      { src: 'PERM', totalCnt: store().permLogs.length, expiredCnt: 0, archivedCnt: 0, oldestAt: '2026-09-04 14:37:13' },
      { src: 'LOGIN', totalCnt: 1509, expiredCnt: 0, archivedCnt: 0, oldestAt: '2026-09-04 14:15:30' },
    ],
    // R-20(2026-10-02): 배치 켜짐 — 매월 1일 03:00
    lastArchiveAt: null, nextArchiveAt: nextMonthArchive(), writeFailSinceBoot: 0, mailFailSinceBoot: 0,
  }),

  postAuditLogsExport: ({ scope }) => (scope === 'ALL' ? ok('감사 로그 전체 파일을 만들었습니다.(목)') : fail('E-VALID-001', '지원하지 않는 범위입니다.')),

  /* ═══════════ SY-14 보고서 다운로드 이력 ═══════════ */
  /** 요약 — 목록과 같은 기간 조건으로 셉니다 (10 DLG-06). 필드는 실 서버와 같은 totalCnt · todayCnt */
  getDownloadLogsSummary: ({ from, to } = {}) => {
    let items = dlRows();
    if (from) items = items.filter((d) => d.ts.slice(0, 10) >= from);
    if (to) items = items.filter((d) => d.ts.slice(0, 10) <= to);
    const day = nowStamp().slice(0, 10);
    return { totalCnt: items.length, todayCnt: items.filter((d) => d.ts.startsWith(day)).length, blindIncludedCnt: items.filter((d) => d.blindCnt > 0).length };
  },

  /** 목록 — 화면(menuId)·부서(deptId)·형식 코드·범위(scopeCd)·검색어·blind 포함만으로 거릅니다 (10 DLG-03·09·14·15) */
  getDownloadLogs: ({ from, to, menuId, deptId, format, scopeCd, keyword, blindOnly, origin, page = 1, size = 1000 }) => {
    let items = dlRows();
    if (from) items = items.filter((d) => d.ts.slice(0, 10) >= from);
    if (to) items = items.filter((d) => d.ts.slice(0, 10) <= to);
    if (menuId && menuId !== '전체') items = items.filter((d) => d.menuId === menuId);
    if (deptId && deptId !== '전체') items = items.filter((d) => String(d.deptId) === String(deptId));
    if (format && format !== '전체') items = items.filter((d) => d.format === format);
    if (scopeCd && scopeCd !== '전체') items = items.filter((d) => (scopeCd === 'UNKNOWN' ? !d.scopeCd : d.scopeCd === scopeCd));
    if (keyword) {
      const q = String(keyword).toLowerCase();
      items = items.filter((d) => [d.empNo, d.name, d.report, d.condSummary].some((v) => String(v ?? '').toLowerCase().includes(q)));
    }
    if (String(blindOnly) === 'true') items = items.filter((d) => d.blindCnt > 0);
    if (origin && origin !== '전체') items = items.filter((d) => (origin === 'UNKNOWN' ? !d.origin : d.origin === origin));
    const n = Number(size) || 1000;
    const p = Number(page) || 1;
    return {
      success: true, code: 'SUCCESS', message: '다운로드 이력 조회가 완료되었습니다.',
      data: { items: items.slice((p - 1) * n, p * n) },
      meta: { page: p, size: n, total: items.length, totalPages: Math.ceil(items.length / n) },
    };
  },

  /** 기록 — 실 서버와 같은 본문 이름(menuId · reportNm · format 코드 · scopeCd · condSummary · rowCnt · blindCnt)을 받습니다 */
  postDownloadLogs: ({ menuId, reportNm, format, scopeCd, condSummary, scope, rowCnt, blindCnt, fileSize, params }) => {
    const list = dlRows();
    const dlId = (list.reduce((m, d) => Math.max(m, d.dlId || 0), 0) || 0) + 1;
    list.unshift({
      dlId,
      ts: `${nowStamp()}:00`,
      empNo: mockState.currentUser.empNo || '10000',
      name: mockState.currentUser.name,
      dept: mockState.currentUser.dept,
      deptId: mockState.currentUser.dept,
      report: reportNm || '보고서',
      menuId: menuId || null,
      format,
      formatRaw: format,
      scopeCd: scopeCd || null,
      condSummary: condSummary || scope || '',
      scope: scope || (condSummary ? String(condSummary).slice(0, 100) : ''),
      rowCnt: rowCnt || 0,
      blindCnt: blindCnt || 0,
      fileSize: fileSize ?? null,
      params: params || null,
      origin: 'CLIENT',
      ip: '10.20.14.31',
      result: 'DONE',
    });
    return ok('다운로드 이력을 기록했습니다.', { logId: dlId });
  },

  /** 상세 — 목록 필드 + 생성 조건 + 제외된 항목 (10 DLG-10) */
  getDownloadLogsByDlId: ({ dlId }) => {
    const row = dlRows().find((d) => String(d.dlId) === String(dlId));
    if (!row) return fail('E-NOTFOUND', `내려받기 기록을 찾을 수 없습니다. [dlId=${dlId}]`);
    const blindFields = row.blindCnt > 0 && row.origin === 'SERVER' ? [{ fieldKey: 'price', fieldNm: '단가', cellCnt: row.blindCnt }] : [];
    const blindCellSum = blindFields.reduce((n, f) => n + f.cellCnt, 0);
    return { ...row, blindFields, blindCellSum, blindMismatch: blindFields.length > 0 && blindCellSum !== row.blindCnt, blindBasis: 'CELL' };
  },

  /** 전체 내려받기 — 실제 파일은 서버가 만듭니다(목에서는 downloadFromServer 가 데모 파일을 만듭니다) */
  postDownloadLogsExport: ({ scope }) => (scope === 'ALL' ? ok('다운로드 이력 전체 파일을 만들었습니다.(목)') : fail('E-VALID-001', '지원하지 않는 범위입니다.')),

  /** 보존 정책 — 실 서버와 같은 필드. 예전 목 문구(period · target · note)는 화면이 더 읽지 않습니다 */
  getDownloadLogsRetentionPolicy: () => ({
    retentionYears: 3, enabled: true,
    totalCnt: dlRows().length, expiredCnt: 0, archivedCnt: 0, archiveTargetCnt: 0,
    oldestAt: dlRows().map((d) => d.ts).sort()[0] || null, lastArchiveAt: null, nextArchiveAt: nextMonthArchive(),
  }),

  /* ═══════════ SY-15 데이터 연동 이력 ═══════════ */
  /*
   * 목 자료의 상태는 표시명('실패')으로 들어 있습니다. 서버 계약은 SYNC_STATE 코드값이므로
   * 조회 조건은 코드로 받아 표시명과 맞춰 보고, 코드 밖 값(한글 포함)은 실서버와 같은 400 을 돌려줍니다(SYN-01).
   */
  getSyncJobsSummary: () => {
    const items = store().syncJobs;
    const today = items.filter((m) => m.startAt.startsWith('2026-08-28'));
    const durations = items.filter((m) => m.duration).map((m) => parseInt(m.duration, 10) || 0);
    const open = items.filter((m) => syncOpenFail(items, m));
    const stalePending = items.filter((m) => m.state === '예약 대기' && m.scheduledAt && minutesAgo(m.scheduledAt) >= 10);
    const lastOk = items.filter((m) => m.state === '완료' || m.state === '재시도 완료').map((m) => m.endAt || m.startAt).sort().pop() || null;
    const staleMin = lastOk ? Math.max(0, Math.round(minutesAgo(lastOk))) : null;
    const lastRun = SYNC_RUNS.find((r) => !r.dryRun && r.mode !== 'GROUPWARE');
    let consecutiveFailRuns = 0;
    for (const r of SYNC_RUNS.filter((x) => !x.dryRun && x.mode !== 'GROUPWARE')) {
      if (['FAIL', 'PREFLIGHT_FAIL', 'ABORTED'].includes(r.state)) consecutiveFailRuns += 1; else if (r.state !== 'RUNNING') break;
    }
    // 판정표(SYN-03) — 위에서부터 먼저 맞는 것. 목은 기준 시각이 지난 자료라 경과 분은 판정에 넣지 않습니다
    let healthState = 'OK';
    let healthReason = '';
    if (consecutiveFailRuns >= 3) { healthState = 'DOWN'; healthReason = `실행 실패 ${consecutiveFailRuns}회 연속`; } else if (consecutiveFailRuns >= 1 || open.length || stalePending.length) {
      healthState = 'WARN';
      healthReason = open.length ? `미조치 실패 작업 ${open.length}건` : stalePending.length ? `오래된 예약 작업 ${stalePending.length}건` : `실행 실패 ${consecutiveFailRuns}회`;
    }
    return {
      syncState: items.some((m) => m.state === '진행 중') ? 'RUNNING' : 'DONE',
      todayRows: today.reduce((a, m) => a + m.okRows, 0),
      failRows: items.reduce((a, m) => a + m.ngRows, 0),
      avgDurationMin: durations.length ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)) : 0,
      runningCnt: items.filter((m) => m.state === '진행 중').length,
      failCnt: items.filter((m) => m.state === '실패').length,
      healthState,
      healthReason,
      lastRun: lastRun ? { runId: lastRun.runId, mode: lastRun.mode, modeNm: lastRun.modeNm, state: lastRun.state, stateNm: lastRun.stateNm, startedAt: lastRun.startedAt, message: lastRun.message || null } : null,
      lastSuccessAt: lastOk,
      staleMin,
      consecutiveFailRuns,
      todayFailRunCnt: SYNC_RUNS.filter((r) => r.startedAt.startsWith('2026-08-28') && ['FAIL', 'PARTIAL', 'PREFLIGHT_FAIL'].includes(r.state)).length,
      openFailJobCnt: open.length,
      oldestOpenFailAt: open.map((m) => m.startAt).filter(Boolean).sort()[0] || null,
      stalePendingCnt: stalePending.length,
      alert: { condCnt: 0, openAlertCnt: 0, lastAlertAt: null },
    };
  },

  getSyncJobs: ({ state, from, to, srcTable, runId, page = 1, size = 50 }) => {
    if (state && state !== '전체' && !SYNC_STATE_LABEL[state]) {
      return fail('E-VALID-001', `이관 작업 상태 값이 올바르지 않습니다. [${state}] 허용 값은 ${Object.keys(SYNC_STATE_LABEL).join(' · ')} 입니다.`);
    }
    const all = store().syncJobs;
    let items = all;
    items = items.map((m) => ({ ...m, runId: m.runId ?? syncRunOf(m) }));
    if (state && state !== '전체') items = items.filter((m) => m.state === SYNC_STATE_LABEL[state] || m.state === state);
    // 원본 테이블은 대소문자를 가리지 않습니다(SYN-08) · 실행 ID 정확 일치(SYN-09)
    if (srcTable && srcTable !== '전체') items = items.filter((m) => String(m.srcTable).toLowerCase() === String(srcTable).toLowerCase());
    if (runId) items = items.filter((m) => m.runId === runId);
    // 예약 대기는 기간과 무관하게 항상 포함합니다(includePending 기본 true)
    const at = (m) => String(m.startAt || m.scheduledAt || '').slice(0, 10);
    if (from) items = items.filter((m) => m.state === '예약 대기' || at(m) >= from);
    if (to) items = items.filter((m) => m.state === '예약 대기' || at(m) <= to);
    const p = Math.max(1, Number(page) || 1);
    const sz = Math.max(1, Number(size) || 50);
    const rows = items.slice((p - 1) * sz, p * sz).map((m) => ({
      ...m,
      retryable: (m.state === '실패' || m.state === '중단') && !all.some((x) => x.retryOfJobId === m.jobId && (x.state === '예약 대기' || x.state === '진행 중')),
    }));
    return { success: true, code: 'SUCCESS', message: '이관 작업 이력 조회가 완료되었습니다.', data: { items: rows }, meta: { page: p, size: sz, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / sz)) } };
  },

  // 서버와 같은 { job, params, mapId, errorTotal, errors } 모양 (SYN-02·07)
  getSyncJobsByJobId: ({ jobId }) => {
    const all = store().syncJobs;
    const m = all.find((x) => x.jobId === jobId);
    if (!m) return fail('E-NOTFOUND', `이관 작업을 찾을 수 없습니다. [jobId=${jobId}]`);
    const map = SYNC_MAPS.find((x) => x.srcTable === m.srcTable) || {};
    const retriedBy = all.filter((x) => x.retryOfJobId === m.jobId).map((x) => ({ jobId: x.jobId, state: x.state, startedAt: x.startAt || null }));
    const failed = m.state === '실패' || m.state === '중단';
    const after = failed ? all.find((x) => x.srcTable === m.srcTable && (x.state === '완료' || x.state === '재시도 완료') && String(x.startAt) > String(m.startAt)) : null;
    const pendingRetry = retriedBy.some((x) => x.state === '예약 대기' || x.state === '진행 중');
    return {
      job: {
        ...m,
        startedAt: m.startAt || null,
        endedAt: m.endAt || null,
        checksumMatch: m.state === '완료' || m.state === '재시도 완료' ? true : failed ? false : null,
        retryCnt: 0,
        triggeredBy: m.retryOfJobId ? 'MANUAL' : 'BATCH',
        triggeredByUser: m.retryOfJobId ? mockState.currentUser?.empNo || null : 'SYSTEM',
        remark: m.ngRows ? SYNC_FAIL_REASON.reason : failed ? '검증 건수 불일치(원본·대상 대조 실패)' : null,
        retryable: failed && !pendingRetry,
        retryBlockedReason: failed ? (pendingRetry ? '이미 재실행이 예약되어 있습니다' : null) : '실패하거나 중단된 작업만 재실행할 수 있습니다',
        retriedBy,
        supersededBy: after ? { jobId: after.jobId, endedAt: after.endAt || after.startAt } : null,
      },
      params: { srcDb: 'DWJ_MES', srcTable: m.srcTable, dstTable: m.dstTable, keyColumns: map.keyColumn || null, cdcColumn: null, schedule: map.schedule || null, cron: null },
      mapId: null,
      errorTotal: m.ngRows ? 3 : 0,
      errors: m.ngRows
        ? Array.from({ length: 3 }, (_, i) => {
          const payload = JSON.stringify({ judge_seq: 88120 + i, judge_code: 'NG01', lot_no: `L2608-${101 + i}` });
          return { rowNo: i + 1, code: 'LENGTH', message: SYNC_FAIL_REASON.reason, srcKey: `judge_seq=${88120 + i}`, payload, rawData: payload, retriedAt: null, resolved: false };
        })
        : [],
    };
  },

  // 실행은 이관 엔진이 하므로 '예약 대기' 로 만들어 둡니다 (실서버 No.229 와 동일)
  // FAIL·ABORTED 만, 같은 원 작업의 예약·진행 중 재실행이 있으면 409 (SYN-02)
  postSyncJobsByJobIdRetry: ({ jobId }) => {
    const st = store();
    const m = st.syncJobs.find((x) => x.jobId === jobId);
    if (!m) return fail('E-NOTFOUND', `이관 작업을 찾을 수 없습니다. [jobId=${jobId}]`);
    if (m.state !== '실패' && m.state !== '중단') {
      const code = Object.keys(SYNC_STATE_LABEL).find((k) => SYNC_STATE_LABEL[k] === m.state) || m.state;
      return fail('E-RULE-001', `실패하거나 중단된 작업만 재실행할 수 있습니다. [state=${code}]`);
    }
    const dup = st.syncJobs.find((x) => x.retryOfJobId === jobId && (x.state === '예약 대기' || x.state === '진행 중'));
    if (dup) return fail('E-RULE-001', `이미 재실행이 예약되어 있습니다. [newJobId=${dup.jobId}]`);
    const after = st.syncJobs.find((x) => x.srcTable === m.srcTable && (x.state === '완료' || x.state === '재시도 완료') && String(x.startAt) > String(m.startAt));
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
      retryOfJobId: jobId,
    });
    return ok('재실행을 등록했습니다. 이관 엔진이 곧 실행합니다.', {
      newJobId, state: 'PENDING', supersededBy: after ? { jobId: after.jobId, endedAt: after.endAt || after.startAt } : null,
    });
  },

  // 엑셀 「전체 다운로드」 (SYN-15) — 목에서는 화면이 downloadFromServer 의 데모 파일을 받으므로 여기 오지 않습니다.
  // 카탈로그 정합용으로 대상 값 검증만 서버와 같게 둡니다
  postSyncExport: ({ target, scope } = {}) => {
    if (!['JOBS', 'RUNS', 'DRIFTS'].includes(target)) return fail('E-VALID-001', `내려받기 대상 값이 올바르지 않습니다. [${target}] 허용 값은 JOBS · RUNS · DRIFTS 입니다.`);
    if (scope && scope !== 'ALL') return fail('E-VALID-001', `내려받기 범위 값이 올바르지 않습니다. [${scope}] 허용 값은 ALL 입니다.`);
    return ok('목 모드에서는 서버 생성 파일을 만들지 않습니다.', null);
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
  getSyncRuns: ({ state, mode, source, from, to, page = 1, size = 25 }) => {
    let items = SYNC_RUNS;
    if (state && state !== '전체') items = items.filter((r) => r.stateNm === state || r.state === state);
    if (mode && mode !== '전체') items = items.filter((r) => r.modeNm === mode || r.mode === mode);
    // 출처 — MES 이관(그룹웨어 동기화 제외) / 그룹웨어 (SYN-09). 그 밖의 값은 서버와 같은 400
    if (source && !['MES', 'GROUPWARE'].includes(source)) {
      return { success: false, code: 'E-VALID-001', message: '실행 구분은 MES 또는 GROUPWARE 만 허용합니다.', data: null, error: { code: 'E-VALID-001', field: 'source' } };
    }
    if (source === 'MES') items = items.filter((r) => r.mode !== 'GROUPWARE');
    if (source === 'GROUPWARE') items = items.filter((r) => r.mode === 'GROUPWARE');
    if (from) items = items.filter((r) => String(r.startedAt).slice(0, 10) >= from);
    if (to) items = items.filter((r) => String(r.startedAt).slice(0, 10) <= to);
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
  { runId: 'RUN-260827-02', mode: 'FULL', modeNm: '전체', state: 'ABORTED', stateNm: '중단', startedAt: '2026-08-27 01:02:00', endedAt: '2026-08-27 01:02:31', durationSec: 31, triggeredByCd: 'USER', triggeredBy: '관리자 관리자', options: 'dryRun', dryRun: true, tableCnt: 0, successCnt: 0, failCnt: 0, okRows: 0, ngRows: 0, driftOpenCntAtRun: 3, engineVersion: '1.4.2', host: 'ax-mig-02', message: '원본 접속 실패 — The TCP/IP connection to the host 192.0.2.10, port 1433 has failed. 표에 닿지 못하고 끝났습니다' },
  { runId: 'RUN-260826-01', mode: 'FULL', modeNm: '전체', state: 'SUCCESS', stateNm: '완료', startedAt: '2026-08-26 03:00:00', endedAt: '2026-08-26 03:04:12', durationSec: 252, triggeredByCd: 'USER', triggeredBy: '관리자 관리자', options: 'tables=1', dryRun: false, tableCnt: 1, successCnt: 1, failCnt: 0, okRows: 3418, ngRows: 0, driftOpenCntAtRun: 1, engineVersion: '1.4.1', host: 'ax-mig-01', message: '' },
];

/* ═══════════ SY-17 그룹웨어 부서 매핑 ═══════════ */

/** 미배정 부서 이름 — 서버는 엔진 설정 migration.groupware.ax-join.default-dept-name 과 같은 값을 씁니다 */
const UNASSIGNED = '미배정';

/**
 * 매핑표와 미배정 계정
 *
 * 미배정 계정은 계정 관리 화면의 계정 목록(`store().users`)에 함께 넣습니다 — 실제 DB 에서도
 * ax.tb_sys_user 의 같은 표이고, 한 명씩 옮길 때는 계정 부서 이동 API 를 그대로 쓰기 때문입니다.
 */
function gwStore() {
  const st = store();
  if (!st.gwMaps) {
    st.gwMaps = GW_DEPT_MAP_SEED.map((m) => ({ ...m, updDate: '2026-09-30 00:00', updUser: 'SYSTEM' }));
    if (!st.depts.some((d) => d.id === UNASSIGNED)) {
      st.depts.push({ id: UNASSIGNED, desc: '그룹웨어 자동 가입 계정 중, 부서 매핑이 없는 사람 — 고정 5개 화면' });
    }
    GW_UNASSIGNED_USERS.forEach((u) => {
      if (!st.users.some((x) => x.empNo === u.empNo)) {
        st.users.push({ ...u, dept: UNASSIGNED, state: '사용', lastLoginAt: '—', gwJoined: true });
      }
    });
  }
  return st;
}

const gwMapOf = (gwDeptNm) => gwStore().gwMaps.find((m) => m.gwDeptNm === gwDeptNm);
const gwStateOf = (m) => (!m ? 'UNMAPPED' : m.joinYn === 'N' ? 'EXCLUDED' : m.deptId ? 'MAPPED' : 'UNMAPPED');
const gwUnassigned = () => gwStore().users.filter((u) => u.gwJoined && u.dept === UNASSIGNED);

/** 그룹웨어 부서명(재직자) ∪ 매핑표 행 */
function gwRows() {
  const st = gwStore();
  const names = [...new Set([...GW_DEPT_SOURCE.map((d) => d.gwDeptNm), ...st.gwMaps.map((m) => m.gwDeptNm)])];
  return names.map((gwDeptNm) => {
    const src = GW_DEPT_SOURCE.find((d) => d.gwDeptNm === gwDeptNm);
    const m = gwMapOf(gwDeptNm);
    const joinedUsers = st.users.filter((u) => u.gwDeptNm === gwDeptNm);
    return {
      gwDeptNm,
      activeCnt: src?.activeCnt ?? 0,
      joinedCnt: joinedUsers.length,
      unassignedCnt: joinedUsers.filter((u) => u.dept === UNASSIGNED).length,
      deptId: m?.deptId ?? null,
      deptNm: m?.deptId ?? null,
      joinYn: m?.joinYn ?? 'Y',
      state: gwStateOf(m),
      remark: m?.remark ?? '',
      hasRow: !!m,
      inSource: !!src,
      updDate: m?.updDate ?? null,
      updUser: m?.updUser ?? null,
    };
  });
}

Object.assign(systemMock, {
  getSystemGwDeptMapsSummary: () => {
    const rows = gwRows().filter((r) => r.inSource);
    const unmapped = rows.filter((r) => r.state === 'UNMAPPED');
    return {
      gwDeptCnt: rows.length,
      mappedCnt: rows.filter((r) => r.state === 'MAPPED').length,
      unmappedCnt: unmapped.length,
      excludedCnt: rows.filter((r) => r.state === 'EXCLUDED').length,
      unmappedUserCnt: unmapped.reduce((a, r) => a + r.activeCnt, 0),
      unassignedUserCnt: gwUnassigned().length,
      unassignedDept: { deptId: UNASSIGNED, deptNm: UNASSIGNED },
      // 원천·미배정 부서 상태 (GWD-03), 쓰기 권한 (GWD-14 — 목은 늘 가능)
      health: { unassignedDeptFound: gwStore().depts.some((d) => d.id === UNASSIGNED), sourceExists: true, sourceRowCnt: GW_DEPT_SOURCE.reduce((a, d) => a + (d.activeCnt || 0), 0), engineDeptName: UNASSIGNED },
      canWrite: true,
      lastSync: { startedAt: '2026-09-30 02:10', stateCd: 'DONE', joinSummary: `AX 가입 ${GW_UNASSIGNED_USERS.length}(미배정 ${GW_UNASSIGNED_USERS.length})` },
      lastJoin: { startedAt: '2026-09-30 02:10', summary: `AX 가입 ${GW_UNASSIGNED_USERS.length}(미배정 ${GW_UNASSIGNED_USERS.length})` },
      unassignedPwdInitCnt: gwUnassigned().filter(mockPwdChangeRequired).length,
      lastSyncAt: '2026-09-30 02:10',
      lastJoinMessage: `AX 가입 ${GW_UNASSIGNED_USERS.length + 12}(미배정 ${GW_UNASSIGNED_USERS.length}) / 이미 가입 13 / 제외 부서 23`,
    };
  },

  getSystemGwDeptMaps: ({ keyword, state, page = 1, size = 100 } = {}) => {
    let items = gwRows();
    if (keyword) items = items.filter((r) => `${r.gwDeptNm}${r.deptNm || ''}${r.remark}`.includes(keyword));
    if (state) items = items.filter((r) => r.state === state);
    return { items, meta: { page, size, total: items.length } };
  },

  putSystemGwDeptMaps: ({ gwDeptNm, deptId, joinYn, remark, fromGwDeptNm }) => {
    const st = gwStore();
    // 이름 변경 이어받기 (GWD-11) — 옛 행의 설정을 새 이름으로 옮기고 옛 행을 지웁니다
    if (fromGwDeptNm) {
      const old = gwMapOf(fromGwDeptNm);
      if (!old) return fail('E-NOTFOUND', `이어받을 매핑을 찾을 수 없습니다. [${fromGwDeptNm}]`);
      if (gwMapOf(gwDeptNm)) return fail('E-RULE-001', `'${gwDeptNm}' 에 이미 매핑이 있습니다. 먼저 삭제하거나 직접 지정하십시오.`);
      st.gwMaps = st.gwMaps.filter((m) => m.gwDeptNm !== fromGwDeptNm);
      st.gwMaps.push({ ...old, gwDeptNm, updDate: nowStamp(), updUser: mockState.currentUser.empNo });
      logPerm(gwDeptNm, '부서 매핑', `이름 변경 이어받기 ${fromGwDeptNm} → ${gwDeptNm}`);
      return ok(`'${fromGwDeptNm}' 의 매핑을 '${gwDeptNm}' 으로 이어받았습니다.`, { gwDeptNm, state: gwStateOf(old) });
    }
    if (!gwDeptNm) return fail('E-VALID-001', '그룹웨어 부서명은 필수입니다.');
    if (deptId && !st.depts.some((d) => d.id === deptId)) return fail('E-VALID-002', 'AX 부서를 찾을 수 없습니다.');
    if (deptId === UNASSIGNED) return fail('E-VALID-003', `'${UNASSIGNED}' 부서는 매핑 대상으로 고를 수 없습니다 — 비워 두면 미배정입니다.`);
    const next = { gwDeptNm, deptId: deptId || null, joinYn: joinYn === 'N' ? 'N' : 'Y', remark: remark || '', updDate: nowStamp(), updUser: mockState.currentUser.empNo };
    const i = st.gwMaps.findIndex((m) => m.gwDeptNm === gwDeptNm);
    if (i >= 0) st.gwMaps[i] = next; else st.gwMaps.push(next);
    const label = next.joinYn === 'N' ? '가입 제외' : next.deptId || UNASSIGNED;
    logPerm(gwDeptNm, '부서 매핑', `그룹웨어 부서 매핑 → ${label}`);
    return ok(`'${gwDeptNm}' 을(를) ${label}(으)로 저장했습니다. 이미 가입된 계정의 부서는 바뀌지 않습니다.`, { gwDeptNm, state: gwStateOf(next) });
  },

  deleteSystemGwDeptMaps: ({ gwDeptNm }) => {
    const st = gwStore();
    const i = st.gwMaps.findIndex((m) => m.gwDeptNm === gwDeptNm);
    if (i < 0) return fail('E-NOTFOUND', '매핑 행이 없습니다.');
    st.gwMaps.splice(i, 1);
    logPerm(gwDeptNm, '부서 매핑', '그룹웨어 부서 매핑 삭제');
    return ok(`'${gwDeptNm}' 매핑을 지웠습니다. 다음 가입부터 이 부서 사람은 미배정으로 들어갑니다.`);
  },

  /** 일괄 저장 (GWD-05) — 한 건이라도 오류면 아무것도 저장하지 않습니다 */
  putSystemGwDeptMapsBulk: ({ gwDeptNms, deptId, joinYn } = {}) => {
    const st = gwStore();
    const names = Array.isArray(gwDeptNms) ? gwDeptNms : [];
    if (!names.length) return fail('E-VALID-001', '저장할 그룹웨어 부서를 고르십시오.');
    if (names.length > 200) return fail('E-VALID-001', '한 번에 200개까지 처리할 수 있습니다.');
    if (deptId && !st.depts.some((d) => d.id === deptId)) return fail('E-VALID-001', `존재하지 않는 부서입니다. [deptId=${deptId}]`);
    const items = names.map((gwDeptNm) => {
      const prev = gwMapOf(gwDeptNm);
      const next = { gwDeptNm, deptId: joinYn === 'N' ? null : deptId || null, joinYn: joinYn === 'N' ? 'N' : 'Y', remark: prev?.remark || '', updDate: nowStamp(), updUser: mockState.currentUser.empNo };
      const i = st.gwMaps.findIndex((m) => m.gwDeptNm === gwDeptNm);
      if (i >= 0) st.gwMaps[i] = next; else st.gwMaps.push(next);
      logPerm(gwDeptNm, '부서 매핑', `그룹웨어 부서 매핑(일괄) → ${next.joinYn === 'N' ? '가입 제외' : next.deptId || UNASSIGNED}`);
      return { gwDeptNm, state: gwStateOf(next) };
    });
    return ok(`${items.length}개 부서 매핑을 저장했습니다. 이미 가입된 계정의 부서는 바뀌지 않습니다.`, { savedCnt: items.length, items });
  },

  getSystemGwDeptMapsUnassignedUsers: ({ keyword, page = 1, size = 100 } = {}) => {
    let items = gwUnassigned().map((u) => {
      const m = gwMapOf(u.gwDeptNm);
      const suggest = m && m.joinYn === 'Y' && m.deptId ? m.deptId : null;
      return {
        empNo: u.empNo, name: u.name, gwDeptNm: u.gwDeptNm, pos: u.pos, posNm: u.pos,
        state: u.state, stateNm: u.state, joinedAt: u.joinedAt, lastLoginAt: u.lastLoginAt,
        pwdChangeRequired: mockPwdChangeRequired(u), retired: false, stateReason: null,
        suggestDeptId: suggest, suggestDeptNm: suggest,
      };
    });
    if (keyword) items = items.filter((u) => `${u.empNo}${u.name}${u.gwDeptNm}`.includes(keyword));
    return { items, meta: { page, size, total: items.length } };
  },

  /**
   * 매핑대로 재배정 (GWD-01) — 옮길 사번(empNos)을 주거나 전체(all:true)를 명시해야 합니다.
   * 빈 본문은 400 입니다(예전의 「빈 목록 = 전체」 규칙 폐지). 한 번에 1,000명까지.
   */
  postSystemGwDeptMapsReassign: ({ empNos, gwDeptNms, all } = {}) => {
    const list = Array.isArray(empNos) ? empNos : [];
    const gw = Array.isArray(gwDeptNms) ? gwDeptNms : [];
    if (!list.length && !gw.length && all !== true) return fail('E-VALID-001', '옮길 계정을 지정하거나 전체 재배정을 명시하십시오.');
    if (list.length > 1000) return fail('E-VALID-001', '한 번에 1000개까지 처리할 수 있습니다.');
    const targets = gwUnassigned().filter((u) => all === true || list.includes(u.empNo) || gw.includes(u.gwDeptNm));
    const moved = [];
    const skipped = [];
    targets.forEach((u) => {
      const m = gwMapOf(u.gwDeptNm);
      if (!m || m.joinYn !== 'Y' || !m.deptId) { skipped.push({ empNo: u.empNo, reason: '매핑 없음' }); return; }
      u.dept = m.deptId;
      moved.push({ empNo: u.empNo, deptNm: m.deptId, gwDeptNm: u.gwDeptNm });
      logPerm(u.name, '계정', `${UNASSIGNED} → ${m.deptId} 부서 이동 (그룹웨어 부서 매핑대로 재배정)`);
    });
    const byDeptMap = {};
    moved.forEach((x) => { byDeptMap[x.deptNm] = (byDeptMap[x.deptNm] || 0) + 1; });
    const byDept = Object.entries(byDeptMap).map(([deptNm, cnt]) => ({ deptNm, cnt }));
    const skippedCnt = skipped.length;
    if (!moved.length) return ok('옮길 계정이 없습니다 — 매핑이 정해진 그룹웨어 부서의 계정만 옮깁니다.', { movedCnt: 0, skippedCnt, items: [], byDept: [], skipped });
    return ok(`미배정 계정 ${moved.length}명을 옮겼습니다${skippedCnt ? ` (건너뜀 ${skippedCnt}명)` : ''}.`, { movedCnt: moved.length, skippedCnt, items: moved, byDept, skipped });
  },
});

/* ═══════════ SY-06 · SY-08 목 보조 함수 (2026-10-01 · 07 GLS-03 · 08 CHH-02·09·16·18) ═══════════ */

/** 유사어 위험 유형 — 07 GLS-03 의 riskCd 와 같은 판정 */
function variantRiskOf(st, word, ownTermId) {
  const w = String(word || '').trim();
  const lower = w.toLowerCase().replace(/\s+/g, '');
  if (w.length < 2) return { riskCd: 'ONE_CHAR', riskNm: '한 글자 유사어' };
  if (/^\d+$/.test(w)) return { riskCd: 'NUMERIC', riskNm: '숫자만으로 된 유사어' };
  if (/^\d{1,2}월$|^\d{1,2}일$|^\d{4}년$/.test(w)) return { riskCd: 'DATE_LIKE', riskNm: '날짜 표현' };
  const same = st.glossary.find((g) => g.term.toLowerCase().replace(/\s+/g, '') === lower);
  if (same && same.termId !== ownTermId) return { riskCd: 'SAME_AS_TERM', riskNm: `공식 용어 [${same.term}] 과 같은 낱말` };
  const sub = st.glossary.filter((g) => g.termId !== ownTermId && g.term.toLowerCase().includes(lower) && g.term.toLowerCase() !== lower);
  if (sub.length) return { riskCd: 'SUBSTRING_OF_TERM', riskNm: `공식 용어 ${sub.length}건(예: ${sub[0].term}) 안에 들어 있음` };
  return null;
}

/** 사전에 이미 들어 있는 점검 필요 유사어 */
function glossaryRisks(st) {
  const out = [];
  st.glossary.forEach((g) => g.variants.forEach((v) => {
    const r = variantRiskOf(st, v.word, g.termId);
    if (!r) return;
    const u = st.users.find((x) => x.empNo === v.by);
    out.push({ variantId: v.variantId, word: v.word, termId: g.termId, term: g.term, ownerName: u ? u.name : '(삭제된 계정)', ...r });
  }));
  return out;
}

/** 등록·수정 거부 사유 (400) — 없으면 null */
function variantRuleError(st, word) {
  const w = String(word || '').trim();
  if (!w) return '유사어를 입력하세요.';
  if (w.length < 2) return '유사어는 2자 이상이어야 합니다.';
  if (w.length > 50) return '유사어는 50자 이하로 입력해 주세요.';
  if (/^\d+$/.test(w) || /^\d{1,2}월$|^\d{1,2}일$|^\d{4}년$/.test(w)) return '숫자나 날짜 표현은 유사어로 등록할 수 없습니다.';
  const same = st.glossary.find((g) => g.term.toLowerCase().replace(/\s+/g, '') === w.toLowerCase().replace(/\s+/g, ''));
  if (same) return `'${w}' 는 공식 용어 [${same.term}] 입니다. 유사어로 등록할 수 없습니다.`;
  return null;
}

/** 저장은 되지만 알릴 것 — 공식 용어 안의 부분 문자열 */
function variantWarnings(st, word) {
  const r = variantRiskOf(st, word, null);
  return r?.riskCd === 'SUBSTRING_OF_TERM' ? [`'${word}' 가 ${r.riskNm.replace(' 안에 들어 있음', '')} 안에 들어 있습니다. 해당 용어는 치환하지 않습니다.`] : [];
}

/** 전사 질의 이력 화면 ID (2026-10-03) */
const SYS_CHAT_HISTORY = 'sys-chat-history';
const CHAT_MANAGE_DENIED = '미배정 계정은 이 동작을 할 수 없습니다. [sys-chat-history]';
/** 현재 계정이 화면에 접근할 수 있는지 (통합관리자는 '*') */
const mockCan = (screenId) => {
  const acc = menuAccessOf(mockState.currentUser?.dept);
  return acc === '*' || (Array.isArray(acc) && acc.includes(screenId));
};
const chatScopeAll = (scope) => String(scope || '').toLowerCase() === 'all';
/** scope=all 인데 sys-chat-history 접근이 없으면 403 E-AUTH-002 */
const chatScopeDenied = (scope) => (chatScopeAll(scope) && !mockCan(SYS_CHAT_HISTORY)
  ? fail('E-AUTH-002', '이 화면에 접근할 권한이 없습니다. [sys-chat-history]')
  : null);
/** sys-chat-history 쓰기 — 접근 && 미배정 아님, 통합관리자는 항상 (2026-10-03 접근 권한 통합) */
const chatCanManage = () => mockCan(SYS_CHAT_HISTORY) && mockState.currentUser?.dept !== UNASSIGNED;
/** 'YYYY-MM-DD HH:mm:ss' + 초 → 같은 형식 (답변 시간 answeredAt) */
function addSecTs(ts, sec) {
  if (!ts || sec === null || sec === undefined || sec === '') return null;
  const d = new Date(String(ts).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  d.setMilliseconds(d.getMilliseconds() + Math.round(Number(sec) * 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 같은 세션으로 이어 물은 질의 — 세션 상세(여러 턴)를 보여 주기 위한 목 데이터 */
const CHAT_FOLLOWUPS = [
  { messageId: 'H06', sessionOf: 'H01', ts: '09:26', question: '그 라인 어제랑 비교해 줘', elapsedMs: 2200, rating: '' },
  { messageId: 'H07', sessionOf: 'H01', ts: '09:29', question: '원인 상위 3개만 알려줘', elapsedMs: 1800, rating: '오답' },
];
const RATING_CD = { 유용: 'USEFUL', 재질의: 'REASK', 오답: 'BAD', 개선필요: 'BAD' };

/** 근거 문서 후보 — 목록 행 docs(상위 3건) · 상세 hits 가 같은 원천을 씁니다 */
const CHAT_DOCS = [
  { docId: 'DOC-1', title: '공정 불량 기준서', page: 3 },
  { docId: 'DOC-2', title: 'PRESS 금형 관리 지침', page: 12 },
  { docId: 'DOC-3', title: '도금 공정 작업 표준', page: 7 },
  { docId: 'DOC-4', title: 'AOI 판정 기준표', page: 2 },
  { docId: 'DOC-5', title: '출하 검사 절차서', page: 5 },
];
/**
 * LLM 메타 흉내 (2026-10-03 2차, V71) — 질의 ID 로 값을 정해 새로 그려도 같게 나옵니다.
 * vLLM 응답의 model · finish_reason · usage · id 와 호출 시간. 미응답은 메타가 비어 있습니다.
 */
function chatLlmMeta(messageId, { answered, all, responseSec, intent }) {
  const seed = [...String(messageId)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  const docCnt = seed % 5;
  const docs = CHAT_DOCS.slice(seed % 2, (seed % 2) + Math.min(docCnt, 3)).map((d, i) => ({ title: d.title, page: d.page, score: Number((0.86 - i * 0.07 - (seed % 7) / 100).toFixed(2)) }));
  if (!answered) return { llmModel: null, finishReason: null, promptTokens: null, completionTokens: null, totalTokens: null, llmMs: null, ...(all ? { llmRequestId: null } : {}), intentNm: intent || null, docs, docCnt };
  const promptTokens = 900 + (seed % 23) * 97;
  const completionTokens = 80 + (seed % 17) * 31;
  const finishReason = seed % 11 === 0 ? 'length' : seed % 7 === 0 ? 'tool_calls' : 'stop';
  return {
    llmModel: 'dwje-ax',
    finishReason,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    llmMs: responseSec != null ? Math.round(Number(responseSec) * 1000 * 0.7) : null,
    // 요청 ID 는 전사 화면(scope=all)에서만 내려갑니다
    ...(all ? { llmRequestId: `chatcmpl-${seed.toString(16).padStart(4, '0')}${String(messageId).toLowerCase()}` } : {}),
    intentNm: intent || null,
    docs,
    docCnt,
  };
}

/**
 * 질의 이력 한 건을 서버 응답 모양으로 맞춥니다.
 * scope=mine(기본) — 본인 행만, 가림 없음. scope=all — 전 사용자 행, 이름·사번 그대로(2026-10-03).
 * 응답 가림(CHH-02): 열람자에게 수율 권한이 없으면 남의 수율 질의 응답을 가립니다(데이터 권한 가림은 유지).
 */
function chatRows(historyScope) {
  const st = store();
  const me = mockState.currentUser;
  const scope = dataScopeOf(me.dept);
  const canYield = scope === '*' || (Array.isArray(scope) && scope.includes('yield')) || me.dept === '통합관리자';
  const all = chatScopeAll(historyScope);
  const session = mockState.store.ai?.history || [];
  const seed = st.chatHistory;
  const base = [...session, ...seed, ...CHAT_FOLLOWUPS.map((f) => ({ ...seed.find((s) => s.messageId === f.sessionOf), ...f }))];
  const day = nowStamp().slice(0, 10);
  return base.filter((h) => all || (h.name || h.user || '') === me.name).map((h) => {
    const name = h.name || h.user || '';
    const u = st.users.find((x) => x.name === name);
    const own = name === me.name;
    const hidden = !own && !canYield && /수율/.test(h.question || '');
    const ts = String(h.ts || '').length <= 5 ? `${day} ${h.ts}:00` : h.ts;
    const review = st.chatReviews?.[h.messageId] || {};
    const sessionKey = h.sessionOf ? `S-${h.sessionOf}` : CHAT_FOLLOWUPS.some((f) => f.sessionOf === h.messageId) ? `S-${h.messageId}` : `chat-${h.messageId}`;
    const answer = h.answer || `${h.intentLabel || '질의'} 결과를 요약했습니다.`;
    const responseSec = h.elapsedMs != null ? h.elapsedMs / 1000 : h.responseSec;
    const train = st.chatTrainAnswers?.[h.messageId] || {};
    return {
      messageId: h.messageId,
      sessionKey,
      ts,
      empNo: u?.empNo || (own ? me.empNo : null),
      name,
      dept: h.dept,
      question: h.question,
      answer: hidden ? null : answer,
      judgmentBasis: hidden ? null : (h.judgmentBasis || '집계 표 · 공정 불량 기준서'),
      answerHidden: hidden,
      answerHiddenReason: hidden ? '질의자보다 데이터 접근 권한이 좁아 응답을 표시하지 않습니다 (가려지는 항목: 수율)' : null,
      unansweredReason: h.unansweredReason || null,
      responseSec,
      answeredAt: addSecTs(ts, responseSec),
      rating: RATING_CD[h.rating] || h.rating || null,
      ratingComment: null,
      review: review.review || null,
      reviewComment: review.reviewComment || null,
      reviewedBy: review.reviewedBy || null,
      reviewedAt: review.reviewedAt || null,
      trainAnswer: train.trainAnswer || null,
      trainAnswerAt: train.trainAnswerAt || null,
      trainAnswerBy: train.trainAnswerBy || null,
      trainAnswerByNm: train.trainAnswerByNm || null,
      ...chatLlmMeta(h.messageId, { answered: !h.unansweredReason, all, responseSec, intent: h.intentNm || h.intentLabel }),
    };
  }).sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
}

/** 질의 → 세션 (session_id 가 없으면 질의 한 건을 한 세션 chat-{id} 로 봅니다 — 08 CHH-18) */
function chatSessions(rows) {
  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.sessionKey)) map.set(r.sessionKey, []);
    map.get(r.sessionKey).push(r);
  });
  return [...map.entries()].map(([sessionKey, list]) => {
    const turns = list.slice().sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
    const first = turns[0];
    return {
      sessionKey,
      sessionId: sessionKey.startsWith('chat-') ? null : sessionKey,
      startedAt: first.ts,
      lastAskedAt: turns.at(-1).ts,
      empNo: first.empNo,
      name: first.name,
      dept: first.dept,
      questionCnt: turns.length,
      firstQuestion: String(first.question || '').slice(0, 80),
      answeredCnt: turns.filter((t) => t.answer || t.answerHidden).length,
      usefulCnt: turns.filter((t) => t.rating === 'USEFUL').length,
      badCnt: turns.filter((t) => t.rating === 'BAD').length,
      reviewedCnt: turns.filter((t) => t.review).length,
      hiddenCnt: turns.filter((t) => t.answerHidden).length,
      turns: turns.map((t) => ({
        messageId: t.messageId, askedAt: t.ts, question: t.question, answer: t.answer, answerHidden: t.answerHidden,
        answerHiddenReason: t.answerHiddenReason, judgmentBasis: t.judgmentBasis, unansweredReason: t.unansweredReason,
        responseSec: t.responseSec, rating: t.rating, review: t.review, reask: turns.indexOf(t) > 0, trainAnswer: t.trainAnswer,
        llmModel: t.llmModel, finishReason: t.finishReason, promptTokens: t.promptTokens, completionTokens: t.completionTokens, totalTokens: t.totalTokens,
        llmMs: t.llmMs, intentNm: t.intentNm, docs: t.docs, docCnt: t.docCnt, ...('llmRequestId' in t ? { llmRequestId: t.llmRequestId } : {}),
      })),
    };
  }).sort((a, b) => String(b.lastAskedAt).localeCompare(String(a.lastAskedAt)));
}

/** 사전 변경 이력 한 줄 (07 GLS-07 흉내 — 최신이 앞) */
function glsLog(st, targetCd, actionCd, term, before, after, variantId = null) {
  st.glsChanges = st.glsChanges || [];
  st.glsChanges.unshift({
    changeId: st.glsChanges.length + 1, at: `${nowStamp()}:00`, actorId: mockState.currentUser.empNo, actorNm: mockState.currentUser.name,
    targetCd, actionCd, termId: term?.termId ?? null, term: term?.term ?? '', variantId, before, after,
  });
}

/** 평가·검토·응답 여부 조건 (08 CHH-10) */
function chatFilter(rows, { rating, review, answered }) {
  const by = (v, want) => !want || want === '전체' || (want === 'NONE' ? !v : v === want);
  return rows.filter((r) => by(r.rating, rating) && by(r.review, review)
    && (!answered || answered === '전체' || (answered === 'Y' ? !!(r.answer || r.answerHidden) : !(r.answer || r.answerHidden) || !!r.unansweredReason)));
}

/** 고객사 분류 용어를 가릴지 — 통합관리자는 항상 봅니다 (결정 R-18 흉내) */
function glsBlinded(g) {
  const me = mockState.currentUser;
  if (me.dept === '통합관리자') return false;
  const scope = dataScopeOf(me.dept);
  const canCustomer = scope === '*' || (Array.isArray(scope) && scope.includes('customer'));
  return !canCustomer && ['회사/고객사', '고객사', '고객협력사', '협력업체'].includes(g.domain);
}
