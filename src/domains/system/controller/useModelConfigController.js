/**
 * [Controller] SY-10 AI 모델 설정
 *
 * 임계치 항목은 서버가 목록으로 내려줍니다(`thresholds`).
 * 화면에 항목을 고정해 두면 서버에 항목이 늘거나 줄 때마다 화면을 고쳐야 하므로,
 * 받은 목록을 그대로 그리고 값만 편집합니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import * as repo from '../model/systemRepository';

/** 대상 컬럼 — 폼은 쉼표 구분 문자열, 서버는 배열(`targetFields[]`)로 받습니다 */
function toFieldList(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function useModelConfigController() {
  const toast = useUiStore((state) => state.toast);
  const { data, loading, reload } = useAsync(() => repo.loadModelConfig(), []);

  // 마스킹 처리 4종(FULL · PARTIAL · HASH · DROP)의 표시명은 공통코드가 정본입니다
  const { data: codes } = useAsync(() => loadCodeGroups('AI_MASK_TYPE'), [], { silent: true, initialData: {} });

  // 저장 전까지는 화면 상태로만 들고 있습니다
  const [thresholds, setThresholds] = useState([]);
  const [classification, setClassification] = useState({});
  const [dirty, setDirty] = useState(false);

  // 서버 응답이 바뀌면(data 변경) 편집 상태를 다시 초기화합니다
  useEffect(() => {
    setThresholds(data?.config?.thresholds || []);
    setClassification({ ...(data?.config?.classification?.raw || {}) });
    setDirty(false);
  }, [data]);

  /** 임계치 한 항목의 값을 바꿉니다 */
  const setThreshold = useCallback((key, value) => {
    setThresholds((prev) => prev.map((t) => (t.key === key ? { ...t, value } : t)));
    setDirty(true);
  }, []);

  /** 분류 기준 한 항목의 값을 바꿉니다 */
  const setClassify = useCallback((key, value) => {
    setClassification((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!thresholds.length && !Object.keys(classification).length) {
      toast('저장할 임계치·분류 기준 항목이 없습니다');
      return;
    }
    const res = await repo.saveModelConfig({
      thresholds: thresholds.map((t) => ({ key: t.key, value: t.value })),
      classification,
    });
    toast(res.message);
    if (res.ok) reload();
  }, [thresholds, classification, toast, reload]);

  /**
   * 보안 필터링 패턴 등록·수정
   *
   * 서버가 받는 항목은 name · fieldKey · targetFields[] · action · customerPolicy · useYn 입니다.
   * 대상 컬럼은 폼에서 쉼표로 적으므로 배열로 바꿔 보냅니다.
   */
  const submitRule = useCallback(
    async (ruleId, values) => {
      const payload = {
        name: values.name,
        targetFields: toFieldList(values.targetFields),
        action: values.action,
        customerPolicy: values.customerPolicy || undefined,
        useYn: values.useYn || 'Y',
        ...(values.fieldKey ? { fieldKey: values.fieldKey } : {}),
      };
      if (!payload.targetFields.length) {
        toast('대상 컬럼을 한 개 이상 입력해 주세요 (schema.table.column, 쉼표로 구분)');
        return { ok: false };
      }
      const res = await repo.saveMaskRule(ruleId, payload);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  return {
    loading,
    thresholds,
    classification,
    dirty,
    /** 분류 기준 표시용 — 서버가 이름을 주지 않는 항목은 key 를 그대로 보여 줍니다 */
    classifyRows: Object.entries(classification).map(([key, value]) => ({ key, value })),
    rules: data?.rules?.items || [],
    maskTypes: codes?.AI_MASK_TYPE || [],
    setThreshold,
    setClassify,
    save,
    submitRule,
  };
}
