/**
 * API 통신 공통 모듈
 *
 * 기존 `$.ajax` 방식처럼 요청 / 성공 / 실패 구조가 한눈에 들어오도록 감싼 래퍼입니다.
 * 화면 코드는 axios 를 직접 쓰지 않고 `services/*Service.js` 의 함수만 호출합니다.
 *
 *  [요청 흐름]
 *   화면 → xxxService.getXxx() → request() → (목 모드면 mock, 아니면 axios) → ApiResponse
 */
import axios from 'axios';
import { ENDPOINTS } from './endpoints';
import { useAuthStore } from '@shared/stores/useAuthStore';

/** API 서버 주소 — .env 의 EXPO_PUBLIC_API_URL */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

/** 목(mock) 모드 여부 — 백엔드 없이 명세 기반 더미 응답으로 화면을 구동합니다 */
export const USE_MOCK = String(process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

/** 목 응답 지연 (ms) — 로딩 표시 동작 확인용 */
const MOCK_DELAY = Number(process.env.EXPO_PUBLIC_MOCK_DELAY ?? 180);

/**
 * 인증 API 를 실 서버로 보낼지 여부 — .env 의 EXPO_PUBLIC_LIVE_AUTH (기본 true)
 *
 * 백엔드는 인증 API 만 먼저 완성되어 있습니다. 그래서 목 모드에서도
 * `live: true` 로 표시된 엔드포인트는 실 서버로 보내고, 나머지 업무 API 는 목 응답을 씁니다.
 * false 로 두면 로그인까지 전부 목으로 돌아가 백엔드 없이 화면만 볼 수 있습니다(데모 모드).
 */
export const LIVE_AUTH = String(process.env.EXPO_PUBLIC_LIVE_AUTH ?? 'true') !== 'false';

/** 데모 인증 모드 — 로그인 화면 없이 기본 계정으로 자동 로그인합니다 */
export const IS_DEMO_AUTH = USE_MOCK && !LIVE_AUTH;

/** 이 엔드포인트를 목으로 처리할지 판정합니다 */
function shouldMock(def) {
  return USE_MOCK && !(def.live && LIVE_AUTH);
}

/**
 * 요청 제한 시간 (ms)
 *
 * 사내망 분석 조회 중에는 수백만 행을 집계하느라 수십 초가 걸리는 것이 있습니다
 * (예: 설비별 불량 집계). 화면이 먼저 끊어 버리면 원인을 알 수 없으므로 넉넉히 둡니다.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT ?? 45000);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// [미들웨어] 요청 전 헤더에 JWT 토큰 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * 로그인 없이 부르는 경로 — 여기서 401 이 나도 토큰 갱신을 시도하지 않습니다.
 * (비밀번호가 틀려서 나온 401 로 갱신·재시도를 태우면 안 됩니다)
 */
const NO_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/signup',
  '/api/v1/auth/email/',
  '/api/v1/auth/password/',
];

/**
 * [미들웨어] 세션 만료 대응 — 401 에서 토큰 갱신을 한 번 시도합니다.
 *
 * 401 이 아닌 실패는 그대로 흘려보내 화면이 자기 자리에서 처리하게 둡니다.
 *  · 403 / `E-AUTH-002` — 메뉴 접근 권한 없음 → 화면 내 안내
 *  · 404 / `E-NOTFOUND` — 대상 없음 → 화면 내 안내 (빈 상태)
 * 이 둘을 로그아웃으로 처리하면 조회 대상이 없다는 이유로 사용자가 튕겨 나갑니다.
 *
 * [주의] 서버가 401 을 인증 필터에서 만들면 CORS 헤더가 붙지 않는 경우가 있습니다.
 *        그러면 브라우저가 응답을 막아 axios 에는 `response` 없이 네트워크 오류로 들어옵니다.
 *        상태 코드를 볼 수 없으므로, 로그인 상태에서 난 응답 없는 실패도 세션 만료로 보고
 *        갱신을 한 번 시도합니다. (갱신에 성공하면 원래 요청을 재시도합니다)
 */
