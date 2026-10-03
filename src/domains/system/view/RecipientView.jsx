/**
 * [View] SY-05 알림 수신자 관리 (경로: /system/recipient · 화면 ID sys-recip)
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 사용 API 14건 — /api/v1/alert-recipient-groups(목록·상세·등록·수정·사용 중지·테스트), /alert-recipients(요약·목록·후보·영향·등록·수정·상태·삭제)
 *
 * 표는 Tabulator(`TabulatorGrid`)로 그립니다 — 열 너비를 내용에 맞춰 잡고(autoWidth),
 * 머리글 경계를 끌어 사람이 직접 조절할 수 있으며, 칸 경계를 그어(bordered) 어느 값이
 * 어느 열인지 눈으로 갈립니다. 합이 카드보다 넓으면 표 안에서 가로로 스크롤합니다.
 *
 * 쓰기 권한이 없으면 쓰기 버튼을 숨기지 않고 비활성으로 두고 이유를 툴팁으로 보입니다(R-06).
 * 당번·대리 수신은 2026-09-16 에 걷어냈습니다(되살리지 않습니다).
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  BlindNote, Button, Card, CheckRow, ExportMenuButton, Filters, FormAlert, Hint, Loading, Pagination, SelectField, StatCard, TabulatorGrid, Tabs, TextField,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf } from '@domains/common/model/codeRepository';
import { accountState, memberNameOf, receivableLabel, recipientState } from '../controller/useRecipientController';
import AlertGuardButton, { WORKER_DENIED_TIP, WRITE_DENIED_TIP, htmlGuardButton } from './AlertGuardButton';
import { askConfirm } from './AlertAsk';
import AlertTestResult, { normalizeTestResult } from './AlertTestResult';
import { impactText, openAbsentForm, openGroupForm, openRecipientForm } from './RecipientForms';

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

export default function RecipientView({
  firstLoad, listLoading, loadError, listError, codes, summary, recipientTotal, groups, recipients, tab, setTab, filters,
  setGroupFilter, setStateFilter, setUserStateFilter, setKeyword, setShowInactive, reload, canWrite, showWorker, exportView, exportAll,
  loadGroupDetail, loadDeptOptions, loadMemberCandidates, loadImpact, changeState, removeRecipient, setGroupUse, searchCandidates,
  submitGroup, submitRecipient, testGroup, paging, itemsMeta,
}) {
  const { goToScreen } = useAppNavigation();
  const can = useAuthStore((state) => state.can);
  const canCond = can('alert-cond');
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);
  const chan = codes?.ALM_CHANNEL || [];
  const win = codes?.ALM_WINDOW || [];
  const nightWindow = summary?.nightWindow;

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
      nightWindow,
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
  const openRecip = (row) =>
    openRecipientForm({
      row,
      searchCandidates,
      nightWindow,
      onSubmit: async (recipientId, body) => (await submitRecipient(recipientId, body)).ok,
    });

  /** 부재로 / 수신으로 (RCP-07) — 부재는 영향과 사유를 묻습니다 */
  const toggleRecipState = async (row) => {
    if (!recipientState(row).receiving) {
      await changeState(row.recipientId, 'RECV');
      return;
    }
    const impact = await loadImpact(row.recipientId);
    openAbsentForm({ row, impact, onSubmit: async (reason) => (await changeState(row.recipientId, 'ABSENT', reason)).ok });
  };

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
        memberNames: (g.memberNames || (g.members || []).map(memberNameOf)).filter(Boolean).join(' · '),
      };
    }),
    [groups, chan, win]
  );

  const recipientRows = useMemo(
    () => recipients.map((r) => ({
      ...r,
      posLabel: r.posNm || r.pos || '',
      groupNames: (r.groups || []).map(memberNameOf).join(' · '),
      stateLabel: recipientState(r).label,
      receiving: recipientState(r).receiving,
      accountLabel: accountState(r).label,
      accountCode: accountState(r).code,
    })),
    [recipients]
  );

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
      title: '야간', field: 'night', hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => (c.getValue() ? '<span class="tag tag-green">발송</span>' : '<span class="tag">제외</span>'),
    },
    {
      title: '멤버', field: 'memberCnt', hozAlign: 'right', headerHozAlign: 'right', headerFilter: false, sorter: 'number',
      formatter: (c) => `<span class="num">${esc(c.getValue() ?? 0)}</span>`,
    },
    {
      // 수신 가능 = 수신 상태 · 계정 사용(잠금 포함) · 연락처 있음 (RCP-09)
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
      title: '구성원', field: 'memberNames',
      formatter: (c) => (showWorker
        ? (c.getValue() ? `<span class="nowrap" title="${esc(c.getValue())}">${esc(c.getValue())}</span>` : '<span class="muted">멤버 없음</span>')
        : BLIND_HTML),
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
      title: '수신 그룹', field: 'groupNames',
      formatter: (c) => (c.getValue() ? `<span class="nowrap" title="${esc(c.getValue())}">${esc(c.getValue())}</span>` : '<span class="muted">—</span>'),
    },
    { title: '이름', field: 'name', formatter: (c) => (showWorker ? `<span class="strong">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '부서', field: 'dept', formatter: (c) => dash(c.getValue()) },
    { title: '직급', field: 'posLabel', formatter: (c) => dash(c.getValue()) },
    {
      // 계정 상태 — 정지·승인 대기 계정은 알림을 받지 않습니다. 잠금은 받습니다 (RCP-04, 3단계 결정)
      title: '계정', field: 'accountLabel', minWidth: 80, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => {
        const row = c.getRow().getData();
        if (!c.getValue()) return '<span class="muted">—</span>';
        const tone = row.accountCode === 'ACTIVE' ? 'tag-green' : row.accountCode === 'SUSPENDED' ? 'tag-red' : 'tag-amber';
        return `<span class="tag ${tone}">${esc(c.getValue())}</span>`;
      },
    },
    { title: '메일', field: 'mail', formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '휴대전화', field: 'hp', formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '메신저', field: 'messenger', formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    {
      title: '야간', field: 'night', hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => (c.getValue() ? '<span class="tag tag-green">수신</span>' : '<span class="tag">미수신</span>'),
    },
    {
      title: '상태', field: 'stateLabel', hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => {
        const row = c.getRow().getData();
        return `<span class="tag ${row.receiving ? 'tag-green' : 'tag-amber'}">${esc(c.getValue())}</span>`;
      },
    },
    {
      // 비고 (RCP-07) — 말줄임, 툴팁에 전체
      title: '비고', field: 'remark', minWidth: 140, maxWidth: 260,
      formatter: (c) => (c.getValue() ? `<span class="nowrap" title="${esc(c.getValue())}">${esc(c.getValue())}</span>` : '<span class="muted">—</span>'),
    },
    {
      title: '관리', headerSort: false, headerFilter: false, minWidth: 210,
      formatter: (c) => {
        const row = c.getRow().getData();
        return [
          htmlGuardButton('edit', '편집', recipTip, esc),
          htmlGuardButton('state', row.receiving ? '부재로' : '수신으로', writeTip, esc),
          htmlGuardButton('delete', '삭제', recipTip, esc),
        ].join(' ');
      },
      cellClick: (e, c) => {
        const btn = e.target.closest('[data-act]');
        if (!btn || btn.disabled) return;
        const row = c.getRow().getData();
        if (btn.dataset.act === 'edit') handlers.current.openRecip(row);
        else if (btn.dataset.act === 'state') handlers.current.toggleRecipState(row);
        else if (btn.dataset.act === 'delete') handlers.current.deleteRecip(row);
      },
    },
  ], [showWorker, recipTip, writeTip]);

  if (firstLoad) return <Loading />;

  // 최신 핸들러를 표 클릭에서 읽을 수 있게 매 렌더마다 갱신 (훅 아님)
  handlers.current = { openGroup, openRecip, runGroupTest, toggleGroupUse, toggleRecipState, deleteRecip, goConds: () => goToScreen('alert-cond') };

  const isGroupTab = tab === '수신 그룹';
  const filtered = filters.groupFilter !== '전체' || filters.stateFilter !== '전체' || filters.userStateFilter !== '전체' || !!filters.appliedKeyword;

  return (
    <View>
      <PageHead
        title="알림 수신자 관리"
        desc="알림 수신 그룹과 수신자 연락처를 관리합니다. 발송 조건은 여기서 만든 수신 그룹을 골라 연결합니다."
        actions={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportMenuButton
              viewCount={isGroupTab ? groupRows.length : recipientRows.length}
              totalCount={isGroupTab ? summary?.groupCnt ?? groups.length : recipientTotal || itemsMeta?.total}
              onExportView={() => exportView(gridStateOf(isGroupTab ? groupTable.current : recipTable.current, isGroupTab ? groupRows : recipientRows))}
              onExportAll={exportAll}
            />
            <Button label="발송 조건 관리" size="sm" icon="settings" onPress={() => goToScreen('alert-cond')} disabled={!canCond} />
            <AlertGuardButton testID="recip-group-create" label="수신 그룹 등록" size="sm" variant="primary" icon="plus" deniedTip={writeTip} onPress={() => openGroup(null)} />
          </View>
        }
      />

      {!canWrite ? <Hint icon="lock">{`읽기 전용 — ${WRITE_DENIED_TIP} 목록·요약·엑셀은 그대로 볼 수 있습니다.`}</Hint> : null}

      <Grid cols={4}>
        <StatCard label="수신 그룹" value={summary?.groupCnt ?? 0} unit="개" sub={summary?.inactiveGroupCnt ? `사용 중지 ${summary.inactiveGroupCnt}` : '발송 조건이 연결하는 단위'} />
        <StatCard
          label="수신"
          value={summary?.recipientCnt?.receiving ?? 0}
          unit="명"
          sub={summary?.inactiveAccountCnt ? `계정 정지 ${summary.inactiveAccountCnt}명 제외` : '알림을 받는 계정'}
        />
        <StatCard label="부재" value={summary?.recipientCnt?.absent ?? 0} unit="명" sub="발송 대상에서 제외" tone={summary?.recipientCnt?.absent ? 'down' : ''} />
        <StatCard
          label="야간에 받는 사람"
          value={summary?.nightCnt ?? 0}
          unit="명"
          sub={nightWindow
            ? `야간 ${nightWindow.from}~${nightWindow.to}${summary?.nightPersonalCnt !== undefined ? ` · 개인 야간 수신 ${summary.nightPersonalCnt}명` : ''}`
            : '그룹 야간 발송 또는 개인 야간 수신'}
        />
      </Grid>
      <Gap />

      <Hint>
        발송 조건은 이 화면의 수신 그룹을 골라 연결합니다. 그룹 이름을 바꿔도 연결은 유지됩니다. 멤버를 빼거나 부재로 바꾸면 해당 그룹을 쓰는 조건의 받는 사람이 줄어듭니다.
      </Hint>

      {loadError ? (
        <View style={{ gap: 8, marginBottom: 8 }}>
          <FormAlert tone="error">{`목록을 불러오지 못했습니다 — ${loadError}`}</FormAlert>
          <Button label="다시 시도" size="sm" onPress={reload} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Tabs items={['수신 그룹', '수신자']} value={tab} onChange={setTab} />
        {isGroupTab ? <CheckRow label="사용 중지 그룹 보기" checked={!!filters.showInactive} onToggle={() => setShowInactive(!filters.showInactive)} /> : null}
      </View>

      {isGroupTab ? (
        <Card title="수신 그룹" sub={`${groups.length}개 · 발송 조건에서 연결하는 단위`} tight>
          <TabulatorGrid
            inset
            autoWidth
            bordered
            instanceRef={groupTable}
            columns={groupColumns}
            rows={groupRows}
            rowKey="groupId"
            emptyText="등록된 수신 그룹이 없습니다. 먼저 수신자 탭에서 받을 사람을 등록한 뒤 그룹을 만드세요."
          />
        </Card>
      ) : null}

      {!isGroupTab ? (
        <View>
          {/* 조회 조건 (RCP-11) — 서버가 거릅니다. 검색어는 조회·Enter 로만 보냅니다 */}
          <Filters>
            <SelectField label="그룹" value={filters.groupFilter} options={[{ value: '전체', label: '전체' }, ...groups.map((g) => ({ value: g.groupId, label: g.name }))]} onChange={setGroupFilter} nativeSelect />
            <SelectField label="상태" value={filters.stateFilter} options={['전체', '수신', '부재']} onChange={setStateFilter} nativeSelect />
            <SelectField label="계정" value={filters.userStateFilter} options={['전체', '사용', '잠금', '정지', '승인 대기']} onChange={setUserStateFilter} nativeSelect />
            <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} onSubmitEditing={reload} placeholder="이름 · 사번 · 부서" accessibilityLabel="수신자 검색" />
            <Button label="조회" variant="primary" onPress={reload} />
            <AlertGuardButton testID="recip-create" label="수신자 등록" icon="plus" deniedTip={recipTip} onPress={() => openRecip(null)} />
          </Filters>

          <Card title="수신자" sub={`${itemsMeta?.total ?? recipients.length}명${listLoading ? ' · 불러오는 중' : ''}`} tight>
            {listError ? (
              <View style={{ padding: 16, gap: 8 }}>
                <FormAlert tone="error">{`수신자를 불러오지 못했습니다 — ${listError}`}</FormAlert>
                <Button label="다시 시도" size="sm" onPress={reload} />
              </View>
            ) : null}
            <TabulatorGrid
              inset
              autoWidth
              bordered
              instanceRef={recipTable}
              columns={recipientColumns}
              rows={recipientRows}
              rowKey="recipientId"
              height={recipientRows.length > 12 ? 620 : undefined}
              emptyText={filtered
                ? '조회 조건에 맞는 수신자가 없습니다.'
                : "등록된 수신자가 없습니다. '수신자 등록' 으로 계정을 골라 연락처를 등록하세요."}
            />
            <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
              <BlindNote fields={['worker']} />
            </View>
            <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
          </Card>
        </View>
      ) : null}
    </View>
  );
}
