/**
 * [View] SY-01 계정 관리 (경로: /system/account)
 *
 * 접근 권한은 계정이 아니라 부서에 부여되므로, 계정에 부서를 지정하면
 * 그 부서의 메뉴 접근 권한과 데이터 접근 권한이 그대로 적용됩니다.
 * 회원가입(/signup)으로 들어온 신청은 승인 대기 상태로 쌓이며, 이 화면에서 승인해야 로그인할 수 있습니다.
 * 사용 API 15건 — /api/v1/system/users, /system/users/pending, /system/depts, /system/perm-logs
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Hint, Loading, Pagination, StatCard, Table, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { POSITIONS, positionLabel } from '@shared/constants/accounts';
import { useCommonStyles } from '@shared/theme/styles';

/** 직급 선택지 예비값 — 공통코드(SYS_POSITION)를 아직 못 받았을 때만 씁니다 */
const POSITION_FALLBACK = POSITIONS.map((p) => ({ value: p.code, label: p.label }));

/** 변경 이력 구분 코드 표기 (리포지토리 표에 없는 코드용 예비) */
const ACT_FALLBACK = { MENU_PERM: '메뉴 권한', DATA_PERM: '데이터 권한', ACCOUNT: '계정', DEPT: '부서' };

/** 계정 상태 선택지 — 서버 `user_state_cd` */
const STATE_OPTIONS = [
  { value: 'ACTIVE', label: '사용' },
  { value: 'SUSPENDED', label: '정지' },
];

