/**
 * [Controller] PR-02 실적 집계·조회
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { UNIT_SPAN, clampThreeMonths, unitRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls, downloadXlsxTree } from '@shared/utils/exportUtil';
import { minutesText } from '@shared/utils/formatUtil';
import { periodUnit } from '@domains/common/model/paramModel';
import { loadModelOptions, loadResults, trendSeriesOf } from '../model/productionRepository';

export const AGG_UNITS = [
  { value: '일별', label: '일별' },
  { value: '주별', label: '주별' },
  { value: '월별', label: '월별' },
  { value: '기간선택', label: '기간선택' },
];

/**
 * 단위마다 몇 칸이 나오는지 — 토스트에 그대로 적습니다
 *
 * 2026-09-06 이전에는 주별이 이번 주 한 주, 월별이 이번 달 한 달이라 추이 막대가
 * 하나뿐이었습니다. 단위를 바꿔도 그림이 그대로여서 고른 티가 나지 않았습니다.
 * AI 통합 대시보드와 같은 규칙(`unitRange`)을 씁니다.
 */
const SPAN_TEXT = {
  일별: `최근 ${UNIT_SPAN.일별}일`,
  주별: `최근 ${UNIT_SPAN.주별}주`,
  월별: `최근 ${UNIT_SPAN.월별}개월`,
};

