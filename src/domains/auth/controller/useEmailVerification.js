/**
 * [Controller] 이메일 인증 단계 (회원가입 · 비밀번호 찾기 공용)
 *
 * 두 화면이 똑같이 「코드 발송 → 남은 시간 표시 → 코드 입력 → 검증 → 1회용 토큰 확보」를
 * 거치므로 그 부분만 이 훅으로 묶었습니다. 발송 방식만 화면마다 달라서 `sender` 로 주입받습니다.
 *
 *  · 회원가입   sender = ({email}) => emailVerifyRepository.sendCode({ email, purpose:'SIGNUP' })
 *  · 비번 찾기  sender = ({empNo,email}) => passwordRepository.requestResetCode({ empNo, email })
 *
 * 재발송 버튼은 서버가 알려 준 `resendAvailableInSec`(60초) 동안 눌리지 않습니다.
 * 서버도 막지만 화면에서 먼저 막아야 사용자가 헷갈리지 않습니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toFormError } from '../model/authError';
import { verifyCode } from '../model/emailVerifyRepository';

/** 서버가 재발송 대기 시간을 알려 주지 않을 때 쓰는 기본값 (초) */
const DEFAULT_RESEND_WAIT_SEC = 60;
/** 인증 코드 기본 유효 시간 (분) */
const DEFAULT_EXPIRE_MINUTES = 5;

/**
 * @param {object} params
 * @param {string} params.purpose  SIGNUP | PASSWORD_RESET
 * @param {Function} params.sender 코드 발송 함수 — { ok, sent, res, message } 를 돌려줘야 합니다
 */
export function useEmailVerification({ purpose, sender }) {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentInfo, setSentInfo] = useState(null); // { email(마스킹), message }
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // 남은 시간(초) — 재발송 대기 · 코드 유효 시간
  const [resendIn, setResendIn] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  // 마지막 발송 인자 — 재발송 때 그대로 다시 씁니다
  const lastArgs = useRef(null);

  // 1초마다 두 카운트다운을 함께 줄입니다 (타이머 하나로 처리)
  useEffect(() => {
    if (resendIn <= 0 && expiresIn <= 0) return undefined;
    const timer = setInterval(() => {
      setResendIn((v) => (v > 0 ? v - 1 : 0));
      setExpiresIn((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn > 0, expiresIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 인증 코드를 발송합니다.
   * @param {object} args sender 에 그대로 전달할 인자 ({ email } 또는 { empNo, email })
   * @returns {Promise<boolean>} 발송 성공 여부
   */
  const send = useCallback(
    async (args) => {
      setSending(true);
      setFormError('');
      setFieldErrors({});
      try {
        const res = await sender(args);
        if (!res.ok) {
          const mapped = toFormError(res.res, res.message);
          setFormError(mapped.formError);
          setFieldErrors(mapped.fieldErrors);
          return false;
        }
        lastArgs.current = args;
        setSentInfo(res.sent);
        setCode('');
        setVerificationToken('');
        setResendIn(Number(res.sent?.resendAvailableInSec ?? DEFAULT_RESEND_WAIT_SEC));
        setExpiresIn(Number(res.sent?.expireMinutes ?? DEFAULT_EXPIRE_MINUTES) * 60);
        return true;
      } finally {
        setSending(false);
      }
    },
    [sender]
  );

  /** 같은 주소로 코드를 다시 보냅니다 (대기 시간이 남아 있으면 아무 일도 하지 않습니다) */
  const resend = useCallback(async () => {
    if (resendIn > 0 || !lastArgs.current) return false;
    return send(lastArgs.current);
  }, [resendIn, send]);

  /**
   * 입력한 코드를 검증하고 1회용 토큰을 확보합니다.
   * @returns {Promise<string>} verificationToken. 실패하면 빈 문자열
   */
  const verify = useCallback(async () => {
    if (!code.trim()) {
      setFieldErrors({ code: '인증 코드를 입력해 주세요.' });
      return '';
    }
    setVerifying(true);
    setFormError('');
    setFieldErrors({});
    try {
      const res = await verifyCode({ email: lastArgs.current?.email, purpose, code });
      if (!res.ok) {
        const mapped = toFormError(res.res, res.message);
        setFormError(mapped.formError);
        setFieldErrors(mapped.fieldErrors);
        return '';
      }
      setVerificationToken(res.verificationToken);
      return res.verificationToken;
    } finally {
      setVerifying(false);
    }
  }, [code, purpose]);

  /**
   * 인증 결과를 버리고 코드 입력 상태로 되돌립니다.
   * 1회용 토큰이 만료·재사용으로 거절됐을 때 씁니다.
   * @param {string} [message] 폼 상단에 띄울 안내
   */
  const invalidate = useCallback((message = '') => {
    setVerificationToken('');
    setCode('');
    setFormError(message);
    setFieldErrors({});
  }, []);

  /** 처음 상태로 되돌립니다 (다른 이메일로 다시 시작) */
  const reset = useCallback(() => {
    setSentInfo(null);
    setCode('');
    setVerificationToken('');
    setFormError('');
    setFieldErrors({});
    setResendIn(0);
    setExpiresIn(0);
    lastArgs.current = null;
  }, []);

  return {
    // 상태
    sending,
    verifying,
    sentInfo, // 서버가 마스킹해서 준 이메일이 들어 있습니다 — 원본을 다시 표시하지 마세요
    code,
    setCode,
    verificationToken,
    verified: !!verificationToken,
    formError,
    setFormError,
    fieldErrors,
    setFieldErrors,
    resendIn,
    expiresIn,
    expired: !!sentInfo && expiresIn <= 0,
    // 동작
    send,
    resend,
    verify,
    invalidate,
    reset,
  };
}

/**
 * 남은 초를 `4:05` 형태로 바꿉니다.
 * @param {number} sec
 */
export function formatCountdown(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
