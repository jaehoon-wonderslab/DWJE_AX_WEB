/**
 * [Controller] SY-02 메뉴 접근 권한 (화면 ID sys-menu)
 *
 * 체크를 바꾸면 그 부서에 속한 모든 계정의 좌측 메뉴가 다음 요청부터 바뀝니다.
 * 내 부서 권한이 바뀐 경우 사이드바에 바로 반영되도록 내 권한도 다시 받아옵니다.
 *
 * 2026-10-01 개편 (기획 03 MNP-01·02·03·15·16·17·18)
 * 2026-10-03 접근 권한 통합 — 부서마다 「접근」 한 칸. 접근할 수 있으면 그 화면의 모든 동작을 허용합니다
 *   (미배정 계정만 쓰기 불가, 서버 규칙). 조회/쓰기 구분 · writeMatrix · perm 은 없습니다.
 *  · 잠금 — 통합관리자 열(전 권한), 미배정 열(고정 5화면 · 변경 불가, R-11), 관리 화면 5종 행(통합관리자가 아니면, R-07)
 *    판정 근거는 서버 응답(`depts[].locked` · `screens[].admin` · `canEditAdminScreens`)만 씁니다.
 *  · 읽기 전용 — 미배정 계정(쓰기 불가)이면 모든 체크·그룹 버튼·「부서 권한 복사」 를 끕니다(엑셀은 그대로, R-10)
 *  · 그룹 일괄 — 부서별 요청 1회, 동작 행 제외(MNP-04·05)
 *  · 부서 권한 복사 — 미리보기 → 확인 → 실행(expectedHash) 2단계(MNP-01) · 2026-10-07 탭 단추는 「부서 추가」 로 바꿈(복사 함수는 보존)
 *  · 부서 추가 — POST /system/depts (부서명 · 설명 · 초기 권한 복사해 올 부서)
 *  · 엑셀 — 조회 목록(펼친 그룹) / 전체(전 화면) 두 범위(MNP-18)
 *
 * 확인 창(JSX)은 화면(view)이 띄웁니다. 이 파일은 「확인이 필요한지와 문구」 만 정합니다.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { EXTRA_PAGES, MENU, pageName, permRows } from '@shared/constants/menu';
import { useAsync } from '@shared/hooks/useAsync';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

const SCREEN_ID = 'sys-menu';

/** 쓰기 불가(미배정 계정)일 때 안내 */
export const NO_WRITE_TEXT = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

/** 잠금 사유 — 칸의 title 과 안내에 씁니다 */
const LOCK_TEXT = {
  SUPER_ADMIN: '통합관리자 부서는 전 권한으로 고정됩니다.',
  UNASSIGNED: '미배정 부서는 대시보드·덕반장 AI·질의 이력 조회 전용으로 고정됩니다.',
  ADMIN_SCREEN: '관리 화면 권한은 통합관리자만 바꿀 수 있습니다.',
  BUSY: '저장 중입니다.',
};

/** 확인 창을 띄울 화면 — 관리 화면 5종(서버 admin) + 보안 감사 로그(잠그지는 않음, MNP-03) */
const CONFIRM_EXTRA_SCREENS = ['sys-audit'];

