/**
 * [Model] 공통코드 리포지토리
 *
 * 조회 조건·폼의 선택지는 **서버 공통코드가 정본**입니다.
 * 화면에 값을 박아 두면 서버가 받는 코드와 달라 조회가 0건이 되거나 저장이 막힙니다.
 * (실제로 '심각·경고·주의' 를 박아 두었는데 서버는 CRIT·WARN·LOW 였습니다)
 *
 * 사용 예)
 *   const { data: codes } = useAsync(() => loadCodeGroups('ALM_SEVERITY', 'ALM_CHANNEL'), [], { silent: true });
 *   <SelectField options={withAll(codes?.ALM_SEVERITY)} … />
 */
import * as commonService from '@services/api/commonService';
import { unwrap } from '@services/api/request';

/** 전체 코드를 한 번만 받아 둡니다 (342건 · 그룹 75종) */
let cache = null;

async function loadAll() {
  if (!cache) {
    const data = await unwrap(commonService.getCommonCodes({}), { codes: [] });
    const grouped = {};
    (data?.codes || []).forEach((c) => {
      if (c.useYn === 'N') return;
      (grouped[c.groupCd] = grouped[c.groupCd] || []).push({ value: c.cd, label: c.nm, sort: c.sort });
    });
    Object.values(grouped).forEach((list) => list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)));
    cache = grouped;
  }
  return cache;
}

/**
 * 필요한 그룹만 골라 돌려줍니다.
 * @param {...string} groupCds 예) 'ALM_SEVERITY', 'ALM_CHANNEL'
 * @returns {Promise<Object<string, Array<{value:string,label:string}>>>}
 */
export async function loadCodeGroups(...groupCds) {
  const all = await loadAll();
  const out = {};
  groupCds.forEach((g) => { out[g] = all[g] || []; });
  return out;
}

/** 선택지 앞에 '전체' 를 붙입니다 (조회 조건용) */
export const withAll = (list) => [{ value: '전체', label: '전체' }, ...(list || [])];

/** 코드 → 표시명 (목록에 코드가 그대로 보이지 않게) */
export const labelOf = (list, code) => (list || []).find((x) => x.value === code)?.label ?? code;
