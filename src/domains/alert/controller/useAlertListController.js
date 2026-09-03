/**
 * [Controller] AL-01 알림 목록·상세
 *
 * 확인되지 않은 건은 승격 규칙에 따라 상위 담당으로 자동 전달됩니다.
 * 심각도 조회 조건은 공통코드 ALM_SEVERITY(CRIT·WARN·LOW)를 그대로 보냅니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { labelOf, withAll } from '@domains/common/model/codeRepository';
import { acknowledgeAlert, fetchAlertDetail, isAcked, loadAlertCodes, loadAlerts } from '../model/alertRepository';

/** 발송 로그 카드를 볼 수 있는 부서 (명세: 전산팀·통합관리자) */
const SEND_LOG_DEPTS = ['전산팀', '통합관리자'];

export function useAlertListController() {
  const toast = useUiStore((state) => state.toast);
  const dept = useAuthStore((state) => state.userInfo?.dept);
  const canSendLog = SEND_LOG_DEPTS.includes(dept);

  const [tab, setTab] = useState('미확인');
  const [type, setType] = useState('전체');
  const [target, setTarget] = useState('전체');
  const [period, setPeriod] = useState('오늘');

  // 심각도·확인 상태·채널·발송 결과 표시명 (서버 공통코드)
  const { data: codes } = useAsync(loadAlertCodes, [], {
    silent: true,
    initialData: { ALM_SEVERITY: [], ALM_ACK_STATE: [], ALM_CHANNEL: [], ALM_SEND_RESULT: [] },
  });
  const severityOptions = useMemo(() => withAll(codes?.ALM_SEVERITY), [codes]);
  const severityLabel = useCallback((code) => labelOf(codes?.ALM_SEVERITY, code), [codes]);
  const ackStateLabel = useCallback((code) => labelOf(codes?.ALM_ACK_STATE, code), [codes]);
  const channelLabel = useCallback((code) => labelOf(codes?.ALM_CHANNEL, code), [codes]);
  const sendResultLabel = useCallback((code) => labelOf(codes?.ALM_SEND_RESULT, code), [codes]);

  const paging = usePaging({ resetKey: `${tab}|${type}|${target}|${period}` });

  const { data, loading, reload } = useAsync(
    () => loadAlerts({ state: tab === '전체' ? undefined : tab, type, target, period, withSendLogs: canSendLog, ...paging.params }),
    [tab, type, target, period, canSendLog, paging.page, paging.size]
  );

  const items = data?.list?.items || [];
  const itemsMeta = data?.listMeta;

  /** 설비 선택지 — 실제 설비 코드에서 뽑습니다 (범위 표기로는 서버가 거를 수 없습니다) */
  const equipments = useMemo(() => [...new Set(items.map((a) => a.eqptCd).filter(Boolean))].sort(), [items]);

  /** 확인 처리 후 목록을 다시 불러옵니다 */
  const acknowledge = useCallback(
    async (alertId, actionNote) => {
      const res = await acknowledgeAlert(alertId, actionNote?.trim() || undefined);
      toast(res.message || (res.ok ? '확인 처리되었습니다' : '확인 처리하지 못했습니다'));
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  const search = useCallback(() => {
    reload();
    toast(`조회 조건으로 ${(itemsMeta?.total ?? items.length).toLocaleString('ko-KR')}건을 조회했습니다`);
  }, [reload, toast, itemsMeta?.total, items.length]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '이상 알림 목록',
      head: ['등급', '유형', '대상 설비', '근거 수치', '임계값', '감지 Agent', '발생 시각', '경과', '상태'],
      rows: items.map((a) => [
        severityLabel(a.level),
        a.type || '',
        a.eqptCd || '',
        a.basisValue ?? '',
        a.threshold ?? '',
        a.agent || '',
        a.occurredAt || '',
        a.elapsed || '',
        isAcked(a.ackState) ? ackStateLabel(a.ackState) : '미확인',
      ]),
    });
  }, [items, severityLabel, ackStateLabel]);

  return {
    loading,
    items,
    counts: data?.counts || {},
    escalations: data?.escalations?.stages || data?.escalations?.items || [],
    sendLogs: data?.sendLogs?.items || [],
    canSendLog,
    tab,
    setTab,
    filters: { type, target, period },
    severityOptions,
    severityLabel,
    ackStateLabel,
    channelLabel,
    sendResultLabel,
    paging,
    itemsMeta,
    equipments,
    setType,
    setTarget,
    setPeriod,
    reload,
    search,
    loadDetail: fetchAlertDetail,
    acknowledge,
    exportExcel,
  };
}
