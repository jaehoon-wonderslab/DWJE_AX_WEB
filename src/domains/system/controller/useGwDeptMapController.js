/**
 * [Controller] SY-17 그룹웨어 부서 매핑
 *
 * 그룹웨어 인사정보를 받아 올 때 AX 에 없는 사번을 자동으로 가입시키는데(MES 이관 엔진),
 * 그때 들어갈 부서를 이 매핑표(ax.tb_sys_dept_gw_map)로 정합니다. 매핑이 없는 사람은
 * '미배정' 부서로 들어갑니다. 미배정 부서는 대시보드 3개·덕반장 AI·자연어 질의 이력만 조회할 수 있고
 * 데이터 값은 모두 비공개입니다(결정 R-11).
 *
 * 매핑은 가입하는 순간에만 쓰입니다. 매핑을 나중에 고쳐도 이미 가입된 계정의 부서는 그대로라,
 * 미배정으로 들어간 계정은 [매핑대로 재배정] 또는 한 명씩 [부서 지정] 으로 옮깁니다.
 *
 * 2026-10-01 개선 (기획 02_sys-gw-dept)
 *  · GWD-01 재배정 대상 = 선택한 계정, 선택이 없으면 **지금 표에 보이는 계정** 중 제안 부서가 있는 계정.
 *           그 사번을 항상 명시해 보냅니다(빈 본문 = 전체 규칙 폐지).
 *  · GWD-14 쓰기 권한 — 요약 `canWrite`(없으면 접근 권한 · 미배정 여부)가 false 면 쓰기 버튼·선택 칸을 막습니다.
 *  · GWD-15 엑셀은 현재 탭의 「조회 목록(그리드 그대로)」 · 「전체(조건 무시, 상한 10,000)」 두 가지입니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { firstError } from '@services/api/request';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 화면 ID — API 명세 · tb_sys_menu 와 같은 값 */
const SCREEN_ID = 'sys-gw-dept';

/** 매핑 상태 — 서버 코드 → 표기 */
export const GW_MAP_STATES = [
  { value: 'MAPPED', label: '매핑됨' },
  { value: 'UNMAPPED', label: '미배정' },
  { value: 'EXCLUDED', label: '가입 제외' },
];
export const gwStateLabel = (code) => GW_MAP_STATES.find((s) => s.value === code)?.label || code || '—';

/** 폼의 AX 부서 선택지에서 '매핑 없음(미배정)' 을 뜻하는 값 — 빈 값은 요청에서 빠지므로 따로 둡니다 */
export const NO_DEPT = '__NONE__';

/** 미배정 부서 안내 (GWD-08, R-11) */
export const UNASSIGNED_SCOPE = '대시보드·덕반장 AI·질의 이력만 쓸 수 있고 데이터 값은 비공개인';

/**
 * 엑셀 열 — 표 열의 `field` 와 같은 이름입니다(GWD-15). 한 열이 둘로 나뉘기도 합니다(수정 → 일시·수정자).
 * `attr` 는 마스킹 판정에 쓰는 응답 필드명입니다.
 */
const MAP_EXPORT = {
  gwDeptNm: [{ head: '그룹웨어 부서', attr: 'gwDeptNm', value: (m) => `${m.gwDeptNm}${m.inSource === false ? ' (그룹웨어에 없음)' : ''}` }],
  activeCnt: [{ head: '재직 인원', attr: 'activeCnt' }],
  joinedCnt: [{ head: '가입 계정', attr: 'joinedCnt' }],
  unassignedCnt: [{ head: '미배정 계정', attr: 'unassignedCnt' }],
  deptNm: [{ head: '부서', attr: 'deptNm', value: (m) => (m.state === 'EXCLUDED' ? '가입 안 함' : m.deptNm || '') }],
  state: [{ head: '상태', attr: 'state', value: (m) => gwStateLabel(m.state) }],
  remark: [{ head: '메모', attr: 'remark' }],
  updDate: [
    { head: '수정 일시', attr: 'updDate' },
    { head: '수정자', attr: 'updUserNm', value: (m) => m.updUserNm || m.updUser || '' },
  ],
};
const MAP_ORDER = ['gwDeptNm', 'activeCnt', 'joinedCnt', 'unassignedCnt', 'deptNm', 'state', 'remark', 'updDate'];

