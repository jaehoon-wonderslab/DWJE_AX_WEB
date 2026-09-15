/** Prototype data adapter: local handlers only; no network client. */
import { ENDPOINTS } from './endpoints';
import { useUiStore } from '@shared/stores/useUiStore';
export const API_BASE_URL = '';
export const USE_MOCK = true;
export const LIVE_AUTH = false;
export const IS_DEMO_AUTH = false;
export const ERROR_CODES = {};
const handlers = {};
export function registerMocks(next) { Object.assign(handlers, next); }
export async function request(key, params = {}) {
  if (!ENDPOINTS[key]) throw new Error('Unknown data key: ' + key);
  const handler = handlers[key];
  if (!handler) throw new Error('샘플 데이터가 준비되지 않았습니다: ' + key);
  useUiStore.getState().startApiLoading();
  try {
    await new Promise(resolve => setTimeout(resolve, 120));
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== '' && !['전체', '전부', '없음', '선택'].includes(value)));
    const data = await handler(clean, ENDPOINTS[key]);
    if (data && data.success !== undefined) return data;
    return { success: true, code: 'SUCCESS', data, masked: [] };
  } finally { useUiStore.getState().endApiLoading(); }
}
export default function disabledNetworkClient() { throw new Error('Prototype network disabled'); }
