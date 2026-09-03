/**
 * 목 모드 공용 상태
 *
 * 목 응답은 순수 데이터지만, 등록·수정·삭제처럼 화면에서 바꾼 내용이
 * 같은 세션 안에서 유지되어야 하므로 여기에 모아 둡니다.
 * (실 서버 연동 시에는 이 파일 전체가 필요 없습니다)
 */
import { DEFAULT_USER } from '@shared/constants/accounts';
import { DATA_SCOPE_DEFAULT, MENU_ACCESS_DEFAULT } from '@shared/constants/dataFields';
import { FAMILY_ORDER_DEFAULT } from './data/masters';

export const mockState = {
  /** 현재 로그인(또는 전환된) 계정 */
  currentUser: DEFAULT_USER,

  /** 부서별 메뉴 접근 권한 (SY-02 에서 변경) */
  menuAccess: JSON.parse(JSON.stringify(MENU_ACCESS_DEFAULT)),

  /** 부서별 데이터 접근 권한 (SY-03 에서 변경) */
  dataScope: JSON.parse(JSON.stringify(DATA_SCOPE_DEFAULT)),

  /** 제품군 순위 (SY-07 에서 변경) */
  familyOrder: [...FAMILY_ORDER_DEFAULT],

  /** 서비스 중인 AI 모델 버전 (SY-11 에서 변경) */
  servingModelVer: 'v1.4.0',

  /** 화면에서 추가·수정한 레코드를 담는 임시 저장소 (도메인별 목 파일이 채웁니다) */
  store: {},
};

/** 목 상태를 초기값으로 되돌립니다 (테스트·데모 재시작용) */
export function resetMockState() {
  mockState.currentUser = DEFAULT_USER;
  mockState.menuAccess = JSON.parse(JSON.stringify(MENU_ACCESS_DEFAULT));
  mockState.dataScope = JSON.parse(JSON.stringify(DATA_SCOPE_DEFAULT));
  mockState.familyOrder = [...FAMILY_ORDER_DEFAULT];
  mockState.servingModelVer = 'v1.4.0';
  mockState.store = {};
}
