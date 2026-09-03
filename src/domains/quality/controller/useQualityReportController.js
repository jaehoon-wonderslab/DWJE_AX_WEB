/**
 * [Controller] QC-03 품질 보고서
 *
 * 원인 분석·이력 추적 결과를 양식에 자동 기입하고 증빙 이미지를 붙이며 영업비밀을 마스킹합니다.
 * 서술 항목(AI 초안·수기)은 담당자가 임시 저장·확정할 때까지 화면 상태로만 들고 있습니다.
 *
 * 서버(QualityReportService) 응답 구조
 *  · header{title, formId, formNm, lotNo, occurDate, customer, disclosurePolicy, version, generatedAt, generatedBy}
 *  · sections[{section: HEADER|RESULT|CONDITION|CAUSE|TRACE|ACTION|BODY, fields[{fieldCode, field, value, origin, corrected, masked, blindFieldKey}]}]
 *  · images[{id, name, nasPath, defectType, lotNo, capturedAt, attachedAt}] · state(RPT_DOC_STATE 코드)
 *  · autofill-status: fields[{field, label(=코드), origin MES|AI|MANUAL, corrected, filled}] + summary{total, mes, ai, manual, corrected}
 *  · masking: rules[{ruleId, field, fieldKey, policy, action(표시명), targets[]}] + disclosurePolicy · customer
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, printDocument } from '@shared/utils/exportUtil';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import {
  attachEvidenceImages, confirmQualityReport, createReportDraft,
  fetchEvidenceImages, loadQualityReport, regenerateQualityReport, rejectQualityReport,
  requestUnmask, saveQualityReport,
} from '../model/qualityRepository';

/** 인쇄(PDF 미리보기)할 문서 영역의 nativeID */
export const DOC_NODE_ID = 'qc-report-doc';

/** 섹션 코드 → 문서 제목·순서 (서버 sectionOf() 판정 코드) */
export const SECTION_META = {
  HEADER: { title: '머리 정보', order: 0 },
  RESULT: { title: '1. 불량 발생 현황', order: 1 },
  CONDITION: { title: '2. 공정 조건', order: 2 },
  CAUSE: { title: '3. 원인 분석', order: 3 },
  TRACE: { title: '4. 이력 추적', order: 4 },
  ACTION: { title: '5. 조치 및 재발 방지', order: 5 },
  BODY: { title: '기타 항목', order: 6 },
};

/** 기입 출처 코드(MES / AI / MANUAL) → 소문자 키 */
export const originKey = (origin) => String(origin || 'manual').toLowerCase();

/**
 * 섹션의 생성 주체 — 전부 MES 면 자동 기입, AI 가 하나라도 있으면 AI 초안, 그 외 수기
 * @returns {'auto'|'ai'|'manual'|null}
 */
export function whoOf(fields = []) {
  if (!fields.length) return null;
  if (fields.every((f) => originKey(f.origin) === 'mes')) return 'auto';
  if (fields.some((f) => originKey(f.origin) === 'ai')) return 'ai';
  return 'manual';
}

/** 문서 상태 코드 → 배지 색 */
export const stateTone = (state) => ({ CONFIRMED: 'green', PUBLISHED: 'blue', REJECTED: 'red', SAVED: 'amber' }[state] ?? '');

