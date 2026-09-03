/**
 * [Controller] PR-03 일일 생산현황 보고
 *
 * 집계 구간은 전날 08:00 ~ 당일 08:00 으로 고정입니다.
 * 담당자가 항목별로 보정한 내용은 확정 전까지 화면 상태로만 들고 있습니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useAppStore } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import {
  confirmDailyReport, correctDailyReport, loadDailyReport, regenerateDailyDraft,
  rejectDailyReport, saveDailyReport,
} from '../model/productionRepository';

export function useDailyReportController() {
  const targetDate = useAppStore((state) => state.baseDate);
  const toast = useUiStore((state) => state.toast);

  const { data, loading, reload } = useAsync(() => loadDailyReport(targetDate), [targetDate]);
  const draft = data?.draft;

  // 편집 중인 섹션 본문
  const [sections, setSections] = useState([]);
  useEffect(() => {
    if (draft?.sections) setSections(draft.sections.map((x) => ({ ...x })));
  }, [draft]);

  const dirty = !!draft && JSON.stringify(sections) !== JSON.stringify(draft.sections);

  const setSectionBody = useCallback((key, body) => {
    setSections((prev) => prev.map((x) => (x.key === key ? { ...x, body } : x)));
  }, []);

  /** 리포지토리 호출 후 결과 메시지를 띄우고 다시 조회합니다 */
  const runAction = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const save = useCallback(() => runAction(() => saveDailyReport(draft.reportId, sections)), [runAction, draft, sections]);
  const correct = useCallback(() => runAction(() => correctDailyReport(draft.reportId, sections)), [runAction, draft, sections]);
  const confirm = useCallback(() => runAction(() => confirmDailyReport(draft.reportId)), [runAction, draft]);
  const reject = useCallback((reason) => runAction(() => rejectDailyReport(draft.reportId, reason)), [runAction, draft]);
  const regenerate = useCallback(() => runAction(() => regenerateDailyDraft(targetDate)), [runAction, targetDate]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '일일 생산현황 보고서',
      head: ['항목', '내용'],
      rows: sections.map((x) => [x.title, x.body.replace(/\n/g, ' ')]),
    });
  }, [sections]);

  return {
    loading: loading || !draft,
    draft,
    events: data?.events || [],
    sections,
    dirty,
    setSectionBody,
    save,
    correct,
    confirm,
    reject,
    regenerate,
    exportExcel,
  };
}
