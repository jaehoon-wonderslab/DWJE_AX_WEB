/**
 * [Controller] SY-01 계정 관리
 *
 * 부서의 기본 메뉴 권한에 계정별 추가 허용 메뉴를 합칩니다. 데이터 권한은 부서 기준입니다.
 *
 * 회원가입(/signup)으로 들어온 신청은 `PENDING` 으로 쌓입니다.
 * 이 화면에서 승인해야 해당 계정이 로그인할 수 있습니다.
 *
 * 2026-10-01 개선 (기획 01_sys-account)
 *  · ACC-15 쓰기 권한 — 요약 `canWrite`(없으면 접근 권한 · 미배정 여부)가 false 면 쓰기 버튼을 비활성으로 그립니다.
 *  · ACC-02 통합관리자 부서는 통합관리자에게만 선택지로 보이고, 본인 계정의 부서·수동 메뉴는 바꿀 수 없습니다.
 *  · ACC-05 잠김(LOCKED) 계정은 [잠금 해제] 로 풉니다. [정지] 는 사유를 받습니다.
 *  · ACC-14 미배정 부서 계정에는 추가 메뉴를 보내지 않습니다(서버 409).
 *  · ACC-17 엑셀은 「조회 목록(그리드 그대로)」 · 「전체(조건 무시, 상한 10,000)」 두 가지입니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { fetchMe } from '@domains/auth/model/authRepository';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 화면 ID — API 명세 · tb_sys_menu 와 같은 값 */
const SCREEN_ID = 'sys-account';

/**
 * 계정 표 엑셀 열 — 표의 열 `key` 와 같은 순서·이름입니다(ACC-17).
 * `attr` 는 마스킹 판정에 쓰는 응답 필드명(없으면 key), `value` 는 화면과 같은 한글 표기입니다.
 */
const USER_EXPORT_COLUMNS = [
  { key: 'empNo', head: '아이디' },
  { key: 'name', head: '이름' },
  { key: 'email', head: '이메일', value: (u) => u.email || '—' },
  { key: 'dept', head: '소속 부서' },
  { key: 'posNm', head: '직급', value: (u) => u.posLabel || '—' },
  { key: 'admin', head: '관리자', value: (u) => u.adminLabel },
  { key: 'state', head: '상태', attr: 'stateNm', value: (u) => u.stateLabel || u.stateNm },
  { key: 'joinSrc', head: '가입 경로', value: (u) => u.joinSrcLabel || '—' },
  { key: 'pwdChangeRequired', head: '초기 비밀번호', value: (u) => u.pwdStateLabel || '변경 완료' },
  { key: 'loginFailCnt', head: '로그인 실패', value: (u) => u.loginFailCnt ?? 0 },
  { key: 'lastLoginAt', head: '최근 접속', value: (u) => u.lastLoginAt || '—' },
];
const exportColumnOf = (key) => USER_EXPORT_COLUMNS.find((c) => c.key === key);
const cellOf = (col, u) => (col.value ? col.value(u) : u[col.key] ?? '');

/** 초기 비밀번호 규칙 (서버 SystemUserService — 비밀번호를 비우고 등록하면 이 값) */
export const initialPasswordOf = (empNo) => `${empNo}!Dwje1234`;

/** yyyy-MM-dd */
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** 오늘 날짜 yyyy-MM-dd (비고 덧붙이기) */
const today = () => ymd(new Date());
/** n 일 전 yyyy-MM-dd */
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };

/** 변경 이력 조회 기간 (ACC-09) — 기본은 오늘을 종료일로 최근 7일(2026-10-02), 최대 365일 */
export const LOG_DEFAULT_DAYS = 7;
export const LOG_MAX_DAYS = 365;

