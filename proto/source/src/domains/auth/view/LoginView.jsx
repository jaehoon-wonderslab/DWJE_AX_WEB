/**
 * [View] 로그인 화면 (CM-03)
 *
 * 사번·비밀번호를 받아 인증하고, 성공하면 원래 가려던 화면으로 보냅니다.
 *
 * [보안] 실패 문구는 서버가 준 것을 그대로 노출합니다.
 *        사번 없음과 비밀번호 불일치의 문구가 같은 것은 계정 열거를 막기 위한 의도입니다.
 *        화면에서 두 경우를 구분해 보여주지 마세요.
 */
import React from 'react';
import { Text } from 'react-native';
import { Button, FormAlert, PasswordField, TextField } from '@shared/components/ui';
import AuthCard, { AuthLinks } from '@shared/components/layout/AuthCard';
import { useCommonStyles } from '@shared/theme/styles';

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

      {/* Tab: 사번 → 비밀번호 → 로그인. 표시/숨김 눈 아이콘은 칸 안에 있고 탭 순서에서 빠져 있습니다 */}
      <PasswordField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        autoComplete="current-password"
        textContentType="password"
        error={fieldErrors.password}
        onSubmitEditing={submit}
        required
        full
      />

      <Button
        label={pending ? '로그인 중…' : '로그인'}
        variant="primary"
        onPress={submit}
        disabled={pending}
        style={{ height: 40, marginTop: 2 }}
      />

      <Button label="관리자 샘플 계정 입력" onPress={() => { setLoginId('admin'); setPassword('Demo!2026'); }} />
      <Text style={[s.caption, { textAlign: 'center' }]}>샘플 계정: admin / Demo!2026 · 입력 후 로그인 버튼을 누르세요.</Text>
    </AuthCard>
  );
}
