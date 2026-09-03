/**
 * 인증 · 공통 목 핸들러 (API 13건)
 */
import { DEFAULT_USER, findUser } from '@shared/constants/accounts';
import { DATA_SCOPE_DEFAULT, MENU_ACCESS_DEFAULT } from '@shared/constants/dataFields';
import { MENU, permRows } from '@shared/constants/menu';
import { COMMON_CODES, CUSTOMERS, DEFECT_TYPES, LINES, MOLDS, PROCESSES, PRODUCTS } from './data/masters';
import { mockState } from './state';

/** 부서 권한을 화면 접근 목록으로 풀어 줍니다 ('*' 는 전 화면) */
function menuPermsOf(dept) {
  const perms = mockState.menuAccess[dept] ?? MENU_ACCESS_DEFAULT[dept] ?? [];
  return perms === '*' ? permRows().map((r) => r.id) : perms;
}

function dataPermsOf(dept) {
  const perms = mockState.dataScope[dept] ?? DATA_SCOPE_DEFAULT[dept] ?? [];
  return perms === '*' ? ['qty', 'yield', 'price', 'customer', 'plan', 'mold', 'worker'] : perms;
}

export const commonMock = {
  postAuthLogin: ({ loginId }) => {
    const user = findUser(loginId) || DEFAULT_USER;
    mockState.currentUser = user;
    return {
      accessToken: `mock-access-${user.empNo}`,
      refreshToken: `mock-refresh-${user.empNo}`,
      user,
    };
  },

  postAuthLogout: () => ({ success: true }),

  postAuthRefresh: () => ({ accessToken: `mock-access-${mockState.currentUser.empNo}` }),

  getAuthMe: () => {
    const user = mockState.currentUser;
    return {
      user,
      dept: user.dept,
      menuPerms: menuPermsOf(user.dept),
      dataPerms: dataPermsOf(user.dept),
      servingModelVer: mockState.servingModelVer,
    };
  },

  postAuthSwitch: ({ empNo }) => {
    const user = findUser(empNo);
    if (!user) return { success: false, code: 'E-NOTFOUND', message: '대상 계정을 찾을 수 없습니다.', data: null };
    if (user.state !== '사용') return { success: false, code: 'E-RULE-001', message: '정지된 계정으로는 전환할 수 없습니다.', data: null };
    mockState.currentUser = user;
    return {
      accessToken: `mock-access-${user.empNo}`,
      user,
      menuPerms: menuPermsOf(user.dept),
      dataPerms: dataPermsOf(user.dept),
    };
  },

  /** 접근 가능한 메뉴만 반환합니다 */
  getMenus: () => {
    const allowed = menuPermsOf(mockState.currentUser.dept);
    const groups = MENU.map((g) => ({
      group: g.group,
      solo: !!g.solo,
      items: g.items.filter((it) => allowed.includes(it.id)),
    })).filter((g) => g.items.length);
    return { groups };
  },

  getCommonCodes: ({ groupCd }) => ({ codes: COMMON_CODES[groupCd] || [] }),

  getCommonMastersProcesses: () => ({ processes: PROCESSES }),

  getCommonMastersEquipments: ({ processId, keyword }) => {
    const proc = PROCESSES.find((p) => p.id === (processId || 'Press')) || PROCESSES[0];
    const list =
      proc.id === 'Press'
        ? LINES.map((l) => ({ eqptCd: l.eqptCd, eqptNm: `${l.eqptCd} 프레스`, wcCd: proc.id, state: l.state }))
        : Array.from({ length: proc.eqptCnt }, (_, i) => ({
            eqptCd: `${proc.pre}-${String(i + 1).padStart(2, '0')}`,
            eqptNm: `${proc.name} ${i + 1}호기`,
            wcCd: proc.id,
            state: '가동',
          }));
    return { equipments: keyword ? list.filter((e) => e.eqptCd.includes(keyword)) : list };
  },

  getCommonMastersProducts: ({ keyword, familyCd, customerCd, projectCd, sort = 'rank', page = 1, size = 500 }) => {
    let list = [...PRODUCTS];
    if (familyCd && familyCd !== '전체') list = list.filter((p) => p.family === familyCd);
    if (customerCd && customerCd !== '전체') list = list.filter((p) => p.customer === customerCd);
    if (projectCd && projectCd !== '전체') list = list.filter((p) => p.project === projectCd);
    if (keyword) {
      const q = String(keyword).toLowerCase();
      list = list.filter((p) => [p.code, p.family, p.customer, p.project].some((v) => String(v).toLowerCase().includes(q)));
    }
    if (sort === 'name') list.sort((a, b) => a.code.localeCompare(b.code));
    else if (sort === 'family') list.sort((a, b) => a.family.localeCompare(b.family) || a.seq - b.seq);
    else list.sort((a, b) => a.rank - b.rank);
    const start = (page - 1) * size;
    return { products: list.slice(start, start + size), meta: { page, size, total: list.length } };
  },

  getCommonMastersCustomers: () => ({ customers: CUSTOMERS }),

  getCommonMastersDefectTypes: () => ({ defectTypes: DEFECT_TYPES }),

  getCommonMastersMolds: ({ eqptCd }) => ({ molds: eqptCd ? MOLDS.filter((m) => m.eqptCd === eqptCd) : MOLDS }),
};

export { menuPermsOf, dataPermsOf };
