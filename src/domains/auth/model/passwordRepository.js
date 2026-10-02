/**
 * [Model] 비밀번호 리포지토리 (비밀번호 찾기 · 계정 잠금 해제 · 로그인 상태 변경)
 *
 * 비밀번호 찾기 흐름
 *   1) 본인 확인 + 코드 발송  POST /auth/password/forgot
 *   2) 코드 검증              POST /auth/email/verify-code  (purpose = PASSWORD_RESET)
 *   3) 새 비밀번호 설정       POST /auth/password/reset
 *
 * 계정 잠금 해제 흐름 (2026-10-01 기획 AUD-16 — 로그인 5회 실패로 잠긴 계정)
 *   1) 사번으로 코드 발송     POST /auth/unlock/request
 *   2) 코드 검증              POST /auth/unlock/verify   (화면은 이메일 원문을 모르므로 사번으로)
 *   3) 새 비밀번호 + 해제     POST /auth/unlock/complete
 *
 * 로그인 상태 변경 (초기 비밀번호 변경 강제, 기획 R-04)
 *   POST /auth/password  — 현재 비밀번호 확인 후 변경
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

/**
 * 잠금 해제 인증 코드를 보냅니다.
 *
 * 계정이 없거나 잠기지 않았어도 같은 성공 응답이 옵니다(계정 열거 방지).
 *
 * @param {{ empNo: string }} params
 * @returns {Promise<{ ok: boolean, sent?: object, res: object, message: string }>}
 */
export async function requestUnlockCode({ empNo }) {
  const res = await commonService.postAuthUnlockRequest({ empNo: (empNo || '').trim() });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '인증 코드를 보내지 못했습니다.' };
  return { ok: true, sent: res.data, res, message: res.data.message || res.message };
}

/**
 * 잠금 해제 인증 코드를 검증하고 1회용 토큰을 받습니다.
 *
 * @param {{ empNo: string, code: string }} params
 * @returns {Promise<{ ok: boolean, verificationToken?: string, res: object, message: string }>}
 */
export async function verifyUnlockCode({ empNo, code }) {
  const res = await commonService.postAuthUnlockVerify({ empNo: (empNo || '').trim(), code: (code || '').trim() });
  if (!res.success || !res.data?.verificationToken) {
    return { ok: false, res, message: res.message || '인증 코드를 확인하지 못했습니다.' };
  }
  return { ok: true, verificationToken: res.data.verificationToken, res, message: res.message };
}

/**
 * 새 비밀번호를 정하고 잠금을 풉니다.
 *
 * @param {{ verificationToken: string, newPassword: string, newPasswordConfirm: string }} params
 * @returns {Promise<{ ok: boolean, result?: object, res: object, message: string }>}
 */
export async function completeUnlock({ verificationToken, newPassword, newPasswordConfirm }) {
  const res = await commonService.postAuthUnlockComplete({ verificationToken, newPassword, newPasswordConfirm });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '잠금을 해제하지 못했습니다.' };
  return { ok: true, result: res.data, res, message: res.data.message || res.message };
}

/**
 * 로그인 상태에서 본인 비밀번호를 바꿉니다. 초기 비밀번호 변경 강제(R-04)도 이것으로 풉니다.
 *
 * @param {{ currentPassword: string, newPassword: string, newPasswordConfirm: string }} params
 * @returns {Promise<{ ok: boolean, res: object, message: string }>}
 */
export async function changePassword({ currentPassword, newPassword, newPasswordConfirm }) {
  const res = await commonService.postAuthPassword({ currentPassword, newPassword, newPasswordConfirm });
  if (!res.success) return { ok: false, res, message: res.message || '비밀번호를 바꾸지 못했습니다.' };
  return { ok: true, res, message: res.data?.message || res.message || '비밀번호를 바꿨습니다.' };
}
