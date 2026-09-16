/**
 * [Controller] QC-01 불량 현황 조회
 *
 * 조회 조건은 **기간뿐**입니다. 공정·불량 유형 선택은 2026-09-12 에 뺐습니다
 * (거의 쓰이지 않는데 조회를 좁혀, 비어 보이는 화면을 만드는 쪽이 더 잦았습니다).
 * 서버는 두 값을 계속 받으므로 '전체' 로 고정해 보냅니다.
 *
 * 기본 기간은 **오늘 기준 최근 7일**입니다 (마지막 실적일이 아니라 오늘).
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadFromServer } from '@shared/utils/exportUtil';
import { shiftDate, today } from '@shared/utils/formatUtil';
import { compositionOf } from '@domains/common/model/metricModel';
import { loadDefectStatus, loadDefectTree, loadDefectByProduct } from '../model/qualityRepository';
import { normalizeRange } from '@shared/constants/period';

/** 공정·불량 유형은 화면에서 고르지 않습니다 — 서버 규약상 값은 보내야 해서 '전체' 로 둡니다 */
const ALL = '전체';

/** 화면은 라인별 합계부터 펼칩니다. 기존 엑셀 계층은 별도 요청 전까지 유지합니다. */
const LEVELS = 'eqpt,wc,item,defect';
const EXPORT_LEVELS = 'wc,item,eqpt,defect';

/** 단계 이름 — 표의 '구분' 칸에 붙입니다 */
const LEVEL_LABEL = { wc: '공정', item: '제품', eqpt: '라인', defect: '불량 유형' };