const USER_EXPORT = {
  empNo: [{ head: '사번', attr: 'empNo' }],
  name: [{ head: '이름', attr: 'name' }],
  gwDeptNm: [{ head: '그룹웨어 부서', attr: 'gwDeptNm' }],
  posNm: [{ head: '직위', attr: 'posNm', value: (u) => u.posNm || u.pos || '' }],
  stateNm: [{ head: '상태', attr: 'stateNm', value: (u) => userStateLabel(u) }],
  pwdChangeRequired: [{ head: '초기 비밀번호', attr: 'pwdChangeRequired', value: (u) => (u.pwdChangeRequired ? '변경 전' : '') }],
  joinedAt: [{ head: '가입 일시', attr: 'joinedAt' }],
  lastLoginAt: [{ head: '최근 로그인', attr: 'lastLoginAt' }],
};
const USER_ORDER = ['empNo', 'name', 'gwDeptNm', 'posNm', 'stateNm', 'pwdChangeRequired', 'joinedAt', 'lastLoginAt'];

/** 배정 계정 탭 엑셀(2026-10-07) — 계정 목록(GET /system/users) 응답 필드 */
const ASSIGNED_EXPORT = {
  empNo: [{ head: '사번', attr: 'empNo' }],
  name: [{ head: '이름', attr: 'name' }],
  dept: [{ head: '부서', attr: 'dept' }],
  posNm: [{ head: '직급', attr: 'posNm' }],
  stateLabel: [{ head: '상태', attr: 'stateLabel' }],
  joinSrcLabel: [{ head: '가입 경로', attr: 'joinSrcLabel' }],
  requestedAt: [{ head: '가입 일시', attr: 'requestedAt' }],
  lastLoginAt: [{ head: '최근 로그인', attr: 'lastLoginAt' }],
};
const ASSIGNED_ORDER = ['empNo', 'name', 'dept', 'posNm', 'stateLabel', 'joinSrcLabel', 'requestedAt', 'lastLoginAt'];
/** 탭별 엑셀 이름 · 열 정의 */
const TAB_EXPORT = {
  map: { name: '그룹웨어 부서 매핑', spec: MAP_EXPORT, order: MAP_ORDER, key: 'gwDeptNm' },
  users: { name: '미배정 계정', spec: USER_EXPORT, order: USER_ORDER, key: 'empNo' },
  assigned: { name: '배정 계정', spec: ASSIGNED_EXPORT, order: ASSIGNED_ORDER, key: 'empNo' },
};

