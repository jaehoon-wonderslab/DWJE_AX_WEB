/**
 * [Controller] PR-03 일일 생산현황 보고
 *
 * 조간회의 자료(「생산관리팀 (PRESS) 아침회의자료」) 양식으로 보여 줍니다.
 * 한 행 = 한 제품이고, 양식의 「이슈 항목」 자리에 제품명이 들어갑니다.
 *
 * ■ 대상일
 * 화면에서 직접 고릅니다(기존에는 전역 기준일에 묶여 있었습니다).
 * 처음 들어오면 전역 기준일로 시작하고, 이후에는 화면 안에서만 바뀝니다.
 *
 * ■ 집계 구간
 * 조간회의 자료는 **전날 20:00 ~ 당일 08:00** 야간 근무분을 봅니다.
 * 서버 초안(`periodFrom`·`periodTo`)은 아직 08:00~08:00 이라, 화면은 구간을 표기하고
 * 실적은 일 단위로 받습니다. 서버에 구간 변경을 요청해 두었습니다.
 *
 * ■ 결재선
 * 항목 보정 → 임시 저장 → 확정 / 반려는 서버 초안(`sections`)을 그대로 씁니다.
 * 양식의 「결정항목 / 기타」·「DRI」·「기한」은 아직 서버에 자리가 없어 화면 상태로만 듭니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useAppStore } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { comma, fixed } from '@shared/utils/formatUtil';
import { labelOf } from '@domains/common/model/codeRepository';
import {
  confirmDailyReport, correctDailyReport, flattenDraftFields, loadDailyReport,
  loadDailyReportCodes, loadPressReport, pressLevel, regenerateDailyDraft, rejectDailyReport,
  saveDailyReport, shiftWindow,
} from '../model/productionRepository';

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

  /** 대상일 — 화면에서 고릅니다 (전역 기준일은 처음 한 번만 씁니다) */
  const [targetDate, setTargetDate] = useState(baseDate);
  const [processId, setProcessId] = useState('전체');
  const [topN, setTopN] = useState(10);

  const { data, loading, reload } = useAsync(() => loadDailyReport(targetDate), [targetDate]);
  const draft = data?.draft;

  /** 조간회의 자료 본문 — 제품별 실적·주간누적 */
  const { data: sheet, loading: sheetLoading } = useAsync(
    () => loadPressReport({ targetDate, processId, topN }),
    [targetDate, processId, topN],
    { initialData: { rows: [], processes: [], window: shiftWindow(targetDate), baseline: '' } }
  );

  // 상태·이력 종류·기입 출처 표시명 (서버 공통코드)
  const { data: codes } = useAsync(loadDailyReportCodes, [], { silent: true, initialData: { RPT_DOC_STATE: [], RPT_DOC_EVENT: [], RPT_ORIGIN: [] } });

  /** 공정 선택지 — 프레스 작업장만 (양식이 PRESS 자료입니다) */
  const processOptions = useMemo(
    () => [{ value: '전체', label: '프레스 전체' }, ...(sheet?.processes || []).map((p) => ({ value: p.id, label: `${p.name} (${p.id})` }))],
    [sheet]
  );

  /**
   * 담당자가 채우는 칸 — 결정항목 / DRI / 기한
   *
   * 서버 초안에 자리가 없어 제품코드별로 화면에만 둡니다. 대상일이 바뀌면 비웁니다.
   */
  const [manual, setManual] = useState({});
  useEffect(() => { setManual({}); }, [targetDate, processId]);

  const setManualCell = useCallback((product, key, value) => {
    setManual((prev) => ({ ...prev, [product]: { ...(prev[product] || {}), [key]: value } }));
  }, []);

  /** 본문 행 — 실적에 담당자 입력과 달성률 구간을 붙입니다 */
  const rows = useMemo(
    () => (sheet?.rows || []).map((r) => ({
      ...r,
      ...(manual[r.product] || {}),
      level: pressLevel(r.rate),
      weekLevel: pressLevel(r.weekRate),
    })),
    [sheet, manual]
  );

  /* ───────── 결재선 (서버 초안) ───────── */

  /** 서버 값 그대로 (dirty 비교 기준) — 마스킹 항목은 값이 없으므로 보내지 않게 표시해 둡니다 */
  const serverFields = useMemo(
    () => flattenDraftFields(draft).map((f) => ({ ...f, masked: !!f.masked || (!!f.blindFieldKey && !canData(f.blindFieldKey)) })),
    [draft, canData]
  );

  const [fields, setFields] = useState([]);
  useEffect(() => { setFields(serverFields.map((x) => ({ ...x }))); }, [serverFields]);

  const dirty = !!draft && JSON.stringify(fields.map((f) => f.value ?? '')) !== JSON.stringify(serverFields.map((f) => f.value ?? ''));

  /** 항목 값 수정 — 같은 fieldCode 가 섹션마다 있을 수 있어 seq 로 찾습니다 */
  const setFieldValue = useCallback((seq, value) => {
    setFields((prev) => prev.map((x) => (x.seq === seq ? { ...x, value } : x)));
  }, []);

  /** 특이사항 — 양식 아래 한 칸으로 뺍니다 */
  const noteField = useMemo(() => fields.find((f) => f.fieldCode === 'note') || null, [fields]);

  /** 리포지토리 호출 후 결과 메시지를 띄우고 다시 조회합니다 */
  const runAction = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message || (res.ok ? '처리되었습니다' : '처리하지 못했습니다'));
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const save = useCallback(() => runAction(() => saveDailyReport(draft.reportId, fields)), [runAction, draft, fields]);

  /** 항목 보정 — 바뀐 항목이 없으면 서버까지 가지 않습니다 */
  const correct = useCallback(
    (remark) => {
      if (!dirty) {
        toast('보정할 변경 항목이 없습니다');
        return Promise.resolve({ ok: false });
      }
      return runAction(() => correctDailyReport(draft.reportId, fields, remark));
    },
    [runAction, draft, fields, dirty, toast]
  );

  const confirm = useCallback(() => runAction(() => confirmDailyReport(draft.reportId)), [runAction, draft]);

  /** 반려 — 사유가 없으면 막습니다 (Agent 가 사유를 읽고 초안을 다시 만듭니다) */
  const reject = useCallback(
    (reason) => {
      if (!reason?.trim()) {
        toast('반려 사유를 입력하세요');
        return Promise.resolve({ ok: false });
      }
      return runAction(() => rejectDailyReport(draft.reportId, reason.trim()));
    },
    [runAction, draft, toast]
  );

  const regenerate = useCallback(() => runAction(() => regenerateDailyDraft(targetDate)), [runAction, targetDate]);

  /** 양식 그대로 내려받습니다 (열 순서·머리글 동일) */
  const exportExcel = useCallback(() => {
    const qty = canData('qty');
    const hide = (v) => (qty ? comma(v) : '비공개');
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
    sheetLoading,
    targetDate,
    setTargetDate,
    processId,
    setProcessId,
    processOptions,
    topN,
    setTopN,
    window: sheet?.window || shiftWindow(targetDate),
    baseline: sheet?.baseline || '',
    rows,
    setManualCell,
    draft,
    codes,
    stateLabel: labelOf(codes?.RPT_DOC_STATE, draft?.state),
    events: data?.events || [],
    noteField,
    dirty,
    setFieldValue,
    save,
    correct,
    confirm,
    reject,
    regenerate,
    reload,
    exportExcel,
  };
}
