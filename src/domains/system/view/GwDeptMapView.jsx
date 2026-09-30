/**
 * [View] SY-17 그룹웨어 부서 매핑 (경로: /system/gw-dept-map)
 *
 * 그룹웨어 인사정보 자동 가입 때 들어갈 AX 부서를 정하고, 매핑이 없어 '미배정' 으로 들어간
 * 계정을 실제 부서로 옮깁니다.
 * 사용 API 6건 — /api/v1/system/gw-dept-maps/* + 계정 부서 이동(PUT /system/users/{empNo}/dept)
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Button, Card, Filters, FormAlert, Hint, Loading, SelectField, StatCard, TabulatorGrid, Tabs, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { GW_MAP_STATES, NO_DEPT, gwStateLabel } from '../controller/useGwDeptMapController';

const STATE_TAG = { MAPPED: 'tag-green', UNMAPPED: 'tag-amber', EXCLUDED: '' };

export default function GwDeptMapView({
  loading, loadError, summary, maps, users, depts,
  tab, setTab, filters, setKeyword, setState, setUserKeyword,
  selectedMaps, setSelectedMaps, selectedUsers, setSelectedUsers, reassignableCnt,
  reload, exportExcel, saveMap, saveMapsBulk, removeMap, reassign, moveUser,
}) {
  // 표 안의 버튼은 HTML 로 그리고 클릭은 cellClick 에서 받습니다. 열 정의는 한 번만 만들고
  // 최신 핸들러는 ref 로 읽습니다(return 직전에 채움) — 훅이라 조기 return 보다 위에 둡니다.
  const handlers = useRef({});

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
      formatter: (c) => (c.getValue() ? `<span class="tag tag-red">${num(c.getValue())}</span>` : '<span class="muted">0</span>'),
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
        return r.updDate ? `${esc(r.updDate)} <small class="muted">${esc(r.updUser || '')}</small>` : '<span class="muted">—</span>';
      },
    },
    {
      title: '관리',
      field: 'hasRow',
      width: 140,
      headerSort: false,
      headerFilter: false,
      // 선택 칸이 있는 표라 행을 누르면 선택이 뒤집힙니다 — 버튼은 클릭을 행까지 올려 보내지 않습니다
      formatter: (c) => actionButtons(
        [{ act: 'edit', label: '지정', cls: 'tbtn-primary' }, ...(c.getValue() ? [{ act: 'del', label: '삭제', cls: 'tbtn-ghost' }] : [])],
        (act) => {
          const row = c.getRow().getData();
          if (act === 'edit') handlers.current.openMapForm(row);
          else handlers.current.confirmRemoveMap(row);
        },
      ),
    },
  ], [summary?.unassignedDept?.deptNm]);

  const userColumns = useMemo(() => [
    { title: '사번', field: 'empNo', width: 104, formatter: (c) => `<span class="mono">${esc(c.getValue())}</span>` },
    { title: '이름', field: 'name', minWidth: 90, formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
    { title: '그룹웨어 부서', field: 'gwDeptNm', minWidth: 150 },
    { title: '직위', field: 'posNm', minWidth: 80, formatter: (c) => esc(c.getValue() || c.getRow().getData().pos || '—') },
    { title: '상태', field: 'stateNm', width: 80, formatter: (c) => esc(c.getValue() || c.getRow().getData().state || '—') },
    { title: '가입 일시', field: 'joinedAt', minWidth: 140, headerFilter: false },
    { title: '최근 로그인', field: 'lastLoginAt', minWidth: 140, headerFilter: false, formatter: (c) => esc(c.getValue() || '—') },
    {
      title: '매핑대로 옮길 부서',
      field: 'suggestDeptNm',
      minWidth: 150,
      formatter: (c) => (c.getValue() ? `<span class="tag tag-blue">${esc(c.getValue())}</span>` : '<span class="muted">매핑 없음</span>'),
    },
    {
      title: '관리',
      field: 'empNo',
      width: 110,
      headerSort: false,
      headerFilter: false,
      formatter: (c) => actionButtons([{ act: 'move', label: '부서 지정' }], () => handlers.current.openMoveForm(c.getRow().getData())),
    },
  ], []);

  /* ───────── 부서 매핑 ───────── */
  const deptOptions = [{ value: NO_DEPT, label: `— ${summary?.unassignedDept?.deptNm || '미배정'} (매핑 없음) —` }, ...depts.map((d) => ({ value: d.id, label: d.name }))];
  const joinOptions = [{ value: 'Y', label: '자동 가입' }, { value: 'N', label: '가입 제외' }];

  const openMapForm = (row) =>
    openFormModal({
      title: '부서 매핑 지정',
      sub: row.gwDeptNm,
      initial: { joinYn: row.joinYn === 'N' ? 'N' : 'Y', deptId: row.deptId ?? NO_DEPT, remark: row.remark || '' },
      fields: [
        { key: 'joinYn', label: '자동 가입', type: 'select', options: joinOptions, required: true },
        { key: 'deptId', label: 'AX 부서', type: 'select', options: deptOptions, required: true },
        { key: 'remark', label: '메모', type: 'textarea', rows: 2, full: true, placeholder: '예) IPQC 는 품질보증팀 소속 (발주자 확인 2026-09-30)' },
      ],
      note: '다음 동기화부터 새로 가입하는 사람에게 적용됩니다. 이미 가입된 계정은 [미배정 계정] 에서 옮기십시오. 가입 제외를 고르면 AX 부서는 저장하지 않습니다.',
      submitLabel: '저장',
      onSubmit: async (v) => (await saveMap(row.gwDeptNm, v)).ok,
    });

  const openBulkForm = () =>
    openFormModal({
      title: '선택 부서 일괄 지정',
      sub: `그룹웨어 부서 ${selectedMaps.length}개`,
      initial: { joinYn: 'Y', deptId: NO_DEPT },
      fields: [
        { key: 'joinYn', label: '자동 가입', type: 'select', options: joinOptions, required: true },
        { key: 'deptId', label: 'AX 부서', type: 'select', options: deptOptions, required: true },
      ],
      note: `${selectedMaps.slice(0, 6).join(', ')}${selectedMaps.length > 6 ? ` 외 ${selectedMaps.length - 6}개` : ''} — 행마다 적어 둔 메모는 그대로 둡니다.`,
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

  const confirmReassign = (empNos) => {
    const pool = empNos.length ? users.filter((u) => empNos.includes(u.empNo)) : users;
    const movable = pool.filter((u) => u.suggestDeptId != null).length;
    return openConfirmModal({
      title: '매핑대로 재배정',
      message: movable
        ? `${empNos.length ? '고른' : '미배정'} 계정 ${pool.length}명 중 매핑이 정해진 ${movable}명을 매핑된 부서로 옮깁니다. 옮기는 즉시 새 부서 권한이 적용됩니다.${pool.length > movable ? ` 매핑이 없는 ${pool.length - movable}명은 그대로 둡니다.` : ''}`
        : '옮길 계정이 없습니다. 먼저 [부서 매핑] 에서 그룹웨어 부서의 AX 부서를 정하십시오.',
      confirmLabel: '재배정',
      onConfirm: () => (movable ? reassign(empNos) : undefined),
    });
  };

  if (loading && !summary && !maps.length) return <Loading />;

  handlers.current = { openMapForm, confirmRemoveMap, openMoveForm };
  const unassignedNm = summary?.unassignedDept?.deptNm || '미배정';
  return (
    <View>
      <PageHead
        title="그룹웨어 부서 매핑"
        desc={`그룹웨어 인사정보를 받아 올 때 AX 에 없는 사번은 자동으로 가입됩니다. 이때 들어갈 AX 부서를 그룹웨어 부서명별로 정합니다. 매핑이 없는 사람은 화면 권한이 없는 '${unassignedNm}' 부서로 가입되므로, 여기서 실제 부서로 옮깁니다.`}
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="새로고침" size="sm" icon="refresh" onPress={reload} />
          </>
        }
      />

      {loadError ? (
        <FormAlert>{`일부 목록을 받지 못했습니다 — ${loadError.message} (API 서버에 그룹웨어 부서 매핑 API 가 적용되기 전이면 이 화면은 비어 보입니다)`}</FormAlert>
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
          sub={reassignableCnt ? `매핑대로 옮길 수 있음 ${reassignableCnt}명` : '볼 수 있는 화면 없음'}
          tone={summary?.unassignedUserCnt ? 'down' : ''}
        />
        <StatCard label="최근 인사정보 동기화" value={summary?.lastSyncAt || '—'} sub={summary?.lastJoinMessage || '자동 가입 기록 없음'} />
      </Grid>
      <Gap />

      <Hint>
        매핑은 가입하는 순간에만 쓰입니다. 매핑을 고쳐도 이미 가입된 계정의 부서는 바뀌지 않으니, {unassignedNm} 계정은 [미배정 계정] 탭에서 [매핑대로 재배정] 하거나 한 명씩 부서를 지정하십시오. 그룹웨어 부서명은 글자 그대로(사업장 표시 (A)·(M) 포함) 비교합니다.
      </Hint>

      <Tabs
        items={[
          { value: 'map', label: `부서 매핑 ${maps.length}` },
          { value: 'users', label: `${unassignedNm} 계정 ${users.length}` },
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
            <Button label="조회" variant="primary" onPress={reload} />
            <Button label={`선택 ${selectedMaps.length}개 일괄 지정`} disabled={!selectedMaps.length} onPress={openBulkForm} />
          </Filters>
          <Card title="그룹웨어 부서 → AX 부서" sub={`${maps.length}건 · 재직 인원은 퇴사자를 뺀 수`} tight>
            <TabulatorGrid
              inset
              columns={mapColumns}
              rows={maps}
              rowKey="gwDeptNm"
              selectable
              selected={selectedMaps}
              onSelectedChange={setSelectedMaps}
              initialSort={MAP_SORT}
              height={maps.length > 14 ? 620 : undefined}
              emptyText="조건에 맞는 그룹웨어 부서가 없습니다."
            />
          </Card>
        </>
      ) : (
        <>
          <Filters>
            <TextField label="검색" value={filters.userKeyword} onChangeText={setUserKeyword} placeholder="사번 · 이름 · 그룹웨어 부서" style={{ minWidth: 240 }} />
            <Button label="조회" variant="primary" onPress={reload} />
            <Button
              label={selectedUsers.length ? `선택 ${selectedUsers.length}명 매핑대로 재배정` : `매핑대로 재배정 (${reassignableCnt}명)`}
              icon="refresh"
              disabled={!users.length}
              onPress={() => confirmReassign(selectedUsers)}
            />
          </Filters>
          <Card title={`${unassignedNm} 계정`} sub={`${users.length}명 · 그룹웨어 자동 가입 중 부서 매핑이 없던 사람`} tight>
            <TabulatorGrid
              inset
              columns={userColumns}
              rows={users}
              rowKey="empNo"
              selectable
              selected={selectedUsers}
              onSelectedChange={setSelectedUsers}
              height={users.length > 14 ? 620 : undefined}
              emptyText={`${unassignedNm} 계정이 없습니다.`}
            />
          </Card>
        </>
      )}
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
 */
function actionButtons(buttons, onAct) {
  const wrap = document.createElement('span');
  wrap.style.whiteSpace = 'nowrap';
  buttons.forEach((b) => {
    const el = document.createElement('button');
    el.className = `tbtn ${b.cls || ''}`.trim();
    el.textContent = b.label;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onAct(b.act);
    });
    wrap.appendChild(el);
  });
  return wrap;
}

const num = (v) => Number(v ?? 0).toLocaleString('ko-KR');

/** formatter 가 HTML 문자열을 그리므로 값은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
