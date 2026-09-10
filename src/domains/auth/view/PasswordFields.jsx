/**
 * [View] 비밀번호 입력 묶음 (회원가입 · 비밀번호 찾기 공용)
 *
 * 정책 안내 · 강도 표시 · 표시/숨김 토글을 함께 그립니다.
 * 정책 문구는 서버 검사 규칙(passwordPolicy)에서 가져오므로 둘이 어긋나지 않습니다.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Field, PasswordField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { PASSWORD_POLICY_TEXT, passwordStrength } from '../model/passwordPolicy';

/**
 * @param {object} props
 * @param {string} props.label        비밀번호 입력란 라벨
 * @param {string} props.confirmLabel 확인 입력란 라벨
 * @param {string} props.errorKey     오류 맵에서 비밀번호 칸에 쓸 키 (password | newPassword)
 * @param {string} props.confirmKey   오류 맵에서 확인 칸에 쓸 키
 */
export default function PasswordFields({
  label = '비밀번호',
  confirmLabel = '비밀번호 확인',
  errorKey = 'password',
  confirmKey = 'passwordConfirm',
  value,
  onChange,
  confirmValue,
  onChangeConfirm,
  fieldErrors = {},
  onSubmitEditing,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);

  return (
    <>
      <View style={{ gap: 5 }}>
        <PasswordField
          label={label}
          value={value}
          onChangeText={onChange}
          placeholder="8자 이상"
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors[errorKey]}
          visible={visible}
          onToggleVisible={() => setVisible((v) => !v)}
          required
          full
        />

        {/* 강도 막대 — 정책 충족 정도를 4칸으로 보여 줍니다 */}
        {value ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 3, flex: 1 }}>
              {[1, 2, 3, 4].map((n) => (
                <View
                  key={n}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor:
                      strength.level >= n
                        ? strength.level <= 1
                          ? theme.color.destructive
                          : strength.level === 2
                            ? theme.color.warning
                            : theme.color.success
                        : theme.color.border,
                  }}
                />
              ))}
            </View>
            <Text style={[s.textXs, { fontSize: 15 }]}>{strength.label}</Text>
          </View>
        ) : null}
      </View>

      <PasswordField
        label={confirmLabel}
        value={confirmValue}
        onChangeText={onChangeConfirm}
        placeholder="한 번 더 입력해 주세요"
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldErrors[confirmKey]}
        onSubmitEditing={onSubmitEditing}
        visible={visible}
        onToggleVisible={() => setVisible((v) => !v)}
        required
        full
      />

      {/* 정책 안내 — 서버 검사 규칙과 같은 문구 */}
      <Field>
        <View style={{ gap: 3 }}>
          {PASSWORD_POLICY_TEXT.map((line) => (
            <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.color.mutedForeground }} />
              <Text style={[s.textXs, { fontSize: 15.5 }]}>{line}</Text>
            </View>
          ))}
        </View>
      </Field>
    </>
  );
}
