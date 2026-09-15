/**
 * [Model] 인증 API 오류 → 화면 표시 형태로 변환
 *
 * 서버는 실패를 항상 같은 모양으로 내려줍니다.
 *   { success:false, code:'E-VALID-001', message:'…', error:{ code, message, field } }
 *
 * 규칙 (AUTH_API_FOR_WEB.md 1절)
 *   · `error.field` 가 있으면 → 그 입력란 아래에 표시
 *   · 없으면                  → 폼 상단에 표시
 */

/** 인증 코드 재검증이 필요한 오류 코드 — 업무 규칙 위반(만료·재사용·시도 초과) */
const RULE_ERROR = 'E-RULE-001';

/**
 * 실패 응답을 폼 오류 상태로 바꿉니다.
 *
 * @param {object} res ApiResponse
 * @param {string} [fallback] message 가 비어 있을 때 쓸 기본 문구
 * @returns {{ formError: string, fieldErrors: object }}
 */
export function toFormError(res, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.') {
  const message = res?.error?.message || res?.message || fallback;
  const field = res?.error?.field;
  return field ? { formError: '', fieldErrors: { [field]: message } } : { formError: message, fieldErrors: {} };
}

/**
 * 이메일 인증을 처음부터 다시 해야 하는 오류인지 판정합니다.
 *
 * verificationToken 은 1회용이라, 만료·재사용·목적 불일치로 거절되면
 * 폼에 머물러 있어 봐야 다시 실패합니다. 이때만 코드 검증 단계로 되돌립니다.
 * (비밀번호 정책 같은 입력값 오류는 토큰이 살아 있으므로 폼에 그대로 머무릅니다)
 *
 * @param {object} res ApiResponse
 * @returns {boolean}
 */
export function needsReverify(res) {
  const code = res?.error?.code || res?.code;
  if (code !== RULE_ERROR) return false;
  const message = res?.error?.message || res?.message || '';
  return /인증|토큰/.test(message);
}
