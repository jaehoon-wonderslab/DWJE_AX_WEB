/**
 * [Model] 비밀번호 정책 (도메인 규칙)
 *
 * 서버 `PasswordEncoderService` 의 `validatePolicy` 와 같은 규칙을 화면에서도 검사합니다.
 * 서버가 최종 판정자이고, 여기서는 왕복 없이 즉시 알려 주기 위해 미리 걸러 냅니다.
 *
 *  · 8자 이상
 *  · 공백 불가
 *  · 영문 · 숫자 · 특수문자 중 2종 이상 조합
 *  · 사번 포함 불가
 */

/** 최소 길이 — 서버 `app.security.password.min-length` 와 같은 값 */
export const PASSWORD_MIN_LENGTH = 8;

/** 화면에 그대로 노출하는 정책 안내 문구 */
export const PASSWORD_POLICY_TEXT = [
  `${PASSWORD_MIN_LENGTH}자 이상`,
  '공백 불가',
  '영문 · 숫자 · 특수문자 중 2종 이상 조합',
  '사번 포함 불가',
];

/**
 * 비밀번호가 정책에 맞는지 검사합니다.
 *
 * @param {string} password 검사할 비밀번호
 * @param {{ empNo?: string }} [context] 사번 포함 여부 검사용
 * @returns {string} 위반 사유. 문제가 없으면 빈 문자열
 */
export function checkPassword(password, { empNo } = {}) {
  const value = password ?? '';
  if (!value) return '비밀번호를 입력해 주세요.';
  if (value.length < PASSWORD_MIN_LENGTH) return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  if (/\s/.test(value)) return '비밀번호에 공백을 포함할 수 없습니다.';

  // 영문 · 숫자 · 특수문자 중 몇 종류를 썼는지 셉니다
  const kinds = [/[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (kinds < 2) return '비밀번호는 영문·숫자·특수문자 중 2종 이상을 조합해야 합니다.';

  if (empNo && value.toLowerCase().includes(String(empNo).toLowerCase())) {
    return '비밀번호에 사번을 포함할 수 없습니다.';
  }
  return '';
}

/**
 * 정책 충족도를 0~4 단계로 환산합니다. (입력 중 강도 막대 표시용)
 *
 * @param {string} password
 * @returns {{ level: number, label: string }}
 */
export function passwordStrength(password) {
  const value = password ?? '';
  if (!value) return { level: 0, label: '' };

  const kinds = [/[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  let level = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) level += 1;
  if (kinds >= 2) level += 1;
  if (kinds >= 3) level += 1;
  if (value.length >= 12) level += 1;

  return { level, label: ['매우 약함', '약함', '보통', '안전', '매우 안전'][level] };
}

/**
 * 사번 형식을 검사합니다. — 영문 · 숫자 · 하이픈 · 밑줄 4~30자
 *
 * 서버 `GET /auth/signup/check-emp-no` 는 형식을 보지 않으므로 화면에서 먼저 거릅니다.
 *
 * @param {string} empNo
 * @returns {string} 위반 사유. 문제가 없으면 빈 문자열
 */
export function checkEmpNoFormat(empNo) {
  const value = (empNo ?? '').trim();
  if (!value) return '사번을 입력해 주세요.';
  if (!/^[A-Za-z0-9_-]{4,30}$/.test(value)) {
    return '사번은 영문·숫자·하이픈·밑줄 4~30자로 입력해 주세요.';
  }
  return '';
}

/**
 * 이메일 형식을 검사합니다. — 서버 `EMAIL_PATTERN` 과 같은 규칙
 *
 * @param {string} email
 * @returns {string} 위반 사유. 문제가 없으면 빈 문자열
 */
export function checkEmailFormat(email) {
  const value = (email ?? '').trim();
  if (!value) return '이메일을 입력해 주세요.';
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return '이메일 형식이 올바르지 않습니다.';
  }
  return '';
}
