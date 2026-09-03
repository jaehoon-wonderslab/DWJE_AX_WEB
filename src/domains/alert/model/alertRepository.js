/**
 * [Model] 이상 알림 리포지토리 (AL-01)
 *
 * 화면은 '미확인'·'최근 7일' 처럼 사람이 읽는 말을 쓰고, 서버는 ackState=OPEN · period=7d 같은 코드값을 받습니다.
 * 심각도·확인 상태·채널·발송 결과의 표시명은 공통코드(ALM_*)에서 받습니다 — 화면에 박아 두지 않습니다.
 */
import * as alertService from '@services/api/alertService';
import { command, unwrap, unwrapAll } from '@services/api/request';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { alertAckState, alertPeriod, alertSeverity } from '@domains/common/model/paramModel';

/** 알림 화면이 쓰는 공통코드 — 심각도 · 확인 상태 · 채널 · 발송 결과 */
export const loadAlertCodes = () => loadCodeGroups('ALM_SEVERITY', 'ALM_ACK_STATE', 'ALM_CHANNEL', 'ALM_SEND_RESULT');

/** 조회 조건 → 서버 파라미터 ('전체' 는 클라이언트가 비워 보냅니다) */
function listParams({ state, type, target, period }) {
  return {
    ackState: alertAckState(state),
    type: alertSeverity(type),
    eqptCd: target,
    period: alertPeriod(period),
  };
}

/**
 * 알림 목록 + 탭 건수 + 승격 대기 (+ 발송 로그)
 *
 * 탭의 건수(미확인·확인됨)는 서버가 따로 주지 않아 같은 조건으로 1건씩 조회해 `meta.total` 을 읽습니다.
 * 발송 로그는 전산팀·통합관리자만 볼 수 있어 `withSendLogs` 가 false 면 부르지 않습니다(403 소음 방지).
 */
export async function loadAlerts({ state, type, target, period, page, size, withSendLogs = true }) {
  const base = listParams({ state, type, target, period });
  const spec = {
    list: alertService.getAlerts({ ...base, page, size }),
    openCount: alertService.getAlerts({ ...base, ackState: 'OPEN', page: 1, size: 1 }),
    ackedCount: alertService.getAlerts({ ...base, ackState: 'ACKED', page: 1, size: 1 }),
    escalations: alertService.getAlertsEscalationTargets({}),
  };
  if (withSendLogs) spec.sendLogs = alertService.getAlertsSendLogs({ page: 1, size: 50 });

  const data = await unwrapAll(spec);
  return {
    list: data.list,
    escalations: data.escalations,
    sendLogs: data.sendLogs,
    errors: data.errors,
    listMeta: data.metas?.list,
    counts: {
      unread: data.metas?.openCount?.total ?? null,
      read: data.metas?.ackedCount?.total ?? null,
    },
  };
}

/** 알림 상세 조회 */
export const fetchAlertDetail = (alertId) => unwrap(alertService.getAlertsByAlertId({ alertId }));

/** 확인 처리 */
export const acknowledgeAlert = (alertId, actionNote) =>
  command(alertService.postAlertsByAlertIdAck({ alertId, actionNote }));

/**
 * 등급 → 점 색. 서버 `level` 은 심각도 코드(CRIT|WARN|LOW)이거나 색 이름일 수 있어 둘 다 받습니다.
 * @returns {'red'|'amber'|'gray'}
 */
export function alertLevelTone(level) {
  const v = String(level ?? '').toUpperCase();
  if (['CRIT', 'CRITICAL', 'RED', 'HIGH'].includes(v)) return 'red';
  if (['WARN', 'WARNING', 'AMBER', 'MID', 'MEDIUM'].includes(v)) return 'amber';
  return 'gray';
}

/** 확인이 끝난 상태인가 (ACKED · CLOSED · IGNORED) */
export const isAcked = (ackState) => ['ACKED', 'ACK', 'CLOSED', 'IGNORED'].includes(String(ackState ?? '').toUpperCase());

/**
 * 상세가 가리키는 관련 화면 — 상세 응답에 `link`(화면 ID 또는 경로)가 있을 때만 씁니다.
 * @returns {{screenId?:string, path?:string}|null}
 */
export function alertLinkOf(alert) {
  const link = alert?.link || alert?.detail?.link || alert?.screenId || alert?.detail?.screenId;
  if (!link || typeof link !== 'string') return null;
  return link.startsWith('/') ? { path: link } : { screenId: link };
}
