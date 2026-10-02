/**
 * [Model] 시스템관리 리포지토리 (SY-01 ~ SY-15)
 *
 * 화면 단위로 필요한 API 묶음을 제공합니다.
 */
import { permRows } from '@shared/constants/menu';
import * as aiService from '@services/api/aiService';
import * as systemService from '@services/api/systemService';
import * as commonService from '@services/api/commonService';
import { command, unwrap, unwrapAll, unwrapPaged } from '@services/api/request';
import { driftSide as driftSideCode } from '@domains/common/model/paramModel';
import { downloadFromServer } from '@shared/utils/exportUtil'; // SY-09 · SY-14 전체 다운로드(서버 생성 파일)

/* ═══════ SY-01 계정 관리 ═══════ */

/**
 * 계정 한 건을 화면이 쓰는 모양으로 맞춥니다.
 *
 * 서버는 코드값(`state:'ACTIVE'`, `pos:'ADMIN'`)과 표기값(`stateNm`, `posNm`)을 함께 줍니다.
 * 화면에는 표기값을 쓰고, 판정에는 코드값을 씁니다.
 */
function normalizeUser(u) {
  const state = USER_STATE_CODE[u.state] || u.state || '';
  const stateNm = u.stateNm || USER_STATE_LABEL[state] || u.state || '';
  const reasonNm = state === 'SUSPENDED' ? STATE_REASON_LABEL[u.stateReason] || '' : '';
  return {
    ...u,
    state,
    stateNm,
    /** 화면·엑셀·열 필터가 쓰는 상태 표기 — 「정지 · 퇴사」 처럼 사유를 붙입니다 */
    stateLabel: reasonNm ? `${stateNm} · ${reasonNm}` : stateNm,
    /** 「초기 비밀번호」 열 표기 (ACC-03) */
    /** 「초기 비밀번호」 열 목록 필터 값 — 빈 값 대신 「변경 완료」 로 고를 수 있게 합니다 */
    pwdStateLabel: u.pwdChangeRequired ? '변경 전' : '변경 완료',
    posNm: u.posNm || u.pos || '',
    /** 계정 표·엑셀의 「직급」 표기 — 직급 코드 ADMIN(관리자)은 직급이 아니라 「관리자」 열로 따로 보입니다(2026-10-02) */
    posLabel: isAdminUser(u) ? '' : u.posNm || u.pos || '',
    /** 계정 표·엑셀의 「관리자」 열 — 통합관리자 부서 소속이거나 직급 코드가 ADMIN 인 계정 */
    adminLabel: isAdminUser(u) ? '관리자' : '일반',
    /** 계정 전환 목록에 노출되는 계정인지 (서버 `demo`) */
    switchable: !!(u.switchable ?? u.demo),
    /** 초기 비밀번호를 바꾸기 전인지 (ACC-03, R-04) */
    pwdChangeRequired: !!u.pwdChangeRequired,
    /** 정지 사유 — RETIRED(퇴사) · REJECTED(가입 반려) · ADMIN(관리자 정지). 잠김은 상태 코드 LOCKED 로 옵니다(ACC-05) */
    stateReason: u.stateReason || null,
    lockedAt: u.lockedAt || null,
    emailMasked: u.emailMasked || '',
    remark: u.remark || '',
    /** 가입 경로 (ACC-08) — 서버 `joinSrc` 가 정본. 없으면 비고의 「그룹웨어 자동 가입」 으로만 가립니다 */
    joinSrc: u.joinSrc || (String(u.remark || '').startsWith('그룹웨어 자동 가입') ? 'GROUPWARE' : null),
    joinSrcLabel: JOIN_SRC_LABEL[u.joinSrc || (String(u.remark || '').startsWith('그룹웨어 자동 가입') ? 'GROUPWARE' : '')] || '',
  };
}

/** 관리자 계정인지 — 서버 `superAdmin`(통합관리자 부서) 또는 직급 코드 ADMIN */
const isAdminUser = (u) => !!u.superAdmin || u.pos === 'ADMIN' || u.posNm === '관리자';

/** 가입 경로 표기 (ACC-08) */
export const JOIN_SRC_LABEL = { GROUPWARE: '자동 가입', SIGNUP: '회원가입', ADMIN: '관리자 등록' };

/** 계정 상태 — 서버 코드 · 화면 표기 (LOCKED 는 2026-10-01 AUD-16 · ACC-05) */
const USER_STATE_LABEL = { ACTIVE: '사용', LOCKED: '잠김', SUSPENDED: '정지', PENDING: '승인 대기' };
/** 목 응답처럼 한글 상태가 오면 코드로 되돌립니다 — 판정은 코드값으로 합니다 */
const USER_STATE_CODE = { 사용: 'ACTIVE', 잠김: 'LOCKED', 정지: 'SUSPENDED', '승인 대기': 'PENDING' };
/** 정지 사유 표기 (ACC-05) */
export const STATE_REASON_LABEL = { RETIRED: '퇴사', REJECTED: '반려', ADMIN: '관리자 정지' };

/** 미배정 부서의 고정 허용 화면 (R-11) — 서버 `fixedMenus` 가 없을 때의 예비값입니다 */
export const UNASSIGNED_FIXED_MENUS = ['dash-ai', 'dash-proc', 'prod-monitor', 'ai-chat', 'chat-history'];
/** 미배정 부서 이름 — 서버 `systemRole` 이 아직 없을 때만 이름으로 가립니다(엔진·API 설정 기본값) */
const UNASSIGNED_DEPT_NAME = '미배정';

/**
 * 부서 한 건 — 권한 매트릭스와 같은 이름(`id`·`name`)으로 맞춥니다
 *
 * `systemRole` 은 서버가 계산합니다(ACC-04, `SUPER_ADMIN` | `UNASSIGNED` | null).
 * 서버가 아직 내려주지 않으면 `superAdmin` 과 부서 이름으로 같은 값을 만듭니다.
 */
function normalizeDept(d) {
  const name = d.deptNm ?? d.name ?? '';
  const systemRole = d.systemRole !== undefined
    ? d.systemRole || null
    : d.superAdmin ? 'SUPER_ADMIN' : name === UNASSIGNED_DEPT_NAME ? 'UNASSIGNED' : null;
  const unassigned = systemRole === 'UNASSIGNED';
  return {
    id: d.deptId ?? d.id,
    name,
    desc: d.desc ?? '',
    superAdmin: !!d.superAdmin || systemRole === 'SUPER_ADMIN',
    systemRole,
    /** 권한을 화면에서 바꿀 수 없는 부서 (미배정, R-01·R-11) */
    lockedPerms: d.lockedPerms ?? unassigned,
    fixedMenus: d.fixedMenus || (unassigned ? UNASSIGNED_FIXED_MENUS : null),
    fixedDataFields: d.fixedDataFields || (unassigned ? [] : null),
    userCnt: d.userCnt ?? 0,
    menuCnt: d.menuCnt ?? d.menuPermCnt,
    dataCnt: d.dataCnt ?? d.dataPermCnt,
  };
}

/** 계정 관리 요약만 (ACC-12 — 계정 동작 뒤에는 부서 목록을 다시 부르지 않습니다) */
export const loadAccountSummary = () => unwrap(systemService.getSystemAccountsSummary({}));

export async function loadAccountUsers(params) {
  const result = await unwrapPaged(systemService.getSystemUsers(params));
  return { ...result, items: result.items.map(normalizeUser) };
}
export async function loadAccountPending(params) {
  const result = await unwrapPaged(systemService.getSystemUsersPending(params));
  return { ...result, items: result.items.map(normalizeUser) };
}
export async function loadAccountDepts(params) {
  const result = await unwrapPaged(systemService.getSystemDepts(params));
  return { ...result, items: result.items.map(normalizeDept) };
}
/**
 * 계정·권한 변경 이력 (ACC-09)
 *
 * 조건: `from`·`to`(yyyy-MM-dd, 최대 365일) · `actType`(SYS_PERM_ACT) · `target`(대상 사번).
 * 구분 이름은 서버 `actNm` 을 씁니다. 아직 없으면 화면이 공통코드 SYS_PERM_ACT 로 채웁니다.
 */
export async function loadAccountLogs(params) {
  const result = await unwrapPaged(systemService.getSystemPermLogs(params));
  return { ...result, items: result.items.map(l => ({ ...l, actNm: l.actNm || '', detail: screenIdsToNames(l.detail), byLabel: actorLabel(l) })) };
}

