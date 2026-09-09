/**
 * [Controller] 회원가입 화면 (CM-03)
 *
 * 3단계 마법사 + 완료 안내로 구성합니다.
 *   1 기본 정보  사번(중복 확인) · 이름 · 부서 · 직위 · 이메일
 *   2 이메일 인증 코드 발송 → 입력 → 검증 (1회용 verificationToken 확보)
 *   3 비밀번호  정책 검사 후 가입 신청
 *   4 완료      전산팀 승인 대기 안내 — 바로 로그인시키지 않습니다
 *
 * [주의] verificationToken 은 가입 성공 시점에 소모되는 1회용입니다.
 *        입력값 오류로 실패하면 서버가 토큰 소모까지 롤백하므로 같은 토큰으로 다시 요청하면 됩니다.
 *        만료·재사용으로 거절될 때만(needsReverify) 2단계로 되돌립니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAsync } from '@shared/hooks/useAsync';
import { needsReverify, toFormError } from '../model/authError';
import { PURPOSE, sendCode } from '../model/emailVerifyRepository';
import { checkEmailFormat, checkEmpNoFormat, checkPassword } from '../model/passwordPolicy';
import { checkEmpNo, fetchSignupDepts, submitSignup } from '../model/signupRepository';
import { useEmailVerification } from './useEmailVerification';

/** 마법사 단계 표시용 */
export const SIGNUP_STEPS = [
  { title: '기본 정보', sub: '사번 · 부서' },
  { title: '이메일 인증', sub: '인증 코드' },
  { title: '비밀번호', sub: '가입 신청' },
];

export function useSignupController() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ empNo: '', name: '', deptId: null, pos: 'STAFF', email: '' });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [pending, setPending] = useState(false);

  /** 사번 중복 확인 결과 — { checked, available, message } */
  const [empNoCheck, setEmpNoCheck] = useState({ checked: false, available: false, message: '' });
  const [checkingEmpNo, setCheckingEmpNo] = useState(false);

  /** 가입 완료 결과 — { empNo, email(마스킹), state, message } */
  const [result, setResult] = useState(null);

  // 부서 목록 (통합관리자 부서는 서버에서 이미 빠져 옵니다)
  const { data: depts, loading: deptsLoading } = useAsync(fetchSignupDepts, [], { initialData: [] });

  // 이메일 인증 단계 — 발송 방식만 주입하고 나머지는 공용 훅이 처리합니다
  const sender = useCallback(({ email }) => sendCode({ email, purpose: PURPOSE.SIGNUP }), []);
  const verification = useEmailVerification({ purpose: PURPOSE.SIGNUP, sender });

  /** 입력값 하나를 바꾸면서 그 칸의 오류 표시는 지웁니다 */
  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
    if (key === 'empNo') setEmpNoCheck({ checked: false, available: false, message: '' });
  }, []);

  // ── 1단계 : 기본 정보 ────────────────────────────────────

  /** 사번 중복 확인 — 형식은 서버가 보지 않으므로 화면에서 먼저 거릅니다 */
  const verifyEmpNo = useCallback(async () => {
    const formatError = checkEmpNoFormat(form.empNo);
    if (formatError) {
      setFieldErrors((prev) => ({ ...prev, empNo: formatError }));
      setEmpNoCheck({ checked: false, available: false, message: '' });
      return;
    }
    setCheckingEmpNo(true);
    try {
      const res = await checkEmpNo(form.empNo);
      if (!res.ok) {
        setFieldErrors((prev) => ({ ...prev, empNo: res.message }));
        return;
      }
      setEmpNoCheck({ checked: true, available: res.available, message: res.message });
      setFieldErrors((prev) => ({ ...prev, empNo: res.available ? '' : res.message }));
    } finally {
      setCheckingEmpNo(false);
    }
  }, [form.empNo]);

  /** 1단계 입력값을 검사합니다 */
  const validateBasics = useCallback(() => {
    const errors = {};
    errors.empNo = checkEmpNoFormat(form.empNo);
    if (!errors.empNo && !empNoCheck.checked) errors.empNo = '사번 중복 확인을 먼저 해 주세요.';
    if (!errors.empNo && !empNoCheck.available) errors.empNo = empNoCheck.message || '이미 사용 중인 사번입니다.';
    if (!form.name.trim()) errors.name = '이름을 입력해 주세요.';
    if (!form.deptId) errors.deptId = '소속 부서를 선택해 주세요.';
    errors.email = checkEmailFormat(form.email);

    const cleaned = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
    setFieldErrors(cleaned);
    setFormError('');
    return Object.keys(cleaned).length === 0;
  }, [form, empNoCheck]);

  /** 1단계 → 2단계 : 검사를 통과하면 인증 코드를 보냅니다 */
  const goVerifyEmail = useCallback(async () => {
    if (!validateBasics()) return;
    const sent = await verification.send({ email: form.email.trim() });
    if (sent) setStep(2);
  }, [validateBasics, verification, form.email]);

  // ── 2단계 : 이메일 인증 ──────────────────────────────────

  /** 2단계 → 3단계 : 코드를 검증해 1회용 토큰을 확보합니다 */
  const goSetPassword = useCallback(async () => {
    const token = await verification.verify();
    if (token) {
      setFormError('');
      setFieldErrors({});
      setStep(3);
    }
  }, [verification]);

  // ── 3단계 : 비밀번호 · 가입 신청 ─────────────────────────

  const submit = useCallback(async () => {
    // 1. 정책은 화면에서 먼저 검사해 왕복을 줄입니다 (최종 판정은 서버)
    const errors = {};
    const policyError = checkPassword(password, { empNo: form.empNo });
    if (policyError) errors.password = policyError;
    else if (password !== passwordConfirm) errors.passwordConfirm = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
    if (Object.keys(errors).length) {
      setFormError('');
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    setFormError('');
    setFieldErrors({});
    try {
      const res = await submitSignup({
        ...form,
        verificationToken: verification.verificationToken,
        password,
        passwordConfirm,
      });

      if (!res.ok) {
        // 2. 토큰이 만료·재사용된 경우에만 코드 검증부터 다시
        //    (입력값 오류는 서버가 토큰 소모까지 롤백하므로 같은 토큰으로 재요청하면 됩니다)
        if (needsReverify(res.res)) {
          verification.invalidate(res.message);
          setStep(2);
          return;
        }
        const mapped = toFormError(res.res, res.message);
        setFormError(mapped.formError);
        setFieldErrors(mapped.fieldErrors);
        // 사번·부서 오류는 1단계 입력란이므로 그 단계로 되돌립니다
        if (mapped.fieldErrors.empNo || mapped.fieldErrors.deptId || mapped.fieldErrors.email) setStep(1);
        return;
      }

      // 3. 가입 완료 — 승인 대기 안내로 보냅니다 (바로 로그인시키지 않습니다)
      setResult(res.result);
      setStep(4);
    } finally {
      setPending(false);
    }
  }, [form, password, passwordConfirm, verification]);

  const deptOptions = useMemo(() => depts || [], [depts]);

  return {
    // 단계
    step,
    steps: SIGNUP_STEPS,
    result,
    // 입력값
    form,
    setField,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    deptOptions,
    deptsLoading,
    // 사번 확인
    empNoCheck,
    checkingEmpNo,
    verifyEmpNo,
    // 오류 · 진행 상태
    formError,
    fieldErrors,
    pending,
    // 이메일 인증 (공용 훅)
    verification,
    // 동작
    goVerifyEmail,
    goSetPassword,
    submit,
    goBackStep: () => setStep((s) => Math.max(1, s - 1)),
    goLogin: () => router.replace('/login'),
  };
}
