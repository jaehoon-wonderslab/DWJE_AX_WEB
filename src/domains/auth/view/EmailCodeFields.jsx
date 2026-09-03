/**
 * [View] 이메일 인증 코드 입력 단계 (회원가입 · 비밀번호 찾기 공용)
 *
 *  · 코드를 보낸 주소는 서버가 마스킹해서 준 값(ho**@dwje.co.kr)을 그대로 씁니다.
 *    원본 주소를 다시 표시하지 않습니다.
 *  · 남은 유효 시간과 재발송 대기 시간을 함께 보여 줍니다.
 *  · 재발송 버튼은 서버가 알려 준 대기 시간(60초) 동안 눌리지 않습니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Button, FormAlert, TextField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { formatCountdown } from '../controller/useEmailVerification';

/**
 * @param {object} props
 * @param {object} props.verification useEmailVerification 이 돌려준 객체
 * @param {string} [props.notice] 발송 직후 안내 문구 (계정 열거 방지 안내 등)
 */
export default function EmailCodeFields({ verification, notice }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { sentInfo, code, setCode, resendIn, expiresIn, expired, sending, verifying, formError, fieldErrors } = verification;

  return (
    <>
      <FormAlert tone={expired ? 'error' : 'info'}>
        {expired
          ? '인증 코드가 만료되었습니다. 코드를 다시 받아 주세요.'
          : notice || `${sentInfo?.email || '입력하신 주소'} 로 인증 코드를 보냈습니다. 메일함을 확인해 주세요.`}
      </FormAlert>

      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}

      <TextField
        label="인증 코드"
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="메일로 받은 6자리 숫자"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        error={fieldErrors.code}
        required
        full
      />

      {/* 남은 시간 · 재발송 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <Text style={[s.textXs, { fontSize: 11.5, color: expired ? theme.color.destructive : theme.color.mutedForeground }]}>
          {expired ? '유효 시간이 지났습니다' : `남은 시간 ${formatCountdown(expiresIn)}`}
        </Text>
        <Button
          label={resendIn > 0 ? `재발송 (${resendIn}초 후)` : '인증 코드 재발송'}
          size="sm"
          icon="refresh"
          disabled={resendIn > 0 || sending}
          onPress={verification.resend}
        />
      </View>

      {verifying ? <Text style={[s.textXs, { fontSize: 11.5 }]}>인증 코드를 확인하는 중입니다…</Text> : null}
    </>
  );
}
