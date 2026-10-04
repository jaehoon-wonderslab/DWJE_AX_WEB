/**
 * [View] SY-04 발송 조건 등록·편집 폼
 *
 * 편집은 목록 행이 아니라 **상세 응답**(GET /alert-conditions/{condId})으로 채웁니다(기획 05 ALC-04).
 * 수정 저장은 바뀐 키만 보냅니다 — 서버는 보내지 않은 키를 그대로 둡니다.
 *
 *  · 발송 채널·수신 그룹은 여러 개를 고르고, 아래 「도달 미리보기」 가 받을 사람 수를 보여 줍니다(ALC-06).
 *    아무도 받지 못하는 조건은 저장 전에 한 번 더 묻습니다.
 *  · 감지 지표를 고르면 단위·지표 기준값이 보이고 「주의값 넣기」·「위험값 넣기」 로 임계값을 채웁니다(ALC-10).
 *  · 대상 범위는 엔진이 해석하는 「전체 설비」·「개별 설비 선택」 만 고를 수 있습니다(ALC-05).
 *  · 고급 설정(평가 단위·지정 시각·시간대 무시·자동 해제·평가 주기·메시지 틀·승격 적용)은 2026-10-03 에 엔진·API·DB 와 함께 없앴습니다.
 *    유효 시간대 「지정 시각 1회(ONCE)」 도 고를 수 없습니다. 일 마감 · 일 1회 지속 조건은 08:00 기준입니다.
 *
 * openFormModal 의 `custom` 칸은 칸 아래 오류가 그려지지 않아, 그 칸의 검증 오류는 토스트로도 알립니다.
 */
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Button, Field, FormAlert, TextField, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import {
  ENGINE_TARGETS, RETIRED_WINDOWS, liveChannelsOf, condBody, condInitial, reachOf, validateCond,
} from '../model/alertFormModel';
import { askConfirm } from './AlertAsk';

/** custom 칸 — 오류가 칸 아래 그려지지 않아 토스트로도 알리는 키 */
const CUSTOM_KEYS = ['thresholdVal', 'pickTargets'];

