/**
 * [View] 비밀번호 찾기 화면 (CM-03)
 *
 * 3단계 마법사 + 완료 안내입니다.
 *   1 본인 확인 → 2 이메일 인증 → 3 새 비밀번호 → 4 완료
 *
 * [보안] 1단계는 사번·이메일이 일치하지 않아도 성공 응답이 옵니다(계정 열거 방지).
 *        그래서 언제나 "메일을 확인하세요" 로 안내하고 다음 단계로 넘어갑니다.
 */
import React from 'react';
import { Text } from 'react-native';
import { Button, ButtonRow, FormAlert, Steps, TextField } from '@shared/components/ui';
import AuthCard, { AuthLinks } from '@shared/components/layout/AuthCard';
import { useCommonStyles } from '@shared/theme/styles';
import EmailCodeFields from './EmailCodeFields';
import PasswordFields from './PasswordFields';

export default function PasswordResetView(c) {
  const s = useCommonStyles();

  // ── 4단계 : 완료 ─────────────────────────────────────────
  if (c.step === 4) {
    return (
      <AuthCard title="비밀번호가 재설정되었습니다" desc="새 비밀번호로 로그인해 주세요." width={440}>
        <FormAlert tone="success">
          {c.result?.message || '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.'}
        </FormAlert>
        <Text style={[s.textXs, { fontSize: 11.5, lineHeight: 18 }]}>
          연속 로그인 실패로 정지된 계정이었다면 이번 재설정으로 함께 풀립니다.
        </Text>
        <Button label="로그인 화면으로" variant="primary" onPress={c.goLogin} style={{ height: 40 }} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="비밀번호 찾기"
      desc="등록된 이메일로 본인 확인 후 비밀번호를 다시 설정합니다."
      width={480}
      footer={<AuthLinks links={[{ label: '로그인으로 돌아가기', onPress: c.goLogin }]} />}
    >
      <Steps items={c.steps} step={c.step} />

      {c.formError ? <FormAlert tone="error">{c.formError}</FormAlert> : null}

      {/* ── 1단계 : 본인 확인 ───────────────────────────── */}
      {c.step === 1 ? (
        <>
          <TextField
            label="사번"
            value={c.empNo}
            onChangeText={c.setEmpNo}
            placeholder="예) 10001"
            autoCapitalize="none"
            autoComplete="username"
            error={c.fieldErrors.empNo}
            required
            full
          />
          <TextField
            label="등록된 이메일"
            value={c.email}
            onChangeText={c.setEmail}
            placeholder="예) 10001@dwje.co.kr"
            autoCapitalize="none"
            keyboardType="email-address"
            inputMode="email"
            autoComplete="email"
            error={c.fieldErrors.email}
            hint="가입할 때 등록한 주소와 같아야 인증 코드가 발송됩니다."
            onSubmitEditing={c.requestCode}
            required
            full
          />
          <Button
            label={c.verification.sending ? '인증 코드 발송 중…' : '인증 코드 받기'}
            variant="primary"
            onPress={c.requestCode}
            disabled={c.verification.sending}
            style={{ height: 40, marginTop: 2 }}
          />
          <Text style={[s.textXs, { fontSize: 11, lineHeight: 17 }]}>
            보안을 위해 입력한 정보가 실제 계정과 일치하는지 알려 주지 않습니다. 일치하는 계정이 있을 때만 코드가 발송됩니다.
          </Text>
        </>
      ) : null}

      {/* ── 2단계 : 이메일 인증 ─────────────────────────── */}
      {c.step === 2 ? (
        <>
          <EmailCodeFields
            verification={c.verification}
            notice={
              c.verification.sentInfo?.message ||
              '입력하신 정보와 일치하는 계정이 있으면 인증 코드를 보냈습니다. 메일함을 확인해 주세요.'
            }
          />
          <ButtonRow style={{ marginTop: 2 }}>
            <Button label="이전" onPress={c.goBackStep} style={{ flex: 1, height: 40 }} />
            <Button
              label={c.verification.verifying ? '확인 중…' : '인증 확인'}
              variant="primary"
              onPress={c.goSetPassword}
              disabled={c.verification.verifying || c.verification.expired}
              style={{ flex: 2, height: 40 }}
            />
          </ButtonRow>
        </>
      ) : null}

      {/* ── 3단계 : 새 비밀번호 ─────────────────────────── */}
      {c.step === 3 ? (
        <>
          <FormAlert tone="success">본인 확인이 끝났습니다. 새로 사용할 비밀번호를 정해 주세요.</FormAlert>

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
        </>
      ) : null}
    </AuthCard>
  );
}
