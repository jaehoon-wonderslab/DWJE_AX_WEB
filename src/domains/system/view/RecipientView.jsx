/**
 * [View] SY-05 알림 수신자 관리 (경로: /system/recipient)
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 사용 API 8건 — /api/v1/alert-recipient-groups, /alert-recipients
 *
 * 표는 Tabulator(`TabulatorGrid`)로 그립니다 — 열 너비를 내용에 맞춰 잡고(autoWidth),
 * 머리글 경계를 끌어 사람이 직접 조절할 수 있으며, 칸 경계를 그어(bordered) 어느 값이
 * 어느 열인지 눈으로 갈립니다. 합이 카드보다 넓으면 표 안에서 가로로 스크롤합니다.
 *
 * 당번·승격은 2026-09-16 에 걷어냈습니다.
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { BlindNote, Button, Card, Filters, Hint, Loading, Pagination, SelectField, StatCard, TabulatorGrid, Tabs, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { labelOf } from '@domains/common/model/codeRepository';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { recipientState } from '../controller/useRecipientController';

// 채널·유효 시간대 선택지와 표기는 서버 공통코드(ALM_CHANNEL · ALM_WINDOW)에서 받습니다

/** formatter 가 HTML 문자열을 그리므로 사용자 입력은 반드시 이스케이프합니다 */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/** 값이 비면 가운뎃줄 */
const dash = (v) => (v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : esc(v));

/** 권한 없는 항목 — 값을 아예 그리지 않습니다 (CM-04 데이터 마스킹) */
const BLIND_HTML = '<span class="tag" title="소속 부서에 이 데이터 항목의 접근 권한이 없습니다">●●●● 비공개</span>';

/** 이름 표기 — 서버가 이름 문자열 또는 {empNo,name} 객체로 줄 수 있습니다 */
const nameOf = (m) => (m && typeof m === 'object' ? m.name ?? m.empNo ?? '' : m);
const empNoOf = (m) => (m && typeof m === 'object' ? m.empNo ?? m.name : m);

