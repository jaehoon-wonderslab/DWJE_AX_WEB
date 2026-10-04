/**
 * [View] SY-05 알림 수신자 관리 — 수신 그룹·수신자 등록/편집 폼
 *
 *  · 그룹 편집은 **상세 응답**으로 채웁니다(기획 06 RCP-02). 대응 부서·기존 채널·멤버가 그대로 남습니다.
 *    발송 채널은 고르지 않습니다(메일 고정). 기존 그룹에 메일 외 채널이 있으면 안내만 하고 보존합니다.
 *  · 멤버를 모두 빼고 저장하면, 이 그룹을 쓰는 조건이 아무에게도 발송되지 않는다는 것을 한 번 묻습니다.
 *  · 수신자 등록은 계정을 검색해 고릅니다(RCP-06). 고르면 계정 메일로 메일 칸을 채우고 고칠 수 있습니다.
 *    미배정(부서 배정 전) 계정은 서버가 후보에서 뺍니다(결정 R-14).
 */
import React, { useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Button, Field, FormAlert, SelectField, TextField, openFormModal } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { askConfirm } from './AlertAsk';
import { groupBody, groupInitial, liveChannelsOf, memberEmpNo, validateGroup, validateRecipient } from '../model/alertFormModel';

export { askConfirm };

/** 사람 한 명의 표기 — worker 권한이 없으면 이름 대신 사번 */
const personLabel = (c, showWorker) => [showWorker && c.name ? c.name : c.empNo, c.dept].filter(Boolean).join(' · ');
const personTag = (c) => (c.userState && !['ACTIVE', 'LOCKED'].includes(c.userState) ? '계정 정지' : '');

/**
 * 그룹 멤버 선택기 (RCP-05, type:'custom') — 전 수신자에서 검색해 고르고, 고른 사람은 칩으로 보입니다.
 * 수신자 탭의 조회 조건과 무관합니다. 「부서 전체 추가」 로 한 부서를 한 번에 넣습니다.
 */
function MemberPicker({ value = [], onChange, candidates = [], showWorker }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const picked = new Set(value.map(String));
  const byEmp = new Map(candidates.map((c) => [String(c.empNo), c]));
  const query = q.trim().toLowerCase();
  const pool = candidates
    .filter((c) => !picked.has(String(c.empNo)))
    .filter((c) => !query || [c.empNo, showWorker ? c.name : '', c.dept].some((x) => String(x || '').toLowerCase().includes(query)));
  const depts = [...new Set(candidates.map((c) => c.dept).filter(Boolean))];
  const add = (emp) => onChange([...value, String(emp)]);
  const remove = (emp) => onChange(value.filter((x) => String(x) !== String(emp)));
  const addDept = () => {
    if (!dept) return;
    const more = candidates.filter((c) => c.dept === dept && !picked.has(String(c.empNo))).map((c) => String(c.empNo));
    onChange([...value, ...more]);
  };

  return (
    <Field label={`그룹 멤버 · 선택됨 ${value.length}명`} full>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 260, minWidth: 220, gap: 6 }}>
          <TextField value={q} onChangeText={setQ} placeholder={showWorker ? '검색: 이름 · 사번 · 부서' : '검색: 사번 · 부서'} accessibilityLabel="멤버 검색" style={{ marginBottom: 0 }} />
          <View style={{ maxHeight: 220, borderWidth: 1, borderColor: theme.hairlineStrong, borderRadius: 8, overflow: 'scroll' }}>
            {pool.length ? pool.slice(0, 300).map((c) => {
              const tag = personTag(c);
              return (
                <TouchableOpacity key={c.empNo} onPress={() => add(c.empNo)} accessibilityLabel={`${c.empNo} 추가`} style={{ paddingVertical: 6, paddingHorizontal: 10, opacity: tag ? 0.55 : 1 }}>
                  <Text style={s.textSm}>{`${personLabel(c, showWorker)}${tag ? `  [${tag}]` : ''}`}</Text>
                </TouchableOpacity>
              );
            }) : <Text style={[s.textSm, { padding: 10 }]}>{candidates.length ? '더 고를 수신자가 없습니다.' : '등록된 수신자가 없습니다. 수신자 탭에서 먼저 등록하세요.'}</Text>}
          </View>
          {depts.length ? (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <SelectField label="부서" value={dept} options={depts.map((d) => ({ value: d, label: d }))} onChange={setDept} nativeSelect />
              <Button label="부서 전체 추가" size="sm" onPress={addDept} disabled={!dept} />
            </View>
          ) : null}
        </View>
        <View style={{ flexGrow: 1, flexBasis: 220, minWidth: 200, gap: 6 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {value.length ? value.map((emp) => {
              const c = byEmp.get(String(emp)) || { empNo: emp };
              return (
                <TouchableOpacity key={emp} onPress={() => remove(emp)} accessibilityLabel={`${emp} 빼기`} style={s.chip}>
                  <Text style={s.chipText}>{`${personLabel(c, showWorker)} ×`}</Text>
                </TouchableOpacity>
              );
            }) : <Text style={[s.textSm, { color: theme.color.mutedForeground }]}>고른 멤버가 없습니다.</Text>}
          </View>
          {value.length ? <Button label="모두 빼기" size="sm" variant="ghost" onPress={() => onChange([])} /> : null}
        </View>
      </View>
    </Field>
  );
}

