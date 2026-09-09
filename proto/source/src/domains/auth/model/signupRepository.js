/**
 * [Model] 회원가입 리포지토리
 *
 * 가입은 「사번 확인 → 이메일 인증 → 가입 신청」 3단계이고,
 * 신청이 끝나도 바로 로그인되지 않습니다. 전산팀 승인(PENDING → ACTIVE) 후에 쓸 수 있습니다.
 */
import { POSITIONS } from '@shared/constants/accounts';
import * as commonService from '@services/api/commonService';

/**
 * 사번 중복 여부를 확인합니다.
 *
 * @param {string} empNo
 * @returns {Promise<{ ok: boolean, available: boolean, res: object, message: string }>}
 */
export async function checkEmpNo(empNo) {
  const res = await commonService.getAuthSignupCheckEmpNo({ empNo: (empNo || '').trim() });
  if (!res.success || !res.data) {
    return { ok: false, available: false, res, message: res.message || '사번을 확인하지 못했습니다.' };
  }
  return { ok: true, available: !!res.data.available, res, message: res.data.message || res.message };
}

/**
 * 가입 신청이 가능한 부서 목록을 조회합니다. (통합관리자 부서는 제외되어 옵니다)
 *
 * @returns {Promise<Array<{ value: number, label: string, desc: string }>>} SelectField 용 형태
 */
export async function fetchSignupDepts() {
  const res = await commonService.getAuthSignupDepts();
  const depts = res?.data?.depts || [];
  return depts.map((d) => ({ value: d.deptId, label: d.deptNm, desc: d.desc || '' }));
}

/**
 * 가입을 신청합니다.
 *
 * @param {object} form empNo, name, deptId, pos, email, verificationToken, password, passwordConfirm
 * @returns {Promise<{ ok: boolean, result?: object, res: object, message: string }>}
 *          result — { empNo, email(마스킹), state:'PENDING', message }
 */
export async function submitSignup(form) {
  const res = await commonService.postAuthSignup({
    empNo: (form.empNo || '').trim(),
    name: (form.name || '').trim(),
    deptId: form.deptId,
    pos: form.pos || 'STAFF',
    email: (form.email || '').trim(),
    verificationToken: form.verificationToken,
    password: form.password,
    passwordConfirm: form.passwordConfirm,
  });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '가입 신청에 실패했습니다.' };
  return { ok: true, result: res.data, res, message: res.data.message || res.message };
}

/** 직위 선택지 — 관리자(ADMIN)는 스스로 신청할 수 없으므로 뺍니다 */
export const POSITION_OPTIONS = POSITIONS.filter((p) => p.code !== 'ADMIN').map((p) => ({ value: p.code, label: p.label }));
