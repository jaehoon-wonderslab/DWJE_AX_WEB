/**
 * [Model] 비밀번호 찾기 리포지토리
 *
 * 흐름
 *   1) 본인 확인 + 코드 발송  POST /auth/password/forgot
 *   2) 코드 검증              POST /auth/email/verify-code  (purpose = PASSWORD_RESET)
 *   3) 새 비밀번호 설정       POST /auth/password/reset
 *
 * [보안] 1단계는 사번·이메일이 틀려도 성공 응답이 옵니다(계정 열거 방지).
 *        화면은 결과를 구분하지 말고 언제나 다음 단계로 넘어가야 합니다.
 */
import * as commonService from '@services/api/commonService';

/**
 * 본인 확인 후 인증 코드를 발송합니다.
 *
 * @param {{ empNo: string, email: string }} params
 * @returns {Promise<{ ok: boolean, sent?: object, res: object, message: string }>}
 *          sent — { email(마스킹), expireMinutes, message }
 */
export async function requestResetCode({ empNo, email }) {
  const res = await commonService.postAuthPasswordForgot({
    empNo: (empNo || '').trim(),
    email: (email || '').trim(),
  });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '인증 코드를 보내지 못했습니다.' };
  return { ok: true, sent: res.data, res, message: res.data.message || res.message };
}

/**
 * 새 비밀번호로 재설정합니다. 연속 실패로 잠긴 계정은 함께 풀립니다.
 *
 * @param {{ verificationToken: string, newPassword: string, newPasswordConfirm: string }} params
 * @returns {Promise<{ ok: boolean, result?: object, res: object, message: string }>}
 */
export async function resetPassword({ verificationToken, newPassword, newPasswordConfirm }) {
  const res = await commonService.postAuthPasswordReset({ verificationToken, newPassword, newPasswordConfirm });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '비밀번호를 재설정하지 못했습니다.' };
  return { ok: true, result: res.data, res, message: res.data.message || res.message };
}
