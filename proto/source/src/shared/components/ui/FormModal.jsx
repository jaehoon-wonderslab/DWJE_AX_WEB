/**
 * 공통 등록·편집 폼 모달 (CM-05)
 *
 * 프로토타입의 `formModal({fields:[…]})` 을 옮긴 것으로,
 * 필드 정의 배열만 넘기면 2열 그리드 폼과 취소/저장 버튼이 만들어집니다.
 *
 * 사용 예)
 *   openFormModal({
 *     title: '계정 등록', sub: '시스템관리 > 계정 관리',
 *     fields: [
 *       { key:'empNo', label:'사번', required:true },
 *       { key:'dept',  label:'부서', type:'select', options:['품질보증팀','생산관리팀'] },
 *       { key:'memo',  label:'비고', type:'textarea', full:true },
 *     ],
 *     note: '등록 후 권한을 지정하세요.',
 *     submitLabel: '등록',
 *     onSubmit: (values) => { … return false 를 반환하면 모달이 닫히지 않습니다 },
 *   });
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { withParticle } from '@shared/utils/formatUtil';
import Button from './Button';
import { CheckRow, DateField, RadioRow, SelectField, TextAreaField, TextField, Field } from './Field';

/** 폼 본문 — 필드 정의를 받아 실제 입력 요소를 그립니다 */
function FormBody({ fields, initial, note, onReady }) {
  const s = useCommonStyles();
  const [errors, setErrors] = useState({});
  const [values, setValues] = useState(() => {
    const v = { ...(initial || {}) };
    fields.forEach((f) => {
      if (v[f.key] === undefined) v[f.key] = f.value ?? (f.type === 'check' ? [] : '');
    });
    return v;
  });

  /**
   * 부모(footer 의 저장 버튼)가 현재 값을 읽고 오류를 표시할 수 있도록 넘겨 둡니다.
   *
   * **선언된 필드만 돌려줍니다.** `initial: row` 로 조회 응답 행을 통째로 넘기는 화면이 있는데,
   * 그대로 제출하면 서버가 받지 않는 키(condId · updatedAt · 계산된 표시값 …)까지 함께 갑니다.
   * 지금은 서버가 모르는 필드를 무시해서 조용히 넘어가지만, 그 관대함이 오늘
   * "성공 메시지는 뜨는데 아무것도 안 바뀌는" 버그를 여러 번 만들었습니다.
   */
  onReady(() => {
    const out = {};
    fields.forEach((f) => {
      if (f.type === 'static') return;
      out[f.key] = values[f.key];
    });
    return out;
  }, setErrors);

  /** 값을 바꾸면 그 칸의 오류 표시는 지웁니다 */
  const set = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {fields.map((f) => {
          // full 이면 한 줄 전체, 아니면 2열 그리드 (좁은 화면에서는 자동으로 1열이 됩니다)
          const cellStyle = f.full ? { width: '100%' } : { flexGrow: 1, flexBasis: 220, minWidth: 200 };
          // key 는 스프레드에 섞지 않고 각 요소에 직접 줍니다 (React 경고 방지)
          const common = { label: f.label, required: f.required, style: cellStyle, error: errors[f.key] };
          if (f.type === 'select') {
            return <SelectField key={f.key} {...common} value={values[f.key]} options={f.options} onChange={(v) => set(f.key, v)} full />;
          }
          if (f.type === 'textarea') {
            return <TextAreaField key={f.key} {...common} value={values[f.key]} rows={f.rows || 3} placeholder={f.placeholder} onChangeText={(v) => set(f.key, v)} full />;
          }
          if (f.type === 'date') {
            // min · max 를 주지 않으면 DateField 가 실적 보유 기간으로 스스로 제한합니다
            return <DateField key={f.key} {...common} value={values[f.key]} onChange={(v) => set(f.key, v)} min={f.min} max={f.max} full />;
          }
          if (f.type === 'radio') {
            return (
              <Field key={f.key} {...common} full={f.full}>
                <RadioRow options={f.options} value={values[f.key]} onChange={(v) => set(f.key, v)} />
              </Field>
            );
          }
          if (f.type === 'check') {
            const list = values[f.key] || [];
            return (
              <Field key={f.key} {...common} full={f.full}>
                <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingTop: 6 }}>
                  {f.options.map((o) => {
                    const opt = typeof o === 'string' ? { value: o, label: o } : o;
                    const on = list.includes(opt.value);
                    return (
                      <CheckRow
                        key={String(opt.value)}
                        label={opt.label}
                        checked={on}
                        onToggle={() => set(f.key, on ? list.filter((x) => x !== opt.value) : [...list, opt.value])}
                      />
                    );
                  })}
                </View>
              </Field>
            );
          }
          if (f.type === 'static') {
            return (
              <Field key={f.key} {...common} full={f.full}>
                <Text style={[s.textSm, { paddingTop: 7, fontSize: 13 }]}>{f.value}</Text>
              </Field>
            );
          }
          return (
            <TextField
              key={f.key}
              {...common}
              value={values[f.key]}
              placeholder={f.placeholder}
              keyboardType={f.type === 'number' ? 'numeric' : 'default'}
              onChangeText={(v) => set(f.key, v)}
              full
            />
          );
        })}
      </View>
      {note ? (
        <View style={[s.source, { marginTop: 12 }]}>
          <Text style={s.sourceText}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 등록·편집 폼 모달을 엽니다.
 * @param {object} config 위 사용 예 참고
 * @returns {number} 모달 id
 */
export function openFormModal(config) {
  const { title, sub, fields = [], initial, note, submitLabel = '저장', cancelLabel = '취소', onSubmit, wide, extra, danger } = config;
  let readValues = () => ({});
  let showErrors = () => {};
  let submitting = false;

  /**
   * `required: true` 인 칸이 비어 있는지 확인합니다.
   * 비어 있으면 그 칸 아래에 안내를 붙이고 제출을 막습니다.
   */
  const validate = (values) => {
    const errors = {};
    fields.forEach((f) => {
      if (!f.required || f.type === 'static') return;
      const v = values[f.key];
      const empty = v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
      if (empty) errors[f.key] = `${withParticle(f.label, '을')} 입력해 주세요.`;
    });
    return errors;
  };

  return useUiStore.getState().openModal({
    title,
    sub,
    wide,
    render: () => (
      <FormBody
        fields={fields}
        initial={initial}
        note={note}
        onReady={(getter, setErrors) => {
          readValues = getter;
          showErrors = setErrors;
        }}
      />
    ),
    footer: (close) => (
      <>
        <Button label={cancelLabel} onPress={close} />
        {extra}
        <Button
          label={submitLabel}
          variant={danger ? 'danger' : 'primary'}
          onPress={async () => {
            // 이중 제출 방지 — 서버 응답을 기다리는 동안 한 번 더 눌리지 않게 합니다
            if (submitting) return;
            submitting = true;
            try {
              const values = readValues();

              // 필수 항목부터 확인 — 비어 있으면 서버까지 가지 않고 그 자리에 표시합니다
              const errors = validate(values);
              showErrors(errors);
              if (Object.keys(errors).length) return;

              // onSubmit 이 false 를 반환하면 검증 실패로 보고 모달을 유지합니다
              // (async 함수는 Promise 를 돌려주므로 결과를 기다린 뒤에 판정합니다)
              const result = onSubmit ? await onSubmit(values) : undefined;
              if (result !== false) close();
            } finally {
              submitting = false;
            }
          }}
        />
      </>
    ),
  });
}

/**
 * 확인 모달 — 삭제·전환처럼 되돌리기 어려운 동작 전에 한 번 묻습니다.
 */
export function openConfirmModal({ title, sub, message, confirmLabel = '확인', danger, onConfirm }) {
  const ui = useUiStore.getState();
  return ui.openModal({
    title,
    sub,
    render: () => <ConfirmBody message={message} />,
    footer: (close) => (
      <>
        <Button label="취소" onPress={close} />
        <Button
          label={confirmLabel}
          variant={danger ? 'danger' : 'primary'}
          onPress={() => {
            onConfirm?.();
            close();
          }}
        />
      </>
    ),
  });
}

function ConfirmBody({ message }) {
  const s = useCommonStyles();
  return <Text style={s.text}>{message}</Text>;
}
