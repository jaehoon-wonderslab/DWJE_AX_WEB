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
import { Badge, Button, Card, Filters, Hint, Loading, Pagination, SelectField, SourceNote, StatCard, Table, TextField, openFormModal } from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';

// 선택지·표시명은 서버 공통코드에서 받습니다 (ALM_SEVERITY · ALM_CHANNEL · ALM_OP · ALM_TARGET · ALM_WINDOW · ALM_DEDUP · ALM_DURATION)

export default function AlertCondView({
  loading, items, summary, codes, groupOptions, metricOptions, filters, setSeverity, setEnabled, setKeyword, reload,
  exportExcel, submitCond, toggleCond, testCond, paging, itemsMeta,
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

  /** 발송 조건 등록·편집 */
  const openCondForm = (row) =>
    openFormModal({
      title: row ? '발송 조건 편집' : '발송 조건 등록',
      sub: '언제 · 무엇을 기준으로 보낼지 정의합니다 (수신자는 알림 수신자 관리에서 지정)',
      wide: true,
      initial: row
        ? { ...row, metricStdId: row.metricId, channels: (row.channels || [])[0], groupIds: (row.groupIds || [])[0] }
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

  /** 발송 조건 테스트 — 실제 발송 전 미리보기 */
  const testSend = async (row) => {
    const res = await testCond(row.condId);
    if (!res.ok) {
      toast(res.message);
      return;
    }
    const p = res.data.preview;
    openModal({
      title: '발송 조건 테스트',
      sub: `${row.name} · ${row.channels}`,
      render: () => (
        <View>
          <Text style={[s.textSm, { fontWeight: '700', marginBottom: 6 }]}>{p.title}</Text>
          <Text style={[s.textSm, { lineHeight: 21 }]}>{p.body}</Text>
          <SourceNote>{p.note}</SourceNote>
        </View>
      ),
      footer: (close) => (
        <>
          <Button label="닫기" onPress={close} />
          <Button label="테스트 발송" variant="primary" onPress={() => { close(); toast(res.message); }} />
        </>
      ),
    });
  };

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
        <StatCard label="위험 등급" value={summary?.severityRisk ?? 0} unit="건" sub="즉시 발송 대상" tone="down" />
        <StatCard label="수신 그룹" value={summary?.groupCnt ?? 0} unit="개" sub="알림 수신자 관리에서 편성" />
        <StatCard label="중지 조건" value={summary?.disabled ?? 0} unit="건" sub="임시 중지 상태" />
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

      <Card title="발송 조건" sub={`${items.length}건`} tight>
        <Table
          minWidth={1400}
          keyExtractor={(r) => r.condId}
          columns={[
            { key: 'name', title: '조건명', width: 170 },
            { key: 'metric', title: '감지 지표', width: 190 },
            { key: 'threshold', title: '비교 · 임계값', width: 150, render: (r) => <Text style={s.td}>{`${labelOf(op, r.op)} ${r.threshold}`}</Text> },
            { key: 'duration', title: '지속 조건', width: 130, render: (r) => <Text style={s.td}>{labelOf(dur, r.duration)}</Text> },
            { key: 'target', title: '대상 범위', width: 160, render: (r) => <Text style={s.td}>{labelOf(target, r.target)}</Text> },
            { key: 'severity', title: '심각도', width: 84, render: (r) => <Badge tone={r.severity === 'CRIT' ? 'red' : r.severity === 'WARN' ? 'amber' : ''}>{labelOf(sev, r.severity)}</Badge> },
            { key: 'channels', title: '발송 채널', width: 150, render: (r) => <Text style={s.td}>{(r.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—'}</Text> },
            { key: 'groups', title: '수신 그룹', width: 200, render: (r) => <Text style={s.td}>{(r.groups || []).join(' · ') || '—'}</Text> },
            { key: 'validWindow', title: '유효 시간대', width: 120, render: (r) => <Text style={s.td}>{labelOf(win, r.validWindow)}</Text> },
            { key: 'dedupMin', title: '중복 억제', width: 90, render: (r) => <Text style={s.td}>{labelOf(dedup, r.dedupMin)}</Text> },
            { key: 'on', title: '상태', width: 80, render: (r) => <Badge tone={r.on ? 'green' : ''}>{r.on ? '활성' : '중지'}</Badge> },
            {
              key: 'action',
              title: '관리',
              width: 200,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  <Button label="편집" size="sm" onPress={() => openCondForm(r)} />
                  <Button label={r.on ? '중지' : '활성'} size="sm" onPress={() => toggleCond(r.condId)} />
                  <Button label="테스트" size="sm" onPress={() => testSend(r)} />
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