/**
 * 수신 그룹 폼
 *
 * @param {object} cfg
 * @param {object|null} cfg.detail 그룹 상세 (없으면 등록)
 * @param {Array} cfg.windowOptions 유효 시간대 선택지
 * @param {Array} cfg.deptOptions 대응 부서 선택지 [{value,label}]
 * @param {Array} cfg.candidates 멤버 후보 [{empNo,name,dept,state,userState}] (전 수신자)
 * @param {boolean} cfg.showWorker 이름을 보여도 되는지 (worker 권한)
 * @param {string} cfg.mailLabel 「메일」 표기
 * @param {(cd:string)=>string} cfg.channelLabel 채널 표기
 * @param {Function} cfg.onSubmit (body) => Promise<boolean>
 */
export function openGroupForm({ detail, windowOptions = [], deptOptions = [], candidates = [], showWorker = true, channelCodes = [], onSubmit }) {
  const initial = groupInitial(detail, { validWindow: windowOptions[0]?.value });
  // 발송 채널(2026-10-04) — 엔진이 실제로 보내는 채널(ALM_CHANNEL.attr1, V76)만 고릅니다.
  // 연동 전 채널은 이미 저장돼 있을 때만 「(연동 전)」 으로 보이고, 빼면 다시 고를 수 없습니다
  const live = liveChannelsOf(channelCodes);
  const channelOptions = channelCodes.filter((c) => live.includes(c.value)).map((c) => ({ value: c.value, label: c.label }));
  live.forEach((cd) => { if (!channelOptions.some((o) => o.value === cd)) channelOptions.push({ value: cd, label: cd === 'MAIL' ? '메일' : cd === 'POPUP' ? '시스템 팝업' : cd }); });
  (initial.channels || []).forEach((cd) => {
    if (!channelOptions.some((o) => o.value === cd)) channelOptions.push({ value: cd, label: `${channelCodes.find((c) => c.value === cd)?.label || cd} (연동 전)` });
  });
  const offline = channelCodes.filter((c) => !live.includes(c.value)).map((c) => c.label);
  const condCnt = (detail?.conds || []).length;
  const deptChoices = [{ value: '', label: '없음' }, ...deptOptions];
  if (initial.deptId !== '' && !deptChoices.some((o) => String(o.value) === String(initial.deptId))) {
    deptChoices.push({ value: initial.deptId, label: detail?.dept || `부서 ${initial.deptId}` });
  }

  return openFormModal({
    title: detail ? '수신 그룹 편집' : '수신 그룹 등록',
    sub: '발송 조건(SY-04)은 이 그룹을 골라 연결합니다. 이름을 바꿔도 연결은 유지됩니다',
    wide: true,
    initial,
    validate: validateGroup,
    fields: [
      { key: 'name', label: '그룹명', required: true, placeholder: '예) 엔진 가동' },
      { key: 'deptId', label: '대응 부서', type: 'select', options: deptChoices },
      { key: 'validWindow', label: '유효 시간대', type: 'select', options: windowOptions },
      { key: 'channels', label: '발송 채널', type: 'check', options: channelOptions, required: true, full: true },
      { key: 'memberEmpNos', type: 'custom', full: true, render: ({ value, onChange }) => <MemberPicker value={value || []} onChange={onChange} candidates={candidates} showWorker={showWorker} /> },
      ...(detail ? [{
        key: 'condNote', label: '연계', type: 'static', full: true,
        value: `이 그룹을 쓰는 발송 조건: ${condCnt ? (detail.conds || []).map((c) => c.name).join(' · ') : '없음'}`,
      }] : []),
    ],
    note: `발송 조건의 채널과 이 그룹의 채널이 겹치는 채널로만 보냅니다. 멤버를 빼면 이 그룹을 쓰는 조건의 받는 사람이 줄어듭니다.${offline.length ? ` ${offline.join(' · ')} 채널은 연동 전이라 고를 수 없습니다.` : ''}`,
    submitLabel: detail ? '수정' : '등록',
    onSubmit: async (v) => {
      const body = groupBody(v, initial, detail);
      // 멤버를 모두 빼는 저장은 한 번 묻습니다 (RCP-02)
      if (detail && Array.isArray(body.memberEmpNos) && !body.memberEmpNos.length && initial.memberEmpNos.length) {
        const yes = await askConfirm({
          title: '멤버 전원 제외',
          message: `멤버가 없으면 이 그룹을 쓰는 조건 ${condCnt}건은 아무에게도 발송되지 않습니다. 그래도 저장할까요?`,
          confirmLabel: '저장',
          danger: true,
        });
        if (!yes) return false;
      }
      return onSubmit(body);
    },
  });
}

