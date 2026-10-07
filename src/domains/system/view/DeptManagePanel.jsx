/**
 * [View] 부서 관리 — 부서 매핑 화면(SY-17)의 「부서」 탭 (2026-10-07)
 *
 * 계정 관리(SY-01)의 「부서」 탭 내용과 기능을 그대로 옮겼습니다 — 부서 · 설명 · 소속 계정 · 메뉴 권한 · 데이터 권한 · 관리([편집] · [삭제])
 * 와 탭 머리의 [부서 등록]. 상태 · 동작은 useDeptManageController 가 들고, 이 파일은 그리기만 합니다.
 *  · 시스템 부서(통합관리자 · 미배정)는 삭제할 수 없고, 미배정은 이름도 바꿀 수 없습니다(ACC-04)
 *  · 소속 계정이 있는 부서는 삭제할 수 없습니다(서버도 409)
 *  · 등록 · 편집 · 삭제는 계정 관리 쓰기 권한이 있어야 합니다 — 없으면 단추를 비활성으로 두고 이유를 툴팁으로 보입니다
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Badge, FormAlert, Loading, openConfirmModal, openFormModal } from '@shared/components/ui';
import { pageName } from '@shared/constants/menu';
import { useCommonStyles } from '@shared/theme/styles';
import { DEPT_WRITE_DENIED } from '../controller/useDeptManageController';
import AccountGrid from './AccountGrid';
import { GuardedButton, useDomTitle } from './WriteGuard';

/** 시스템 부서 보호 안내 (ACC-04) */
const SYSTEM_DEPT_DELETE = '통합관리자·미배정 부서는 삭제할 수 없습니다. 자동 가입과 권한 판정이 이 부서를 씁니다.';
const UNASSIGNED_NAME_LOCK = '미배정 부서는 이름을 바꿀 수 없습니다. 자동 가입과 권한 판정이 이 부서를 씁니다.';
/** 탭 안 첫 줄 — 놓치면 안 되는 삭제 규칙이라 강조합니다 */
export const DEPT_TAB_NOTE = '권한 부여 단위 · 소속 계정이 있으면 삭제할 수 없습니다';

/** 부서 [삭제] 를 끄는 이유 — 시스템 부서 · 소속 계정이 있는 부서 */
const deptDeleteBlock = (r) => {
  if (r.systemRole) return SYSTEM_DEPT_DELETE;
  if (Number(r.userCnt) > 0) return `소속 계정 ${r.userCnt}명이 있어 삭제할 수 없습니다. 계정을 다른 부서로 옮긴 뒤 삭제하세요.`;
  return undefined;
};

