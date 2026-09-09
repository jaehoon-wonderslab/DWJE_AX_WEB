/**
 * [Model] 인증 리포지토리
 *
 * 화면·컨트롤러는 API 서비스 함수를 직접 부르지 않고 이 리포지토리를 씁니다.
 * API 응답 형태가 바뀌면 이 파일만 고치면 됩니다.
 *
 * 실패했을 때 원본 응답(`res`)을 함께 돌려줍니다.
 * 컨트롤러가 `error.field` 로 입력란별 오류를 붙일 수 있어야 하기 때문입니다.
 */
import * as commonService from '@services/api/commonService';

/**
 * 로그인
 *
 * 실패 메시지는 서버 문구를 그대로 노출합니다.
 * 사번이 없는 경우와 비밀번호가 틀린 경우의 문구가 의도적으로 같으므로(계정 열거 방지)
 * 화면에서 두 경우를 구분해 보여주면 안 됩니다.
 *
 * @param {{ loginId: string, password?: string }} credential
 * @returns {Promise<{ ok: boolean, user?: object, tokens?: object, res: object, message: string }>}
 */
export async function login({ loginId, password = '' }) {
  const res = await commonService.postAuthLogin({ loginId: (loginId || '').trim(), password });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '로그인에 실패했습니다.' };
  return {
    ok: true,
    user: res.data.user,
    tokens: {
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      expiresIn: res.data.expiresIn,
    },
    res,
    message: res.message,
  };
}

/**
 * 내 정보 · 권한 조회 (메뉴 권한 + 데이터 권한을 한 번에)
 * @returns {Promise<{ ok: boolean, me?: object, res: object, message: string }>}
 */
export async function fetchMe() {
  const res = await commonService.getAuthMe();
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '권한 조회에 실패했습니다.' };
  return { ok: true, me: res.data, res, message: res.message };
}

/**
 * 계정 전환 (CM-02 · 프로토타입 데모 기능)
 * @param {string} empNo 전환할 계정의 사번
 */
export async function switchAccount(empNo) {
  const res = await commonService.postAuthSwitch({ empNo });
  if (!res.success || !res.data) return { ok: false, res, message: res.message || '계정 전환에 실패했습니다.' };
  return {
    ok: true,
    user: res.data.user,
    perms: res.data,
    tokens: { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken },
    res,
    message: res.message,
  };
}

/**
 * 계정 전환 대상 목록 (통합관리자 전용)
 * @returns {Promise<Array<{empNo,name,dept,pos}>>}
 */
export async function fetchSwitchTargets() {
  const res = await commonService.getAuthSwitchTargets();
  return Array.isArray(res?.data) ? res.data : [];
}

/** 로그아웃 */
export async function logout() {
  const res = await commonService.postAuthLogout();
  return { ok: res.success, res, message: res.message };
}
