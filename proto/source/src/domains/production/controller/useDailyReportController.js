/**
 * [Controller] PR-03 일일 생산현황 보고
 *
 * 조간회의 자료(「생산관리팀 (PRESS) 아침회의자료」) 양식으로 보여 줍니다.
 * 한 행 = 한 제품이고, 양식의 「이슈 항목」 자리에 제품명이 들어갑니다.
 *
 * ■ 대상일
 * 화면에서 직접 고릅니다. 처음 들어오면 전역 기준일로 시작하고, 이후에는 화면 안에서만 바뀝니다.
 * 날짜 칸은 직접 타이핑할 수 있어 '2026-0' 같은 중간 상태를 거치므로,
 * 형식이 갖춰진 값만 조회에 씁니다.
 *
 * ■ 집계 구간
 * 전날 20:00 ~ 당일 08:00 (야간 근무분). 서버가 대상일만 받아 계산합니다.
 *
 * ■ 회의 결과
 * 일목표 · 결정항목 · DRI · 기한은 작성자가 채워 「행 저장」으로 남깁니다.
 * 키는 (대상일, 제품)이고 확정 상태가 없어 언제든 고칠 수 있습니다.
 *
 * 2026-09-04 — 서버에서 **보고서 문서·결재 모형이 걷혔습니다.**
 * 초안 재생성·임시 저장·항목 보정·확정·반려·생성 이력 API 가 전부 404 라 화면에서도 걷어냈습니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useAppStore } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { comma, fixed } from '@shared/utils/formatUtil';
import { loadPressReport, pressLevel, saveDailyReportRows, shiftWindow } from '../model/productionRepository';

/** 표시 개수 선택지 — 0 은 전량 */
export const TOP_N_OPTIONS = [
  { value: 10, label: '상위 10개' },
  { value: 20, label: '상위 20개' },
  { value: 50, label: '상위 50개' },
  { value: 0, label: '전체' },
];

export function useDailyReportController() {
  const baseDate = useAppStore((state) => state.baseDate);
  const toast = useUiStore((state) => state.toast);
  const canData = useAuthStore((state) => state.canData);

  const [input, setInput] = useState(baseDate);
  const [targetDate, setQueried] = useState(baseDate);
  const [processId, setProcessId] = useState('전체');
  const [topN, setTopN] = useState(10);

  /** 형식이 갖춰진 날짜만 조회에 씁니다 — 타이핑 중간 상태로 서버를 부르지 않습니다 */
  const setTargetDate = useCallback((v) => {
    setInput(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())) setQueried(v);
  }, []);

  const { data: sheet, loading, reload } = useAsync(
    () => loadPressReport({ targetDate, processId, topN }),
    [targetDate, processId, topN],
    { initialData: { rows: [], totals: null, processes: [], processCds: [], window: shiftWindow(targetDate), baseline: '' } }
  );

  /** 공정 선택지 — 프레스 작업장만 (양식이 PRESS 자료입니다) */
  const processOptions = useMemo(
    () => [{ value: '전체', label: '프레스 전체' }, ...(sheet?.processes || []).map((p) => ({ value: p.id, label: `${p.name} (${p.id})` }))],
    [sheet]
  );

  /** 작성자가 손댄 칸 — 제품코드별. 저장하면 비웁니다 */
  const [manual, setManual] = useState({});

  const setManualCell = useCallback((product, key, value) => {
    setManual((prev) => ({ ...prev, [product]: { ...(prev[product] || {}), [key]: value } }));
  }, []);

  /**
   * 본문 행 — 저장값 위에 편집 중인 값을 얹고 달성률을 계산합니다
   *
   * 일목표를 안 채웠으면 **달성률도 상태도 내지 않습니다.** 참고값(그 주 보고 구간 일평균)으로
   * 계산하면 주간목표 = 참고값 × 일수 = 주간실적 이라 주간달성률이 늘 100.0% 가 됩니다.
   * 참고값은 입력칸의 회색 밑값으로만 남습니다.
   */
  const rows = useMemo(
    () => (sheet?.rows || []).map((r) => {
      const m = manual[r.product] || {};
      const raw = m.target === undefined ? (r.savedTarget === null ? '' : String(r.savedTarget)) : m.target;
      const typed = raw === null || raw === '' ? null : Number(String(raw).replace(/[^\d.-]/g, ''));
      const target = Number.isFinite(typed) && typed > 0 ? typed : null;
      const weekTarget = target ? target * r.weekDays : null;
      const rate = target ? Math.round((r.qty / target) * 1000) / 10 : null;
      const weekRate = weekTarget ? Math.round((r.weekQty / weekTarget) * 1000) / 10 : null;
      return {
        ...r,
        ...m,
        targetInput: raw ?? '',
        target,
        provisional: target === null,
        weekTarget,
        rate,
        weekRate,
        level: pressLevel(rate),
        weekLevel: pressLevel(weekRate),
      };
    }),
    [sheet, manual]
  );

  const rowsDirty = Object.keys(manual).length > 0;

  /** 회의 결과 저장 — **손댄 행만** 보냅니다 (같은 제품을 두 번 보내면 400) */
  const saveRows = useCallback(async () => {
    const payload = Object.entries(manual).map(([product, v]) => {
      const n = v.target === undefined || v.target === '' ? null : Number(String(v.target).replace(/[^\d.-]/g, ''));
      return {
        product,
        targetQty: Number.isFinite(n) && n > 0 ? n : null,
        decision: v.decision?.trim() || null,
        dri: v.dri?.trim() || null,
        due: v.due?.trim() || null,
      };
    });
    if (!payload.length) {
      toast('저장할 변경 항목이 없습니다');
      return { ok: false };
    }
    const res = await saveDailyReportRows(targetDate, payload);
    toast(res.message || (res.ok ? `${payload.length}개 제품을 저장했습니다` : '저장하지 못했습니다'));
    if (res.ok) {
      setManual({});
      reload();
    }
    return res;
  }, [manual, targetDate, toast, reload]);

  /** 양식 그대로 내려받습니다 (열 순서·머리글 동일) */
  const exportExcel = useCallback(() => {
    const qty = canData('qty');
    const hide = (v) => (v === null || v === undefined ? '—' : qty ? comma(v) : '비공개');
    downloadXls({
      name: `생산관리팀 (PRESS) 아침회의자료 ${targetDate}`,
      head: ['상태', '공정/Process', '이슈 항목', '일목표', '실적', '달성률', '주간목표', '주간실적', '주간달성률', '영향범위(생산장비 대수)', '결정항목 / 기타', 'DRI', '기한'],
      rows: rows.map((r) => [
        r.level?.label || '—',
        r.process,
        r.productNm,
        hide(r.target),
        hide(r.qty),
        r.rate === null ? '—' : `${fixed(r.rate)}%`,
        hide(r.weekTarget),
        hide(r.weekQty),
        r.weekRate === null ? '—' : `${fixed(r.weekRate)}%`,
        r.eqptCnt === null ? '—' : `Press ${comma(r.eqptCnt)}대`,
        r.decision || '—',
        r.dri || '—',
        r.due || '—',
      ]),
    });
  }, [rows, targetDate, canData]);

  return {
    loading,
    targetDate,
    dateInput: input,
    setTargetDate,
    processId,
    setProcessId,
    processOptions,
    processCds: sheet?.processCds || [],
    topN,
    setTopN,
    window: sheet?.window || shiftWindow(targetDate),
    baseline: sheet?.baseline || '',
    rows,
    totals: sheet?.totals || null,
    setManualCell,
    rowsDirty,
    saveRows,
    reload,
    exportExcel,
  };
}
