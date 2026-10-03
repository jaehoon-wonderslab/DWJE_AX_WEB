/**
 * [View] SY-02 부서 권한 복사 — 2단계 (기획 03 MNP-01 · 4.3 와이어프레임)
 *
 *   원본·대상 고르기(기본값 없음) → 「미리보기」 → 추가·회수 목록·영향 계정 확인 → 「위 내용을 확인했습니다」 → 「복사」
 *
 *  · 선택지에 미배정 부서는 없습니다(원본·대상 모두). 대상에는 통합관리자도 없습니다. 표기는 「부서명 (계정 n명)」
 *  · 관리 화면 5종이 바뀌는 복사는 통합관리자만 실행할 수 있습니다 — 다른 사람에게는 실행 버튼을 잠그고 이유를 보입니다
 *  · 미리보기 뒤에 권한이 바뀌어 서버가 거부하면(409) 미리보기를 다시 불러옵니다
 * 화면 상태(고른 값·미리보기 결과·확인 체크)만 이 파일이 들고, 요청은 컨트롤러 함수로 보냅니다.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, CheckRow, FormAlert, Hint, SelectField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';

/** 목록을 「이름 · 이름 … 외 n건」 으로 줄입니다 */
function summarize(items, labelOf, max = 6) {
  const names = items.map(labelOf);
  return `${names.slice(0, max).join(', ')}${names.length > max ? ` 외 ${names.length - max}건` : ''}`;
}

export default function MenuPermCopyForm({ options, screenLabel, isSuperAdmin, previewCopy, executeCopy, onDone, close }) {
  const s = useCommonStyles();
  const [fromDeptId, setFrom] = useState('');
  const [toDeptId, setTo] = useState('');
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [checked, setChecked] = useState(false);
  const [working, setWorking] = useState(false);

  const reset = () => { setPreview(null); setChecked(false); setMessage(''); };

  const runPreview = async () => {
    const next = {};
    if (!fromDeptId) next.fromDeptId = '복사할 부서(원본)를 고르세요.';
    if (!toDeptId) next.toDeptId = '적용할 부서(대상)를 고르세요.';
    if (fromDeptId && toDeptId && fromDeptId === toDeptId) next.toDeptId = '원본 부서와 대상 부서가 같습니다.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setWorking(true);
    reset();
    const res = await previewCopy({ fromDeptId, toDeptId });
    setWorking(false);
    if (!res?.ok) { setMessage(res?.message || '미리보기를 불러오지 못했습니다.'); return; }
    setPreview(res.data || {});
  };

  const runCopy = async () => {
    if (!preview?.expectedHash) return;
    setWorking(true);
    const res = await executeCopy({ fromDeptId, toDeptId }, preview.expectedHash);
    setWorking(false);
    if (res?.ok) { onDone?.(); close?.(); return; }
    // 미리보기 뒤에 권한이 바뀐 경우 — 다시 미리보기를 불러와 새 목록으로 확인하게 합니다
    if (/미리보기/.test(res?.message || '')) {
      await runPreview();
      setMessage(`${res.message} 새 미리보기를 확인한 뒤 다시 복사하세요.`);
      return;
    }
    setMessage(res?.message || '복사하지 못했습니다.');
  };

  const added = preview?.added || [];
  const removed = preview?.removed || [];
  const adminChanged = preview?.adminScreensChanged || [];
  const needsSuper = !!preview?.requiresSuperAdmin || adminChanged.length > 0;
  const blockedBySuper = needsSuper && !isSuperAdmin;
  const canRun = !!preview?.expectedHash && checked && !blockedBySuper && !working;
  const optionLabel = (list, id) => list.find((o) => o.value === String(id))?.label || id;

  return (
    <View style={{ gap: 12 }}>
      <SelectField
        nativeSelect
        label="복사할 부서 (원본)"
        required
        value={fromDeptId}
        options={options.from}
        placeholder="선택하세요"
        error={errors.fromDeptId}
        onChange={(v) => { setFrom(v || ''); reset(); }}
      />
      <SelectField
        nativeSelect
        label="적용할 부서 (대상)"
        required
        value={toDeptId}
        options={options.to}
        placeholder="선택하세요"
        error={errors.toDeptId}
        onChange={(v) => { setTo(v || ''); reset(); }}
      />
      <Text style={s.textXs}>
        대상 부서의 메뉴 접근 권한은 원본과 같게 덮어쓰기 됩니다. 데이터 접근 권한은 함께 복사되지 않습니다. 미배정 부서는 고정 부서라 고를 수 없습니다.
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label={working && !preview ? '불러오는 중…' : '미리보기'} size="sm" icon="eye" onPress={runPreview} disabled={working} />
      </View>

      {message ? <FormAlert>{message}</FormAlert> : null}

      {preview ? (
        <View style={{ gap: 6 }} accessibilityLabel="복사 미리보기">
          <Text style={[s.textSm, { fontWeight: '600' }]}>
            {`원본: ${preview.from?.deptNm || optionLabel(options.from, fromDeptId)} → 대상: ${preview.to?.deptNm || optionLabel(options.to, toDeptId)} · 계정 ${Number(preview.to?.userCnt ?? 0).toLocaleString('ko-KR')}명`}
          </Text>
          <Text style={s.textSm}>
            {added.length
              ? `추가 ${added.length}건: ${summarize(added, (x) => screenLabel(x.id))}`
              : '추가 0건'}
          </Text>
          <Text style={s.textSm}>
            {removed.length
              ? `회수 ${removed.length}건: ${summarize(removed, (x) => screenLabel(x.id))}`
              : '회수 0건'}
          </Text>
          {needsSuper ? (
            <FormAlert>
              {`관리 화면 ${adminChanged.length}개가 바뀝니다 (${adminChanged.map(screenLabel).join(', ')}).${blockedBySuper ? ' 통합관리자만 실행할 수 있습니다.' : ' 관리 화면 권한을 바꾸는 복사입니다 — 내용을 다시 확인하세요.'}`}
            </FormAlert>
          ) : null}
          {!added.length && !removed.length ? <Hint>바뀌는 권한이 없습니다. 이미 원본과 같습니다.</Hint> : null}
          {blockedBySuper ? null : (
            <CheckRow label="위 내용을 확인했습니다" checked={checked} onToggle={() => setChecked((v) => !v)} />
          )}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Button label="취소" size="sm" onPress={close} />
        <Button label={working && preview ? '복사하는 중…' : '복사'} size="sm" variant={needsSuper ? 'danger' : 'primary'} icon="copy" onPress={runCopy} disabled={!canRun} />
      </View>
    </View>
  );
}