export function useDefectStatusController() {
  const toast = useUiStore((state) => state.toast);

  const [from, setFromRaw] = useState(() => shiftDate(today(), -7));
  const [to, setToRaw] = useState(() => today());
  // 같은 날을 고르면 구간이 비므로 시작일을 하루 앞당깁니다.
  const setFrom = (next) => { const r = normalizeRange(next, to); setFromRaw(r.from); };
  const setTo = (next) => { const r = normalizeRange(from, next); setFromRaw(r.from); setToRaw(r.to); };

  const { data, loading, reload } = useAsync(
    () => loadDefectStatus({ from, to, processId: ALL, defectTypeCd: ALL }),
    [from, to]
  );

  // 상세 분해는 느려서 따로 받습니다 — 늦어도 나머지 카드는 먼저 그려집니다
  const { data: tree, loading: lineLoading, reload: reloadLine } = useAsync(
    () => loadDefectTree({ from, to, processId: ALL, levels: LEVELS }),
    [from, to],
    { silent: true }
  );

  const { data: product, loading: productLoading, error: productError, reload: reloadProduct } = useAsync(
    () => loadDefectByProduct({ from, to }), [from, to], { silent: true }
  );
  const productRows = useMemo(() => {
    const map = (nodes, parent = '') => (nodes || []).map((n, i) => {
      const key = parent + '/' + n.level + ':' + i;
      return { ...n, key, levelLabel: LEVEL_LABEL[n.level] || n.level,
        ...(n.children?.length ? { _children: map(n.children, key) } : {}) };
    });
    return map(product?.items);
  }, [product?.items]);

  const typeItems = data?.byType?.items || [];
  const summary = data?.summary;

  /** 정상 수량 — 서버 요약의 총량에서 불량을 뺍니다 (라벨 원장의 normal 합과 같습니다) */
  const okQty = useMemo(() => {
    const total = Number(summary?.totalQty);
    const ng = Number(summary?.ngQty);
    if (!Number.isFinite(total) || !Number.isFinite(ng)) return null;
    return Math.max(0, total - ng);
  }, [summary?.totalQty, summary?.ngQty]);

  /**
   * 유형별 구성 — 비중의 분모는 **불량 수량 원장(ngQty)** 입니다.
   * 서버가 준 ratio 는 표시된 유형들의 합을 분모로 써서 유형이 없는 몫만큼 부풀려져 있습니다.
   * 남는 몫은 '유형 미상' 으로 드러내 합이 원장과 맞게 합니다. 화면과 엑셀이 같은 행을 씁니다.
   */
  const typeRows = useMemo(() => {
    const { rows } = compositionOf(typeItems, summary?.ngQty, { labelKey: 'defectType', valueKey: 'cnt' });
    return rows;
  }, [typeItems, summary?.ngQty]);

  /**
   * 상세 분해 트리를 표의 행으로 옮깁니다.
   *
   * 부모·자식이 같은 열을 쓰도록 필드 이름을 맞춥니다. 차원 값(공장·공정·제품·설비·유형)은
   * 서버가 **그 단계까지 확정된 것만** 채워 주므로 그대로 씁니다 — 화면에서 되짚지 않습니다.
   *
   * 비율 칸의 뜻이 단계마다 다릅니다.
   *  · 공정·제품·설비 → 그 묶음의 불량률(불량/전체)
   *  · 불량 유형     → 상위 불량 중 이 유형의 몫(ratio). 정상 수량·불량률은 없습니다.
   */
  const lineRows = useMemo(() => {
    const toRows = (nodes, parentKey) => (nodes || []).map((n, i) => {
      const code = ({ defect: n.defectCd, eqpt: n.eqptCd, item: n.itemCd, wc: n.wcCd })[n.level] || '';
      const key = `${parentKey}/${n.level}:${code}:${i}`;
      return {
        key,
        level: n.level,
        levelLabel: LEVEL_LABEL[n.level] || n.level,
        // 트리 칸에 보일 이름 — 그 단계의 이름이 없으면 코드로 물러섭니다
        name: n.defectNm || n.eqptNm || n.itemNm || n.wcNm || code || '—',
        plantNm: n.plantNm || '',
        wcNm: n.wcNm || '',
        itemNm: n.itemNm || '',
        eqptCd: n.eqptCd || '',
        eqptNm: n.eqptNm || '',
        defectNm: n.defectNm || '',
        okQty: n.okQty ?? null,
        ngQty: n.ngQty ?? null,
        // 유형 단계만 ratio, 나머지는 불량률
        rate: n.level === 'defect' ? (n.ratio ?? null) : (n.defectRate ?? null),
        ...(n.children?.length ? { _children: toRows(n.children, key) } : null),
      };
    });
    return toRows(tree?.items, '');
  }, [tree?.items]);

  const search = useCallback(async () => {
    await Promise.all([reload(), reloadLine(), reloadProduct()]);
    toast('조회 조건으로 다시 조회했습니다');
  }, [reload, reloadLine, reloadProduct, toast]);

  /**
   * 내려받기 — 파일은 **서버가** 만듭니다 (2026-09-12).
   *
   * 화면이 만들던 .xls 는 한 장짜리 표였습니다. 서버 쪽은 조회 조건 시트가 함께 붙고
   * 권한 마스킹과 다운로드 이력(ax.tb_rpt_download_log)이 같은 규칙으로 남습니다.
   *
   * [주의] 본문은 **선언된 5개 키만** 받습니다. 키를 더 넣으면 400 입니다.
   *        '전체' 는 조건 없음이라는 뜻이라 문자열이 아니라 null 로 보냅니다
   *        (GET 은 client.js 의 dropEmptyParams 가 걸러 주지만 이 경로는 그걸 안 탑니다).
   *        format 은 'xlsx' 만 됩니다 — 'csv' 는 400 입니다.
   */
  const exportBody = useCallback(() => ({
    from,
    to,
    processId: null,
    defectTypeCd: null,
    format: 'xlsx',
  }), [from, to]);

  const [exportingType, setExportingType] = useState(false);
  const [exportingLine, setExportingLine] = useState(false);

  const exportTypeExcel = useCallback(async () => {
    if (exportingType) return;
    setExportingType(true);
    try {
      await downloadFromServer({
        path: '/quality/defects/by-type/export',
        body: exportBody(),
        name: '불량 유형별 분포',
      });
    } finally {
      setExportingType(false);
    }
  }, [exportBody, exportingType]);

  /** 라인별 불량률 내려받기 — 서버가 설비 시트와 설비별 유형 상세 시트를 함께 만듭니다 */
  const exportLineExcel = useCallback(async () => {
    if (exportingLine) return;
    setExportingLine(true);
    try {
      await downloadFromServer({
        // 엑셀 변경은 별도 요청 대상이므로 기존 계층을 유지합니다.
        path: '/quality/defects/by-line/export',
        body: { ...exportBody(), levels: EXPORT_LEVELS },
        name: '설비별 불량률',
      });
    } finally {
      setExportingLine(false);
    }
  }, [exportBody, exportingLine]);

  return {
    loading,
    summary,
    okQty,
    typeRows,
    lineRows,
    productRows, productLoading, productError,
    treeTotals: tree?.totals || null,
    lineLoading,
    filters: { from, to },
    setFrom,
    setTo,
    search,
    exportTypeExcel,
    exportLineExcel,
    exportingType,
    exportingLine,
  };
}
