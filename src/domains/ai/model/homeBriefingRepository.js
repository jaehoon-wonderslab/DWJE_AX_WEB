/**
 * [Model] 자연어 질의 홈 브리핑 리포지토리
 *
 * 홈 화면의 프리셋 3종(불량률 · 공정 현황 · 현재 이슈)에 필요한 API 를 한 번에 부릅니다.
 *  · 생산 요약      GET /dashboard/ai/summary
 *  · 공정별 수율    GET /dashboard/ai/process-yield
 *  · 미확인 알림    GET /alerts?ackState=OPEN&period=7d
 * 대시보드 묶음(12건)을 그대로 부르지 않고 필요한 3건만 부릅니다.
 * 한 건이 실패해도 나머지는 그립니다 (errors 로 어느 것이 빠졌는지 알려 줍니다).
 */
import * as dashboardService from '@services/api/dashboardService';
import * as alertService from '@services/api/alertService';
import { unwrapAll } from '@services/api/request';
import { fillRates } from '@domains/common/model/metricModel';

/**
 * @param {{from:string,to:string,plant?:string}} period 조회 기간 (기본 최근 7일)
 */
export async function loadHomeBriefing(period) {
  const baseParams = { date: period.to, from: period.from, to: period.to, plant: period.plant };
  const data = await unwrapAll({
    summary: dashboardService.getDashboardAiSummary(baseParams),
    processYield: dashboardService.getDashboardAiProcessYield(baseParams),
    alerts: alertService.getAlerts({ ackState: 'OPEN', period: '7d', page: 1, size: 5 }),
  });

  // 공정 수율 — 대시보드와 같은 규칙으로 정규화 (서버 yield 가 비면 양품/투입으로 계산)
  let processYield = data.processYield;
  if (processYield?.items?.length) {
    const target = Number(processYield.target) || 97.0;
    processYield = {
      ...processYield,
      target,
      items: processYield.items.map((x) => {
        const qty = Number(x.qty) || Number(x.okQty || 0) + Number(x.ngQty || 0);
        const ok = Number(x.okQty) || Math.max(0, qty - Number(x.ngQty || 0));
        const yieldRate = x.yield != null ? Number(x.yield) : qty > 0 ? Number(((ok / qty) * 100).toFixed(2)) : null;
        return { ...x, process: x.process || x.processNm || x.processId, yieldRate };
      }),
    };
  }

  return {
    period,
    summary: data.summary ? fillRates(data.summary) : null,
    processYield,
    alerts: data.alerts?.items || [],
    alertTotal: data.metas?.alerts?.total ?? (data.alerts?.items?.length || 0),
    errors: data.errors,
    generatedAt: new Date(),
  };
}
