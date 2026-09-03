/**
 * 서비스 계층 초기화 (side-effect 모듈)
 *
 * 앱이 뜰 때 한 번만 실행되어야 하므로 루트 레이아웃에서 import 합니다.
 * 목 모드가 아니면 아무 일도 하지 않습니다.
 */
import { USE_MOCK } from './api/client';
import { setupMocks } from './mock';

if (USE_MOCK) setupMocks();

export { USE_MOCK };
