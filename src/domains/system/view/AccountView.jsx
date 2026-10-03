/**
 * [View] SY-01 계정 관리 (경로: /system/account)
 *
 * 부서 기본 메뉴 권한에 계정별 수동 허용 메뉴를 추가할 수 있습니다.
 * 회원가입(/signup)으로 들어온 신청은 승인 대기 상태로 쌓이며, 계정 표의 [승인]·[반려] 로 처리합니다.
 * 사용 API — /api/v1/system/users, /system/depts, /system/perm-logs
 *
 * 화면 구성(2026-10-02 개편) — 요약 카드 아래에 「계정 · 부서 · 계정·권한 변경 이력」 을 탭으로 나눕니다.
 *  · 표마다 쓰는 단추(엑셀·계정 등록 / 부서 등록)는 그 탭 머리 오른쪽에 둡니다
 *  · 표는 창 높이에 맞춰 세로로 길게, 기본 100행(AccountGrid)
 *  · 「가입 승인 대기」 카드·「승인 대기」 요약 카드·안내 문단은 뺐습니다 — 대기 계정은 「상태」 열 필터 「승인 대기」 로 모아 봅니다
 *
 * 「읽기 전용」 상태(기획 4.3) — 버튼을 숨기지 않고 비활성으로 두며 이유를 툴팁으로 보입니다.
 *  · 쓰기 권한 없음(R-06) → 등록·편집·상태·삭제·승인·반려 전부. 엑셀·검색·필터는 그대로(R-10)
 *  · 본인 계정 편집 → 소속 부서·수동 메뉴(ACC-02)
 *  · 시스템 부서(통합관리자·미배정) → 삭제, 미배정은 부서명도(ACC-04)
 *  · 미배정 계정 → 수동 메뉴 전체(ACC-14) · 비통합관리자 → 관리 화면 5종 줄(ACC-16)
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, CardTabs, DateField, ExportMenuButton, Filters, FormAlert, Icon, Loading, StatCard, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { POSITIONS } from '@shared/constants/accounts';
import { pageName } from '@shared/constants/menu';
import { STATE_REASON_LABEL } from '../model/systemRepository';
import AccountGrid from './AccountGrid';
import AccountMenuPicker from './AccountMenuPicker';
import { GuardedButton, WRITE_DENIED, useDomTitle } from './WriteGuard';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/** 직급 선택지 예비값 — 공통코드(SYS_POSITION)를 아직 못 받았을 때만 씁니다 */
const POSITION_FALLBACK = POSITIONS.map((p) => ({ value: p.code, label: p.label }));

/** 계정 상태 선택지 — 서버 `user_state_cd`. 잠김(LOCKED)은 넣지 않습니다 — 표의 [잠금 해제] 로만 풉니다(ACC-05) */
const STATE_OPTIONS = [
  { value: 'ACTIVE', label: '사용' },
  { value: 'SUSPENDED', label: '정지' },
];

/**
 * 부서 [삭제] 를 끄는 이유 — 시스템 부서(ACC-04) · 소속 계정이 있는 부서(서버도 409 로 막음).
 * 그룹웨어 매핑·알림 수신 그룹 참조는 목록에 수가 없어 서버가 판정합니다(확인창 안내).
 */
const deptDeleteBlock = (r) => {
  if (r.systemRole) return SYSTEM_DEPT_DELETE;
  if (Number(r.userCnt) > 0) return `소속 계정 ${r.userCnt}명이 있어 삭제할 수 없습니다. 계정을 다른 부서로 옮긴 뒤 삭제하세요.`;
  return undefined;
};

/** 시스템 부서 보호 안내 (ACC-04) */
const SYSTEM_DEPT_DELETE = '통합관리자·미배정 부서는 삭제할 수 없습니다. 자동 가입과 권한 판정이 이 부서를 씁니다.';
const UNASSIGNED_NAME_LOCK = '미배정 부서는 이름을 바꿀 수 없습니다. 자동 가입과 권한 판정이 이 부서를 씁니다.';
/** 본인 계정 편집 안내 (ACC-02) */
const SELF_EDIT_NOTE = '본인 계정의 부서와 추가 메뉴는 다른 관리자가 바꿔야 합니다.';
/** 미배정 계정 편집 안내 (ACC-08) */
const UNASSIGNED_EDIT_NOTE = '이 계정은 그룹웨어 자동 가입으로 들어와 미배정 상태입니다. 같은 그룹웨어 부서 사람을 한꺼번에 옮기려면 부서 매핑 화면을 쓰십시오.';
/** 요약 카드가 칸 높이를 채우게 합니다 — 세 카드 높이를 같게(가장 높은 카드 기준) */
const STAT_FILL = { flex: 1 };
/** 요약 카드 머리 줄 높이 — 세 카드의 숫자 줄을 맞춥니다(미배정 카드의 「부서 매핑 →」 단추는 2026-10-02 에 뺐습니다) */
const STAT_LABEL = { minHeight: 32 };

/** 탭 — 값은 시험·주소에서 쓰는 이름입니다 */
const TAB_USERS = 'users';
const TAB_DEPTS = 'depts';
const TAB_LOGS = 'logs';