/** 미배정 계정 상태 표기 (GWD-12) — 그룹웨어 원천에서 사라진 정지 계정은 「퇴사」 */
export const userStateLabel = (u) => (u.retired || u.stateReason === 'RETIRED' ? '퇴사' : u.stateNm || USER_STATE_NM[u.state] || u.state || '');
const USER_STATE_NM = { ACTIVE: '사용', LOCKED: '잠김', SUSPENDED: '정지', PENDING: '승인 대기' };
/** 미배정 탭 상태 선택지 (GWD-12) — 브라우저에서 거릅니다 */
export const USER_STATE_FILTER = [
  { value: '전체', label: '전체' },
  { value: 'ACTIVE', label: '사용' },
  { value: 'LOCKED', label: '잠김' },
  { value: 'SUSPENDED', label: '정지' },
];
/** 재배정 건너뜀 사유 (서버 skipped[].reason) */
export const SKIP_REASON_LABEL = {
  NOT_FOUND: '계정 없음', NOT_UNASSIGNED: '미배정 아님', SUSPENDED: '정지', NO_SUGGESTION: '매핑 없음', SUPER_ADMIN_SUGGESTED: '통합관리자 부서',
};
/** 동기화가 멈췄다고 볼 시간 (GWD-09) — 하루 1회 실행 + 여유 2시간 */
const SYNC_STALE_HOURS = 26;
/** 사업장 표시 「(A)」·「(M)」 를 뗀 이름 (GWD-11 이름이 비슷한 순 정렬) */
const baseName = (n) => String(n || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 표 인스턴스에서 보이는 열(field) 순서 — 선택 칸·관리 열은 뺍니다 */
function visibleFields(table, spec) {
  if (!table) return null;
  return table.getColumns()
    .filter((c) => c.isVisible() && c.getDefinition().title !== '관리')
    .map((c) => c.getField())
    .filter((f) => f && spec[f]);
}

function buildSheet(spec, order, rows) {
  const cols = order.flatMap((f) => spec[f] || []);
  return {
    head: cols.map((c) => c.head),
    attrs: cols.map((c) => c.attr),
    rows: rows.map((r) => cols.map((c) => (c.value ? c.value(r) : r[c.attr] ?? ''))),
  };
}

const EMPTY = [];
/** 검색 입력이 멈춘 뒤 거르기까지 (GWD-06) */
const SEARCH_DEBOUNCE_MS = 300;
const keysOf = (rows, key) => rows.map((r) => r[key]).join('\u0001');

/** 조회 실패 문구 — 오류 코드별로 원인을 알립니다 (GWD-03) */
function loadErrorText(err) {
  if (!err) return '';
  if (err.code === 'E-NOTFOUND') return `일부 목록을 받지 못했습니다 — API 서버에 그룹웨어 부서 매핑 API 가 아직 배포되지 않았습니다(404). ${err.message || ''}`.trim();
  if (err.code === 'E-AUTH-002') return '일부 목록을 받지 못했습니다 — 이 화면의 조회 권한이 없습니다(403). 전산팀에 요청하세요.';
  if (err.code === 'E-TIMEOUT') return `일부 목록을 받지 못했습니다 — ${err.message}`;
  return `일부 목록을 받지 못했습니다 — ${err.message || '서버 오류'}`;
}

export function useGwDeptMapController() {
  const toast = useUiStore((state) => state.toast);
  useAuthStore((state) => state.menuPerms); // 쓰기 권한이 바뀌면 다시 그립니다
  useAuthStore((state) => state.unassigned);
  const storeCanWrite = useAuthStore((state) => state.canWrite);
  const me = useAuthStore((state) => state.userInfo);
  const can = useAuthStore((state) => state.can);
  useAuthStore((state) => state.menuPerms);

  const [tab, setTab] = useState('map');
  // 검색 — 입력값과 적용값을 나눕니다. 입력을 멈추고 300ms 뒤 브라우저에서 거릅니다(GWD-06, 요청 없음)
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeywordApplied] = useState('');
  const [userKeywordInput, setUserKeywordInput] = useState('');
  const [userKeyword, setUserKeywordApplied] = useState('');
  const [state, setState] = useState('전체');
  const [userState, setUserState] = useState('전체');
  const [selectedMaps, setSelectedMaps] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  /** 배정 계정 탭에서 체크한 사번(2026-10-07) */
  const [selectedAssigned, setSelectedAssigned] = useState([]);
  const timers = useRef({});
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  const debounced = (key, apply) => (v) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => apply(String(v || '').trim()), SEARCH_DEBOUNCE_MS);
  };
  const setKeyword = (v) => { setKeywordInput(v); debounced('map', setKeywordApplied)(v); };
  const setUserKeyword = (v) => { setUserKeywordInput(v); debounced('user', setUserKeywordApplied)(v); };

  /* 조회 셋 (GWD-06) — 요약+부서 / 매핑 전체 / 미배정 전체. 검색·상태는 아래에서 거릅니다 */
  const sumQ = useAsync(() => repo.loadGwSummary(), []);
  const mapsQ = useAsync(() => repo.loadGwMaps(), []);
  const usersQ = useAsync(() => repo.loadGwUsers(), []);
  /**
   * 배정 계정(2026-10-07) — 미배정이 아닌 부서의 계정. 계정 목록 API 는 계정 관리 조회 권한이 있어야 해서,
   * 그 권한이 없으면 부르지 않고 탭 안에 안내만 둡니다(화면 위 「일부 목록을 받지 못했습니다」 로 올리지 않음).
   */
  const canSeeAccounts = can('sys-account');
  const assignedQ = useAsync(() => (canSeeAccounts ? repo.loadGwAssignedUsers() : Promise.resolve({ items: [] })), [canSeeAccounts], { silent: true });
  const allMaps = mapsQ.data?.items || EMPTY;
  const allUsers = usersQ.data?.items || EMPTY;
  const depts = sumQ.data?.depts || EMPTY;
  const summary = sumQ.data?.summary;
  const loading = sumQ.loading && !sumQ.data;
  const loadError = firstError(sumQ.data) || errOf(mapsQ.error) || errOf(usersQ.error);
  // logsQ 는 아래에서 만듭니다 — 함수 안에서 늦게 읽으므로 참조만 둡니다
  const logsReload = useRef(() => {});
  const reload = useCallback(() => { sumQ.reload(); mapsQ.reload(); usersQ.reload(); assignedQ.reload(); logsReload.current(); }, [sumQ.reload, mapsQ.reload, usersQ.reload, assignedQ.reload]);
  const unassignedDeptId = summary?.unassignedDept?.deptId;
  const unassignedDeptNm = summary?.unassignedDept?.deptNm || '미배정';
  const assigned = useMemo(() => (assignedQ.data?.items || EMPTY).filter((u) => (
    unassignedDeptId != null ? String(u.deptId) !== String(unassignedDeptId) : u.dept !== unassignedDeptNm
  )), [assignedQ.data, unassignedDeptId, unassignedDeptNm]);

  const maps = useMemo(() => {
    const kw = keyword.toLowerCase();
    return allMaps.filter((m) => (state === '전체' || m.state === state)
      && (!kw || `${m.gwDeptNm} ${m.deptNm || ''} ${m.remark || ''}`.toLowerCase().includes(kw)));
  }, [allMaps, keyword, state]);
  const users = useMemo(() => {
    const kw = userKeyword.toLowerCase();
    return allUsers.filter((u) => (userState === '전체' || u.state === userState)
      && (!kw || `${u.empNo} ${u.name} ${u.gwDeptNm || ''}`.toLowerCase().includes(kw)));
  }, [allUsers, userKeyword, userState]);

  /* 최근 매핑 변경 (GWD-10) — 최근 90일, 접힌 카드와 지정 모달에서 씁니다 */
  const logsQ = useAsync(() => {
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 90);
    return repo.loadGwMapLogs({ from: ymd(from), to: ymd(to) });
  }, [], { silent: true });
  const mapLogs = logsQ.data || EMPTY;
  logsReload.current = logsQ.reload;

  /* 동기화 상태 (GWD-09) */
  const sync = useMemo(() => {
    const last = summary?.lastSync || (summary?.lastSyncAt ? { startedAt: summary.lastSyncAt, stateCd: null, joinSummary: summary.lastJoinMessage } : null);
    const at = last?.startedAt ? new Date(String(last.startedAt).replace(' ', 'T')) : null;
    const stale = !!at && !Number.isNaN(at.getTime()) && (Date.now() - at.getTime()) / 3600000 > SYNC_STALE_HOURS;
    return { last, lastJoin: summary?.lastJoin || null, stale };
  }, [summary]);

  /** 쓰기 권한 (GWD-14, R-06) — 요약 값이 정본. 없으면 접근 권한 · 미배정 여부, 통합관리자는 항상 통과(CMN-06) */
  const canWrite = typeof summary?.canWrite === 'boolean' ? summary.canWrite : !!me?.superAdmin || storeCanWrite(SCREEN_ID);

  /* ───────── 표에 보이는 행 (GWD-01 · GWD-15) ───────── */
  const mapTableRef = useRef(null);
  const userTableRef = useRef(null);
  const assignedTableRef = useRef(null);
  const [visibleMaps, setVisibleMapsState] = useState(null);
  const [visibleUsers, setVisibleUsersState] = useState(null);
  // 같은 행이면 상태를 바꾸지 않습니다 — 표가 자료를 갈아 끼울 때마다 알려 오므로 그대로 두면 서로를 부릅니다
  const setVisibleMaps = useCallback((rows) => setVisibleMapsState((prev) => (prev && keysOf(prev, 'gwDeptNm') === keysOf(rows, 'gwDeptNm') ? prev : rows)), []);
  const setVisibleUsers = useCallback((rows) => setVisibleUsersState((prev) => (prev && keysOf(prev, 'empNo') === keysOf(rows, 'empNo') ? prev : rows)), []);
  const [visibleAssigned, setVisibleAssignedState] = useState(null);
  const setVisibleAssigned = useCallback((rows) => setVisibleAssignedState((prev) => (prev && keysOf(prev, 'empNo') === keysOf(rows, 'empNo') ? prev : rows)), []);
  const shownAssigned = visibleAssigned ?? assigned;
  const shownUsers = visibleUsers ?? users;
  const shownMaps = visibleMaps ?? maps;

  /** 재배정 대상 (GWD-01) — 선택이 있으면 선택, 없으면 지금 보이는 행 */
  const reassignTarget = useMemo(() => {
    const bySelect = selectedUsers.length > 0;
    const pool = bySelect ? allUsers.filter((u) => selectedUsers.includes(u.empNo)) : shownUsers;
    const movable = pool.filter((u) => u.suggestDeptId != null);
    const byDept = {};
    movable.forEach((u) => { byDept[u.suggestDeptNm || String(u.suggestDeptId)] = (byDept[u.suggestDeptNm || String(u.suggestDeptId)] || 0) + 1; });
    return {
      mode: bySelect ? 'selected' : 'visible',
      poolCnt: pool.length,
      movable,
      byDept: Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([deptNm, cnt]) => ({ deptNm, cnt })),
      // 검색·열 필터·선택이 하나도 없을 때만 「전체」 로 보낼 수 있습니다
      unfiltered: !bySelect && !userKeyword && shownUsers.length === allUsers.length,
    };
  }, [selectedUsers, allUsers, shownUsers, userKeyword]);

  const after = useCallback(
    (res) => {
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  /** 폼 값 → 요청 본문. 가입 제외면 AX 부서는 의미가 없어 비웁니다 */
  const toBody = (gwDeptNm, v) => ({
    gwDeptNm,
    deptId: v.joinYn === 'N' || v.deptId === NO_DEPT ? undefined : v.deptId,
    joinYn: v.joinYn === 'N' ? 'N' : 'Y',
    remark: v.remark,
  });

  /** 그룹웨어 부서 하나의 미배정 계정 — 매핑 모달의 「저장 후 옮기기」 안내 (GWD-04) */
  const unassignedOf = useCallback((gwDeptNm) => {
    const list = allUsers.filter((u) => u.gwDeptNm === gwDeptNm);
    return { cnt: list.length, pwdInitCnt: list.filter((u) => u.pwdChangeRequired).length };
  }, [allUsers]);

  /**
   * 한 부서 저장 (GWD-04) — 「저장 후 이 부서 미배정 계정도 옮기기」 를 고르면 저장에 이어
   * 그 그룹웨어 부서의 미배정 계정을 매핑대로 옮기고(reassign gwDeptNms) 결과를 한 문장으로 알립니다.
   * 초기 비밀번호 계정도 옮깁니다(R-05) — 옮겨도 첫 로그인 때 비밀번호를 바꿔야 그 부서 화면을 씁니다.
   */
  const saveMap = async (gwDeptNm, v) => {
    const res = await repo.saveGwDeptMap(toBody(gwDeptNm, v));
    if (!res.ok) { toast(res.message); return res; }
    const moveToo = (v.moveToo || []).includes('Y') && v.joinYn !== 'N' && v.deptId !== NO_DEPT && v.deptId != null;
    if (!moveToo) { toast(res.message); reload(); return res; }
    const moved = await repo.reassignUnassigned({ gwDeptNms: [gwDeptNm] });
    toast(moved.ok
      ? `매핑을 저장했고 이 부서 미배정 계정 ${moved.data?.movedCnt ?? 0}명을 옮겼습니다.${moved.data?.skippedCnt ? ` 건너뜀 ${moved.data.skippedCnt}명.` : ''}`
      : `매핑은 저장했지만 계정을 옮기지 못했습니다 — ${moved.message}`);
    reload();
    return { ...res, moved: moved.data };
  };

  /**
   * 고른 부서 여러 개를 같은 값으로 저장합니다 (GWD-05) — 서버 한 트랜잭션(하나라도 오류면 0건).
   * 서버에 일괄 API 가 아직 없으면(404) 예전처럼 한 건씩 저장하고, 실패하면 그 자리에서 멈춥니다.
   */
  const saveMapsBulk = async (gwDeptNms, v) => {
    const body = { gwDeptNms, joinYn: v.joinYn === 'N' ? 'N' : 'Y', ...(v.joinYn !== 'N' && v.deptId !== NO_DEPT && v.deptId != null ? { deptId: v.deptId } : {}) };
    const bulk = await repo.saveGwDeptMapsBulk(body);
    if (bulk.ok || bulk.code !== 'E-NOTFOUND') {
      toast(bulk.ok ? bulk.message || `${gwDeptNms.length}개 부서 매핑을 저장했습니다. 이미 가입된 계정의 부서는 바뀌지 않습니다.` : `${bulk.message} (아무것도 저장하지 않았습니다)`);
      if (bulk.ok) { setSelectedMaps([]); reload(); }
      return bulk;
    }
    let done = 0;
    for (const gwDeptNm of gwDeptNms) {
      // 일괄 지정에서는 메모를 건드리지 않습니다 — 행마다 적어 둔 근거가 지워지면 안 됩니다
      const row = allMaps.find((m) => m.gwDeptNm === gwDeptNm);
      const res = await repo.saveGwDeptMap(toBody(gwDeptNm, { ...v, remark: row?.remark }));
      if (!res.ok) {
        toast(`${done}건 저장 후 '${gwDeptNm}' 에서 멈췄습니다 — ${res.message}`);
        reload();
        return res;
      }
      done += 1;
    }
    toast(`${done}건을 저장했습니다. 이미 가입된 계정의 부서는 바뀌지 않습니다.`);
    setSelectedMaps([]);
    reload();
    return { ok: true };
  };

  const removeMap = async (gwDeptNm) => after(await repo.deleteGwDeptMap(gwDeptNm));

  /**
   * 미배정 계정을 지금 매핑대로 옮깁니다 (GWD-01)
   * 옮길 사번을 명시해 보내고, 결과(옮김·건너뜀)를 돌려줍니다. 대상이 없으면 요청을 보내지 않습니다.
   */
  const reassign = async () => {
    const { movable, unfiltered } = reassignTarget;
    if (!movable.length) return { ok: false, message: '옮길 계정이 없습니다.' };
    let target;
    if (movable.length <= repo.REASSIGN_MAX) target = { empNos: movable.map((u) => u.empNo) };
    else if (unfiltered) target = { all: true };
    else {
      toast(`한 번에 ${repo.REASSIGN_MAX.toLocaleString('ko-KR')}명까지 옮길 수 있습니다. 검색으로 좁히거나 계정을 골라 주세요.`);
      return { ok: false };
    }
    // 결과 엑셀에 이름을 넣으려고 옮기기 전 목록을 잡아 둡니다(재조회하면 미배정 목록에서 빠집니다)
    const before = new Map(allUsers.map((u) => [u.empNo, u]));
    const res = after(await repo.reassignUnassigned(target));
    if (res.ok) {
      setSelectedUsers([]);
      res.data = { ...res.data, items: (res.data?.items || []).map((it) => ({ ...it, name: it.name || before.get(it.empNo)?.name || '', gwDeptNm: it.gwDeptNm || before.get(it.empNo)?.gwDeptNm || '' })) };
    }
    return res;
  };

  /** 재배정 결과 「옮긴 목록 엑셀」 (GWD-07) — 패널과 별개, 이력 범위 VIEW · 조건 「재배정 결과」 */
  const exportReassignResult = useCallback((data) => downloadXls({
    name: '재배정 결과',
    head: ['사번', '이름', '그룹웨어 부서', '옮긴 부서'],
    attrs: ['empNo', 'name', 'gwDeptNm', 'deptNm'],
    rows: (data?.items || []).map((it) => [it.empNo, it.name || '', it.gwDeptNm || '', it.deptNm || '']),
    scope: 'VIEW',
    condSummary: '재배정 결과',
    menuId: SCREEN_ID,
  }), []);

  /** 한 명을 직접 고른 부서로 옮깁니다 — 계정 관리의 부서 이동과 같은 API. 403 은 「미배정 계정만」 안내 */
  const moveUser = async (empNo, deptId) => {
    const res = await repo.moveUserDept(empNo, deptId);
    if (!res.ok && res.code === 'E-AUTH-002') return after({ ...res, message: `미배정 계정만 옮길 수 있습니다. ${res.message || ''}`.trim() });
    return after(res);
  };

  /**
   * 체크한 여러 명을 같은 부서로 옮깁니다(2026-10-02). 일괄 API 가 없어 한 명씩(PUT /system/users/{empNo}/dept) 차례로 부르고,
   * 다 끝난 뒤 한 번만 다시 조회합니다. 실패한 사람은 사번과 사유를 돌려줍니다.
   * @returns {Promise<{ok:boolean, moved:number, failed:Array<{empNo:string,name:string,message:string}>}>}
   */
  const moveUsers = async (empNos, deptId) => {
    let moved = 0;
    const failed = [];
    for (const empNo of empNos) {
      // eslint-disable-next-line no-await-in-loop
      const res = await repo.moveUserDept(empNo, deptId);
      if (res.ok) moved += 1;
      else {
        const name = allUsers.find((u) => u.empNo === empNo)?.name || '';
        failed.push({ empNo, name, message: res.code === 'E-AUTH-002' ? '미배정 계정만 옮길 수 있습니다' : res.message || '실패' });
      }
    }
    toast(failed.length ? `${moved}명을 옮겼고 ${failed.length}명은 옮기지 못했습니다.` : `${moved}명을 옮겼습니다.`);
    if (moved) { setSelectedUsers([]); reload(); }
    return { ok: !failed.length, moved, failed };
  };

  /**
   * 배정 계정 일괄 부서 변경(2026-10-07) — 체크한 사람을 고른 부서 하나로 옮깁니다. 한 명씩 PUT /system/users/{empNo}/dept.
   * 서버는 이미 부서가 있는 계정을 옮길 때 계정 관리 쓰기 권한을 보고, 본인 부서 변경(409)·통합관리자 부서 배정(403)을 막습니다.
   * 실패한 사람은 사번과 사유를 돌려줍니다.
   */
  const moveAssigned = async (empNos, deptId) => {
    let moved = 0;
    const failed = [];
    for (const empNo of empNos) {
      // eslint-disable-next-line no-await-in-loop
      const res = await repo.moveUserDept(empNo, deptId);
      if (res.ok) moved += 1;
      else {
        const name = assigned.find((u) => u.empNo === empNo)?.name || '';
        failed.push({ empNo, name, message: res.code === 'E-AUTH-002' ? '계정 관리 쓰기 권한이 필요합니다' : res.message || '실패' });
      }
    }
    toast(failed.length ? `${moved}명의 부서를 바꿨고 ${failed.length}명은 바꾸지 못했습니다.` : `${moved}명의 부서를 바꿨습니다.`);
    if (moved) { setSelectedAssigned([]); reload(); }
    return { ok: !failed.length, moved, failed };
  };

  /** 이름 변경 이어받기 후보 (GWD-11) — 매핑 행이 없는 그룹웨어 부서, 사업장 표시를 뗀 이름이 같은 것 먼저 */
  const inheritCandidates = useCallback((oldName) => {
    const base = baseName(oldName);
    const common = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i += 1; return i; };
    return allMaps
      .filter((m) => !m.hasRow && m.inSource !== false && m.gwDeptNm !== oldName)
      .map((m) => ({ ...m, score: (baseName(m.gwDeptNm) === base ? 1000 : 0) + common(baseName(m.gwDeptNm), base) }))
      .sort((a, b) => b.score - a.score || a.gwDeptNm.localeCompare(b.gwDeptNm, 'ko'));
  }, [allMaps]);

  /** 이어받기 (GWD-11) — 옛 행의 AX 부서·가입 여부·메모를 새 이름으로 옮기고 옛 행을 지웁니다(서버 한 트랜잭션) */
  const inheritMap = async (oldRow, newName) => after(await repo.saveGwDeptMap({
    gwDeptNm: newName, fromGwDeptNm: oldRow.gwDeptNm, deptId: oldRow.deptId ?? undefined, joinYn: oldRow.joinYn === 'N' ? 'N' : 'Y', remark: oldRow.remark,
  }));

  /** 한 그룹웨어 부서의 최근 이력 3건 (지정 모달) */
  const logsOf = useCallback((gwDeptNm) => mapLogs.filter((l) => l.target === gwDeptNm || String(l.detail || '').includes(gwDeptNm)).slice(0, 3), [mapLogs]);

  /** 매핑 표의 「미배정 계정」 숫자를 누르면 그 그룹웨어 부서로 미배정 탭을 엽니다 (GWD-06) */
  const openUsersOf = (gwDeptNm) => {
    setVisibleMapsState(null); setVisibleUsersState(null);
    setUserKeywordInput(gwDeptNm); setUserKeywordApplied(gwDeptNm);
    setTab('users');
  };

  /* ───────── 엑셀 (GWD-15) ───────── */
  const tabExport = TAB_EXPORT[tab] || TAB_EXPORT.map;
  const tabName = tabExport.name;
  const exportView = useCallback(async () => {
    const isUsers = tab === 'users';
    const isAssigned = tab === 'assigned';
    const table = (isAssigned ? assignedTableRef : isUsers ? userTableRef : mapTableRef).current;
    const { spec, order } = tabExport;
    let rows = isAssigned ? shownAssigned : isUsers ? shownUsers : shownMaps;
    let sorters = [];
    try {
      if (table) {
        rows = table.getData('active');
        sorters = table.getSorters().map((x) => `정렬 ${spec[x.field]?.[0]?.head || x.field}${x.dir === 'desc' ? '↓' : '↑'}`);
      }
    } catch { /* 표가 정리되는 중이면 보관한 행을 씁니다 */ }
    const fields = visibleFields(table, spec) || order;
    const sheet = buildSheet(spec, fields, rows);
    const cond = [
      `탭=${tabName}`,
      isAssigned ? '' : isUsers ? (userKeyword ? `검색어=${userKeyword}` : '') : (keyword ? `검색어=${keyword}` : ''),
      !isUsers && !isAssigned && state !== '전체' ? `상태=${gwStateLabel(state)}` : '',
      ...sorters,
    ].filter(Boolean).join(' · ');
    downloadXls({ name: tabName, ...sheet, scope: 'VIEW', condSummary: cond, menuId: SCREEN_ID });
  }, [tab, tabName, tabExport, shownAssigned, shownUsers, shownMaps, userKeyword, keyword, state]);

  /** 전체 — 이미 조건 없이 받아 둔 전량을 씁니다(GWD-06 이후 목록은 늘 전량) */
  const exportAll = useCallback(async () => {
    const items = tab === 'assigned' ? assigned : tab === 'users' ? allUsers : allMaps;
    const limit = repo.GW_EXPORT_LIMIT;
    if (items.length > limit) toast(`상한 ${limit.toLocaleString('ko-KR')}건까지 내려받았습니다`);
    const sheet = buildSheet(tabExport.spec, tabExport.order, items.slice(0, limit));
    downloadXls({ name: tabName, ...sheet, scope: 'ALL', condSummary: `탭=${tabName} · 전체(조건 무시)`, menuId: SCREEN_ID });
  }, [tab, tabName, tabExport, toast, assigned, allUsers, allMaps]);

  return {
    loading,
    loadError,
    loadErrorText: loadErrorText(loadError),
    summary,
    /** 원천·미배정 부서 상태 (GWD-03) — 서버가 아직 주지 않으면 null */
    health: summary?.health || null,
    canWrite,
    maps,
    users,
    /** 탭 건수는 검색과 무관한 전체 수입니다 (GWD-06) */
    mapTotal: allMaps.length,
    userTotal: allUsers.length,
    /** 배정 계정 탭(2026-10-07) — 미배정이 아닌 부서의 계정. 계정 관리 조회 권한이 없으면 목록을 부르지 않습니다 */
    assigned,
    assignedTotal: canSeeAccounts ? assigned.length : undefined,
    assignedLoading: assignedQ.loading && !assignedQ.data,
    assignedError: !canSeeAccounts ? '배정 계정 목록은 계정 관리 조회 권한이 있어야 볼 수 있습니다.'
      : assignedQ.error ? `배정 계정 목록을 받지 못했습니다 — ${assignedQ.error.message || '서버 오류'}` : '',
    selectedAssigned,
    setSelectedAssigned,
    assignedTableRef,
    setVisibleAssigned,
    moveAssigned,
    /** 표 재조회 중 — 카드 부제 「갱신 중…」 */
    refreshing: mapsQ.loading || usersQ.loading || (canSeeAccounts && assignedQ.loading),
    depts,
    tab,
    // 탭을 바꾸면 표가 새로 만들어지므로 보관한 「보이는 행」 을 비웁니다(새 표가 다시 알려 줍니다)
    setTab: (next) => { setVisibleMapsState(null); setVisibleUsersState(null); setVisibleAssignedState(null); setTab(next); },
    filters: { keyword: keywordInput, state, userKeyword: userKeywordInput, userState },
    setUserState,
    /** 이름으로 매핑 행 찾기 — 미배정 표 「매핑 없음」 을 누르면 그 부서 지정 모달 (GWD-12) */
    mapOf: (gwDeptNm) => allMaps.find((m) => m.gwDeptNm === gwDeptNm) || { gwDeptNm, joinYn: 'Y', deptId: null, remark: '', hasRow: false },
    inheritCandidates,
    inheritMap,
    mapLogs,
    logsOf,
    sync,
    /** 데이터 연동 이력으로 갈 수 있는지 (GWD-09) */
    canGoSync: can('sys-sync'),
    /** 미배정 중 초기 비밀번호 계정 수 — 서버 unassignedPwdInitCnt, 없으면 목록에서 셉니다 */
    unassignedPwdInitCnt: summary?.unassignedPwdInitCnt ?? allUsers.filter((u) => u.pwdChangeRequired).length,
    setKeyword,
    setState,
    setUserKeyword,
    openUsersOf,
    unassignedOf,
    selectedMaps,
    setSelectedMaps,
    selectedUsers,
    setSelectedUsers,
    /** 지금 매핑대로 옮길 수 있는 미배정 계정 수 (전체 기준) */
    reassignableCnt: allUsers.filter((u) => u.suggestDeptId != null).length,
    reassignTarget,
    mapTableRef,
    userTableRef,
    setVisibleMaps,
    setVisibleUsers,
    reload,
    // 엑셀 — 조회 권한이면 받을 수 있습니다(R-10). canWrite 와 무관합니다
    exportTabName: tabName,
    exportViewCount: tab === 'assigned' ? shownAssigned.length : tab === 'users' ? shownUsers.length : shownMaps.length,
    exportTotalCount: tab === 'assigned' ? assigned.length : tab === 'users' ? allUsers.length : allMaps.length,
    exportView,
    exportAll,
    exportReassignResult,
    saveMap,
    saveMapsBulk,
    removeMap,
    reassign,
    moveUser,
    moveUsers,
  };
}

/** useAsync 의 오류 → firstError 와 같은 모양 */
const errOf = (e) => (e ? { code: e.code, message: e.message } : null);
