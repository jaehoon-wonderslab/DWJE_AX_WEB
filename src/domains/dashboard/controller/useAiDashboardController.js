/**
 * [Controller] DB-01 AI 통합 대시보드
 *
 * 화면 상태와 데이터 로딩, 도메인 동작만 담당합니다. (JSX 없음)
 * 모달·토스트 같은 화면 표현은 View 가 처리합니다.
 *
 * [개선 사항]
 * 1. 실적 집계 조회와 100% 동일한 기간 선택 (일별, 주별, 월별, 기간선택)
 * 2. 1~3공장 선택 select box 지원 (기본 제1공장, 뷰에서 숨김 처리)
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { today } from '@shared/utils/formatUtil';
import { fetchAiBriefing, fetchAiCausePrescription, fetchAiLines, fetchEquipmentDetail, loadAiDashboard } from '../model/dashboardRepository';

export const AGG_UNITS = [
  { value: '일별', label: '일별' },
  { value: '주별', label: '주별' },
  { value: '월별', label: '월별' },
  { value: '기간선택', label: '기간선택' },
];

export const PLANT_OPTIONS = [
  { value: '1공장', label: '제1공장' },
  { value: '2공장', label: '제2공장' },
  { value: '3공장', label: '제3공장' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 주의 시작: 월요일 ~ 일요일 */
export function getWeekBounds(baseDateStr) {
  const d = new Date(baseDateStr || Date.now());
  const day = d.getDay(); // 0: 일, 1: 월, ..., 6: 토
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: formatDate(mon), to: formatDate(sun) };
}

/** 월의 시작: 1일 ~ 말일 */
export function getMonthBounds(baseDateStr) {
  const d = new Date(baseDateStr || Date.now());
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { from: formatDate(first), to: formatDate(last) };
}

/** 3개월(최대 92일) 제한 검증 및 클램프 */
export function clampThreeMonths(fromStr, toStr) {
  const fromD = new Date(fromStr);
  const toD = new Date(toStr);
  const diffMs = toD.getTime() - fromD.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 92) {
    const clampedTo = new Date(fromD);
    clampedTo.setDate(fromD.getDate() + 92);
    return { clamped: true, from: fromStr, to: formatDate(clampedTo) };
  }
  return { clamped: false, from: fromStr, to: toStr };
}

