/**
 * [Controller] PR-02 실적 집계·조회
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer, downloadXls, downloadXlsxTree } from '@shared/utils/exportUtil';
import { minutesText, today } from '@shared/utils/formatUtil';
import { periodUnit } from '@domains/common/model/paramModel';
import { loadModelOptions, loadResults, trendSeriesOf } from '../model/productionRepository';

export const AGG_UNITS = [
  { value: '일별', label: '일별' },
  { value: '주별', label: '주별' },
  { value: '월별', label: '월별' },
  { value: '기간선택', label: '기간선택' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 주의 시작: 월요일 ~ 일요일 */
export function getWeekBounds(baseDateStr) {
  const d = new Date(baseDateStr || Date.now());
  const day = d.getDay(); // 0: 일, 1: 월, ..., 6: 토
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: formatDate(mon), to: formatDate(sun) };
}

/** 월의 시작: 1일 ~ 말일 */
export function getMonthBounds(baseDateStr) {
  const d = new Date(baseDateStr || Date.now());
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { from: formatDate(first), to: formatDate(last) };
}

/** 3개월(최대 92일) 제한 검증 및 클램프 */
export function clampThreeMonths(fromStr, toStr) {
  const fromD = new Date(fromStr);
  const toD = new Date(toStr);
  const diffMs = toD.getTime() - fromD.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 92) {
    const clampedTo = new Date(fromD);
    clampedTo.setDate(fromD.getDate() + 92);
    return { clamped: true, from: fromStr, to: formatDate(clampedTo) };
  }
  return { clamped: false, from: fromStr, to: toStr };
}

export function useProductionResultController() {
  const toast = useUiStore((state) => state.toast);

  const [from, setFrom] = useState(recentRange(7).from);
  const [to, setTo] = useState(recentRange(7).to);
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
    from: recentRange(7).from,
    to: recentRange(7).to,
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

  /** 집계 단위 변경 시 날짜 자동 계산 및 즉시 적용 */
  const changeUnit = useCallback((newUnit) => {
    setUnit(newUnit);
    // 기준일: 현재 보고 있는 종료일(to) 또는 오늘(today, 9월). 지금 시점을 우선 반영합니다.
    const refDate = to || today();
    let nextFrom = from;
    let nextTo = to;

    if (newUnit === '주별') {
      const bounds = getWeekBounds(refDate);
      nextFrom = bounds.from;
      nextTo = bounds.to;
      setFrom(nextFrom);
      setTo(nextTo);
      toast(`주별 집계: 월요일(${bounds.from}) ~ 일요일(${bounds.to})로 조회합니다`);
    } else if (newUnit === '월별') {
      // 지금 9월이면 현재 월(9월 1일 ~ 9월 말일)로 정확하게 세팅
      const bounds = getMonthBounds(refDate);
      nextFrom = bounds.from;
      nextTo = bounds.to;
      setFrom(nextFrom);
      setTo(nextTo);
      toast(`월별 집계: 1일(${bounds.from}) ~ 말일(${bounds.to})로 조회합니다`);
    } else if (newUnit === '일별') {
      const range = recentRange(7);
      nextFrom = range.from;
      nextTo = range.to;
      setFrom(nextFrom);
      setTo(nextTo);
      toast(`일별 집계: 최근 7일(${nextFrom} ~ ${nextTo})로 조회합니다`);
    } else {
      // 기간선택: 3개월 초과 시 제한
      const { clamped, to: clampedTo } = clampThreeMonths(from, to);
      if (clamped) {
        nextTo = clampedTo;
        setTo(clampedTo);
        toast(`조회 기간은 최대 3개월(92일)로 제한됩니다`);
      }
    }

    // 단위 변경 시 즉시 검색 실행 (재클릭 없이 바로 9월 데이터 표시)
    setApplied({ from: nextFrom, to: nextTo, unit: newUnit, modelCd: modelCdParam });
    paging.setPage(1);
  }, [from, to, modelCdParam, paging, toast]);

  /** 시작일 변경 */
  const changeFrom = useCallback((newFrom) => {
    if (unit === '주별') {
      const bounds = getWeekBounds(newFrom);
      setFrom(bounds.from);
      setTo(bounds.to);
    } else if (unit === '월별') {
      const bounds = getMonthBounds(newFrom);
      setFrom(bounds.from);
      setTo(bounds.to);
    } else {
      setFrom(newFrom);
      const { clamped, to: clampedTo } = clampThreeMonths(newFrom, to);
      if (clamped) {
        setTo(clampedTo);
        toast(`조회 기간은 최대 3개월(92일)까지 선택 가능합니다`);
      }
    }
  }, [unit, to, toast]);

  /** 종료일 변경 */
  const changeTo = useCallback((newTo) => {
    if (unit === '주별') {
      const bounds = getWeekBounds(newTo);
      setFrom(bounds.from);
      setTo(bounds.to);
    } else if (unit === '월별') {
      const bounds = getMonthBounds(newTo);
      setFrom(bounds.from);
      setTo(bounds.to);
    } else {
      const { clamped, to: clampedTo } = clampThreeMonths(from, newTo);
      if (clamped) {
        setTo(clampedTo);
        toast(`조회 기간은 최대 3개월(92일)까지 선택 가능합니다`);
      } else {
        setTo(newTo);
      }
    }
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
