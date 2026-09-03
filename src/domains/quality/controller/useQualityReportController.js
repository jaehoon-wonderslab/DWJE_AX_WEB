/**
 * [Controller] QC-03 품질 보고서
 *
 * 원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다.
 * 서술 항목(AI 초안)은 담당자가 확정할 때까지 화면 상태로만 들고 있습니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import {
  attachEvidenceImages, confirmQualityReport, createReportDraft, exportQualityReport,
  fetchEvidenceImages, loadQualityReport, regenerateQualityReport, rejectQualityReport,
  requestUnmask, saveQualityReport,
} from '../model/qualityRepository';

export function useQualityReportController() {
  const toast = useUiStore((state) => state.toast);

  const [formName, setFormName] = useState('불량 폐기 보고서');
  const [lotNo, setLotNo] = useState('L260824-031');
  const [policy, setPolicy] = useState('글로벌 고객사 A');

  // 보고서 ID 를 박아 두지 않습니다 — 목록의 첫 건을 펼칩니다
  const [reportId, setReportId] = useState(null);
  const { data, loading, reload } = useAsync(() => loadQualityReport(reportId), [reportId]);

  const report = data?.report;
  const forms = data?.forms?.items || [];
  const currentReportId = data?.reportId ?? null;

  const [sections, setSections] = useState([]);
  useEffect(() => {
    if (report?.sections) setSections(report.sections.map((x) => ({ ...x })));
  }, [report]);

  const setSectionBody = useCallback((key, body) => {
    setSections((prev) => prev.map((x) => (x.key === key ? { ...x, body } : x)));
  }, []);

  const runAction = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  /** 조회 조건으로 보고서 초안을 새로 만듭니다 */
  const generate = useCallback(() => {
    const formId = forms.find((f) => f.name === formName)?.formId;
    return runAction(() => createReportDraft({ formId, lotNo, disclosurePolicy: policy }));
  }, [runAction, forms, formName, lotNo, policy]);

  const save = useCallback(() => runAction(() => saveQualityReport(currentReportId, sections)), [runAction, sections, currentReportId]);
  const confirm = useCallback(() => runAction(() => confirmQualityReport(currentReportId)), [runAction, currentReportId]);
  const reject = useCallback((reason) => runAction(() => rejectQualityReport(currentReportId, reason)), [runAction, currentReportId]);
  const regenerate = useCallback(() => runAction(() => regenerateQualityReport(currentReportId)), [runAction, currentReportId]);
  const exportAs = useCallback((format) => runAction(() => exportQualityReport(currentReportId, format)), [runAction, currentReportId]);
  const submitUnmask = useCallback((fields, reason) => runAction(() => requestUnmask(currentReportId, fields, reason)), [runAction, currentReportId]);

  const loadImages = useCallback((criteria, limit) => fetchEvidenceImages(currentReportId, criteria, limit), [currentReportId]);
  const attachImages = useCallback((imageIds) => runAction(() => attachEvidenceImages(currentReportId, imageIds)), [runAction, currentReportId]);

  return {
    // 조회가 끝났는데 보고서가 없는 것과 아직 조회 중인 것은 다릅니다.
    // 예전엔 `loading || !report` 라서 보고서가 0건이면 로딩이 끝나지 않았습니다
    loading,
    report,
    forms,
    autofill: data?.autofill?.fields || [],
    maskingRules: data?.masking?.rules || [],
    history: data?.history?.items || [],
    sections,
    setSectionBody,
    filters: { formName, lotNo, policy },
    setFormName,
    setLotNo,
    setPolicy,
    generate,
    save,
    confirm,
    reject,
    regenerate,
    exportAs,
    submitUnmask,
    loadImages,
    attachImages,
  };
}