/** 계정 표 목록 필터 순서 (`filter: 'list'`) — 표에 있는 값만 이 순서로 보이고 나머지는 뒤에 붙습니다 */
const STATE_FILTER_ORDER = ['사용', '잠김', '정지', '승인 대기'];
const PWD_FILTER_ORDER = ['변경 전', '변경 완료'];
const JOIN_FILTER_ORDER = ['자동 가입', '회원가입', '관리자 등록'];
const ADMIN_FILTER_ORDER = ['관리자', '일반'];

export default function AccountView({
  loading, me, summary, users, depts, deptOptions, positionOptions, logs,
  canWrite, superAdmin, mailEnabled, mailLastFailAt, isUnassignedDept, initialPasswordOf,
  userExportRef, userViewCount, onUserActiveChange, userTotal, exportView, exportAll,
  submitUser, submitDept, removeUser, removeDept, activateUser, suspendUser, unlockUser,
  approveSignup, rejectSignup, userGrid, deptGrid, logGrid, loadMenuOptions,
  unassignedCnt, canGoGwDept, logFilter, applyLogFilter, actName,
  loadDeleteCheck,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const [tab, setTab] = useState(TAB_USERS);
  const posOptions = positionOptions?.length ? positionOptions : POSITION_FALLBACK;
  const cnt = summary?.userCnt || {};

  /**
   * 소속 부서 선택지 (ACC-02) — 통합관리자 부서는 통합관리자에게만 보입니다.
   * 편집 대상이 이미 통합관리자 부서이면 그 값은 남겨 둡니다(선택지가 비면 값이 조용히 바뀌므로).
   */
  const deptChoicesFor = (row) => deptOptions
    .filter((o) => superAdmin || !o.superAdmin || (row && String(o.value) === String(row.deptId)))
    .map(({ value, label }) => ({ value, label }));

  /* ───────── 계정 등록·편집 ───────── */
  const openUserForm = async (row) => {
    let menuOptions;
    try {
      if (row && !Array.isArray(row.extraMenuIds)) throw new Error('계정의 추가 메뉴 권한을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      menuOptions = await loadMenuOptions();
      if (!Array.isArray(menuOptions?.screens)) throw new Error('메뉴 선택지를 불러오지 못했습니다.');
    } catch (error) {
      useUiStore.getState().toast(error.message);
      return;
    }
    // 본인 계정 — 통합관리자가 아니면 부서·수동 메뉴를 바꿀 수 없습니다(ACC-02, 서버 409)
    const self = !!row && row.empNo === me?.empNo && !superAdmin;
    const locked = row?.state === 'LOCKED';
    const choices = deptChoicesFor(row);
    // 새로 켠 추가 메뉴의 부여 사유 (ACC-10) — 선택기가 여기에 적고 저장 때 함께 보냅니다
    const reasons = {};
    openFormModal({
      wide: true,
      title: row ? '계정 편집' : '계정 등록',
      sub: '부서 기본 메뉴 권한 + 계정별 추가 허용 메뉴',
      initial: row
        ? { empNo: row.empNo, name: row.name, deptId: row.deptId, pos: row.pos, state: locked ? undefined : row.state, extraMenuIds: row.extraMenuIds || [] }
        : { deptId: choices[0]?.value, pos: 'STAFF', state: 'ACTIVE', extraMenuIds: [] },
      fields: [
        ...(row && isUnassignedDept(row.deptId) ? [{
          key: 'unassignedNote', type: 'custom', full: true,
          render: () => (
            <View style={{ gap: 8 }}>
              <FormAlert tone="info">{UNASSIGNED_EDIT_NOTE}</FormAlert>
              {canGoGwDept ? <Button label="부서 매핑으로 이동" size="sm" onPress={() => { useUiStore.getState().closeModal(); goToScreen('sys-gw-dept'); }} /> : null}
            </View>
          ),
        }] : []),
        row ? { key: 'empNo', label: '아이디 (사번)', type: 'static', value: row.empNo } : { key: 'empNo', label: '아이디 (사번)', required: true, placeholder: '예) 20260101' },
        { key: 'name', label: '이름', required: true },
        self
          ? { key: 'deptStatic', label: '소속 부서', type: 'static', value: `${row.dept} — ${SELF_EDIT_NOTE}` }
          : { key: 'deptId', label: '소속 부서', type: 'select', options: choices, required: true },
        ...(row && !self ? [{
          key: 'deptCompare', type: 'custom', full: true,
          render: ({ values }) => <DeptCompare from={row.deptId} to={values.deptId} matrix={menuOptions.matrix} deptOptions={deptOptions} />,
        }] : []),
        { key: 'pos', label: '직급', type: 'select', options: posOptions },
        ...(row && summary?.canChangePassword ? [
          { key: 'password', type: 'password', label: '새 비밀번호', placeholder: '변경할 때만 입력' },
          { key: 'passwordConfirm', type: 'password', label: '새 비밀번호 확인', placeholder: '새 비밀번호 다시 입력' },
        ] : []),
        locked
          ? { key: 'stateStatic', label: '상태', type: 'static', full: true, value: '잠김 — 로그인 5회 실패로 잠겼습니다. 계정 표의 [잠금 해제] 로 풉니다.' }
          : { key: 'state', label: '상태', type: 'radio', options: STATE_OPTIONS, full: true },
        ...(row ? [
          // 상태와 비고 사이를 띄웁니다(2026-10-02) — 위쪽 여백은 비고 묶음의 첫 칸에 둡니다
          ...(row.remark ? [{ key: 'remarkStatic', label: '비고 (기록)', type: 'static', full: true, value: row.remark, cellStyle: { marginTop: 10 } }] : []),
          { key: 'remarkAdd', label: '비고', full: true, cellStyle: row.remark ? undefined : { marginTop: 10 }, placeholder: '예) 10월 말까지 겸직 — 저장하면 날짜와 함께 기록에 덧붙습니다' },
        ] : []),
        {
          key: 'extraMenuIds',
          type: 'custom',
          full: true,
          cellStyle: { marginTop: 18 },
          render: ({ value, onChange, values }) => (
            <AccountMenuPicker
              value={value}
              onChange={onChange}
              deptId={self ? row.deptId : values.deptId}
              options={menuOptions}
              readOnly={self}
              readOnlyNote={SELF_EDIT_NOTE}
              unassigned={isUnassignedDept(self ? row.deptId : values.deptId)}
              superAdmin={superAdmin}
              reasons={reasons}
              initialIds={row?.extraMenuIds || []}
              grants={row?.extraMenus || []}
            />
          ),
        },
        // [이 계정의 최근 이력] 단추는 뺐습니다(2026-10-02) — 이력은 「계정·권한 변경 이력」 탭의 대상 열 필터로 찾습니다
      ],
      note: row
        ? '수동 허용 체크를 해제하면 계정에 추가한 권한만 제거합니다. 부서 기본 권한과 데이터 접근 권한은 부서 설정을 따릅니다.'
        : `초기 비밀번호는 ${initialPasswordOf('사번')} 이며 첫 로그인 때 바꿔야 다른 화면을 쓸 수 있습니다. 부서 기본 권한과 데이터 접근 권한은 부서 설정을 따릅니다.`,
      validate: (v) => v.password !== v.passwordConfirm && (v.password || v.passwordConfirm) ? { passwordConfirm: '새 비밀번호가 일치하지 않습니다.' } : {},
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitUser(row?.empNo, v, row, reasons)).ok,
    });
  };

  /* ───────── 부서 등록·편집 ───────── */
  // 폼 키는 서버 요청 본문(deptNm · desc · initPermFrom)과 같게 둡니다. 약칭은 없앴습니다(2026-10-02, DB 컬럼 삭제).
  // 예전엔 name · av · copyFrom 으로 보내서 서버가 받는 항목이 하나도 없었습니다.
  const openDeptForm = (row) => {
    const nameLocked = row?.systemRole === 'UNASSIGNED';
    openFormModal({
      title: row ? '부서 편집' : '부서 등록',
      sub: '시스템관리 > 계정 관리',
      initial: row ? { deptNm: row.name, desc: row.desc } : { initPermFrom: '' },
      fields: [
        nameLocked
          ? { key: 'deptNmStatic', label: '부서명', type: 'static', value: `${row.name} — ${UNASSIGNED_NAME_LOCK}` }
          : { key: 'deptNm', label: '부서명', required: true, placeholder: '예) 공정기술팀' },
        { key: 'desc', label: '설명', full: true, placeholder: '예) 공정 조건 · 금형 관리' },
        row
          ? { key: 'perm', label: '권한', type: 'static', full: true, value: row.systemRole === 'UNASSIGNED' ? '미배정 부서의 권한은 고정입니다 — 대시보드 3개·덕반장 AI·자연어 질의 이력 조회, 데이터 권한 0건' : '권한은 메뉴 접근 권한 / 데이터 접근 권한 화면에서 설정합니다' }
          : {
              key: 'initPermFrom',
              label: '초기 권한 (복사해 올 부서)',
              type: 'select',
              full: true,
              // 시스템 부서(통합관리자·미배정)의 권한은 복사 대상이 아닙니다
              options: [{ value: '', label: '빈 권한 — 등록 후 직접 지정' }, ...deptOptions.filter((o) => !o.systemRole).map(({ value, label }) => ({ value, label }))],
            },
      ],
      note: row
        ? (nameLocked ? '설명은 바꿀 수 있습니다.' : '부서명을 바꾸면 소속 계정과 권한 설정이 함께 따라갑니다.')
        : '초기 권한을 고르면 그 부서의 메뉴 접근 권한을 그대로 복사해 시작합니다. 데이터 접근 권한은 데이터 접근 권한 화면에서 따로 지정하세요.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitDept(row?.id, v)).ok,
    });
  };

  /* ───────── 회원가입 승인 · 반려 ───────── */
  /** 가입 승인 — 승인 부서를 함께 고릅니다(ACC-07). 기본값은 신청 부서, 통합관리자 부서는 통합관리자만 */
  const confirmApprove = (row) =>
    openFormModal({
      title: '가입 승인',
      sub: `${row.name} (${row.empNo})`,
      initial: { deptId: row.deptId },
      fields: [
        { key: 'deptId', label: '승인 부서', type: 'select', options: deptChoicesFor(row).filter((o) => !isUnassignedDept(o.value)), required: true, full: true },
      ],
      note: '승인하면 고른 부서의 메뉴·데이터 접근 권한이 적용되고 즉시 로그인할 수 있습니다. 신청 부서와 다르면 부서 이동 이력도 함께 남습니다.',
      submitLabel: '승인',
      onSubmit: async (v) => (await approveSignup(row.empNo, String(v.deptId) === String(row.deptId) ? undefined : v.deptId)).ok,
    });

  const openRejectForm = (row) =>
    openFormModal({
      title: '가입 반려',
      sub: `${row.name} (${row.dept})`,
      fields: [
        { key: 'reason', label: '반려 사유', type: 'textarea', required: true, full: true, placeholder: '예) 재직 확인이 되지 않는 사번입니다' },
      ],
      note: '반려하면 계정이 정지 상태가 되어 로그인할 수 없습니다. 사유는 감사 로그에 남습니다.',
      submitLabel: '반려',
      danger: true,
      onSubmit: async (v) => (await rejectSignup(row.empNo, v.reason)).ok,
    });

  /* ───────── 상태 전환 (ACC-05) ───────── */
  const openSuspendForm = (row) =>
    openFormModal({
      title: '계정 정지',
      sub: `${row.name} (${row.empNo})`,
      fields: [
        { key: 'reason', label: '정지 사유 (선택)', type: 'textarea', full: true, rows: 2, placeholder: '예) 휴직 · 2026-12-31 복귀 예정' },
      ],
      note: '정지하면 로그인할 수 없습니다. 사유는 비고와 변경 이력에 남습니다(200자 이내).',
      validate: (v) => (String(v.reason || '').length > 200 ? { reason: '사유는 200자 이내로 적어 주세요.' } : {}),
      submitLabel: '정지',
      danger: true,
      onSubmit: async (v) => (await suspendUser(row.empNo, v.reason)).ok,
    });

  const openUnlockForm = (row) =>
    openFormModal({
      title: '잠금 해제',
      sub: `${row.name} (${row.empNo})`,
      initial: { reset: [] },
      fields: [
        { key: 'lockedAt', label: '잠긴 시각', type: 'static', value: row.lockedAt || '—' },
        { key: 'email', label: '등록 이메일', type: 'static', value: row.emailMasked || '등록된 이메일 없음' },
        { key: 'reset', label: '비밀번호', type: 'check', full: true, options: [{ value: 'Y', label: '비밀번호도 초기화 (사번!Dwje1234)' }] },
      ],
      note: [
        '로그인 5회 실패로 잠긴 계정입니다. 해제하면 실패 횟수가 0 이 되고, 첫 로그인 때 비밀번호를 바꿔야 합니다.',
        // R-17(2026-10-02): SMTP 가 설정되어 사용자가 직접 풀 수 있습니다
        mailEnabled
          ? '사용자가 이메일 인증으로 직접 풀 수 있습니다 · 관리자 해제도 가능합니다.'
          : '이메일 잠금 해제는 메일 서버 설정 후 열립니다. 지금은 관리자 해제만 가능합니다.',
      ].filter(Boolean).join(' '),
      submitLabel: '잠금 해제',
      onSubmit: async (v) => (await unlockUser(row.empNo, (v.reset || []).includes('Y'))).ok,
    });

  /** 계정 삭제 — 함께 지워지는 것·막는 참조를 먼저 알립니다 (ACC-11) */
  const confirmDeleteUser = async (row) => {
    const check = await loadDeleteCheck(row.empNo).catch(() => null);
    const blocking = check?.blocking || {};
    const cascade = check?.cascade || {};
    const lines = [
      '삭제한 계정은 되돌릴 수 없습니다. 접속 이력과 감사 로그는 그대로 남습니다.',
      cascade.recipients ? `알림 수신자 ${cascade.recipients}건이 함께 지워집니다.` : '',
      cascade.menuGrants ? `계정 추가 메뉴 ${cascade.menuGrants}건이 함께 지워집니다.` : '',
      blocking.servingProfiles || blocking.docs
        ? `다른 설정이 이 계정을 쓰고 있어 삭제할 수 없습니다 — ${[blocking.servingProfiles ? `서빙 프로필 활성화 ${blocking.servingProfiles}건` : '', blocking.docs ? `업로드 문서 작성자 ${blocking.docs}건` : ''].filter(Boolean).join(' · ')}`
        : '',
      '퇴사·휴직이면 삭제 대신 정지를 권합니다.',
      (check?.joinSrc || row.joinSrc) === 'GROUPWARE' ? '그룹웨어에 재직 중이면 다음 동기화에서 다시 가입되지 않습니다(자동 가입 기록이 남아 있음).' : '',
    ].filter(Boolean);
    const blocked = check?.deletable === false || !!(blocking.servingProfiles || blocking.docs);
    useUiStore.getState().openModal({
      title: '계정 삭제',
      sub: `${row.name} (${row.dept})`,
      render: () => (
        <View style={{ gap: 8 }} nativeID="user-delete-check">
          {lines.map((l) => <Text key={l} style={s.text}>{l}</Text>)}
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="취소" onPress={close} />
          {row.state !== 'SUSPENDED' ? <Button label="정지로 바꾸기" onPress={() => { close(); openSuspendForm(row); }} /> : null}
          <GuardedButton reason={blocked ? '다른 설정이 이 계정을 쓰고 있어 삭제할 수 없습니다.' : undefined} label="삭제" variant="danger" onPress={() => { close(); removeUser(row.empNo); }} />
        </>
      ),
    });
  };

  const confirmDeleteDept = (row) =>
    openConfirmModal({
      title: '부서 삭제',
      sub: row.name,
      message: `${row.name} 부서를 삭제합니다. 소속 계정이나 그룹웨어 매핑·알림 수신 그룹이 이 부서를 쓰고 있으면 삭제할 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeDept(row.id),
    });

  /** 계정 행의 상태 버튼 — 잠김은 [잠금 해제], 승인 대기는 [승인]·[반려](승인 대기 카드를 없애 표에서 바로 처리, ACC-07) */
  const stateButton = (r) => {
    if (r.state === 'LOCKED') return <GuardedButton allowed={canWrite} label="잠금 해제" size="sm" onPress={() => openUnlockForm(r)} />;
    if (r.state === 'PENDING') {
      return (
        <>
          <GuardedButton allowed={canWrite} label="승인" size="sm" variant="primary" icon="check" onPress={() => confirmApprove(r)} />
          <GuardedButton allowed={canWrite} label="반려" size="sm" variant="danger" onPress={() => openRejectForm(r)} />
        </>
      );
    }
    if (r.state === 'ACTIVE') return <GuardedButton allowed={canWrite} label="정지" size="sm" onPress={() => openSuspendForm(r)} />;
    return <GuardedButton allowed={canWrite} label="사용" size="sm" onPress={() => activateUser(r.empNo)} />;
  };

  if (loading) return <Loading />;

  /* ───────── 탭별 표 ───────── */
  const userColumns = [
    { key: 'empNo', title: '아이디', width: 150, minWidth: 110, mono: true },
    {
      key: 'name',
      title: '이름',
      width: 130,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <Text style={[s.td, { fontWeight: '600', paddingHorizontal: 0, flexShrink: 1 }]}>{r.name}</Text>
          {r.empNo === me?.empNo ? <Badge tone="blue">현재</Badge> : null}
        </View>
      ),
    },
    // 이메일 (2026-10-03) — 계정 관리 목록에만 원본을 줍니다(서버 `email`)
    { key: 'email', title: '이메일', width: 230, minWidth: 180, mono: true, render: (r) => <Text style={[s.td, s.mono, { paddingHorizontal: 0 }]} numberOfLines={1}>{r.email || '—'}</Text> },
    { key: 'dept', title: '소속 부서', width: 180 },
    // 아래 4개 열은 머리글이 검색칸이 아니라 목록입니다 — 눌러서 값을 고릅니다(Tabulator list 머리글 필터)
    // 「관리자」 는 직급이 아니라 따로 둔 열로 보이고 거릅니다(2026-10-02) — 직급 목록 필터에서도 뺍니다
    { key: 'posNm', title: '직급', width: 110, filter: 'list', filterField: 'posLabel', filterOptions: posOptions.filter((o) => o.value !== 'ADMIN' && o.label !== '관리자').map((o) => o.label), render: (r) => <Text style={[s.td, { paddingHorizontal: 0 }]}>{r.posLabel || '—'}</Text> },
    {
      key: 'admin',
      title: '관리자',
      width: 110,
      filter: 'list',
      filterField: 'adminLabel',
      filterOptions: ADMIN_FILTER_ORDER,
      // 표 글자는 목록 필터 값(관리자 / 일반)과 같게 씁니다
      render: (r) => (r.adminLabel === '관리자' ? <Badge tone="blue">관리자</Badge> : <Text style={[s.td, { paddingHorizontal: 0 }]}>{r.adminLabel || '일반'}</Text>),
    },
    {
      key: 'state',
      title: '상태',
      width: 150,
      filter: 'list',
      filterField: 'stateNm',
      filterOptions: STATE_FILTER_ORDER,
      render: (r) => <UserStateBadge row={r} />,
    },
    { key: 'joinSrc', title: '가입 경로', width: 120, filter: 'list', filterField: 'joinSrcLabel', filterOptions: JOIN_FILTER_ORDER, render: (r) => <Text style={[s.td, { paddingHorizontal: 0 }]}>{r.joinSrcLabel || '—'}</Text> },
    {
      key: 'pwdChangeRequired',
      title: '초기 비밀번호',
      width: 130,
      filter: 'list',
      filterField: 'pwdStateLabel',
      filterOptions: PWD_FILTER_ORDER,
      // 표 글자는 목록 필터 값(변경 전 / 변경 완료)과 같게 씁니다
      render: (r) => (r.pwdChangeRequired ? <Badge tone="amber">변경 전</Badge> : <Text style={[s.td, { paddingHorizontal: 0 }]}>{r.pwdStateLabel || '변경 완료'}</Text>),
    },
    {
      key: 'extraMenuIds',
      title: '추가 메뉴',
      width: 110,
      align: 'right',
      filterable: false,
      render: (r) => <ExtraMenuBadge row={r} />,
    },
    {
      key: 'loginFailCnt',
      title: '로그인 실패',
      width: 140,
      align: 'right',
      render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.loginFailCnt ?? 0}</Text>,
    },
    { key: 'lastLoginAt', title: '최근 접속', width: 210, mono: true },
    {
      key: 'action',
      title: '관리',
      width: 300,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          <GuardedButton allowed={canWrite} label="편집" size="sm" onPress={() => openUserForm(r)} />
          {stateButton(r)}
          <GuardedButton allowed={canWrite} label="삭제" size="sm" variant="danger" onPress={() => confirmDeleteUser(r)} />
        </View>
      ),
    },
  ];

  // 열 폭 합계 1,070px — 탭 안(1616px 창에서 약 1,240px)에 「관리」 열의 [삭제] 까지 들어오게 맞췄습니다(2026-10-02).
  // 「약칭」 열은 없앴습니다(2026-10-02, DB 컬럼 삭제).
  // 더 좁은 창에서는 표 안에서 가로로 스크롤합니다.
  const deptColumns = [
    {
      key: 'name',
      title: '부서',
      width: 250,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={[s.td, { fontWeight: '600', paddingHorizontal: 0, flexShrink: 1 }]}>{r.name}</Text>
          {/* 「현재 소속」·「전 권한」·「시스템」 배지는 뺐습니다(2026-10-02 디자인 피드백). 미배정의 고정 권한 배지만 남깁니다 */}
          {r.systemRole === 'UNASSIGNED' ? <FixedPermBadge fixedMenus={r.fixedMenus} /> : null}
        </View>
      ),
    },
    { key: 'desc', title: '설명', flex: 1, minWidth: 170 },
    // 소속 계정 · 메뉴 권한 · 데이터 권한은 숫자라 열 필터를 두지 않습니다(2026-10-02)
    { key: 'userCnt', title: '소속 계정', width: 100, align: 'right', num: true, filterable: false },
    {
      key: 'menuCnt',
      title: '메뉴 권한',
      width: 100,
      align: 'right',
      filterable: false,
      render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{permCountText(r, 'menu')}</Text>,
    },
    {
      key: 'dataCnt',
      title: '데이터 권한',
      width: 100,
      align: 'right',
      filterable: false,
      render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{permCountText(r, 'data')}</Text>,
    },
    {
      key: 'action',
      title: '관리',
      width: 350,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          <GuardedButton allowed={canWrite} label="편집" size="sm" onPress={() => openDeptForm(r)} />
          {/* 받는 화면이 이 부서 열을 강조합니다(ACC-10, 받는 화면 쪽 변경은 03·04 소관) */}
          <Button label="메뉴 권한" size="sm" onPress={() => goToScreen('sys-menu', { deptId: r.id })} />
          <Button label="데이터 권한" size="sm" onPress={() => goToScreen('sys-data', { deptId: r.id })} />
          <GuardedButton allowed={canWrite} reason={deptDeleteBlock(r)} label="삭제" size="sm" variant="danger" onPress={() => confirmDeleteDept(r)} />
        </View>
      ),
    },
  ];

  const logColumns = [
    { key: 'ts', title: '시각', width: 210, mono: true },
    { key: 'target', title: '대상', width: 170 },
    {
      key: 'act',
      title: '구분',
      width: 190,
      filterField: 'actNm',
      render: (r) => {
        const label = r.actNm || actName(r.actType);
        return <Badge tone={r.actType === 'ACCOUNT' ? 'blue' : r.actType === 'DEPT' ? 'amber' : ''}>{label}</Badge>;
      },
    },
    { key: 'detail', title: '변경 내용', flex: 1, minWidth: 250, wrap: true },
    // 「이름 (사번)」 — 열 키는 by 그대로 두고(열 필터·시험 호환) 보이는 값과 필터 값만 byLabel 로 씁니다(2026-10-02)
    {
      key: 'by',
      title: '수행자',
      width: 190,
      filterField: 'byLabel',
      render: (r) => <Text style={[s.td, { paddingHorizontal: 0 }]}>{r.byLabel || r.by || '—'}</Text>,
    },
  ];

  /** 탭 머리 오른쪽 — 그 탭의 표에 쓰는 단추만 둡니다(예전 머리말·카드 오른쪽 단추를 옮김) */
  const tabActions = {
    [TAB_USERS]: (
      <>
        {/* 「사용 n」 · 「정지 n」 배지는 뺐습니다(2026-10-02) — 손볼 일이 있는 잠김 · 승인 대기만 있을 때 보입니다 */}
        {cnt.locked ? <Badge tone="amber">{`잠김 ${cnt.locked}`}</Badge> : null}
        {cnt.pending ? <Badge tone="amber">{`승인 대기 ${cnt.pending}`}</Badge> : null}
        {/* 엑셀은 조회 권한이면 받을 수 있습니다(R-10) — 쓰기 권한과 무관 */}
        <ExportMenuButton viewCount={userViewCount} totalCount={userTotal} onExportView={exportView} onExportAll={exportAll} />
        <GuardedButton allowed={canWrite} label="계정 등록" size="sm" variant="primary" icon="plus" onPress={() => openUserForm(null)} />
      </>
    ),
    [TAB_DEPTS]: <GuardedButton allowed={canWrite} label="부서 등록" size="sm" variant="primary" icon="plus" onPress={() => openDeptForm(null)} />,
    [TAB_LOGS]: null,
  };

  /** 탭 내용 첫 줄 — 예전 카드 부제 */
  const tabSub = {
    [TAB_USERS]: null,
    [TAB_DEPTS]: '권한 부여 단위 · 소속 계정이 있으면 삭제할 수 없습니다',
    // 기간은 위 조건 줄에 보이므로 따로 적지 않습니다(2026-10-02)
    [TAB_LOGS]: null,
  };

  return (
    <View>
      <PageHead
        title="계정 관리"
        desc="로그인 아이디와 소속 부서를 등록·수정·삭제합니다. 부서 기본 권한에 계정별 메뉴 접근을 추가로 허용할 수 있습니다."
      />

      {/* 메일 발송 실패 경고 (R-17) — 쓰기 권한자에게만(컨트롤러가 거름) */}
      {mailLastFailAt ? (
        <>
          <FormAlert>{`최근 메일 발송 실패 ${mailLastFailAt} — 한비로 SMTP 계정이 32일 미로그인으로 꺼졌는지 확인하세요. 꺼져 있으면 이메일 잠금 해제·비밀번호 찾기가 멈춥니다.`}</FormAlert>
          <Gap size={16} />
        </>
      ) : null}
      {!canWrite ? (
        <>
          <FormAlert tone="info">{`조회 전용입니다 — ${WRITE_DENIED}`}</FormAlert>
          <Gap size={16} />
        </>
      ) : null}

      <Grid cols={3}>
        {/* 부제는 두지 않습니다(2026-10-02) — 상태별 수는 계정 탭 머리의 배지가 보입니다. 세 카드는 높이를 맞춥니다(flex 1) */}
        <StatCard
          label="가입 계정"
          value={(cnt.active ?? 0) + (cnt.locked ?? 0) + (cnt.suspended ?? 0) + (cnt.pending ?? 0)}
          unit="개"
          style={STAT_FILL}
          labelStyle={STAT_LABEL}
        />
        <StatCard
          label="미배정 계정"
          value={unassignedCnt}
          unit="명"
          style={STAT_FILL}
          labelStyle={STAT_LABEL}
        />
        <StatCard label="부서" value={summary?.deptCnt ?? 0} unit="개" style={STAT_FILL} labelStyle={STAT_LABEL} />
      </Grid>
      <Gap size={24} />

      <CardTabs
        id="account"
        value={tab}
        onChange={setTab}
        items={[
          { value: TAB_USERS, label: '계정', icon: 'users', count: userTotal },
          { value: TAB_DEPTS, label: '부서', icon: 'layers', count: summary?.deptCnt ?? depts.length },
          { value: TAB_LOGS, label: '계정·권한 변경 이력', icon: 'history', count: logGrid.meta?.total ?? logs.length },
        ]}
        right={tabActions[tab]}
      >
        {tab === TAB_DEPTS ? (
          // 삭제 제약은 놓치면 안 되는 규칙이라 강조합니다(2026-10-02)
          <View style={{ marginBottom: 12 }}>
            <FormAlert tone="info">{tabSub[tab]}</FormAlert>
          </View>
        ) : tabSub[tab] ? (
          <Text style={[s.textSm, { marginBottom: 12 }]}>{tabSub[tab]}</Text>
        ) : null}
        {tab === TAB_USERS ? (
          <AccountGrid grid={userGrid} label="계정"
            exportRef={userExportRef}
            onActiveChange={onUserActiveChange}
            // 검색줄(검색칸 · 검색 · 초기화)과 빠른 필터는 뺐습니다(2026-10-02) — 열 머리글 필터로 거릅니다
            searchable={false}
            minWidth={1840}
            keyExtractor={(r) => r.empNo}
            columns={userColumns}
            rows={users}
          />
        ) : null}
        {tab === TAB_DEPTS ? (
          <AccountGrid grid={deptGrid} label="부서"
            // 부서는 몇 개뿐이라 검색줄(검색칸 · 검색 · 초기화)과 안내 문장을 두지 않습니다 — 열 필터만 씁니다
            searchable={false}
            minWidth={1070}
            keyExtractor={(r) => r.id}
            columns={deptColumns}
            rows={depts}
          />
        ) : null}
        {tab === TAB_LOGS ? (
          <>
            <LogFilterBar filter={logFilter} onApply={applyLogFilter} />
            <AccountGrid grid={logGrid} label="변경 이력"
              // 검색줄과 안내 문장은 뺐습니다(2026-10-02) — 기간 조건과 열 머리글 필터로 거릅니다
              searchable={false}
              minWidth={840}
              keyExtractor={(r, i) => `${r.ts}-${i}`}
              columns={logColumns}
              rows={logs}
            />
          </>
        ) : null}
      </CardTabs>
    </View>
  );
}

/**
 * 이력 조건 — 기간(최대 365일, 기본 최근 7일) (ACC-09)
 * 구분 · 대상 사번 칸은 뺐습니다(2026-10-02) — 구분 · 대상은 표의 열 머리글 필터로 거릅니다.
 * 편집 폼의 [이 계정의 최근 이력] 도 뺐으므로(2026-10-02) 대상 사번 조건 표시 · [해제] 도 두지 않습니다.
 */
function LogFilterBar({ filter, onApply }) {
  const [draft, setDraft] = useState(filter);
  const [error, setError] = useState('');
  // 바깥에서 조건을 바꾸면 입력칸도 맞춥니다
  const [seen, setSeen] = useState(filter);
  if (seen !== filter) { setSeen(filter); setDraft(filter); }
  const apply = () => setError(onApply(draft) || '');
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Filters>
        <DateField label="시작" min={null} max={null} value={draft.from} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
        <DateField label="종료" min={null} max={null} value={draft.to} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
        <Button label="조회" variant="primary" onPress={apply} />
      </Filters>
      {error ? <FormAlert>{error}</FormAlert> : null}
    </View>
  );
}

/**
 * 부서를 바꿀 때 권한 수 비교 (ACC-06) — 이미 받은 메뉴 권한 매트릭스와 부서 dataCnt 로 셉니다(perm-compare API 는 부르지 않음)
 */
function DeptCompare({ from, to, matrix, deptOptions }) {
  const s = useCommonStyles();
  if (to === undefined || to === null || String(from) === String(to)) return null;
  const opt = (id) => deptOptions.find((o) => String(o.value) === String(id));
  const target = opt(to);
  if (!target) return null;
  if (target.superAdmin) return <Text style={s.textSm} nativeID="dept-compare">이동 후 메뉴·데이터 전체(통합관리자)</Text>;
  const menusOf = (id) => new Set(matrix?.[String(id)] || []);
  const cur = menusOf(from); const next = menusOf(to);
  const added = [...next].filter((m) => !cur.has(m)).length;
  const removed = [...cur].filter((m) => !next.has(m)).length;
  const curData = opt(from)?.dataCnt; const nextData = target.dataCnt;
  const dataDiff = typeof curData === 'number' && typeof nextData === 'number' ? ` (${nextData - curData >= 0 ? '+' : ''}${nextData - curData})` : '';
  return (
    <Text style={s.textSm} nativeID="dept-compare">
      {`이동 후 메뉴 ${next.size}개(현재 부서 대비 +${added}/-${removed}) · 데이터 항목 ${nextData ?? '—'}개${dataDiff}`}
    </Text>
  );
}

/** 부서 표 「메뉴 권한」·「데이터 권한」 칸 — 통합관리자 "전체", 미배정 "5(고정)"·"0(고정)" (ACC-14) */
function permCountText(r, kind) {
  if (r.superAdmin) return '전체';
  if (r.lockedPerms) {
    const n = kind === 'menu' ? (r.fixedMenus || []).length : (r.fixedDataFields || []).length;
    return `${n}(고정)`;
  }
  const n = kind === 'menu' ? r.menuCnt : r.dataCnt;
  return n === undefined || n === null ? '—' : String(n);
}

/** 계정 상태 배지 — 사용 green · 잠김 amber(자물쇠) · 정지 red + 사유 · 승인 대기 amber (ACC-05) */
function UserStateBadge({ row }) {
  const theme = useTheme();
  if (row.state === 'LOCKED') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="lock" size={13} color={theme.color.warning || theme.color.mutedForeground} />
        <Badge tone="amber">{row.stateNm || '잠김'}</Badge>
      </View>
    );
  }
  if (row.state === 'SUSPENDED') {
    const reason = STATE_REASON_LABEL[row.stateReason];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Badge tone="red">{row.stateNm || '정지'}</Badge>
        {reason ? <Badge>{reason}</Badge> : null}
      </View>
    );
  }
  return <Badge tone={row.state === 'ACTIVE' ? 'green' : row.state === 'PENDING' ? 'amber' : 'red'}>{row.stateNm}</Badge>;
}

/** 계정 표 「추가 메뉴」 칸 — 개수 배지, 마우스를 올리면 화면 이름·사유 목록 (ACC-10) */
function ExtraMenuBadge({ row }) {
  const s = useCommonStyles();
  const list = row.extraMenus?.length ? row.extraMenus : (row.extraMenuIds || []).map((id) => ({ id }));
  const ref = useDomTitle(list.map((m) => `${pageName(m.id)}${m.reason ? ` — ${m.reason}` : ''}`).join('\n'));
  if (!list.length) return <Text style={[s.td, s.num, { textAlign: 'right' }]}>0</Text>;
  return (
    <View ref={ref}>
      <Badge tone="blue">{`${list.length}개`}</Badge>
    </View>
  );
}

/** 미배정 부서 「고정 권한 · 변경 불가」 배지 — 마우스를 올리면 허용 화면 목록 (ACC-14, R-11) */
function FixedPermBadge({ fixedMenus }) {
  const ref = useDomTitle(`허용 화면 ${(fixedMenus || []).length}개(조회 전용): ${(fixedMenus || []).map(pageName).join(', ')} · 데이터 권한 0건`);
  return (
    <View ref={ref}>
      <Badge tone="amber">고정 권한 · 변경 불가</Badge>
    </View>
  );
}