/**
 * 「수행자」 칸 표기 — 「이름 (사번)」 (2026-10-02). 계정 관리 · 메뉴 접근 권한 · 데이터 접근 권한 이력이 같은 모양을 씁니다.
 *
 * 서버 `by` 는 수행자 이름이고, 계정이 지워졌으면 사번, 배치·엔진이면 `SYSTEM` 입니다. `byEmpNo` 는 수행자 사번입니다.
 * 이름을 못 찾아 `by` 가 이미 사번이면(또는 사번이 없으면) 괄호를 붙이지 않습니다 — 「ZT1234 (ZT1234)」 처럼 겹치지 않게.
 */
export function actorLabel(l) {
  const name = l?.by ?? '';
  const empNo = l?.byEmpNo ?? '';
  if (!empNo || String(empNo) === String(name)) return String(name || empNo || '');
  return name ? `${name} (${empNo})` : String(empNo);
}

/** 이력 문장 속 `[chat-history]` 같은 화면 ID 표기를 화면 이름으로 바꿉니다 (ACC-16) */
function screenIdsToNames(text) {
  if (typeof text !== 'string' || !text.includes('[')) return text;
  const names = new Map(permRows().map((r) => [r.id, r.name]));
  return text.replace(/\[([^\]]+)\]/g, (whole, inner) => {
    const ids = inner.split(/\s*,\s*/);
    if (!ids.every((id) => names.has(id))) return whole;
    return `[${ids.map((id) => names.get(id)).join(', ')}]`;
  });
}

/**
 * 계정 편집의 메뉴 선택지 (ACC-16)
 *
 * 규칙 — **이름**은 웹 메뉴 정의(menu.js)로 덮지만 **그룹**은 서버 값(`tb_sys_menu_group.group_nm`,
 * 순서 `sort_seq`)을 그대로 씁니다. 대그룹 이동(R-08 질의 이력 · R-09 용어 사전)은 DB 마이그레이션만으로
 * 선택기에 반영되어야 하기 때문입니다. 서버가 그룹을 주지 않은 화면만 웹 정의의 그룹으로 채웁니다
 * ("기타" 로 몰리지 않게).
 */
export async function loadAccountMenuOptions() {
  const data = await unwrap(systemService.getSystemMenuPerms({}));
  const rows = permRows();
  return {
    ...data,
    screens: data.screens?.map((menu) => {
      const web = rows.find((row) => row.id === menu.id);
      return { ...menu, name: web?.name || menu.name, group: menu.group || web?.group || '기타' };
    }),
  };
}

/** 계정 표 전체 다운로드 상한 (ACC-17, 공통 D-29 권장값) */
export const ACCOUNT_EXPORT_LIMIT = 10000;

/** 계정 전체 — 검색어·필터 없이 size=0 로 다시 받습니다 (ACC-17 「전체 다운로드」, 새 API 없음) */
export const loadAccountUsersAll = () => loadAccountUsers({ page: 1, size: 0 });

/**
 * 회원가입 승인 · 반려
 *
 * 승인하면 `PENDING` → `ACTIVE` 로 바뀌어 그때부터 로그인할 수 있습니다.
 * 반려하면 `SUSPENDED` 가 되며 사유는 감사 로그에 남습니다.
 *
 * @param {string} empNo 대상 사번
 * @param {boolean} approve true 승인 · false 반려
 * @param {string} [reason] 반려 사유
 * @param {number} [deptId] 승인과 함께 정할 부서 (ACC-07, 생략하면 신청 부서)
 */
export const approveSignup = (empNo, approve, reason, deptId) =>
  command(systemService.postSystemUsersByEmpNoApprove({ empNo, approve, reason, ...(approve && deptId ? { deptId: Number(deptId) } : {}) }));
export const createUser = (v) => command(systemService.postSystemUsers(v));
export const updateUser = (v) => command(systemService.putSystemUsersByEmpNo(v));
export const deleteUser = (empNo) => command(systemService.deleteSystemUsersByEmpNo({ empNo }));
/**
 * 계정 삭제 사전 확인 (ACC-11) — 막는 참조와 함께 지워지는 참조의 건수.
 * 서버에 아직 없으면(404) null 을 돌려주고, 모달은 기본 안내만 보입니다.
 * @returns {Promise<{blocking:object, cascade:object, deletable:boolean, joinSrc?:string}|null>}
 */
export async function loadUserDeleteCheck(empNo) {
  const res = await systemService.getSystemUsersByEmpNoDeleteCheck({ empNo });
  return res?.success ? res.data : null;
}
/**
 * 계정 사용/정지
 *
 * 서버는 바꿀 상태를 본문으로 받습니다. 예전엔 empNo 만 보내서
 * "계정 상태가 변경되었습니다" 라는 응답만 오고 실제로는 아무것도 바뀌지 않았습니다.
 *
 * 상태 코드는 ACTIVE · LOCKED · SUSPENDED · PENDING 입니다. LOCKED 로 바꾸는 요청은 서버가 400 으로 막습니다
 * (잠금은 로그인 5회 실패로만 생김, ACC-05). 잠긴 계정을 ACTIVE 로 바꾸면 「관리자 잠금 해제」 입니다 —
 * 실패 횟수가 0 이 되고 첫 로그인에서 비밀번호를 바꿔야 합니다.
 *
 * @param {string} empNo
 * @param {'ACTIVE'|'SUSPENDED'} state 바꿀 상태
 * @param {object} [opts]
 * @param {string} [opts.reason] 정지 사유 (선택, 200자 — remark 와 이력에 남습니다)
 * @param {boolean} [opts.resetPassword] 잠금 해제할 때 비밀번호도 초기 규칙값으로 되돌릴지
 */
export const setUserState = (empNo, state, { reason, resetPassword } = {}) =>
  command(systemService.patchSystemUsersByEmpNoState({
    empNo, state, ...(reason ? { reason } : {}), ...(resetPassword ? { resetPassword: true } : {}),
  }));
export const moveUserDept = (empNo, deptId) => command(systemService.putSystemUsersByEmpNoDept({ empNo, deptId }));
export const createDept = (v) => command(systemService.postSystemDepts(v));
export const updateDept = (deptId, v) => command(systemService.putSystemDeptsByDeptId({ deptId, ...v }));
export const deleteDept = (deptId) => command(systemService.deleteSystemDeptsByDeptId({ deptId }));


/**
 * 권한 매트릭스 응답을 화면이 쓰는 모양으로 맞춥니다. (SY-02 · SY-03 공용)
 *
 * 서버는 부서를 객체 배열로 주고 매트릭스를 부서 ID 로 묶어 줍니다.
 * 화면은 `{ id, name }` 와 ID 로 묶인 매트릭스만 알면 되도록 여기서 한 번 정리합니다(부서 약칭은 2026-10-02 에 없앴습니다).
 *
 * 2026-10-01 (기획 03 MNP-15·16 · 04 DTP-16) — 시스템 부서 잠금과 쓰기 칸을 함께 정리합니다.
 *  · `locked` — 'SUPER_ADMIN'(통합관리자, 전 권한) · 'UNASSIGNED'(미배정, 고정) · null(일반 부서).
 *    판정은 서버 응답(`locked` · `superAdmin` · `unassigned`)만 씁니다. 부서명 문자열로 가리지 않습니다.
 *  · `writeMatrix` — 메뉴 권한의 쓰기 칸(R-06). 키는 matrix 와 같은 부서 ID 문자열입니다.
 *  · 미배정 부서의 데이터 권한은 0건 고정이므로(DTP-16) 응답과 관계없이 빈 목록으로 둡니다 — 이 함수는
 *    메뉴·데이터 공용이라 `kind` 로 구분합니다.
 *
 * @param {object} data 서버 응답 data
 * @param {'menu'|'data'} [kind] 어느 매트릭스인지
 * @returns {object} { ...data, depts:[{id,name,desc,superAdmin,unassigned,locked,userCnt}], matrix, writeMatrix, adminDepts:[id] }
 */
