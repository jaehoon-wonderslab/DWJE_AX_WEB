/**
 * [Controller] RP-07 폐기 보고서 작성 위저드 (5단계)
 *
 * MES 폐기 전표 선택 → 수기 입력 → 금액 산정 → 검토·결재선 → 생성
 *
 * [핵심 규칙] 금액 입력은 필수가 아닙니다.
 *            단가를 비운 채 저장하면 '미산정'으로 표기되고 금액 합계에서 제외됩니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { SCRAP_WIZARD_STEPS } from '@shared/constants/reportColumns';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { loadModelOptions } from '@domains/production/model/productionRepository';
import {
  addManualRow, adjustUnitPrice, calculateScrap, createScrapDraft, deleteScrapDraft, loadMesVouchers,
  publishScrapReport, removeManualRow, saveApprovalLine, saveScrapDraft, sendReviewRequest,
} from '../model/reportRepository';

export function useScrapWizardController() {
  const toast = useUiStore((state) => state.toast);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(null);
  const [calc, setCalc] = useState(null);
  const [cond, setCond] = useState({ ...currentMonthRange(), process: '전체', model: '전체', originType: '전체' });
  const [picked, setPicked] = useState([]);

  // 모델 및 공정 기준정보 선택지
  const { data: modelOptions } = useAsync(loadModelOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });
  const { data: processOptions } = useAsync(loadProcessOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  // 1단계 — MES 폐기 전표 조회 (전표가 많아 쪽 단위로 봅니다)
  const voucherPaging = usePaging({ resetKey: `${cond.from}|${cond.to}|${cond.process}|${cond.model}|${cond.originType}` });
  const { data: voucherData, loading: loadingVouchers } = useAsync(
    () => loadMesVouchers({ ...cond, ...voucherPaging.params }),
    [cond.from, cond.to, cond.process, cond.model, cond.originType, voucherPaging.page, voucherPaging.size]
  );

  /**
   * 초안은 **2단계로 넘어갈 때** 만듭니다.
   *
   * 예전에는 화면에 들어오기만 해도 만들었습니다. 그래서 둘러보다 나간 사용자마다
   * 빈 초안이 하나씩 남았고, 삭제 수단이 없어 쌓이기만 했습니다.
   * 1단계(전표 조회·선택)는 초안 없이도 됩니다.
   */
  const ensureDraft = useCallback(async () => {
    if (draft) return draft;
    const res = await createScrapDraft();
    if (!res.ok) {
      toast(res.message || '초안을 만들지 못했습니다');
      return null;
    }
    // 서버는 data 자체가 초안입니다 (data.draft 가 아닙니다)
    const made = res.data;
    setDraft(made);
    if (made?.pickedVoucherIds?.length) setPicked(made.pickedVoucherIds);
    return made;
  }, [draft, toast]);

  const items = voucherData?.items || [];

  const recalc = useCallback(async (target) => {
    const current = target || draft;
    if (!current) return null;
    const res = await calculateScrap(current.draftId);
    if (res.ok) setCalc(res.data);
    return res;
  }, [draft]);

  /** 단계 이동 — 전표를 1건도 고르지 않으면 다음으로 넘어갈 수 없습니다 */
  const goStep = useCallback(
    async (next) => {
      if (next > 1 && !picked.length) {
        toast('1단계에서 폐기 대상 전표를 1건 이상 선택하세요');
        return;
      }
      const target = Math.max(1, Math.min(SCRAP_WIZARD_STEPS.length, next));
      if (target === 1) { setStep(1); return; }

      const current = await ensureDraft();
      if (!current) return;
      await saveScrapDraft({ draftId: current.draftId, step: target, cond, pickedVoucherIds: picked });
      // 3단계부터는 금액을 다시 산정합니다
      if (target >= 3) await recalc(current);
      setStep(target);
    },
    [picked, cond, recalc, toast, ensureDraft]
  );

  const togglePick = useCallback(
    (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    []
  );

  const reset = useCallback(async () => {
    const res = await createScrapDraft();
    if (res.ok) {
      setDraft(res.data.draft);
      setPicked(res.data.draft.pickedVoucherIds);
      setCalc(null);
      setStep(1);
      toast(res.message);
    }
  }, [toast]);

  /* ── 2단계 ── */
  const saveForm = useCallback(
    async (form) => {
      setDraft((prev) => ({ ...prev, form }));
      await saveScrapDraft({ draftId: draft.draftId, form });
    },
    [draft]
  );

  const addRow = useCallback(
    async (values) => {
      const res = await addManualRow(draft.draftId, values);
      toast(res.message);
      if (res.ok) setDraft(res.data.draft);
      return res;
    },
    [draft, toast]
  );

  const removeRow = useCallback(
    async (rowId) => {
      const res = await removeManualRow(draft.draftId, rowId);
      toast(res.message);
      if (res.ok) setDraft(res.data.draft);
      return res;
    },
    [draft, toast]
  );

  /* ── 3단계 ── */
  const savePrice = useCallback(
    async (key, unitPrice, reason) => {
      const res = await adjustUnitPrice(draft.draftId, key, unitPrice, reason);
      toast(res.message);
      if (res.ok) await recalc();
      return res;
    },
    [draft, recalc, toast]
  );

  /* ── 4단계 ── */
  const saveReview = useCallback(
    async (review) => {
      setDraft((prev) => ({ ...prev, review }));
      await saveApprovalLine(draft.draftId, review);
    },
    [draft]
  );

  const requestReview = useCallback(async () => {
    const res = await sendReviewRequest(draft.draftId);
    toast(res.message);
    return res;
  }, [draft, toast]);

  /* ── 5단계 ── */
  const publish = useCallback(async () => {
    const res = await publishScrapReport(draft.draftId);
    toast(res.message);
    return res;
  }, [draft, toast]);

  const cancelDraft = useCallback(async () => {
    if (!draft?.draftId) {
      setStep(1);
      setPicked([]);
      setCalc(null);
      setDraft(null);
      return { ok: true };
    }
    const res = await deleteScrapDraft(draft.draftId);
    toast(res.message);
    if (res.ok) {
      setDraft(null);
      setCalc(null);
      setPicked([]);
      setStep(1);
    }
    return res;
  }, [draft, toast]);

  return {
    voucherPaging,
    vouchersMeta: voucherData?.meta,
    steps: SCRAP_WIZARD_STEPS,
    step,
    goStep,
    draft,
    calc,
    cond,
    setCond,
    items,
    loadingVouchers,
    picked,
    setPicked,
    togglePick,
    reset,
    cancelDraft,
    modelOptions,
    processOptions,
    saveForm,
    addRow,
    removeRow,
    savePrice,
    saveReview,
    requestReview,
    publish,
  };
}