let refreshing = null;

/**
 * 세션을 끝내고 한 번만 안내합니다.
 * 화면 여러 곳이 동시에 401 을 받아도 안내는 한 번만 뜹니다.
 * (로그인 화면으로의 이동은 app/(main)/_layout.jsx 가 로그인 상태를 보고 처리합니다)
 */
let expiredNotified = false;
function expireSession(setLogout) {
  setLogout();
  if (expiredNotified) return;
  expiredNotified = true;
  setTimeout(() => {
    expiredNotified = false;
  }, 3000);
  // 스토어를 직접 참조하지 않도록 지연 로딩합니다 (순환 의존 방지)
  import('@shared/stores/useUiStore')
    .then((m) => m.useUiStore.getState().toast('세션이 만료되었습니다 — 다시 로그인해 주세요'))
    .catch(() => {});
}

/** 이 실패에 대해 토큰 갱신을 시도할지 판정합니다 */
function shouldTryRefresh(error) {
  const { response, config } = error;
  if (config?._retried) return false;
  if (NO_AUTH_PATHS.some((p) => (config?.url || '').startsWith(p))) return false;
  if (response) return response.status === 401;
  // 응답이 없는 실패 — 로그인 상태에서만 세션 만료로 의심합니다
  return !!useAuthStore.getState().accessToken;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config } = error;
    if (!shouldTryRefresh(error)) return Promise.reject(error);

    const { refreshToken, setTokens, setLogout } = useAuthStore.getState();
    if (!refreshToken) {
      expireSession(setLogout);
      return Promise.reject(error);
    }

    // 동시에 여러 요청이 401 을 받아도 갱신은 한 번만 수행합니다
    if (!refreshing) {
      refreshing = axios
        .post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken })
        .then((r) => r.data?.data?.accessToken)
        .finally(() => {
          refreshing = null;
        });
    }

    try {
      const accessToken = await refreshing;
      if (!accessToken) throw new Error('no token');
      setTokens({ accessToken, refreshToken });
      config._retried = true;
      config.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(config);
    } catch (e) {
      expireSession(setLogout);
      return Promise.reject(error);
    }
  }
);

/** 표준 에러 코드 — API_목록 ver01 「공통 규약」 2절 */
export const ERROR_CODES = {
  'E-AUTH-001': '미인증 · 세션 만료',
  'E-AUTH-002': '메뉴 접근 권한 없음',
  'E-AUTH-003': '데이터 접근 권한 없음',
  'E-VALID-001': '필수 항목 누락',
  'E-VALID-002': '중복 값 (아이디 · 부서명 · 용어 등)',
  'E-RULE-001': '업무 규칙 위반',
  'E-NOTFOUND': '대상 없음',
  'E-SERVER': '서버 오류',
  'E-TIMEOUT': '조회 시간 초과 (화면에서 판정)',
};

/**
 * 경로의 {param} 자리를 실제 값으로 치환하고, 사용된 키는 제거합니다.
 *
 * @param {string} path 예) /api/v1/ai/chat/sessions/{sessionId}
 * @param {object} params 요청 파라미터 (경로 변수 + 쿼리/바디가 섞여 있음)
 * @returns {{url:string, rest:object}} 치환된 URL 과 남은 파라미터
 */
/**
 * "조건 없음" 을 뜻하는 화면 값 — 서버로 보내지 않고 버립니다.
 *
 * 선택 목록의 기본값이 '전체' 라서 그대로 보내면 서버가 코드값으로 읽고 400 을 냅니다.
 * (목 모드에서는 목 핸들러가 한글을 받아 줘서 드러나지 않던 문제입니다)
 */
const EMPTY_FILTERS = new Set(['전체', '전부', '없음', '선택', 'ALL', 'all']);

