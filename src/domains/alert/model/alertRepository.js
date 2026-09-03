/**
 * [Model] 이상 알림 리포지토리 (AL-01)
 */
import * as alertService from '@services/api/alertService';
import { command, unwrap, unwrapAll } from '@services/api/request';
import { alertAckState, alertPeriod, alertSeverity } from '@domains/common/model/paramModel';

/** 알림 목록 + 승격 대기 + 발송 로그 */
export async function loadAlerts({ state, type, target, period, page, size }) {
  const data = await unwrapAll({
    // 화면은 '미확인'·'경고'·'최근 7일' 처럼 사람이 읽는 말을 쓰고,
    // 서버는 ackState=OPEN · type=WARN · period=7d 같은 코드값을 받습니다.
    list: alertService.getAlerts({
      ackState: alertAckState(state),
      type: alertSeverity(type),
      eqptCd: target,
      period: alertPeriod(period),
      page,
      size,
    }),
    escalations: alertService.getAlertsEscalationTargets({}),
    sendLogs: alertService.getAlertsSendLogs({}),
  });
  return { ...data, listMeta: data.metas?.list };
}

/** 알림 상세 조회 */
export const fetchAlertDetail = (alertId) => unwrap(alertService.getAlertsByAlertId({ alertId }));

/** 확인 처리 */
export const acknowledgeAlert = (alertId, actionNote) =>
  command(alertService.postAlertsByAlertIdAck({ alertId, actionNote }));
