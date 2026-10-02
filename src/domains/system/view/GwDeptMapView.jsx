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
import React, { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, CheckRow, ExportMenuButton, Filters, FormAlert, Hint, Loading, SelectField, StatCard, Table, TabulatorGrid, Tabs, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { GW_MAP_STATES, NO_DEPT, SKIP_REASON_LABEL, UNASSIGNED_SCOPE, USER_STATE_FILTER, gwStateLabel, userStateLabel } from '../controller/useGwDeptMapController';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { GuardedButton, WRITE_DENIED } from './WriteGuard';
import { useTableActive } from './useTableActive';

const STATE_TAG = { MAPPED: 'tag-green', UNMAPPED: 'tag-amber', EXCLUDED: '' };

/** 확인 모달에 이름을 늘어놓는 최대 인원 (GWD-01) */
const LIST_MAX = 20;

export default function GwDeptMapView({
  loading, loadError, loadErrorText, summary, health, canWrite, maps, users, depts,
  tab, setTab, filters, setKeyword, setState, setUserKeyword,
  selectedMaps, setSelectedMaps, selectedUsers, setSelectedUsers, reassignableCnt, reassignTarget,
  mapTableRef, userTableRef, setVisibleMaps, setVisibleUsers,
  reload, exportTabName, exportViewCount, exportTotalCount, exportView, exportAll,
  saveMap, saveMapsBulk, removeMap, reassign, moveUser,
  mapTotal, userTotal, refreshing, openUsersOf, unassignedOf, exportReassignResult,
  setUserState, mapOf, inheritCandidates, inheritMap, mapLogs, logsOf, sync, canGoSync, unassignedPwdInitCnt,
}) {
  const { goToScreen } = useAppNavigation();
  const [logsOpen, setLogsOpen] = useState(false);
  // 표 안의 버튼은 HTML 로 그리고 클릭은 cellClick 에서 받습니다. 열 정의는 한 번만 만들고
  // 최신 핸들러는 ref 로 읽습니다(return 직전에 채움) — 훅이라 조기 return 보다 위에 둡니다.
  const handlers = useRef({});
  const s = useCommonStyles();
  const deny = canWrite ? '' : WRITE_DENIED;

  // 열 검색으로 좁혀진 「보이는 행」 을 컨트롤러에 알립니다 — 재배정 대상·조회 목록 엑셀 기준(GWD-01·15)
  useTableActive(mapTableRef, setVisibleMaps);
  useTableActive(userTableRef, setVisibleUsers);

  const mapColumns = useMemo(() => [
    {
      title: '그룹웨어 부서',
      field: 'gwDeptNm',
      minWidth: 170,
      formatter: (c) => {
        const r = c.getRow().getData();
        return `<span class="strong">${esc(r.gwDeptNm)}</span>${r.inSource === false ? ' <span class="tag" title="그룹웨어 인사정보에 이 부서의 재직자가 없습니다">그룹웨어에 없음</span>' : ''}`;
      },
    },
    { title: '재직', field: 'activeCnt', sorter: 'number', width: 76, hozAlign: 'right', headerFilter: false, formatter: (c) => num(c.getValue()) },
    { title: '가입 계정', field: 'joinedCnt', sorter: 'number', width: 90, hozAlign: 'right', headerFilter: false, formatter: (c) => num(c.getValue()) },
    {
      title: '미배정 계정',
      field: 'unassignedCnt',
      sorter: 'number',
      width: 100,
      hozAlign: 'right',
      headerFilter: false,
      // 숫자를 누르면 미배정 탭을 그 그룹웨어 부서로 엽니다 (GWD-06)
      formatter: (c) => (c.getValue() ? linkTag(`${num(c.getValue())} →`, '이 부서의 미배정 계정 보기', () => handlers.current.openUsersOf(c.getRow().getData().gwDeptNm)) : '<span class="muted">0</span>'),
    },
    {
      title: 'AX 부서',
      field: 'deptNm',
      minWidth: 120,
      formatter: (c) => {
        const r = c.getRow().getData();
        if (r.state === 'EXCLUDED') return '<span class="muted">가입 안 함</span>';
        return r.deptNm ? `<span class="strong">${esc(r.deptNm)}</span>` : `<span class="muted">${esc(summary?.unassignedDept?.deptNm || '미배정')}</span>`;
      },
    },
    {
      title: '상태',
      field: 'state',
      width: 96,
      headerFilter: false,
      formatter: (c) => `<span class="tag ${STATE_TAG[c.getValue()] ?? ''}">${esc(gwStateLabel(c.getValue()))}</span>`,
    },
    { title: '메모', field: 'remark', minWidth: 180, widthGrow: 2, formatter: (c) => esc(c.getValue() || '—') },
    {
      title: '수정',
      field: 'updDate',
      minWidth: 190,
      headerFilter: false,
      formatter: (c) => {
        const r = c.getRow().getData();
        return r.updDate ? `${esc(r.updDate)} <small class="muted">${esc(r.updUserNm || r.updUser || '')}</small>` : '<span class="muted">—</span>';
      },
    },
    {
      title: '관리',
      field: 'hasRow',
      width: 200,
      headerSort: false,
      headerFilter: false,
      // 선택 칸이 있는 표라 행을 누르면 선택이 뒤집힙니다 — 버튼은 클릭을 행까지 올려 보내지 않습니다
      // 「그룹웨어에 없음」 행은 [이어받기] — 그룹웨어 부서명이 바뀐 경우 새 이름으로 설정을 옮깁니다(GWD-11)
      formatter: (c) => actionButtons(
        [
          { act: 'edit', label: '지정', cls: 'tbtn-primary' },
          ...(c.getValue() && c.getRow().getData().inSource === false ? [{ act: 'inherit', label: '이어받기' }] : []),
          ...(c.getValue() ? [{ act: 'del', label: '삭제', cls: 'tbtn-ghost' }] : []),
        ],
        (act) => {
          const row = c.getRow().getData();
          if (act === 'edit') handlers.current.openMapForm(row);
          else if (act === 'inherit') handlers.current.openInheritForm(row);
          else handlers.current.confirmRemoveMap(row);
        },
        deny,
      ),
    },
  ], [summary?.unassignedDept?.deptNm, deny]);

  const userColumns = useMemo(() => [
    { title: '사번', field: 'empNo', width: 104, formatter: (c) => `<span class="mono">${esc(c.getValue())}</span>` },
    { title: '이름', field: 'name', minWidth: 90, formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
    { title: '그룹웨어 부서', field: 'gwDeptNm', minWidth: 150 },
    { title: '직위', field: 'posNm', minWidth: 80, formatter: (c) => esc(c.getValue() || c.getRow().getData().pos || '—') },
    {
      // 상태 배지 (GWD-12) — 사용 green · 잠김 amber · 정지 red · 퇴사 회색
      title: '상태',
      field: 'stateNm',
      width: 90,
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
      width: 110,
      headerFilter: false,
      formatter: (c) => (c.getValue() ? '<span class="tag tag-amber">변경 전</span>' : '<span class="muted">—</span>'),
    },
    { title: '가입 일시', field: 'joinedAt', minWidth: 140, headerFilter: false },
    { title: '최근 로그인', field: 'lastLoginAt', minWidth: 140, headerFilter: false, formatter: (c) => esc(c.getValue() || '—') },
    {
      title: '매핑대로 옮길 부서',
      field: 'suggestDeptNm',
      minWidth: 150,
      // 「매핑 없음」 을 누르면 그 그룹웨어 부서의 지정 모달을 엽니다 (GWD-12)
      formatter: (c) => (c.getValue()
        ? `<span class="tag tag-blue">${esc(c.getValue())}</span>`
        : deny ? '<span class="muted">매핑 없음</span>'
          : linkTag('매핑 없음 →', '이 그룹웨어 부서의 AX 부서 지정', () => handlers.current.openMapForm(handlers.current.mapOf(c.getRow().getData().gwDeptNm)), 'tag tag-amber')),
    },
    {
      title: '관리',
      field: 'empNo',
      width: 110,
      headerSort: false,
      headerFilter: false,
      formatter: (c) => actionButtons([{ act: 'move', label: '부서 지정' }], () => handlers.current.openMoveForm(c.getRow().getData()), deny),
    },
  ], [deny]);

  /* ───────── 부서 매핑 ───────── */
  // 통합관리자·미배정 부서는 선택지에 없습니다(GWD-02 — systemRepository.loadGwDeptMap 이 거릅니다)
  const deptOptions = [{ value: NO_DEPT, label: `— ${summary?.unassignedDept?.deptNm || '미배정'} (매핑 없음) —` }, ...depts.map((d) => ({ value: d.id, label: d.name }))];
  const joinOptions = [{ value: 'Y', label: '자동 가입' }, { value: 'N', label: '가입 제외' }];

  const openMapForm = (row) => {
    const { cnt, pwdInitCnt } = unassignedOf(row.gwDeptNm);
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
            ? <SelectField label="AX 부서" value="" options={[{ value: '', label: '가입 제외 — 저장하지 않음' }]} onChange={() => {}} nativeSelect full />
            : <SelectField label="AX 부서" value={value} options={deptOptions} onChange={onChange} nativeSelect full />),
        },
        { key: 'remark', label: '메모', type: 'textarea', rows: 2, full: true, placeholder: '예) IPQC 는 품질보증팀 소속 (발주자 확인 2026-09-30)' },
        {
          // 그 부서의 최근 이력 3건 (GWD-10)
          key: 'recentLogs', label: '최근 이력', type: 'static', full: true,
          value: logsOf(row.gwDeptNm).map((l) => `${l.ts} · ${l.detail} · ${l.by}`).join('\n') || '(없음)',
        },
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
                {usable ? (
                  <CheckRow label={`저장 후 이 부서 미배정 계정 ${cnt}명도 ${deptName(values.deptId)}(으)로 옮기기`} checked={on} onToggle={() => onChange(on ? [] : ['Y'])} />
                ) : (
                  <Text style={s.textSm}>{`이 부서 미배정 계정 ${cnt}명은 AX 부서를 고르면 함께 옮길 수 있습니다.`}</Text>
                )}
                {usable && on && pwdInitCnt ? (
                  <FormAlert tone="info">{`${pwdInitCnt}명은 아직 초기 비밀번호입니다. 첫 로그인 때 바꾸기 전에는 ${deptName(values.deptId)} 화면을 쓸 수 없습니다(이동은 그대로 진행합니다).`}</FormAlert>
                ) : null}
              </View>
            );
          },
        }] : []),
      ],
      note: '다음 동기화부터 새로 가입하는 사람에게 적용됩니다. 이미 가입된 계정은 [미배정 계정] 에서 옮기십시오. 가입 제외를 고르면 AX 부서는 저장하지 않습니다.',
      submitLabel: '저장',
      onSubmit: async (v) => (await saveMap(row.gwDeptNm, v)).ok,
    });
  };

  /** 이어받기 (GWD-11) — 「그룹웨어에 없음」 행의 설정을 새 그룹웨어 부서명으로 옮깁니다 */
  const openInheritForm = (row) => {
    const candidates = inheritCandidates(row.gwDeptNm);
    if (!candidates.length) {
      useUiStore.getState().toast('이어받을 수 있는 그룹웨어 부서가 없습니다 — 매핑 행이 없는 그룹웨어 부서만 고를 수 있습니다.');
      return;
    }
    openFormModal({
      title: '그룹웨어 부서명 변경 이어받기',
      sub: row.gwDeptNm,
      initial: { to: candidates[0].gwDeptNm },
      fields: [
        { key: 'to', label: '새 그룹웨어 부서명', type: 'select', full: true, required: true, options: candidates.map((m) => ({ value: m.gwDeptNm, label: `${m.gwDeptNm} (재직 ${num(m.activeCnt)})` })) },
      ],
      note: `'${row.gwDeptNm}' 의 AX 부서(${row.state === 'EXCLUDED' ? '가입 제외' : row.deptNm || '미배정'})·메모를 새 이름으로 옮기고 옛 행은 지웁니다. 이름이 비슷한 부서가 먼저 보입니다.`,
      submitLabel: '이어받기',
      onSubmit: async (v) => (await inheritMap(row, v.to)).ok,
    });
  };

  const openBulkForm = () =>
    openFormModal({
      title: '선택 부서 일괄 지정',
      sub: `그룹웨어 부서 ${selectedMaps.length}개`,
      initial: { joinYn: 'Y', deptId: NO_DEPT },
      fields: [
        { key: 'joinYn', label: '자동 가입', type: 'select', options: joinOptions, required: true },
        { key: 'deptId', label: 'AX 부서', type: 'select', options: deptOptions, required: true },
      ],
      note: `${selectedMaps.slice(0, 6).join(', ')}${selectedMaps.length > 6 ? ` 외 ${selectedMaps.length - 6}개` : ''} — 한 번에 저장하며 하나라도 오류면 아무것도 저장하지 않습니다. 행마다 적어 둔 메모는 그대로 둡니다.`,
      submitLabel: '일괄 저장',
      onSubmit: async (v) => (await saveMapsBulk(selectedMaps, v)).ok,
    });

  const confirmRemoveMap = (row) =>
    openConfirmModal({
      title: '부서 매핑 삭제',
      message: `'${row.gwDeptNm}' 매핑을 지웁니다. 다음 동기화부터 이 부서 사람은 ${summary?.unassignedDept?.deptNm || '미배정'} 부서로 가입됩니다. 이미 가입된 계정은 그대로입니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeMap(row.gwDeptNm),
    });

  /* ───────── 미배정 계정 ───────── */
  const openMoveForm = (user) =>
    openFormModal({
      title: '부서 지정',
      sub: `${user.name} (${user.empNo}) · 그룹웨어 ${user.gwDeptNm}`,
      initial: { deptId: user.suggestDeptId ?? depts[0]?.id },
      fields: [{ key: 'deptId', label: 'AX 부서', type: 'select', options: depts.map((d) => ({ value: d.id, label: d.name })), required: true, full: true }],
      note: '옮기는 즉시 새 부서의 메뉴·데이터 권한이 적용됩니다. 이 사람의 그룹웨어 부서 매핑은 바뀌지 않습니다.',
      submitLabel: '옮기기',
      onSubmit: async (v) => (await moveUser(user.empNo, v.deptId)).ok,
    });

  /** 재배정 확인 — 옮길 사람 목록(최대 20명)과 부서별 인원 (GWD-01) */
  const confirmReassign = () => {
    const { movable, poolCnt, byDept, mode } = reassignTarget;
    if (!movable.length) return;
    const names = movable.slice(0, LIST_MAX).map((u) => `${u.name}(${u.empNo})`).join(', ');
    const rest = movable.length > LIST_MAX ? ` 외 ${movable.length - LIST_MAX}명` : '';
    useUiStore.getState().openModal({
      title: '매핑대로 재배정',
      sub: `${mode === 'selected' ? '선택' : '보이는'} ${poolCnt}명 중 ${movable.length}명`,
      render: () => (
        <ReassignBody
          lines={[
            `매핑이 정해진 ${movable.length}명을 매핑된 부서로 옮깁니다. 옮기는 즉시 새 부서 권한이 적용됩니다.${poolCnt > movable.length ? ` 매핑이 없는 ${poolCnt - movable.length}명은 그대로 둡니다.` : ''}`,
            `부서별 — ${byDept.map((d) => `${d.deptNm} ${d.cnt}`).join(' · ')}`,
            `옮길 사람 — ${names}${rest}`,
          ]}
        />
      ),
      footer: (close) => (
        <>
          <Button label="취소" onPress={close} />
          <Button
            label="재배정"
            variant="primary"
            onPress={async () => {
              close();
              const res = await reassign();
              if (res?.ok && res.data) openReassignResult(res.data);
            }}
          />
        </>
      ),
    });
  };

  /** 재배정 결과 — 옮김·건너뜀 (GWD-07 일부) */
  const openReassignResult = (d) => {
    const moved = d.movedCnt ?? (d.items || []).length;
    const byDept = d.byDept?.length ? d.byDept : countBy(d.items || [], 'deptNm');
    const skipped = d.skipped?.length ? countBy(d.skipped.map((x) => ({ ...x, reason: SKIP_REASON_LABEL[x.reason] || x.reasonNm || x.reason })), 'reason') : [];
    useUiStore.getState().openModal({
      title: '재배정 결과',
      render: () => (
        <ReassignBody
          lines={[
            `옮김 ${moved}명${byDept.length ? ` — ${byDept.map((x) => `${x.deptNm} ${x.cnt}`).join(' · ')}` : ''}`,
            `건너뜀 ${d.skippedCnt ?? 0}명${skipped.length ? ` — ${skipped.map((x) => `${x.deptNm} ${x.cnt}`).join(' · ')}` : ''}`,
          ]}
        />
      ),
      footer: (close) => (
        <>
          {(d.items || []).length ? <Button label="옮긴 목록 엑셀" icon="download" onPress={() => exportReassignResult(d)} /> : null}
          <Button label="닫기" variant="primary" onPress={close} />
        </>
      ),
    });
  };

  if (loading && !summary && !maps.length) return <Loading />;

  handlers.current = { openMapForm, confirmRemoveMap, openMoveForm, openUsersOf, openInheritForm, mapOf };
  const unassignedNm = summary?.unassignedDept?.deptNm || '미배정';
  const { movable, poolCnt, mode } = reassignTarget;
  const reassignLabel = `매핑대로 재배정 — ${mode === 'selected' ? '선택' : '보이는'} ${poolCnt}명 중 ${movable.length}명`;
  return (
    <View>
      <PageHead
        title="그룹웨어 부서 매핑"
        desc={`그룹웨어 인사정보를 받아 올 때 AX 에 없는 사번은 자동으로 가입됩니다. 이때 들어갈 AX 부서를 그룹웨어 부서명별로 정합니다. 매핑이 없는 사람은 ${UNASSIGNED_SCOPE} '${unassignedNm}' 부서로 가입되므로, 여기서 실제 부서로 옮깁니다.`}
        actions={
          <>
            {/* 엑셀은 조회 권한이면 받을 수 있습니다(R-10) — 쓰기 권한과 무관. 대상은 현재 탭 */}
            <ExportMenuButton label={`엑셀 다운로드 · ${exportTabName}`} viewCount={exportViewCount} totalCount={exportTotalCount} onExportView={exportView} onExportAll={exportAll} />
            <Button label="새로고침" size="sm" icon="refresh" onPress={reload} />
          </>
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

      <Grid cols={4}>
        <StatCard label="그룹웨어 부서" value={summary?.gwDeptCnt ?? 0} unit="개" sub={`매핑 ${summary?.mappedCnt ?? 0} · 가입 제외 ${summary?.excludedCnt ?? 0}`} />
        <StatCard
          label="매핑 없는 부서"
          value={summary?.unmappedCnt ?? 0}
          unit="개"
          sub={`재직 ${num(summary?.unmappedUserCnt)}명 — 가입하면 ${unassignedNm}`}
          tone={summary?.unmappedCnt ? 'down' : ''}
        />
        <StatCard
          label={`${unassignedNm} 계정`}
          value={summary?.unassignedUserCnt ?? 0}
          unit="명"
          sub={`고정 5개 화면 · 데이터 비공개 · 옮길 수 있음 ${num(reassignableCnt)}명${unassignedPwdInitCnt ? ` · 초기 비밀번호 ${num(unassignedPwdInitCnt)}` : ''}`}
          tone={summary?.unassignedUserCnt ? 'down' : ''}
        />
        <SyncCard sync={sync} canGoSync={canGoSync} onGoSync={() => goToScreen('sys-sync')} />
      </Grid>
      <Gap />

      <Hint>
        매핑은 가입하는 순간에만 쓰입니다. 매핑을 고쳐도 이미 가입된 계정의 부서는 바뀌지 않으니, {unassignedNm} 계정은 [미배정 계정] 탭에서 [매핑대로 재배정] 하거나 한 명씩 부서를 지정하십시오. 그룹웨어 부서명은 글자 그대로(사업장 표시 (A)·(M) 포함) 비교합니다. {unassignedNm} 계정은 대시보드·덕반장 AI·자연어 질의 이력만 쓸 수 있고 데이터 값은 모두 비공개입니다. 권한은 바꿀 수 없으며, 실제 부서로 옮겨야 그 부서 권한이 적용됩니다.
      </Hint>

      <Tabs
        items={[
          { value: 'map', label: `부서 매핑 ${mapTotal}` },
          { value: 'users', label: `${unassignedNm} 계정 ${userTotal}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Gap />

      {tab === 'map' ? (
        <>
          <Filters>
            <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} placeholder="그룹웨어 부서 · AX 부서 · 메모" style={{ minWidth: 240 }} />
            <SelectField label="상태" value={filters.state} options={[{ value: '전체', label: '전체' }, ...GW_MAP_STATES]} onChange={setState} />
            <GuardedButton allowed={canWrite} reason={canWrite && !selectedMaps.length ? '일괄 지정할 그룹웨어 부서를 표에서 고르십시오.' : undefined} label={`선택 ${selectedMaps.length}개 일괄 지정`} onPress={openBulkForm} />
          </Filters>
          <Card title="그룹웨어 부서 → AX 부서" sub={`${refreshing ? '갱신 중… · ' : ''}검색 결과 ${maps.length}건 · 재직 인원은 퇴사자를 뺀 수`} tight>
            <TabulatorGrid
              inset
              columns={mapColumns}
              rows={maps}
              rowKey="gwDeptNm"
              selectable={canWrite}
              selected={selectedMaps}
              onSelectedChange={setSelectedMaps}
              initialSort={MAP_SORT}
              // 상단 검색과 겹치므로 열 검색은 끕니다 (GWD-06)
              headerFilter={false}
              instanceRef={mapTableRef}
              height={maps.length > 14 ? 620 : undefined}
              emptyText="조건에 맞는 그룹웨어 부서가 없습니다."
            />
          </Card>
          <Gap />
          {/* 최근 매핑 변경 (GWD-10) — 접힌 상태로 둡니다 */}
          <Button label={`${logsOpen ? '▾' : '▸'} 최근 매핑 변경 (최근 90일 ${mapLogs.length}건)`} variant="ghost" onPress={() => setLogsOpen((v) => !v)} />
          {logsOpen ? (
            <Card title="최근 매핑 변경" sub="계정·권한 변경 이력 중 그룹웨어 부서 매핑" tight>
              <View nativeID="gw-map-logs">
                <Table
                  inset
                  minWidth={900}
                  keyExtractor={(r, i) => `${r.ts}-${i}`}
                  columns={[
                    { key: 'ts', title: '시각', width: 170, mono: true },
                    { key: 'target', title: '그룹웨어 부서', width: 180 },
                    { key: 'detail', title: '변경 내용', flex: 1, minWidth: 260, wrap: true },
                    { key: 'by', title: '수행자', width: 150 },
                    { key: 'actNm', title: '구분', width: 150 },
                  ]}
                  rows={mapLogs}
                  emptyText="최근 90일 동안 매핑 변경이 없습니다."
                />
              </View>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Filters>
            <TextField label="검색" value={filters.userKeyword} onChangeText={setUserKeyword} placeholder="사번 · 이름 · 그룹웨어 부서" style={{ minWidth: 240 }} />
            <SelectField label="상태" value={filters.userState} options={USER_STATE_FILTER} onChange={setUserState} />
            <GuardedButton
              allowed={canWrite}
              reason={canWrite && !movable.length ? '옮길 계정이 없습니다. 먼저 [부서 매핑] 에서 그룹웨어 부서의 AX 부서를 정하십시오.' : undefined}
              label={reassignLabel}
              icon="refresh"
              onPress={confirmReassign}
            />
          </Filters>
          <Card title={`${unassignedNm} 계정`} sub={`${refreshing ? '갱신 중… · ' : ''}검색 결과 ${users.length}명 · 그룹웨어 자동 가입 중 부서 매핑이 없던 사람`} tight>
            <TabulatorGrid
              inset
              columns={userColumns}
              rows={users}
              rowKey="empNo"
              selectable={canWrite}
              selected={selectedUsers}
              onSelectedChange={setSelectedUsers}
              instanceRef={userTableRef}
              height={users.length > 14 ? 620 : undefined}
              emptyText={`${unassignedNm} 계정이 없습니다. 자동 가입 계정이 모두 부서에 배정됐습니다.`}
            />
          </Card>
        </>
      )}
    </View>
  );
}

/** 최근 인사정보 동기화 카드 (GWD-09) — 상태 배지, 실패면 직전 성공 요약, 26시간 넘으면 경고, 연동 이력 링크 */
function SyncCard({ sync, canGoSync, onGoSync }) {
  const s = useCommonStyles();
  const last = sync?.last;
  const state = last?.stateCd;
  // tb_sync_run.state_cd — SUCCESS(완료) · FAIL(실패) · ABORTED(중단) · RUNNING(진행 중) · SKIPPED(건너뜀)
  const failed = ['FAIL', 'FAILED', 'ERROR', 'ABORTED'].includes(state);
  const STATE_BADGE = { SUCCESS: ['green', '완료'], DONE: ['green', '완료'], FAIL: ['red', '실패'], FAILED: ['red', '실패'], ERROR: ['red', '실패'], ABORTED: ['red', '중단'], RUNNING: ['blue', '진행 중'], SKIP: ['', '건너뜀'], SKIPPED: ['', '건너뜀'] };
  const [tone, label] = STATE_BADGE[state] || ['', state || ''];
  const badge = state ? <Badge tone={tone}>{label}</Badge> : null;
  return (
    <View nativeID="gw-sync-card" style={{ flex: 1 }}>
      <StatCard
        label="최근 인사정보 동기화"
        value={last?.startedAt || '—'}
        tone={failed || sync?.stale ? 'down' : ''}
        right={badge}
        sub={[
          last?.joinSummary || '자동 가입 기록 없음',
          failed && sync?.lastJoin ? `직전 성공 ${sync.lastJoin.startedAt} — ${sync.lastJoin.summary || ''}` : '',
        ].filter(Boolean).join(' · ')}
      />
      {sync?.stale ? <Text style={[s.textSm, { marginTop: 6 }]}>하루 1회 동기화가 멈췄을 수 있습니다(마지막 실행이 26시간보다 오래됨).</Text> : null}
      {canGoSync ? <Button label="연동 이력 보기" size="sm" variant="ghost" onPress={onGoSync} /> : null}
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

/** [{ key 값, 건수 }] — 결과 요약용 (서버 byDept 가 없을 때) */
function countBy(items, key) {
  const m = {};
  items.forEach((it) => { const k = it[key] || '—'; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([deptNm, cnt]) => ({ deptNm, cnt }));
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

const num = (v) => Number(v ?? 0).toLocaleString('ko-KR');

/** 칸 안의 링크 모양 태그 (DOM) — 누르면 행 선택이 뒤집히지 않게 클릭을 멈춥니다 */
function linkTag(text, title, onClick, cls = 'tag tag-red') {
  const el = document.createElement('button');
  el.className = cls;
  el.style.cursor = 'pointer';
  el.style.border = '0';
  el.title = title;
  el.textContent = text;
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return el;
}

/** formatter 가 HTML 문자열을 그리므로 값은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