/** 영향 표기 — 받는 사람이 0명이 되는 그룹과 그 그룹을 쓰는 조건 (RCP-07·08) */
export function impactText(impact) {
  if (!impact) return '영향을 확인하지 못했습니다. 이 사람만 받는 그룹이 있으면 그 그룹을 쓰는 조건은 아무에게도 발송되지 않습니다.';
  const zero = impact.zeroGroups || [];
  const conds = impact.affectedConds || [];
  if (!zero.length) {
    const gs = (impact.groups || []).map((g) => `${g.name} → 수신 ${g.receivableCntAfter}명`).join(' · ');
    return gs ? `영향: ${gs}. 받는 사람이 0명이 되는 그룹은 없습니다.` : '이 사람이 속한 그룹이 없어 영향이 없습니다.';
  }
  return `이 사람만 받는 그룹: ${zero.map((g) => g.name).join(' · ')} → 해당 조건 ${conds.length}건${conds.length ? `(${conds.map((c) => c.name).join(' · ')})` : ''}이 받는 사람 0명이 됩니다.`;
}

/** 계정 검색 선택 + 메일 (type:'custom', 수신자 등록) */
function AccountPicker({ value, onChange, search, error }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [keyword, setKeyword] = useState('');
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState(false);
  const v = value || {};
  const seq = useRef(0);

  const run = async () => {
    seq.current += 1;
    const mine = seq.current;
    setBusy(true);
    setErr('');
    try {
      const list = await search(keyword.trim());
      if (mine === seq.current) setFound(list);
    } catch (e) {
      if (mine !== seq.current) return;
      setFound([]);
      setErr(`후보 계정을 불러오지 못했습니다 — ${e?.message || '오류'}. 사번을 직접 입력할 수 있습니다.`);
      setManual(true);
    } finally {
      if (mine === seq.current) setBusy(false);
    }
  };

  const pick = (c) => onChange({ empNo: c.empNo, name: c.name, dept: c.dept, mail: c.email || '' });

  return (
    <Field label="계정" required full error={error}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          value={keyword}
          onChangeText={setKeyword}
          placeholder="이름 · 사번 · 부서"
          accessibilityLabel="계정 검색"
          onSubmitEditing={run}
          style={{ flexGrow: 1, flexBasis: 200, marginBottom: 0 }}
        />
        <Button label={busy ? '검색 중…' : '계정 검색'} size="sm" onPress={run} disabled={busy} />
      </View>
      {err ? <FormAlert tone="error">{err}</FormAlert> : null}
      {found ? (
        <View style={{ maxHeight: 200, borderWidth: 1, borderColor: theme.hairlineStrong, borderRadius: 8, marginTop: 6, overflow: 'scroll' }}>
          {found.length ? found.map((c) => (
            <TouchableOpacity key={c.empNo} onPress={() => pick(c)} accessibilityLabel={`${c.empNo} 선택`} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: v.empNo === c.empNo ? theme.surfaceHover : 'transparent' }}>
              <Text style={s.textSm}>{[c.name || '●●●●', c.empNo, c.dept, c.posNm].filter(Boolean).join(' · ')}</Text>
            </TouchableOpacity>
          )) : <Text style={[s.textSm, { padding: 10 }]}>후보 계정이 없습니다. 이미 수신자이거나 부서 배정 전(미배정) 계정은 나오지 않습니다.</Text>}
        </View>
      ) : null}
      {manual ? (
        <TextField label="사번 직접 입력" value={v.empNo || ''} onChangeText={(t) => onChange({ ...v, empNo: t })} placeholder="예) 20260101" />
      ) : (
        <Text style={[s.textSm, { marginTop: 8 }]}>{v.empNo ? `선택: ${[v.name, v.empNo, v.dept].filter(Boolean).join(' · ')}` : '선택한 계정이 없습니다.'}</Text>
      )}
      {/* 메일은 계정 관리의 이메일을 그대로 씁니다(2026-10-03) — 여기서 따로 적지 않습니다. 후보 목록을 못 불러 사번을 직접 넣을 때만 받습니다 */}
      {manual ? (
        <TextField label="메일" value={v.mail || ''} onChangeText={(t) => onChange({ ...v, mail: t })} placeholder="계정에 메일이 없을 때만 — 예) hong@dwje.co.kr" accessibilityLabel="메일" />
      ) : v.empNo ? (
        <Text style={[s.textSm, { marginTop: 6 }]} accessibilityLabel="메일">
          {v.mail ? `메일(계정 이메일): ${v.mail}` : '이 계정에 메일 주소가 없습니다. 계정 관리에서 이메일을 먼저 등록해 주세요.'}
        </Text>
      ) : null}
    </Field>
  );
}

