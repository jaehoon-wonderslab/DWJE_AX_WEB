/**
 * [Controller] 비밀번호 찾기 화면 (CM-03)
 *
 * 3단계 마법사 + 완료 안내로 구성합니다.
 *   1 본인 확인   사번 · 등록 이메일 → 인증 코드 발송
 *   2 이메일 인증 코드 입력 → 검증 (1회용 verificationToken 확보)
 *   3 새 비밀번호 정책 검사 후 재설정
 *   4 완료        로그인 화면으로
 *
 * [보안] 1단계는 사번·이메일이 일치하지 않아도 성공 응답이 옵니다(계정 열거 방지).
 *        그래서 화면은 결과를 구분하지 않고 언제나 "메일을 확인하세요" 로 안내하고
 *        다음 단계로 넘어갑니다. 계정이 없으면 코드가 오지 않을 뿐입니다.
 */
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { needsReverify, toFormError } from '../model/authError';
import { PURPOSE } from '../model/emailVerifyRepository';
import { checkEmailFormat, checkPassword } from '../model/passwordPolicy';
import { requestResetCode, resetPassword } from '../model/passwordRepository';
import { useEmailVerification } from './useEmailVerification';

/** 마법사 단계 표시용 */
export const RESET_STEPS = [
  { title: '본인 확인', sub: '사번 · 이메일' },
  { title: '이메일 인증', sub: '인증 코드' },
  { title: '새 비밀번호', sub: '재설정' },
];

export function usePasswordResetController() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [empNo, setEmpNo] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);

  // 이메일 인증 단계 — 발송은 /auth/password/forgot 이 대신 처리합니다
  const sender = useCallback((args) => requestResetCode(args), []);
  const verification = useEmailVerification({ purpose: PURPOSE.PASSWORD_RESET, sender });

  // ── 1단계 : 본인 확인 ────────────────────────────────────

  const requestCode = useCallback(async () => {
    const errors = {};
    if (!empNo.trim()) errors.empNo = '사번을 입력해 주세요.';
    const emailError = checkEmailFormat(email);
    if (emailError) errors.email = emailError;
    if (Object.keys(errors).length) {
      setFormError('');
      setFieldErrors(errors);
      return;
    }

    setFormError('');
    setFieldErrors({});
    // 일치하는 계정이 없어도 성공 응답이 오므로, 결과와 무관하게 2단계로 넘어갑니다
    const sent = await verification.send({ empNo: empNo.trim(), email: email.trim() });
    if (sent) setStep(2);
  }, [empNo, email, verification]);

  // ── 2단계 : 이메일 인증 ──────────────────────────────────

  const goSetPassword = useCallback(async () => {
    const token = await verification.verify();
    if (token) {
      setFormError('');
      setFieldErrors({});
      setStep(3);
    }
  }, [verification]);

  // ── 3단계 : 새 비밀번호 ──────────────────────────────────

  const submit = useCallback(async () => {
    const errors = {};
    const policyError = checkPassword(newPassword, { empNo });
    if (policyError) errors.newPassword = policyError;
    else if (newPassword !== newPasswordConfirm) errors.newPasswordConfirm = '새 비밀번호와 확인이 일치하지 않습니다.';
    if (Object.keys(errors).length) {
      setFormError('');
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setFormError('');
    setFieldErrors({});
    try {
      const res = await resetPassword({
        verificationToken: verification.verificationToken,
        newPassword,
        newPasswordConfirm,
      });

      if (!res.ok) {
        // 토큰이 만료·재사용된 경우에만 코드 검증부터 다시
        // (입력값 오류는 서버가 토큰 소모까지 롤백하므로 같은 토큰으로 재요청하면 됩니다)
        if (needsReverify(res.res)) {
          verification.invalidate(res.message);
          setStep(2);
          return;
        }
        const mapped = toFormError(res.res, res.message);
        setFormError(mapped.formError);
        setFieldErrors(mapped.fieldErrors);
        return;
      }

      setResult(res.result);
      setStep(4);
    } finally {
      setPending(false);
    }
  }, [newPassword, newPasswordConfirm, empNo, verification]);

  return {
    step,
    steps: RESET_STEPS,
    result,
    empNo,
    setEmpNo: (v) => {
      setEmpNo(v);
      setFieldErrors((prev) => (prev.empNo ? { ...prev, empNo: '' } : prev));
    },
    email,
    setEmail: (v) => {
      setEmail(v);
      setFieldErrors((prev) => (prev.email ? { ...prev, email: '' } : prev));
    },
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    formError,
    fieldErrors,
    pending,
    verification,
    requestCode,
    goSetPassword,
    submit,
    goBackStep: () => setStep((s) => Math.max(1, s - 1)),
    goLogin: () => router.replace('/login'),
  };
}
