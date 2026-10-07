/**
 * [View] 초기 비밀번호 변경 (CM-03 · 2026-10-01 기획 R-04)
 *
 * 초기 비밀번호로 로그인한 계정만 들어옵니다. 비밀번호를 바꾸기 전에는 다른 화면을 열 수 없으므로
 * 사이드바·알림·AI 패널 없이 인증 화면과 같은 카드로 그립니다.
 */
import React from 'react';
import { Text } from 'react-native';
import { Button, FormAlert, PasswordField } from '@shared/components/ui';
import AuthCard, { AuthLinks } from '@shared/components/layout/AuthCard';
import { useCommonStyles } from '@shared/theme/styles';
import PasswordFields from './PasswordFields';

export default function ChangePasswordView(c) {
  const s = useCommonStyles();

  return (
    <AuthCard
      title="비밀번호 변경"
      desc="초기 비밀번호를 바꾼 뒤 다른 화면을 이용할 수 있습니다."
      width={480}
      // 「로그아웃」 → 「뒤로가기」(2026-10-07). 이 화면은 로그인 직후에만 오므로 뒤로 가면 로그아웃하고 로그인 화면으로 갑니다
      footer={<AuthLinks links={[{ label: '뒤로가기', onPress: c.handleLogout }]} />}
    >
      <FormAlert tone="info">
        {`${c.name ? `${c.name}님(${c.empNo}), ` : ''}보안을 위해 처음 로그인할 때 비밀번호를 바꿔야 합니다. 새 비밀번호에는 사번을 넣을 수 없습니다.`}
      </FormAlert>

      {c.formError ? <FormAlert tone="error">{c.formError}</FormAlert> : null}

      <PasswordField
        label="현재 비밀번호"
        value={c.currentPassword}
        onChangeText={c.setCurrentPassword}
        placeholder="지금 쓰는 비밀번호"
        autoComplete="current-password"
        textContentType="password"
        error={c.fieldErrors.currentPassword}
        required
        full
      />

      <PasswordFields
        label="새 비밀번호"
        confirmLabel="새 비밀번호 확인"
        errorKey="newPassword"
        confirmKey="newPasswordConfirm"
        value={c.newPassword}
        onChange={c.setNewPassword}
        confirmValue={c.newPasswordConfirm}
        onChangeConfirm={c.setNewPasswordConfirm}
        fieldErrors={c.fieldErrors}
        onSubmitEditing={c.submit}
      />

      <Button
        label={c.pending ? '변경 중…' : '비밀번호 변경'}
        variant="primary"
        onPress={c.submit}
        disabled={c.pending}
        style={{ height: 40, marginTop: 2 }}
      />

      <Text style={[s.caption, { textAlign: 'center' }]}>
        비밀번호를 바꾸면 소속 부서에 허용된 화면으로 이동합니다.
      </Text>
    </AuthCard>
  );
}
