/**
 * [Model] 실적 데이터 보유 기간 리포지토리
 *
 * MES 실적은 어제까지만 적재되어 있습니다(당일 실적은 마감 전에는 없습니다).
 * 그래서 조회 기준일을 `오늘` 로 잡으면 대시보드가 전부 0 으로 보입니다.
 * 앱이 뜰 때 이 API 로 실제 보유 기간을 받아 기준일을 `toDate` 로 맞춥니다.
 */
import * as commonService from '@services/api/commonService';
import { unwrap } from '@services/api/request';

/** 기본 공장 코드 — 제1공장 */
export const DEFAULT_PLANT_CD = 'PL01';

/**
 * 실적 보유 기간을 조회합니다.
 *
 * 공정마다 마지막 실적일이 다릅니다(예: C-프레스는 08-30, A-프레스는 08-29).
 * `processId` 를 주면 그 공정의 구간만 돌려줍니다 — 공정을 바꿀 때 기준일을 맞추는 데 씁니다.
 *
 * @param {string} [plantCd] 공장 코드
 * @param {string} [processId] 공정 ID (생략하면 전사 구간)
 * @returns {Promise<{ ok: boolean, range?: { plantCd, processId, fromDate, toDate }, message: string }>}
 */
export async function fetchDataRange(plantCd = DEFAULT_PLANT_CD, processId) {
  const res = await commonService.getCommonDataRange({ plantCd, processId });
  if (!res.success || !res.data?.toDate) {
    return { ok: false, message: res.message || '실적 보유 기간을 확인하지 못했습니다.' };
  }
  return { ok: true, range: res.data, message: res.message };
}

/**
 * 공정 선택지 — 화면에 공정명을 박아 두면 서버가 받는 id(W120 등)와 달라 조회가 0건이 됩니다.
 * @returns {Promise<Array<{value:string,label:string}>>} 맨 앞이 '전체'
 */
export async function loadProcessOptions() {
  const data = await unwrap(commonService.getCommonMastersProcesses({}), { processes: [] });
  const items = (data?.processes || []).map((p) => ({ value: p.id, label: `${p.name} (${p.id})` }));
  return [{ value: '전체', label: '전체' }, ...items];
}