/** 개별 설비 검색·선택 (type:'custom') */
function EquipmentPicker({ value = [], onChange, search }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [keyword, setKeyword] = useState('');
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true);
    setErr('');
    try {
      setFound(await search(keyword.trim()));
    } catch (e) {
      setErr(e?.message || '설비 목록을 불러오지 못했습니다.');
      setFound([]);
    } finally {
      setBusy(false);
    }
  };
  const add = (cd) => { if (cd && !value.includes(cd)) onChange([...value, cd]); };
  const remove = (cd) => onChange(value.filter((x) => x !== cd));

  return (
    <Field label="개별 설비" required full>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          value={keyword}
          onChangeText={setKeyword}
          placeholder="설비 코드·이름 (예: PR-01)"
          accessibilityLabel="설비 검색"
          onSubmitEditing={run}
          style={{ flexGrow: 1, flexBasis: 200, marginBottom: 0 }}
        />
        <Button label={busy ? '검색 중…' : '설비 검색'} size="sm" onPress={run} disabled={busy} />
      </View>
      {err ? <FormAlert tone="error">{err}</FormAlert> : null}
      {found ? (
        <View style={{ maxHeight: 180, borderWidth: 1, borderColor: theme.hairlineStrong, borderRadius: 8, marginTop: 6, overflow: 'scroll' }}>
          {found.length ? found.map((e) => {
            const cd = e.eqptCd ?? e.code;
            const on = value.includes(cd);
            return (
              <TouchableOpacity key={cd} onPress={() => add(cd)} disabled={on} accessibilityLabel={`${cd} 추가`} style={{ paddingVertical: 6, paddingHorizontal: 10, opacity: on ? 0.45 : 1 }}>
                <Text style={s.textSm}>{`${cd}${e.eqptNm ? ` · ${e.eqptNm}` : ''}${on ? ' (선택됨)' : ''}`}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={[s.textSm, { padding: 10 }]}>검색 결과가 없습니다.</Text>}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {value.length ? value.map((cd) => (
          <TouchableOpacity key={cd} onPress={() => remove(cd)} accessibilityLabel={`${cd} 빼기`} style={[s.chip, { flexDirection: 'row', gap: 4 }]}>
            <Text style={s.chipText}>{`${cd} ×`}</Text>
          </TouchableOpacity>
        )) : <Text style={[s.textSm, { color: theme.color.mutedForeground }]}>고른 설비가 없습니다.</Text>}
      </View>
    </Field>
  );
}

/** 임계값 + 지표 기준값 (ALC-10) — 「주의값 넣기」·「위험값 넣기」 */
function ThresholdField({ value, onChange, metric }) {
  const s = useCommonStyles();
  const unit = metric?.unitNm || metric?.unit || '';
  const has = (v) => v !== null && v !== undefined && v !== '';
  return (
    <Field label="임계값" required full>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChange}
          placeholder="예) 3.0"
          keyboardType="numeric"
          accessibilityLabel="임계값"
          style={{ flexBasis: 160, flexGrow: 0, marginBottom: 0 }}
        />
        {unit ? <Text style={s.textSm}>{unit}</Text> : null}
        {metric && has(metric.warn) ? <Button label="주의값 넣기" size="sm" onPress={() => onChange(String(metric.warn))} /> : null}
        {metric && has(metric.critical) ? <Button label="위험값 넣기" size="sm" onPress={() => onChange(String(metric.critical))} /> : null}
      </View>
      {metric && (has(metric.normal) || has(metric.warn) || has(metric.critical)) ? (
        <Text style={[s.textSm, { marginTop: 6 }]}>
          {`지표 기준  정상 ${metric.normal ?? '—'} · 주의 ${metric.warn ?? '—'} · 위험 ${metric.critical ?? '—'}${unit ? ` (${unit})` : ''}`}
        </Text>
      ) : null}
      {metric && metric.collecting === false ? (
        <FormAlert tone="error">이 지표는 수집 정의가 없어 판정되지 않습니다. 저장은 할 수 있습니다.</FormAlert>
      ) : null}
    </Field>
  );
}

/** 도달 미리보기 (ALC-06) — 선택한 그룹별 수신 인원과 채널 일치 */
function ReachPreview({ values, groups, channelLabel }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const r = reachOf(values.groupIds, values.channels, groups);
  if (!r.byGroup.length) return null;
  return (
    <View testID="alert-reach-preview" style={{ borderWidth: 1, borderColor: r.total ? theme.hairlineStrong : theme.color.destructive, borderRadius: 8, padding: 10, gap: 4 }}>
      <Text style={[s.textSm, { fontWeight: '700' }]}>도달 미리보기</Text>
      {r.byGroup.map((g) => (
        <Text key={String(g.groupId)} style={s.textSm}>
          {`${g.name}${g.useFlg === 'N' ? ' (사용 중지)' : ''}  수신 ${g.receivingCnt}/${g.memberCnt}명 · ${g.channelMatch.length ? g.channelMatch.map(channelLabel).join(' · ') : '조건 채널을 받지 않음'}`}
        </Text>
      ))}
      <Text style={[s.textSm, { fontWeight: '700', color: r.total ? theme.color.foreground : theme.color.destructive }]}>
        {r.total ? `합계 ${r.total}명${r.deduped ? ' (중복 제외)' : ''}` : '이 조건으로는 아무도 받지 못합니다'}
      </Text>
    </View>
  );
}


/**
 * 발송 조건 폼을 엽니다.
 *
 * @param {object} cfg
 * @param {object|null} cfg.detail 상세 응답 (없으면 등록)
 * @param {object} cfg.codes 공통코드 묶음 (ALM_*)
 * @param {Array} cfg.groups 수신 그룹 목록 (도달 미리보기)
 * @param {Array} cfg.groupOptions 수신 그룹 선택지 [{value,label}]
 * @param {Array} cfg.metricOptions 감지 지표 선택지 [{value,label}]
 * @param {Array} cfg.metrics 감지 지표 원본 (기준값·단위)
 * @param {string} [cfg.loadError] 선택지 조회 실패 안내 (ALC-02)
 * @param {Function} cfg.searchEquipments 설비 검색
 * @param {Function} cfg.onSubmit (body) => Promise<boolean> 성공 여부
 */
export function openAlertCondForm({
  detail, codes = {}, groups = [], groupOptions = [], metricOptions = [], metrics = [], loadError, searchEquipments, onSubmit,
}) {
  const initial = condInitial(detail);
  const sev = codes.ALM_SEVERITY || [];
  const chan = codes.ALM_CHANNEL || [];
  const targetCodes = codes.ALM_TARGET || [];
  const label = (list, cd) => (list || []).find((x) => x.value === cd)?.label ?? cd;
  const channelLabel = (cd) => label(chan, cd);
  const metricOf = (id) => metrics.find((m) => String(m.stdId) === String(id));

  // 대상 범위 — 엔진이 해석하는 것만 고를 수 있습니다. 이미 다른 값으로 저장된 조건은 그 값을 보이되 표시를 붙입니다
  const targetOptions = targetCodes.filter((t) => ENGINE_TARGETS.includes(t.value));
  ENGINE_TARGETS.forEach((cd) => {
    if (!targetOptions.some((t) => t.value === cd)) targetOptions.push({ value: cd, label: cd === 'PICK' ? '개별 설비 선택' : '전체 설비' });
  });
  if (initial.targetScope && !ENGINE_TARGETS.includes(initial.targetScope)) {
    targetOptions.push({ value: initial.targetScope, label: `${label(targetCodes, initial.targetScope)} (엔진 미지원)` });
  }
  const unsupported = targetCodes.filter((t) => !ENGINE_TARGETS.includes(t.value)).map((t) => t.label);

  // 발송 채널 — 연동 전 채널은 고를 수 없지만, 이미 저장된 값이면 보이고 그대로 남습니다
  const live = liveChannelsOf(chan);
  const channelOptions = chan.filter((c) => live.includes(c.value));
  live.forEach((cd) => {
    if (!channelOptions.some((c) => c.value === cd)) channelOptions.push({ value: cd, label: cd === 'MAIL' ? '메일' : '시스템 팝업' });
  });
  (initial.channels || []).forEach((cd) => {
    if (!channelOptions.some((c) => c.value === cd)) channelOptions.push({ value: cd, label: `${label(chan, cd)} (연동 전)` });
  });
  const offline = chan.filter((c) => !live.includes(c.value)).map((c) => c.label);

  // 수신 그룹 — 선택지에 없는 저장값(사용 중지 그룹 등)도 지우지 않고 보입니다
  const gOptions = [...groupOptions];
  (detail?.groups || []).forEach((g) => {
    if (g && typeof g === 'object' && !gOptions.some((o) => String(o.value) === String(g.groupId))) {
      gOptions.push({ value: g.groupId, label: `${g.name}${g.useFlg === 'N' ? ' (사용 중지)' : ''}` });
    }
  });
  initial.groupIds.forEach((id) => {
    if (!gOptions.some((o) => String(o.value) === String(id))) gOptions.push({ value: id, label: `그룹 ${id}` });
  });
  const reachGroups = [...groups];
  (detail?.groups || []).forEach((g) => { if (g && typeof g === 'object' && !reachGroups.some((x) => String(x.groupId) === String(g.groupId))) reachGroups.push(g); });

  // 유효 시간대 — 지정 시각 1회(ONCE)는 더 이상 고를 수 없습니다(이미 저장된 값이면 표시를 붙여 남깁니다)
  const windowOptions = (codes.ALM_WINDOW || []).filter((w) => !RETIRED_WINDOWS.includes(w.value));
  if (RETIRED_WINDOWS.includes(initial.validWindow)) windowOptions.push({ value: initial.validWindow, label: `${label(codes.ALM_WINDOW, initial.validWindow)} (사용 안 함 — 다른 시간대를 고르십시오)` });

  return openFormModal({
    title: detail ? '발송 조건 편집' : '발송 조건 등록',
    sub: '언제 · 무엇을 기준으로 보낼지 정합니다. 받는 사람은 수신 그룹으로 연결합니다',
    wide: true,
    initial,
    validate: (v) => {
      const e = validateCond(v);
      const first = CUSTOM_KEYS.find((k) => e[k]);
      if (first) useUiStore.getState().toast(e[first]);
      return e;
    },
    fields: [
      ...(loadError ? [{ key: 'loadErrorNote', type: 'custom', full: true, render: () => <FormAlert tone="error">{loadError}</FormAlert> }] : []),
      { key: 'name', label: '조건명', required: true, placeholder: '예) 불량률 임계 초과' },
      { key: 'metricStdId', label: '감지 지표', type: 'select', options: metricOptions, required: true, full: true },
      { key: 'op', label: '비교', type: 'select', options: codes.ALM_OP || [] },
      { key: 'duration', label: '지속 조건', type: 'select', options: codes.ALM_DURATION || [] },
      { key: 'thresholdVal', type: 'custom', full: true, render: ({ value, onChange, values }) => <ThresholdField value={value} onChange={onChange} metric={metricOf(values.metricStdId)} /> },
      { key: 'targetScope', label: '대상 범위', type: 'select', options: targetOptions },
      {
        key: 'pickTargets',
        type: 'custom',
        full: true,
        render: ({ value, onChange, values }) => (values.targetScope === 'PICK'
          ? <EquipmentPicker value={value || []} onChange={onChange} search={searchEquipments} />
          : (unsupported.length
            ? <Text style={{ fontSize: 13.5, opacity: 0.7 }}>{`${unsupported.join(' · ')} 은(는) 엔진 미지원이라 고를 수 없습니다.`}</Text>
            : null)),
      },
      { key: 'target', label: '대상 설명', placeholder: '비우면 대상 범위 이름(예: 전체 설비)으로 저장됩니다' },
      { key: 'severity', label: '심각도', type: 'select', options: sev },
      { key: 'channels', label: '발송 채널', type: 'check', options: channelOptions, required: true, full: true },
      { key: 'groupIds', label: '수신 그룹', type: 'check', options: gOptions, required: true, full: true },
      { key: 'validWindow', label: '유효 시간대', type: 'select', options: windowOptions },
      { key: 'dedupMin', label: '중복 억제', type: 'select', options: codes.ALM_DEDUP || [] },
      { key: 'reachNote', type: 'custom', full: true, render: ({ values }) => <ReachPreview values={values} groups={reachGroups} channelLabel={channelLabel} /> },
    ],
    note: `판정은 이 조건의 임계값으로 합니다. 지표 기준값은 참고용입니다. 수신 그룹을 골라 연결하며, 멤버·연락처는 알림 수신자 관리에서 바꿉니다.${offline.length ? ` ${offline.join(' · ')} 채널은 연동 전이라 고를 수 없습니다.` : ''}`,
    submitLabel: detail ? '수정' : '등록',
    onSubmit: async (v) => {
      // 아무도 받지 못하는 조건 — 저장은 막지 않고 한 번 더 묻습니다 (ALC-06)
      const reach = reachOf(v.groupIds, v.channels, reachGroups);
      if (reach.byGroup.length && !reach.total) {
        const yes = await askConfirm({ title: '받는 사람 없음', message: '이 조건으로는 아무도 받지 못합니다. 그래도 저장할까요?', confirmLabel: '저장', danger: true });
        if (!yes) return false;
      }
      return onSubmit(condBody(v, initial, detail));
    },
  });
}