function normalizePermMatrix(data, kind = 'menu') {
  if (!data) return data;
  const depts = (data.depts || []).map((d) => {
    if (typeof d === 'string') return { id: d, name: d, superAdmin: false, unassigned: false, locked: null, userCnt: 0 };
    const superAdmin = !!d.superAdmin || d.locked === 'SUPER_ADMIN';
    const unassigned = !!d.unassigned || d.locked === 'UNASSIGNED';
    return {
      id: d.deptId ?? d.id,
      // 이름이 없으면 id 로 돌아갑니다 — 부서 id 자체가 이름인 원천이 있어,
      // 그대로 두면 권한 표의 열 머리글이 통째로 비어 어느 부서인지 알 수 없습니다
      name: d.deptNm ?? d.name ?? String(d.deptId ?? d.id ?? ''),
      desc: d.desc ?? '',
      superAdmin,
      unassigned,
      locked: d.locked || (superAdmin ? 'SUPER_ADMIN' : unassigned ? 'UNASSIGNED' : null),
      userCnt: d.userCnt ?? 0,
      menuCnt: d.menuCnt,
      dataCnt: d.dataCnt,
    };
  });

  // 매트릭스 키를 부서 ID 문자열로 통일합니다
  const byDept = (source) => {
    const out = {};
    Object.entries(source || {}).forEach(([k, v]) => {
      out[String(k)] = Array.isArray(v) ? v : [];
    });
    return out;
  };
  const matrix = byDept(data.matrix);
  const writeMatrix = byDept(data.writeMatrix);
  if (kind === 'data') depts.filter((d) => d.locked === 'UNASSIGNED').forEach((d) => { matrix[String(d.id)] = []; });

  const adminDepts = data.adminDepts?.length
    ? data.adminDepts.map(String)
    : depts.filter((d) => d.locked === 'SUPER_ADMIN').map((d) => String(d.id));
  // 서버가 adminDepts 만 주고 superAdmin 을 빼먹은 경우에도 잠금이 풀리지 않게 맞춥니다
  depts.forEach((d) => {
    if (!d.locked && adminDepts.includes(String(d.id))) Object.assign(d, { superAdmin: true, locked: 'SUPER_ADMIN' });
  });

  return { ...data, depts, matrix, writeMatrix, adminDepts };
}

/**
 * 대그룹 이름 → 그룹 ID (기획 03 MNP-17 · 4.4.3).
 * 서버 `screens[].groupId` 가 정답이고, 이 표는 그 값이 없는 응답(구 서버·목)에서만 씁니다.
 */
const MENU_GROUP_IDS = {
  'AI 어시스턴트': 'assistant',
  대시보드: 'dashboard',
  '생산 및 품질 관리': 'operation',
  보고서: 'report',
  '자연어 질의 이력': 'history',
  '용어 사전': 'glossary',
  '이상 알림': 'alert',
  시스템관리: 'system',
};
export const menuGroupIdOf = (groupNm) => MENU_GROUP_IDS[groupNm] || null;

/* ═══════ SY-02 메뉴 접근 권한 ═══════ */
export async function loadMenuPerms() {
  const data = await unwrapAll({
    matrix: systemService.getSystemMenuPerms({}),
  });
  return { ...data, matrix: normalizePermMatrix(data.matrix, 'menu') };
}
/*
 * 「제거됨」 (2026-10-01, 기획 03 MNP-13) — 허용 여부 없이 뒤집던 단건·그룹 변경입니다.
 * 호출처가 없고, allowed 를 빼면 서버가 true 로 읽어 해제가 되지 않았습니다. setMenuPerm · setMenuGroupPerm 을 씁니다.
 *   export const toggleMenuPerm = (deptId, screenId) => command(systemService.putSystemMenuPerms({ deptId, screenId }));
 *   export const toggleMenuGroup = (deptId, group, allowed) => command(systemService.putSystemMenuPermsGroup({ deptId, group, allowed }));
 */
/**
 * 메뉴 권한 단건 변경 (허용 여부 명시)
 *
 * 서버 요청 본문은 `deptId · screenId · allowed · perm` 입니다. allowed 를 빼고 보내면
 * 서버가 true 로 간주해 체크 해제가 되지 않았습니다.
 * `perm`(2026-10-01, 기획 03 MNP-16 · 4.4.2) — 'READ' 조회 칸 · 'WRITE' 쓰기 칸.
 *  · READ 해제 = 행 삭제(쓰기도 함께 회수) · WRITE 해제 = 쓰기만 끔 · WRITE 허용 = 조회도 함께 켬
 *
 * @param {number|string} deptId 부서 ID
 * @param {string} screenId 화면 ID
 * @param {boolean} allowed true 허용 · false 해제
 * @param {'READ'|'WRITE'} [perm] 어느 칸인지 (기본 READ)
 */
export const setMenuPerm = (deptId, screenId, allowed, perm = 'READ') =>
  command(systemService.putSystemMenuPerms({ deptId, screenId, allowed, perm }));
/**
 * 메뉴 권한 그룹 일괄 변경 — 요청 1회로 그룹 전체를 바꿉니다(기획 03 MNP-04 · 4.4.3).
 *
 * 본문은 `deptId · groupId · allowed · perm · includeActions` 입니다. 동작 권한 행(업로드 같은 버튼)은
 * 그룹 일괄에서 빼므로 includeActions 는 항상 false 입니다(MNP-05).
 * 그룹에 관리 화면 4종이 들어 있고 요청자가 통합관리자가 아니면 서버가 요청 전체를 409 로 거부합니다(MNP-03).
 *
 * @param {number|string} deptId 부서 ID
 * @param {string} groupId 대그룹 ID (assistant · dashboard · operation · report · history · glossary · alert · system)
 * @param {boolean} allowed true 전체 허용 · false 전체 해제
 * @param {'READ'|'WRITE'} [perm] 어느 칸인지 (기본 READ)
 */
export const setMenuGroupPerm = (deptId, groupId, allowed, perm = 'READ') =>
  command(systemService.putSystemMenuPermsGroup({ deptId, groupId, allowed, perm, includeActions: false }));
/**
 * 부서 권한 복사 — 1단계 미리보기 (기획 03 MNP-01 · 4.4.4)
 *
 * 서버가 대상 부서에 더해질·회수될 화면(조회/쓰기 구분), 영향 계정 수, 관리 화면 변경 여부와
 * 실행에 쓸 `expectedHash` 를 돌려줍니다. 권한은 바뀌지 않습니다.
 *
 * @returns {Promise<{ok:boolean, data:{added[],removed[],adminScreensChanged[],requiresSuperAdmin,expectedHash,from,to}, message, code}>}
 */
export const previewMenuPermCopy = ({ fromDeptId, toDeptId }) =>
  command(systemService.postSystemMenuPermsCopy({ fromDeptId, toDeptId, dryRun: true }));
/**
 * 부서 권한 복사 — 2단계 실행. 미리보기에서 받은 `expectedHash` 를 함께 보냅니다.
 * 미리보기 뒤에 원본·대상 권한이 바뀌었으면 서버가 409 「미리보기 이후 권한이 바뀌었습니다」 로 거부합니다.
 */
export const copyMenuPerm = ({ fromDeptId, toDeptId }, expectedHash) =>
  command(systemService.postSystemMenuPermsCopy({ fromDeptId, toDeptId, dryRun: false, expectedHash }));
/**
 * 권한 변경 이력 — 메뉴 접근 권한(MENU_PERM) · 데이터 접근 권한(DATA_PERM) 화면의 「최근 변경 이력」 카드 (기획 03 MNP-07 · 04 DTP-10)
 * 기존 계정·권한 변경 이력 API 를 그대로 씁니다. 대상 칸의 화면 ID 는 화면 이름으로 바꿔 보입니다.
 *
 * @param {string} actType 'MENU_PERM' · 'DATA_PERM' · 여러 값은 쉼표 (예 'MENU_PERM,USER_MENU_PERM')
 * @param {number} [size] 최근 몇 건 (기본 20)
 */
export async function loadPermChangeLogs(actType, size = 20) {
  const res = await unwrapPaged(systemService.getSystemPermLogs({ actType, page: 1, size }));
  return res.items.map((l, i) => ({
    ...l,
    _key: `${l.ts || ''}|${i}`,
    targetLabel: String(l.target || '').replace(/(^|\s\/\s)([a-z][a-z0-9-]+)$/, (m, sep, id) => {
      const name = permRows().find((r) => r.id === id)?.name;
      return name ? `${sep}${name}` : m;
    }),
    byLabel: actorLabel(l),
    // 구분 이름(actNm, 서버 3단계)을 내용 앞에 붙여 부서 권한과 계정 추가 허용을 나눠 읽게 합니다
    detailLabel: l.actNm && actType.includes(',') ? `[${l.actNm}] ${l.detail || ''}` : (l.detail || ''),
  }));
}

/* ═══════ SY-03 데이터 접근 권한 ═══════ */
/**
 * 데이터 접근 권한 화면 — 부서 × 데이터 항목 표 하나만 씁니다.
 *
 * 적용 미리보기·계정별 적용 결과·데이터 접근 감사 세 카드를 걷어내면서
 * 그 카드만 쓰던 조회 3건(preview · by-user · audit)도 함께 뺐습니다.
 * 서버 API 는 그대로 있습니다 — 이 화면이 부르지 않을 뿐입니다.
 */
export async function loadDataPerms() {
  const data = await unwrap(systemService.getSystemDataPerms({}));
  return normalizePermMatrix(data, 'data') || { fields: [], depts: [], matrix: {}, writeMatrix: {}, adminDepts: [] };
}
/*
 * 「제거됨」 (2026-10-01, 기획 04 DTP-13) — 허용 여부 없이 뒤집던 변경입니다. 호출처가 없어 setDataPerm 으로 대신합니다.
 *   export const toggleDataPerm = (deptId, fieldKey) => command(systemService.putSystemDataPerms({ deptId, fieldKey }));
 */
