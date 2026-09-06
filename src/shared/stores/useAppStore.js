import { create } from 'zustand';
import { shiftDate, today } from '@shared/utils/formatUtil';

/**
 * 화면 간 공유 상태 (조회 조건 · 선택값) 전역 스토어
 *
 * 대시보드에서 고른 공정·제품 선택이 다른 화면으로 넘어가도 유지되도록 모아 둡니다.
 * 화면 내부에서만 쓰는 값은 여기 두지 않고 각 화면의 useState 로 관리합니다.
 */
export const useAppStore = create((set, get) => ({
  // ── 공통 조회 기간 ──────────────────────────────────────
  /**
   * 실적 데이터 보유 기간 — `GET /api/v1/common/data-range` 응답
   * { plantCd, fromDate, toDate }. 아직 못 받았으면 null 입니다.
   *
   * MES 실적은 당일 마감 전에는 없습니다. 기준일을 오늘로 잡으면 화면이 전부 0 이 되므로
   * 날짜 선택기 기본값은 `toDate`, 선택 범위는 `fromDate ~ toDate` 로 씁니다.
   */
  dataRange: null,

  /** 보유 기간을 반영하고 기준일을 마지막 실적일로 맞춥니다 */
  setDataRange: (dataRange) =>
    set({ dataRange, baseDate: dataRange?.toDate || today() }),

  /** 공통 기준일 — 기본값은 마지막 실적일(toDate) */
  baseDate: today(),
  setBaseDate: (baseDate) => set({ baseDate }),

  // ── 공정 및 제품 대시보드 (DB-02) 선택 상태 ─────────────
  /** 선택한 공정 ID — 비어 있으면 서버 공정 목록의 첫 항목으로 맞춰집니다 */
  dashProcess: '',
  dashTopN: 5, // 'all' 이면 전체
  dashModels: [], // 선택된 제품 코드 배열

  setDashProcess: (dashProcess) => set({ dashProcess }),
  setDashModels: (dashModels) => set({ dashModels }),
  setDashTopN: (dashTopN) => set({ dashTopN }),

  /** 제품 한 건을 선택/해제합니다 (최소 1개는 남깁니다) */
  toggleDashModel: (code) => {
    const list = get().dashModels;
    const i = list.indexOf(code);
    if (i >= 0) {
      if (list.length === 1) return false; // 마지막 하나는 해제 불가
      set({ dashModels: list.filter((x) => x !== code), dashTopN: 'custom' });
    } else {
      set({ dashModels: [...list, code], dashTopN: 'custom' });
    }
    return true;
  },

  // ── 최근 선택한 제품 (제품 선택 팝업 상단 노출용) ────────
  recentModels: [],
  pushRecentModels: (codes) =>
    set((state) => ({
      recentModels: [...codes, ...state.recentModels.filter((c) => !codes.includes(c))].slice(0, 12),
    })),
}));

/* ── 조회 기간 헬퍼 (컨트롤러가 useState 초기값으로 씁니다) ──────────────
   훅이 아니라 함수입니다. 화면이 뜨기 전에 보유 기간을 이미 받아 두므로
   컨트롤러에서 `useState(lastDataDate())` 처럼 한 번만 읽으면 됩니다. */

/** 마지막 실적일 (보유 기간을 못 받았으면 오늘) */
export function lastDataDate() {
  return useAppStore.getState().dataRange?.toDate || today();
}

/** 첫 실적일 (보유 기간을 못 받았으면 오늘) */
export function firstDataDate() {
  return useAppStore.getState().dataRange?.fromDate || today();
}

/**
 * 마지막 실적일에서 역산한 최근 N일 구간.
 *
 * @param {number} days 일수 (7 이면 마지막 실적일 포함 7일)
 * @returns {{ from: string, to: string }}
 */
export function recentRange(days) {
  const to = lastDataDate();
  const from = shiftDate(to, -(days - 1));
  return { from: from < firstDataDate() ? firstDataDate() : from, to };
}