export function useQualityReportController() {
  const toast = useUiStore((state) => state.toast);

  // 조회 조건 — 양식·정책은 코드 값으로 들고 있다가 서버에 그대로 보냅니다
  const [formId, setFormId] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [policy, setPolicy] = useState('');

  // 공개 정책·문서 상태·기입 출처 표시명은 서버 공통코드가 정본입니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('VEC_CONFIDENTIAL', 'RPT_DOC_STATE', 'RPT_ORIGIN'),
    [],
    { silent: true, initialData: {} }
  );
  const policyOptions = codes?.VEC_CONFIDENTIAL || [];
  const stateOptions = codes?.RPT_DOC_STATE || [];

  // 보고서 ID 를 박아 두지 않습니다 — 목록의 첫 건을 펼치고, 생성·이력 선택으로 바꿉니다
  const [reportId, setReportId] = useState(null);
  const { data, loading, reload } = useAsync(() => loadQualityReport(reportId), [reportId]);

  const report = data?.report || null;
  const forms = data?.forms?.items || [];
  const currentReportId = data?.reportId ?? null;
  const isConfirmed = report?.state === 'CONFIRMED';

  // 양식 목록이 오면 첫 양식을 기본 선택 (양식이 없으면 생성할 수 없습니다)
  useEffect(() => {
    if (!formId && forms.length) setFormId(String(forms[0].formId));
  }, [forms, formId]);

  /** 문서 본문 — 섹션을 문서 순서로 정렬하고 제목·생성 주체를 붙입니다. 값은 임시 저장 전까지 화면 상태입니다 */
  const [sections, setSections] = useState([]);
  useEffect(() => {
    const list = (report?.sections || [])
      .map((sec) => {
        const meta = SECTION_META[sec.section] || { title: sec.section || '기타 항목', order: 99 };
        const fields = (sec.fields || []).map((f) => ({ ...f }));
        return { section: sec.section, title: meta.title, order: meta.order, who: whoOf(fields), fields };
      })
      .sort((a, b) => a.order - b.order);
    setSections(list);
  }, [report]);

  const setFieldValue = useCallback((fieldCode, value) => {
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.fieldCode === fieldCode ? { ...f, value } : f)),
      }))
    );
  }, []);

  const runAction = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message || (res.ok ? '처리했습니다' : '처리하지 못했습니다'));
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  /** 조회 조건으로 보고서 초안을 새로 만들고 그 보고서를 펼칩니다 */
  const generate = useCallback(async () => {
    if (!formId) {
      toast(forms.length ? '보고서 양식을 선택하세요' : '등록된 보고서 양식이 없습니다 — 양식 관리에서 먼저 등록해 주세요');
      return { ok: false };
    }
    const res = await createReportDraft({
      formId: Number(formId),
      lotNo: lotNo.trim() || undefined,
      disclosurePolicy: policy || undefined,
    });
    toast(res.message || (res.ok ? '보고서 초안을 생성했습니다' : '초안을 생성하지 못했습니다'));
    if (res.ok) {
      const newId = res.data?.reportId ?? null;
      if (newId != null && newId !== reportId) setReportId(newId);
      else reload();
    }
    return res;
  }, [formId, lotNo, policy, forms.length, reportId, toast, reload]);

  const save = useCallback(() => runAction(() => saveQualityReport(currentReportId, sections)), [runAction, sections, currentReportId]);
  const confirm = useCallback(() => runAction(() => confirmQualityReport(currentReportId)), [runAction, currentReportId]);
  const reject = useCallback((reason) => runAction(() => rejectQualityReport(currentReportId, reason)), [runAction, currentReportId]);
  const regenerate = useCallback(() => runAction(() => regenerateQualityReport(currentReportId)), [runAction, currentReportId]);
  const submitUnmask = useCallback((fields, reason) => runAction(() => requestUnmask(currentReportId, fields, reason)), [runAction, currentReportId]);

  /**
   * 출력 3종
   *  · xls     — 서버가 만든 파일을 그대로 내려받습니다 (다운로드 이력은 서버가 남깁니다)
   *  · pdf     — 화면의 문서 영역을 인쇄 창으로 열어 PDF 로 저장합니다
   *  · ppt-img — 서버 출력 형식(xls/csv)에 없어 아직 제공하지 않습니다
   */
  const exportAs = useCallback(
    async (format) => {
      if (currentReportId == null) return;
      if (format === 'pdf') {
        printDocument({ nodeId: DOC_NODE_ID, title: report?.header?.title || '품질 보고서' });
        return;
      }
      if (format === 'ppt-img') {
        toast('PPT용 표·그래프 이미지 출력은 서버에서 아직 제공하지 않습니다');
        return;
      }
      await downloadFromServer({ path: `/quality/reports/${currentReportId}/export`, body: { format }, name: '품질 보고서' });
    },
    [currentReportId, report, toast]
  );

  const loadImages = useCallback((criteria) => fetchEvidenceImages(currentReportId, criteria), [currentReportId]);
  const attachImages = useCallback((imageIds) => runAction(() => attachEvidenceImages(currentReportId, imageIds)), [runAction, currentReportId]);

  /** 이력에서 다른 보고서를 고르면 그 보고서를 펼칩니다 */
  const selectReport = useCallback((id) => setReportId(id), []);

  const formOptions = useMemo(() => forms.map((f) => ({ value: String(f.formId), label: f.name })), [forms]);

  return {
    // 조회가 끝났는데 보고서가 없는 것과 아직 조회 중인 것은 다릅니다 — 0건이면 빈 상태를 그립니다
    loading,
    report,
    reportId: currentReportId,
    isConfirmed,
    stateLabel: report ? labelOf(stateOptions, report.state) : '',
    forms,
    formOptions,
    policyOptions,
    autofill: data?.autofill?.fields || [],
    autofillSummary: data?.autofill?.summary || null,
    masking: data?.masking || null,
    maskingRules: data?.masking?.rules || [],
    history: data?.history?.items || [],
    stateLabelOf: (state) => labelOf(stateOptions, state),
    sections,
    setFieldValue,
    filters: { formId, lotNo, policy },
    setFormId,
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
    selectReport,
  };
}