/**
 * 데이터 권한 변경 (허용 여부 명시) — 서버 본문은 `deptId · fieldKey · allowed` 입니다.
 *
 * @param {number|string} deptId 부서 ID
 * @param {string} fieldKey 데이터 항목 키 (qty · yield · price · customer · plan · mold · worker)
 * @param {boolean} allowed true 허용 · false 해제
 */
export const setDataPerm = (deptId, fieldKey, allowed) =>
  command(systemService.putSystemDataPerms({ deptId, fieldKey, allowed }));

/**
 * 데이터 항목 관리 — 관리 화면은 **미적용 항목까지** 봐야 하므로 /system/data-fields 를 따로 읽습니다.
 * (화면에 실제로 적용되는 목록은 로그인 때 받는 /auth/me 의 dataFields 입니다)
 */
export async function loadDataFields() {
  const data = await unwrap(systemService.getSystemDataFields({}), { fields: [] });
  return {
    ...data,
    fields: data?.fields || data?.items || [],
    // 가릴 수 없는 응답 필드명(로그인·권한 응답·공통 키) — 서버가 정합니다. WEB 에 목록을 따로 두지 않습니다(기획 04 DTP-01)
    reservedAttrs: Array.isArray(data?.reservedAttrs) ? data.reservedAttrs : [],
  };
}
/**
 * 「화면 열 → 종류」 저장 — 요청 1회로 원자 처리합니다 (기획 04 DTP-02 · 4.4.2, 2026-10-01 신규 API)
 *
 * 서버가 한 트랜잭션에서 ① 새 종류 등록 ② 새 종류 부서 허용(통합관리자·미배정 제외) ③ 필드명 이동
 * ④ 명시한 종류만 적용 켜기를 처리하고, 하나라도 실패하면 전부 되돌립니다.
 * 꺼져 있던 종류에 값을 붙여도 자동으로 켜지 않습니다 — 응답 `notApplied` 로 안내합니다(DTP-04).
 *
 * @param {object} p
 * @param {Array<{fieldKey,name,desc,category,grantAllDepts,apply}>} p.newFields 새 종류
 * @param {Array<{attrName,toFieldKey,remark}>} p.moves 필드명 이동 (`toFieldKey:null` = 가리지 않음)
 * @param {string} p.screenId 어느 화면에서 고른 열인지 (감사 기록용)
 * @returns {Promise<{ok, data:{created[],moved[],released[],applied[],notApplied[]}, message, code}>}
 */
export const saveDataFieldMapping = ({ newFields = [], moves = [], screenId }) =>
  command(systemService.putSystemDataFieldsMapping({ newFields, moves, screenId }));
/**
 * 데이터 항목(종류) 등록 — 서버 본문은 `fieldKey · name · desc · category` 입니다.
 * 화면은 `key` 로 들고 있어 이름을 바꿔 보냅니다(예전에는 `key` 를 그대로 보내 서버가 400 으로 거절했습니다).
 */
export const createDataField = ({ key, fieldKey, name, desc, category } = {}) =>
  command(systemService.postSystemDataFields({ fieldKey: fieldKey || key, name, desc, category }));
export const updateDataField = (v) => command(systemService.putSystemDataFieldsByFieldKey(v));
export const removeDataField = (fieldKey) => command(systemService.deleteSystemDataFieldsByFieldKey({ fieldKey }));
/** 응답 필드명 등록 — remark 에 그 이름의 뜻(DB 컬럼 설명)을 남겨 두면 나중에 무엇을 가렸는지 읽을 수 있습니다 */
export const addFieldAttr = (fieldKey, attrName, remark) =>
  command(systemService.postSystemDataFieldsByFieldKeyAttrs({ fieldKey, attrName, remark: remark ? String(remark).slice(0, 200) : undefined }));

export const removeFieldAttr = (fieldKey, attrName) =>
  command(systemService.deleteSystemDataFieldsByFieldKeyAttrsByAttrName({ fieldKey, attrName }));
export const setDataFieldApplied = (fieldKey, on) => command(systemService.patchSystemDataFieldsByFieldKeyApply({ fieldKey, on }));
/**
 * 계정 기준 미리보기 — 그 계정에게 종류별로 원본이 보이는지, 「비공개」 인지 (기획 04 DTP-10)
 * 응답 items[{fieldKey, name, applied, rendered, masked}] — 미적용 종류는 masked:false 입니다.
 * @param {string} empNo 사번
 */
export const previewDataPermFor = (empNo) => unwrap(systemService.getSystemDataPermsPreview({ empNo }), { items: [] });

/* ═══════ SY-04 이상 알림 발송 조건 ═══════ */
// 예전 loadAlertConditions(enabled 필터)는 서버가 모르는 키를 보내던 함수라 지웠습니다(기획 05 ALC-15).
// 화면은 아래 loadAlertConditionsByState 를 씁니다.
/**
 * 감지 지표 선택지 — 지표 기준(ax.tb_met_metric_std) 목록
 *
 * 지표 측정 데이터 관리(SY-13) 화면을 걷어 낼 때(6f66c46) 이 조회까지 함께 지워져
 * 발송 조건 폼의 '감지 지표' 가 비었고, 필수값을 못 채워 등록이 아예 나가지 않았습니다.
 */
export async function loadMetricStandards({ page = 1, size = 200 } = {}) {
  return unwrapAll({ list: systemService.getAlertConditionMetrics({ page, size }) });
}
export const createAlertCondition = (v) => command(systemService.postAlertConditions(v));
export const updateAlertCondition = (condId, v) => command(systemService.putAlertConditionsByCondId({ condId, ...v }));
export const deleteAlertCondition = (condId) => command(systemService.deleteAlertConditionsByCondId({ condId }));
/**
 * 활성/중지 — 바꿀 상태를 본문에 **반드시** 담습니다 (기획 05 ALC-01)
 *
 * 예전엔 본문 없이 보내 서버가 늘 '중지' 로 처리했고, 한 번 멈춘 조건은 화면에서 되살릴 수 없었습니다.
 *
 * @param {number|string} condId 조건 ID
 * @param {boolean} on 바꿀 상태 (true = 활성)
 */
export const toggleAlertCondition = (condId, on) => command(systemService.patchAlertConditionsByCondIdState({ condId, on: !!on }));
export const testAlertCondition = (condId) => command(systemService.postAlertConditionsByCondIdTestSend({ condId }));

/**
 * 발송 조건 상세 — 편집 폼은 목록 행이 아니라 이 응답으로 채웁니다 (기획 05 ALC-04)
 *
 * 목록 행에는 메시지 틀·평가 단위·개별 설비·그룹 ID 가 없거나 이름만 있어, 그것으로 폼을 채워 저장하면
 * 화면에 없는 값이 기본값으로 덮였습니다.
 *
 * @param {number|string} condId 조건 ID
 * @returns {Promise<object>} 상세 응답 (실패하면 예외)
 */
export const loadAlertCondition = (condId) => unwrap(systemService.getAlertConditionsByCondId({ condId }));

/** 엑셀 「전체」 의 서버 상한 — 넘으면 서버가 잘라 meta.truncated 를 줍니다 (기획 05 ALC-17) */
export const ALERT_COND_EXPORT_LIMIT = 1000;

/**
 * 전 조건 — 조회 조건·쪽과 관계없이 (엑셀 「전체」, `size=0`)
 *
 * @returns {Promise<{items:object[], total:number, truncated:boolean}>}
 */
export async function loadAllAlertConditions() {
  const res = await unwrapPaged(systemService.getAlertConditions({ size: 0 }));
  const items = res.items.slice(0, ALERT_COND_EXPORT_LIMIT);
  return { items, total: res.meta?.total ?? res.items.length, truncated: !!res.meta?.truncated || res.items.length > ALERT_COND_EXPORT_LIMIT };
}

/**
 * 개별 설비 검색 — 대상 범위 「개별 설비 선택(PICK)」 의 후보 (기획 05 ALC-05)
 *
 * @param {string} keyword 설비 코드·이름 일부
 * @returns {Promise<Array<{eqptCd:string, eqptNm:string, wcCd?:string}>>}
 */
export async function searchEquipments(keyword) {
  const data = await unwrap(commonService.getCommonMastersEquipments({ keyword: keyword || undefined, size: 50 }), { equipments: [] });
  return data?.equipments || data?.items || [];
}
/**
 * 발송 조건 화면 (상태 필터를 서버 키로)
 *
 * 목록 API 의 상태 필터 파라미터는 `state`(ON | OFF) 입니다.
 * 예전 `enabled` 는 서버가 모르는 키라 조용히 무시되어 '활성/중지' 를 골라도 전체가 나왔습니다.
 *
 * @param {object} p { severity, state:'ON'|'OFF'|undefined, keyword, page, size }
 */