export default function RecipientView({
  loading, codes, summary, groups, recipients, tab, setTab, filters,
  setGroupFilter, setStateFilter, reload, exportExcel,
  submitGroup, submitRecipient, toggleRecipient, testGroup, paging, itemsMeta,
}) {
  const { goToScreen } = useAppNavigation();
  const canData = useAuthStore((state) => state.canData);
  // 이름·연락처는 '작업자 정보(worker)' 항목입니다
  const showWorker = canData('worker');
  const chan = codes?.ALM_CHANNEL || [];
  const win = codes?.ALM_WINDOW || [];

  /** 수신자 선택지 (그룹 멤버) — 현재 조회된 수신자 기준 */
  const recipientOptions = recipients.map((r) => ({ value: r.empNo, label: `${r.name} · ${r.dept}` }));

  // 표 안의 버튼 클릭에서 최신 핸들러를 읽는 통로 — 열 정의를 다시 만들지 않으려고 ref 로 둡니다
  const handlers = useRef({});

  /* ───────── 수신 그룹 ───────── */
  const openGroupForm = (row) =>
    openFormModal({
      title: row ? '수신 그룹 편집' : '수신 그룹 등록',
      sub: '발송 조건(SY-04)은 이 그룹 이름을 참조합니다',
      wide: true,
      // 폼 키는 서버 요청 본문(name · channels[] · validWindow · night · memberEmpNos[])과 같습니다
      initial: row
        ? { name: row.name, channels: row.channels || [], validWindow: row.validWindow, night: !!row.night, memberEmpNos: (row.memberEmpNos || row.members || []).map(empNoOf) }
        : { channels: chan[0] ? [chan[0].value] : [], validWindow: win[0]?.value, night: false, memberEmpNos: [] },
      fields: [
        { key: 'name', label: '그룹명', required: true, placeholder: '예) 품질보증팀' },
        { key: 'validWindow', label: '유효 시간대', type: 'select', options: win },
        { key: 'channels', label: '발송 채널', type: 'check', options: chan, full: true },
        { key: 'night', label: '야간 발송', type: 'radio', options: [{ value: true, label: '야간에도 발송' }, { value: false, label: '야간 제외' }], full: true },
        recipientOptions.length
          ? { key: 'memberEmpNos', label: '그룹 멤버', type: 'check', options: recipientOptions, full: true }
          : { key: 'memberNote', label: '그룹 멤버', type: 'static', full: true, value: '등록된 수신자가 없습니다. 수신자 탭에서 먼저 등록한 뒤 멤버를 지정하세요.' },
      ],
      note: '그룹 멤버는 수신자 목록에 등록된 계정에서 고릅니다. 야간 수신 여부는 수신자별로도 관리됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitGroup(row?.groupId, v)).ok,
    });

  /* ───────── 수신자 ───────── */
  const openRecipForm = (row) =>
    openFormModal({
      title: row ? '수신자 편집' : '수신자 등록',
      sub: row ? `${row.name} (${row.dept})` : '알림을 받을 계정의 연락처를 등록합니다',
      initial: row ? { empNo: row.empNo, mail: row.mail, hp: row.hp, messenger: row.messenger, night: !!row.night } : { night: false },
      fields: [
        row
          ? { key: 'empNoView', label: '사번', type: 'static', value: row.empNo }
          : { key: 'empNo', label: '사번', required: true, placeholder: '예) 20260101' },
        { key: 'mail', label: '메일', required: true, placeholder: '예) hong@dwje.co.kr' },
        { key: 'hp', label: '휴대전화', placeholder: '예) 010-0000-0000' },
        { key: 'messenger', label: '사내 메신저' },
        { key: 'night', label: '야간 수신', type: 'radio', options: [{ value: true, label: '수신' }, { value: false, label: '미수신' }], full: true },
      ],
      note: '연락처는 알림 발송에만 사용되며, 데이터 접근 권한 worker 항목이 없는 계정에는 마스킹되어 보입니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitRecipient(row?.recipientId, row ? { ...v, empNo: row.empNo } : v)).ok,
    });

  /* ───────── 표 자료 ─────────
     코드값·배열은 Tabulator 가 정렬·검색할 수 있게 미리 글자로 풀어 둡니다. */
  const groupRows = useMemo(
    () => groups.map((g) => ({
      ...g,
      channelNames: (g.channels || []).map((c) => labelOf(chan, c)).join(' · '),
      windowNm: labelOf(win, g.validWindow) || '',
      memberCnt: (g.members || []).length,
      memberNames: (g.memberNames || (g.members || []).map(nameOf)).join(' · '),
    })),
    [groups, chan, win]
  );

  const recipientRows = useMemo(
    () => recipients.map((r) => ({
      ...r,
      posLabel: r.posNm || r.pos || '',
      groupNames: (r.groups || []).map(nameOf).join(' · '),
      stateLabel: recipientState(r).label,
      receiving: recipientState(r).receiving,
    })),
    [recipients]
  );

  const groupColumns = useMemo(() => [
    { title: '그룹명', field: 'name', minWidth: 120, formatter: (c) => `<span class="strong">${esc(c.getValue())}</span>` },
    {
      title: '발송 채널', field: 'channelNames', minWidth: 130, headerSort: false,
      formatter: (c) => {
        const list = String(c.getValue() || '').split(' · ').filter(Boolean);
        return list.length ? `<span class="chips">${list.map((n) => `<span class="tag tag-blue">${esc(n)}</span>`).join('')}</span>` : '<span class="muted">—</span>';
      },
    },
    { title: '유효 시간대', field: 'windowNm', minWidth: 110, formatter: (c) => dash(c.getValue()) },
    {
      title: '야간', field: 'night', minWidth: 68, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => (c.getValue() ? '<span class="tag tag-green">발송</span>' : '<span class="tag">제외</span>'),
    },
    {
      title: '멤버', field: 'memberCnt', minWidth: 68, hozAlign: 'right', headerHozAlign: 'right', headerFilter: false, sorter: 'number',
      formatter: (c) => `<span class="num">${esc(c.getValue() ?? 0)}</span>`,
    },
    {
      title: '구성원', field: 'memberNames', minWidth: 180, maxWidth: 360,
      formatter: (c) => (showWorker
        ? (c.getValue() ? `<span class="nowrap" title="${esc(c.getValue())}">${esc(c.getValue())}</span>` : '<span class="muted">멤버 없음</span>')
        : BLIND_HTML),
    },
    {
      title: '관리', minWidth: 170, headerSort: false, headerFilter: false,
      formatter: () => '<button class="tbtn" data-act="edit">편집</button> <button class="tbtn" data-act="test">테스트 발송</button>',
      cellClick: (e, c) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        const row = c.getRow().getData();
        if (act === 'edit') handlers.current.openGroupForm(row);
        else if (act === 'test') handlers.current.testGroup(row.groupId);
      },
    },
  ], [showWorker]);

  const recipientColumns = useMemo(() => [
    { title: '이름', field: 'name', minWidth: 90, formatter: (c) => (showWorker ? `<span class="strong">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '부서', field: 'dept', minWidth: 100, formatter: (c) => dash(c.getValue()) },
    { title: '직급', field: 'posLabel', minWidth: 78, formatter: (c) => dash(c.getValue()) },
    { title: '메일', field: 'mail', minWidth: 170, formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '휴대전화', field: 'hp', minWidth: 130, formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    { title: '메신저', field: 'messenger', minWidth: 100, formatter: (c) => (showWorker ? `<span class="mono nowrap">${dash(c.getValue())}</span>` : BLIND_HTML) },
    {
      title: '야간', field: 'night', minWidth: 68, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => (c.getValue() ? '<span class="tag tag-green">수신</span>' : '<span class="tag">미수신</span>'),
    },
    {
      title: '소속 그룹', field: 'groupNames', minWidth: 150, maxWidth: 320,
      formatter: (c) => (c.getValue() ? `<span class="nowrap" title="${esc(c.getValue())}">${esc(c.getValue())}</span>` : '<span class="muted">—</span>'),
    },
    {
      title: '상태', field: 'stateLabel', minWidth: 78, hozAlign: 'center', headerHozAlign: 'center', headerFilter: false,
      formatter: (c) => {
        const row = c.getRow().getData();
        return `<span class="tag ${row.receiving ? 'tag-green' : 'tag-amber'}">${esc(c.getValue())}</span>`;
      },
    },
    {
      title: '관리', minWidth: 150, headerSort: false, headerFilter: false,
      formatter: (c) => {
        const row = c.getRow().getData();
        return `<button class="tbtn" data-act="edit">편집</button> <button class="tbtn" data-act="toggle">${row.receiving ? '부재' : '수신'}</button>`;
      },
      cellClick: (e, c) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        const row = c.getRow().getData();
        if (act === 'edit') handlers.current.openRecipForm(row);
        else if (act === 'toggle') handlers.current.toggleRecipient(row.recipientId ?? row.empNo);
      },
    },
  ], [showWorker]);

  if (loading) return <Loading />;

  // 최신 핸들러를 표 클릭에서 읽을 수 있게 매 렌더마다 갱신 (훅 아님)
  handlers.current = { openGroupForm, openRecipForm, testGroup, toggleRecipient };

  return (
    <View>
      <PageHead
        title="알림 수신자 관리"
        desc="알림을 받을 사람과 연락처를 관리합니다. 발송 조건은 여기서 만든 수신 그룹의 이름만 참조하므로, 멤버·연락처 변경은 이 화면에서만 하면 됩니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="발송 조건 관리" size="sm" icon="settings" onPress={() => goToScreen('alert-cond')} />
            <Button label="수신 그룹 등록" size="sm" variant="primary" icon="plus" onPress={() => openGroupForm(null)} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="수신 그룹" value={summary?.groupCnt ?? 0} unit="개" sub="발송 조건이 참조하는 단위" />
        <StatCard label="수신" value={summary?.recipientCnt?.receiving ?? 0} unit="명" sub="알림을 받는 계정" />
        <StatCard label="부재" value={summary?.recipientCnt?.absent ?? 0} unit="명" sub="발송 대상에서 제외" tone={summary?.recipientCnt?.absent ? 'down' : ''} />
        <StatCard label="야간 수신" value={summary?.nightCnt ?? 0} unit="명" sub="야간에도 받는 계정" />
      </Grid>
      <Gap />

      <Hint>
        발송 조건(SY-04)은 &apos;언제 보낼지&apos;, 이 화면은 &apos;누구에게 보낼지&apos;를 담당합니다. 그룹 이름을 바꾸면 발송 조건의 참조도 함께 바뀌니 주의하세요.
      </Hint>

      <Tabs items={['수신 그룹', '수신자']} value={tab} onChange={setTab} />

      {tab === '수신 그룹' ? (
        <Card title="수신 그룹" sub={`${groups.length}개 · 발송 조건에서 참조하는 단위`} tight>
          <TabulatorGrid
            inset
            autoWidth
            bordered
            columns={groupColumns}
            rows={groupRows}
            rowKey="groupId"
            emptyText="등록된 수신 그룹이 없습니다. '수신 그룹 등록' 으로 첫 그룹을 만드세요."
          />
        </Card>
      ) : null}

      {tab === '수신자' ? (
        <View>
          <Filters>
            <SelectField label="그룹" value={filters.groupFilter} options={['전체', ...groups.map((g) => g.name)]} onChange={setGroupFilter} />
            <SelectField label="상태" value={filters.stateFilter} options={['전체', '수신', '부재']} onChange={setStateFilter} />
            <Button label="조회" variant="primary" onPress={reload} />
            <Button label="수신자 등록" icon="plus" onPress={() => openRecipForm(null)} />
          </Filters>

          <Card title="수신자" sub={`${itemsMeta?.total ?? recipients.length}명`} tight>
            <TabulatorGrid
              inset
              autoWidth
              bordered
              columns={recipientColumns}
              rows={recipientRows}
              rowKey="recipientId"
              height={recipientRows.length > 12 ? 620 : undefined}
              emptyText="등록된 수신자가 없습니다. '수신자 등록' 으로 연락처를 등록하세요."
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
