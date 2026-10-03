/**
 * [View] SY-04 이상 알림 발송 조건 관리 (경로: /system/alert-condition · 화면 ID alert-cond)
 *
 * '언제 · 무엇을 기준으로' 보낼지를 정의합니다.
 * 사용 API 8건 — /api/v1/alert-conditions/* (목록·요약·상세·등록·수정·활성/중지·테스트·삭제)
 *
 * 쓰기 권한이 없으면 등록·편집·중지/활성·테스트 버튼을 숨기지 않고 비활성으로 두고 이유를 툴팁으로 보입니다(R-06).
 * 삭제는 통합관리자만 할 수 있습니다(R-13).
 */
import React, { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Grid, { Gap } from '@shared/components/layout/Grid';
import PageHead from '@shared/components/layout/PageHead';
import {
  Badge, Button, Card, ExportMenuButton, FormAlert, Hint, Loading, StatCard, Table,
  openConfirmModal,
} from '@shared/components/ui';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useUiStore } from '@shared/stores/useUiStore';
import { labelOf } from '@domains/common/model/codeRepository';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { evalBadge, groupNameOf, receivingOf, relativeTime, targetLabel, windowLabel } from '../controller/useAlertCondController';
import AlertGuardButton, { DELETE_SUPER_ONLY_TIP, WRITE_DENIED_TIP } from './AlertGuardButton';
import { openAlertCondForm } from './AlertCondForm';
import AlertTestResult, { normalizeTestResult } from './AlertTestResult';

// 선택지·표시명은 서버 공통코드에서 받습니다 (ALM_SEVERITY · ALM_CHANNEL · ALM_OP · ALM_TARGET · ALM_WINDOW · ALM_DEDUP · ALM_DURATION)

/** 요약 카드 높이 맞춤 · 엔진 카드 값(날짜·시각·상태)은 작은 글자로 */
const STAT_FILL = { flex: 1 };
const ENGINE_VALUE = { fontSize: 16, lineHeight: 22, letterSpacing: 0 };

