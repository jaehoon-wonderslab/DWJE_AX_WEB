/**
 * 이상 알림 목 핸들러 (API 5건)
 */
import { nowStamp } from '@shared/utils/formatUtil';
import { ALERT_SEND_LOG, ALERTS, ESCALATION_TARGETS } from './data/alert';
import { mockState } from './state';

function store() {
  if (!mockState.store.alert) mockState.store.alert = { alerts: JSON.parse(JSON.stringify(ALERTS)) };
  return mockState.store.alert;
}

export const alertMock = {
  getAlerts: ({ state, type, target, period, page = 1, size = 50 }) => {
    let items = store().alerts;
    if (state && state !== '전체') items = items.filter((a) => a.state === state);
    if (type && type !== '전체') items = items.filter((a) => a.type === type);
    if (target && target !== '전체') {
      // 'PR-01 ~ PR-10' 같은 범위 선택을 접두사로 판정합니다
      const prefix = target.split('-')[0];
      items = items.filter((a) => a.target.startsWith(prefix));
    }
    return {
      items,
      counts: {
        unread: store().alerts.filter((a) => a.state === '미확인').length,
        read: store().alerts.filter((a) => a.state === '확인됨').length,
        total: store().alerts.length,
      },
      meta: { page, size, total: items.length },
    };
  },

  getAlertsByAlertId: ({ alertId }) => store().alerts.find((a) => a.alertId === alertId) || null,

  postAlertsByAlertIdAck: ({ alertId, actionNote }) => {
    const row = store().alerts.find((a) => a.alertId === alertId);
    if (!row) return { success: false, code: 'E-NOTFOUND', message: '대상 알림을 찾을 수 없습니다.', data: null };
    row.state = '확인됨';
    row.ackAt = nowStamp();
    row.ackBy = mockState.currentUser.name;
    row.actionNote = actionNote || '';
    return { success: true, code: 'SUCCESS', message: '확인 처리했습니다.', data: { state: '확인됨', ackAt: row.ackAt } };
  },

  getAlertsEscalationTargets: () => ({ items: ESCALATION_TARGETS }),

  getAlertsSendLogs: ({ page = 1, size = 50 }) => ({ items: ALERT_SEND_LOG, meta: { page, size, total: ALERT_SEND_LOG.length } }),
};