/** 계정 표 빠른 필터 (ACC-08) */
export const QUICK_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'UNASSIGNED', label: '미배정' },
  { value: 'LOCKED_SUSPENDED', label: '잠김·정지' },
  // 승인 대기 카드를 없애고(2026-10-02) 계정 표에서 승인·반려합니다 — 대기 계정만 모아 보는 길
  { value: 'PENDING', label: '승인 대기' },
  { value: 'PWD_INIT', label: '초기 비밀번호' },
  { value: 'GROUPWARE', label: '자동 가입' },
];

/**
 * 각 표를 독립적으로 검색·페이지 이동하고 조회 중에도 입력창을 유지합니다.
 * @param {object} [extra] 검색어 밖의 서버 조건(빠른 필터 deptId · 이력 기간 등). 바뀌면 다시 부릅니다
 */
function useAccountList(loader, localFilters = false, extra = {}) {
  const [keyword, setKeyword] = useState('');
  const paging = usePaging({ size: 100 }); // 서버 쪽 나눔 표도 기본 100행(2026-10-02)
  const extraKey = JSON.stringify(extra);
  // 전량(size=0)일 때는 page 를 보내지 않습니다 — 서버 부서 목록이 page=1&size=0 을 1건으로 읽습니다(18081 확인)
  const result = useAsync(() => loader({ ...(localFilters ? { size: 0 } : paging.params), keyword, ...extra }), [keyword, paging.page, paging.size, extraKey]);
  useEffect(() => {
    const last = Math.max(1, Number(result.data?.meta?.totalPages || 1));
    if (!result.loading && result.data && paging.page > last) paging.setPage(last);
  }, [result.data, result.loading, paging.page, paging.setPage]);
  return {
    ...result, paging, keyword, localFilters,
    search: (value) => {
      const next = value.trim();
      if (next === keyword && paging.page === 1) result.reload();
      else { paging.reset(); setKeyword(next); }
    },
    rows: result.data?.items || [], meta: result.data?.meta,
  };
}

