/**
 * [View] SY-05 알림 수신자 관리 (경로: /system/recipient · 화면 ID sys-recip)
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 사용 API 13건 — /api/v1/alert-recipient-groups(목록·상세·등록·수정·사용 중지·테스트), /alert-recipients(요약·목록·후보·영향·등록·수정·삭제)
 *
 * 표는 Tabulator(`TabulatorGrid`)로 그립니다 — 열 너비를 내용에 맞춰 잡고(autoWidth),
 * 머리글 경계를 끌어 사람이 직접 조절할 수 있으며, 칸 경계를 그어(bordered) 어느 값이
 * 어느 열인지 눈으로 갈립니다. 합이 카드보다 넓으면 표 안에서 가로로 스크롤합니다.
 *
 * 쓰기 권한이 없으면 쓰기 버튼을 숨기지 않고 비활성으로 두고 이유를 툴팁으로 보입니다(R-06).
 * 당번·대리 수신은 2026-09-16 에 걷어냈습니다(되살리지 않습니다).
 * 2026-10-03 — 부재(수신/부재 전환)·야간 수신을 엔진 · API · DB 와 함께 없앴고, 수신 그룹 · 수신자를 카드 탭(CardTabs)으로 나눴습니다.
 * 머리말 설명 · [발송 조건 관리] 단추 · 안내 문구 · 카드 부제 · 야간 열 · 부재/야간 요약 카드를 뺐습니다.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  BlindNote, Button, CardTabs, ExportMenuButton, FormAlert, Hint, Loading, StatCard, TabulatorGrid,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf } from '@domains/common/model/codeRepository';
import { memberNameOf, personLabel, receivableLabel } from '../controller/useRecipientController';
import AlertGuardButton, { WORKER_DENIED_TIP, WRITE_DENIED_TIP, htmlGuardButton } from './AlertGuardButton';
import { askConfirm } from './AlertAsk';
import AlertTestResult, { normalizeTestResult } from './AlertTestResult';
import { impactText, openGroupForm, openRecipientForm } from './RecipientForms';

// 채널·유효 시간대 선택지와 표기는 서버 공통코드(ALM_CHANNEL · ALM_WINDOW)에서 받습니다

/** formatter 가 HTML 문자열을 그리므로 사용자 입력은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/** 값이 비면 가운뎃줄 */
const dash = (v) => (v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : esc(v));

/** 권한 없는 항목 — 값을 아예 그리지 않습니다 (CM-04 데이터 마스킹) */
const BLIND_HTML = '<span class="tag" title="소속 부서에 이 데이터 항목의 접근 권한이 없습니다">●●●● 비공개</span>';

/** Tabulator 인스턴스 → 지금 보이는 행·열 순서 (「조회 목록」 엑셀) */
function gridStateOf(table, fallback) {
  if (!table) return { rows: fallback };
  try {
    return { rows: table.getData('active'), order: table.getColumns().map((c) => c.getField()).filter(Boolean) };
  } catch (e) {
    return { rows: fallback };
  }
}

/**
 * 선택 목록 머리글 필터 (2026-10-03) — 선택지는 목록을 열 때마다 지금 행에서 뽑습니다.
 * `multi` 면 칸 값이 「A · B」 처럼 여럿이라 하나씩 나눠 선택지로 두고, 고른 값을 포함한 행을 남깁니다.
 */
const EMPTY_OPT = '(값 없음)';
function listHeader(rowsRef, field, { multi = false } = {}) {
  const valuesOf = (row) => {
    const v = String(row?.[field] ?? '').trim();
    if (!v) return [EMPTY_OPT];
    return multi ? v.split(' · ').map((x) => x.trim()).filter(Boolean) : [v];
  };
  return {
    headerFilter: 'list',
    cssClass: 'ax-list-filter',
    headerFilterPlaceholder: '전체',
    headerFilterParams: {
      valuesLookup: () => {
        const set = new Set((rowsRef.current || []).flatMap(valuesOf));
        return [{ label: '전체', value: '' }, ...[...set].sort((a, b) => a.localeCompare(b, 'ko')).map((v) => ({ label: v, value: v }))];
      },
      clearable: true,
      autocomplete: false,
    },
    headerFilterFunc: (query, _value, row) => !query || valuesOf(row).includes(query),
  };
}

