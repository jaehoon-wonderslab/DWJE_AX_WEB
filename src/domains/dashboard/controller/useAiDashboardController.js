/**
 * [Controller] DB-01 AI 통합 대시보드
 *
 * 화면 상태와 데이터 로딩, 도메인 동작만 담당합니다. (JSX 없음)
 * 모달·토스트 같은 화면 표현은 View 가 처리합니다.
 *
 * ■ 집계 단위 (일별 · 주별 · 월별 · 기간선택)
 * 단위를 고르면 **그 단위로 칸이 여러 개 나오는 구간**을 잡고 그 자리에서 조회합니다.
 * 한 주만·한 달만 잡으면 추이 막대가 하나라 단위를 바꾼 티가 나지 않습니다 —
 * 구간을 정하는 규칙은 `unitRange()` 한 곳에 있습니다.
 *
 * 1~3공장 선택은 뷰에서 숨겨 둔 상태입니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { UNIT_SPAN, clampThreeMonths, unitRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { fetchAiBriefing, fetchAiCausePrescription, fetchEquipmentDetail, loadAiDashboard } from '../model/dashboardRepository';

export const AGG_UNITS = [
  { value: '일별', label: '일별' },
  { value: '주별', label: '주별' },
  { value: '월별', label: '월별' },
  { value: '기간선택', label: '기간선택' },
];

/**
 * 단위마다 몇 칸이 나오는지 — 토스트에 그대로 적습니다
 *
 * 고른 단위로 **칸이 여러 개** 나와야 추이가 보입니다. 한 주만, 한 달만 잡으면
 * 막대가 하나뿐이라 단위를 바꾼 티가 안 납니다.
 */
const SPAN_TEXT = {
  일별: `최근 ${UNIT_SPAN.일별}일`,
  주별: `최근 ${UNIT_SPAN.주별}주`,
  월별: `최근 ${UNIT_SPAN.월별}개월`,
};

export const PLANT_OPTIONS = [
  { value: '1공장', label: '제1공장' },
  { value: '2공장', label: '제2공장' },
  { value: '3공장', label: '제3공장' },
];

export function useAiDashboardController() {
  const toast = useUiStore((state) => state.toast);

  // 1. 기간 선택 상태 (실적 집계 조회와 완벽 동일)
  const initialRange = unitRange('일별');
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

  /**
   * 원인 분석은 **브리핑이 끝난 뒤** 부릅니다
   *
   * 둘 다 같은 모델을 쓰는데 로컬 서빙은 한 번에 하나씩 처리합니다. 동시에 던지면 뒤엣것이
   * 앞엣것을 기다렸다가 시작해, 둘을 합한 시간(실측 88초 + 98초)이 서버 제한(240초)에 닿아
   * 통째로 실패했습니다. 순서대로 부르면 각자 제 시간만 씁니다.
   * GPU 서버로 옮겨 동시 처리가 되면 이 대기는 빼도 됩니다.
   */
  const { data: causeData, loading: causeFetching } = useAsync(
    () => fetchAiCausePrescription(applied),
    [applied.from, applied.to, applied.plant, briefingLoading],
    { silent: true, skip: briefingLoading }
  );

  /**
   * 단위를 바꾸면 **구간을 다시 잡고 그 자리에서 조회합니다**
   *
   * 예전에는 날짜만 바꾸고 `applied` 는 그대로 뒀습니다. 조회 버튼을 따로 눌러야 했는데
   * 토스트는 "설정되었습니다" 라고 해서, 단위를 골라도 아무 일도 안 일어나는 것처럼
   * 보였습니다(2026-09-06 실측: 주별·월별·일별 어느 것을 골라도 API 호출 0건).
   * 실적 집계 조회 화면은 이미 이 자리에서 조회까지 합니다 — 같게 맞췄습니다.
   */
  const changeUnit = useCallback((newUnit) => {
    setUnit(newUnit);

    if (newUnit === '기간선택') {
      // 기간선택은 사용자가 고른 날짜를 그대로 씁니다 — 3개월 제한만 겁니다
      const { clamped, to: clampedTo } = clampThreeMonths(from, to);
      const nextTo = clamped ? clampedTo : to;
      if (clamped) {
        setTo(clampedTo);
        toast('조회 기간은 최대 3개월(92일)로 제한됩니다');
      }
      setApplied({ from, to: nextTo, unit: newUnit, plant });
      return;
    }

    const range = unitRange(newUnit, to);
    setFrom(range.from);
    setTo(range.to);
    setApplied({ from: range.from, to: range.to, unit: newUnit, plant });
    toast(`${newUnit} 집계: ${SPAN_TEXT[newUnit]}(${range.from} ~ ${range.to})로 조회합니다`);
  }, [from, to, plant, toast]);

  /**
   * 시작일 · 종료일 — 단위를 고른 상태에서도 날짜를 만질 수 있게 둡니다
   *
   * 종료일을 옮기면 **그 날짜를 끝으로 같은 길이만큼** 다시 잡습니다. 주별인데 종료일만
   * 바뀌어 구간이 하루로 줄면, 단위는 주별인데 칸이 하나가 되어 또 같은 문제가 생깁니다.
   * 시작일은 자유롭게 둡니다 — 더 넓게 보고 싶을 때 늘리는 쪽입니다(92일 상한).
   */
  const changeFrom = useCallback((newFrom) => {
    const { clamped, to: clampedTo } = clampThreeMonths(newFrom, to);
    setFrom(newFrom);
    if (clamped) {
      setTo(clampedTo);
      toast('조회 기간은 최대 3개월(92일)로 제한됩니다');
    }
  }, [to, toast]);

  const changeTo = useCallback((newTo) => {
    if (unit === '기간선택') {
      const { clamped, to: clampedTo } = clampThreeMonths(from, newTo);
      setTo(clamped ? clampedTo : newTo);
      if (clamped) toast('조회 기간은 최대 3개월(92일)로 제한됩니다');
      return;
    }
    const range = unitRange(unit, newTo);
    setFrom(range.from);
    setTo(range.to);
  }, [unit, from, toast]);

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
    toast('최신 데이터로 새로고침했습니다');
  }, [reload, toast]);

  return {
    loading,
    /**
     * 지금 조회 중인 구간 — 카드가 "무엇을 분석하는 중인지" 적는 데 씁니다
     *
     * 편집 중인 `from`/`to` 가 아니라 확정된 `applied` 입니다. 사용자가 날짜만 만지고
     * 아직 조회하지 않았는데 "그 기간을 분석 중" 이라고 적으면 거짓말이 됩니다.
     */
    period: { from: applied.from, to: applied.to },
    from,
    setFrom: changeFrom,
    to,
    setTo: changeTo,
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
    loadEquipmentDetail,
    refresh,
  };
}