export default function AccountView({
  loading, me, summary, users, depts, pending, deptOptions, positionOptions, logs, exportExcel,
  submitUser, submitDept, removeUser, removeDept, toggleState, moveDept,
  approveSignup, rejectSignup, paging, itemsMeta,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const posOptions = positionOptions?.length ? positionOptions : POSITION_FALLBACK;
  const posLabel = (code) => posOptions.find((o) => o.value === code)?.label || positionLabel(code);

  /* ───────── 계정 등록·편집 ───────── */
  const openUserForm = (row) =>
    openFormModal({
      title: row ? '계정 편집' : '계정 등록',
      sub: '접근 권한은 소속 부서 설정을 그대로 따릅니다',
      initial: row
        ? { empNo: row.empNo, name: row.name, deptId: row.deptId, pos: row.pos, state: row.state }
        : { deptId: deptOptions[0]?.value, pos: 'STAFF', state: 'ACTIVE' },
      fields: [
        { key: 'empNo', label: '아이디 (사번)', required: true, placeholder: '예) 20260101' },
        { key: 'name', label: '이름', required: true },
        { key: 'deptId', label: '소속 부서', type: 'select', options: deptOptions, required: true },
        { key: 'pos', label: '직급', type: 'select', options: posOptions },
        { key: 'state', label: '상태', type: 'radio', options: STATE_OPTIONS, full: true },
      ],
      note: '부서를 지정하면 그 부서의 메뉴 접근 권한과 데이터 접근 권한이 즉시 적용됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitUser(row?.empNo, v)).ok,
    });

  /* ───────── 부서 등록·편집 ───────── */
  // 폼 키는 서버 요청 본문(deptNm · abbr · desc · initPermFrom)과 같게 둡니다.
  // 예전엔 name · av · copyFrom 으로 보내서 서버가 받는 항목이 하나도 없었습니다.
  const openDeptForm = (row) =>
    openFormModal({
      title: row ? '부서 편집' : '부서 등록',
      sub: '시스템관리 > 계정 관리',
      initial: row ? { deptNm: row.name, abbr: row.abbr, desc: row.desc } : { initPermFrom: '' },
      fields: [
        { key: 'deptNm', label: '부서명', required: true, placeholder: '예) 공정기술팀' },
        { key: 'abbr', label: '약칭 (2자)', required: true, placeholder: '예) PE' },
        { key: 'desc', label: '설명', full: true, placeholder: '예) 공정 조건 · 금형 관리' },
        row
          ? { key: 'perm', label: '권한', type: 'static', full: true, value: '권한은 메뉴 접근 권한 / 데이터 접근 권한 화면에서 설정합니다' }
          : {
              key: 'initPermFrom',
              label: '초기 권한 (복사해 올 부서)',
              type: 'select',
              full: true,
              options: [{ value: '', label: '빈 권한 — 등록 후 직접 지정' }, ...deptOptions],
            },
      ],
      note: row
        ? '부서명을 바꾸면 소속 계정과 권한 설정이 함께 따라갑니다.'
        : '초기 권한을 고르면 그 부서의 메뉴 접근 권한을 그대로 복사해 시작합니다. 데이터 접근 권한은 데이터 접근 권한 화면에서 따로 지정하세요.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitDept(row?.id, v)).ok,
    });

  /* ───────── 부서 이동 ───────── */
  const openDeptMove = (row) =>
    openFormModal({
      title: '부서 이동',
      sub: `${row.name} · 현재 ${row.dept}`,
      initial: { deptId: row.deptId },
      fields: [{ key: 'deptId', label: '이동할 부서', type: 'select', options: deptOptions, required: true, full: true }],
      note: '부서를 옮기면 메뉴 접근 권한과 데이터 접근 권한이 새 부서 기준으로 즉시 바뀝니다.',
      submitLabel: '이동',
      onSubmit: async (v) => (await moveDept(row.empNo, v.deptId)).ok,
    });

  /* ───────── 회원가입 승인 · 반려 ───────── */
  const confirmApprove = (row) =>
    openConfirmModal({
      title: '가입 승인',
      sub: `${row.name} (${row.dept})`,
      message: `${row.empNo} 계정의 가입을 승인합니다. 승인하면 ${row.dept} 부서의 메뉴·데이터 접근 권한이 그대로 적용되고, 즉시 로그인할 수 있습니다.`,
      confirmLabel: '승인',
      onConfirm: () => approveSignup(row.empNo),
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

  const confirmDeleteUser = (row) =>
    openConfirmModal({
      title: '계정 삭제',
      sub: `${row.name} (${row.dept})`,
      message: '삭제한 계정은 되돌릴 수 없습니다. 접속 이력과 감사 로그는 그대로 남습니다. 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeUser(row.empNo),
    });

  const confirmDeleteDept = (row) =>
    openConfirmModal({
      title: '부서 삭제',
      sub: row.name,
      message: `${row.name} 부서를 삭제합니다. 소속 계정이 있으면 삭제할 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeDept(row.id),
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="계정 관리"
        desc="로그인 아이디와 소속 부서를 등록·수정·삭제합니다. 접근 권한은 계정이 아니라 부서에 부여되므로, 계정에 부서를 지정하면 그 부서의 메뉴 접근 권한과 데이터 접근 권한이 그대로 적용됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="메뉴 접근 권한" size="sm" icon="lock" onPress={() => goToScreen('sys-menu')} />
            <Button label="부서 등록" size="sm" icon="plus" onPress={() => openDeptForm(null)} />
            <Button label="계정 등록" size="sm" variant="primary" icon="plus" onPress={() => openUserForm(null)} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard
          label="가입 계정"
          value={(summary?.userCnt?.active ?? 0) + (summary?.userCnt?.suspended ?? 0)}
          unit="개"
          sub={`사용 ${summary?.userCnt?.active ?? 0} · 정지 ${summary?.userCnt?.suspended ?? 0}`}
        />
        <StatCard
          label="승인 대기"
          value={pending.length}
          unit="건"
          sub={pending.length ? '승인해야 로그인할 수 있습니다' : '대기 중인 신청 없음'}
          tone={pending.length ? 'down' : undefined}
          right={pending.length ? <Badge tone="amber">승인 필요</Badge> : null}
        />
        <StatCard label="부서" value={summary?.deptCnt ?? 0} unit="개" sub="권한 부여 단위" />
        <StatCard label="현재 로그인" value={me?.name} sub={`${me?.dept} · ${posLabel(me?.pos)}`} />
      </Grid>
      <Gap />

      <Hint>
        계정은 아이디 · 이름 · 부서 · 직급 · 상태만 관리합니다. 어떤 화면과 데이터를 볼 수 있는지는 전부 부서 설정을 따릅니다 — 부서를 바꾸면 권한도 그 자리에서 함께 바뀝니다.
      </Hint>

      {/* 회원가입 신청 — 승인해야 로그인할 수 있으므로 계정 목록보다 위에 둡니다 */}
      {pending.length ? (
        <>
          <Card
            title="가입 승인 대기"
            sub="회원가입 화면에서 들어온 신청입니다. 승인해야 로그인할 수 있습니다"
            tight
            right={<Badge tone="amber">{`${pending.length}건`}</Badge>}
          >
            <Table
              minWidth={760}
              keyExtractor={(r) => r.empNo}
              columns={[
                { key: 'empNo', title: '아이디', width: 110, mono: true },
                { key: 'name', title: '이름', width: 120 },
                { key: 'dept', title: '신청 부서', width: 130 },
                { key: 'posNm', title: '직급', width: 90 },
                {
                  key: 'state',
                  title: '상태',
                  width: 96,
                  render: () => <Badge tone="amber">승인 대기</Badge>,
                },
                {
                  key: 'action',
                  title: '처리',
                  flex: 1,
                  minWidth: 180,
                  render: (r) => (
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      <Button label="승인" size="sm" variant="primary" icon="check" onPress={() => confirmApprove(r)} />
                      <Button label="반려" size="sm" variant="danger" onPress={() => openRejectForm(r)} />
                    </View>
                  ),
                },
              ]}
              rows={pending}
            />
            <View style={{ padding: 14 }}>
              <Hint>
                승인하면 신청 부서의 메뉴 접근 권한과 데이터 접근 권한이 그대로 적용됩니다. 부서를 바꿔서 승인하려면 먼저 승인한 뒤 계정 표에서 부서를 이동하세요.
              </Hint>
            </View>
          </Card>
          <Gap />
        </>
      ) : null}

      <Card
        title="계정"
        sub="아이디 · 부서 등록 · 수정 · 삭제"
        tight
        right={
          <>
            <Badge tone="green">{`사용 ${summary?.userCnt?.active ?? 0}`}</Badge>
            <Badge>{`정지 ${summary?.userCnt?.suspended ?? 0}`}</Badge>
          </>
        }
      >
        <Table
          minWidth={1080}
          keyExtractor={(r) => r.empNo}
          columns={[
            { key: 'empNo', title: '아이디', width: 100, mono: true },
            {
              key: 'name',
              title: '이름',
              width: 130,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                  <Text style={[s.td, { fontWeight: '600', paddingHorizontal: 0 }]}>{r.name}</Text>
                  {r.empNo === me?.empNo ? <Badge tone="blue">현재</Badge> : null}
                  {r.switchable ? <Badge>전환</Badge> : null}
                </View>
              ),
            },
            { key: 'dept', title: '소속 부서', width: 108 },
            { key: 'posNm', title: '직급', width: 76 },
            {
              key: 'state',
              title: '상태',
              width: 84,
              render: (r) => <Badge tone={r.state === 'ACTIVE' ? 'green' : r.state === 'PENDING' ? 'amber' : 'red'}>{r.stateNm}</Badge>,
            },
            {
              key: 'loginFailCnt',
              title: '로그인 실패',
              width: 94,
              align: 'right',
              render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{r.loginFailCnt ?? 0}</Text>,
            },
            { key: 'lastLoginAt', title: '최근 접속', width: 150, mono: true },
            {
              key: 'action',
              title: '관리',
              width: 250,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  <Button label="편집" size="sm" onPress={() => openUserForm(r)} />
                  <Button label="부서 이동" size="sm" onPress={() => openDeptMove(r)} />
                  <Button label={r.state === 'ACTIVE' ? '정지' : '사용'} size="sm" onPress={() => toggleState(r.empNo, r.state)} />
                  <Button label="삭제" size="sm" variant="danger" onPress={() => confirmDeleteUser(r)} />
                </View>
              ),
            },
          ]}
          rows={users}
        />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
      <Gap />

      <Card
        title="부서"
        sub="권한 부여 단위 · 소속 계정이 있으면 삭제할 수 없습니다"
        tight
        right={<Button label="부서 등록" size="sm" icon="plus" onPress={() => openDeptForm(null)} />}
      >
        <Table
          minWidth={980}
          keyExtractor={(r) => r.id}
          columns={[
            {
              key: 'name',
              title: '부서',
              width: 140,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                  <Text style={[s.td, { fontWeight: '600', paddingHorizontal: 0 }]}>{r.name}</Text>
                  {r.name === me?.dept ? <Badge tone="blue">현재 소속</Badge> : null}
                  {r.superAdmin ? <Badge tone="blue">전 권한</Badge> : null}
                </View>
              ),
            },
            { key: 'abbr', title: '약칭', width: 70, mono: true },
            { key: 'desc', title: '설명', flex: 1, minWidth: 190 },
            { key: 'userCnt', title: '소속 계정', width: 88, align: 'right', num: true },
            {
              key: 'action',
              title: '관리',
              width: 250,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  <Button label="편집" size="sm" onPress={() => openDeptForm(r)} />
                  <Button label="메뉴 권한" size="sm" onPress={() => goToScreen('sys-menu')} />
                  <Button label="데이터 권한" size="sm" onPress={() => goToScreen('sys-data')} />
                  <Button label="삭제" size="sm" variant="danger" onPress={() => confirmDeleteDept(r)} />
                </View>
              ),
            },
          ]}
          rows={depts}
        />
      </Card>
      <Gap />

      <Card title="계정·권한 변경 이력" sub="최근 10건" tight>
        <Table
          minWidth={840}
          keyExtractor={(r, i) => `${r.ts}-${i}`}
          columns={[
            { key: 'ts', title: '시각', width: 150, mono: true },
            { key: 'target', title: '대상', width: 170 },
            {
              key: 'act',
              title: '구분',
              width: 108,
              render: (r) => {
                const label = ACT_FALLBACK[r.act] || r.act || ACT_FALLBACK[r.actType] || r.actType || '—';
                return <Badge tone={label === '계정' ? 'blue' : label === '부서' ? 'amber' : ''}>{label}</Badge>;
              },
            },
            { key: 'detail', title: '변경 내용', flex: 1, minWidth: 250, wrap: true },
            { key: 'by', title: '수행자', width: 160 },
          ]}
          rows={logs}
        />
      </Card>
    </View>
  );
}
