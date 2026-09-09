/**
 * [Controller] SY-13 지표 측정 데이터 관리
 *
 * 여기서 정한 정상/주의/위험 값이 이상 알림 발송 조건과 화면 색상 판정에 그대로 사용됩니다.
 */
import { useCallback, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/**
 * 판정 방향(direction) 표시 — 서버가 임계값 관계에서 산출합니다.
 *  · high : 클수록 좋음 (정상 > 주의 > 위험 — 가동률·달성률)
 *  · low  : 작을수록 좋음 (정상 < 주의 < 위험 — 불량률·정지 시간)
 *  · null : 주의 == 위험 이라 방향을 정할 수 없음
 * 화면에서 direction 만 따로 고치는 UI 는 두지 않습니다 (서버가 400).
 */
export const directionText = (d) => (d === 'high' ? '클수록 좋음' : d === 'low' ? '작을수록 좋음' : '—');
export const directionArrow = (d) => (d === 'high' ? '▲' : d === 'low' ? '▼' : '');

/** 판정 레벨 코드(MET_JUDGE) → 배지 색 */
export const levelTone = (level) => (level === 'CRIT' ? 'red' : level === 'WARN' ? 'amber' : 'green');

export function useMetricStdController() {
  const toast = useUiStore((state) => state.toast);

  const [category, setCategory] = useState('전체');
  const [enabled, setEnabled] = useState('전체');
  const [grade, setGrade] = useState('전체');

  // 구분·단위·구간·판정·변경 항목은 서버 공통코드가 정본입니다.
  // 화면에 '생산' 같은 표시명을 박아 두면 서버가 받는 코드(PROD)와 달라 조회가 0건이 됩니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('MET_CATEGORY', 'MET_UNIT', 'MET_WINDOW', 'MET_JUDGE', 'MET_STD_FIELD'),
    [],
    { silent: true, initialData: {} }
  );

  const paging = usePaging({ resetKey: `${category}|${enabled}|${grade}` });

  // 서버 파라미터는 applied(true|false) · level(코드) 입니다 — 표시값(적용/미적용)을 여기서 바꿔 보냅니다
  const applied = enabled === '적용' ? true : enabled === '미적용' ? false : undefined;
  const { data, loading, reload } = useAsync(
    () => repo.loadMetricStandardsFiltered({ category, applied, level: grade, ...paging.params }),
    [category, enabled, grade, paging.page, paging.size]
  );

  const items = data?.list?.items || [];

  /**
   * 요약 카드 — 서버 필드(totalCnt · appliedCnt · criticalCnt · warnCnt · lastUpdated{at,by})를 화면 이름으로 맞춥니다.
   */
  const raw = data?.summary;
  const summary = raw
    ? {
        total: raw.totalCnt ?? raw.total ?? 0,
        enabled: raw.appliedCnt ?? raw.enabled ?? 0,
        disabled: Math.max(0, (raw.totalCnt ?? raw.total ?? 0) - (raw.appliedCnt ?? raw.enabled ?? 0)),
        badCnt: raw.criticalCnt ?? raw.badCnt ?? 0,
        warnCnt: raw.warnCnt ?? 0,
        normalCnt: raw.normalCnt,
        alertCnt: raw.alertCnt,
        lastUpdatedAt: raw.lastUpdated?.at ?? raw.lastUpdatedAt ?? null,
        lastUpdatedBy: raw.lastUpdated?.by ?? raw.lastUpdatedBy ?? null,
      }
    : null;

  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const exportExcel = useCallback(() => {
    const cat = codes?.MET_CATEGORY || [];
    const unit = codes?.MET_UNIT || [];
    const win = codes?.MET_WINDOW || [];
    const judge = codes?.MET_JUDGE || [];
    downloadXls({
      name: '지표 기준 수치',
      head: ['구분', '지표명', '단위', '현재값', '정상 기준', '주의 임계', '위험 임계', '방향', '집계 구간', '산출 근거', '판정', '적용'],
      rows: items.map((m) => [
        labelOf(cat, m.category), m.name, labelOf(unit, m.unit), m.currentValue ?? '', m.normal, m.warn, m.critical,
        directionText(m.direction), labelOf(win, m.window), m.basis, labelOf(judge, m.level), m.applied ? '적용' : '미적용',
      ]),
    });
  }, [items, codes]);

  /**
   * 지표 등록 — 폼 키를 서버 항목 이름(normal · warn · critical)으로 맞추고 숫자로 바꿔 보냅니다.
   * direction 은 서버가 임계값 관계에서 산출하므로 보내지 않습니다.
   */
  const submitStandard = useCallback(
    (v) => {
      const num = (x) => (x === '' || x === null || x === undefined ? undefined : Number(x));
      const normal = num(v.normal);
      const warn = num(v.warn);
      const critical = num(v.critical);
      if ([normal, warn, critical].some((x) => x === undefined || Number.isNaN(x))) {
        toast('정상 기준·주의 임계·위험 임계는 숫자로 입력해 주세요');
        return Promise.resolve({ ok: false });
      }
      return run(() =>
        repo.createMetricStandard({
          category: v.category,
          name: v.name,
          unit: v.unit,
          normal,
          warn,
          critical,
          window: v.window,
          basis: v.basis,
          applied: v.applied !== 'N',
        })
      );
    },
    [run, toast]
  );

  return {
    loading,
    items,
    summary,
    history: data?.history?.items || [],
    filters: { category, enabled, grade },
    codes,
    paging,
    itemsMeta: data?.listMeta,
    setCategory,
    setEnabled,
    setGrade,
    reload,
    exportExcel,
    saveNumber: (stdId, field, value) => run(() => repo.updateMetricValue(stdId, field, Number(value))),
    /** 적용 ↔ 해제 — 현재 상태의 반대를 명시해 보냅니다 (서버 본문 `on`) */
    toggleEnabled: (row) => run(() => repo.setMetricApplied(row.stdId, !row.applied)),
    submitStandard,
    loadUsage: repo.fetchMetricUsage,
  };
}
