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
import { IS_MOCK_LOGIN } from '@services/api/client';
import { useCommonStyles } from '@shared/theme/styles';

/**
 * 데모 사이트에서 쓸 계정 안내.
 *
 * 목 인증은 **아무 사번·비밀번호나 받습니다**(모르는 사번은 통합관리자로 들어갑니다).
 * 그대로 두면 처음 온 사람이 무엇을 쳐야 할지 몰라 멈춥니다 — 부서마다 보이는 화면이 다르므로
 * 권한이 갈리는 계정을 몇 개 짚어 줍니다.
 */
const DEMO_ACCOUNTS = [
  ['20140901', '통합관리자 — 전 화면'],
  ['20180412', '품질보증팀 팀장'],
  ['20170905', '생산관리팀 팀장'],
  ['20110204', '경영진 — 수량·수율 비공개'],
];

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

      {IS_MOCK_LOGIN ? (
        <FormAlert tone="info">
          {`데모 사이트입니다 — 아래 사번 중 하나로 들어가 보십시오. 비밀번호는 아무 값이나 됩니다.\n${
            DEMO_ACCOUNTS.map(([id, desc]) => `· ${id} — ${desc}`).join('\n')}`}
        </FormAlert>
      ) : (
        <Text style={[s.caption, { textAlign: 'center' }]}>
          비밀번호를 5회 잘못 입력하면 계정이 정지됩니다. 정지된 계정은 비밀번호 찾기로 다시 사용할 수 있습니다.
        </Text>
      )}
    </AuthCard>
  );
}