export default function AlertCondView({
  firstLoad, loading, items, summary, codes, groups, groupOptions, metricOptions, metrics, loadError, listError,
  reload,
  canWrite, canDelete, canAlertList, canRecipient, exportView, exportAll, exportTotal,
  loadCondDetail, searchEquipments, submitCond, toggleCond, testCond, removeCond, itemsMeta,
}) {
  const sev = codes?.ALM_SEVERITY || [];
  const chan = codes?.ALM_CHANNEL || [];
  const op = codes?.ALM_OP || [];
  const win = codes?.ALM_WINDOW || [];
  const dedup = codes?.ALM_DEDUP || [];
  const dur = codes?.ALM_DURATION || [];

  const s = useCommonStyles();
  const theme = useTheme();
  const toast = useUiStore((state) => state.toast);
  const openModal = useUiStore((state) => state.openModal);
  const { goToScreen } = useAppNavigation();
  const tableRef = useRef(null);

  const writeTip = canWrite ? '' : WRITE_DENIED_TIP;

  /** 폼을 엽니다 — 편집은 상세를 먼저 받아 채웁니다(ALC-04) */
  const openCondForm = async (row) => {
    let detail = null;
    if (row) {
      const res = await loadCondDetail(row.condId);
      if (!res.ok) {
        toast(res.message);
        return;
      }
      detail = res.data;
    }
    openAlertCondForm({
      detail,
      codes,
      groups,
      groupOptions,
      metricOptions,
      metrics,
      loadError,
      searchEquipments,
      onSubmit: async (body) => {
        const res = await submitCond(row?.condId, body);
        // 편집 중 조건이 지워졌으면(404) 폼을 닫고 목록을 다시 봅니다
        return res.ok || res.code === 'E-NOTFOUND';
      },
    });
  };

  /** 활성/중지 — 중지는 한 번 묻고, 활성은 바로 실행합니다(ALC-01) */
  const onToggle = (row) => {
    if (!row.on) {
      toggleCond(row.condId, true);
      return;
    }
    openConfirmModal({
      title: '발송 조건 중지',
      message: `'${row.name}' 조건은 판정 대상에서 빠집니다. 이미 난 알림은 남습니다.`,
      confirmLabel: '중지',
      danger: true,
      onConfirm: () => toggleCond(row.condId, false),
    });
  };

  /** 테스트 발송 결과 (ALC-03) — 대기열 건수 · 수신 예정 · 제외 사유 */
  const testSend = async (row) => {
    const res = await testCond(row.condId);
    if (!res.ok) return;
    const result = normalizeTestResult(res.data || {});
    const chans = (result.channels.length ? result.channels : row.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—';
    openModal({
      title: '발송 조건 테스트 결과',
      sub: `${row.name} · ${chans}`,
      render: () => <AlertTestResult result={result} channelLabel={(c) => labelOf(chan, c)} />,
      footer: (close) => (
        <>
          {/* 테스트 알림은 알림 목록 기본 조회에서 빠지므로 alertId 와 includeTest 를 함께 넘깁니다 */}
          {canAlertList ? <Button label="알림 목록에서 보기" onPress={() => { close(); goToScreen('alert-list', res.data?.alertId ? { alertId: String(res.data.alertId), includeTest: 'true' } : {}); }} /> : null}
          <Button label="닫기" variant="primary" onPress={close} />
        </>
      ),
    });
  };

  const confirmDelete = (row) =>
    openConfirmModal({
      title: '발송 조건 삭제',
      message: `'${row.name}' 발송 조건을 삭제합니다. 연결된 채널·수신 그룹·승격 설정·판정 상태가 함께 지워지며 복구할 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => removeCond(row.condId),
    });

  /**
   * 표 행 — 그리는 글자와 같은 값을 머리글 필터용으로 붙입니다(2026-10-02).
   * 칸은 render 로 그려 Tabulator 가 글자를 모르므로, 같은 함수로 만든 글자를 filterField 로 씁니다.
   */
  const rows = useMemo(() => items.map((r) => ({
    ...r,
    stateLabel: r.on ? '활성' : '중지',
    metricLabel: `${r.metric ?? r.metricNm ?? ''}${r.unitNm ? ` (${r.unitNm})` : ''}`,
    thresholdLabel: r.blindFieldKey && r.threshold == null && r.thresholdVal == null ? '●●●● 비공개' : `${labelOf(op, r.op)} ${r.threshold ?? r.thresholdVal ?? ''}${r.unitNm ? ` ${r.unitNm}` : ''}`,
    durationLabel: labelOf(dur, r.duration) || '—',
    targetText: targetLabel(r, codes?.ALM_TARGET),
    severityLabel: labelOf(sev, r.severity) || '—',
    channelsLabel: (r.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—',
    groupsLabel: (r.groups || []).map(groupNameOf).join(' · ') || '—',
    windowText: windowLabel(r, win) || '—',
    dedupLabel: labelOf(dedup, r.dedupMin) || '—',
    evalLabel: evalBadge(r).label || '—',
  })), [items, op, dur, sev, chan, win, dedup, codes]);

  /** 지금 표에 보이는 행·열 순서 — 「조회 목록」 엑셀이 그리드와 같게 (관리 열 제외) */
  const gridState = () => {
    const t = tableRef.current;
    if (!t) return { rows: items };
    try {
      const titleOf = Object.fromEntries(t.getColumns().map((c) => [c.getField(), c.getDefinition().title]));
      return {
        rows: t.getData('active'),
        order: t.getColumns().map((c) => c.getField()).filter((f) => f && f !== 'action'),
        // 엑셀 조건 요약에 쓰는 머리글 필터(2026-10-02 위쪽 조회 조건 대신)
        filters: (t.getHeaderFilters?.() || []).map((f) => ({ field: f.field, title: titleOf[f.field], value: f.value })),
      };
    } catch (e) {
      return { rows: items };
    }
  };

  if (firstLoad) return <Loading />;

  const eng = summary.engine;
  const engineTone = eng.judge === 'STOPPED' ? 'down' : eng.judge === 'DELAY' ? 'down' : '';
  // 엔진 마지막 실행 — 「yyyy-MM-dd HH:mm:ss (상태)」(2026-10-02)
  const lastRunAt = summary.engineRaw?.lastRunAt ? String(summary.engineRaw.lastRunAt).replace('T', ' ').slice(0, 19) : '';
  const engineValue = `${lastRunAt || '실행 기록 없음'} (${eng.label})`;

  return (
    <View>
      <PageHead
        title="이상 알림 발송 조건 관리"
        actions={
          // 머리말 설명과 「수신 그룹 n개 관리 →」 는 뺐습니다(2026-10-02)
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportMenuButton
              viewCount={items.length}
              totalCount={exportTotal}
              onExportView={() => exportView(gridState())}
              onExportAll={exportAll}
            />
            <AlertGuardButton
              testID="alert-cond-create"
              label="조건 등록"
              size="sm"
              variant="primary"
              icon="plus"
              deniedTip={writeTip || (loadError ? '선택지(감지 지표·수신 그룹)를 불러오지 못해 등록할 수 없습니다.' : '')}
              onPress={() => openCondForm(null)}
            />
          </View>
        }
      />

      {eng.judge === 'STOPPED' ? (
        <FormAlert tone="error">{`알림 엔진 마지막 실행이 ${eng.lagMin ?? '?'}분 전입니다. 조건을 저장해도 판정되지 않습니다.`}</FormAlert>
      ) : null}
      {!canWrite ? <Hint icon="lock">{`읽기 전용 — ${WRITE_DENIED_TIP} 목록·요약·엑셀은 그대로 볼 수 있습니다.`}</Hint> : null}
      {loadError ? <FormAlert tone="error">{`${loadError}. 조건을 등록할 수 없습니다.`}</FormAlert> : null}

      {/* 요약 카드 4종 (ALC-07) — 부제는 뺐고(2026-10-02) 높이를 맞춥니다 */}
      <Grid cols={4}>
        <StatCard label="등록 조건" value={summary.total} unit="건" style={STAT_FILL} />
        <StatCard label="오늘 발송" value={summary.todaySent} unit="건" tone={Number(summary.failed) > 0 ? 'down' : ''} style={STAT_FILL} />
        <StatCard
          label="판정 이상 조건"
          value={summary.evalKnown ? summary.breach + summary.stale : '—'}
          unit={summary.evalKnown ? '건' : ''}
          tone={summary.breach ? 'down' : ''}
          style={STAT_FILL}
        />
        {/* 마지막 실행 시각과 상태 — 「2026-10-03 05:39:12 (정상)」 */}
        <StatCard label="엔진 상태" value={engineValue} tone={engineTone} style={STAT_FILL} valueStyle={ENGINE_VALUE} />
      </Grid>
      <Gap />

      <Hint>
        {/* 문장마다 줄을 바꿉니다(2026-10-03) */}
        {'발송 조건은 언제 · 무엇을 기준으로 보낼지 정합니다.\n수신 그룹을 골라 연결합니다.\n멤버·연락처는 알림 수신자 관리에서 바꿉니다.'}
      </Hint>

      {/* 위쪽 조회 조건 줄은 뺐습니다(2026-10-02) — 표 머리글 필터로 거릅니다(목록형: 상태·지표·지속·심각도·시간대·중복·판정 / 글자: 조건명·임계값·대상·채널·그룹) */}

      <Card title="발송 조건" sub={`${itemsMeta?.total ?? items.length}건${loading ? ' · 불러오는 중' : ''}`} tight>
        {listError ? (
          <View style={{ padding: 16, gap: 8 }}>
            <FormAlert tone="error">{`발송 조건을 불러오지 못했습니다 — ${listError}`}</FormAlert>
            <Button label="다시 시도" size="sm" onPress={reload} />
          </View>
        ) : null}
        {!items.length && !groups.length && canRecipient ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Button label="수신 그룹 만들기" size="sm" onPress={() => goToScreen('sys-recip')} />
          </View>
        ) : null}
        <Table
          inset
          bordered
          minWidth={2380}
          instanceRef={tableRef}
          keyExtractor={(r) => r.condId}
          filterable
          pageSize={100}
          emptyText={items.length
            ? '머리글 필터에 맞는 조건이 없습니다.'
            : "등록된 발송 조건이 없습니다. 먼저 알림 수신자 관리에서 수신 그룹을 만든 뒤 '조건 등록' 으로 첫 조건을 만드세요."}
          columns={[
            { key: 'on', title: '상태', width: 100, filter: 'list', filterField: 'stateLabel', filterOptions: ['활성', '중지'], render: (r) => <Badge tone={r.on ? 'green' : ''}>{r.on ? '활성' : '중지'}</Badge> },
            { key: 'name', title: '조건명', width: 170 },
            { key: 'metric', title: '감지 지표', width: 190, filter: 'list', filterField: 'metricLabel', render: (r) => <Text style={s.td}>{`${r.metric ?? r.metricNm ?? ''}${r.unitNm ? ` (${r.unitNm})` : ''}`}</Text> },
            {
              key: 'threshold', title: '비교 · 임계값', width: 150, filterable: true, filterField: 'thresholdLabel',
              render: (r) => <Text style={s.td}>{r.blindFieldKey && r.threshold == null && r.thresholdVal == null ? '●●●● 비공개' : `${labelOf(op, r.op)} ${r.threshold ?? r.thresholdVal ?? ''}${r.unitNm ? ` ${r.unitNm}` : ''}`}</Text>,
            },
            { key: 'duration', title: '지속 조건', width: 130, filter: 'list', filterField: 'durationLabel', render: (r) => <Text style={s.td}>{labelOf(dur, r.duration)}</Text> },
            { key: 'target', title: '대상 범위', width: 160, filterable: true, filterField: 'targetText', render: (r) => <Text style={s.td}>{targetLabel(r, codes?.ALM_TARGET)}</Text> },
            { key: 'severity', title: '심각도', width: 110, filter: 'list', filterField: 'severityLabel', filterOptions: ['위험', '주의', '낮음'], render: (r) => <Badge tone={r.severity === 'CRIT' ? 'red' : r.severity === 'WARN' ? 'amber' : ''}>{labelOf(sev, r.severity)}</Badge> },
            { key: 'channels', title: '발송 채널', width: 150, filterable: true, filterField: 'channelsLabel', render: (r) => <Text style={s.td}>{(r.channels || []).map((c) => labelOf(chan, c)).join(' · ') || '—'}</Text> },
            {
              key: 'groups', title: '수신 그룹', width: 200, filterable: true, filterField: 'groupsLabel',
              // 사용 중지 그룹은 회색·취소선
              render: (r) => (
                <Text style={s.td}>
                  {(r.groups || []).length ? (r.groups || []).map((g, i) => (
                    <Text key={i} style={g && typeof g === 'object' && g.useFlg === 'N' ? { textDecorationLine: 'line-through', opacity: 0.5 } : null}>
                      {`${i ? ' · ' : ''}${groupNameOf(g)}`}
                    </Text>
                  )) : '—'}
                </Text>
              ),
            },
            {
              key: 'receivingCnt', title: '수신 인원', width: 100, filterable: false,
              render: (r) => {
                const n = receivingOf(r);
                return <Text style={[s.td, n === 0 ? { color: theme.color.destructive, fontWeight: '700' } : null]}>{n === null ? '—' : `${n}명`}</Text>;
              },
            },
            { key: 'validWindow', title: '유효 시간대', width: 120, filter: 'list', filterField: 'windowText', render: (r) => <Text style={s.td}>{windowLabel(r, win)}</Text> },
            { key: 'dedupMin', title: '중복 억제', width: 110, filter: 'list', filterField: 'dedupLabel', render: (r) => <Text style={s.td}>{labelOf(dedup, r.dedupMin)}</Text> },
            { key: 'evalState', title: '판정', width: 130, sortable: false, filter: 'list', filterField: 'evalLabel', render: (r) => { const b = evalBadge(r); return b.label === '—' ? <Text style={s.td}>—</Text> : <Badge tone={b.tone}>{b.label}</Badge>; } },
            {
              key: 'lastEvalAt', title: '마지막 평가', width: 120, sortable: false, filterable: false,
              render: (r) => <Text style={s.td}>{relativeTime(r.evalState?.lastEvalAt) || '—'}</Text>,
            },
            {
              key: 'alert7dCnt', title: '최근 7일', width: 90, align: 'right', filterable: false,
              render: (r) => (r.alert7dCnt === undefined || r.alert7dCnt === null
                ? <Text style={[s.td, { textAlign: 'right' }]}>—</Text>
                : canAlertList && r.alert7dCnt > 0
                  ? <Button label={`${r.alert7dCnt}건`} size="sm" variant="ghost" onPress={() => goToScreen('alert-list', { condId: String(r.condId) })} />
                  : <Text style={[s.td, { textAlign: 'right' }]}>{`${r.alert7dCnt}건`}</Text>),
            },
            {
              key: 'action',
              title: '관리',
              filterable: false,
              width: 260,
              sortable: false,
              render: (r) => (
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  <AlertGuardButton label="편집" size="sm" deniedTip={writeTip} onPress={() => openCondForm(r)} />
                  <AlertGuardButton label={r.on ? '중지' : '활성'} size="sm" deniedTip={writeTip} onPress={() => onToggle(r)} />
                  <AlertGuardButton label="테스트" size="sm" deniedTip={writeTip} onPress={() => testSend(r)} />
                  <AlertGuardButton
                    label="삭제"
                    size="sm"
                    variant="danger"
                    deniedTip={canDelete ? (r.deletable === false ? `운영 알림${r.alertCnt ? ` ${r.alertCnt}건` : ''}이 있어 삭제할 수 없습니다 — 중지를 사용하십시오` : '') : DELETE_SUPER_ONLY_TIP}
                    onPress={() => confirmDelete(r)}
                  />
                </View>
              ),
            },
          ]}
          rows={rows}
        />
      </Card>
    </View>
  );
}
