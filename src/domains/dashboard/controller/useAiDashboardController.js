/**
 * DB-01: 기간 조건을 조회 버튼으로 적용합니다.
 *
 * AI 분석(브리핑 → 원인 분석·처방)은 **대시보드 지표가 도착하면 바로** 부릅니다(요청 버튼 없음).
 * 서버가 기본 조회 기간(최근 7일)을 미리 계산해 두므로 대개 곧바로 오고, 다른 기간은 처음 한 번만 수십 초 걸립니다.
 * 조회·새로고침으로 기간이 바뀌면 진행 중인 AI 결과는 버리고 새 기간으로 다시 부릅니다.
 */
import { useEffect, useRef, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { unitRange } from '@shared/stores/useAppStore';
import { fetchAiBriefing, fetchAiCausePrescription, fetchAiDefectTrendSlotDetails, fetchEquipmentDetail, loadAiDashboard } from '../model/dashboardRepository';
import { RANGE_OPTIONS, rangeError } from '../model/aiDashboardFilterModel';
import { normalizeRange } from '@shared/constants/period';

export const AGG_UNITS = RANGE_OPTIONS;
export const PLANT_OPTIONS = [{ value: '1공장', label: '제1공장' }, { value: '2공장', label: '제2공장' }, { value: '3공장', label: '제3공장' }];
const idleAI = () => ({ briefing: null, cause: null, briefingLoading: false, causeLoading: false, requested: false, selectedEqptCd: '' });
/** 지표를 받기 전 — 곧 자동으로 분석을 부릅니다 */
const pendingAI = { ready: false, reason: 'PENDING' };
const unavailable = { ready: false, reason: 'ANALYSIS_UNAVAILABLE' };

export function useAiDashboardController() {
  const [filters, setFilters] = useState(() => {
    const r = unitRange('일별');
    return { ...normalizeRange(r.from, r.to), unit: '일별', plant: '1공장' };
  });
  const [applied, setApplied] = useState(filters);
  const [revision, setRevision] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [ai, setAI] = useState(idleAI);
  const aiGeneration = useRef(0);
  useEffect(() => () => { aiGeneration.current++; }, []);
  const result = useAsync(async () => ({ ...await loadAiDashboard(applied), forQuery: applied }), [applied, revision], { silent: true });
  const current = result.data?.forQuery === applied;
  const loading = result.loading || (!result.error && !current);
  const data = loading || result.error || !current ? null : result.data;
  const invalidateAI = () => { aiGeneration.current++; setAI(idleAI()); };
  const editDate = (patch) => {
    // 같은 날을 고르면 구간이 비므로 시작일을 하루 앞당깁니다.
    setFilters((f) => {
      const next = { ...f, ...patch };
      return { ...next, ...normalizeRange(next.from, next.to), unit: '기간선택' };
    });
    setValidationError('');
  };
  const changeUnit = (unit) => {
    if (unit === '기간선택') { setFilters((f) => ({ ...f, unit })); return; }
    // 빠른 기간은 마지막 실적일 기준. 입력 중인 날짜를 파싱하거나 조용히 보정하지 않습니다.
    setFilters((f) => {
      const r = unitRange(unit);
      return { ...f, ...normalizeRange(r.from, r.to), unit };
    });
    setValidationError('');
  };
  const search = () => {
    const error = rangeError(filters.from, filters.to);
    setValidationError(error);
    if (error) return;
    invalidateAI();
    setApplied({ ...filters });
    setRevision((r) => r + 1);
  };
  const refresh = () => {
    invalidateAI();
    setRevision((r) => r + 1);
  };
  const requestAI = async () => {
    if (loading || result.error || ai.briefingLoading || ai.causeLoading) return;
    const id = ++aiGeneration.current;
    const latest = () => id === aiGeneration.current;
    setAI({ ...idleAI(), requested: true, briefingLoading: true });
    const briefing = await fetchAiBriefing(applied).catch(() => null);
    if (!latest()) return;
    // 서비스 중단은 정상적인 미제공 상태입니다. 같은 모델에 두 번째 요청을 보내지 않습니다.
    if (!briefing || ['MODEL_NOT_READY', 'MODEL_BUSY', 'ANALYSIS_UNAVAILABLE'].includes(briefing.reason)) {
      setAI({ ...idleAI(), requested: true, briefing: briefing || unavailable, cause: unavailable });
      return;
    }
    setAI((s) => ({ ...s, briefing, briefingLoading: false, causeLoading: true }));
    const cause = await fetchAiCausePrescription(applied).catch(() => null);
    if (latest()) setAI((s) => ({ ...s, cause: cause || unavailable, causeLoading: false }));
  };
  // 지표가 도착하면 AI 분석을 바로 부릅니다. 조회·새로고침 뒤에도 같은 자리에서 다시 부릅니다
  useEffect(() => {
    if (data && !ai.requested && !ai.briefingLoading) requestAI();
    // requestAI 는 매 렌더 새로 만들어지므로 의존성에서 뺍니다 — data 가 바뀔 때만 부릅니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ai.requested]);
  const changeSelectedEqpt = async (eqptCd) => {
    if (loading || ai.briefingLoading) return;
    const id = ++aiGeneration.current;
    setAI((s) => ({ ...s, requested: true, selectedEqptCd: eqptCd, cause: null, causeLoading: true }));
    const cause = await fetchAiCausePrescription(applied, eqptCd).catch(() => null);
    if (id === aiGeneration.current) setAI((s) => ({ ...s, cause: cause || unavailable, causeLoading: false }));
  };
  const loadEquipmentDetail = (eqptCd) => fetchEquipmentDetail(eqptCd, applied.to);
  const loadHourlyDefectDetails = (cell) => fetchAiDefectTrendSlotDetails({
    cell, from: applied.from, to: applied.to, plant: applied.plant,
  });
  return {
    loading, loadError: result.error, partialErrors: data?.errors || {}, validationError,
    pendingChanges: JSON.stringify(filters) !== JSON.stringify(applied),
    period: { from: applied.from, to: applied.to },
    from: filters.from, to: filters.to, unit: filters.unit, plant: filters.plant,
    setFrom: (from) => editDate({ from }), setTo: (to) => editDate({ to }), changeUnit,
    setPlant: (plant) => setFilters((f) => ({ ...f, plant })), search, refresh,
    // 지표를 받는 동안에는 분석 전이라 「불러오는 중」으로 보입니다 — 요청 여부를 사용자에게 묻지 않습니다
    briefing: ai.briefing || (ai.requested ? unavailable : pendingAI), briefingLoading: ai.briefingLoading || (!ai.requested && !result.error),
    causePrescription: ai.cause || (ai.requested ? unavailable : pendingAI), causeLoading: ai.causeLoading,
    selectedEqptCd: ai.selectedEqptCd, changeSelectedEqpt,
    summary: data?.summary || {}, trend: data?.trend, defectTrendData: data?.defectTrendData,
    lineProduction: data?.lineProduction, qualityIndex: data?.qualityIndex, composition: data?.composition,
    processYield: data?.processYield, planActual: data?.planActual, heatmap: data?.heatmap,
    loadEquipmentDetail,
    loadHourlyDefectDetails,
  };
}
