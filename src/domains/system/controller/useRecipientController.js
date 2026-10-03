/**
 * [Controller] SY-05 알림 수신자 관리 (화면 ID sys-recip)
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 발송 조건(SY-04)은 여기서 만든 수신 그룹을 골라 연결합니다.
 *
 * 당번·승격은 2026-09-16 에 이 화면에서 걷어냈습니다 — 당번은 서버 표까지 정리했고,
 * 승격 규칙은 2026-10-03 에 엔진 · API · DB 에서 모두 없앴습니다(「승격 대상」 열 · 안내도 함께 뺌).
 *
 * 2026-10-01 기획 06 반영
 *  · RCP-01 이름·연락처·구성원은 데이터 권한(worker)이 없으면 화면·엑셀 모두 '비공개'
 *  · RCP-02 그룹 편집은 상세 응답으로 채우고, 수정은 바뀐 키만 — 채널은 보내지 않아 보존
 *  · RCP-03 그룹 테스트 결과(수신 예정·제외 사유)
 *  · RCP-04 수신자 계정 상태(사용·정지·승인 대기)
 *  · RCP-06 수신자 등록은 후보 계정 검색 (미배정 소속 제외, R-14)
 *  · RCP-15 쓰기 버튼은 쓰기 권한(canWrite) 으로
 *  · RCP-16 엑셀은 지금 탭의 「조회 목록 / 전체」 — 조회 권한이면 받습니다(R-10)
 */