export function useMenuPermController() {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);
  const userInfo = useAuthStore((state) => state.userInfo);
  // 함수(canWrite)만 구독하면 권한이 바뀌어도 다시 그리지 않으므로 값(menuPerms · unassigned)을 구독합니다
  const menuPermsSub = useAuthStore((state) => state.menuPerms);
  const unassignedSub = useAuthStore((state) => state.unassigned);
  const canWriteMenu = useMemo(() => useAuthStore.getState().canWrite(SCREEN_ID), [menuPermsSub, unassignedSub]); // eslint-disable-line react-hooks/exhaustive-deps
  const readOnly = !canWriteMenu;
  /** 접힌 그룹 — 엑셀 「조회 목록」 이 지금 보이는 행만 받으려면 컨트롤러가 알아야 합니다 */
  const [collapsed, setCollapsed] = useState(() => new Set());

  const { data, loading, reload, error } = useAsync(() => repo.loadMenuPerms(), []);
  /**
   * 변경 이력 (MNP-07) — 부서 메뉴 권한과 계정 추가 허용을 함께(actType 여러 값, API 3단계). 저장할 때마다 다시 읽습니다.
   * 2026-10-07 최근 20건 → 전량(size=0)을 받아 표에서 쪽을 나눕니다.
   */
  const logs = useAsync(() => repo.loadPermChangeLogs('MENU_PERM,USER_MENU_PERM', 0), [], { silent: true });
  // 「보안 감사 로그에서 더 보기」 는 그 화면 권한이 있을 때만
  const menuPerms = useAuthStore((state) => state.menuPerms);
  const canSeeAudit = useMemo(() => useAuthStore.getState().can('sys-audit'), [menuPerms]);

  const matrixData = data?.matrix;
  /**
   * 화면 행 — 서버(또는 목)가 준 목록을 메뉴 정의 순서(대그룹 8개, MNP-17)로 정렬합니다.
   * 동작 행은 서버 `kind:'ACTION'` 이 정답이고, 없으면 메뉴 정의(EXTRA_PAGES.action)로 가려냅니다(구 API 호환).
   */
  const screens = useMemo(
    () => {
      const definitions = permRows();
      const ordered = definitions.filter(r => !r.sub).flatMap(r => [r, ...definitions.filter(e => EXTRA_PAGES.some(extra => extra.id === e.id && extra.parent === r.id))]);
      const order = new Map(ordered.map((r, index) => [r.id, index]));
      return (matrixData?.screens || []).map((r) => {
        const definition = definitions.find(e => e.id === r.id);
        const extra = EXTRA_PAGES.find((e) => e.id === r.id);
        const kind = String(r.kind || r.type || '').toUpperCase();
        const action = !!(r.action || kind === 'ACTION' || (!kind && extra?.action));
        // 동작 권한 행은 「상위 화면 › 동작」 으로 — 상위 이름은 메뉴 정의에서 찾습니다
        const parentId = r.parentId || r.parent || extra?.parent;
        const knownName = pageName(r.id);
        const name = knownName === r.id ? r.name : knownName;
        const label = action && parentId ? `${pageName(parentId)} › ${definition?.name || r.name}` : undefined;
        const group = definition?.group || r.group;
        return {
          ...r,
          group,
          groupId: r.groupId || repo.menuGroupIdOf(group),
          // 상위 화면 — 서버 parentId 가 정답이고, 없으면 메뉴 정의(EXTRA_PAGES.parent)로 대신합니다(MNP-10)
          parentId: parentId || null,
          name,
          label,
          sub: definition?.sub ?? (r.sub ? 1 : 0),
          action,
          admin: !!r.admin,
          common: !!r.common,
        };
      }).sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
    },
    [matrixData]
  );
  const depts = useMemo(() => matrixData?.depts || [], [matrixData]);
  const matrix = useMemo(() => matrixData?.matrix || {}, [matrixData]);
  const grantCounts = matrixData?.grantCounts || {};
  /** 개인 허용 명단 — 서버가 sys-menu 권한 요청에만 줍니다(sys-account 만 있으면 건수만, MNP-06) */
  const grants = matrixData?.grants || null;
  // 구 서버가 canEditAdminScreens 를 주지 않으면 /auth/me 의 통합관리자 여부로 대신합니다
  const canEditAdminScreens = matrixData?.canEditAdminScreens ?? !!userInfo?.superAdmin;
  const isSuperAdmin = !!userInfo?.superAdmin || canEditAdminScreens;
  const adminDepts = matrixData?.adminDepts || [];

  const deptOf = useCallback((deptId) => depts.find((d) => String(d.id) === String(deptId)), [depts]);
  const screenOf = useCallback((screenId) => screens.find((s) => s.id === screenId), [screens]);

  /** 칸의 현재 값(접근 허용) — 잠금 부서는 서버 고정 규칙을 그대로 보입니다 */
  const cellValue = useCallback((screenId, deptId) => {
    const dept = deptOf(deptId);
    if (dept?.locked === 'SUPER_ADMIN') return true;
    return (matrix[String(deptId)] || []).includes(screenId);
  }, [deptOf, matrix]);

  /**
   * 칸을 바꿀 수 없는 이유 (없으면 '')
   * @param {object} screen 화면 행
   * @param {object} dept 부서
   */
  const lockReason = useCallback((screen, dept) => {
    if (!dept) return '';
    if (dept.locked === 'SUPER_ADMIN') return LOCK_TEXT.SUPER_ADMIN;
    if (dept.locked === 'UNASSIGNED') return LOCK_TEXT.UNASSIGNED;
    if (readOnly) return NO_WRITE_TEXT;
    if (screen?.admin && !canEditAdminScreens) return LOCK_TEXT.ADMIN_SCREEN;
    if (busy) return LOCK_TEXT.BUSY;
    return '';
  }, [readOnly, canEditAdminScreens, busy]);

  /**
   * 칸 옆 주의 표시 (MNP-10) — 하위 화면·동작은 켜져 있는데 상위 화면이 꺼져 있으면 버튼을 눌러도 들어갈 수 없습니다
   * @returns {string} 이유 (없으면 '')
   */
  const cellWarn = useCallback((screen, dept) => {
    if (!screen?.parentId || !dept || dept.locked) return '';
    if (!cellValue(screen.id, dept.id) || cellValue(screen.parentId, dept.id)) return '';
    return `상위 화면 「${pageName(screen.parentId)}」 이 꺼져 있어 이 화면에 들어갈 수 없습니다. 상위 화면을 함께 여세요.`;
  }, [cellValue]);

  /** 그룹 일괄 버튼을 쓸 수 없는 이유 — 관리 화면이 든 그룹은 비관리자에게 통째로 막습니다(서버와 같은 「전체 거부」) */
  const groupLockReason = useCallback((group, dept) => {
    if (!dept) return '';
    if (dept.locked === 'SUPER_ADMIN') return LOCK_TEXT.SUPER_ADMIN;
    if (dept.locked === 'UNASSIGNED') return LOCK_TEXT.UNASSIGNED;
    if (readOnly) return NO_WRITE_TEXT;
    if (!canEditAdminScreens && screens.some((s) => s.group === group && s.admin)) return `${LOCK_TEXT.ADMIN_SCREEN} 관리 화면이 든 그룹은 일괄 변경할 수 없습니다.`;
    if (busy) return LOCK_TEXT.BUSY;
    return '';
  }, [readOnly, canEditAdminScreens, screens, busy]);

  /** 권한 변경 후 목록과 내 권한을 함께 갱신합니다. 네트워크 예외도 토스트로 알리고 다시 읽습니다 */
  const run = useCallback(
    async (fn) => {
      if (running.current) return { ok: false, message: '변경 사항을 저장 중입니다.' };
      running.current = true;
      setBusy(true);
      try {
        let res;
        try {
          res = await fn();
        } catch {
          res = { ok: false, refresh: true, message: '저장하지 못했습니다. 권한을 다시 확인해 주세요.' };
        }
        if (res?.message) toast(res.message);
        if (res?.ok || res?.refresh) {
          await reload();
          logs.reload();
          const me = await fetchMe().catch(() => null);
          if (me?.ok) setMe(me.me);
        }
        return res;
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [toast, reload, setMe, logs.reload]
  );

  /**
   * 칸 변경 계획 — 바꿀 값과 확인 창 문구를 돌려줍니다. 바꿀 수 없으면 null.
   *  · 관리 화면·보안 감사 로그는 「n명에게 화면을 엽니다/닫습니다」 확인, 내 부서의 sys-menu 를 끄면 「이 화면에서 나가게 됩니다」(MNP-03)
   */
  const planToggle = useCallback((screenId, deptId) => {
    const screen = screenOf(screenId);
    const dept = deptOf(deptId);
    if (!screen || !dept) return null;
    const reason = lockReason(screen, dept);
    if (reason) {
      toast(reason);
      return null;
    }
    const allowed = !cellValue(screenId, deptId);
    const lines = [];
    const screenNm = screen.label || screen.name;
    if (screen.admin || CONFIRM_EXTRA_SCREENS.includes(screenId)) {
      lines.push(`${dept.name} ${Number(dept.userCnt || 0).toLocaleString('ko-KR')}명에게 「${screenNm}」 접근 권한을 ${allowed ? '엽니다' : '닫습니다'}.`);
      const mine = String(userInfo?.deptId ?? '') === String(dept.id) || (userInfo?.deptId == null && userInfo?.dept === dept.name);
      if (mine && screenId === SCREEN_ID && !allowed) lines.push('저장하면 이 화면에서 나가게 됩니다.');
    }
    // 부서 접근을 끄더라도 같은 부서의 개인 허용 계정은 계속 들어옵니다 — 저장 뒤 알립니다(MNP-06)
    const sameDeptGrants = !allowed && grants
      ? (grants[screenId] || []).filter((g) => String(g.deptId) === String(dept.id)).length
      : 0;
    // 상위 화면을 끄면 켜져 있는 하위 화면·동작도 함께 끌지 묻습니다(MNP-10)
    const children = !allowed
      ? screens.filter((x) => x.parentId === screenId && cellValue(x.id, deptId)).map((x) => ({ id: x.id, label: x.label || x.name }))
      : [];
    if (children.length) lines.push(`하위 화면 ${children.map((x) => `「${x.label}」`).join(', ')} 도 함께 끌까요? 상위 화면만 끄면 그 화면에 들어갈 수 없게 됩니다.`);
    return {
      screenId, deptId, allowed, children,
      grantNote: sameDeptGrants ? `개인 허용 ${sameDeptGrants}명은 계속 접근합니다 — 계정 관리에서 회수하세요.` : '',
      confirm: lines.length
        ? { title: `접근 권한 ${allowed ? '부여' : '회수'}`, message: lines.join('\n'), danger: !allowed, confirmLabel: allowed ? '부여' : '회수' }
        : null,
    };
  }, [screenOf, deptOf, lockReason, cellValue, userInfo, toast, grants, screens]);

  /** 계획대로 저장합니다 (확인 창을 거쳤거나 확인이 필요 없을 때) */
  const applyToggle = useCallback(
    (plan, { withChildren = false } = {}) => (plan ? run(async () => {
      const res = await repo.setMenuPerm(plan.deptId, plan.screenId, plan.allowed);
      if (!res.ok) return res;
      // 「함께 끄기」 — 상위 다음에 하위를 하나씩 끕니다. 중간에 실패하면 몇 건까지 됐는지 알리고 다시 읽습니다
      let done = 0;
      if (withChildren) {
        for (const child of plan.children || []) {
          const r = await repo.setMenuPerm(plan.deptId, child.id, false);
          if (!r.ok) return { ...r, refresh: true, message: `상위 화면은 껐지만 하위 화면 ${done}/${plan.children.length}개만 껐습니다. ${r.message || ''}` };
          done += 1;
        }
      }
      const extra = [withChildren && done ? `하위 화면 ${done}개도 함께 껐습니다.` : '', plan.grantNote].filter(Boolean).join(' ');
      return extra ? { ...res, message: `${res.message || '저장했습니다.'} ${extra}` } : res;
    }) : null),
    [run]
  );

  /** 그룹 일괄 — 부서별 요청 1회, 동작 행은 바꾸지 않습니다 */
  const toggleGroup = useCallback((group, deptId, allowed) => run(async () => {
    const dept = deptOf(deptId);
    const reason = groupLockReason(group, dept);
    if (reason) return { ok: false, message: reason };
    const groupId = screens.find((s) => s.group === group)?.groupId || repo.menuGroupIdOf(group);
    if (!groupId) return { ok: false, message: `그룹 ID 를 찾을 수 없습니다 — ${group}` };
    const res = await repo.setMenuGroupPerm(deptId, groupId, allowed);
    if (!res.ok) return { ...res, refresh: true };
    const changed = res.data?.changedCnt;
    return { ...res, message: res.message || `${group}: ${changed ?? ''}개 화면 접근 권한을 변경했습니다.` };
  }), [run, deptOf, groupLockReason, screens]);

  // ── 부서 권한 복사 (2단계) ─────────────────────────────
  /** 선택지 — 미배정은 원본·대상 모두 제외, 통합관리자는 대상에서 제외. 표기 「부서명 (계정 n명)」 */
  const copyOptions = useMemo(() => {
    const label = (d) => `${d.name} (계정 ${Number(d.userCnt || 0).toLocaleString('ko-KR')}명)`;
    return {
      from: depts.filter((d) => d.locked !== 'UNASSIGNED').map((d) => ({ value: String(d.id), label: label(d) })),
      to: depts.filter((d) => !d.locked).map((d) => ({ value: String(d.id), label: label(d) })),
    };
  }, [depts]);

  /** 화면 ID → 표시 이름 (미리보기 목록용) */
  const screenLabel = useCallback((id) => {
    const s = screenOf(id);
    return s ? `${s.label || s.name}${s.admin ? ' (관리)' : ''}` : pageName(id);
  }, [screenOf]);

  /** 1단계 — 미리보기. 권한은 바뀌지 않습니다 */
  const previewCopy = useCallback(async ({ fromDeptId, toDeptId }) => {
    try {
      return await repo.previewMenuPermCopy({ fromDeptId, toDeptId });
    } catch {
      return { ok: false, message: '미리보기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    }
  }, []);

  /** 2단계 — 실행. 미리보기에서 받은 해시를 함께 보냅니다 */
  const executeCopy = useCallback(
    (v, expectedHash) => run(async () => {
      if (readOnly) return { ok: false, message: NO_WRITE_TEXT };
      const res = await repo.copyMenuPerm(v, expectedHash);
      return res.ok ? res : { ...res, refresh: true };
    }),
    [run, readOnly]
  );

  // ── 부서 추가 (2026-10-07) ─────────────────────────────
  // 「부서 권한 복사」 는 있는 부서끼리 권한만 덮어쓰고 새 부서를 만들지 않습니다. 탭 단추를 「부서 추가」 로 바꿨습니다.
  // 복사(previewCopy · executeCopy · MenuPermCopyForm)는 되살릴 수 있게 남겨 둡니다.
  /** 초기 권한을 복사해 올 부서 — 시스템 부서(통합관리자·미배정)는 빼고, 「빈 권한」 을 맨 앞에 둡니다 */
  const addDeptOptions = useMemo(() => [
    { value: '', label: '빈 권한 — 추가 후 직접 지정' },
    ...depts.filter((d) => !d.locked).map((d) => ({ value: String(d.id), label: d.name })),
  ], [depts]);

  /** 부서 추가 — 서버는 deptNm · desc · initPermFrom 을 받고, 고른 부서의 메뉴 접근 권한을 복사해 시작합니다 */
  const createDept = useCallback(
    (v) => run(async () => {
      if (readOnly) return { ok: false, message: NO_WRITE_TEXT };
      const body = { deptNm: String(v.deptNm || '').trim(), desc: v.desc || '' };
      if (v.initPermFrom) body.initPermFrom = Number(v.initPermFrom);
      return repo.createDept(body);
    }),
    [run, readOnly]
  );

  // ── 요약 카드 (MNP-12·16) ─────────────────────────────
  const myDeptRow = depts.find((d) => (userInfo?.deptId != null ? String(d.id) === String(userInfo.deptId) : d.name === userInfo?.dept));
  const myCount = myDeptRow ? screens.filter((s) => cellValue(s.id, myDeptRow.id)).length : 0;
  // 평균은 시스템 부서(통합관리자·미배정)와 계정 0명 부서를 빼고 냅니다
  const avgBase = depts.filter((d) => !d.locked && Number(d.userCnt || 0) > 0);
  const avgCount = avgBase.length
    ? (avgBase.reduce((n, d) => n + (matrix[String(d.id)] || []).length, 0) / avgBase.length).toFixed(1)
    : '0';

  // ── 엑셀 (조회 목록 / 전체, MNP-11·18) ─────────────────
  const groupsInOrder = useMemo(() => {
    const menuOrder = MENU.map((g) => g.group);
    return [...new Set(screens.map((s) => s.group))].sort((a, b) => {
      const ai = menuOrder.indexOf(a); const bi = menuOrder.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [screens]);
  const visibleScreens = useMemo(() => screens.filter((s) => !collapsed.has(s.group)), [screens, collapsed]);

  const exportHead = useMemo(
    () => ['메뉴 그룹', '화면', '구분', '개인 허용', ...depts.map((d) => d.name)],
    [depts]
  );
  // 열마다 응답 필드명 — 관리 화면 키라 가려지는 칸은 없지만, 마스킹 판정과 이력 blindCnt 를 맞추려고 넘깁니다(R-10)
  const exportAttrs = useMemo(
    () => ['group', 'label', 'kindLabel', 'grantCount', ...depts.map((d) => `dept_${d.id}`)],
    [depts]
  );
  const toExportRow = useCallback((s) => [
    s.group,
    s.label || s.name,
    s.action ? '동작' : s.sub ? '하위 화면' : '메뉴',
    grantCounts[s.id] ? `${grantCounts[s.id]}명` : '-',
    ...depts.map((d) => (d.locked === 'SUPER_ADMIN' ? '전 권한' : cellValue(s.id, d.id) ? 'O' : '-')),
  ], [depts, cellValue, grantCounts]);

  const exportView = useCallback(async () => {
    const opened = groupsInOrder.filter((g) => !collapsed.has(g));
    downloadXls({
      name: '부서별 메뉴 접근 권한',
      head: exportHead,
      attrs: exportAttrs,
      rows: visibleScreens.map(toExportRow),
      scope: 'VIEW',
      condSummary: `펼친 그룹: ${opened.length ? opened.join('·') : '없음'}`,
      menuId: SCREEN_ID,
    });
  }, [groupsInOrder, collapsed, exportHead, exportAttrs, visibleScreens, toExportRow]);

  const exportAll = useCallback(async () => {
    downloadXls({
      name: '부서별 메뉴 접근 권한',
      head: exportHead,
      attrs: exportAttrs,
      rows: screens.map(toExportRow),
      scope: 'ALL',
      condSummary: `전 화면 ${screens.length}개 × 부서 ${depts.length}개`,
      menuId: SCREEN_ID,
    });
  }, [exportHead, exportAttrs, screens, depts, toExportRow]);

  const toggleCollapsed = useCallback((group) => setCollapsed((previous) => {
    const next = new Set(previous);
    if (next.has(group)) next.delete(group); else next.add(group);
    return next;
  }), []);

  return {
    loading: loading && !data,
    // 최초 조회 실패 — 카드 자리에 오류와 「다시 시도」 를 보입니다(4.3 상태별 화면)
    loadError: !loading && !matrixData ? (data?.errors?.matrix?.message || error?.message || '메뉴 권한을 불러오지 못했습니다.') : '',
    reload,
    busy,
    readOnly,
    isSuperAdmin,
    canEditAdminScreens,
    screens,
    depts,
    matrix,
    grantCounts,
    grants,
    /** 개인 허용 명단 — 화면 ID 별. 명단이 없는 응답이면 null */
    grantsOf: (screenId) => (grants ? grants[screenId] || [] : null),
    logs: logs.data || [],
    logsLoading: logs.loading && !logs.data,
    logsError: !logs.loading && !logs.data && logs.error ? (logs.error.message || '변경 이력을 불러오지 못했습니다.') : '',
    canSeeAudit,
    adminDepts,
    collapsed,
    toggleCollapsed,
    cellValue,
    lockReason,
    cellWarn,
    groupLockReason,
    myDept: myDeptRow?.name || userInfo?.dept || '',
    myCount,
    avgCount,
    planToggle,
    applyToggle,
    toggleGroup,
    copyOptions,
    screenLabel,
    previewCopy,
    executeCopy,
    addDeptOptions,
    createDept,
    viewCount: visibleScreens.length,
    totalCount: screens.length,
    exportView,
    exportAll,
  };
}