export function useAiDashboardController() {
  const toast = useUiStore((state) => state.toast);

  // 1. 기간 선택 상태 (실적 집계 조회와 완벽 동일)
  const initialRange = recentRange(7);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [unit, setUnit] = useState('일별');

  // 2. 공장 선택 상태 (기본 제1공장, 뷰에서 숨김 처리)
  const [plant, setPlant] = useState('1공장');

  // 확정된 조회 조건
  const [applied, setApplied] = useState({
    from: initialRange.from,
    to: initialRange.to,
    unit: '일별',
    plant: '1공장',
  });

  // 메인 대시보드 데이터 조회
  const { data, loading, reload } = useAsync(
    () => loadAiDashboard(applied),
    [applied.from, applied.to, applied.unit, applied.plant]
  );

  /**
   * AI 공정 원인 분석 대상 설비
   *
   * 기본값을 'PR-03' 으로 박아 두던 것을 걷어냈습니다 — 설비 마스터 1,511대 중
   * `PR-` 로 시작하는 코드는 한 대도 없습니다. 서버가 분석 대상을 정해 주면 그것을 따릅니다.
   */
  const [selectedEqptCd, setSelectedEqptCd] = useState('');
  const [causePrescriptionOverride, setCausePrescriptionOverride] = useState(null);
  const [causeLoading, setCauseLoading] = useState(false);

  const changeSelectedEqpt = useCallback(async (newEqptCd) => {
    setSelectedEqptCd(newEqptCd);
    setCauseLoading(true);
    try {
      const res = await fetchAiCausePrescription(applied, newEqptCd);
      setCausePrescriptionOverride(res);
    } catch (e) {
      toast('설비별 AI 원인 분석 데이터를 조회하지 못했습니다.');
    } finally {
      setCauseLoading(false);
    }
  }, [applied, toast]);

  /**
   * AI 브리핑 · 원인 분석은 **따로 부릅니다**
   *
   * 모델 추론이라 느립니다(로컬 sLLM 실측 약 24초). 대시보드 묶음에 넣으면 나머지가 다 와도
   * 화면 전체가 그만큼 멈춥니다. 두 카드만 늦게 채워지고 나머지는 바로 그려집니다.
   */
  const { data: briefing, loading: briefingLoading } = useAsync(
    () => fetchAiBriefing(applied),
    [applied.from, applied.to, applied.plant],
    { silent: true }
  );

  const { data: causeData, loading: causeFetching } = useAsync(
    () => fetchAiCausePrescription(applied),
    [applied.from, applied.to, applied.plant],
    { silent: true }
  );

  // 라인별 현황 (페이징: 대시보드 화면에 적합하게 기본 10건 단위 표시)
  const paging = usePaging({ size: 10, resetKey: `${applied.from}|${applied.to}|${applied.plant}` });
  const { data: lineData, loading: linesLoading, reload: reloadLines } = useAsync(
    () => fetchAiLines(applied, paging.params),
    [applied.from, applied.to, applied.plant, paging.page, paging.size],
    { silent: true }
  );

  const lines = lineData?.lines || [];

  /** 단위 변경 시 날짜 자동 계산 */
  const changeUnit = useCallback((newUnit) => {
    setUnit(newUnit);
    const refDate = to || today();
    let nextFrom = from;
    let nextTo = to;

    if (newUnit === '주별') {
      const bounds = getWeekBounds(refDate);
      nextFrom = bounds.from;
      nextTo = bounds.to;
      setFrom(nextFrom);
      setTo(nextTo);
      toast(`주별 집계: 월요일(${bounds.from}) ~ 일요일(${bounds.to})로 설정되었습니다`);
    } else if (newUnit === '월별') {
      const bounds = getMonthBounds(refDate);
      nextFrom = bounds.from;
      nextTo = bounds.to;
      setFrom(nextFrom);
      setTo(nextTo);
      toast(`월별 집계: 1일(${bounds.from}) ~ 말일(${bounds.to})로 설정되었습니다`);
    } else if (newUnit === '일별') {
      const range = recentRange(7);
      nextFrom = range.from;
      nextTo = range.to;
      setFrom(nextFrom);
      setTo(nextTo);
      toast(`일별 집계: 최근 7일(${nextFrom} ~ ${nextTo})로 설정되었습니다`);
    } else {
      const { clamped, to: clampedTo } = clampThreeMonths(from, to);
      if (clamped) {
        nextTo = clampedTo;
        setTo(clampedTo);
        toast(`조회 기간은 최대 3개월(92일)로 제한됩니다`);
      }
    }
  }, [from, to, toast]);

  /** 조회 버튼 클릭 시 조건 확정 */
  const search = useCallback(() => {
    let finalTo = to;
    if (unit === '기간선택') {
      const { clamped, to: clampedTo } = clampThreeMonths(from, to);
      if (clamped) {
        finalTo = clampedTo;
        setTo(clampedTo);
        toast(`조회 기간은 최대 3개월(92일)로 제한됩니다`);
      }
    }
    setApplied({ from, to: finalTo, unit, plant });
    toast(`기간 ${from} ~ ${finalTo} (${unit}) 조건으로 조회합니다`);
  }, [from, to, unit, plant, toast]);

  /** 설비 상세 조회 — 모달 표시는 View 가 합니다 */
  const loadEquipmentDetail = useCallback((eqptCd) => fetchEquipmentDetail(eqptCd, applied.to), [applied.to]);

  const refresh = useCallback(() => {
    reload();
    reloadLines();
    toast('최신 데이터로 새로고침했습니다');
  }, [reload, reloadLines, toast]);

  return {
    loading,
    from,
    setFrom,
    to,
    setTo,
    unit,
    changeUnit,
    plant,
    setPlant,
    search,
    summary: data?.summary || {},
    briefing,
    briefingLoading,
    causePrescription: causePrescriptionOverride || causeData,
    selectedEqptCd,
    changeSelectedEqpt,
    causeLoading: causeLoading || causeFetching,
    trend: data?.trend,
    defectTrendData: data?.defectTrendData,
    lineProduction: data?.lineProduction,
    qualityIndex: data?.qualityIndex,
    composition: data?.composition,
    processYield: data?.processYield,
    planActual: data?.planActual,
    heatmap: data?.heatmap,
    lines,
    linesLoading,
    linesMeta: lineData?.meta,
    paging,
    loadEquipmentDetail,
    refresh,
  };
}