import { useCallback, useMemo, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 화면 ID — API 명세·DB tb_sys_menu 와 같은 값 */
export const RECIPIENT_SCREEN = 'sys-recip';

const WRITE_DENIED = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

/**
 * 수신자 한 명의 수신/부재 상태
 *
 * 서버 목록의 `state` 는 코드값(RECV | ABSENT)이고 `stateNm` 이 표기입니다.
 * 예전 응답이 표기 문자열('수신')을 주던 때가 있어 몇 가지 표현을 함께 받습니다.
 *
 * @param {object} r 수신자 행
 * @returns {{receiving:boolean,label:string}}
 */
export function recipientState(r) {
  const v = r?.state;
  const receiving = v === '수신' || v === 'RECEIVING' || v === 'RECV' || v === 'ON' || v === true;
  return { receiving, label: r?.stateNm || (receiving ? '수신' : '부재') };
}

/** 계정 상태 표기 (RCP-04) — 서버가 표기를 주지 않으면 코드로 */
const USER_STATE_NM = { ACTIVE: '사용', SUSPENDED: '정지', PENDING: '승인 대기', LOCKED: '잠금' };
/** 알림을 받는 계정 상태 — 잠금(LOCKED)은 로그인만 막는 일시 조치라 받습니다 (3단계 결정, app.alert.receivable-user-states) */
export const RECEIVABLE_USER_STATES = ['ACTIVE', 'LOCKED'];

export function accountState(r) {
  const code = r?.userState || '';
  return { code, label: r?.userStateNm || USER_STATE_NM[code] || '' };
}

/** 수신 가능 표기 — 「N/M」 (서버 receivableCnt, 없으면 receivingCnt) */
export function receivableLabel(g) {
  const n = g.receivableCnt ?? g.receivingCnt;
  const m = g.memberCnt ?? (g.memberEmpNos || g.members || []).length;
  return n === undefined || n === null ? '' : `${n}/${m}`;
}

/** 이름 표기 — 서버가 이름 문자열 또는 {empNo,name} 객체로 줄 수 있습니다 */
export const memberNameOf = (m) => (m && typeof m === 'object' ? m.name ?? '' : m);

export function useRecipientController() {
  const toast = useUiStore((state) => state.toast);
  // 권한 배열을 구독해야 /auth/me 가 늦게 와도 버튼 상태가 다시 그려집니다
  const menuPermsSub = useAuthStore((state) => state.menuPerms);
  const unassignedSub = useAuthStore((state) => state.unassigned);
  const dataPerms = useAuthStore((state) => state.dataPerms);
  const canWriteOf = useAuthStore((state) => state.canWrite);
  const canDataOf = useAuthStore((state) => state.canData);
  const canWrite = useMemo(() => canWriteOf(RECIPIENT_SCREEN), [canWriteOf, menuPermsSub, unassignedSub]); // eslint-disable-line react-hooks/exhaustive-deps
  // 이름·연락처는 '작업자 정보(worker)' 항목입니다
  const showWorker = useMemo(() => canDataOf('worker'), [canDataOf, dataPerms]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState('수신 그룹');
  /** 그룹 필터는 groupId 로 서버에 넘깁니다 (RCP-11) */
  const [groupFilter, setGroupFilter] = useState('전체');
  const [stateFilter, setStateFilter] = useState('전체');
  const [userStateFilter, setUserStateFilter] = useState('전체');
  // 검색어는 조회·Enter 에만 보냅니다
  const [keywordInput, setKeyword] = useState('');
  const [keyword, setAppliedKeyword] = useState('');
  /** 사용 중지 그룹도 볼지 (RCP-08) */
  const [showInactive, setShowInactive] = useState(false);

  // 채널·유효 시간대 선택지와 표기는 서버 공통코드가 정본입니다
  const { data: codes } = useAsync(() => loadCodeGroups('ALM_CHANNEL', 'ALM_WINDOW'), [], { silent: true, initialData: {} });

  // 머리(요약·그룹)는 탭과 무관하게 한 번 — 사용 중지 그룹 보기를 바꿀 때만 다시
  const { data, loading, reload: reloadHead } = useAsync(() => repo.loadRecipientHead({ includeInactive: showInactive }), [showInactive]);

  const paging = usePaging({ resetKey: `${groupFilter}|${stateFilter}|${userStateFilter}|${keyword}` });
  const STATE_CODE = { 수신: 'RECV', 부재: 'ABSENT' };
  const USER_STATE_CODE = { 사용: 'ACTIVE', 정지: 'SUSPENDED', '승인 대기': 'PENDING', 잠금: 'LOCKED' };
  // 수신자 목록은 수신자 탭에서만 부릅니다 (탭별 조회, RCP-11)
  const { data: listData, loading: listLoading, error: listErrorObj, reload: reloadList } = useAsync(
    () => repo.loadRecipientList({
      groupId: groupFilter === '전체' ? undefined : groupFilter,
      state: STATE_CODE[stateFilter],
      userState: USER_STATE_CODE[userStateFilter],
      keyword: keyword || undefined,
      ...paging.params,
    }),
    [tab, groupFilter, stateFilter, userStateFilter, keyword, paging.page, paging.size],
    { skip: tab !== '수신자' }
  );

  const groups = data?.groups?.items || [];
  const recipients = listData?.items || [];

  const reload = useCallback(() => {
    reloadHead();
    if (tab === '수신자') {
      if (keywordInput.trim() !== keyword) setAppliedKeyword(keywordInput.trim());
      else reloadList();
    }
  }, [reloadHead, reloadList, tab, keywordInput, keyword]);

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.code === 'E-AUTH-004' ? res.message || WRITE_DENIED : res.message);
      if (res.ok || res.code === 'E-NOTFOUND') reload();
      return res;
    },
    [toast, reload]
  );

  /* ───────── 엑셀 (지금 탭의 조회 목록 / 전체) ───────── */
  const chan = codes?.ALM_CHANNEL;
  const win = codes?.ALM_WINDOW;

  /** 엑셀 열 — `worker` 는 데이터 권한(작업자 정보)이 걸린 열 */
  const exportCols = useMemo(() => ({
    group: [
      { field: 'name', head: '그룹명', attr: 'name', value: (g) => g.name },
      { field: 'channelNames', head: '발송 채널', attr: 'channels', value: (g) => g.channelNames ?? (g.channels || []).map((c) => labelOf(chan, c)).join(' · ') },
      { field: 'windowNm', head: '유효 시간대', attr: 'validWindow', value: (g) => g.windowNm ?? labelOf(win, g.validWindow) },
      { field: 'night', head: '야간', attr: 'night', value: (g) => (g.night ? '발송' : '제외') },
      { field: 'memberCnt', head: '멤버', attr: 'memberCnt', value: (g) => g.memberCnt ?? (g.memberEmpNos || g.members || []).length },
      { field: 'receivableLabel', head: '수신 가능', attr: 'receivableCnt', value: (g) => g.receivableLabel ?? receivableLabel(g) },
      { field: 'condCnt', head: '사용 조건', attr: 'condCnt', value: (g) => g.condCnt ?? (g.conds || []).length ?? '' },
      { field: 'memberNames', head: '구성원', attr: 'members', worker: true, value: (g) => g.memberNames ?? (g.members || []).map(memberNameOf).join(' · ') },
      { field: 'useFlg', head: '상태', attr: 'useFlg', value: (g) => (g.useFlg === 'N' ? '사용 중지' : '사용') },
    ],
    recipient: [
      { field: 'groupNames', head: '수신 그룹', attr: 'groups', value: (r) => r.groupNames ?? (r.groups || []).map(memberNameOf).join(' · ') },
      { field: 'name', head: '이름', attr: 'name', worker: true, value: (r) => r.name },
      { field: 'dept', head: '부서', attr: 'dept', value: (r) => r.dept },
      { field: 'posLabel', head: '직급', attr: 'posNm', value: (r) => r.posLabel ?? r.posNm ?? r.pos },
      { field: 'accountLabel', head: '계정', attr: 'userState', value: (r) => accountState(r).label },
      { field: 'mail', head: '메일', attr: 'mail', worker: true, value: (r) => r.mail },
      { field: 'hp', head: '휴대전화', attr: 'hp', worker: true, value: (r) => r.hp },
      { field: 'messenger', head: '메신저', attr: 'messenger', worker: true, value: (r) => r.messenger },
      { field: 'night', head: '야간 수신', attr: 'night', value: (r) => (r.night ? '수신' : '미수신') },
      { field: 'stateLabel', head: '상태', attr: 'state', value: (r) => recipientState(r).label },
      { field: 'remark', head: '비고', attr: 'remark', value: (r) => r.remark ?? '' },
    ],
  }), [chan, win]);

  /**
   * 행 → 엑셀 줄. 데이터 권한(worker)이 없으면 이름·연락처·구성원 칸을 빈칸이 아니라 '비공개' 로 채웁니다(R-10).
   * 서버가 이미 null 로 가려 보낸 값도 같은 규칙으로 채웁니다.
   */
  const buildSheet = useCallback((kind, rows, order) => {
    const base = exportCols[kind];
    const cols = order?.length
      ? [...order.map((f) => base.find((c) => c.field === f)).filter(Boolean), ...base.filter((c) => !order.includes(c.field))]
      : base;
    let blind = 0;
    const out = rows.map((r) => cols.map((c) => {
      if (c.worker && !showWorker) {
        blind += 1;
        return '비공개';
      }
      return c.value(r) ?? '';
    }));
    return { head: cols.map((c) => c.head), attrs: cols.map((c) => c.attr), rows: out, blindCount: blind };
  }, [exportCols, showWorker]);

  /**
   * 조회 목록 다운로드 — 지금 탭의 그리드 기준(머리글 검색·정렬·열 순서 그대로, 관리 열 제외)
   * @param {{rows?:object[], order?:string[]}} [grid]
   */
  const exportView = useCallback(async (grid = {}) => {
    if (tab === '수신 그룹') {
      const sheet = buildSheet('group', grid.rows || groups, grid.order);
      downloadXls({ name: '알림 수신 그룹', ...sheet, scope: 'VIEW', condSummary: '탭=수신 그룹 · 머리글 검색 반영', menuId: RECIPIENT_SCREEN });
      return;
    }
    const sheet = buildSheet('recipient', grid.rows || recipients, grid.order);
    const groupNm = groupFilter === '전체' ? '전체' : groups.find((g) => String(g.groupId) === String(groupFilter))?.name || groupFilter;
    const condSummary = `탭=수신자 · 그룹=${groupNm} · 상태=${stateFilter} · 계정=${userStateFilter} · 검색=${keyword || '없음'} · 쪽=${paging.page}`;
    downloadXls({ name: '알림 수신자', ...sheet, scope: 'VIEW', condSummary, menuId: RECIPIENT_SCREEN });
  }, [tab, buildSheet, groups, recipients, groupFilter, stateFilter, userStateFilter, keyword, paging.page]);

  /** 전체 다운로드 — 그룹은 사용 중지 포함 전 그룹, 수신자는 조건·쪽과 무관한 전원(size=0) */
  const exportAll = useCallback(async () => {
    try {
      if (tab === '수신 그룹') {
        const all = await repo.loadAllRecipientGroups();
        downloadXls({ name: '알림 수신 그룹', ...buildSheet('group', all.items), scope: 'ALL', condSummary: '탭=수신 그룹 · 사용 중지 포함', menuId: RECIPIENT_SCREEN });
        if (all.truncated) toast(`상한 ${repo.GROUP_EXPORT_LIMIT.toLocaleString('ko-KR')}건까지 내려받았습니다`);
        return;
      }
      const all = await repo.loadAllRecipients();
      downloadXls({ name: '알림 수신자', ...buildSheet('recipient', all.items), scope: 'ALL', condSummary: '탭=수신자 · 전체', menuId: RECIPIENT_SCREEN });
      if (all.truncated) toast(`상한 ${repo.RECIPIENT_EXPORT_LIMIT.toLocaleString('ko-KR')}건까지 내려받았습니다`);
    } catch (e) {
      toast(e?.message || '전체 목록을 내려받지 못했습니다');
    }
  }, [tab, buildSheet, toast]);

  const summary = data?.summary;
  const recipientTotal = (summary?.recipientCnt?.receiving ?? 0) + (summary?.recipientCnt?.absent ?? 0);

  /* ───────── 동작 ───────── */

  /** 그룹 편집 전 상세 — 실패하면 폼을 열지 않습니다(목록 행으로 채우면 부서·채널이 지워집니다) */
  const loadGroupDetail = useCallback(async (groupId) => {
    try {
      return { ok: true, data: await repo.loadRecipientGroup(groupId) };
    } catch (e) {
      if (e?.code === 'E-NOTFOUND') reload();
      return { ok: false, message: e?.message ? `수신 그룹 상세를 불러오지 못했습니다 — ${e.message}` : '수신 그룹 상세를 불러오지 못했습니다' };
    }
  }, [reload]);

  /**
   * 대응 부서 선택지 — 그룹 상세 응답의 deptOptions (부서 목록 API 는 계정 관리 권한이 필요해 쓰지 않습니다).
   * 등록 폼에는 상세가 없으므로 첫 그룹의 상세에서 받고, 그것도 없으면 목록에 나온 부서로 채웁니다.
   */
  const loadDeptOptions = useCallback(async () => {
    const fromList = [];
    groups.forEach((g) => {
      if (g.deptId !== undefined && g.deptId !== null && !fromList.some((o) => String(o.value) === String(g.deptId))) fromList.push({ value: g.deptId, label: g.dept || `부서 ${g.deptId}` });
    });
    if (!groups.length) return fromList;
    try {
      const d = await repo.loadRecipientGroup(groups[0].groupId);
      return d?.deptOptions?.length ? d.deptOptions : fromList;
    } catch (e) {
      return fromList;
    }
  }, [groups]);

  /**
   * 멤버 선택기 후보 — 수신자 탭 조회와 무관하게 전 수신자(size=0, RCP-05).
   * 실패하면 그룹의 기존 멤버와 지금 쪽 수신자로 대신합니다.
   */
  const loadMemberCandidates = useCallback(async (detail) => {
    const toCand = (r) => ({
      empNo: r.empNo, name: r.name ?? null, dept: r.dept ?? '',
      state: r.state === 'ABSENT' || r.state === '부재' ? 'ABSENT' : 'RECV',
      userState: r.userState || 'ACTIVE',
    });
    let list = [];
    try {
      list = (await repo.loadAllRecipients()).items.map(toCand);
    } catch (e) {
      list = recipients.map(toCand);
    }
    (detail?.members || []).forEach((m) => {
      if (m && typeof m === 'object' && !list.some((x) => x.empNo === m.empNo)) list.push(toCand(m));
    });
    (detail?.memberEmpNos || []).forEach((e) => { if (!list.some((x) => x.empNo === String(e))) list.push({ empNo: String(e), name: null, dept: '', state: 'RECV', userState: 'ACTIVE' }); });
    return list;
  }, [recipients]);

  /** 수신/부재 전환 (RCP-07) */
  const changeState = (recipientId, next, reason) => run(() => repo.setRecipientState(recipientId, next, reason));

  /** 영향 조회 — 실패하면 null (화면은 「영향을 확인하지 못했습니다」 로 보이고 계속합니다) */
  const loadImpact = useCallback(async (recipientId) => {
    try {
      return await repo.loadRecipientImpact(recipientId);
    } catch (e) {
      return null;
    }
  }, []);

  /**
   * 수신자 삭제 (RCP-08) — 409 + 영향이면 그 결과를 돌려주고, 화면이 다시 물은 뒤 force 로 보냅니다
   * @returns {Promise<{ok:boolean, needsForce?:boolean, data?:object, message:string}>}
   */
  const removeRecipient = useCallback(async (recipientId, force = false) => {
    const res = await repo.deleteRecipient(recipientId, force);
    if (!res.ok && res.code === 'E-RULE-001' && !force && res.data && (res.data.zeroGroups || res.data.affectedConds)) {
      return { ...res, needsForce: true };
    }
    toast(res.code === 'E-AUTH-004' ? res.message || WRITE_DENIED : res.message);
    if (res.ok || res.code === 'E-NOTFOUND') reload();
    return res;
  }, [toast, reload]);

  return {
    loading,
    listLoading,
    firstLoad: loading && !data,
    loadError: data?.errors?.groups?.message || data?.errors?.summary?.message || '',
    listError: listErrorObj?.message || '',
    codes,
    summary,
    recipientTotal,
    groups,
    recipients,
    paging,
    itemsMeta: listData?.meta,
    tab,
    setTab,
    filters: { groupFilter, stateFilter, userStateFilter, keyword: keywordInput, appliedKeyword: keyword, showInactive },
    setGroupFilter,
    setStateFilter,
    setUserStateFilter,
    setKeyword,
    setShowInactive,
    reload,
    // 권한 (R-06 · RCP-01)
    canWrite,
    showWorker,
    // 엑셀 (R-16)
    exportView,
    exportAll,
    // 동작
    loadGroupDetail,
    loadDeptOptions,
    loadMemberCandidates,
    loadImpact,
    changeState,
    removeRecipient,
    /** 수신 그룹 사용 중지/사용 (RCP-08) — 참조 중이면 서버가 409 와 이유를 줍니다 */
    setGroupUse: (groupId, on) => run(() => repo.setGroupUse(groupId, on)),
    searchCandidates: repo.searchRecipientCandidates,
    /** 수신 그룹 등록·수정 — 본문은 alertFormModel.groupBody 가 만듭니다(수정 시 채널은 보내지 않음) */
    submitGroup: (groupId, body) => run(() => (groupId ? repo.updateGroup(groupId, body) : repo.createGroup(body))),
    /** 수신자 등록(empNo 포함)·수정(mail · hp · messenger · night 만) */
    submitRecipient: (recipientId, body) => run(() => (recipientId ? repo.updateRecipient(recipientId, body) : repo.createRecipient(body))),
    /** 그룹 테스트 발송 — 결과 모달은 화면이 그립니다 */
    testGroup: async (groupId) => {
      const res = await repo.testGroup(groupId);
      if (!res.ok) toast(res.code === 'E-AUTH-004' ? res.message || WRITE_DENIED : res.message);
      return res;
    },
  };
}