export function useAccountController() {
  const toast = useUiStore((state) => state.toast);
  const me = useAuthStore((state) => state.userInfo);
  // menuPerms · unassigned 를 구독해야 권한이 바뀌었을 때 다시 그립니다 (canWrite 는 함수라 구독만으로는 바뀌지 않습니다)
  useAuthStore((state) => state.menuPerms);
  useAuthStore((state) => state.unassigned);
  const storeCanWrite = useAuthStore((state) => state.canWrite);

  const can = useAuthStore((state) => state.can);
  useAuthStore((state) => state.menuPerms);

  // 요약과 부서는 따로 부릅니다(ACC-12) — 계정 동작 뒤에는 요약만, 부서 동작 뒤에는 부서 표만 다시 받습니다.
  // 부서 선택지는 부서 표와 같은 응답(검색어 없이 받은 것)을 씁니다 — 진입 때 부서 목록을 한 번만 부릅니다.
  const summaryQ = useAsync(() => repo.loadAccountSummary(), []);
  const deptGrid = useAccountList(repo.loadAccountDepts, true);
  const [depts, setDepts] = useState([]);
  useEffect(() => {
    if (!deptGrid.keyword && deptGrid.data) setDepts(deptGrid.rows);
  }, [deptGrid.data]); // eslint-disable-line react-hooks/exhaustive-deps
  /** 미배정 부서 ID (ACC-14) */
  const unassignedDeptId = depts.find((d) => d.systemRole === 'UNASSIGNED')?.id ?? null;

  /* 빠른 필터 (ACC-08) — 서버 조건으로 부릅니다: 미배정 deptId · 잠김·정지 state=LOCKED,SUSPENDED · 자동 가입 joinSrc.
     「초기 비밀번호」 는 서버 조건이 없어 받은 전량에서 거릅니다. */
  const [quickFilter, setQuickFilter] = useState('ALL');
  const userGrid = useAccountList(repo.loadAccountUsers, true, quickParams(quickFilter, unassignedDeptId));

  /* 변경 이력 조건 (ACC-09) */
  const [logFilter, setLogFilter] = useState(() => ({ from: daysAgo(LOG_DEFAULT_DAYS), to: today(), actType: '', target: '' }));
  const logGrid = useAccountList(repo.loadAccountLogs, true, {
    from: logFilter.from, to: logFilter.to, ...(logFilter.actType ? { actType: logFilter.actType } : {}), ...(logFilter.target ? { targetUserId: logFilter.target } : {}),
  });

  // 직급 선택지는 서버 공통코드(SYS_POSITION)가 정본입니다.
  // shared/constants/accounts 의 POSITIONS 는 표기 변환용이며 서버와 어긋날 수 있습니다(DIRECTOR 임원 ↔ 상무).
  // 이력 구분 이름은 서버 actNm 이 정본이고, 없으면 SYS_PERM_ACT 코드명으로 채웁니다(ACC-09).
  const { data: codes } = useAsync(() => loadCodeGroups('SYS_POSITION', 'SYS_PERM_ACT'), [], { silent: true, initialData: {} });

  const summary = summaryQ.data;
  // 같은 배열을 유지해야 표가 렌더마다 자료를 갈아 끼우지 않습니다
  const users = useMemo(() => filterQuick(userGrid.rows, quickFilter, unassignedDeptId), [userGrid.rows, quickFilter, unassignedDeptId]);

  /** 통합관리자인지 (ACC-02 · ACC-16) — 요약 currentUser.superAdmin 이 정본입니다 */
  const superAdmin = !!(summary?.currentUser?.superAdmin ?? me?.superAdmin ?? false);
  /**
   * 쓰기 권한 (ACC-15, R-06) — 서버 요약 값이 정본이고, 없으면 접근 권한 · 미배정 여부로 판정합니다.
   * 통합관리자는 판정이 항상 통과하므로(CMN-06) 값이 없어도 쓸 수 있습니다.
   */
  const canWrite = typeof summary?.canWrite === 'boolean' ? summary.canWrite : superAdmin || storeCanWrite(SCREEN_ID);
  const isUnassignedDept = useCallback((deptId) => unassignedDeptId != null && String(deptId) === String(unassignedDeptId), [unassignedDeptId]);

  /**
   * 등록·수정·삭제 공통 처리 — 메시지 표시 후 그 동작이 바꾼 것만 다시 불러옵니다 (ACC-12)
   * @param {string[]} [scope] 'users' · 'depts' (요약과 이력은 늘 다시 받습니다)
   */
  const run = useCallback(
    async (fn, successMessage, scope = ['users']) => {
      const res = await fn();
      toast(res.ok && successMessage ? successMessage(res) : res.message);
      if (res.ok) {
        summaryQ.reload(); logGrid.reload();
        if (scope.includes('users')) userGrid.reload();
        if (scope.includes('depts')) deptGrid.reload();
      }
      return res;
    },
    [toast, summaryQ.reload, userGrid.reload, deptGrid.reload, logGrid.reload]
  );

  /* ───────── 엑셀 (ACC-17) ───────── */
  const userExportRef = useRef(null);
  const [userViewCount, setUserViewCount] = useState(null);

  const exportView = useCallback(async () => {
    const view = userExportRef.current?.getExportView?.() || { rows: users, fields: null, filters: [], sorters: [] };
    const cols = (view.fields || USER_EXPORT_COLUMNS.map((c) => c.key)).map(exportColumnOf).filter(Boolean);
    const headOf = (field) => exportColumnOf(field)?.head || field;
    const cond = [
      userGrid.keyword ? `검색어=${userGrid.keyword}` : '',
      ...view.filters.map((f) => `열 필터 ${headOf(f.field)}=${f.value}`),
      ...view.sorters.map((x) => `정렬 ${headOf(x.field)}${x.dir === 'desc' ? '↓' : '↑'}`),
    ].filter(Boolean).join(' · ');
    downloadXls({
      name: '계정 목록',
      head: cols.map((c) => c.head),
      // 열마다 값의 출처(응답 필드명)를 알려 주면 downloadXls 가 로그인 계정의 데이터 권한으로 가립니다(R-10)
      attrs: cols.map((c) => c.attr || c.key),
      rows: view.rows.map((u) => cols.map((c) => cellOf(c, u))),
      scope: 'VIEW',
      condSummary: cond || '조건 없음',
      menuId: SCREEN_ID,
    });
  }, [users, userGrid.keyword]);

  const exportAll = useCallback(async () => {
    try {
      const all = await repo.loadAccountUsersAll();
      const items = all.items || [];
      const limit = repo.ACCOUNT_EXPORT_LIMIT;
      if (items.length > limit) toast(`상한 ${limit.toLocaleString('ko-KR')}건까지 내려받았습니다`);
      downloadXls({
        name: '계정 목록',
        head: USER_EXPORT_COLUMNS.map((c) => c.head),
        attrs: USER_EXPORT_COLUMNS.map((c) => c.attr || c.key),
        rows: items.slice(0, limit).map((u) => USER_EXPORT_COLUMNS.map((c) => cellOf(c, u))),
        scope: 'ALL',
        condSummary: '전체(조건 무시)',
        menuId: SCREEN_ID,
      });
    } catch (e) {
      toast(e?.message || '계정 목록을 내려받지 못했습니다');
    }
  }, [toast]);

  const userCnt = summary?.userCnt || {};
  const userTotal = userCnt.total ?? ((userCnt.active ?? 0) + (userCnt.locked ?? 0) + (userCnt.suspended ?? 0) + (userCnt.pending ?? 0));

  return {
    userGrid, deptGrid, logGrid,
    loadMenuOptions: repo.loadAccountMenuOptions,
    loading: summaryQ.loading && !summaryQ.data,
    me,
    summary,
    canWrite,
    superAdmin,
    /** 이메일 잠금 해제 사용 여부 (ACC-05, AUD-16 과 같은 플래그). false 면 관리자 해제만 가능 */
    mailEnabled: summary?.mailEnabled === true,
    /**
     * 최근 메일 발송 실패 시각 (R-17) — 한비로 SMTP 계정은 32일 미로그인이면 꺼집니다.
     * 조치할 수 있는 사람(이 화면 쓰기 권한자 = 통합관리자·전산팀)에게만 경고를 보입니다.
     */
    mailLastFailAt: canWrite ? summary?.mailLastFailAt || null : null,
    users,
    depts: deptGrid.rows,
    /** 부서 선택지 — 통합관리자·미배정 표시는 화면이 거릅니다(ACC-02). 권한 수는 이동 비교(ACC-06)에 씁니다 */
    deptOptions: depts.map((d) => ({ value: d.id, label: d.name, superAdmin: d.superAdmin, systemRole: d.systemRole, menuCnt: d.menuCnt, dataCnt: d.dataCnt })),
    /** 미배정 계정 수 (ACC-08) — 서버 unassignedCnt, 없으면 미배정 부서의 소속 계정 수 */
    unassignedCnt: summary?.unassignedCnt ?? depts.find((d) => d.systemRole === 'UNASSIGNED')?.userCnt ?? 0,
    /** 그룹웨어 부서 매핑 화면으로 갈 수 있는지 — 권한이 있을 때만 링크를 보입니다 */
    canGoGwDept: can('sys-gw-dept'),
    quickFilter,
    setQuickFilter,
    logFilter,
    /**
     * 이력 조건 적용 (ACC-09). 잘못된 기간이면 오류 문구를 돌려주고 조회하지 않습니다.
     * @returns {string} 오류 문구 (없으면 '')
     */
    applyLogFilter: (next) => {
      const f = { ...logFilter, ...next };
      if (!f.from || !f.to) return '기간을 모두 입력해 주세요.';
      if (f.from > f.to) return '시작일이 종료일보다 늦습니다.';
      const span = (new Date(f.to) - new Date(f.from)) / 86400000;
      if (span > LOG_MAX_DAYS) return `기간은 최대 ${LOG_MAX_DAYS}일까지 조회할 수 있습니다.`;
      logGrid.paging.reset();
      setLogFilter({ ...f, target: String(f.target || '').trim() });
      return '';
    },
    actOptions: (codes?.SYS_PERM_ACT || []).map((c) => ({ value: c.value, label: c.label })),
    actName: (code) => (codes?.SYS_PERM_ACT || []).find((c) => c.value === code)?.label || code || '—',
    isUnassignedDept,
    positionOptions: codes?.SYS_POSITION || [],
    logs: logGrid.rows,
    // 엑셀 — 조회 권한이면 받을 수 있습니다(R-10). canWrite 와 무관합니다
    userExportRef,
    userViewCount: userViewCount ?? users.length,
    onUserActiveChange: (rows) => setUserViewCount(rows.length),
    userTotal,
    exportView,
    exportAll,
    initialPasswordOf,
    /**
     * 계정 등록·수정
     * @param {string} [empNo] 수정이면 사번
     * @param {object} v 폼 값
     * @param {object} [row] 수정 대상 행 (비고 덧붙이기 · 정적 칸 값)
     */
    submitUser: async (empNo, v, row, extraMenuReasons) => {
      const { passwordConfirm, remarkAdd, ...fields } = v;
      const body = { ...fields, deptId: Number(fields.deptId ?? row?.deptId) };
      if (!summary?.canChangePassword || !body.password) delete body.password;
      // 미배정 계정에는 추가 메뉴를 줄 수 없습니다(ACC-14, 서버 409) — 미배정으로 옮기면 회수합니다
      if (isUnassignedDept(body.deptId)) body.extraMenuIds = [];
      // 비고는 이력에 덧붙입니다 — 기존 내용은 지우지 않습니다(ACC-05)
      if (typeof remarkAdd === 'string' && remarkAdd.trim()) {
        body.remark = [row?.remark, `[${today()}] ${remarkAdd.trim()}`].filter(Boolean).join('\n');
      }
      // 추가 메뉴 부여 사유 (ACC-10) — 이번에 새로 켠 메뉴의 사유만 보냅니다
      const reasons = Object.fromEntries(Object.entries(extraMenuReasons || {})
        .filter(([id, text]) => String(text || '').trim() && (body.extraMenuIds || []).includes(id) && !(row?.extraMenuIds || []).includes(id))
        .map(([id, text]) => [id, String(text).trim().slice(0, 200)]));
      if (Object.keys(reasons).length) body.extraMenuReasons = reasons;
      const deptChanged = !!row && String(row.deptId) !== String(body.deptId);
      const res = await run(
        () => (empNo ? repo.updateUser({ ...body, empNo }) : repo.createUser(body)),
        // 등록 안내 — 초기 비밀번호와 첫 로그인 변경 강제(ACC-03, R-04)
        empNo ? undefined : () => `계정을 등록했습니다. 초기 비밀번호는 ${initialPasswordOf(body.empNo)} 이며 첫 로그인 때 바꿔야 다른 화면을 쓸 수 있습니다.`,
        // 등록·부서 이동은 부서 표의 소속 계정 수도 바뀝니다
        !empNo || deptChanged ? ['users', 'depts'] : ['users'],
      );
      if (res.ok && empNo === me?.empNo) {
        const current = await fetchMe();
        if (current.ok) useAuthStore.getState().setMe(current.me);
        else toast(current.message);
      }
      return res;
    },
    /**
     * 부서 등록·수정
     *
     * 서버는 `deptNm · desc · initPermFrom`(등록 시 초기 권한을 복사해 올 부서 ID)을 받습니다.
     * 약칭(abbr)은 2026-10-02 에 없앴습니다 — 보내지 않습니다(서버는 옛 화면 호환으로 받아도 무시합니다).
     * 화면 폼도 같은 키를 쓰므로 여기서는 빈 초기 권한('')만 걸러 냅니다.
     * 미배정 부서는 이름을 바꿀 수 없어(ACC-04) 폼에 부서명 칸이 없습니다 — 그때는 deptNm 을 보내지 않습니다.
     */
    submitDept: (deptId, v) => {
      const body = { desc: v.desc };
      if (v.deptNm !== undefined) body.deptNm = v.deptNm;
      if (!deptId && v.initPermFrom !== '' && v.initPermFrom !== undefined && v.initPermFrom !== null) {
        body.initPermFrom = Number(v.initPermFrom);
      }
      return run(() => (deptId ? repo.updateDept(deptId, body) : repo.createDept(body)), undefined, ['depts']);
    },
    removeUser: (empNo) => run(() => repo.deleteUser(empNo), undefined, ['users', 'depts']),
    /** 삭제 전 참조 건수 (ACC-11) — 서버에 아직 없으면 null */
    loadDeleteCheck: repo.loadUserDeleteCheck,
    removeDept: (deptId) => run(() => repo.deleteDept(deptId), undefined, ['depts']),
    /** 정지 → 사용 */
    activateUser: (empNo) => run(() => repo.setUserState(empNo, 'ACTIVE')),
    /** 사용 → 정지 (사유 선택, ACC-05) */
    suspendUser: (empNo, reason) => run(() => repo.setUserState(empNo, 'SUSPENDED', { reason: reason?.trim() || undefined })),
    /** 잠김 → 사용 — 관리자 잠금 해제 (ACC-05). 해제 후 첫 로그인에서 비밀번호를 바꿔야 합니다 */
    unlockUser: (empNo, resetPassword) => run(
      () => repo.setUserState(empNo, 'ACTIVE', { resetPassword: !!resetPassword }),
      (res) => res.message || '잠금을 해제했습니다. 첫 로그인 때 비밀번호를 바꿔야 합니다.',
    ),
    /** 가입 승인 — PENDING → ACTIVE. deptId 를 주면 승인과 함께 그 부서로 정합니다(ACC-07) */
    approveSignup: (empNo, deptId) => run(() => repo.approveSignup(empNo, true, undefined, deptId), undefined, ['users', 'depts']),
    /** 가입 반려 — PENDING → SUSPENDED (사유는 감사 로그에 남습니다) */
    rejectSignup: (empNo, reason) => run(() => repo.approveSignup(empNo, false, reason), undefined, ['users']),
  };
}

