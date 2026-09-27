/**
 * [Model] 자연어 질의 홈 브리핑 리포지토리
 *
 * 홈 화면의 「AI 브리핑」은 사내 LLM(dwje-ax)이 쓴 문장입니다 — AI 대시보드의 종합 브리핑과 같은 결과입니다.
 *  · AI 브리핑   GET /dashboard/ai/briefing  (서버가 기본 기간 최근 7일을 미리 계산해 두어 대개 곧바로 옵니다)
 *  · 미확인 알림 GET /alerts?ackState=OPEN&period=7d  (알림 목록 — 문장을 만들지 않고 그대로 보여 줍니다)
 *
 * 예전에는 요약 지표를 받아 **화면이 문장을 조립**했습니다("평균 불량률은 …% 입니다. 관리 목표 3.0% 대비 …").
 * AI 결과로 보이는 자리에 코드로 만든 문장과 박힌 목표값을 두지 않습니다.
 * 한 건이 실패해도 나머지는 그립니다 (errors 로 어느 것이 빠졌는지 알려 줍니다).
 */
import * as dashboardService from '@services/api/dashboardService';
import * as alertService from '@services/api/alertService';
import { unwrapAll } from '@services/api/request';

/**
 * @param {{from:string,to:string}} period 조회 기간 (기본 최근 7일 — AI 대시보드 기본 기간과 같아야 미리 계산한 결과를 받습니다)
 */
export async function loadHomeBriefing(period) {
  const data = await unwrapAll({
    briefing: dashboardService.getDashboardAiBriefing({ from: period.from, to: period.to }),
    alerts: alertService.getAlerts({ ackState: 'OPEN', period: '7d', page: 1, size: 5 }),
  });

  return {
    period,
    briefing: data.briefing || null,
    alerts: data.alerts?.items || [],
    alertTotal: data.metas?.alerts?.total ?? (data.alerts?.items?.length || 0),
    errors: data.errors,
    // 시각은 서버가 브리핑을 만든 때입니다 — 화면이 받은 때가 아닙니다
    generatedAt: data.briefing?.generatedAt || null,
  };
}
