/**
 * [Controller] RP-06 폐기 보고서
 *
 * 「품질팀_폐기보고서」 양식에 내용만 채웁니다.
 * **결재·발행·인쇄는 하지 않습니다**(2026-09-04) — 엑셀로 내려받아 그 파일에서 진행합니다.
 *
 * 폐기 금액은 원가(price) 열람 권한이 있는 계정에만 보입니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { currentMonthRange } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { comma } from '@shared/utils/formatUtil';
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { VOUCHER_ORIGIN_TYPES } from '../model/reportModel';
import { loadScrapSheet } from '../model/reportRepository';

/** 양식 머리의 고정 문구 */
export const KEEP_YEARS = '3 년';
export const DEFAULT_DEFECT_NOTE = '각 공정별 제품 치수 Spec Out 불량으로 인한 폐기 (불용재고 포함)';

/** 양식 아래 검토 의견 칸 — 엑셀에서 채웁니다 */
export const REVIEW_TEAMS = ['1. 품질보증팀 검토 내용', '2. 생산관리팀 검토 내용', '3. 제조팀 검토 내용', '4. 공정기술팀 검토 내용'];

export function useScrapReportController() {
  const toast = useUiStore((state) => state.toast);

  const [from, setFrom] = useState(currentMonthRange().from);
  const [to, setTo] = useState(currentMonthRange().to);
  const [processId, setProcessId] = useState('전체');
  /** 발생 구분 — 양식 머리의 체크 세 칸. 기본은 스크린샷대로 앞의 둘 */
  const [origins, setOrigins] = useState(['제조공정 발생', '협력업체 발생']);

  const { data: processOptions } = useAsync(loadProcessOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  const { data, loading, reload } = useAsync(
    () => loadScrapSheet({ from, to, originTypes: origins, processId: processId === '전체' ? undefined : processId }),
    [from, to, origins, processId]
  );

  /** 발생 구분 체크 — 전부 끄면 조회할 것이 없으므로 마지막 하나는 남깁니다 */
  const toggleOrigin = useCallback((name) => {
    setOrigins((prev) => {
      if (!prev.includes(name)) return [...VOUCHER_ORIGIN_TYPES].filter((x) => prev.includes(x) || x === name);
      if (prev.length === 1) {
        toast('발생 구분은 하나 이상 골라야 합니다');
        return prev;
      }
      return prev.filter((x) => x !== name);
    });
  }, [toast]);

  /** 양식 머리에 적을 값 */
  const head = useMemo(() => ({
    keepYears: KEEP_YEARS,
    origins,
    defectNote: DEFAULT_DEFECT_NOTE,
    modelNm: data?.models?.length ? `${data.models[0].model} 외 ${comma(data.models.length - 1)}종` : '—',
    processNm: !data?.processes?.length ? '—' : data.processes.length > 3 ? '전 공정' : data.processes.join(', '),
    occurRange: data?.occurFrom ? `${data.occurFrom} ~ ${data.occurTo}` : `${from} ~ ${to}`,
    totalQty: data?.totalQty ?? 0,
  }), [data, origins, from, to]);

  /** 양식대로 내려받습니다 — 결재란·검토 의견은 빈칸으로 두어 엑셀에서 채웁니다 */
  const exportExcel = useCallback(() => {
    if (!data?.voucherCnt) {
      toast('내려받을 폐기 내역이 없습니다');
      return;
    }
    const rows = [
      ['문서번호', '', '보존기한', head.keepYears],
      ['발생 구분', origins.join(' / '), '', ''],
      ['불량내용', head.defectNote, '', ''],
      ['모델명', head.modelNm, '발생공정', head.processNm],
      ['발생일자', head.occurRange, '발생수량', `${comma(head.totalQty)} pcs`],
      ['업체명', '', '제조일자', head.occurRange],
      ['', '', '', ''],
      ['▶ 불량 내용', '', '', ''],
      ['1. 각 공정의 불량 제품, Loss, 불용 재고', `${comma(head.totalQty)} pcs`, '', ''],
      ['- 공정불량', `${comma(data.kinds?.DEFECT ?? 0)} EA`, '', '불량 이력이 붙는 전표'],
      ['- 그 밖 (불용 재고 · Loss)', `${comma(data.kinds?.OTHER ?? 0)} EA`, '', '두 갈래를 가르는 근거가 원천에 없습니다'],
      ['', '', '', ''],
      ['▶ 폐기 사유', '', '', ''],
      ...data.remarks.slice(0, 20).map((r) => [`- ${r.remark}`, `${comma(r.qty)} EA`, '', '']),
      ['', '', '', ''],
      ['▶ 주요 모델별 발생수량', '', '', ''],
      ...data.models.slice(0, 20).map((m) => [`- ${m.model}`, `${comma(m.qty)} EA`, '', '']),
      ['', '', '', ''],
      ['▶ 폐기 금액', '', '', '단가 기준정보가 비어 있어 직접 기입합니다'],
      ['', '', '', ''],
      ['검토 의견', '', '팀장', '(인)'],
      ...REVIEW_TEAMS.map((t) => [t, '', '', '']),
    ];
    downloadXls({ name: `폐기 보고서 ${from} ~ ${to}`, head: ['구분', '값', '구분', '값'], rows });
  }, [data, head, origins, from, to, toast]);

  return {
    loading,
    from,
    setFrom,
    to,
    setTo,
    processId,
    setProcessId,
    processOptions,
    origins,
    toggleOrigin,
    head,
    sheet: data,
    reload,
    exportExcel,
  };
}
