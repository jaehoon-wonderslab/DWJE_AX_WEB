/**
 * [View] SY-05 알림 수신자 관리 (경로: /system/recipient)
 *
 * '누구에게 · 어떤 연락처로' 보낼지를 관리합니다.
 * 사용 API 13건 — /api/v1/alert-recipient-groups, /alert-recipients, /alert-duties, /alert-escalation-rules
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, BlindNote, BlindValue, Button, Card, Filters, Hint, Loading, Pagination, SelectField, StatCard, Table, Tabs, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { labelOf } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';
import { recipientState } from '../controller/useRecipientController';

// 채널·유효 시간대 선택지와 표기는 서버 공통코드(ALM_CHANNEL · ALM_WINDOW)에서 받습니다

/** yyyy-mm-dd */
const ymd = (d) => d.toISOString().slice(0, 10);

export default function RecipientView({
  loading, codes, summary, groups, recipients, duties, escalation, tab, setTab, filters,
  setGroupFilter, setStateFilter, reload, exportExcel,
  submitGroup, submitRecipient, toggleRecipient, testGroup, submitDuty, removeDuty, submitEscalation, paging, itemsMeta,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const chan = codes?.ALM_CHANNEL || [];
  const win = codes?.ALM_WINDOW || [];
  const sev = codes?.ALM_SEVERITY || [];

  /** 이름 표기 — 서버가 이름 문자열 또는 {empNo,name} 객체로 줄 수 있습니다 */
  const nameOf = (m) => (m && typeof m === 'object' ? m.name ?? m.empNo ?? '' : m);
  const empNoOf = (m) => (m && typeof m === 'object' ? m.empNo ?? m.name : m);

  /** 수신자 선택지 (당번 담당자 · 그룹 멤버) — 현재 조회된 수신자 기준 */
  const recipientOptions = recipients.map((r) => ({ value: r.empNo, label: `${r.name} · ${r.dept}` }));
  const groupOptions = groups.map((g) => ({ value: g.groupId, label: g.name }));

  // 당번 기간은 앞으로의 부재 기간이라 실적 보유 기간(DateField 기본 제한)과 무관하게 앞뒤 1년을 열어 둡니다
  const today = new Date();
  const dutyMin = ymd(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const dutyMax = ymd(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()));

  /* ───────── 수신 그룹 ───────── */
  const openGroupForm = (row) =>
    openFormModal({
      title: row ? '수신 그룹 편집' : '수신 그룹 등록',
      sub: '발송 조건(SY-04)은 이 그룹 이름을 참조합니다',
      wide: true,
      // 폼 키는 서버 요청 본문(name · channels[] · validWindow · night · memberEmpNos[])과 같습니다
      initial: row
        ? { name: row.name, channels: row.channels || [], validWindow: row.validWindow, night: !!row.night, memberEmpNos: (row.members || []).map(empNoOf) }
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

  /* ───────── 당번 ───────── */
  const openDutyForm = (row = null) => {
    // 목록 행은 이름(group · main · sub)으로 오므로 폼 값(ID · 사번)으로 되돌립니다
    const groupId = row ? row.groupId ?? groups.find((g) => g.name === row.group)?.groupId : groupOptions[0]?.value;
    const empNoByName = (nm) => recipients.find((r) => r.name === nm || r.empNo === nm)?.empNo ?? nm ?? '';
    const personField = (key, label) =>
      recipientOptions.length
        ? { key, label, type: 'select', options: recipientOptions, required: true }
        : { key, label: `${label} (사번)`, required: true, placeholder: '예) 20260101' };
    openFormModal({
      title: row ? '당번 · 대리 수신 수정' : '당번 · 대리 수신 등록',
      sub: '부재 기간 동안 대신 받을 담당자를 지정합니다',
      initial: row
        ? { groupId, mainEmpNo: row.mainEmpNo ?? empNoByName(row.main), subEmpNo: row.subEmpNo ?? empNoByName(row.sub), from: row.from, to: row.to, reason: row.reason }
        : { groupId, mainEmpNo: recipientOptions[0]?.value, subEmpNo: recipientOptions[1]?.value ?? recipientOptions[0]?.value },
      fields: [
        { key: 'groupId', label: '수신 그룹', type: 'select', options: groupOptions, required: true, full: true },
        personField('mainEmpNo', '주 담당자'),
        personField('subEmpNo', '대리 수신자'),
        { key: 'from', label: '시작일', type: 'date', required: true, min: dutyMin, max: dutyMax },
        { key: 'to', label: '종료일', type: 'date', required: true, min: dutyMin, max: dutyMax },
        { key: 'reason', label: '사유', full: true, placeholder: '예) 연차 · 출장 · 외부 교육' },
      ],
      note: '기간 동안 주 담당자에게 가는 알림이 대리 수신자에게도 함께 발송됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitDuty(row?.dutyId, v)).ok,
    });
  };

  const confirmDeleteDuty = (row) =>
    openConfirmModal({
      title: '당번 삭제',
      message: `${row.group} · ${row.main} → ${row.sub} 당번을 삭제합니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeDuty(row.dutyId),
    });

  /* ───────── 승격 규칙 ───────── */
  const openEscalationForm = () => {
    // 서버가 받는 항목은 stage · waitMin · targetGroupId 뿐입니다 (전달 대상 설명 · 채널은 수정 대상이 아닙니다)
    const stages = [...escalation].sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0));
    const initial = {};
    const fields = [];
    stages.forEach((st) => {
      initial[`wait${st.stage}`] = String(st.waitMin ?? '');
      initial[`group${st.stage}`] = st.targetGroupId ?? '';
      fields.push(
        { key: `stage${st.stage}`, label: `${st.stageNm || `${st.stage}차`} 전달 대상`, type: 'static', value: st.targetGroupNm || st.targetDesc || '—' },
        { key: `wait${st.stage}`, label: `${st.stageNm || `${st.stage}차`} 미확인 경과 (분)`, type: 'number', required: true, placeholder: '예) 30' },
        { key: `group${st.stage}`, label: `${st.stageNm || `${st.stage}차`} 전달 수신 그룹`, type: 'select', full: true, options: [{ value: '', label: '지정 안 함 (기본 전달 대상)' }, ...groupOptions] }
      );
    });
    openFormModal({
      title: '미확인 건 승격 단계 수정',
      sub: '확인되지 않은 알림이 상위 담당으로 전달되는 대기 시간과 수신 그룹을 설정합니다',
      wide: true,
      initial,
      fields,
      note: '경과 시간은 앞 단계보다 길어야 합니다. 전달 수신 그룹을 비우면 기본 전달 대상(파트장 · 팀장 · 경영진)으로 승격됩니다.',
      submitLabel: '규칙 저장',
      onSubmit: async (v) => (await submitEscalation(stages.map((st) => ({ stage: st.stage, waitMin: v[`wait${st.stage}`], targetGroupId: v[`group${st.stage}`] })))).ok,
    });
  };

  if (loading) return <Loading />;

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
        <StatCard label="수신자" value={summary?.recipientCnt?.receiving ?? 0} unit="명" sub={`야간 수신 ${summary?.nightCnt ?? 0}명`} />
        <StatCard label="부재" value={summary?.recipientCnt?.absent ?? 0} unit="명" sub="대리 수신 지정 필요" tone={summary?.recipientCnt?.absent ? 'down' : ''} />
        <StatCard label="당번 등록" value={summary?.activeDutyCnt ?? 0} unit="건" sub="기간별 대리 수신" />
      </Grid>
      <Gap />

      <Hint>
        발송 조건(SY-04)은 &apos;언제 보낼지&apos;, 이 화면은 &apos;누구에게 보낼지&apos;를 담당합니다. 그룹 이름을 바꾸면 발송 조건의 참조도 함께 바뀌니 주의하세요.
      </Hint>

      <Tabs items={['수신 그룹', '수신자', '당번 · 승격']} value={tab} onChange={setTab} />

      {tab === '수신 그룹' ? (
        <Card title="수신 그룹" sub={`${groups.length}개 · 발송 조건에서 참조하는 단위`} tight>
          <Table
            minWidth={980}
            keyExtractor={(r) => r.groupId}
            emptyText="등록된 수신 그룹이 없습니다. '수신 그룹 등록' 으로 첫 그룹을 만드세요."
            columns={[
              { key: 'name', title: '그룹명', width: 150, render: (r) => <Text style={[s.td, { fontWeight: '600' }]}>{r.name}</Text> },
              { key: 'channels', title: '발송 채널', width: 160, render: (r) => <Text style={s.td}>{(r.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—'}</Text> },
              { key: 'validWindow', title: '유효 시간대', width: 130, render: (r) => <Text style={s.td}>{labelOf(win, r.validWindow) || '—'}</Text> },
              { key: 'night', title: '야간', width: 70, render: (r) => <Badge tone={r.night ? 'green' : ''}>{r.night ? '발송' : '제외'}</Badge> },
              { key: 'members', title: '멤버', width: 70, align: 'right', num: true, render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{(r.members || []).length}</Text> },
              {
                key: 'memberNames',
                title: '구성원',
                flex: 1,
                minWidth: 210,
                render: (r) => {
                  const names = r.memberNames || (r.members || []).map(nameOf);
                  return <Text style={s.td} numberOfLines={1}>{names.length ? names.join(' · ') : '멤버 없음'}</Text>;
                },
              },
              {
                key: 'action',
                title: '관리',
                width: 170,
                render: (r) => (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Button label="편집" size="sm" onPress={() => openGroupForm(r)} />
                    <Button label="테스트 발송" size="sm" onPress={() => testGroup(r.groupId)} />
                  </View>
                ),
              },
            ]}
            rows={groups}
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
            <Table
              minWidth={1060}
              keyExtractor={(r) => r.recipientId ?? r.empNo}
              emptyText="등록된 수신자가 없습니다. '수신자 등록' 으로 연락처를 등록하세요."
              columns={[
                { key: 'name', title: '이름', width: 90, render: (r) => <BlindValue field="worker" value={r.name} textStyle={s.td} /> },
                { key: 'dept', title: '부서', width: 110 },
                { key: 'pos', title: '직급', width: 70, render: (r) => <Text style={s.td}>{r.posNm || r.pos || '—'}</Text> },
                { key: 'mail', title: '메일', width: 200, render: (r) => <BlindValue field="worker" value={r.mail || '—'} textStyle={[s.td, s.mono]} /> },
                { key: 'hp', title: '휴대전화', width: 140, render: (r) => <BlindValue field="worker" value={r.hp || '—'} textStyle={[s.td, s.mono]} /> },
                { key: 'messenger', title: '메신저', width: 100, render: (r) => <BlindValue field="worker" value={r.messenger || '—'} textStyle={[s.td, s.mono]} /> },
                { key: 'night', title: '야간', width: 70, render: (r) => <Badge tone={r.night ? 'green' : ''}>{r.night ? '수신' : '미수신'}</Badge> },
                { key: 'groups', title: '소속 그룹', flex: 1, minWidth: 170, render: (r) => <Text style={s.td} numberOfLines={1}>{(r.groups || []).map(nameOf).join(' · ') || '—'}</Text> },
                {
                  key: 'state',
                  title: '상태',
                  width: 80,
                  render: (r) => {
                    const st = recipientState(r);
                    return <Badge tone={st.receiving ? 'green' : 'amber'}>{st.label}</Badge>;
                  },
                },
                {
                  key: 'action',
                  title: '관리',
                  width: 150,
                  render: (r) => (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Button label="편집" size="sm" onPress={() => openRecipForm(r)} />
                      <Button label={recipientState(r).receiving ? '부재' : '수신'} size="sm" onPress={() => toggleRecipient(r.recipientId ?? r.empNo)} />
                    </View>
                  ),
                },
              ]}
              rows={recipients}
            />
            <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
              <BlindNote fields={['worker']} />
            </View>
            <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
          </Card>
        </View>
      ) : null}

      {tab === '당번 · 승격' ? (
        <Grid cols={[3, 2]}>
          <Card title="당번 · 부재 시 대리 수신" sub="기간 동안 대리 수신자에게 함께 발송됩니다" tight right={<Button label="당번 등록" size="sm" icon="plus" onPress={() => openDutyForm(null)} />}>
            <Table
              minWidth={740}
              keyExtractor={(r) => r.dutyId}
              emptyText="등록된 당번이 없습니다. 부재 기간이 있으면 '당번 등록' 으로 대리 수신자를 지정하세요."
              columns={[
                { key: 'from', title: '시작', width: 108, mono: true },
                { key: 'to', title: '종료', width: 108, mono: true },
                { key: 'group', title: '수신 그룹', width: 130 },
                { key: 'main', title: '주 담당', width: 90, render: (r) => <BlindValue field="worker" value={r.main || '—'} textStyle={s.td} /> },
                { key: 'sub', title: '대리', width: 90, render: (r) => <BlindValue field="worker" value={r.sub || '—'} textStyle={s.td} /> },
                { key: 'reason', title: '사유', flex: 1, minWidth: 130 },
                {
                  key: 'action',
                  title: '관리',
                  width: 130,
                  render: (r) => (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Button label="수정" size="sm" onPress={() => openDutyForm(r)} />
                      <Button label="삭제" size="sm" variant="danger" onPress={() => confirmDeleteDuty(r)} />
                    </View>
                  ),
                },
              ]}
              rows={duties}
            />
          </Card>

          <Card
            title="미확인 건 승격 단계"
            sub="확인되지 않은 알림이 상위 담당으로 전달되는 순서"
            tight
            right={<Button label="승격 규칙 수정" size="sm" icon="edit" onPress={openEscalationForm} disabled={!escalation.length} />}
          >
            <Table
              minWidth={520}
              keyExtractor={(r) => String(r.escRuleId ?? r.stage)}
              emptyText="승격 규칙이 없습니다."
              columns={[
                { key: 'stageNm', title: '단계', width: 66, render: (r) => <Badge tone="amber">{r.stageNm || `${r.stage}차`}</Badge> },
                { key: 'waitMin', title: '경과', width: 90, render: (r) => <Text style={[s.td, s.num]}>{r.waitMin != null ? `${r.waitMin}분` : '—'}</Text> },
                { key: 'targetDesc', title: '전달 대상', width: 130, render: (r) => <Text style={s.td}>{r.targetGroupNm || r.targetDesc || '—'}</Text> },
                { key: 'severityFilter', title: '대상 등급', width: 80, render: (r) => <Text style={s.td}>{r.severityFilter ? labelOf(sev, r.severityFilter) : '전체'}</Text> },
                { key: 'note', title: '조건', flex: 1, minWidth: 140, wrap: true, render: (r) => <Text style={s.td}>{r.note || '—'}</Text> },
                { key: 'on', title: '상태', width: 64, render: (r) => <Badge tone={r.on ? 'green' : ''}>{r.on ? '사용' : '중지'}</Badge> },
              ]}
              rows={escalation}
            />
          </Card>
        </Grid>
      ) : null}
    </View>
  );
}
