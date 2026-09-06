import { getDashboardProcessPeriod } from '@services/api/dashboardService';
import { unwrap } from '@services/api/request';
import { periodUnit } from '@domains/common/model/paramModel';
import { validatePeriod } from './processPeriodModel';

export async function loadProcessPeriod({ from, to, unit, models, processId }) {
  validatePeriod(from, to);
  const data = await unwrap(getDashboardProcessPeriod({
    from, to, unit: periodUnit(unit),
    ...(processId ? { processId } : {}),
    ...(models.length ? { productCodes: models } : {}),
  }));
  return { ...data, products: [...(data?.products || [])].sort((a, b) => (b.ngQty ?? -1) - (a.ngQty ?? -1)) };
}
