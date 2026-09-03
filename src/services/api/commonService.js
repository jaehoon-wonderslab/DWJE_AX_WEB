/**
 * 인증 · 공통 (마스터 조회 포함) 서비스 — API 21건
 *
 * 각 함수는 파라미터 객체 하나만 받습니다.
 * 경로 변수({param})는 이름이 같은 키에서 자동으로 채워지고, 나머지는
 * GET/DELETE 는 쿼리스트링, POST/PUT/PATCH 는 요청 바디로 전달됩니다.
 *
 * 사용 예)
 *   const res = await dashboardService.getDashboardAiSummary({ date: '2026-08-28' });
 *   if (res.success) setSummary(res.data);
 */
import { request } from './client';

/* ───────── 공통 ───────── */

/**
 * 로그인
 *
 * `POST /api/v1/auth/login`
 * @param {object} params loginId, password
 * @returns {Promise<object>} accessToken, refreshToken, user(empNo,name,dept,pos)
 * @remarks 로그인 성공/실패 모두 접속 이력 기록
 * @privateRemarks 접근 권한 비로그인 · 우선순위 1
 */
export function postAuthLogin(params) {
  return request('postAuthLogin', params);
}

/**
 * 로그아웃
 *
 * `POST /api/v1/auth/logout`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} success
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postAuthLogout(params) {
  return request('postAuthLogout', params);
}

/**
 * 토큰 갱신
 *
 * `POST /api/v1/auth/refresh`
 * @param {object} params refreshToken
 * @returns {Promise<object>} accessToken
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function postAuthRefresh(params) {
  return request('postAuthRefresh', params);
}

/**
 * 내 정보·권한 조회
 *
 * `GET /api/v1/auth/me`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} user, dept, menuPerms[], dataPerms[], servingModelVer
 * @remarks 메뉴/데이터 권한을 한 번에 반환 — 프론트 전 화면의 권한 판정 기준
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getAuthMe(params) {
  return request('getAuthMe', params);
}

/**
 * 계정 전환
 *
 * `POST /api/v1/auth/switch`
 * @param {object} params empNo
 * @returns {Promise<object>} accessToken, user
 * @remarks 프로토타입 데모 기능. 운영 전환 시 제외 또는 관리자 대행 로그인으로 한정
 * @privateRemarks 접근 권한 통합관리자 · 우선순위 3
 */
export function postAuthSwitch(params) {
  return request('postAuthSwitch', params);
}

/**
 * 계정 전환 대상 목록
 *
 * `GET /api/v1/auth/switch-targets`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} items[{empNo,name,dept,pos}]
 * @privateRemarks 접근 권한 통합관리자 · 우선순위 3
 */
export function getAuthSwitchTargets(params) {
  return request('getAuthSwitchTargets', params);
}

/**
 * 비밀번호 변경 (로그인 상태)
 *
 * `POST /api/v1/auth/password`
 * @param {object} params currentPassword, newPassword, newPasswordConfirm
 * @returns {Promise<object>} success, message
 * @remarks 비밀번호 찾기와 달리 현재 비밀번호를 확인합니다
 */
export function postAuthPassword(params) {
  return request('postAuthPassword', params);
}

/* ───────── 회원가입 · 비밀번호 찾기 (모두 비로그인 호출) ───────── */

/**
 * 사번 중복 확인
 *
 * `GET /api/v1/auth/signup/check-emp-no`
 * @param {object} params empNo
 * @returns {Promise<object>} empNo, available, message
 * @remarks 형식 검사는 서버가 하지 않으므로 화면에서 먼저 거릅니다
 */
export function getAuthSignupCheckEmpNo(params) {
  return request('getAuthSignupCheckEmpNo', params);
}

/**
 * 가입 가능 부서 목록
 *
 * `GET /api/v1/auth/signup/depts`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} depts[{deptId,deptNm,abbr,desc}]
 */
export function getAuthSignupDepts(params) {
  return request('getAuthSignupDepts', params);
}

/**
 * 이메일 인증 코드 발송
 *
 * `POST /api/v1/auth/email/send-code`
 * @param {object} params email, purpose(SIGNUP|PASSWORD_RESET)
 * @returns {Promise<object>} email(마스킹), expiresAt, expireMinutes, resendAvailableInSec
 */
export function postAuthEmailSendCode(params) {
  return request('postAuthEmailSendCode', params);
}

/**
 * 이메일 인증 코드 검증
 *
 * `POST /api/v1/auth/email/verify-code`
 * @param {object} params email, purpose, code
 * @returns {Promise<object>} verificationToken, purpose, expireMinutes
 */