/**
 * 수신자 폼 — 등록은 계정 검색 선택, 편집은 연락처만
 *
 * @param {object} cfg
 * @param {object|null} cfg.row 편집할 수신자 행 (없으면 등록)
 * @param {Function} cfg.searchCandidates 후보 계정 검색
 * @param {Function} cfg.onSubmit (recipientId, body) => Promise<boolean>
 */
export function openRecipientForm({ searchCandidates, onSubmit }) {
  // 등록만 합니다 — 메일은 계정 이메일을 따르고 휴대전화 · 메신저 칸은 뺐으므로 편집할 항목이 없어 「편집」 은 없앴습니다(2026-10-03)
  return openFormModal({
    title: '수신자 등록',
    sub: '알림을 받을 계정을 고릅니다. 메일은 계정 관리의 이메일로 보냅니다',
    initial: { account: { empNo: '', mail: '' } },
    // 계정 선택 칸(type:'custom')은 칸 아래 오류가 그려지지 않아 토스트로도 알립니다
    validate: (v) => {
      const e = validateRecipient(v);
      if (e.account) useUiStore.getState().toast(e.account);
      return e;
    },
    fields: [
      { key: 'account', type: 'custom', full: true, render: ({ value, onChange }) => <AccountPicker value={value} onChange={onChange} search={searchCandidates} /> },
    ],
    note: '계정 관리에서 이메일을 바꾸면 알림도 바뀐 주소로 갑니다. 메일은 데이터 접근 권한 worker 항목이 없는 계정에는 가려져 보입니다. 부서 배정 전(미배정) 계정은 수신자로 등록할 수 없습니다.',
    submitLabel: '등록',
    onSubmit: async (v) => {
      const txt = (x) => String(x ?? '').trim();
      const body = { empNo: txt(v.account?.empNo) };
      // 서버는 계정 이메일이 있으면 그것을 씁니다. 사번을 직접 넣은 경우에만 적은 메일을 보냅니다
      if (txt(v.account?.mail)) body.mail = txt(v.account?.mail);
      return onSubmit(undefined, body);
    },
  });
}

export { memberEmpNo };
