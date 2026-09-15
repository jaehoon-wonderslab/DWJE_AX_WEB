/**
 * [Controller] QC-03 AOI 불량 목록 (REQ_20260911 F-4·F-5·F-7)
 *
 * 「AOI 판정 분석」 화면의 불량 목록입니다. 한 행 = 한 시리얼의 판정 결과이고,
 * 행을 누르면 화면이 **모달**을 열어 판정 정보와 NAS 사진을 크게 보여 줍니다(상세 조회는 useAoiDefectDetail).
 *
 * 2026-09-11 변경
 *  · 조회 조건은 **검사일 하루**만 둡니다. 설비·LOT/모델 검색은 없앴습니다(요구 4).
 *    하루로 묶은 것은 성능 때문입니다 — MSSQL(EDGE.dbo.TB_SAMSUN_DIMENSION)로 원천이 바뀌면
 *    시리얼×검사항목(SEQ) 행이 하루에도 많아 기간 조회가 무거워집니다.
 *  · 서버로는 `date` 와 `from`·`to`(=같은 날)를 함께 보냅니다 — 지금 API(from·to)와
 *    앞으로 올 MSSQL API(date) 양쪽에 그대로 붙습니다.
 * · 불량 유형 필터는 없습니다 — MES·DIMENSION 어디에도 유형 코드가 없습니다(API-Q2 · DB-Q1).
 * · 조회 조건은 「조회」를 눌렀을 때만 적용합니다. 쪽 이동은 바로 반영합니다.
 * · 첫 조회가 0건이면 **최근 판정일**을 하루씩 거슬러 찾아 그 날짜로 엽니다(최대 AUTO_BACK_DAYS 일).
 *   실적 마지막 날(data-range.toDate)에 AOI 판정이 없는 날이 있어 화면이 비어 보이던 것을 막습니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { lastDataDate } from '@shared/stores/useAppStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { loadAoiDefects } from '../model/aoiDefectRepository';

/** 한 쪽 건수 선택지 */
export const DEFECT_PAGE_SIZES = [25, 50, 100];

/** 첫 조회가 0건일 때 거슬러 찾아볼 날 수 */
const AUTO_BACK_DAYS = 14;

/** Date → 'YYYY-MM-DD' (로컬 기준) */
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function useAoiDefectsController() {
  // 기본 검사일 — 마지막 실적일(data-range.toDate). 오늘로 잡으면 실적이 없어 빈 화면이 됩니다
  const initDate = useMemo(() => lastDataDate(), []);
  const [date, setDate] = useState(initDate);

  /** 서버에 실제로 보낸 조건 — 「조회」를 누를 때 갈아 끼웁니다 */
  const [applied, setApplied] = useState(initDate);
  const paging = usePaging({ size: 25, resetKey: applied });

  const { data, loading, reload } = useAsync(
    () => loadAoiDefects({ date: applied, page: paging.page, size: paging.size }),
    [applied, paging.page, paging.size]
  );
  const items = useMemo(() => data?.items || [], [data]);
  const meta = data?.meta || null;

  /**
   * 첫 조회가 0건이면 최근 판정일을 찾아 그 날짜로 다시 엽니다 — 딱 한 번만, 「조회」를 누르기 전에만.
   * 한 번에 1건만 물어보므로(size 1) 거슬러 세는 비용은 작습니다.
   */
  const autoDone = useRef(false);
  const [autoBackedTo, setAutoBackedTo] = useState('');
  useEffect(() => {
    if (autoDone.current || loading || !meta) return undefined;
    autoDone.current = true;
    if ((meta.total || 0) > 0) return undefined;
    let cancelled = false;
    (async () => {
      const d = new Date(`${initDate}T00:00:00`);
      for (let i = 0; i < AUTO_BACK_DAYS; i += 1) {
        d.setDate(d.getDate() - 1);
        const iso = toIso(d);
        try {
          const r = await loadAoiDefects({ date: iso, page: 1, size: 1 });
          if (cancelled) return;
          if ((r?.meta?.total || 0) > 0) {
            setDate(iso);
            setApplied(iso);
            setAutoBackedTo(initDate);
            return;
          }
        } catch {
          return; // 서버가 막히면 조용히 그만둡니다 — 화면은 0건 안내를 그대로 둡니다
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, meta, initDate]);

  const search = useCallback(() => {
    autoDone.current = true; // 사용자가 고른 날짜가 우선입니다 — 자동 탐색은 더 하지 않습니다
    setAutoBackedTo('');
    if (applied === date) reload(); // 같은 날짜로 다시 눌러도 한 번 더 조회합니다
    else setApplied(date);
  }, [applied, date, reload]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: `AOI 불량 목록 ${applied}`,
      head: ['불량 ID', '판정 일시', '작업장', '설비', '설비명', 'LOT', '시리얼', '모델', '검사 항목', '양품', '불량', '사진 수'],
      rows: items.map((d) => [
        d.defectId, d.judgedAt, d.processNm ?? d.processId ?? '', d.eqptCd, d.eqptNm ?? '', d.lotNo, d.serialNo ?? '', d.model ?? '',
        d.sampleQty ?? d.seqCnt ?? '', d.okQty ?? '', d.ngQty ?? d.failSeqCnt ?? '', d.imageCnt ?? 0,
      ]),
    });
  }, [items, applied]);

  return {
    loading,
    items,
    meta,
    paging,
    pageSizes: DEFECT_PAGE_SIZES,
    /** 화면 입력값(검사일) · 서버에 적용된 날짜 */
    date,
    setDate,
    applied,
    /** 자동으로 뒤로 옮겨 왔다면 원래(0건이던) 날짜 — 화면에 안내 한 줄 */
    autoBackedTo,
    search,
    exportExcel,
  };
}