export async function loadAlertConditionsByState({ severity, state, channel, groupId, keyword, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAlertConditionsSummary({}),
    list: systemService.getAlertConditions({ severity, state, channel, groupId, keyword, page, size }),
    groups: systemService.getAlertRecipientGroups({}),
  });
  return { ...data, listMeta: data.metas?.list };
}

/**
 * 승격 규칙 — 발송 조건의 승격 적용(ALC-09)·수신자 화면 안내(RCP-09)가 「대상 그룹이 비었는지」 를 봅니다.
 * 이 화면들은 규칙을 고치지 않습니다(8장 Q-10 · 06 Q-04).
 *
 * @returns {Promise<Array<{stage:number, stageNm:string, targetGroupId:number|null, on:boolean}>>}
 */
export async function loadEscalationRules() {
  const data = await unwrap(systemService.getAlertEscalationRules({}), { stages: [] });
  return data?.stages || data?.items || [];
}

/* ═══════ SY-05 알림 수신자 관리 ═══════ */
// 당번·대리 수신은 2026-09-16 에 걷어냈습니다. 화면은 머리(loadRecipientHead)와 수신자 목록(loadRecipientList)을 따로 부릅니다(RCP-11).

/**
 * 수신자 화면 머리 — 요약·수신 그룹·승격 규칙 (탭과 무관하게 한 번, 기획 06 RCP-11)
 * @param {{includeInactive?:boolean}} p 사용 중지 그룹도 볼지 (RCP-08)
 */
export async function loadRecipientHead({ includeInactive = false } = {}) {
  return unwrapAll({
    summary: systemService.getAlertRecipientsSummary({}),
    groups: systemService.getAlertRecipientGroups(includeInactive ? { includeInactive: true } : {}),
    escalation: systemService.getAlertEscalationRules({}),
  });
}

/**
 * 수신자 목록 — 수신자 탭에서만 부릅니다. 그룹·상태·계정·검색은 서버가 거릅니다 (RCP-11)
 * @param {object} p { groupId, state, userState, keyword, page, size }
 */
export async function loadRecipientList({ groupId, state, userState, keyword, page, size }) {
  return unwrapPaged(systemService.getAlertRecipients({ groupId, state, userState, keyword, page, size }));
}

/**
 * 수신/부재 전환 — 바꿀 상태(RECV | ABSENT)와 사유(비고)를 보냅니다 (RCP-07)
 * @param {string} recipientId
 * @param {'RECV'|'ABSENT'} state
 * @param {string} [reason] 비고(300자)
 */
export const setRecipientState = (recipientId, state, reason) =>
  command(systemService.patchAlertRecipientsByRecipientIdState({ recipientId, state, reason: reason ? String(reason).slice(0, 300) : undefined }));

/** 이 사람이 빠지면 받는 사람이 0명이 되는 그룹·조건 (RCP-07·08) */
export const loadRecipientImpact = (recipientId) => unwrap(systemService.getAlertRecipientsByRecipientIdImpact({ recipientId }));

/**
 * 수신자 삭제 — 영향이 있으면 force 없이 409 + data{zeroGroups, affectedConds} (RCP-08)
 * @param {string} recipientId
 * @param {boolean} [force]
 */
export const deleteRecipient = (recipientId, force = false) =>
  command(systemService.deleteAlertRecipientsByRecipientId({ recipientId, ...(force ? { force: true } : {}) }));

/** 수신 그룹 사용 중지/사용 — 참조 중이면 409 (RCP-08) */
export const setGroupUse = (groupId, on) => command(systemService.patchAlertRecipientGroupsByGroupIdState({ groupId, on: !!on }));
export const createGroup = (v) => command(systemService.postAlertRecipientGroups(v));
/**
 * 수신 그룹 수정 — 보낸 키만 바뀝니다. `memberEmpNos` 는 보낸 그대로 교체되고 빈 배열이면 전원 제외입니다
 * (엔드포인트 `preserveEmpty` 로 빈 값도 실어 보냅니다, 기획 06 RCP-02).
 */
export const updateGroup = (groupId, v) => command(systemService.putAlertRecipientGroupsByGroupId({ groupId, ...v }));
export const testGroup = (groupId) => command(systemService.postAlertRecipientGroupsByGroupIdTestSend({ groupId }));

/**
 * 수신 그룹 상세 — 편집 폼은 이 응답(부서·채널·멤버·부서 선택지)으로 채웁니다 (기획 06 RCP-02)
 *
 * @param {number|string} groupId 그룹 ID
 * @returns {Promise<object>} 상세 응답 (실패하면 예외)
 */
export const loadRecipientGroup = (groupId) => unwrap(systemService.getAlertRecipientGroupsByGroupId({ groupId }));

/** 엑셀 「전체」 상한 — 수신자 5,000 · 수신 그룹 1,000 (기획 06 RCP-16) */
export const RECIPIENT_EXPORT_LIMIT = 5000;
export const GROUP_EXPORT_LIMIT = 1000;

/**
 * 전 수신자 — 그룹·상태 조건과 쪽에 관계없이 (`size=0`)
 * @returns {Promise<{items:object[], total:number, truncated:boolean}>}
 */
export async function loadAllRecipients() {
  const res = await unwrapPaged(systemService.getAlertRecipients({ size: 0 }));
  const items = res.items.slice(0, RECIPIENT_EXPORT_LIMIT);
  return { items, total: res.meta?.total ?? res.items.length, truncated: !!res.meta?.truncated || res.items.length > RECIPIENT_EXPORT_LIMIT };
}

/**
 * 전 수신 그룹 — 사용 중지 그룹 포함 (`includeInactive=true`)
 * @returns {Promise<{items:object[], truncated:boolean}>}
 */
export async function loadAllRecipientGroups() {
  const data = await unwrap(systemService.getAlertRecipientGroups({ includeInactive: true }), { items: [] });
  const list = data?.items || [];
  return { items: list.slice(0, GROUP_EXPORT_LIMIT), truncated: list.length > GROUP_EXPORT_LIMIT };
}

/**
 * 수신자 등록 후보 계정 — 아직 수신자가 아닌 사용 중 계정 (기획 06 RCP-06)
 *
 * 미배정 부서 소속 계정은 서버가 후보에서 뺍니다(결정 R-14). 화면은 받은 그대로 보여 줍니다.
 *
 * @param {string} keyword 이름·사번·부서 일부
 * @returns {Promise<Array<{empNo:string,name:string,dept:string,posNm:string,email:string|null}>>}
 */
export async function searchRecipientCandidates(keyword) {
  const data = await unwrap(systemService.getAlertRecipientsCandidates({ keyword: keyword || undefined, size: 20 }), { items: [] });
  return data?.items || [];
}
export const createRecipient = (v) => command(systemService.postAlertRecipients(v));
export const updateRecipient = (recipientId, v) => command(systemService.putAlertRecipientsByRecipientId({ recipientId, ...v }));
// 예전 toggleRecipientState(본문 없이 뒤집기)는 지웠습니다 — 서버가 state 를 필수로 받습니다(RCP-07). setRecipientState 를 씁니다.

/* ═══════ SY-06 용어 사전 ═══════ */
/** 제거됨 — loadGlossaryByDomain 사용 (분류 키가 domain 이라 필터가 걸리지 않았습니다. 07 GLS-08). 호출부 없음 */
export async function loadGlossary({ keyword, domain, mineOnly, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getGlossarySummary({}),
    terms: systemService.getGlossaryTerms({ keyword, domain, mineOnly, page, size }),
    // 분류는 기준정보입니다. 등록된 용어에서 뽑으면 첫 용어를 만들 수 없습니다
    domains: systemService.getGlossaryDomains({}),
  });
  return { ...data, termsMeta: data.metas?.terms };
}
export const createTerm = (v) => command(systemService.postGlossaryTerms(v));
export const updateTerm = (termId, v) => command(systemService.putGlossaryTermsByTermId({ termId, ...v }));
export const deleteTerm = (termId) => command(systemService.deleteGlossaryTermsByTermId({ termId }));
export const createVariant = (termId, word) => command(systemService.postGlossaryTermsByTermIdVariants({ termId, word }));
export const updateVariant = (variantId, v) => command(systemService.putGlossaryVariantsByVariantId({ variantId, ...v }));
export const deleteVariant = (variantId) => command(systemService.deleteGlossaryVariantsByVariantId({ variantId }));
export const normalizeText = (text) => command(systemService.postGlossaryNormalize({ text }));
export const reindexGlossary = () => command(systemService.postGlossaryReindex({}));
/**
 * 용어 사전 화면 (분류 필터를 서버 키로)
 *
 * 목록 API 의 분류 파라미터는 `domainCd` 입니다. 예전 `domain` 은 서버가 모르는 키라
 * 분류를 골라도 전체가 나왔습니다. '내가 등록한 유사어만'(mineOnly)은 서버 필터입니다(07 GLS-08).
 *
 * @param {object} p { keyword, domainCd, mineOnly, page, size }
 */
