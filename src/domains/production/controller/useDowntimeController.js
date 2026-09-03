/**
 * [Controller] PR-05 비가동 관리
 *
 * 사유가 등록되지 않은 정지 구간은 가동률 산출에서 원인 불명으로 집계됩니다.
 */
import { useCallback, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { lastDataDate } from '@shared/stores/useAppStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { minutesText } from '@shared/utils/formatUtil';
import {
  loadEquipmentOptions, fetchReasonSuggestion, loadDowntimes, registerDowntime, updateDowntime } from '../model/productionRepository';

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
  const summary = data?.summary;
  const codes = data?.codes?.codes || [];

  /** 사유 등록·수정 — 신규면 등록, 기존 이력이면 수정 */
  const submitReason = useCallback(
    async ({ downtimeId, ...values }) => {
      const res = downtimeId ? await updateDowntime({ downtimeId, ...values }) : await registerDowntime(values);
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${items.length}건을 조회했습니다`);
  }, [reload, toast, items.length]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '비가동 이력',
      head: ['설비', '정지 시각', '복구 시각', '정지 시간', '사유', '제안 사유', '비고'],
      rows: items.map((r) => [r.eqptCd, r.stopAt, r.resumeAt || '—', minutesText(r.elapsedMin), r.reasonNm || '미등록', r.suggestion || '—', r.remark || '']),
    });
  }, [items]);

  /** 가장 오래 멈춘 사유 (요약 카드) */
  const topReason = [...(summary?.byReason || [])].sort((a, b) => b.min - a.min)[0];

  return {
    paging,
    itemsMeta: data?.listMeta,
    loading,
    items,
    summary,
    codes,
    topReason,
    filters: { date, eqptCd, reasonCd },
    eqptOptions,
    setDate,
    setEqptCd,
    setReasonCd,
    search,
    exportExcel,
    submitReason,
    fetchReasonSuggestion,
  };
}