/** 빠른 필터를 받은 행에 적용합니다 (ACC-08) */
function filterQuick(rows, quick, unassignedDeptId) {
  switch (quick) {
    case 'UNASSIGNED': return unassignedDeptId == null ? rows : rows.filter((u) => String(u.deptId) === String(unassignedDeptId));
    case 'LOCKED_SUSPENDED': return rows.filter((u) => u.state === 'LOCKED' || u.state === 'SUSPENDED');
    case 'PENDING': return rows.filter((u) => u.state === 'PENDING');
    case 'PWD_INIT': return rows.filter((u) => u.pwdChangeRequired);
    case 'GROUPWARE': return rows.filter((u) => u.joinSrc === 'GROUPWARE');
    default: return rows;
  }
}

/** 빠른 필터 → 서버 조건 (ACC-08, 서버 3단계: state 쉼표 다중 · joinSrc) */
function quickParams(quick, unassignedDeptId) {
  if (quick === 'UNASSIGNED' && unassignedDeptId != null) return { deptId: unassignedDeptId };
  if (quick === 'LOCKED_SUSPENDED') return { state: 'LOCKED,SUSPENDED' };
  if (quick === 'PENDING') return { state: 'PENDING' };
  if (quick === 'GROUPWARE') return { joinSrc: 'GROUPWARE' };
  return {};
}