export async function loadGlossaryByDomain({ keyword, domainCd, mineOnly, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getGlossarySummary({}),
    terms: systemService.getGlossaryTerms({ keyword, domainCd, mineOnly: mineOnly || undefined, page, size }),
    domains: systemService.getGlossaryDomains({}),
  });
  return { ...data, termsMeta: data.metas?.terms };
}

/**
 * 사전 변경 이력 (07 GLS-07) — termId 를 주면 그 용어만, 없으면 기간 전체
 * @param {object} p { termId, from, to, page, size }
 * @returns {Promise<{items:Array, meta:object}>}
 */
export const loadGlossaryChanges = ({ termId, from, to, page = 1, size = 50 } = {}) =>
  unwrapPaged(systemService.getGlossaryChanges({ termId, from, to, page, size }));

/**
 * 유사어 폼의 공식 용어 후보 (07 GLS-11) — 2자 이상 입력하면 서버 목록 API 로 20건 찾습니다
 * @param {string} keyword
 */
export async function searchGlossaryTerms(keyword) {
  const data = await unwrap(systemService.getGlossaryTerms({ keyword, page: 1, size: 20 }), { items: [] });
  return (data?.items || []).map((t) => ({ termId: t.termId, term: t.term, definition: t.definition, domain: t.domain, blinded: !!t.blinded }));
}

/** 점검 필요 유사어 (07 GLS-03, 통합관리자 전용) */
export async function loadGlossaryRisks() {
  const data = await unwrap(systemService.getGlossaryVariantsRisks({}), { items: [] });
  return data?.items || [];
}

/**
 * 「전체 다운로드」 의 대체 경로 — 서버 생성 내려받기(POST /glossary/terms/export)가 아직 없을 때
 * 조건 없이 사전 전체를 받습니다(size=0). 상한은 컨트롤러가 정합니다.
 */
export async function loadAllGlossaryTerms() {
  const data = await unwrap(systemService.getGlossaryTerms({ size: 0 }), { items: [] });
  return data?.items || [];
}

/* ═══════ SY-08 자연어 질의 이력 ═══════ */
/**
 * 질의 보기 — 요약 + 질의 목록
 * @param {object} p { from, to, group, keyword, page, size }
 */
export async function loadChatHistory({ from, to, group, keyword, rating, review, answered, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAiChatHistorySummary({ from, to, userGroup: group, keyword }),
    // 서버 파라미터는 userGroup 입니다. group 으로 보내면 조용히 무시됩니다
    // 평가·검토·응답 여부(08 CHH-10) — '전체' 는 보내지 않습니다(client 가 거릅니다)
    list: systemService.getAiChatHistory({ from, to, userGroup: group, keyword, rating, review, answered, page, size }),
  });
  return { ...data, listMeta: data.metas?.list };
}

/**
 * 세션 보기 — 요약 + 세션 목록 (08 CHH-18, 결정 R-12)
 * @param {object} p { from, to, group, keyword, page, size }
 */
export async function loadChatSessions({ from, to, group, keyword, rating, review, answered, page, size }) {
  const data = await unwrapAll({
    summary: systemService.getAiChatHistorySummary({ from, to, userGroup: group, keyword }),
    list: systemService.getAiChatHistorySessions({ from, to, userGroup: group, keyword, rating, review, answered, page, size }),
  });
  return { ...data, listMeta: data.metas?.list };
}

/** 세션 상세 — 시간순 대화 (없으면 E-NOTFOUND 로 던집니다) */
export const fetchChatSession = (sessionKey) => unwrap(systemService.getAiChatHistorySessionsBySessionKey({ sessionKey }));

/**
 * 사용자 그룹 선택지 — 기간 중 질의가 있는 부서(08 CHH-10).
 * 이 API 가 아직 없거나 실패하면 부서 목록(/system/depts)으로 대신합니다. 그쪽은 관리 화면 권한이 있어야 열립니다.
 * @returns {Promise<string[]>} 맨 앞이 '전체'
 */
export async function loadChatGroups({ from, to }) {
  try {
    const data = await unwrap(systemService.getAiChatHistoryGroups({ from, to }), { items: [] });
    const names = (data?.items || data?.groups || []).map((g) => g.dept ?? g.deptNm ?? g).filter((v) => typeof v === 'string' && v);
    // 부서가 없는 질의는 서버가 "-" 로 줍니다 — 값은 그대로 두고 이름만 「부서 없음」 으로 보입니다
    if (names.length) return ['전체', ...names.map((n) => (n === '-' ? { value: '-', label: '부서 없음' } : n))];
  } catch {
    /* 대체 경로로 */
  }
  return loadDeptOptions().catch(() => ['전체']);
}

export const fetchChatDetail = (messageId) => unwrap(systemService.getAiChatHistoryByMessageId({ messageId }));
export const rateChatMessage = (messageId, rating) => command(aiService.postAiChatMessagesByMessageIdFeedback({ messageId, rating }));
/** 관리자 검토 저장 — 질의자 평가와 따로 남습니다(08 CHH-04). 쓰기 권한 없음은 403 E-AUTH-004 */
export const reviewChatMessage = (messageId, reviewCd, comment) =>
  command(systemService.putAiChatHistoryByMessageIdReview({ messageId, reviewCd, ...(comment ? { comment } : {}) }));
/** 제거됨 — 학습데이터는 서버 파일로 받습니다(useChatHistoryController.exportTrainset · 08 CHH-03). 호출부 없음 */
export const exportTrainset = (ratingFilter) => command(systemService.postAiChatHistoryExportTrainset({ ratingFilter }));

/* ═══════ SY-09 보안 감사 로그 ═══════ */
/** 보안 감사 로그 — 목록과 페이지 정보를 함께 (건수가 많아 쪽 단위로 봅니다) */
/** 감사 로그 — 서버 파라미터는 userGroup 입니다 (group 으로 보내면 무시됩니다) */
/**
 * 2026-10-01 (09 AUD-12): keyword · ip · result · excludeLoginSuccess 를 더 보냅니다.
 * '로그인 성공 제외' 는 켰을 때만 보냅니다(끈 상태를 false 로 보내 서버 기본값을 덮지 않게).
 */
export const loadAuditLogs = ({ group, excludeLoginSuccess, ...rest }) =>
  unwrapPaged(systemService.getAuditLogs({ ...rest, userGroup: group, ...(excludeLoginSuccess ? { excludeLoginSuccess: true } : {}) }));

/**
 * 「전체 다운로드」 상한 — 기획은 50,000행(09 AUD-07, 공통 D-29 결정 대기)이지만 2026-10-01 2단계 서버는 10,000건에서 자릅니다.
 * 상한은 서버가 정하므로 화면은 이 값을 안내에 쓰지 않고, 서버가 준 X-Export-Truncated · X-Export-Total 로 알립니다.
 */
export const AUDIT_EXPORT_LIMIT = 50000;

/**
 * 감사 로그 전체 내려받기 — 서버가 조건·쪽과 무관한 전체를 xlsx 로 만들고 이력도 서버가 남깁니다(AUD-07).
 * 브라우저에서 쪽을 돌며 모으지 않습니다. 「전체」 이므로 기간·검색어를 보내지 않습니다
 * (서버는 from·to·keyword 를 주면 그것만 보므로, 보내면 「조회 조건 무관 전체」 가 깨집니다).
 * @returns {Promise<boolean>}
 */
export const exportAuditLogsAll = () =>
  downloadFromServer({
    path: '/audit-logs/export',
    body: { scope: 'ALL', menuId: 'sys-audit', format: 'xlsx', condSummary: '전체 · 최근 순' },
    name: '보안 감사 로그',
  });

/**
 * 감사 로그 보존 정책 (09 AUD-11 · AUD-13) — 원천별 건수·경과·아카이브, 배치 일정, 감사 기록 실패 수.
 * 서버 API(GET /audit-logs/retention-policy)가 아직 없으면 null 을 돌려줍니다(화면이 「준비 중」 으로 안내).
 */
export async function fetchAuditRetention() {
  const res = await systemService.getAuditLogsRetentionPolicy({});
  if (res?.success) return res.data || null;
  if (res?.code === 'E-NOTFOUND' || res?.code === 'E-NOT-FOUND') return null;
  const e = new Error(res?.message || '보존 정책을 불러오지 못했습니다.');
  e.code = res?.code;
  throw e;
}

