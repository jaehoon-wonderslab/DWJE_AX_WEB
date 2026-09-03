/**
 * 가입 계정 (데모 데이터)
 *
 * 접근 권한은 계정이 아니라 소속 부서 단위로 관리되고, 각 계정은 부서 권한을 상속합니다.
 * switchable:true 인 계정은 우측 상단 계정 전환 메뉴(CM-02)에 노출됩니다.
 *
 * [운영 전환 시] CM-02 계정 전환은 명세상 우선순위 3(프로토타입 데모 기능)이며
 * 실제 운영에서는 로그인/SSO 로 대체됩니다. 그때 이 목록은 제거하고
 * 로그인 응답(POST /api/v1/auth/login)의 사용자 정보만 사용하세요.
 */
export const USERS = [
  { empNo: '20180412', name: '김선영', dept: '품질보증팀', pos: '팀장', state: '사용', lastLoginAt: '2026-08-28 08:12', switchable: true },
  { empNo: '20210133', name: '이수민', dept: '품질보증팀', pos: '선임', state: '사용', lastLoginAt: '2026-08-28 07:58' },
  { empNo: '20190271', name: '박지훈', dept: '품질보증팀', pos: '사원', state: '사용', lastLoginAt: '2026-08-27 17:40' },
  { empNo: '20170905', name: '정우진', dept: '생산관리팀', pos: '팀장', state: '사용', lastLoginAt: '2026-08-28 08:05', switchable: true },
  { empNo: '20220418', name: '최민아', dept: '생산관리팀', pos: '사원', state: '사용', lastLoginAt: '2026-08-28 06:42' },
  { empNo: '20160722', name: '강민석', dept: '제조팀', pos: '팀장', state: '사용', lastLoginAt: '2026-08-28 06:10', switchable: true },
  { empNo: '20230201', name: '오세훈', dept: '제조팀', pos: '반장', state: '사용', lastLoginAt: '2026-08-28 06:08' },
  { empNo: '20240517', name: '윤가람', dept: '제조팀', pos: '사원', state: '정지', lastLoginAt: '2026-07-31 18:22' },
  { empNo: '20150310', name: '한도현', dept: '전산팀', pos: '팀장', state: '사용', lastLoginAt: '2026-08-28 09:01', switchable: true },
  { empNo: '20200826', name: '서지안', dept: '전산팀', pos: '선임', state: '사용', lastLoginAt: '2026-08-28 08:44' },
  { empNo: '20110204', name: '최영도', dept: '경영진', pos: '이사', state: '사용', lastLoginAt: '2026-08-27 20:15', switchable: true },
  { empNo: '20130619', name: '임태경', dept: '경영진', pos: '상무', state: '사용', lastLoginAt: '2026-08-25 11:03' },
  { empNo: '20140901', name: '시스템', dept: '통합관리자', pos: '관리자', state: '사용', lastLoginAt: '2026-08-28 09:10', switchable: true },
];

/** 계정 전환 메뉴에 노출할 계정 (사용 중이며 switchable 인 계정만) */
export const switchableUsers = () => USERS.filter((u) => u.switchable && u.state === '사용');

/** 기본 로그인 계정 — 목 모드에서 자동 로그인에 사용합니다 */
export const DEFAULT_USER = USERS.find((u) => u.empNo === '20140901');

export function findUser(empNo) {
  return USERS.find((u) => u.empNo === empNo);
}

/**
 * 직위 코드 → 표기 (서버 `position_cd`)
 *
 * 로그인·계정 전환 응답의 `pos` 는 코드값으로 오므로 화면에 그릴 때 이 표로 바꿉니다.
 */
export const POSITIONS = [
  { code: 'STAFF', label: '사원' },
  { code: 'SENIOR', label: '선임' },
  { code: 'FOREMAN', label: '반장' },
  { code: 'LEADER', label: '팀장' },
  { code: 'DIRECTOR', label: '임원' },
  { code: 'ADMIN', label: '관리자' },
];

/**
 * 직위 코드를 표기로 바꿉니다. 모르는 값(이미 한글인 데모 데이터 등)은 그대로 돌려줍니다.
 * @param {string} code
 */
export function positionLabel(code) {
  return POSITIONS.find((p) => p.code === code)?.label || code || '';
}
