/**
 * [View] 로그인 화면 (CM-03)
 *
 * 사번·비밀번호를 받아 인증하고, 성공하면 원래 가려던 화면으로 보냅니다.
 *
 * [보안] 실패 문구는 서버가 준 것을 그대로 노출합니다.
 *        사번 없음과 비밀번호 불일치의 문구가 같은 것은 계정 열거를 막기 위한 의도입니다.
 *        화면에서 두 경우를 구분해 보여주지 마세요.
 */
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Button, FormAlert, Icon, TextField } from '@shared/components/ui';
import AuthCard, { AuthLinks } from '@shared/components/layout/AuthCard';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function LoginView({
  loginId,
  setLoginId,
  password,
  setPassword,
  pending,
  formError,
  fieldErrors,
  submit,
  goSignup,
  goForgotPassword,
}) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <AuthCard
      title="로그인"
      desc="사내 사번과 비밀번호로 접속합니다."
      footer={
        <AuthLinks
          links={[
            { text: '계정이 없으신가요?', label: '회원가입', onPress: goSignup },
            { label: '비밀번호 찾기', onPress: goForgotPassword },
          ]}
        />
      }
    >
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      <TextField
        label="사번"
        value={loginId}
        onChangeText={setLoginId}
        placeholder="예) 10004"
        autoCapitalize="none"
        autoComplete="username"
        textContentType="username"
        error={fieldErrors.loginId}
        onSubmitEditing={submit}
        required
        full
      />

      <View style={{ gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.fieldLabel}>
            비밀번호<Text style={{ color: '#dc2626' }}> *</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            accessibilityRole="button"
            accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={13} color={theme.color.mutedForeground} />
            <Text style={[s.textXs, { fontSize: 11 }]}>{visible ? '숨기기' : '표시'}</Text>
          </TouchableOpacity>
        </View>
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry={!visible}
          autoComplete="current-password"
          textContentType="password"
          error={fieldErrors.password}
          onSubmitEditing={submit}
          full
        />
      </View>

      <Button
        label={pending ? '로그인 중…' : '로그인'}
        variant="primary"
        onPress={submit}
        disabled={pending}
        style={{ height: 40, marginTop: 2 }}
      />

      <Text style={[s.textXs, { fontSize: 11, lineHeight: 17, textAlign: 'center' }]}>
        비밀번호를 5회 잘못 입력하면 계정이 정지됩니다. 정지된 계정은 비밀번호 찾기로 다시 사용할 수 있습니다.
      </Text>
    </AuthCard>
  );
}