/**
 * 부서 선택지 — 화면에 부서명을 박아 두면 실제 부서명과 달라 조회가 0건이 됩니다.
 * (감사 로그가 '관리자' 를 보내고 있었는데 실제 부서명은 '통합관리자' 였습니다)
 * @returns {Promise<string[]>} 맨 앞이 '전체'
 */
export async function loadDeptOptions() {
  const data = await unwrap(systemService.getSystemDepts({}), { depts: [] });
  const names = (data?.depts || data?.items || []).map((d) => d.deptNm).filter(Boolean);
  return ['전체', ...names];
}

/* ═══════ SY-14 보고서 다운로드 이력 ═══════ */
/**
 * 요약과 목록을 함께 받습니다. 요약에도 같은 조건을 넘겨 카드와 표의 수가 같게 합니다(10 DLG-06).
 * 예전에는 요약을 조건 없이(최근 30일) 불러 「누적」 카드가 표와 어긋났습니다.
 */
export async function loadDownloadLogs(params) {
  const { page, size, ...cond } = params || {};
  const data = await unwrapAll({
    summary: systemService.getDownloadLogsSummary(cond),
    list: systemService.getDownloadLogs(params),
  });
  return { ...data, listMeta: data.metas?.list };
}
export const fetchRetentionPolicy = () => unwrap(systemService.getDownloadLogsRetentionPolicy({}));

/** 내려받기 기록 상세 — 생성 조건(params)·제외된 항목(blindFields) (10 DLG-10) */
export const fetchDownloadLog = (dlId) => unwrap(systemService.getDownloadLogsByDlId({ dlId }));

/** 「전체 다운로드」 상한 — 기획 50,000행(10 DLG-08). 실제 상한은 서버가 정하고 헤더로 알립니다(2단계 서버 10,000) */
export const DL_EXPORT_LIMIT = 50000;

/** 다운로드 이력 전체 내려받기 — 서버 생성 xlsx, 이력은 서버가 남깁니다(DLG-08 · DLG-16). 기간·검색어는 보내지 않습니다(조건 무관 전체) */
export const exportDownloadLogsAll = () =>
  downloadFromServer({
    path: '/download-logs/export',
    body: { scope: 'ALL', menuId: 'sys-dl', format: 'xlsx', condSummary: '전체 · 최근 순' },
    name: '보고서 다운로드 이력',
  });

/* ═══════ SY-15 데이터 연동 이력 ═══════ */
/*
 * 서버 문자열(실행 메시지·작업 비고·오류 메시지)은 화면에 닿기 전에 내부 주소를 한 번 더 가립니다(SYN-05).
 * 서버 가림이 정본이고, 이것은 서버 배포 전·누락 대비입니다. 엑셀(조회 목록)도 이 값을 그대로 씁니다.
 */
// eslint-disable-next-line import/first
import { maskSyncHistory, maskSyncJobDetail } from './syncModel';

/**
 * @param {object} p
 * @param {string} [p.state] SYNC_STATE 코드값 ('전체' 는 client 가 걸러 냅니다)
 * @param {string} [p.from] 기간 시작(yyyy-MM-dd) — 비우면 서버 기본(최근 7일)
 * @param {string} [p.to] 기간 종료
 * 방식(kind)은 서버가 받지 않는 파라미터라 보내지 않습니다(SYN-01 — 「제거됨」).
 */
export async function loadSyncHistory({
  state, from, to, srcTable, runId, driftSide, driftResolved, page, size,
  runState, runSource, runPage = 1, runSize = 20, withDrift = false,
}) {
  const data = await unwrapAll({
    summary: systemService.getSyncJobsSummary({}),
    // srcTable(원본 테이블, SYN-08 — 서버가 대소문자·스키마를 무시) · runId(실행 행 클릭, SYN-09)
    list: systemService.getSyncJobs({ state, from, to, srcTable, runId, page, size }),
    // 엔진 1회 실행 단위. 표 작업까지 가지 못한 실행(원본 접속 실패 등)은 jobs 에 안 남습니다
    // 결과(SYNC_RUN_STATE)·출처(source=MES|GROUPWARE)·기간(작업 이력과 공유)·쪽 (SYN-09)
    runs: systemService.getSyncRuns({ state: runState, source: runSource, from, to, page: runPage, size: runSize }),
    // 연동 정책(getSyncPolicy)은 카드를 걷어내(2026-09-08) 더 부르지 않습니다
    // 연동 매핑은 원본 테이블 선택지라 진입 때 한 번만 받습니다(loadSyncMaps, SYN-10)
    // 스키마 드리프트 — 카드가 숨겨져 있으면 조회하지 않습니다(SYN-10). 카드를 되살리면 withDrift 로 다시 받습니다
    ...(withDrift ? {
      driftSummary: systemService.getSyncSchemaDriftSummary({}),
      drifts: systemService.getSyncSchemaDrift({ side: driftSideCode(driftSide), resolved: driftResolved }),
    } : {}),
  });
  return { ...maskSyncHistory(data), listMeta: data.metas?.list, runsMeta: data.metas?.runs };
}

/** 연동 매핑 — 원본 테이블 선택지·(숨긴) 매핑 카드. 진입 때 한 번만 부르고 폴링에서는 빼 둡니다(SYN-10) */
export const loadSyncMaps = async () => {
  const data = await unwrap(systemService.getSyncMaps({}), { items: [] });
  return Array.isArray(data?.items) ? data.items : [];
};

/**
 * 「전체 다운로드」 — 서버가 만든 xlsx (POST /sync/export, SYN-15). 다운로드 이력도 서버가 남깁니다.
 * 요청 본문만 정합니다. 내려받기 자체는 컨트롤러가 exportUtil.downloadFromServer 로 합니다(Blob 응답).
 * @param {'JOBS'|'RUNS'|'DRIFTS'} target
 */
export const syncExportRequest = (target) => ({
  path: '/sync/export',
  body: { target, scope: 'ALL', menuId: 'sys-sync', condSummary: '조건 무시(전체)' },
});

/** 스키마 드리프트 해소 처리 — 원인이 남아 있으면 다음 배치에서 다시 열립니다 */
export const resolveSchemaDrift = (driftId, note) =>
  command(systemService.postSyncSchemaDriftByDriftIdResolve({ driftId, note }));
export const fetchSyncJob = async (jobId) => maskSyncJobDetail(await unwrap(systemService.getSyncJobsByJobId({ jobId })));
export const retrySyncJob = (jobId) => command(systemService.postSyncJobsByJobIdRetry({ jobId }));
export const runManualSync = (v) => command(systemService.postSyncJobsManual(v));
export const testConnection = () => command(systemService.postSyncConnectionTest({}));

/* ═══════ 추가 함수 (SY-08 · SY-13 · SY-14 — 기존 함수는 그대로 두고 덧붙였습니다) ═══════ */

/**
 * 부서 선택지 (코드값) — 다운로드 이력의 `deptId` 처럼 부서 **ID** 를 받는 조회용.
 * `loadDeptOptions` 는 이름만 돌려주므로 ID 가 필요한 화면은 이것을 씁니다.
 * @returns {Promise<Array<{value:string,label:string}>>}
 */
export async function loadDeptIdOptions() {
  const data = await unwrap(systemService.getSystemDepts({}), { items: [] });
  return (data?.items || data?.depts || [])
    .filter((d) => (d.deptId ?? d.id) != null && (d.deptNm ?? d.name))
    .map((d) => ({ value: String(d.deptId ?? d.id), label: d.deptNm ?? d.name }));
}

/**
 * 제거됨(2026-10, 08 CHH-03) — 파일을 받지 못하고 JSON 응답만 받던 경로입니다. 호출부 없음.
 * 학습데이터 내보내기 — 서버가 받는 항목은 from · to · yearMonth · scope · format 입니다.
 * 카탈로그의 `ratingFilter` 는 서버가 거부합니다(E-VALID-001) → 기간으로 내보냅니다.
 */
export const exportTrainsetByRange = ({ from, to }) =>
  command(systemService.postAiChatHistoryExportTrainset({ from, to, format: 'jsonl' }));

/* ───────── SY-16 업로드 문서 목록 (읽기 전용) ─────────
 * 대시보드 「업로드 리포트」 문서 전체 + 버전 이력(/system/uploads/{docId}/versions). 삭제·편집 API 는 없습니다(버전만 쌓임).
 */

