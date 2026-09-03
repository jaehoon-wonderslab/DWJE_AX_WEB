/**
 * [Controller] PR-05 비가동 관리
 *
 * 사유가 등록되지 않은 정지 구간은 가동률 산출에서 원인 불명으로 집계됩니다.
 * 사유 선택지는 공통코드 DOWN_REASON(코드 CHANGEOVER … ↔ 표시명 '금형 교체' …)을 그대로 쓰고,
 * 서버에는 코드로 보냅니다. 표시명을 보내면 조회가 0건이 되고 등록은 400 이 납니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { minutesText } from '@shared/utils/formatUtil';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import {
  fetchReasonSuggestion, loadDowntimes, loadEquipmentOptions, normalizeDowntimeAt, registerDowntime, updateDowntime,
} from '../model/productionRepository';

export function useDowntimeController() {
  const toast = useUiStore((state) => state.toast);

  const [date, setDate] = useState(lastDataDate());
  const [eqptCd, setEqptCd] = useState('전체');
  const [reasonCd, setReasonCd] = useState('전체');

  // 설비 선택지는 서버 기준정보에서 받습니다
  const { data: eqptOptions } = useAsync(loadEquipmentOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  const paging = usePaging({ resetKey: `${date}|${eqptCd}|${reasonCd}` });
  const { data, loading, reload } = useAsync(
    () => loadDowntimes({ date, eqptCd, reasonCd, ...paging.params }),
    [date, eqptCd, reasonCd, paging.page, paging.size]
  );

  const items = data?.list?.items || [];
  const itemsMeta = data?.listMeta;
  const summary = data?.summary;

  /** 표준 사유 코드 [{value, label}] · 감지 구분 코드 */
  const reasonCodes = data?.codes?.DOWN_REASON || [];
  const detectCodes = data?.codes?.DOWN_DETECT || [];
  const reasonOptions = useMemo(() => withAll(reasonCodes), [reasonCodes]);
  const reasonLabel = useCallback((code) => labelOf(reasonCodes, code), [reasonCodes]);

  /** 사유 등록·수정 — 기존 이력(downtimeId)이면 수정, 아니면 등록. 시각은 서버 형식(일자 + 시각)으로 맞춥니다 */
  const submitReason = useCallback(
    async ({ downtimeId, stopAt, resumeAt, ...values }) => {
      const body = {
        ...values,
        stopAt: normalizeDowntimeAt(stopAt, date),
        resumeAt: normalizeDowntimeAt(resumeAt, date),
      };
      const res = downtimeId ? await updateDowntime({ downtimeId, ...body }) : await registerDowntime(body);
      toast(res.message || (res.ok ? '저장되었습니다' : '저장하지 못했습니다'));
      if (res.ok) reload();
      return res;
    },
    [toast, reload, date]
  );

  /** Agent 사유 후보 — 폼이 시각만 적어도(08:12) 조회 일자를 붙여 물어봅니다 */
  const suggestReason = useCallback(
    ({ eqptCd: cd, stopAt }) => fetchReasonSuggestion({ eqptCd: cd, stopAt: normalizeDowntimeAt(stopAt, date) }),
    [date]
  );

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${(itemsMeta?.total ?? items.length).toLocaleString('ko-KR')}건을 조회했습니다`);
  }, [reload, toast, items.length, itemsMeta?.total]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: `비가동 이력 ${date}`,
      head: ['설비', '정지 시각', '복구 시각', '정지 시간', '사유 코드', '사유', '비고'],
      rows: items.map((r) => [
        r.eqptCd,
        r.stopAt || '',
        r.resumeAt || '',
        r.elapsedMin === null || r.elapsedMin === undefined ? '' : minutesText(r.elapsedMin),
        r.registered ? r.reasonCd || '' : '',
        r.registered ? r.reasonNm || reasonLabel(r.reasonCd) : '미등록',
        r.remark || '',
      ]),
    });
  }, [items, date, reasonLabel]);

  /**
   * 가장 오래 멈춘 사유 (요약 카드) — `byReason[]` 항목의 분 값 키가 고정돼 있지 않아 몇 가지를 봅니다
   * @returns {{label:string, min:number}|null}
   */
  const topReason = useMemo(() => {
    const list = (summary?.byReason || []).map((r) => ({
      label: r.reasonNm || r.reason || reasonLabel(r.reasonCd) || '—',
      min: Number(r.min ?? r.totalMin ?? r.minutes ?? 0),
    }));
    if (!list.length) return null;
    return list.sort((a, b) => b.min - a.min)[0];
  }, [summary, reasonLabel]);

  return {
    paging,
    itemsMeta,
    loading,
    items,
    summary,
    reasonCodes,
    detectCodes,
    reasonOptions,
    reasonLabel,
    topReason,
    filters: { date, eqptCd, reasonCd },
    eqptOptions,
    setDate,
    setEqptCd,
    setReasonCd,
    search,
    exportExcel,
    submitReason,
    fetchReasonSuggestion: suggestReason,
  };
}
