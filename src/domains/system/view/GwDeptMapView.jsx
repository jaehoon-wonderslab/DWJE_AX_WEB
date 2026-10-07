/**
 * [View] SY-17 그룹웨어 부서 매핑 (경로: /system/gw-dept-map)
 *
 * 그룹웨어 인사정보 자동 가입 때 들어갈 AX 부서를 정하고, 매핑이 없어 '미배정' 으로 들어간
 * 계정을 실제 부서로 옮깁니다.
 * 사용 API 6건 — /api/v1/system/gw-dept-maps/* + 계정 부서 이동(PUT /system/users/{empNo}/dept)
 *
 * 「읽기 전용」(GWD-14) — 쓰기 권한이 없으면 [지정]·[삭제]·[일괄 지정]·[재배정]·[부서 지정] 을 비활성으로 두고
 * 이유를 툴팁으로 보입니다. 선택 칸은 그리지 않습니다(고를 일이 없음). 검색·엑셀·새로고침은 그대로입니다.
 */
import React, { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, CardTabs, CheckRow, ExportMenuButton, FormAlert, HelpTip, Hint, Loading, SelectField, StatCard, TabulatorGrid, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { GW_MAP_STATES, NO_DEPT, gwStateLabel, userStateLabel } from '../controller/useGwDeptMapController';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { GuardedButton, WRITE_DENIED } from './WriteGuard';
import DeptManagePanel, { DeptRegisterButton } from './DeptManagePanel';
import { useTableActive } from './useTableActive';

const STATE_TAG = { MAPPED: 'tag-green', UNMAPPED: 'tag-amber', EXCLUDED: '' };

/** 확인 모달에 이름을 늘어놓는 최대 인원 (GWD-01) */
const LIST_MAX = 20;
/** 배정 계정 표 — 표시 건수 선택지(기본 50) */
const ASSIGNED_PAGE_SIZES = [10, 25, 50, 100];

/** 요약 카드가 칸 높이를 채우게 — 네 카드 높이를 같게(2026-10-02) */
const STAT_FILL = { flex: 1 };
/** 요약 카드 머리 줄 높이 — 상태 배지가 있는 동기화 카드와 숫자 줄을 맞춥니다 */
const STAT_LABEL = { minHeight: 26 };
/** 동기화 카드 값(날짜·시각) — 다른 카드 숫자와 줄 높이는 같게, 글자만 작게 */
const SYNC_VALUE = { fontSize: 18, lineHeight: 26, letterSpacing: 0 };

export default function GwDeptMapView({
  loading, loadError, loadErrorText, summary, health, canWrite, maps, users, depts,
  tab, setTab,
  selectedMaps, setSelectedMaps, selectedUsers, setSelectedUsers,
  mapTableRef, userTableRef, setVisibleMaps, setVisibleUsers,
  reload, exportTabName, exportViewCount, exportTotalCount, exportView, exportAll,
  saveMap, saveMapsBulk, removeMap, moveUser, moveUsers,
  mapTotal, userTotal, refreshing, openUsersOf, unassignedOf,
  mapOf, mapLogs, logsOf, sync, canGoSync, unassignedPwdInitCnt,
  assigned = [], assignedTotal, assignedLoading, assignedError, selectedAssigned = [], setSelectedAssigned,
  assignedTableRef, setVisibleAssigned, moveAssigned,
  deptAdmin,
}) {
  const { goToScreen } = useAppNavigation();
  // 표 안의 버튼은 HTML 로 그리고 클릭은 cellClick 에서 받습니다. 열 정의는 한 번만 만들고
  // 최신 핸들러는 ref 로 읽습니다(return 직전에 채움) — 훅이라 조기 return 보다 위에 둡니다.
  const handlers = useRef({});
  const s = useCommonStyles();
  const deny = canWrite ? '' : WRITE_DENIED;

  // 열 검색으로 좁혀진 「보이는 행」 을 컨트롤러에 알립니다 — 재배정 대상·조회 목록 엑셀 기준(GWD-01·15)
  useTableActive(mapTableRef, setVisibleMaps);
  useTableActive(userTableRef, setVisibleUsers);
  useTableActive(assignedTableRef, setVisibleAssigned);

  const mapColumns = useMemo(() => [
    {
      title: '그룹웨어 부서',
      field: 'gwDeptNm',
      // 열 폭은 내용에 맞춥니다(표 autoWidth, 2026-10-02) — 머리글 필터 칸이 읽힐 만큼만 최소 폭을 둡니다
      minWidth: 140,
      formatter: (c) => {
        const r = c.getRow().getData();
        return `<span class="strong">${esc(r.gwDeptNm)}</span>${r.inSource === false ? ' <span class="tag" title="그룹웨어 인사정보에 이 부서의 재직자가 없습니다">그룹웨어에 없음</span>' : ''}`;
      },
    },
    // 재직 · 가입 계정 · 미배정 계정 열은 뺐습니다(2026-10-02). 미배정 계정은 [미배정 계정] 탭에서 봅니다
    {
      // 머리글은 「부서」(2026-10-02) — 그룹웨어 부서 옆이라 AX 를 붙이지 않습니다
      title: '부서',
      field: 'deptNm',
      minWidth: 110,
      formatter: (c) => {
        const r = c.getRow().getData();
        if (r.state === 'EXCLUDED') return '<span class="muted">가입 안 함</span>';
        return r.deptNm ? `<span class="strong">${esc(r.deptNm)}</span>` : `<span class="muted">${esc(summary?.unassignedDept?.deptNm || '미배정')}</span>`;
      },
    },
    {
      title: '상태',
      field: 'state',
      minWidth: 110,
      // 상태는 고르는 목록 필터입니다(2026-10-02) — 값은 코드, 보이는 글자는 이름. 「전체」 또는 × 로 풉니다
      headerFilter: 'list',
      headerFilterParams: { values: { '': '전체', ...Object.fromEntries(GW_MAP_STATES.map((o) => [o.value, o.label])) }, clearable: true, autocomplete: false },
      headerFilterPlaceholder: '전체',
      headerFilterFunc: '=',
      cssClass: 'ax-list-filter',
      formatter: (c) => `<span class="tag ${STATE_TAG[c.getValue()] ?? ''}">${esc(gwStateLabel(c.getValue()))}</span>`,
    },
    { title: '메모', field: 'remark', minWidth: 110, formatter: (c) => esc(c.getValue() || '—') },
    {
      title: '수정',
      field: 'updDate',
      minWidth: 90,
      headerFilter: false,
      formatter: (c) => {
        const r = c.getRow().getData();
        return r.updDate ? `${esc(r.updDate)} <small class="muted">${esc(r.updUserNm || r.updUser || '')}</small>` : '<span class="muted">—</span>';
      },
    },
    {
      title: '관리',
      field: 'hasRow',
      // 단추가 [지정] 하나라 그 폭만 둡니다 — 남는 폭 나누기(fillWidth)에서도 빼고 그대로 둡니다
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      headerSort: false,
      headerFilter: false,
      // 선택 칸이 있는 표라 행을 누르면 선택이 뒤집힙니다 — 버튼은 클릭을 행까지 올려 보내지 않습니다
      // [이어받기](GWD-11 — 그룹웨어 부서명이 바뀐 행의 설정을 새 이름으로 옮김)는 뺐습니다(2026-10-07).
      // 컨트롤러의 inheritCandidates · inheritMap 은 되살릴 수 있게 남겨 둡니다
      // [삭제] 는 뺐습니다(2026-10-07) — [지정] 에서 「미배정(매핑 없음)」 · 자동 가입으로 저장하면 엔진이 매핑 행이 없을 때와
      // 똑같이 미배정으로 가입시킵니다(dept_id 없음 = UNMAPPED). confirmRemoveMap · removeMap 은 되살릴 수 있게 남겨 둡니다
      formatter: (c) => actionButtons(
        [{ act: 'edit', label: '지정', cls: 'tbtn-primary' }],
        () => handlers.current.openMapForm(c.getRow().getData()),
        deny,
      ),
    },
  ], [summary?.unassignedDept?.deptNm, deny]);

  // 미배정 표의 그룹웨어 부서 · 직위 · 상태 머리글은 고르는 목록입니다(2026-10-02) — 선택지는 목록을 열 때 지금 행에서 뽑습니다
  const usersRef = useRef(users);
  usersRef.current = users;
  const userColumns = useMemo(() => {
    const posOf = (u) => u.posNm || u.pos || '';
    const listHeader = (textOf) => ({
      headerFilter: 'list',
      headerFilterParams: {
        valuesLookup: () => [
          { label: '전체', value: '' },
          ...[...new Set((usersRef.current || []).map(textOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')).map((v) => ({ label: v, value: v })),
        ],
        clearable: true,
        autocomplete: false,
      },
      headerFilterPlaceholder: '전체',
      headerFilterFunc: (q, _v, row) => !q || textOf(row) === q,
      cssClass: 'ax-list-filter',
    });
    return [
      // 열 폭은 내용에 맞춥니다(표 autoWidth, 2026-10-02) — 고정 폭은 [부서 지정] 단추가 든 관리 열만 둡니다
      { title: '사번', field: 'empNo', formatter: (c) => `<span class="mono">${esc(c.getValue())}</span>` },
      { title: '이름', field: 'name', formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
      { title: '그룹웨어 부서', field: 'gwDeptNm', minWidth: 130, ...listHeader((u) => u.gwDeptNm || '') },
      { title: '직위', field: 'posNm', minWidth: 90, ...listHeader(posOf), formatter: (c) => esc(posOf(c.getRow().getData()) || '—') },
      {
        // 상태 배지 (GWD-12) — 사용 green · 잠김 amber · 정지 red · 퇴사 회색
        title: '상태',
        field: 'stateNm',
        minWidth: 90,
        ...listHeader(userStateLabel),
        formatter: (c) => {
          const u = c.getRow().getData();
          const label = userStateLabel(u);
          const cls = label === '퇴사' ? '' : u.state === 'ACTIVE' ? 'tag-green' : u.state === 'LOCKED' ? 'tag-amber' : 'tag-red';
          return `<span class="tag ${cls}">${esc(label || '—')}</span>`;
        },
      },
      {
        title: '초기 비밀번호',
        field: 'pwdChangeRequired',
        headerFilter: false,
        formatter: (c) => (c.getValue() ? '<span class="tag tag-amber">변경 전</span>' : '<span class="muted">—</span>'),
      },
      { title: '가입 일시', field: 'joinedAt', headerFilter: false },
      { title: '최근 로그인', field: 'lastLoginAt', headerFilter: false, formatter: (c) => esc(c.getValue() || '—') },
      // 「매핑대로 옮길 부서」 열은 뺐습니다(2026-10-02) — 매핑대로 옮기기는 위쪽 [매핑대로 재배정] 단추로 합니다
      {
        title: '관리',
        field: 'empNo',
        width: 110,
        minWidth: 110,
        maxWidth: 110,
        headerSort: false,
        headerFilter: false,
        formatter: (c) => actionButtons([{ act: 'move', label: '부서 지정' }], () => handlers.current.openMoveForm(c.getRow().getData()), deny),
      },
    ];
  }, [deny]);

  // 배정 계정 표(2026-10-07) — 부서 · 직급 · 상태 · 가입 경로 머리글은 고르는 목록입니다
  const assignedRef = useRef(assigned);
  assignedRef.current = assigned;
  const assignedColumns = useMemo(() => {
    const listHeader = (field) => ({
      headerFilter: 'list',
      headerFilterParams: {
        valuesLookup: () => [
          { label: '전체', value: '' },
          ...[...new Set((assignedRef.current || []).map((u) => u[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')).map((v) => ({ label: v, value: v })),
        ],
        clearable: true,
        autocomplete: false,
      },
      headerFilterPlaceholder: '전체',
      headerFilterFunc: '=',
      cssClass: 'ax-list-filter',
    });
    return [
      { title: '사번', field: 'empNo', formatter: (c) => `<span class="mono">${esc(c.getValue())}</span>` },
      { title: '이름', field: 'name', formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
      { title: '부서', field: 'dept', minWidth: 120, ...listHeader('dept') },
      { title: '직급', field: 'posNm', minWidth: 100, ...listHeader('posNm'), formatter: (c) => esc(c.getValue() || '—') },
      {
        title: '상태',
        field: 'stateLabel',
        minWidth: 90,
        ...listHeader('stateLabel'),
        formatter: (c) => {
          const u = c.getRow().getData();
          const cls = u.state === 'ACTIVE' ? 'tag-green' : u.state === 'LOCKED' ? 'tag-amber' : u.state === 'SUSPENDED' ? 'tag-red' : '';
          return `<span class="tag ${cls}">${esc(c.getValue() || '—')}</span>`;
        },
      },
      { title: '가입 경로', field: 'joinSrcLabel', minWidth: 110, ...listHeader('joinSrcLabel'), formatter: (c) => esc(c.getValue() || '—') },
      { title: '가입 일시', field: 'requestedAt', headerFilter: false, formatter: (c) => esc(c.getValue() || '—') },
      { title: '최근 로그인', field: 'lastLoginAt', headerFilter: false, formatter: (c) => esc(c.getValue() || '—') },
    ];
  }, []);

  /* ───────── 부서 매핑 ───────── */
  // 통합관리자·미배정 부서는 선택지에 없습니다(GWD-02 — systemRepository.loadGwDeptMap 이 거릅니다)
  const deptOptions = [{ value: NO_DEPT, label: `— ${summary?.unassignedDept?.deptNm || '미배정'} (매핑 없음) —` }, ...depts.map((d) => ({ value: d.id, label: d.name }))];
  const joinOptions = [{ value: 'Y', label: '자동 가입' }, { value: 'N', label: '가입 제외' }];

  const openMapForm = (row) => {
    const { cnt } = unassignedOf(row.gwDeptNm);
    const deptName = (id) => depts.find((d) => String(d.id) === String(id))?.name || '';
    openFormModal({
      title: '부서 매핑 지정',
      sub: row.gwDeptNm,
      initial: { joinYn: row.joinYn === 'N' ? 'N' : 'Y', deptId: row.deptId ?? NO_DEPT, remark: row.remark || '', moveToo: cnt ? ['Y'] : [] },
      fields: [
        { key: 'joinYn', label: '자동 가입', type: 'select', options: joinOptions, required: true },
        {
          // 가입 제외면 AX 부서는 저장하지 않으므로 고를 수 없게 둡니다 (GWD-06)
          key: 'deptId',
          type: 'custom',
          render: ({ value, onChange, values }) => (values.joinYn === 'N'
            ? <SelectField label="부서" value="" options={[{ value: '', label: '가입 제외 — 저장하지 않음' }]} onChange={() => {}} nativeSelect full />
            : <SelectField label="부서" value={value} options={deptOptions} onChange={onChange} nativeSelect full />),
        },
        { key: 'remark', label: '메모', type: 'textarea', rows: 2, full: true, placeholder: '예) IPQC 는 품질보증팀 소속 (발주자 확인 2026-09-30)' },
        // 「최근 이력」 칸은 뺐습니다(2026-10-02) — 매핑 변경은 계정 관리 > 계정·권한 변경 이력에 남습니다
        ...(cnt ? [{
          // 저장과 함께 이 부서 미배정 계정도 옮기기 (GWD-04)
          key: 'moveToo',
          type: 'custom',
          full: true,
          render: ({ value, onChange, values }) => {
            const on = (value || []).includes('Y');
            const usable = values.joinYn !== 'N' && values.deptId !== NO_DEPT && values.deptId != null;
            return (
              <View style={{ gap: 8 }} nativeID="gw-move-too">
                {/* AX 부서를 고르기 전 안내 문장은 뺐습니다(2026-10-02) — 고르면 「함께 옮기기」 체크가 나타납니다 */}
                {usable ? (
                  <CheckRow label={`저장 후 이 부서 미배정 계정 ${cnt}명도 ${deptName(values.deptId)}(으)로 옮기기`} checked={on} onToggle={() => onChange(on ? [] : ['Y'])} />
                ) : null}
                {/* 초기 비밀번호 n명 안내는 뺐습니다(2026-10-07) — 이동은 그대로 진행합니다 */}
              </View>
            );
          },
        }] : []),
      ],
      // 아래 안내 문장은 뺐습니다(2026-10-02)
      submitLabel: '저장',
      onSubmit: async (v) => (await saveMap(row.gwDeptNm, v)).ok,
    });
  };

  const confirmRemoveMap = (row) =>
    openConfirmModal({
      title: '부서 매핑 삭제',
      message: `'${row.gwDeptNm}' 매핑을 지웁니다. 다음 동기화부터 이 부서 사람은 ${summary?.unassignedDept?.deptNm || '미배정'} 부서로 가입됩니다. 이미 가입된 계정은 그대로입니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeMap(row.gwDeptNm),
    });

  /* ───────── 미배정 계정 ───────── */
  /** 부서 지정 모달의 부서 선택지 — 맨 앞은 고르지 않은 상태(값 '')입니다 */
  const movePickOptions = [{ value: '', label: '부서를 선택하세요' }, ...depts.map((d) => ({ value: d.id, label: d.name }))];
  const openMoveForm = (user) =>
    openFormModal({
      title: '부서 지정',
      sub: `${user.name} (${user.empNo}) · 그룹웨어 ${user.gwDeptNm}`,
      // 처음에는 아무 부서도 고르지 않은 상태로 엽니다(2026-10-07) — 고르지 않으면 저장이 막힙니다
      initial: { deptId: '' },
      fields: [{ key: 'deptId', label: '부서', type: 'select', options: movePickOptions, required: true, full: true }],
      note: '옮기는 즉시 새 부서의 메뉴·데이터 권한이 적용됩니다.',
      submitLabel: '옮기기',
      onSubmit: async (v) => (await moveUser(user.empNo, v.deptId)).ok,
    });

  /**
   * 체크한 계정 일괄 부서 지정(2026-10-02) — 고른 AX 부서 하나로 모두 옮깁니다.
   * 「매핑대로 재배정」 은 사람마다 매핑된 부서로 옮기고, 이 단추는 매핑과 상관없이 같은 부서로 옮깁니다.
   */
  const openBulkMoveForm = () => {
    const picked = selectedUsers.map((empNo) => users.find((u) => u.empNo === empNo) || { empNo, name: '' });
    if (!picked.length) return;
    const names = picked.slice(0, LIST_MAX).map((u) => (u.name ? `${u.name}(${u.empNo})` : u.empNo)).join(', ');
    const rest = picked.length > LIST_MAX ? ` 외 ${picked.length - LIST_MAX}명` : '';
    openFormModal({
      title: '선택 계정 부서 지정',
      sub: `선택 ${picked.length}명`,
      initial: { deptId: '' },
      fields: [
        { key: 'deptId', label: '부서', type: 'select', options: movePickOptions, required: true, full: true },
        { key: 'who', label: '옮길 사람', type: 'static', full: true, value: `${names}${rest}` },
      ],
      note: '고른 부서로 모두 옮깁니다. 옮기는 즉시 새 부서의 메뉴·데이터 권한이 적용됩니다.',
      submitLabel: `${picked.length}명 옮기기`,
      onSubmit: async (v) => {
        const res = await moveUsers(picked.map((u) => u.empNo), v.deptId);
        if (res.failed.length) {
          useUiStore.getState().openModal({
            title: '부서 지정 결과',
            render: () => (
              <ReassignBody
                lines={[
                  `옮김 ${res.moved}명 · 옮기지 못함 ${res.failed.length}명`,
                  ...res.failed.slice(0, LIST_MAX).map((f) => `${f.name ? `${f.name}(${f.empNo})` : f.empNo} — ${f.message}`),
                ]}
              />
            ),
            footer: (close) => <Button label="닫기" variant="primary" onPress={close} />,
          });
        }
        return true;
      },
    });
  };

  /**
   * 배정 계정 일괄 부서 변경(2026-10-07) — 체크한 계정을 고른 부서 하나로 옮깁니다.
   * 이미 그 부서인 사람은 보내지 않습니다. 실패가 있으면 사번 · 사유를 결과 창으로 보입니다.
   */
  const openAssignedMoveForm = () => {
    const picked = selectedAssigned.map((empNo) => assigned.find((u) => u.empNo === empNo) || { empNo, name: '' });
    if (!picked.length) return;
    const names = picked.slice(0, LIST_MAX).map((u) => (u.name ? `${u.name}(${u.empNo})` : u.empNo)).join(', ');
    const rest = picked.length > LIST_MAX ? ` 외 ${picked.length - LIST_MAX}명` : '';
    openFormModal({
      title: '선택 계정 부서 변경',
      sub: `선택 ${picked.length}명`,
      initial: { deptId: '' },
      fields: [
        { key: 'deptId', label: '부서', type: 'select', options: movePickOptions, required: true, full: true },
        { key: 'who', label: '바꿀 사람', type: 'static', full: true, value: `${names}${rest}` },
      ],
      note: '고른 부서로 모두 옮깁니다. 옮기는 즉시 새 부서의 메뉴·데이터 권한이 적용됩니다.',
      submitLabel: `${picked.length}명 변경`,
      onSubmit: async (v) => {
        const targets = picked.filter((u) => String(u.deptId) !== String(v.deptId)).map((u) => u.empNo);
        if (!targets.length) { useUiStore.getState().toast('고른 사람은 모두 이미 그 부서입니다.'); return true; }
        const res = await moveAssigned(targets, v.deptId);
        if (res.failed.length) {
          useUiStore.getState().openModal({
            title: '부서 변경 결과',
            render: () => (
              <ReassignBody
                lines={[
                  `변경 ${res.moved}명 · 변경하지 못함 ${res.failed.length}명`,
                  ...res.failed.slice(0, LIST_MAX).map((f) => `${f.name ? `${f.name}(${f.empNo})` : f.empNo} — ${f.message}`),
                ]}
              />
            ),
            footer: (close) => <Button label="닫기" variant="primary" onPress={close} />,
          });
        }
        return true;
      },
    });
  };

  // [매핑대로 재배정] 단추와 확인 · 결과 창은 뺐습니다(2026-10-02) — 체크한 계정은 [선택 n명 부서 지정] 으로 옮깁니다.
  // 매핑을 저장할 때의 「이 부서 미배정 계정도 옮기기」 는 그대로입니다.

  if (loading && !summary && !maps.length) return <Loading />;

  handlers.current = { openMapForm, confirmRemoveMap, openMoveForm, openUsersOf, mapOf };
  const unassignedNm = summary?.unassignedDept?.deptNm || '미배정';

  /*
   * 탭 오른쪽 단추 — 예전 각 카드(그룹웨어 부서 → AX 부서 / 미배정 계정) 위에 있던 단추를 그 탭으로 옮겼습니다(2026-10-06).
   * 엑셀은 조회 권한이면 받을 수 있습니다(R-10) — 쓰기 권한과 무관. 대상은 지금 탭입니다.
   */
  const exportButton = (
    <ExportMenuButton label={`엑셀 다운로드 · ${exportTabName}`} viewCount={exportViewCount} totalCount={exportTotalCount} onExportView={exportView} onExportAll={exportAll} />
  );
  const tabActions = {
    map: exportButton,
    users: (
      <>
        {/* 체크한 사람을 고른 부서 하나로 옮깁니다. 단추는 늘 보이고, 체크가 없으면 누를 수 없습니다 */}
        <GuardedButton
          allowed={canWrite}
          reason={canWrite && !selectedUsers.length ? '표에서 옮길 계정을 체크하십시오.' : undefined}
          label={`선택 ${selectedUsers.length}명 부서 지정`}
          icon="users"
          size="sm"
          variant={selectedUsers.length ? 'primary' : undefined}
          onPress={openBulkMoveForm}
        />
        {exportButton}
      </>
    ),
    // 부서 탭(2026-10-07, 계정 관리에서 옮김) — [부서 등록]
    depts: deptAdmin ? <DeptRegisterButton {...deptAdmin} /> : null,
    assigned: (
      <>
        {/* 체크한 계정을 고른 부서 하나로 옮깁니다(2026-10-07). 체크가 없으면 누를 수 없습니다 */}
        <GuardedButton
          allowed={canWrite && !assignedError}
          reason={canWrite && !assignedError && !selectedAssigned.length ? '표에서 바꿀 계정을 체크하십시오.' : undefined}
          label={`선택 ${selectedAssigned.length}명 부서 변경`}
          icon="users"
          size="sm"
          variant={selectedAssigned.length ? 'primary' : undefined}
          onPress={openAssignedMoveForm}
        />
        {exportButton}
      </>
    ),
  };
  /** 탭 안 첫 줄 — 예전 카드 제목(2026-10-07: 미배정 탭은 「미배정 계정」 만) */
  const tabSub = {
    map: `그룹웨어 부서 → 부서${refreshing ? ' · 갱신 중…' : ''}`,
    users: `${unassignedNm} 계정${refreshing ? ' · 갱신 중…' : ''}`,
    assigned: `부서가 배정된 계정${refreshing ? ' · 갱신 중…' : ''}`,
    // 부서 탭은 첫 줄 대신 패널 안의 강조 안내(삭제 규칙)를 씁니다
    depts: null,
  };
  /** 부서 매핑 탭 첫 줄 옆 도움말 — 두 부서의 뜻 */
  const MAP_HELP = '그룹웨어 부서: 그룹웨어에서 지정된 부서\n부서: 덕우전자 AX 시스템에서 사용할 부서';

  return (
    <View>
      <PageHead
        title="부서 매핑"
        actions={
          // 새로고침은 화면 전체(요약 카드 · 두 탭)를 다시 읽으므로 머리에 둡니다. 엑셀은 탭으로 옮겼습니다(2026-10-06)
          <Button label="새로고침" size="sm" icon="refresh" onPress={reload} />
        }
      />

      {/* 원천·미배정 부서 이상 (GWD-03) — 편집 버튼은 그대로 둡니다(매핑은 미리 넣을 수 있음) */}
      {health && health.unassignedDeptFound === false ? (
        <>
          <FormAlert>{`미배정 부서('${health.engineDeptName || '미배정'}')를 찾지 못했습니다. 자동 가입이 멈춘 상태입니다. 계정 관리 > 부서에서 부서명을 확인하십시오.`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}
      {health && (health.sourceExists === false || health.sourceRowCnt === 0) ? (
        <>
          <FormAlert tone="info">그룹웨어 인사정보가 아직 들어오지 않았습니다(엔진 미실행). 재직·가입 수가 0 으로 보입니다.</FormAlert>
          <Gap size={12} />
        </>
      ) : null}
      {loadError ? (
        <>
          <FormAlert>{loadErrorText}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}
      {!canWrite ? (
        <>
          <FormAlert tone="info">{`조회 전용입니다 — ${WRITE_DENIED}`}</FormAlert>
          <Gap size={12} />
        </>
      ) : null}

      {/* 요약 카드 4개 — 부제는 두지 않고(2026-10-02) 넓이·높이를 맞춥니다(Grid 균등 분할 + flex 1 + 머리 줄 최소 높이) */}
      <Grid cols={4}>
        <StatCard label="그룹웨어 부서" value={summary?.gwDeptCnt ?? 0} unit="개" style={STAT_FILL} labelStyle={STAT_LABEL} />
        <StatCard label="매핑 없는 부서" value={summary?.unmappedCnt ?? 0} unit="개" style={STAT_FILL} labelStyle={STAT_LABEL} />
        <StatCard label={`${unassignedNm} 계정`} value={summary?.unassignedUserCnt ?? 0} unit="명" style={STAT_FILL} labelStyle={STAT_LABEL} />
        <SyncCard sync={sync} />
      </Grid>
      <Gap />

      <Hint>
        {`매핑은 엔진을 통해 자동 가입을 하는 순간에 사용됩니다.\n이미 ${unassignedNm}으로 분류된 계정은 계정 관리에서 부서 지정이 가능합니다.`}
      </Hint>

      <Gap />
      {/* 부서 매핑 · 미배정 계정 카드를 탭으로 나눕니다(2026-10-06, shadcn Tabs 동작 — 공통 CardTabs) */}
      <CardTabs
        id="gw-dept"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'map', label: '부서 매핑', icon: 'layers', count: mapTotal },
          { value: 'users', label: `${unassignedNm} 계정`, icon: 'users', count: userTotal },
          // 배정 계정 · 부서 순서(2026-10-07 피드백 — 부서가 맨 끝)
          { value: 'assigned', label: '배정 계정', icon: 'user', count: assignedTotal },
          // 부서 — 계정 관리의 「부서」 탭을 옮겼습니다(2026-10-07)
          ...(deptAdmin ? [{ value: 'depts', label: '부서', icon: 'layers', count: deptAdmin.deptTotal }] : []),
        ]}
        right={tabActions[tab]}
      >
        {tabSub[tab] ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, zIndex: 5 }}>
            <Text style={s.textSm}>{tabSub[tab]}</Text>
            {tab === 'map' ? <HelpTip text={MAP_HELP} size={20} align="left" /> : null}
          </View>
        ) : null}
        {tab === 'map' ? (
          // 검색 · 상태 · [선택 n개 일괄 지정] 줄과 선택 칸은 뺐습니다(2026-10-02) — 찾기는 열 머리글 필터로 합니다
          // 「최근 매핑 변경」(GWD-10) 접이 카드도 뺐습니다 — 매핑 변경은 계정 관리 > 계정·권한 변경 이력에 남습니다
          <TabulatorGrid
            columns={mapColumns}
            rows={maps}
            rowKey="gwDeptNm"
            initialSort={MAP_SORT}
            // 열 폭은 내용에 맞추고(autoWidth) 칸마다 테두리를 그립니다(2026-10-02)
            autoWidth
            // 내용 너비 합이 표보다 좁으면 남는 폭을 열마다 나눠 오른쪽이 비지 않게 합니다(2026-10-07)
            fillWidth
            widthHint={false}
            bordered
            instanceRef={mapTableRef}
            height={maps.length > 14 ? 620 : undefined}
            emptyText="조건에 맞는 그룹웨어 부서가 없습니다."
          />
        ) : tab === 'depts' ? (
          deptAdmin ? <DeptManagePanel {...deptAdmin} /> : null
        ) : tab === 'assigned' ? (
          assignedError ? <FormAlert tone="info">{assignedError}</FormAlert> : assignedLoading ? <Loading /> : (
            <TabulatorGrid
              columns={assignedColumns}
              rows={assigned}
              rowKey="empNo"
              autoWidth
              fillWidth
              widthHint={false}
              bordered
              selectable={canWrite}
              // 머리글 체크박스는 지금 쪽만 고르고, 필터 · 쪽 이동 등 조건이 바뀌면 선택이 풀립니다(2026-10-07)
              pageSelectAll
              pageSize={50}
              pageSizes={ASSIGNED_PAGE_SIZES}
              selected={selectedAssigned}
              onSelectedChange={setSelectedAssigned}
              instanceRef={assignedTableRef}
              emptyText="부서가 배정된 계정이 없습니다."
            />
          )
        ) : (
          // 검색 · 상태 칸과 [매핑대로 재배정] 은 뺐습니다(2026-10-02) — 찾기는 열 머리글 필터로 합니다
          <TabulatorGrid
            columns={userColumns}
            rows={users}
            rowKey="empNo"
            // 열 폭은 내용에 맞추고(autoWidth) 칸마다 테두리를 그립니다 — 부서 매핑 탭 표와 같게(2026-10-02)
            autoWidth
            // 내용 너비 합이 표보다 좁으면 남는 폭을 열마다 나눠 오른쪽이 비지 않게 합니다(2026-10-07)
            fillWidth
            widthHint={false}
            bordered
            selectable={canWrite}
            selected={selectedUsers}
            onSelectedChange={setSelectedUsers}
            instanceRef={userTableRef}
            height={users.length > 14 ? 620 : undefined}
            emptyText={`${unassignedNm} 계정이 없습니다. 자동 가입 계정이 모두 부서에 배정됐습니다.`}
          />
        )}
      </CardTabs>
    </View>
  );
}

/**
 * 최근 인사정보 동기화 카드 (GWD-09) — 시각과 상태 배지만 둡니다.
 * 가입 요약 · 26시간 경고 문장 · [연동 이력 보기] 는 뺐습니다(2026-10-02). 실패·멈춤이면 숫자 색(tone down)으로만 알립니다.
 */
function SyncCard({ sync }) {
  const last = sync?.last;
  const state = last?.stateCd;
  // tb_sync_run.state_cd — SUCCESS(완료) · FAIL(실패) · ABORTED(중단) · RUNNING(진행 중) · SKIPPED(건너뜀)
  const failed = ['FAIL', 'FAILED', 'ERROR', 'ABORTED'].includes(state);
  const STATE_BADGE = { SUCCESS: ['green', '완료'], DONE: ['green', '완료'], FAIL: ['red', '실패'], FAILED: ['red', '실패'], ERROR: ['red', '실패'], ABORTED: ['red', '중단'], RUNNING: ['blue', '진행 중'], SKIP: ['', '건너뜀'], SKIPPED: ['', '건너뜀'] };
  const [tone, label] = STATE_BADGE[state] || ['', state || ''];
  // 「완료」 배지는 두지 않습니다(2026-10-02) — 실패·중단·진행 중처럼 손볼 일이 있을 때만 보입니다
  const ok = state === 'SUCCESS' || state === 'DONE';
  const badge = state && !ok ? <Badge tone={tone}>{label}</Badge> : null;
  return (
    <View nativeID="gw-sync-card" style={{ flex: 1 }}>
      <StatCard
        label="최근 인사정보 동기화"
        value={last?.startedAt || '—'}
        tone={failed || sync?.stale ? 'down' : ''}
        right={badge}
        style={STAT_FILL}
        labelStyle={STAT_LABEL}
        // 「2026-09-30 14:38」 이 한 줄에 들어가도록 글자를 줄입니다(줄 높이는 다른 카드와 같게)
        valueStyle={SYNC_VALUE}
      />
    </View>
  );
}

/** 재배정 확인·결과 본문 */
function ReassignBody({ lines }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 10 }} nativeID="gw-reassign-body">
      {lines.filter(Boolean).map((line) => <Text key={line} style={s.text}>{line}</Text>)}
    </View>
  );
}

/** 재직 인원이 많은 부서부터 — 매핑이 빠졌을 때 미배정으로 들어갈 사람이 많은 순서입니다 */
const MAP_SORT = [{ column: 'activeCnt', dir: 'desc' }];

/**
 * 칸 안의 버튼 묶음 (DOM)
 *
 * 선택 칸이 있는 표는 행 어디를 눌러도 선택이 뒤집힙니다(Tabulator 가 행에 클릭을 겁니다).
 * 문자열 버튼 + cellClick 으로는 그 전파를 막을 수 없어, 버튼에 직접 클릭을 걸고 멈춥니다.
 * `deny` 를 주면 버튼을 비활성으로 두고 이유를 툴팁으로 보입니다(쓰기 권한 없음, GWD-14).
 */
function actionButtons(buttons, onAct, deny) {
  const wrap = document.createElement('span');
  wrap.style.whiteSpace = 'nowrap';
  if (deny) wrap.title = deny;
  buttons.forEach((b) => {
    const el = document.createElement('button');
    el.className = `tbtn ${b.cls || ''}`.trim();
    el.textContent = b.label;
    if (deny) {
      el.disabled = true;
      el.title = deny;
      el.style.opacity = '0.45';
      el.style.cursor = 'not-allowed';
    }
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!deny) onAct(b.act);
    });
    wrap.appendChild(el);
  });
  return wrap;
}


/** formatter 가 HTML 문자열을 그리므로 값은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