/**
 * 업로드 문서 목록 — { items[], meta, summary, uploaders }
 *
 * 기간(from·to = 최신 버전 업로드일)·파싱 상태·쪽 조건을 서버가 거릅니다(UPD-01).
 * `uploaders` 는 문서 전체 기준이라 업로더 선택지가 조회 결과에 따라 줄지 않습니다(UPD-06).
 * `size=0` 은 전체(10,000건 상한, 넘으면 `meta.truncated`) — 엑셀 「전체 다운로드」 용(UPD-15).
 *
 * 요약(`summary`)은 서버 단계에 따라 두 모양이 옵니다 — 화면 모양 하나로 맞춰 돌려줍니다(normalizeUploadSummary).
 *   · API 2단계(구현됨): `{ total, ok, warn, fail }` — **파싱 상태 조건만 뺀** 지금 조회 조건 기준 (scope 'COND')
 *   · 기획 UPD-07: `{ docCnt, versionCnt, monthVersionCnt, totalBytes, failDocCnt, lastUploadedAt, maxBytesPerFile }` — 조건 무관 전체 (scope 'ALL')
 * 업로더는 2단계 `{ empNo, name, cnt(올린 버전 수) }`, 기획안 `{ userId, userName, docCnt }` 둘 다 받습니다.
 *
 * @param {object} params { keyword, uploadedBy(사번), parseState(OK|WARN|FAIL), from, to, includeDeleted, page, size } ('전체' 는 client 가 걸러 냅니다)
 */
export async function loadSystemUploads(params = {}) {
  const res = await unwrapPaged(systemService.getSystemUploads(params));
  const uploaders = Array.isArray(res.data?.uploaders) ? res.data.uploaders : null;
  return {
    items: res.items,
    meta: res.meta,
    summary: normalizeUploadSummary(res.data?.summary),
    uploaders: uploaders
      ? uploaders.map((u) => ({ userId: String(u.empNo ?? u.userId ?? ''), userName: u.name ?? u.userName ?? '', cnt: u.cnt ?? u.docCnt ?? null }))
        .filter((u) => u.userId)
      : null,
  };
}

/** 업로드 요약 → 화면 모양. 모르는 값은 null(화면은 「—」) */
function normalizeUploadSummary(s) {
  if (!s || typeof s !== 'object') return null;
  const all = s.docCnt !== undefined;
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    scope: all ? 'ALL' : 'COND',
    docCnt: num(s.docCnt ?? s.total) ?? 0,
    byState: { ok: num(s.ok), warn: num(s.warn), fail: num(s.fail) },
    failDocCnt: num(s.failDocCnt ?? s.fail) ?? 0,
    versionCnt: num(s.versionCnt),
    monthVersionCnt: num(s.monthVersionCnt),
    totalBytes: num(s.totalBytes),
    lastUploadedAt: s.lastUploadedAt || null,
    maxBytesPerFile: num(s.maxBytesPerFile),
    // 숨긴 문서 수 (R-19) — docCnt 는 숨김 제외
    deletedDocCnt: num(s.deletedDocCnt),
  };
}

/**
 * 업로드 문서 숨기기 · 복원 (R-19 · D-13) — 소프트 삭제, 원본 파일은 그대로 둡니다.
 * 권한은 sys-upload-doc 쓰기 권한(서버 requireWrite). 이미 숨김/숨기지 않음은 409.
 */
export const hideUploadDoc = (docId, reason) => command(systemService.deleteSystemUploadsByDocId({ docId, reason }));
export const restoreUploadDoc = (docId) => command(systemService.postSystemUploadsByDocIdRestore({ docId }));

/**
 * 버전 이력 (시스템 관리 경로 — dash-ai 권한이 없는 관리자도 볼 수 있습니다)
 * 응답 { docId, title, latestVersion, items[] } 에서 items 를 최신 버전이 먼저 오도록 돌려줍니다.
 */
export async function loadSystemUploadVersions(docId) {
  if (!docId) return [];
  const data = await unwrap(systemService.getSystemUploadsByDocIdVersions({ docId }), { items: [] });
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return [...items].sort((a, b) => Number(b.version) - Number(a.version));
}

/* ═══════ SY-17 그룹웨어 부서 매핑 ═══════ */

/**
 * 그룹웨어 부서 매핑 화면 — 요약 · 매핑 목록 · 미배정 계정 · AX 부서 선택지
 *
 * 부서 선택지에서 '미배정' 부서는 뺍니다. 매핑을 비워 두는 것이 곧 미배정이라,
 * 미배정 부서를 매핑 대상으로 고르게 하면 같은 뜻의 선택지가 둘이 됩니다.
 * 통합관리자 부서도 뺍니다(GWD-02) — 이 화면은 전산팀이 쓰는데, 여기서 통합관리자로 옮기면
 * 권한 상승 경로가 됩니다. 서버도 통합관리자가 아니면 403 으로 막습니다(계정 관리 ACC-02 와 같은 규칙).
 */
/**
 * 조회를 셋으로 나눕니다 (GWD-06) — 요약+부서 / 매핑 전체 / 미배정 계정 전체.
 * 검색어·상태는 브라우저에서 거르므로 입력 중에는 요청이 나가지 않고, 저장 뒤에는 바뀐 목록만 다시 받습니다.
 */
export async function loadGwSummary() {
  const data = await unwrapAll({
    summary: systemService.getSystemGwDeptMapsSummary({}),
    depts: systemService.getSystemDepts({ size: 0 }),
  });
  const unassignedId = data.summary?.unassignedDept?.deptId;
  const depts = (data.depts?.items || [])
    .filter((d) => !d.superAdmin && d.systemRole !== 'SUPER_ADMIN')
    .map((d) => ({ id: d.deptId ?? d.id, name: d.deptNm ?? d.name ?? String(d.deptId ?? d.id ?? '') }))
    .filter((d) => d.id != null && String(d.id) !== String(unassignedId ?? ''));
  return { summary: data.summary, depts, errors: data.errors };
}
/** 매핑 전체 (size=0, 조건 없음) */
export const loadGwMaps = () => unwrapPaged(systemService.getSystemGwDeptMaps({ size: 0 }));
/** 미배정 계정 전체 (size=0, 조건 없음) */
export const loadGwUsers = () => unwrapPaged(systemService.getSystemGwDeptMapsUnassignedUsers({ size: 0 }));

/** 「전체 다운로드」 상한 (GWD-15, 공통 D-29 권장값) */
export const GW_EXPORT_LIMIT = 10000;


/**
 * 매핑 저장. `fromGwDeptNm` 을 주면 그 행(옛 그룹웨어 부서명)의 설정을 새 이름으로 이어받고 옛 행을 지웁니다(GWD-11).
 */
export const saveGwDeptMap = ({ gwDeptNm, deptId, joinYn, remark, fromGwDeptNm }) =>
  command(systemService.putSystemGwDeptMaps({ gwDeptNm, deptId, joinYn, remark, ...(fromGwDeptNm ? { fromGwDeptNm } : {}) }));

/**
 * 최근 매핑 변경 (GWD-10) — 계정·권한 변경 이력 중 그룹웨어 부서 매핑만, 최근 90일.
 * sys-gw-dept 만 가진 사람에게 서버가 이 구분만 열어 줍니다(ACC-09).
 */
export async function loadGwMapLogs({ from, to }) {
  const result = await unwrapPaged(systemService.getSystemPermLogs({ actType: 'GW_DEPT_MAP', from, to, page: 1, size: 100 }));
  return result.items.map((l) => ({ ...l, actNm: l.actNm || '그룹웨어 부서 매핑' }));
}
export const deleteGwDeptMap = (gwDeptNm) => command(systemService.deleteSystemGwDeptMaps({ gwDeptNm }));
/** 재배정 한 번에 보낼 수 있는 사번 수 (GWD-01, 서버 400 기준) */
export const REASSIGN_MAX = 1000;
/**
 * 미배정 계정을 매핑대로 재배정 (GWD-01)
 *
 * 옮길 사번을 **항상 명시**합니다. 예전에는 빈 목록이 요청에서 빠져 서버가 「미배정 전체」 로 읽었고,
 * 검색으로 좁혀 놓고 누른 재배정이 349명 전원을 옮길 수 있었습니다. 이제 서버도 빈 본문을 400 으로 막습니다.
 * 전체를 뜻할 때만 `all: true` 를 보냅니다(검색·열 필터·선택이 하나도 없을 때).
 *
 * @param {{ empNos?: string[], all?: boolean }} target
 */
export const reassignUnassigned = ({ empNos, gwDeptNms, all } = {}) =>
  command(systemService.postSystemGwDeptMapsReassign(
    all ? { all: true } : gwDeptNms?.length ? { gwDeptNms } : { empNos: empNos || [] }
  ));

/**
 * 여러 그룹웨어 부서를 같은 값으로 한 번에 저장 (GWD-05, 서버 한 트랜잭션 — 하나라도 실패하면 0건)
 * @param {{ gwDeptNms: string[], deptId?: number, joinYn: 'Y'|'N' }} body
 */
export const saveGwDeptMapsBulk = (body) => command(systemService.putSystemGwDeptMapsBulk(body));
