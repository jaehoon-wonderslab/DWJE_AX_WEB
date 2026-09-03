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
 * 서버가 대상일만 받아 이 구간을 계산합니다(2026-09-04 반영).
 *
 * 다만 **그 전에 만들어 둔 초안은 옛 구간(08:00~08:00)이 박혀 있습니다.** 초안이 든 값과
 * 화면이 말하는 구간이 어긋나면 안 되므로, 초안이 있으면 초안의 구간을 그대로 보여 주고
 * 어긋난 사실을 화면에 알립니다(「초안 재생성」으로 맞출 수 있습니다).
 *
 * 양식 본문(제품별 실적)은 아직 일 단위 조회라 이 구간과 다릅니다 —
 * 보고서 전용 조회를 요청해 두었습니다.
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
  saveDailyReport, saveDailyReportRows, shiftWindow,
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

  /**
   * 대상일 — 화면에서 고릅니다 (전역 기준일은 처음 한 번만 씁니다)
   *
   * 날짜 칸은 직접 타이핑할 수 있어 '2026-0' 같은 중간 상태를 거칩니다.
   * 그대로 조회하면 서버에 못 쓸 날짜가 나가므로, 형식이 갖춰진 값만 조회에 씁니다.
   */
  const [input, setInput] = useState(baseDate);
  const [queried, setQueried] = useState(baseDate);
  const [processId, setProcessId] = useState('전체');
  const [topN, setTopN] = useState(10);

  const setTargetDate = useCallback((v) => {
    setInput(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())) setQueried(v);
  }, []);

  const targetDate = queried;

  const { data, loading, reload } = useAsync(() => loadDailyReport(targetDate), [targetDate]);
  const draft = data?.draft;

  /** 조간회의 자료 본문 — 제품별 실적·주간누적 */
  /**
   * 화면에 적을 집계 구간
   *
   * 초안이 있으면 **초안에 박힌 구간**이 진실입니다 — 초안의 수량이 그 구간으로 집계된 값이라,
   * 화면만 20:00~08:00 이라고 적으면 값과 설명이 어긋납니다.
   */
  const expected = useMemo(() => shiftWindow(targetDate), [targetDate]);
  const draftWindow = draft?.periodFrom && draft?.periodTo
    ? { from: String(draft.periodFrom).slice(0, 16), to: String(draft.periodTo).slice(0, 16) }
    : null;
  const win = draftWindow || expected;
  /** 옛 구간(08:00~08:00)이 박힌 초안 — 재생성하면 맞습니다 */
  const windowStale = !!draftWindow && (draftWindow.from !== expected.from || draftWindow.to !== expected.to);

  const { data: sheet, loading: sheetLoading, reload: reloadSheet } = useAsync(
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

  /**
   * 본문 행 — 실적에 담당자 입력을 얹고 달성률을 계산합니다
   *
   * 일목표는 작성자가 채우는 값입니다. 아직 안 채웠으면 참고값(`targetRef`)으로 계산하고
   * `provisional` 로 표시해, 화면이 그 숫자를 흐리게 그리도록 합니다.
   */
  const rows = useMemo(
    () => (sheet?.rows || []).map((r) => {
      const m = manual[r.product] || {};
      const raw = m.target === undefined ? (r.savedTarget === null ? '' : String(r.savedTarget)) : m.target;
      const typed = raw === null || raw === '' ? null : Number(String(raw).replace(/[^\d.-]/g, ''));
      const target = Number.isFinite(typed) && typed > 0 ? typed : null;

      /**
       * 목표를 안 채웠으면 **달성률도 상태도 내지 않습니다**
       *
       * 참고값(그 주 야간 일평균)으로 계산하면 주간달성률이 산술적으로 늘 100.0% 가 됩니다 —
       * 주간목표 = 참고값 × 일수 = 주간실적 이기 때문입니다. 근거 없는 숫자가 목표처럼 보이면
       * 안 된다는 원칙(API 세션과 합의, 2026-09-04)에 따라 비웁니다.
       * 참고값은 입력칸의 회색 밑값으로만 남습니다.
       */
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

  /** 작성자가 손댄 행이 있는가 (일목표 · 결정항목 · DRI · 기한) */
  const rowsDirty = Object.keys(manual).length > 0;

  /**
   * 행 저장 — **손댄 행만** 보냅니다
   *
   * 서버는 보낸 제품만 갱신하고, 같은 제품을 두 번 보내면 400 입니다.
   * 빈 문자열은 `null` 로 바꿔 그 칸을 비웁니다.
   */
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
    if (!sheet?.reportId) {
      toast('보고서 초안이 없습니다. 「초안 재생성」을 먼저 눌러 주세요');
      return { ok: false };
    }
    const res = await saveDailyReportRows(sheet.reportId, payload);
    toast(res.message || (res.ok ? `${payload.length}개 제품을 저장했습니다` : '저장하지 못했습니다'));
    if (res.ok) {
      setManual({});
      reloadSheet();
    }
    return res;
  }, [manual, sheet, toast, reloadSheet]);

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
        r.target === null ? '—' : hide(r.target),
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
    dateInput: input,
    setTargetDate,
    processId,
    setProcessId,
    processOptions,
    topN,
    setTopN,
    window: win,
    expectedWindow: expected,
    reportId: sheet?.reportId ?? null,
    processCds: sheet?.processCds || [],
    rowsDirty,
    saveRows,
    windowStale,
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
