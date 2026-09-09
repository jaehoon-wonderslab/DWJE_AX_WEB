/**
 * [Model] 이메일 인증 리포지토리 (회원가입 · 비밀번호 찾기 공용)
 *
 * 흐름
 *   1) 코드 발송  POST /auth/email/send-code    → 만료 시각 · 재발송 대기 시간
 *   2) 코드 검증  POST /auth/email/verify-code  → 1회용 verificationToken
 *   3) 본 처리(가입 · 재설정)에 토큰을 실어 보냄
 */
import * as commonService from '@services/api/commonService';

/** 인증 목적 — 서버 화이트리스트와 같은 값 */
export const PURPOSE = {
  SIGNUP: 'SIGNUP',
  PASSWORD_RESET: 'PASSWORD_RESET',
};

/**
 * 인증 코드를 발송합니다. (회원가입용)
 *
 * @param {{ email: string, purpose: string }} params
 * @returns {Promise<{ ok: boolean, sent?: object, res: object, message: string }>}
 *          sent — { email(마스킹), expiresAt, expireMinutes, resendAvailableInSec }
 */
export async function sendCode({ email, purpose }) {
  const res = await commonService.postAuthEmailSendCode({ email, purpose });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '인증 코드를 보내지 못했습니다.' };
  return { ok: true, sent: res.data, res, message: res.message };
}

/**
 * 인증 코드를 검증하고 1회용 토큰을 받습니다.
 *
 * @param {{ email: string, purpose: string, code: string }} params
 * @returns {Promise<{ ok: boolean, verificationToken?: string, res: object, message: string }>}
 */
export async function verifyCode({ email, purpose, code }) {
  const res = await commonService.postAuthEmailVerifyCode({ email, purpose, code: (code || '').trim() });
  if (!res.success || !res.data?.verificationToken) {
    return { ok: false, res, message: res.message || '인증 코드를 확인하지 못했습니다.' };
  }
  return { ok: true, verificationToken: res.data.verificationToken, res, message: res.message };
}
