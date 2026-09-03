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
import { Badge, Button, Card, Filters, Hint, Loading, Pagination, SelectField, StatCard, Table, Tabs, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useCommonStyles } from '@shared/theme/styles';

const CHANNELS = ['메일', '시스템 팝업', 'SMS', '메일 · 시스템 팝업', '메일 · SMS'];
const WINDOWS = ['24시간 상시', '08:00 ~ 20:00', '06:00 ~ 18:00'];

export default function RecipientView({
  loading, summary, groups, recipients, duties, escalation, tab, setTab, filters,
  setGroupFilter, setStateFilter, reload, exportExcel,
  submitGroup, submitRecipient, toggleRecipient, testGroup, submitDuty, removeDuty, paging, itemsMeta,
}) {
  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();

  /* ───────── 수신 그룹 ───────── */
  const openGroupForm = (row) =>
    openFormModal({
      title: row ? '수신 그룹 편집' : '수신 그룹 등록',
      sub: '발송 조건(SY-04)은 이 그룹 이름을 참조합니다',
      initial: row ? { name: row.name, channels: row.channels, window: row.window } : { channels: '메일', window: '24시간 상시' },
      fields: [
        { key: 'name', label: '그룹명', required: true, placeholder: '예) 품질보증팀' },
        { key: 'channels', label: '발송 채널', type: 'select', options: CHANNELS },
        { key: 'window', label: '유효 시간대', type: 'select', options: WINDOWS, full: true },
      ],
      note: '그룹 멤버는 아래 수신자 목록에서 지정합니다. 야간 수신 여부는 수신자별로 관리됩니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitGroup(row?.groupId, v)).ok,
    });

  /* ───────── 수신자 ───────── */
  const openRecipForm = (row) =>
    openFormModal({
      title: row ? '수신자 편집' : '수신자 등록',
      sub: row ? `${row.name} (${row.dept})` : '알림을 받을 계정의 연락처를 등록합니다',
      initial: row || {},
      fields: [
        { key: 'empNo', label: '사번', required: true },
        { key: 'mail', label: '메일', required: true },
        { key: 'hp', label: '휴대전화' },
        { key: 'messenger', label: '사내 메신저' },
        { key: 'night', label: '야간 수신', type: 'radio', options: [{ value: true, label: '수신' }, { value: false, label: '미수신' }], full: true },
      ],
      note: '연락처는 알림 발송에만 사용되며, 데이터 접근 권한 worker 항목이 없는 계정에는 마스킹되어 보입니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitRecipient(row?.recipientId, v)).ok,
    });

  /* ───────── 당번 ───────── */
  const openDutyForm = () =>
    openFormModal({
      title: '당번 · 대리 수신 등록',
      sub: '부재 기간 동안 대신 받을 담당자를 지정합니다',
      fields: [
        { key: 'group', label: '수신 그룹', type: 'select', options: groups.map((g) => g.name), required: true },
        { key: 'main', label: '주 담당자', required: true },
        { key: 'sub', label: '대리 수신자', required: true },
        { key: 'from', label: '시작일', type: 'date', required: true },
        { key: 'to', label: '종료일', type: 'date', required: true },
        { key: 'reason', label: '사유', full: true, placeholder: '예) 연차 · 출장 · 외부 교육' },
      ],
      submitLabel: '등록',
      onSubmit: async (v) => (await submitDuty(v)).ok,
    });

  const confirmDeleteDuty = (row) =>
    openConfirmModal({
      title: '당번 삭제',
      message: `${row.group} · ${row.main} → ${row.sub} 당번을 삭제합니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeDuty(row.dutyId),
    });

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
        <StatCard label="부재" value={summary?.recipientCnt?.absent ?? summary?.absentCnt ?? 0} unit="명" sub="대리 수신 지정 필요" tone="down" />
        <StatCard label="당번 등록" value={summary?.activeDutyCnt ?? summary?.dutyCnt ?? 0} unit="건" sub="기간별 대리 수신" />
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
            columns={[
              { key: 'name', title: '그룹명', width: 150 },
              { key: 'channels', title: '발송 채널', width: 160 },
              { key: 'validWindow', title: '유효 시간대', width: 130 },
              { key: 'members', title: '멤버', width: 70, align: 'right', num: true, render: (r) => <Text style={[s.td, s.num, { textAlign: 'right' }]}>{(r.members || []).length}</Text> },
              { key: 'memberNames', title: '구성원', flex: 1, minWidth: 210, render: (r) => <Text style={[s.td]} numberOfLines={1}>{r.memberNames.join(' · ')}</Text> },
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

          <Card title="수신자" sub={`${recipients.length}명`} tight>
            <Table
              minWidth={1060}
              keyExtractor={(r) => r.recipientId}
              columns={[
                { key: 'name', title: '이름', width: 90 },
                { key: 'dept', title: '부서', width: 110 },
                { key: 'pos', title: '직급', width: 70 },
                { key: 'mail', title: '메일', width: 200, mono: true },
                { key: 'hp', title: '휴대전화', width: 140, mono: true },
                { key: 'messenger', title: '메신저', width: 100, mono: true },
                { key: 'night', title: '야간', width: 70, render: (r) => <Badge tone={r.night ? 'green' : ''}>{r.night ? '수신' : '미수신'}</Badge> },
                { key: 'groups', title: '소속 그룹', flex: 1, minWidth: 170, render: (r) => <Text style={s.td} numberOfLines={1}>{r.groups.join(' · ') || '—'}</Text> },
                { key: 'state', title: '상태', width: 80, render: (r) => <Badge tone={r.state === '수신' ? 'green' : 'amber'}>{r.state}</Badge> },
                {
                  key: 'action',
                  title: '관리',
                  width: 150,
                  render: (r) => (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Button label="편집" size="sm" onPress={() => openRecipForm(r)} />
                      <Button label={r.state === '수신' ? '부재' : '수신'} size="sm" onPress={() => toggleRecipient(r.recipientId)} />
                    </View>
                  ),
                },
              ]}
              rows={recipients}
            />
            <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
          </Card>
        </View>
      ) : null}

      {tab === '당번 · 승격' ? (
        <Grid cols={[3, 2]}>
          <Card title="당번 · 부재 시 대리 수신" sub="기간 동안 대리 수신자에게 함께 발송됩니다" tight right={<Button label="당번 등록" size="sm" icon="plus" onPress={openDutyForm} />}>
            <Table
              minWidth={700}
              keyExtractor={(r) => r.dutyId}
              columns={[
                { key: 'from', title: '시작', width: 108 },
                { key: 'to', title: '종료', width: 108 },
                { key: 'group', title: '수신 그룹', width: 130 },
                { key: 'main', title: '주 담당', width: 90 },
                { key: 'sub', title: '대리', width: 90 },
                { key: 'reason', title: '사유', flex: 1, minWidth: 130 },
                { key: 'del', title: '삭제', width: 78, render: (r) => <Button label="삭제" size="sm" variant="danger" onPress={() => confirmDeleteDuty(r)} /> },
              ]}
              rows={duties}
            />
          </Card>

          <Card title="미확인 건 승격 단계" sub="확인되지 않은 알림이 상위 담당으로 전달되는 순서" tight>
            <Table
              keyExtractor={(r) => r.level}
              columns={[
                { key: 'level', title: '단계', width: 66, render: (r) => <Badge tone="amber">{r.level}</Badge> },
                { key: 'to', title: '전달 대상', width: 120 },
                { key: 'channels', title: '채널', width: 130 },
                { key: 'reason', title: '사유', flex: 1, minWidth: 140, wrap: true },
              ]}
              rows={escalation}
            />
          </Card>
        </Grid>
      ) : null}
    </View>
  );
}