/**
 * 집계 단위별 조회 구간 — **단위마다 칸이 여러 개 나오도록** 잡습니다
 *
 * 예전에는 주별이 "이번 주 월~일", 월별이 "이번 달 1일~말일" 이었습니다. 그러면 추이가
 * 주별 1칸 · 월별 1칸이라(2026-09-06 실측: 일별 7칸 · 주별 1칸 · 월별 1칸) 단위를 바꿔도
 * 그림이 달라지지 않아, 골라도 반영이 안 된 것처럼 보였습니다.
 *
 * 끝은 늘 **마지막 실적일 이하**입니다. 이번 주·이번 달의 남은 날까지 넣으면 빈 날이 붙어
 * 마지막 칸이 실제보다 낮게 보입니다 (2026-09-06 에 주별을 고르면 종료일이 09-06 인데
 * 실적은 09-04 까지라 이틀이 빕니다).
 *
 * @param {string} unit '일별' | '주별' | '월별'
 * @param {string} [refDate] 기준 종료일 — 마지막 실적일보다 뒤면 마지막 실적일로 당깁니다
 * @returns {{ from: string, to: string }}
 */
export const UNIT_SPAN = { 일별: 7, 주별: 4, 월별: 3 };

export function unitRange(unit, refDate) {
  const last = lastDataDate();
  const to = refDate && refDate < last ? refDate : last;
  let from;
  if (unit === '주별') from = shiftDate(weekStart(to), -7 * (UNIT_SPAN.주별 - 1));
  else if (unit === '월별') from = monthStart(to, -(UNIT_SPAN.월별 - 1));
  else from = shiftDate(to, -(UNIT_SPAN.일별 - 1));
  return { from: from < firstDataDate() ? firstDataDate() : from, to };
}

/** 그 날짜가 속한 주의 월요일 (주 시작은 월요일) */
export function weekStart(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay(); // 0=일
  return shiftDate(dateStr, day === 0 ? -6 : 1 - day);
}

/** `back` 달 앞선 달의 1일 (back 은 음수) */
function monthStart(dateStr, back) {
  const d = new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1 + back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** 마지막 실적일이 속한 달의 1일 ~ 마지막 실적일 */
export function currentMonthRange() {
  const to = lastDataDate();
  return { from: `${to.slice(0, 7)}-01`, to };
}

/**
 * 실적 보유 기간 안의 연도 선택지 — 최근 연도부터
 * @param {number} [max] 최대 개수
 * @returns {string[]} 예) ['2026년', '2025년']
 */
export function yearOptions(max = 3) {
  const to = Number(lastDataDate().slice(0, 4));
  const from = Number(firstDataDate().slice(0, 4));
  const out = [];
  for (let y = to; y >= from && out.length < max; y -= 1) out.push(`${y}년`);
  return out;
}

/**
 * 실적 보유 기간 안의 연월 선택지 — 마지막 실적월부터 거슬러
 * @param {number} [max] 최대 개수
 * @returns {string[]} 예) ['2026년 8월', '2026년 7월', '2026년 6월']
 */
export function yearMonthOptions(max = 6) {
  const last = lastDataDate();
  const first = firstDataDate();
  let y = Number(last.slice(0, 4));
  let m = Number(last.slice(5, 7));
  const out = [];
  while (out.length < max) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    if (ym < first.slice(0, 7)) break;
    out.push(`${y}년 ${m}월`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

/* ── 시스템 로그용 기간 ────────────────────────────────────────────
   감사 로그·다운로드 이력·질의 이력은 MES 실적이 아니라 **시스템이 만드는 기록**입니다.
   그래서 기준일이 실적 보유 기간(2026-08-30)이 아니라 실제 오늘이어야 합니다.
   실적 기준일을 그대로 쓰면 "오늘 남은 로그" 가 조회 범위 밖으로 빠져 0건이 됩니다. */

/** 오늘부터 거슬러 N일 (시스템 로그 조회 기본값) */
export function recentDays(days) {
  const to = today();
  return { from: shiftDate(to, -(days - 1)), to };
}
