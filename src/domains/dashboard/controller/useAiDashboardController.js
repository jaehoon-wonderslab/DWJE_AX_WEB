/** DB-01: 기간 조건을 조회 버튼으로 적용하고 AI 분석은 별도로 요청합니다. */
import { useEffect, useRef, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { unitRange } from '@shared/stores/useAppStore';
import { fetchAiBriefing, fetchAiCausePrescription, fetchEquipmentDetail, loadAiDashboard } from '../model/dashboardRepository';
import { RANGE_OPTIONS, rangeError } from '../model/aiDashboardFilterModel';

export const AGG_UNITS = RANGE_OPTIONS;
export const PLANT_OPTIONS = [{ value: '1공장', label: '제1공장' }, { value: '2공장', label: '제2공장' }, { value: '3공장', label: '제3공장' }];
const idleAI = () => ({ briefing: null, cause: null, briefingLoading: false, causeLoading: false, requested: false, selectedEqptCd: '' });
const unavailable = { ready: false, reason: 'ANALYSIS_UNAVAILABLE' };
const notRequested = { ready: false, reason: 'NOT_REQUESTED' };

export function useAiDashboardController() {
  const [filters, setFilters] = useState(() => ({ ...unitRange('일별'), unit: '일별', plant: '1공장' }));
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
    setFilters((f) => ({ ...f, ...patch, unit: '기간선택' }));
    setValidationError('');
  };
  const changeUnit = (unit) => {
    if (unit === '기간선택') { setFilters((f) => ({ ...f, unit })); return; }
    // 빠른 기간은 마지막 실적일 기준. 입력 중인 날짜를 파싱하거나 조용히 보정하지 않습니다.
    setFilters((f) => ({ ...f, ...unitRange(unit), unit }));
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
  const changeSelectedEqpt = async (eqptCd) => {
    if (loading || ai.briefingLoading) return;
    const id = ++aiGeneration.current;
    setAI((s) => ({ ...s, requested: true, selectedEqptCd: eqptCd, cause: null, causeLoading: true }));
    const cause = await fetchAiCausePrescription(applied, eqptCd).catch(() => null);
    if (id === aiGeneration.current) setAI((s) => ({ ...s, cause: cause || unavailable, causeLoading: false }));
  };
  const loadEquipmentDetail = (eqptCd) => fetchEquipmentDetail(eqptCd, applied.to);
  return {
    loading, loadError: result.error, partialErrors: data?.errors || {}, validationError,
    pendingChanges: JSON.stringify(filters) !== JSON.stringify(applied),
    period: { from: applied.from, to: applied.to },
    from: filters.from, to: filters.to, unit: filters.unit, plant: filters.plant,
    setFrom: (from) => editDate({ from }), setTo: (to) => editDate({ to }), changeUnit,
    setPlant: (plant) => setFilters((f) => ({ ...f, plant })), search, refresh, requestAI,
    briefing: ai.briefing || (ai.requested ? unavailable : notRequested), briefingLoading: ai.briefingLoading,
    causePrescription: ai.cause || (ai.requested ? unavailable : notRequested), causeLoading: ai.causeLoading,
    selectedEqptCd: ai.selectedEqptCd, changeSelectedEqpt, aiRequested: ai.requested,
    summary: data?.summary || {}, trend: data?.trend, defectTrendData: data?.defectTrendData,
    lineProduction: data?.lineProduction, qualityIndex: data?.qualityIndex, composition: data?.composition,
    processYield: data?.processYield, planActual: data?.planActual, heatmap: data?.heatmap,
    loadEquipmentDetail,
  };
}
