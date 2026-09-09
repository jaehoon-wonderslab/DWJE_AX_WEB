/**
 * [View] 회원가입 화면 (CM-03)
 *
 * 3단계 마법사 + 완료 안내입니다.
 *   1 기본 정보 → 2 이메일 인증 → 3 비밀번호 → 4 승인 대기 안내
 *
 * 가입이 끝나도 바로 로그인시키지 않습니다. 전산팀 승인 후에 쓸 수 있습니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Button, ButtonRow, FormAlert, KeyValue, SelectField, Steps, TextField } from '@shared/components/ui';
import AuthCard, { AuthLinks } from '@shared/components/layout/AuthCard';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { POSITION_OPTIONS } from '../model/signupRepository';
import EmailCodeFields from './EmailCodeFields';
import PasswordFields from './PasswordFields';

export default function SignupView(c) {
  const s = useCommonStyles();
  const theme = useTheme();

  // ── 4단계 : 완료 ─────────────────────────────────────────
  if (c.step === 4) {
    return (
      <AuthCard title="가입 신청이 접수되었습니다" desc="전산팀 승인 후 로그인할 수 있습니다." width={460}>
        <FormAlert tone="success">
          {c.result?.message || '가입 신청이 접수되었습니다. 전산팀 승인 후 로그인할 수 있습니다.'}
        </FormAlert>
        <KeyValue
          rows={[
            ['사번', c.result?.empNo || '-'],
            ['이메일', c.result?.email || '-'],
            ['상태', '승인 대기 (PENDING)'],
          ]}
        />
        <Text style={[s.textXs, { fontSize: 11.5, lineHeight: 18 }]}>
          승인 전에 로그인하면 「가입 승인 대기 중인 계정입니다」 안내가 표시됩니다. 승인이 늦어지면 전산팀에 문의해 주세요.
        </Text>
        <Button label="로그인 화면으로" variant="primary" onPress={c.goLogin} style={{ height: 40 }} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="회원가입"
      desc="가입 신청 후 전산팀 승인을 거쳐 사용할 수 있습니다."
      width={520}
      footer={<AuthLinks links={[{ text: '이미 계정이 있으신가요?', label: '로그인', onPress: c.goLogin }]} />}
    >
      <Steps items={c.steps} step={c.step} />

      {c.formError ? <FormAlert tone="error">{c.formError}</FormAlert> : null}

      {/* ── 1단계 : 기본 정보 ───────────────────────────── */}
      {c.step === 1 ? (
        <>
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <TextField
                label="사번"
                value={c.form.empNo}
                onChangeText={(v) => c.setField('empNo', v)}
                placeholder="영문·숫자 4~30자"
                autoCapitalize="none"
                error={c.fieldErrors.empNo}
                required
                style={{ flex: 1 }}
                full
              />
              <Button
                label={c.checkingEmpNo ? '확인 중…' : '중복 확인'}
                onPress={c.verifyEmpNo}
                disabled={c.checkingEmpNo}
                style={{ marginBottom: c.fieldErrors.empNo ? 21 : 0 }}
              />
            </View>
            {c.empNoCheck.checked && c.empNoCheck.available ? (
              <Text style={[s.textXs, { fontSize: 11.5, color: theme.color.success }]}>{c.empNoCheck.message}</Text>
            ) : null}
          </View>

          <TextField
            label="이름"
            value={c.form.name}
            onChangeText={(v) => c.setField('name', v)}
            placeholder="실명"
            error={c.fieldErrors.name}
            required
            full
          />

          <SelectField
            label="소속 부서"
            value={c.form.deptId}
            options={c.deptOptions}
            onChange={(v) => c.setField('deptId', v)}
            placeholder={c.deptsLoading ? '부서를 불러오는 중…' : '부서를 선택해 주세요'}
            error={c.fieldErrors.deptId}
            hint="접근 권한은 계정이 아니라 소속 부서 단위로 부여됩니다."
            required
            full
          />

          <SelectField
            label="직위"
            value={c.form.pos}
            options={POSITION_OPTIONS}
            onChange={(v) => c.setField('pos', v)}
            error={c.fieldErrors.pos}
            full
          />

          <TextField
            label="이메일"
            value={c.form.email}
            onChangeText={(v) => c.setField('email', v)}
            placeholder="예) 30001@dwje.co.kr"
            autoCapitalize="none"
            keyboardType="email-address"
            inputMode="email"
            autoComplete="email"
            error={c.fieldErrors.email}
            hint="이 주소로 인증 코드를 보냅니다. 한 주소로 여러 계정을 만들 수 없습니다."
            required
            full
          />

          <Button
            label={c.verification.sending ? '인증 코드 발송 중…' : '인증 코드 받기'}
            variant="primary"
            onPress={c.goVerifyEmail}
            disabled={c.verification.sending}
            style={{ height: 40, marginTop: 2 }}
          />
        </>
      ) : null}

      {/* ── 2단계 : 이메일 인증 ─────────────────────────── */}
      {c.step === 2 ? (
        <>
          <EmailCodeFields verification={c.verification} />
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

      {/* ── 3단계 : 비밀번호 · 가입 신청 ────────────────── */}
      {c.step === 3 ? (
        <>
          <FormAlert tone="success">
            {c.verification.sentInfo?.email || '이메일'} 인증이 완료되었습니다. 사용할 비밀번호를 정해 주세요.
          </FormAlert>

          <PasswordFields
            value={c.password}
            onChange={c.setPassword}
            confirmValue={c.passwordConfirm}
            onChangeConfirm={c.setPasswordConfirm}
            fieldErrors={c.fieldErrors}
            onSubmitEditing={c.submit}
          />

          <Button
            label={c.pending ? '가입 신청 중…' : '가입 신청'}
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
