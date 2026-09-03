/**
 * 목(mock) 응답 등록
 *
 * .env 의 EXPO_PUBLIC_USE_MOCK=true 일 때, services/api.js 의 request() 가
 * 서버 대신 여기 등록된 핸들러를 호출합니다.
 *
 * 실 서버로 전환하려면 .env 에서 EXPO_PUBLIC_USE_MOCK=false 로 바꾸기만 하면 되고,
 * 화면·서비스 코드는 한 줄도 고치지 않습니다.
 */
import { registerMocks } from '../api/client';
import { aiMock } from './aiMock';
import { alertMock } from './alertMock';
import { commonMock } from './commonMock';
import { dashboardMock } from './dashboardMock';
import { productionMock } from './productionMock';
import { qualityMock } from './qualityMock';
import { reportMock } from './reportMock';
import { systemMock } from './systemMock';

/** 등록된 목 핸들러 전체 */
export const MOCK_HANDLERS = {
  ...commonMock,
  ...aiMock,
  ...dashboardMock,
  ...productionMock,
  ...qualityMock,
  ...alertMock,
  ...reportMock,
  ...systemMock,
};

/** App 시작 시 한 번 호출합니다 */
export function setupMocks() {
  registerMocks(MOCK_HANDLERS);
}