export function useProductionResultController() {
  const toast = useUiStore((state) => state.toast);

  const initialRange = unitRange('일별');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [unit, setUnit] = useState('일별');
  // 복수 제품 선택 지원: ['전체'] 또는 제품 코드 배열 (예: ['D62', 'D65S'])
  const [models, setModels] = useState(['전체']);

  // 제품 코드는 서버 기준정보에서 받습니다
  const { data: modelOptions } = useAsync(loadModelOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  // 파라미터로 변환된 modelCd 문자열
  // 205종 전체가 선택되었거나 200개 이상이면 사실상 전체이므로 '전체'(조건 없음)로 보내어 0건이 되지 않고 모든 실적이 정상 조회되도록 처리
  const modelCdParam = useMemo(() => {
    if (!models.length || models.includes('전체')) return '전체';
    const totalCount = (modelOptions || []).filter((o) => o.value !== '전체').length;
    if ((totalCount > 0 && models.length >= totalCount) || models.length >= 150) {
      return '전체';
    }
    return models.join(',');
  }, [models, modelOptions]);

  // 적용된 검색 조건 — 사용자가 '조회' 버튼을 눌렀을 때만 확정되어 API를 호출합니다
  const [applied, setApplied] = useState({
    from: initialRange.from,
    to: initialRange.to,
    unit: '일별',
    modelCd: '전체',
  });

  const paging = usePaging({ resetKey: `${applied.from}|${applied.to}|${applied.unit}|${applied.modelCd}` });

  const { data, loading, reload } = useAsync(
    () => loadResults({ ...applied, ...paging.params }),
    [applied.from, applied.to, applied.unit, applied.modelCd, paging.page, paging.size]
  );

  const items = data?.results?.items || [];
  const itemsMeta = data?.resultsMeta;

  /** 집계 단위를 바꾸면 구간을 다시 잡고 그 자리에서 조회합니다 */
  const changeUnit = useCallback((newUnit) => {
    setUnit(newUnit);

    if (newUnit === '기간선택') {
      // 기간선택은 사용자가 고른 날짜를 그대로 씁니다 — 92일 상한만 겁니다
      const { clamped, to: clampedTo } = clampThreeMonths(from, to);
      const nextTo = clamped ? clampedTo : to;
      if (clamped) {
        setTo(clampedTo);
        toast('조회 기간은 최대 3개월(92일)로 제한됩니다');
      }
      setApplied({ from, to: nextTo, unit: newUnit, modelCd: modelCdParam });
      paging.setPage(1);
      return;
    }

    const range = unitRange(newUnit, to);
    setFrom(range.from);
    setTo(range.to);
    setApplied({ from: range.from, to: range.to, unit: newUnit, modelCd: modelCdParam });
    paging.setPage(1);
    toast(`${newUnit} 집계: ${SPAN_TEXT[newUnit]}(${range.from} ~ ${range.to})로 조회합니다`);
  }, [from, to, modelCdParam, paging, toast]);

  /**
   * 시작일 — 자유롭게 늘리거나 줄입니다 (92일 상한)
   *
   * 예전에는 주별·월별이면 고른 날짜가 속한 한 주·한 달로 스냅했습니다. 지금은 단위가
   * 여러 칸을 잡으므로 스냅하면 도로 한 칸이 됩니다.
   */
  const changeFrom = useCallback((newFrom) => {
    const { clamped, to: clampedTo } = clampThreeMonths(newFrom, to);
    setFrom(newFrom);
    if (clamped) {
      setTo(clampedTo);
      toast('조회 기간은 최대 3개월(92일)까지 선택 가능합니다');
    }
  }, [to, toast]);

  /** 종료일 — 그 날짜를 끝으로 같은 길이만큼 다시 잡습니다 */
  const changeTo = useCallback((newTo) => {
    if (unit === '기간선택') {
      const { clamped, to: clampedTo } = clampThreeMonths(from, newTo);
      setTo(clamped ? clampedTo : newTo);
      if (clamped) toast('조회 기간은 최대 3개월(92일)까지 선택 가능합니다');
      return;
    }
    const range = unitRange(unit, newTo);
    setFrom(range.from);
    setTo(range.to);
  }, [unit, from, toast]);

  /** 제품 다중 선택 적용 */
  const applyModels = useCallback((nextModels) => {
    if (!nextModels || !nextModels.length) {
      setModels(['전체']);
    } else {
      setModels(nextModels.filter(Boolean));
    }
  }, []);

  /** 단일 모델 칩 제거 */
  const removeModel = useCallback((code) => {
    setModels((cur) => {
      const next = cur.filter((c) => c !== code);
      return next.length ? next : ['전체'];
    });
  }, []);

  const trendChart = useMemo(() => {
    const trend = data?.trend;
    if (!trend) return null;
    return {
      labels: trend.labels || [],
      qty: trendSeriesOf(trend, ['생산량', '투입', 'inputQty', 'qty']),
      ngQty: trendSeriesOf(trend, ['불량 수량', '불량수량', 'ngQty']),
      defectRate: trendSeriesOf(trend, ['불량률', 'defectRate']),
    };
  }, [data?.trend]);

  const search = useCallback(() => {
    // 3개월 제한 최종 확인
    let searchFrom = from;
    let searchTo = to;
    if (unit === '기간선택' || unit === '일별') {
      const { clamped, to: clampedTo } = clampThreeMonths(from, to);
      if (clamped) {
        searchTo = clampedTo;
        setTo(clampedTo);
        toast(`DB 성능 보호를 위해 조회 기간을 최대 3개월로 제한하여 조회합니다`);
      }
    }

    if (applied.from === searchFrom && applied.to === searchTo && applied.unit === unit && applied.modelCd === modelCdParam) {
      reload();
    } else {
      setApplied({ from: searchFrom, to: searchTo, unit, modelCd: modelCdParam });
      paging.setPage(1);
    }
    toast(`조회 조건으로 검색을 실행했습니다`);
  }, [from, to, unit, modelCdParam, applied, reload, paging, toast]);

  /**
   * 실적 내려받기 — 서버가 파일을 만듭니다.
   *
   * 화면은 쪽 단위로만 들고 있어서 여기서 표를 조립하면 그 쪽만 받게 됩니다.
   * 서버 export 는 조회 조건 전체를 뽑고 내려받기 이력도 직접 남깁니다.
   * 집계 단위·제품은 서버가 쿼리스트링으로 받으므로 경로에 붙입니다(본문은 from·to·format 만 받습니다).
   * 서버가 응답하지 못하면 화면에 있는 만큼이라도 내려받게 둡니다.
   */
  const exportExcel = useCallback(async () => {
    // 3depth 계층(일자 ➔ 제품 ➔ 공정/프레스 기기) 및 엑셀 그룹핑(+/-) 지원 .xlsx 다운로드
    await downloadXlsxTree({
      name: `생산_실적_집계_${from}_${to}`,
      head: ['일자', '제품명', '공장', '공정', '설비(기기)', '투입 수량', '양품 수량', '불량 수량', '불량률', '가동률', '비가동 시간'],
      rows: items,
    });
  }, [items, from, to]);

  return {
    loading,
    items,
    summary: data?.results?.summary,
    trend: data?.trend,
    trendChart,
    filters: { from, to, unit, modelCd: modelCdParam, models },
    paging,
    itemsMeta,
    modelOptions,
    models,
    setFrom: changeFrom,
    setTo: changeTo,
    setUnit: changeUnit,
    changeFrom,
    changeTo,
    changeUnit,
    applyModels,
    removeModel,
    search,
    exportExcel,
  };
}
