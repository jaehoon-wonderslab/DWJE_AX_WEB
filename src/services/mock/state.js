/**
 * 목 모드 공용 상태
 *
 * 목 응답은 순수 데이터지만, 등록·수정·삭제처럼 화면에서 바꾼 내용이
 * 같은 세션 안에서 유지되어야 하므로 여기에 모아 둡니다.
 * (실 서버 연동 시에는 이 파일 전체가 필요 없습니다)
 */
import { DEFAULT_USER, findUser } from '@shared/constants/accounts';
import { DATA_SCOPE_DEFAULT, MENU_ACCESS_DEFAULT } from '@shared/constants/dataFields';
import { loadSession } from '@shared/utils/authStorage';

/**
 * 새로고침 뒤의 현재 계정
 *
 * 이 파일의 상태는 메모리에만 있어 새로고침하면 사라지는데, 로그인 세션은 브라우저에 남습니다.
 * 그대로 두면 **화면은 제조팀인데 목은 통합관리자** 로 답해 권한이 있는 것처럼 보입니다
 * (마스킹이 통째로 풀립니다). 저장된 세션의 사번으로 맞춰 둡니다.
 * 실 서버는 토큰으로 계정을 알기 때문에 생기지 않는, 목 전용 보정입니다.
 */
function restoredUser() {
  const empNo = loadSession()?.userInfo?.empNo;
  return (empNo && findUser(empNo)) || DEFAULT_USER;
}

export const mockState = {
  /** 현재 로그인(또는 전환된) 계정 */
  currentUser: restoredUser(),

  /** 부서별 메뉴 접근 권한 (SY-02 에서 변경) */
  menuAccess: JSON.parse(JSON.stringify(MENU_ACCESS_DEFAULT)),

  /** 부서별 데이터 접근 권한 (SY-03 에서 변경) */
  dataScope: JSON.parse(JSON.stringify(DATA_SCOPE_DEFAULT)),


  /** 서비스 중인 AI 모델 버전 — /auth/me 응답과 사이드바 표기용 */
  servingModelVer: 'v1.4.0',

  /** 화면에서 추가·수정한 레코드를 담는 임시 저장소 (도메인별 목 파일이 채웁니다) */
  store: {},
};

/** 목 상태를 초기값으로 되돌립니다 (테스트·데모 재시작용) */
export function resetMockState() {
  mockState.currentUser = DEFAULT_USER;
  mockState.menuAccess = JSON.parse(JSON.stringify(MENU_ACCESS_DEFAULT));
  mockState.dataScope = JSON.parse(JSON.stringify(DATA_SCOPE_DEFAULT));
  mockState.servingModelVer = 'v1.4.0';
  mockState.store = {};
}
