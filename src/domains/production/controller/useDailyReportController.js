/**
 * [Controller] PR-03 일일 생산현황 보고
 *
 * 집계 구간은 전날 08:00 ~ 당일 08:00 으로 고정입니다.
 * 담당자가 항목별로 보정한 내용은 저장·확정 전까지 화면 상태로만 들고 있습니다.
 *
 * 서버 초안은 `sections[{section, fields[{seq,field,fieldCode,value,origin,corrected,blindFieldKey,remark}]}]`
 * 구조라 편집하기 쉽게 한 줄 목록(`fields`)으로 펴서 들고, 보낼 때 다시 섹션으로 묶습니다(리포지토리).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useAppStore } from '@shared/stores/useAppStore';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { labelOf } from '@domains/common/model/codeRepository';
import {
  confirmDailyReport, correctDailyReport, dailySectionTitle, flattenDraftFields, loadDailyReport,
  loadDailyReportCodes, regenerateDailyDraft, rejectDailyReport, saveDailyReport,
} from '../model/productionRepository';

export function useDailyReportController() {
  const targetDate = useAppStore((state) => state.baseDate);
  const toast = useUiStore((state) => state.toast);
  const canData = useAuthStore((state) => state.canData);

  const { data, loading, reload } = useAsync(() => loadDailyReport(targetDate), [targetDate]);
  const draft = data?.draft;

  // 상태·이력 종류·기입 출처 표시명 (서버 공통코드)
  const { data: codes } = useAsync(loadDailyReportCodes, [], { silent: true, initialData: { RPT_DOC_STATE: [], RPT_DOC_EVENT: [], RPT_ORIGIN: [] } });

  /** 서버 값 그대로 (dirty 비교 기준) — 마스킹 항목은 값이 없으므로 보내지 않게 표시해 둡니다 */
  const serverFields = useMemo(
    () => flattenDraftFields(draft).map((f) => ({ ...f, masked: !!f.masked || (!!f.blindFieldKey && !canData(f.blindFieldKey)) })),
    [draft, canData]
  );

  // 편집 중인 항목 값
  const [fields, setFields] = useState([]);
  useEffect(() => {
    setFields(serverFields.map((x) => ({ ...x })));
  }, [serverFields]);

  const dirty = !!draft && JSON.stringify(fields.map((f) => f.value ?? '')) !== JSON.stringify(serverFields.map((f) => f.value ?? ''));

  /** 항목 값 수정 — 같은 fieldCode 가 섹션마다 있을 수 있어 seq 로 찾습니다 */
  const setFieldValue = useCallback((seq, value) => {
    setFields((prev) => prev.map((x) => (x.seq === seq ? { ...x, value } : x)));
  }, []);

  /** 섹션 순서대로 묶어 화면에 넘깁니다 */
  const sections = useMemo(() => {
    const order = [];
    const bySection = {};
    fields.forEach((f) => {
      if (!bySection[f.section]) {
        bySection[f.section] = [];
        order.push(f.section);
      }
      bySection[f.section].push(f);
    });
    return order.map((code) => ({ code, title: dailySectionTitle(code), fields: bySection[code] }));
  }, [fields]);

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

  const exportExcel = useCallback(() => {
    downloadXls({
      name: `일일 생산현황 보고서 ${targetDate}`,
      head: ['구분', '항목', '값', '기입 출처', '보정', '비고'],
      rows: fields.map((f) => [
        dailySectionTitle(f.section),
        f.field,
        f.masked ? '비공개' : String(f.value ?? '').replace(/\n/g, ' '),
        labelOf(codes?.RPT_ORIGIN, f.origin),
        f.corrected ? '보정됨' : '',
        f.remark || '',
      ]),
    });
  }, [fields, codes, targetDate]);

  return {
    loading,
    targetDate,
    draft,
    codes,
    events: data?.events || [],
    sections,
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
