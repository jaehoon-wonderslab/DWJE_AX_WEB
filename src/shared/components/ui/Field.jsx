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
import DatePickerPopover from './DatePickerPopover';
import Icon from './Icon';

/**
 * 라벨 + 입력요소를 묶는 껍데기
 *
 * `error` 를 주면 입력란 아래에 빨간 안내를 답니다.
 * API 실패 응답의 `error.field` 를 그대로 연결하는 자리입니다.
 */
export function Field({ label, children, style, required, full, error, hint }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[s.field, full && { width: '100%' }, style]}>
      {label ? (
        <Text style={s.fieldLabel}>
          {label}
          {required ? <Text style={{ color: theme.color.spark }}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={[s.fieldLabel, { fontWeight: '300', fontSize: 15.5, lineHeight: 16 }]}>{hint}</Text> : null}
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
export function SelectField({ label, value, options = [], onChange, style, inputStyle, required, full, error, hint, placeholder = '선택', nativeSelect = false }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const items = (options || [])
    .filter((o) => o !== null && o !== undefined)
    .map((o) => (typeof o === 'object' && o !== null ? o : { value: String(o), label: String(o) }));
  const current = items.find((o) => o && String(o.value) === String(value));
  // 모달 ScrollView 안의 absolute 팝오버는 잘리거나 백드롭이 선택을 가로챕니다.
  // 웹 폼에서는 브라우저의 기본 선택창을 사용하여 스크롤/키보드 선택도 보장합니다.
  if (nativeSelect && Platform.OS === 'web') {
    return <Field label={label} style={style} required={required} full={full} error={error} hint={hint}>
      <select aria-label={label || placeholder} value={value == null ? '' : String(value)}
        onChange={event => onChange?.(items.find(item => String(item.value) === event.target.value)?.value)}
        style={{ width: '100%', minWidth: 0, minHeight: 38, padding: '8px 12px', font: 'inherit', fontSize: 16,
          borderRadius: 10, border: `1px solid ${theme.hairlineStrong}`, background: theme.color.popover, color: theme.color.foreground }}>
        {!items.some(item => String(item.value) === String(value ?? '')) && <option value="" disabled>{placeholder}</option>}
        {items.map(item => <option key={String(item.value)} value={String(item.value)}>{item.label}</option>)}
      </select>
    </Field>;
  }
  const overrideMinWidth = style?.width != null ? { minWidth: 0, width: '100%' } : (style?.minWidth != null ? { minWidth: style.minWidth } : null);

  return (
    <Field
      label={label}
      style={[{ position: 'relative', zIndex: open ? 9999 : undefined }, style]}
      required={required}
      full={full}
      error={error}
      hint={hint}
    >
      <TouchableOpacity
        style={[
          s.input,
          { flexDirection: 'row', alignItems: 'center', gap: 6 },
          overrideMinWidth,
          inputStyle,
          error && s.inputError,
          full && { width: '100%' },
        ]}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Text style={[s.textSm, { flex: 1, color: current ? theme.color.foreground : theme.color.mutedForeground }]} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Icon name="chevronDown" size={13} color={theme.color.mutedForeground} />
      </TouchableOpacity>

      {open && (
        <>
          {/* 바깥 클릭 시 닫히도록 투명 백드롭 */}
          <Pressable
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              backgroundColor: 'transparent',
            }}
            onPress={() => setOpen(false)}
          />

          {/* 컴포넌트 바로 아래 열리는 드롭다운 팝오버 */}
          <View
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              minWidth: '100%',
              marginTop: 4,
              backgroundColor: theme.color.popover,
              borderRadius: theme.metrics.radiusSm + 2,
              borderWidth: 1,
              borderColor: theme.hairlineStrong,
              padding: 4,
              ...theme.shadow,
              maxHeight: 280,
              zIndex: 9999,
              overflow: 'hidden',
            }}
          >
            <ScrollView style={{ maxHeight: 280 }}>
              {items.map((o) => {
                const isSelected = String(o.value) === String(value);
                return (
                  <TouchableOpacity
                    key={String(o.value)}
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: theme.metrics.radiusXs,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: isSelected ? theme.alpha('primary', 0.12) : 'transparent',
                    }}
                    onPress={() => {
                      onChange?.(o.value, o);
                      setOpen(false);
                    }}
                    activeOpacity={0.65}
                  >
                    <Text
                      style={[
                        s.textSm,
                        {
                          flex: 1,
                          fontSize: 17,
                          fontWeight: isSelected ? '500' : '400',
                          color: theme.color.foreground,
                        },
                      ]}
                    >
                      {o.label}
                    </Text>
                    {isSelected ? <Icon name="check" size={13} color={theme.color.primary || theme.color.foreground} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </Field>
  );
}

/**
 * 날짜 입력 — 키보드로 직접 입력(YYYY-MM-DD)할 수도 있고,
 * 우측 달력 아이콘을 누르면 컴포넌트 바로 아래에 달력 팝오버가 열려 마우스 이동을 최소화합니다.
 */
export function DateField({ label, value, onChange, style, required, full, error, hint, min, max }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const dataRange = useAppStore((state) => state.dataRange);

  const lo = min === undefined ? dataRange?.fromDate : min;
  const hi = max === undefined ? dataRange?.toDate : max;

  return (
    <Field
      label={label}
      style={[{ position: 'relative', zIndex: pickerOpen ? 9999 : undefined }, style]}
      required={required}
      full={full}
      error={error}
      hint={hint}
    >
      <View
        style={[
          s.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 0,
            paddingHorizontal: 0,
            overflow: 'hidden',
          },
          focused && s.inputFocus,
          error && s.inputError,
          full && { width: '100%' },
        ]}
      >
        <TextInput
          style={[
            s.td,
            s.num,
            {
              flex: 1,
              height: '100%',
              paddingVertical: 7,
              paddingLeft: 10,
              paddingRight: 4,
              borderWidth: 0,
              backgroundColor: 'transparent',
              outline: 'none',
              color: theme.color.foreground,
              fontSize: 17,
            },
          ]}
          value={value ?? ''}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.color.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity
          onPress={() => setPickerOpen((prev) => !prev)}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="달력에서 날짜 선택"
          style={{
            paddingHorizontal: 8,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeftWidth: 1,
            borderLeftColor: theme.hairline,
            backgroundColor: pickerOpen ? theme.alpha('primary', 0.12) : 'transparent',
          }}
        >
          <Icon name="calendar" size={15} color={pickerOpen ? theme.color.primary : theme.color.mutedForeground} />
        </TouchableOpacity>
      </View>

      <DatePickerPopover
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={value}
        onSelect={(d) => onChange?.(d)}
        min={lo}
        max={hi}
      />
    </Field>
  );
}

/**
 * 비밀번호 입력 — 표시/숨김 눈 아이콘이 입력칸 **안 오른쪽**에 있고, 탭 순서에서는 빠져 있습니다.
 * (라벨 옆에 두면 Tab 이 다음 입력칸 대신 '표시' 단추에 먼저 멈춥니다)
 *
 * `visible` · `onToggleVisible` 을 주면 바깥에서 상태를 관리하고(확인 칸과 같이 토글), 없으면 스스로 관리합니다.
 */
export function PasswordField({ label, value, onChangeText, placeholder, style, required, full, error, hint, visible, onToggleVisible, inputStyle, ...rest }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [innerVisible, setInnerVisible] = useState(false);
  const shown = visible ?? innerVisible;
  const toggle = onToggleVisible || (() => setInnerVisible((v) => !v));

  return (
    <Field label={label} style={style} required={required} full={full} error={error} hint={hint}>
      <View
        style={[
          s.input,
          { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
          focused && s.inputFocus,
          error && s.inputError,
          full && { width: '100%' },
        ]}
      >
        <TextInput
          style={[
            s.input,
            { flex: 1, height: '100%', borderWidth: 0, backgroundColor: 'transparent', minWidth: 0, paddingRight: 6 },
            inputStyle,
          ]}
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.color.mutedForeground}
          secureTextEntry={!shown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        <Pressable
          onPress={toggle}
          tabIndex={-1}
          focusable={false}
          accessibilityRole="button"
          accessibilityLabel={shown ? '비밀번호 숨기기' : '비밀번호 표시'}
          style={({ hovered }) => ({ width: 36, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? theme.surface : 'transparent' })}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={15} color={theme.color.mutedForeground} />
        </Pressable>
      </View>
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
          borderRadius: 5,
          borderWidth: 1,
          borderColor: checked ? theme.color.primary : theme.hairlineStrong,
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
                borderColor: on ? theme.color.primary : theme.hairlineStrong,
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
  return <View style={[s.filters, { position: 'relative', zIndex: 100 }, style]}>{children}</View>;
}
