import { useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { unitRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { getCommonMastersProcesses } from '@services/api/commonService';
import { unwrap } from '@services/api/request';
import { loadProcessPeriod } from '../model/processPeriodRepository';
import { metricText, validatePeriod } from '../model/processPeriodModel';
import { normalizeRange } from '@shared/constants/period';

const defaults = () => ({ ...unitRange('일별'), unit: '일별', models: [], processId: '' });
export function useProcessDashboardController() {
  const [filters, setFilters] = useState(defaults);
  const [applied, setApplied] = useState(filters);
  const [revision, setRevision] = useState(0);
  const toast = useUiStore((s) => s.toast);
  const masters = useAsync(() => unwrap(getCommonMastersProcesses({})), []);
  const result = useAsync(() => loadProcessPeriod(applied), [applied, revision], { silent: true });
  // 같은 날을 고르면 구간이 비므로 시작일을 하루 앞당깁니다.
  const edit = (patch) => setFilters((f) => {
    const next = { ...f, ...patch };
    return { ...next, ...normalizeRange(next.from, next.to) };
  });
  const apply = (next) => {
    try { validatePeriod(next.from, next.to); }
    catch (e) { toast(e.message); return; }
    setApplied({ ...next });
    setRevision((v) => v + 1);
  };
  const setUnit = (unit) => {
    try { validatePeriod(filters.to, filters.to); }
    catch (e) { toast(e.message); return; }
    const quick = unit === '기간선택' ? {} : unitRange(unit, filters.to);
    const next = { ...filters, unit, ...quick, ...(quick.from ? normalizeRange(quick.from, quick.to) : {}) };
    setFilters(next);
    apply(next);
  };
  const reset = () => { const next = defaults(); setFilters(next); apply(next); };
  const inspectProcess = (processId) => {
    const next = { ...applied, processId };
    setFilters(next);
    apply(next);
  };
  const exportExcel = () => {
    if (result.loading || result.error || !result.data?.products?.length) return;
    const can = useAuthStore.getState().canData;
    downloadXls({
      name: `공정_제품_실적_${applied.from}_${applied.to}`,
      head: ['제품', '제품명', '투입 수량', '양품 수량', '불량 수량', '불량률 (%)', '수율 (%)'],
      rows: result.data.products.map((p) => [p.code || '제품 코드 미등록', p.productNm || '제품명 미등록',
        ...['qty', 'okQty', 'ngQty', 'defectRate', 'yieldRate'].map((key) => metricText(p, key, can(key.endsWith('Rate') ? 'yield' : 'qty')))]),
    });
  };
  return { filters, applied, edit, setUnit, reset, inspectProcess, exportExcel, search: () => apply(filters),
    loading: result.loading, error: result.error, data: result.loading || result.error ? null : result.data,
    processes: masters.data?.processes || [], masterError: masters.error };
}