/**
 * 값이 비어 있는(=조건 없음) 파라미터를 걸러 냅니다.
 *
 * @param {object} params 요청 파라미터
 * @returns {object} 실제로 보낼 파라미터
 */
function dropEmptyParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    if (typeof v === 'string' && EMPTY_FILTERS.has(v.trim())) return;
    if (Array.isArray(v) && !v.length) return;
    out[k] = v;
  });
  return out;
}

function buildPath(path, params = {}) {
  const rest = { ...params };
  const url = path.replace(/\{(\w+)\}/g, (_, key) => {
    const v = rest[key];
    delete rest[key];
    return encodeURIComponent(v ?? '');
  });
  return { url, rest };
}

/** 목 응답 핸들러 저장소 — services/mock/index.js 에서 등록합니다 */
const mockHandlers = {};

/**
 * 목 응답 핸들러를 등록합니다.
 *
 * @param {object} handlers { 엔드포인트키: (params) => 응답데이터 }
 */
export function registerMocks(handlers) {
  Object.assign(mockHandlers, handlers);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 엔드포인트 키 하나를 호출합니다. 모든 서비스 함수가 최종적으로 이 함수를 씁니다.
 *
 * @param {string} key ENDPOINTS 의 키 (예: 'getAuthMe')
 * @param {object} params 경로 변수 + 쿼리 파라미터 + 요청 바디
 * @param {object} options { signal, responseType } 등 axios 추가 옵션
 * @returns {Promise<object>} ApiResponse — { success, code, message, data, meta, masked, error }
 */
export async function request(key, params = {}, options = {}) {
  const def = ENDPOINTS[key];
  if (!def) throw new Error(`정의되지 않은 API 키입니다: ${key}`);

  const { url, rest: raw } = buildPath(def.path, params);
  const rest = dropEmptyParams(raw);

  // [1] 목 모드 — 등록된 핸들러가 있으면 서버 대신 목 응답을 돌려줍니다
  //     (백엔드 구현이 끝난 live 엔드포인트는 목 모드에서도 [2] 로 내려갑니다)
  if (shouldMock(def)) {
    const handler = mockHandlers[key];
    if (MOCK_DELAY > 0) await sleep(MOCK_DELAY);
    if (!handler) {
      // 아직 목이 없는 API 는 빈 성공 응답으로 처리해 화면이 깨지지 않게 합니다
      return { success: true, code: 'SUCCESS', message: `[mock 미구현] ${def.name}`, data: null, masked: [] };
    }
    const data = await handler(rest, def);
    if (data && data.success !== undefined) return data; // 핸들러가 전체 응답을 만든 경우
    return { success: true, code: 'SUCCESS', message: `${def.name} 조회가 완료되었습니다.`, data, masked: [] };
  }

  // [2] 실 서버 호출
  const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(def.method);
  const config = {
    url,
    method: def.method.toLowerCase(),
    ...(isBodyMethod ? { data: rest } : { params: rest }),
    ...options,
  };

  try {
    const res = await apiClient(config);
    return res.data;
  } catch (error) {
    // 서버가 표준 포맷으로 에러를 내려준 경우 그대로 전달합니다
    if (error.response?.data?.success !== undefined) return error.response.data;

    // 제한 시간 초과 — 서버 오류와 구분해 안내합니다
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      return {
        success: false,
        code: 'E-TIMEOUT',
        message: `조회 시간이 초과되었습니다(${Math.round(REQUEST_TIMEOUT_MS / 1000)}초). 조회 기간을 좁혀 다시 시도해 주세요.`,
        data: null,
        error: { code: 'E-TIMEOUT', message: error.message },
      };
    }

    const code = error.response?.data?.error?.code || 'E-SERVER';
    return {
      success: false,
      code,
      message: ERROR_CODES[code] || '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      data: null,
      error: { code, message: error.message },
    };
  }
}

export default apiClient;