/**
 * 「수신자 목록」 모달 표 — 열이 표 폭을 나눠 갖습니다(fitColumns, autoWidth 를 빼 「열 너비는…」 안내도 없음).
 * 모달이 떠오르는 동안 처음 잰 폭에는 세로 스크롤 자리가 빠져 오른쪽이 비므로, 뜬 뒤 한 번 다시 맞춥니다.
 */
function MemberListGrid({ rows, showWorker }) {
  const table = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => { try { table.current?.redraw(true); } catch (e) { /* 표가 이미 닫힘 */ } }, 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <TabulatorGrid
      bordered
      instanceRef={table}
      rows={rows}
      rowKey="_key"
      columns={[
        { title: '이름(사번)', field: 'label', formatter: (c) => (showWorker ? esc(c.getValue()) : BLIND_HTML) },
        { title: '부서', field: 'dept', formatter: (c) => dash(c.getValue()) },
      ]}
      emptyText="수신자가 없습니다."
    />
  );
}

export default function RecipientView({
  firstLoad, listLoading, loadError, listError, codes, summary, recipientTotal, groups, recipients, tab, setTab,
  reload, canWrite, showWorker, exportView, exportAll,
  loadGroupDetail, loadDeptOptions, loadMemberCandidates, loadImpact, removeRecipient, setGroupUse, searchCandidates,
  submitGroup, submitRecipient, testGroup, itemsMeta,
}) {
  const { goToScreen } = useAppNavigation();
  // 좁은 화면(폰)은 탭 본문 여백을 줄여 관리 열(단추 3개)이 표 안에 다 보이게 합니다
  const narrow = useWindowDimensions().width < 600;
  const can = useAuthStore((state) => state.can);
  const canCond = can('alert-cond');
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);
  const chan = codes?.ALM_CHANNEL || [];
  const win = codes?.ALM_WINDOW || [];

  const writeTip = canWrite ? '' : WRITE_DENIED_TIP;
  // 수신자 등록·편집·삭제는 연락처를 다루므로 데이터 권한(worker)도 있어야 합니다 (RCP-01)
  const recipTip = writeTip || (showWorker ? '' : WORKER_DENIED_TIP);

  // 표 안의 버튼 클릭에서 최신 핸들러를 읽는 통로 — 열 정의를 다시 만들지 않으려고 ref 로 둡니다
  const handlers = useRef({});
  const groupTable = useRef(null);
  const recipTable = useRef(null);

  /* ───────── 수신 그룹 ───────── */
  const openGroup = async (row) => {
    let detail = null;
    if (row) {
      const res = await loadGroupDetail(row.groupId);
      if (!res.ok) {
        toast(res.message);
        return;
      }
      detail = res.data;
    }
    const [deptOptions, candidates] = await Promise.all([
      detail?.deptOptions?.length ? detail.deptOptions : loadDeptOptions(),
      loadMemberCandidates(detail),
    ]);
    openGroupForm({
      detail,
      windowOptions: win,
      deptOptions,
      candidates,
      showWorker,
      mailLabel: labelOf(chan, 'MAIL') || '메일',
      channelLabel: (c) => labelOf(chan, c),
      onSubmit: async (body) => {
        const res = await submitGroup(row?.groupId, body);
        return res.ok || res.code === 'E-NOTFOUND';
      },
    });
  };

  /** 그룹 테스트 발송 결과 (RCP-03) */
  const runGroupTest = async (row) => {
    const res = await testGroup(row.groupId);
    if (!res.ok) return;
    const result = normalizeTestResult(res.data || {});
    openModal({
      title: '수신 그룹 테스트 결과',
      sub: row.name,
      render: () => <AlertTestResult result={result} channelLabel={(c) => labelOf(chan, c)} note="테스트 알림은 알림 목록 기본 조회와 통계에 포함되지 않습니다. 발송 결과는 알림 목록의 발송 로그에서 확인합니다." />,
      footer: (close) => <Button label="닫기" variant="primary" onPress={close} />,
    });
  };

  /** 사용 중지/사용 (RCP-08) — 중지는 한 번 묻습니다. 조건이 쓰는 그룹이면 서버가 409 로 막습니다 */
  const toggleGroupUse = async (row) => {
    const on = row.useFlg === 'N';
    if (!on) {
      const yes = await askConfirm({
        title: '수신 그룹 사용 중지',
        message: `'${row.name}' 그룹으로는 알림이 나가지 않습니다. 이 그룹을 쓰는 발송 조건이 있으면 먼저 연결을 바꿔야 합니다.`,
        confirmLabel: '사용 중지',
        danger: true,
      });
      if (!yes) return;
    }
    await setGroupUse(row.groupId, on);
  };

  /* ───────── 수신자 ───────── */
  // 수신자는 등록만 합니다 — 메일은 계정 이메일을 따르고 고칠 항목이 없어 「편집」 을 없앴습니다(2026-10-03)
  const openRecip = () =>
    openRecipientForm({
      searchCandidates,
      onSubmit: async (recipientId, body) => (await submitRecipient(recipientId, body)).ok,
    });

  /** 삭제 (RCP-08) — 영향을 보여 주고 묻습니다. 서버가 영향 때문에 409 를 주면 한 번 더 묻고 force 로 지웁니다 */
  const deleteRecip = async (row) => {
    const impact = await loadImpact(row.recipientId);
    const yes = await askConfirm({
      title: '수신자 삭제',
      message: `${row.name || row.empNo} 을(를) 수신자에서 지웁니다. 그룹 멤버에서도 빠지고 되돌릴 수 없습니다. 발송 기록은 남습니다.\n${impactText(impact)}`,
      confirmLabel: '삭제',
      danger: true,
    });
    if (!yes) return;
    const res = await removeRecipient(row.recipientId);
    if (res.needsForce) {
      const again = await askConfirm({
        title: '받는 사람이 없어지는 그룹',
        message: `${res.message || '이 수신자를 지우면 받는 사람이 없어지는 수신 그룹이 있습니다.'}\n${impactText(res.data)}\n그래도 지울까요?`,
        confirmLabel: '그래도 삭제',
        danger: true,
      });
      if (again) await removeRecipient(row.recipientId, true);
    }
  };

  /** 수신자 목록 전체 보기 — 표에는 앞 2명 + 「외 N명」 만 보이므로 눌러서 모두 봅니다 */
  const openMembers = async (row) => {
    // 부서까지 보이려고 상세를 부릅니다. 실패하면 목록 행의 이름 · 사번만
    const res = await loadGroupDetail(row.groupId);
    const people = ((res.ok && res.data?.members) || row.members || []).map((m) => (typeof m === 'object' ? m : { empNo: String(m), name: null }));
    openModal({
      title: '수신자 목록',
      sub: `${row.name} · ${people.length}명`,
      maxWidth: 520,
      render: () => (
        <MemberListGrid
          rows={people.map((m, i) => ({ _key: `${m.empNo}-${i}`, label: personLabel(m), dept: m.dept || '' }))}
          showWorker={showWorker}
        />
      ),
      footer: (close) => <Button label="닫기" variant="primary" onPress={close} />,
    });
  };

  /* ───────── 표 자료 ─────────
     코드값·배열은 Tabulator 가 정렬·검색할 수 있게 미리 글자로 풀어 둡니다. */
  const groupRows = useMemo(
    () => groups.map((g) => {
      const memberCnt = g.memberCnt ?? (g.memberEmpNos || g.members || []).length;
      const receivable = g.receivableCnt ?? g.receivingCnt;
      return {
        ...g,
        channelNames: (g.channels || []).map((c) => labelOf(chan, c)).join(' · '),
        windowNm: labelOf(win, g.validWindow) || '',
        memberCnt,
        receivableLabel: receivableLabel(g),
        receivableZero: receivable === 0,
        condCnt: g.condCnt ?? (Array.isArray(g.conds) ? g.conds.length : null),
        condNames: (g.conds || []).map((c) => c.name).join(' · '),
        useLabel: g.useFlg === 'N' ? '사용 중지' : '사용',
        // 머리글 검색은 이 전체 문자열로 합니다 — 칸에는 앞 2명 + 「외 N명」 만 그립니다
        memberNames: (g.members || []).map(personLabel).filter(Boolean).join(' · '),
        memberCnt,
      };
    }),
    [groups, chan, win]
  );

  // 머리글 선택 목록이 지금 행에서 선택지를 뽑으려고 씁니다(열 정의를 다시 만들지 않게 ref)
  const recipRowsRef = useRef([]);
  const recipientRows = useMemo(
    () => recipients.map((r) => ({
      ...r,
      posLabel: r.posNm || r.pos || '',
      groupNames: (r.groups || []).map(memberNameOf).join(' · '),
      nameLabel: personLabel(r),
    })),
    [recipients]
  );
  recipRowsRef.current = recipientRows;

  const groupColumns = useMemo(() => [
    { title: '그룹명', field: 'name', formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
    {
      title: '발송 채널', field: 'channelNames', headerSort: false,
      formatter: (c) => {
        const list = String(c.getValue() || '').split(' · ').filter(Boolean);
        return list.length ? `<span class="chips">${list.map((n) => `<span class="tag tag-blue">${esc(n)}</span>`).join('')}</span>` : '<span class="muted">—</span>';
      },
    },
    { title: '유효 시간대', field: 'windowNm', formatter: (c) => dash(c.getValue()) },
    {
      // 수신 가능 = 계정 사용(잠금 포함) · 연락처 있음 (RCP-09)
      title: '수신 가능', field: 'receivableLabel', minWidth: 90, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false,
      formatter: (c) => {
        const row = c.getRow().getData();
        if (!c.getValue()) return '<span class="muted">—</span>';
        return row.receivableZero ? `<span class="tag tag-red">${esc(c.getValue())}</span>` : `<span class="num">${esc(c.getValue())}</span>`;
      },
    },
    {
      title: '사용 조건', field: 'condCnt', minWidth: 90, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false, sorter: 'number',
      formatter: (c) => {
        const row = c.getRow().getData();
        if (c.getValue() === null || c.getValue() === undefined) return '<span class="muted">—</span>';
        const tip = row.condNames ? ` title="${esc(row.condNames)}"` : '';
        return canCond && c.getValue() > 0
          ? `<button class="tbtn" data-act="conds"${tip}>${esc(c.getValue())}건</button>`
          : `<span class="num"${tip}>${esc(c.getValue())}</span>`;
      },
      // 발송 조건 관리 권한자는 눌러 그 화면으로 갑니다
      cellClick: (e) => { if (e.target.closest('[data-act="conds"]')) handlers.current.goConds(); },
    },
    {
      // 「이름(사번)」 앞 2명 + 「외 N명」. 누르면 모달에서 모두 봅니다(2026-10-03, 예전 「구성원」 · 「멤버」 열)
      title: '수신자 목록', field: 'memberNames',
      formatter: (c) => {
        if (!showWorker) return BLIND_HTML;
        const list = String(c.getValue() || '').split(' · ').filter(Boolean);
        if (!list.length) return '<span class="muted">수신자 없음</span>';
        const shown = list.length >= 3 ? `${list.slice(0, 2).join(' · ')} 외 ${list.length - 2}명` : list.join(' · ');
        return `<button class="tbtn tbtn-ghost" data-act="members" title="${esc(list.join(' · '))}">${esc(shown)}</button>`;
      },
      cellClick: (e, c) => { if (e.target.closest('[data-act="members"]')) handlers.current.openMembers(c.getRow().getData()); },
    },
    {
      title: '상태', field: 'useLabel', minWidth: 80, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => (c.getValue() === '사용' ? '<span class="tag tag-green">사용</span>' : '<span class="tag">사용 중지</span>'),
    },
    {
      title: '관리', headerSort: false, headerFilter: false, minWidth: 270,
      formatter: (c) => {
        const row = c.getRow().getData();
        return [
          htmlGuardButton('edit', '편집', writeTip, esc),
          htmlGuardButton('test', '테스트 발송', writeTip || (row.useFlg === 'N' ? '사용 중지된 그룹입니다.' : ''), esc),
          htmlGuardButton('use', row.useFlg === 'N' ? '사용' : '사용 중지', writeTip, esc),
        ].join(' ');
      },
      cellClick: (e, c) => {
        const btn = e.target.closest('[data-act]');
        if (!btn || btn.disabled) return;
        const row = c.getRow().getData();
        if (btn.dataset.act === 'edit') handlers.current.openGroup(row);
        else if (btn.dataset.act === 'test') handlers.current.runGroupTest(row);
        else if (btn.dataset.act === 'use') handlers.current.toggleGroupUse(row);
      },
    },
  ], [showWorker, writeTip, canCond]);

  const recipientColumns = useMemo(() => [
    // 어느 그룹으로 알림을 받는 사람인지가 이 표를 읽는 첫 기준이라 맨 앞에 둡니다
    {
      // 선택 목록 필터(2026-10-03) — 여러 그룹에 속한 사람은 그중 하나만 골라도 남습니다
      title: '수신 그룹', field: 'groupNames', ...listHeader(recipRowsRef, 'groupNames', { multi: true }),
      formatter: (c) => (c.getValue() ? `<span class="nowrap" title="${esc(c.getValue())}">${esc(c.getValue())}</span>` : '<span class="muted">—</span>'),
    },
    { title: '이름(사번)', field: 'nameLabel', formatter: (c) => (showWorker ? `<span class="strong">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '부서', field: 'dept', formatter: (c) => dash(c.getValue()) },
    { title: '직급', field: 'posLabel', ...listHeader(recipRowsRef, 'posLabel'), formatter: (c) => dash(c.getValue()) },
    // 메일 — 서버가 계정 이메일을 줍니다(2026-10-03, 계정 관리에서 바꾸면 여기도 바뀜)
    { title: '메일', field: 'mail', formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    // 「비고」 열은 뺐습니다(2026-10-04) — 부재 사유를 적던 칸이라 부재 기능과 함께 없앱니다
    {
      title: '관리', headerSort: false, headerFilter: false, minWidth: 80,
      formatter: () => htmlGuardButton('delete', '삭제', recipTip, esc),
      cellClick: (e, c) => {
        const btn = e.target.closest('[data-act]');
        if (!btn || btn.disabled) return;
        const row = c.getRow().getData();
        if (btn.dataset.act === 'delete') handlers.current.deleteRecip(row);
      },
    },
  ], [showWorker, recipTip]);

  if (firstLoad) return <Loading />;

  // 최신 핸들러를 표 클릭에서 읽을 수 있게 매 렌더마다 갱신 (훅 아님)
  handlers.current = { openGroup, openRecip, openMembers, runGroupTest, toggleGroupUse, deleteRecip, goConds: () => goToScreen('alert-cond') };

  const isGroupTab = tab === '수신 그룹';

  const exportButton = (
    <ExportMenuButton
      viewCount={isGroupTab ? groupRows.length : recipientRows.length}
      totalCount={isGroupTab ? summary?.groupCnt ?? groups.length : recipientTotal || itemsMeta?.total}
      onExportView={() => exportView(gridStateOf(isGroupTab ? groupTable.current : recipTable.current, isGroupTab ? groupRows : recipientRows))}
      onExportAll={exportAll}
    />
  );
  /** 탭 머리 오른쪽 — 그 탭에 쓰는 단추만 둡니다(예전 머리말 · 조회 조건 줄의 단추를 옮김) */
  const tabActions = isGroupTab ? (
    <>
      {exportButton}
      <AlertGuardButton testID="recip-group-create" label="수신 그룹 등록" size="sm" variant="primary" icon="plus" deniedTip={writeTip} onPress={() => openGroup(null)} />
    </>
  ) : (
    <>
      {exportButton}
      <AlertGuardButton testID="recip-create" label="수신자 등록" size="sm" variant="primary" icon="plus" deniedTip={recipTip} onPress={() => openRecip()} />
    </>
  );

  return (
    <View>
      {/* 머리말 설명과 [발송 조건 관리] 단추는 뺐습니다(2026-10-03) */}
      <PageHead title="알림 수신자 관리" />

      {!canWrite ? <Hint icon="lock">{`읽기 전용 — ${WRITE_DENIED_TIP} 목록·요약·엑셀은 그대로 볼 수 있습니다.`}</Hint> : null}

      {/* 부재 · 야간 카드와 카드 부제는 뺐습니다(2026-10-03). 사용 중지 그룹 · 정지 계정 수는 있을 때만 보입니다 */}
      <Grid cols={4}>
        <StatCard label="수신 그룹" value={summary?.groupCnt ?? 0} unit="개" sub={summary?.inactiveGroupCnt ? `사용 중지 ${summary.inactiveGroupCnt}` : undefined} />
        <StatCard label="수신자" value={recipientTotal} unit="명" sub={summary?.inactiveAccountCnt ? `계정 정지 ${summary.inactiveAccountCnt}명 제외` : undefined} />
      </Grid>
      <Gap size={20} />

      {loadError ? (
        <View style={{ gap: 8, marginBottom: 8 }}>
          <FormAlert tone="error">{`목록을 불러오지 못했습니다 — ${loadError}`}</FormAlert>
          <Button label="다시 시도" size="sm" onPress={reload} />
        </View>
      ) : null}

      <CardTabs
        id="recip"
        value={tab}
        onChange={setTab}
        items={[
          { value: '수신 그룹', label: '수신 그룹', icon: 'users', count: groups.length },
          { value: '수신자', label: '수신자', icon: 'user', count: itemsMeta?.total ?? (recipientTotal || undefined) },
        ]}
        right={tabActions}
        bodyStyle={narrow ? { padding: 12 } : undefined}
      >
        {isGroupTab ? (
          <TabulatorGrid
            autoWidth
            fillWidth
            widthHint={false}
            bordered
            instanceRef={groupTable}
            columns={groupColumns}
            rows={groupRows}
            rowKey="groupId"
            emptyText="등록된 수신 그룹이 없습니다. 먼저 수신자 탭에서 받을 사람을 등록한 뒤 그룹을 만드세요."
          />
        ) : (
          <View>
            {/* 조회 줄(그룹 · 계정 · 검색 · 조회)은 뺐습니다(2026-10-03) — 전원을 받아 머리글 필터로 거르고 표가 100건씩 나눕니다 */}
            {itemsMeta?.truncated ? <Hint>{`수신자가 많아 앞 ${recipientRows.length.toLocaleString('ko-KR')}명만 불러왔습니다.`}</Hint> : null}
            {listError ? (
              <View style={{ paddingVertical: 8, gap: 8 }}>
                <FormAlert tone="error">{`수신자를 불러오지 못했습니다 — ${listError}`}</FormAlert>
                <Button label="다시 시도" size="sm" onPress={reload} />
              </View>
            ) : null}
            <TabulatorGrid
              autoWidth
              fillWidth
              widthHint={false}
              bordered
              instanceRef={recipTable}
              columns={recipientColumns}
              rows={recipientRows}
              rowKey="recipientId"
              pageSize={100}
              emptyText="수신자가 없습니다. '수신자 등록' 으로 계정을 골라 등록하거나 머리글 필터를 바꿔 보세요." 
            />
            <View style={{ paddingTop: 6 }}>
              <BlindNote fields={['worker']} />
            </View>
          </View>
        )}
      </CardTabs>
    </View>
  );
}