/** 「메뉴 권한」 · 「데이터 권한」 칸 — 통합관리자 「전체」, 미배정은 고정 수 (ACC-14) */
function permCountText(r, kind) {
  if (r.superAdmin) return '전체';
  if (r.lockedPerms) return String(kind === 'menu' ? (r.fixedMenus || []).length : (r.fixedDataFields || []).length);
  const n = kind === 'menu' ? r.menuCnt : r.dataCnt;
  return n === undefined || n === null ? '—' : String(n);
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

/** 부서 등록 · 편집 모달 — 폼 키는 서버 요청 본문(deptNm · desc · initPermFrom)과 같습니다 */
export function openDeptForm({ row, initPermOptions, submitDept }) {
  const nameLocked = row?.systemRole === 'UNASSIGNED';
  openFormModal({
    title: row ? '부서 편집' : '부서 등록',
    sub: '시스템관리 > 부서 매핑',
    initial: row ? { deptNm: row.name, desc: row.desc } : { initPermFrom: '' },
    fields: [
      nameLocked
        ? { key: 'deptNmStatic', label: '부서명', type: 'static', value: `${row.name} — ${UNASSIGNED_NAME_LOCK}` }
        : { key: 'deptNm', label: '부서명', required: true, placeholder: '예) 공정기술팀' },
      { key: 'desc', label: '설명', full: true, placeholder: '예) 공정 조건 · 금형 관리' },
      row
        ? { key: 'perm', label: '권한', type: 'static', full: true, value: row.systemRole === 'UNASSIGNED' ? '미배정 부서의 권한은 고정입니다 — 대시보드 3개·덕반장 AI·자연어 질의 이력 조회, 데이터 권한 0건' : '권한은 메뉴 접근 권한 / 데이터 접근 권한 화면에서 설정합니다' }
        : { key: 'initPermFrom', label: '초기 권한 (복사해 올 부서)', type: 'select', full: true, options: initPermOptions },
    ],
    note: row
      ? (nameLocked ? '설명은 바꿀 수 있습니다.' : '부서명을 바꾸면 소속 계정과 권한 설정이 함께 따라갑니다.')
      : '초기 권한을 고르면 그 부서의 메뉴 접근 권한을 그대로 복사해 시작합니다. 데이터 접근 권한은 데이터 접근 권한 화면에서 따로 지정하세요.',
    submitLabel: row ? '수정' : '등록',
    onSubmit: async (v) => !!(await submitDept(row?.id, v))?.ok,
  });
}

/** 탭 머리 오른쪽 [부서 등록] */
export function DeptRegisterButton({ deptCanWrite, initPermOptions, submitDept }) {
  return (
    <GuardedButton
      reason={deptCanWrite ? undefined : DEPT_WRITE_DENIED}
      label="부서 등록"
      size="sm"
      variant="primary"
      icon="plus"
      onPress={() => openDeptForm({ row: null, initPermOptions, submitDept })}
    />
  );
}

export default function DeptManagePanel({ depts, deptLoading, deptError, deptCanWrite, initPermOptions, submitDept, removeDept }) {
  const s = useCommonStyles();
  const deny = deptCanWrite ? undefined : DEPT_WRITE_DENIED;

  const confirmDelete = (row) =>
    openConfirmModal({
      title: '부서 삭제',
      sub: row.name,
      message: `${row.name} 부서를 삭제합니다. 소속 계정이나 그룹웨어 매핑·알림 수신 그룹이 이 부서를 쓰고 있으면 삭제할 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeDept(row.id),
    });

  // 열 폭은 계정 관리에 있을 때와 같습니다. 좁은 창에서는 표 안에서 가로로 스크롤합니다
  const columns = [
    {
      key: 'name',
      title: '부서',
      width: 250,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={[s.td, { fontWeight: '600', paddingHorizontal: 0, flexShrink: 1 }]}>{r.name}</Text>
          {r.systemRole === 'UNASSIGNED' ? <FixedPermBadge fixedMenus={r.fixedMenus} /> : null}
        </View>
      ),
    },
    { key: 'desc', title: '설명', flex: 1, minWidth: 170 },
    { key: 'userCnt', title: '소속 계정', width: 100, align: 'right', num: true, filterable: false },
    {
      key: 'menuCnt', title: '메뉴 권한', width: 100, align: 'right', filterable: false,
      render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{permCountText(r, 'menu')}</Text>,
    },
    {
      key: 'dataCnt', title: '데이터 권한', width: 100, align: 'right', filterable: false,
      render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{permCountText(r, 'data')}</Text>,
    },
    {
      key: 'action',
      title: '관리',
      width: 170,
      sortable: false,
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          <GuardedButton reason={deny} label="편집" size="sm" onPress={() => openDeptForm({ row: r, initPermOptions, submitDept })} />
          <GuardedButton reason={deny || deptDeleteBlock(r)} label="삭제" size="sm" variant="danger" onPress={() => confirmDelete(r)} />
        </View>
      ),
    },
  ];

  if (deptError) return <FormAlert>{deptError}</FormAlert>;
  if (deptLoading) return <Loading />;
  return (
    <View style={{ gap: 12 }}>
      <FormAlert tone="info">{DEPT_TAB_NOTE}</FormAlert>
      <AccountGrid
        grid={{ rows: depts, localFilters: true, loading: false, error: null }}
        label="부서"
        searchable={false}
        minWidth={890}
        keyExtractor={(r) => r.id}
        columns={columns}
        rows={depts}
      />
    </View>
  );
}
