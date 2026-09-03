/**
 * 입력 요소 (CM-05) — 조회 조건 · 등록 폼에서 쓰는 필드 묶음
 *
 * 기존 웹의 `<div class="field"><label>…</label><input></div>` 구조에 대응합니다.
 * React Native 에는 <select> 가 없어 눌렀을 때 목록을 펼치는 방식으로 구현했습니다.
 */
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '@shared/stores/useAppStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import Icon from './Icon';

/**
 * 라벨 + 입력요소를 묶는 껍데기
 *
 * `error` 를 주면 입력란 아래에 빨간 안내를 답니다.
 * API 실패 응답의 `error.field` 를 그대로 연결하는 자리입니다.
 */
export function Field({ label, children, style, required, full, error, hint }) {
  const s = useCommonStyles();
  return (
    <View style={[s.field, full && { width: '100%' }, style]}>
      {label ? (
        <Text style={s.fieldLabel}>
          {label}
          {required ? <Text style={{ color: '#dc2626' }}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={[s.fieldLabel, { fontWeight: '400' }]}>{hint}</Text> : null}
    </View>
  );
}

/** 한 줄 텍스트 입력 */
export function TextField({ label, value, onChangeText, placeholder, style, inputStyle, required, full, error, hint, ...rest }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} style={style} required={required} full={full} error={error} hint={hint}>
      <TextInput
        style={[s.input, focused && s.inputFocus, error && s.inputError, full && { width: '100%' }, inputStyle]}
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.mutedForeground}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </Field>
  );
}

/** 여러 줄 텍스트 입력 */
export function TextAreaField({ label, value, onChangeText, placeholder, rows = 3, style, required, full = true, error, hint }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} style={style} required={required} full={full} error={error} hint={hint}>
      <TextInput
        style={[s.input, s.textarea, { minHeight: 22 * rows + 18 }, focused && s.inputFocus, error && s.inputError]}
        value={value ?? ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.mutedForeground}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Field>
  );
}

/**
 * 선택 목록 (HTML 의 <select>)
 *
 * @param {object} props options 는 문자열 배열이거나 [{value,label}] 배열
 */
export function SelectField({ label, value, options = [], onChange, style, required, full, error, hint, placeholder = '선택' }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const current = items.find((o) => o.value === value);

  return (
    <Field label={label} style={style} required={required} full={full} error={error} hint={hint}>
      <TouchableOpacity
        style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 8 }, error && s.inputError, full && { width: '100%' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[s.textSm, { flex: 1, color: current ? theme.color.foreground : theme.color.mutedForeground }]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Icon name="chevronDown" size={13} color={theme.color.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', padding: 24 }} onPress={() => setOpen(false)}>
          <Pressable
            style={{
              backgroundColor: theme.color.popover,
              borderRadius: theme.metrics.radius,
              borderWidth: 1,
              borderColor: theme.color.border,
              maxHeight: 420,
              alignSelf: 'center',
              width: '100%',
              maxWidth: 420,
              overflow: 'hidden',
            }}
          >
            {label ? (
              <View style={s.cardHead}>
                <Text style={s.cardHeadTitle}>{label}</Text>
              </View>
            ) : null}
            <ScrollView>
              {items.map((o) => (
                <TouchableOpacity
                  key={String(o.value)}
                  style={{
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: o.value === value ? theme.color.accent : 'transparent',
                  }}
                  onPress={() => {
                    onChange?.(o.value, o);
                    setOpen(false);
                  }}
                >
                  <Text style={[s.textSm, { flex: 1, fontSize: 13 }]}>{o.label}</Text>
                  {o.value === value ? <Icon name="check" size={14} color={theme.color.foreground} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Field>
  );
}

/**
 * 날짜 입력 — 웹에서는 브라우저 기본 날짜 선택기를 그대로 씁니다.
 * (RN 의 TextInput 에 웹 전용 type 속성을 넘겨 <input type="date"> 로 렌더링)
 *
 * 선택 범위는 실적 보유 기간(`GET /api/v1/common/data-range`)으로 제한합니다.
 * 실적이 없는 날짜를 고르면 화면이 통째로 0 으로 보이기 때문입니다.
 * 기간 밖을 일부러 열어야 하면 `min` · `max` 를 직접 넘기세요. (`null` 이면 제한 없음)
 */
export function DateField({ label, value, onChange, style, required, full, error, hint, min, max }) {
  const s = useCommonStyles();
  const [focused, setFocused] = useState(false);
  const dataRange = useAppStore((state) => state.dataRange);

  const lo = min === undefined ? dataRange?.fromDate : min;
  const hi = max === undefined ? dataRange?.toDate : max;
  const webProps = Platform.OS === 'web' ? { type: 'date', min: lo || undefined, max: hi || undefined } : {};

  return (
    <Field label={label} style={style} required={required} full={full} error={error} hint={hint}>
      <TextInput
        style={[s.input, focused && s.inputFocus, error && s.inputError, full && { width: '100%' }]}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...webProps}
      />
    </Field>
  );
}

/** 체크박스 한 줄 */
export function CheckRow({ label, checked, onToggle, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', gap: 7 }, style]} onPress={onToggle} activeOpacity={0.7}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: checked ? theme.color.primary : theme.color.border,
          backgroundColor: checked ? theme.color.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={11} color={theme.color.primaryForeground} strokeWidth={2.6} /> : null}
      </View>
      <Text style={s.textSm}>{label}</Text>
    </TouchableOpacity>
  );
}

/** 라디오 한 줄 */
export function RadioRow({ options, value, onChange, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingTop: 6 }, style]}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const on = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            onPress={() => onChange?.(opt.value)}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 15,
                height: 15,
                borderRadius: 99,
                borderWidth: on ? 4.5 : 1,
                borderColor: on ? theme.color.primary : theme.color.border,
              }}
            />
            <Text style={s.textSm}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 조회 조건 줄 — 필드들을 가로로 늘어놓습니다 */
export function Filters({ children, style }) {
  const s = useCommonStyles();
  return <View style={[s.filters, style]}>{children}</View>;
}