export function postAuthEmailVerifyCode(params) {
  return request('postAuthEmailVerifyCode', params);
}

/**
 * 가입 신청
 *
 * `POST /api/v1/auth/signup`
 * @param {object} params empNo, name, deptId, pos, email, verificationToken, password, passwordConfirm
 * @returns {Promise<object>} empNo, email(마스킹), state(PENDING), message
 */
export function postAuthSignup(params) {
  return request('postAuthSignup', params);
}

/**
 * 비밀번호 찾기 — 인증 코드 발송
 *
 * `POST /api/v1/auth/password/forgot`
 * @param {object} params empNo, email
 * @returns {Promise<object>} email(마스킹), expireMinutes, message
 * @remarks 계정 열거 방지 — 일치하는 계정이 없어도 성공 응답이 옵니다
 */
export function postAuthPasswordForgot(params) {
  return request('postAuthPasswordForgot', params);
}

/**
 * 비밀번호 재설정
 *
 * `POST /api/v1/auth/password/reset`
 * @param {object} params verificationToken, newPassword, newPasswordConfirm
 * @returns {Promise<object>} success, empNo, message
 */
export function postAuthPasswordReset(params) {
  return request('postAuthPasswordReset', params);
}

/**
 * 실적 데이터 보유 기간 조회
 *
 * `GET /api/v1/common/data-range`
 * @param {object} [params] plantCd
 * @returns {Promise<object>} plantCd, fromDate, toDate
 * @remarks 앱 부팅 시 1회 호출해 날짜 선택기 기본값(toDate)을 잡습니다
 */
export function getCommonDataRange(params) {
  return request('getCommonDataRange', params);
}

/**
 * 메뉴 트리 조회
 *
 * `GET /api/v1/menus`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} groups[{group,solo,items[{id,name,tag}]}]
 * @remarks 접근 가능 항목만 반환
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getMenus(params) {
  return request('getMenus', params);
}

/**
 * 공통코드 조회
 *
 * `GET /api/v1/common/codes`
 * @param {object} params groupCd
 * @returns {Promise<object>} codes[{cd,nm,sort,useYn}]
 * @remarks 비가동 표준분류·불량유형·상태값 등
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getCommonCodes(params) {
  return request('getCommonCodes', params);
}

/**
 * 공정 목록 조회
 *
 * `GET /api/v1/common/masters/processes`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} processes[{id,name,pre,eqptCnt,targetYield,capacity}]
 * @remarks Press/A Plating/B Plating/Coating
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getCommonMastersProcesses(params) {
  return request('getCommonMastersProcesses', params);
}

/**
 * 설비 목록 조회
 *
 * `GET /api/v1/common/masters/equipments`
 * @param {object} params processId, keyword
 * @returns {Promise<object>} equipments[{eqptCd,eqptNm,wcCd,state}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getCommonMastersEquipments(params) {
  return request('getCommonMastersEquipments', params);
}

/**
 * 제품 목록 조회
 *
 * `GET /api/v1/common/masters/products`
 * @param {object} params keyword, familyCd, customerCd, projectCd, sort(rank|name|family), page, size
 * @returns {Promise<object>} products[{code,name,family,customer,project,rank,seq}], meta
 * @remarks 제품 선택 팝업(113종) 검색·필터·정렬 대응
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getCommonMastersProducts(params) {
  return request('getCommonMastersProducts', params);
}

/**
 * 고객사 목록 조회
 *
 * `GET /api/v1/common/masters/customers`
 * @param {object} [params] 요청 파라미터 없음
 * @returns {Promise<object>} customers[{code,name}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getCommonMastersCustomers(params) {
  return request('getCommonMastersCustomers', params);
}

/**
 * 불량 유형 목록 조회
 *
 * `GET /api/v1/common/masters/defect-types`
 * @param {object} params processId
 * @returns {Promise<object>} defectTypes[{code,name,category}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 1
 */
export function getCommonMastersDefectTypes(params) {
  return request('getCommonMastersDefectTypes', params);
}

/**
 * 금형 목록 조회
 *
 * `GET /api/v1/common/masters/molds`
 * @param {object} params eqptCd
 * @returns {Promise<object>} molds[{moldCd,moldNm,shotCnt,remainShot}]
 * @privateRemarks 접근 권한 전 부서 · 우선순위 2
 */
export function getCommonMastersMolds(params) {
  return request('getCommonMastersMolds', params);
}
