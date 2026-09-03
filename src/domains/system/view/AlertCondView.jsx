/**
 * [View] SY-04 이상 알림 발송 조건 관리 (경로: /system/alert-condition)
 *
 * '언제 · 무엇을 기준으로' 보낼지를 정의합니다.
 * 사용 API 6건 — /api/v1/alert-conditions/*
 */
import React from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import { Badge, Button, Card, Filters, Hint, Loading, Pagination, SelectField, SourceNote, StatCard, Table, TextField, openConfirmModal, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';

// 선택지·표시명은 서버 공통코드에서 받습니다 (ALM_SEVERITY · ALM_CHANNEL · ALM_OP · ALM_TARGET · ALM_WINDOW · ALM_DEDUP · ALM_DURATION)

export default function AlertCondView({
  loading, items, summary, codes, groupOptions, metricOptions, filters, setSeverity, setEnabled, setKeyword, reload,
  exportExcel, submitCond, toggleCond, testCond, removeCond, paging, itemsMeta,
}) {
  const sev = codes?.ALM_SEVERITY || [];
  const chan = codes?.ALM_CHANNEL || [];
  const target = codes?.ALM_TARGET || [];
  const op = codes?.ALM_OP || [];
  const win = codes?.ALM_WINDOW || [];
  const dedup = codes?.ALM_DEDUP || [];
  const dur = codes?.ALM_DURATION || [];

  const s = useCommonStyles();
  const { goToScreen } = useAppNavigation();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);

  /** 수신 그룹 표기 — 목록 행에는 이름 또는 {groupId,name} 으로 옵니다 */
  const groupNmOf = (g) => (g && typeof g === 'object' ? g.name ?? g.groupNm ?? '' : g);
  const groupIdOf = (g) => (g && typeof g === 'object' ? g.groupId : groupOptions.find((o) => o.label === g)?.value);

  /** 발송 조건 등록·편집 */
  const openCondForm = (row) =>
    openFormModal({
      title: row ? '발송 조건 편집' : '발송 조건 등록',
      sub: '언제 · 무엇을 기준으로 보낼지 정의합니다 (수신자는 알림 수신자 관리에서 지정)',
      wide: true,
      // 목록 행의 수신 그룹은 이름(또는 {groupId,name}) 으로 오므로 폼 값(groupId)으로 되돌립니다
      initial: row
        ? {
            ...row,
            metricStdId: row.metricId,
            channels: (row.channels || [])[0],
            groupIds: (row.groupIds || [])[0] ?? groupIdOf((row.groups || [])[0]),
          }
        : { severity: 'WARN', channels: 'MAIL', validWindow: 'ALWAYS', dedupMin: 'M30', op: 'GE', duration: 'IMMEDIATE', target: 'ALL_EQPT' },
      fields: [
        { key: 'name', label: '조건명', required: true, placeholder: '예) 불량률 임계 초과' },
        // 감지 지표는 지표 기준(SY-13)에서 고릅니다 — 서버가 metricStdId 로 연결합니다
        { key: 'metricStdId', label: '감지 지표', type: 'select', options: metricOptions, required: true, full: true },
        { key: 'op', label: '비교', type: 'select', options: op },
        { key: 'threshold', label: '임계값', type: 'number', required: true, placeholder: '예) 3.0' },
        { key: 'duration', label: '지속 조건', type: 'select', options: dur },
        { key: 'target', label: '대상 범위', type: 'select', options: target },
        { key: 'severity', label: '심각도', type: 'select', options: sev },
        { key: 'channels', label: '발송 채널', type: 'select', options: chan },
        { key: 'groupIds', label: '수신 그룹', type: 'select', options: groupOptions, full: true },
        { key: 'validWindow', label: '유효 시간대', type: 'select', options: win },
        { key: 'dedupMin', label: '중복 억제', type: 'select', options: dedup },
      ],
      note: '임계값은 지표 측정 데이터 관리(SY-13)의 기준 수치와 함께 판정에 사용됩니다. 수신 그룹의 멤버와 연락처는 알림 수신자 관리(SY-05)에서만 바꿉니다.',
      submitLabel: row ? '수정' : '등록',
      onSubmit: async (v) => (await submitCond(row?.condId, {
        ...v,
        // 서버는 배열로 받습니다 (화면은 아직 하나만 고르게 되어 있습니다)
        channels: v.channels ? [v.channels] : [],
        groupIds: v.groupIds ? [v.groupIds] : [],
      })).ok,
    });

  /**
   * 발송 조건 테스트 — 서버가 실제 수신자에게 테스트 발송한 결과를 보여 줍니다.
   * 응답은 `{ sentCnt, recipients[], channels[] }` 입니다 (예전엔 없는 `preview` 를 읽어 화면이 죽었습니다).
   */
  const testSend = async (row) => {
    const res = await testCond(row.condId);
    if (!res.ok) {
      toast(res.message);
      return;
    }
    const d = res.data || {};
    const recips = (d.recipients || []).map((r) => (r && typeof r === 'object' ? [r.name, r.dept].filter(Boolean).join(' · ') || r.empNo : r));
    const chans = (d.channels || row.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—';
    openModal({
      title: '발송 조건 테스트',
      sub: `${row.name} · ${chans}`,
      render: () => (
        <View>
          <Text style={[s.textSm, { fontWeight: '700', marginBottom: 6 }]}>{`테스트 발송 ${d.sentCnt ?? 0}건`}</Text>
          {recips.length ? (
            <Text style={[s.textSm, { lineHeight: 21 }]}>{`수신자: ${recips.join(', ')}`}</Text>
          ) : (
            <Text style={[s.textSm, { lineHeight: 21 }]}>연결된 수신 그룹에 수신 상태인 멤버가 없어 실제 발송은 없었습니다. 알림 수신자 관리에서 그룹 멤버를 지정하세요.</Text>
          )}
          <SourceNote>{`${row.metric || ''} · ${labelOf(op, row.op)} ${row.threshold} · 심각도 ${labelOf(sev, row.severity)} — 테스트 발송도 알림 발송 로그에 기록됩니다.`}</SourceNote>
        </View>
      ),
      footer: (close) => <Button label="닫기" variant="primary" onPress={close} />,
    });
  };

  const confirmDelete = (row) =>
    openConfirmModal({
      title: '발송 조건 삭제',
      message: `'${row.name}' 발송 조건을 삭제합니다. 삭제된 조건은 복구할 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeCond(row.condId),
    });

  if (loading) return <Loading />;

  return (
    <View>
      <PageHead
        title="이상 알림 발송 조건 관리"
        desc="임계값을 넘거나 패턴이 이상할 때 어떤 알림을 보낼지 정의합니다. 수신자와 연락처는 알림 수신자 관리에서 따로 관리하며, 여기서는 수신 그룹 이름만 참조합니다."
        actions={
          <>
            <Button label="엑셀 다운로드" size="sm" icon="download" onPress={exportExcel} />
            <Button label="알림 수신자 관리" size="sm" icon="users" onPress={() => goToScreen('sys-recip')} />
            <Button label="조건 등록" size="sm" variant="primary" icon="plus" onPress={() => openCondForm(null)} />
          </>
        }
      />

      <Grid cols={4}>
        <StatCard label="등록 조건" value={summary?.total ?? 0} unit="건" sub={`활성 ${summary?.enabled ?? 0} · 중지 ${summary?.disabled ?? 0}`} />
        {/* 서버 요약에 심각도별 건수(severityRisk)가 없어 오늘 발송 건수를 보입니다 (API 요청 사항) */}
        <StatCard label="오늘 발송" value={summary?.todaySent ?? 0} unit="건" sub={`중복 억제 ${summary?.dedupCnt ?? 0}건`} tone={summary?.todaySent ? 'down' : ''} />
        <StatCard label="수신 그룹" value={summary?.groupCnt ?? 0} unit="개" sub="알림 수신자 관리에서 편성" />
        <StatCard label="중지 조건" value={summary?.disabled ?? 0} unit="건" sub="임시 중지 상태" tone={summary?.disabled ? 'down' : ''} />
      </Grid>
      <Gap />

      <Hint>
        발송 조건은 &apos;언제 · 무엇을 기준으로&apos; 보낼지를 정합니다. &apos;누구에게 · 어떤 연락처로&apos; 보낼지는 알림 수신자 관리(SY-05)에서 관리하며, 여기서는 수신 그룹 이름만 참조합니다.
      </Hint>

      <Filters>
        <SelectField label="심각도" value={filters.severity} options={withAll(sev)} onChange={setSeverity} />
        <SelectField label="상태" value={filters.enabled} options={['전체', '활성', '중지']} onChange={setEnabled} />
        <TextField label="검색" value={filters.keyword} onChangeText={setKeyword} placeholder="조건명 · 지표" />
        <Button label="조회" variant="primary" onPress={reload} />
      </Filters>

      <Card title="발송 조건" sub={`${itemsMeta?.total ?? items.length}건`} tight>
        <Table
          minWidth={1400}
          keyExtractor={(r) => r.condId}
          emptyText="등록된 발송 조건이 없습니다. '조건 등록' 으로 첫 조건을 만드세요."

          columns={[
            { key: 'name', title: '조건명', width: 170 },
            { key: 'metric', title: '감지 지표', width: 190 },
            { key: 'threshold', title: '비교 · 임계값', width: 150, render: (r) => <Text style={s.td}>{`${labelOf(op, r.op)} ${r.threshold}`}</Text> },
            { key: 'duration', title: '지속 조건', width: 130, render: (r) => <Text style={s.td}>{labelOf(dur, r.duration)}</Text> },
            { key: 'target', title: '대상 범위', width: 160, render: (r) => <Text style={s.td}>{labelOf(target, r.target)}</Text> },
            { key: 'severity', title: '심각도', width: 84, render: (r) => <Badge tone={r.severity === 'CRIT' ? 'red' : r.severity === 'WARN' ? 'amber' : ''}>{labelOf(sev, r.severity)}</Badge> },
            { key: 'channels', title: '발송 채널', width: 150, render: (r) => <Text style={s.td}>{(r.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—'}</Text> },
            { key: 'groups', title: '수신 그룹', width: 200, render: (r) => <Text style={s.td}>{(r.groups || []).map(groupNmOf).join(' · ') || '—'}</Text> },
            { key: 'validWindow', title: '유효 시간대', width: 120, render: (r) => <Text style={s.td}>{labelOf(win, r.validWindow)}</Text> },
            { key: 'dedupMin', title: '중복 억제', width: 90, render: (r) => <Text style={s.td}>{labelOf(dedup, r.dedupMin)}</Text> },
            { key: 'on', title: '상태', width: 80, render: (r) => <Badge tone={r.on ? 'green' : ''}>{r.on ? '활성' : '중지'}</Badge> },
            {
              key: 'action',
              title: '관리',
              width: 250,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  <Button label="편집" size="sm" onPress={() => openCondForm(r)} />
                  <Button label={r.on ? '중지' : '활성'} size="sm" onPress={() => toggleCond(r.condId)} />
                  <Button label="테스트" size="sm" onPress={() => testSend(r)} />
                  <Button label="삭제" size="sm" variant="danger" onPress={() => confirmDelete(r)} />
                </View>
              ),
            },
          ]}
          rows={items}
        />
        <Pagination meta={itemsMeta} {...(paging?.bind || {})} />
      </Card>
    </View>
  );
}
