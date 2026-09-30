/**
 * [Controller] SY-17 그룹웨어 부서 매핑
 *
 * 그룹웨어 인사정보를 받아 올 때 AX 에 없는 사번을 자동으로 가입시키는데(MES 이관 엔진),
 * 그때 들어갈 부서를 이 매핑표(ax.tb_sys_dept_gw_map)로 정합니다. 매핑이 없는 사람은
 * 화면 권한이 하나도 없는 '미배정' 부서로 들어갑니다.
 *
 * 매핑은 가입하는 순간에만 쓰입니다. 매핑을 나중에 고쳐도 이미 가입된 계정의 부서는 그대로라,
 * 미배정으로 들어간 계정은 [매핑대로 재배정] 또는 한 명씩 [부서 지정] 으로 옮깁니다.
 */
import { useCallback, useState } from 'react';
import { firstError } from '@services/api/request';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

/** 매핑 상태 — 서버 코드 → 표기 */
export const GW_MAP_STATES = [
  { value: 'MAPPED', label: '매핑됨' },
  { value: 'UNMAPPED', label: '미배정' },
  { value: 'EXCLUDED', label: '가입 제외' },
];
export const gwStateLabel = (code) => GW_MAP_STATES.find((s) => s.value === code)?.label || code || '—';

/** 폼의 AX 부서 선택지에서 '매핑 없음(미배정)' 을 뜻하는 값 — 빈 값은 요청에서 빠지므로 따로 둡니다 */
export const NO_DEPT = '__NONE__';

export function useGwDeptMapController() {
  const toast = useUiStore((state) => state.toast);

  const [tab, setTab] = useState('map');
  const [keyword, setKeyword] = useState('');
  const [state, setState] = useState('전체');
  const [userKeyword, setUserKeyword] = useState('');
  const [selectedMaps, setSelectedMaps] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const { data, loading, reload } = useAsync(
    () => repo.loadGwDeptMap({ keyword, state: state === '전체' ? undefined : state, userKeyword }),
    [keyword, state, userKeyword]
  );

  const maps = data?.maps || [];
  const users = data?.users || [];
  const depts = data?.depts || [];
  const loadError = firstError(data);

  const after = useCallback(
    (res) => {
      toast(res.message);
      if (res.ok) reload();
      return res;
    },
    [toast, reload]
  );

  /** 폼 값 → 요청 본문. 가입 제외면 AX 부서는 의미가 없어 비웁니다 */
  const toBody = (gwDeptNm, v) => ({
    gwDeptNm,
    deptId: v.joinYn === 'N' || v.deptId === NO_DEPT ? undefined : v.deptId,
    joinYn: v.joinYn === 'N' ? 'N' : 'Y',
    remark: v.remark,
  });

  /** 한 부서 저장 */
  const saveMap = async (gwDeptNm, v) => after(await repo.saveGwDeptMap(toBody(gwDeptNm, v)));

  /**
   * 고른 부서 여러 개를 같은 값으로 저장합니다.
   * 한 건씩 저장하므로 중간에 실패하면 그 앞까지는 저장된 채로 멈추고 실패 건을 알려 줍니다.
   */
  const saveMapsBulk = async (gwDeptNms, v) => {
    let done = 0;
    for (const gwDeptNm of gwDeptNms) {
      // 일괄 지정에서는 메모를 건드리지 않습니다 — 행마다 적어 둔 근거가 지워지면 안 됩니다
      const row = maps.find((m) => m.gwDeptNm === gwDeptNm);
      const res = await repo.saveGwDeptMap(toBody(gwDeptNm, { ...v, remark: row?.remark }));
      if (!res.ok) {
        toast(`${done}건 저장 후 '${gwDeptNm}' 에서 멈췄습니다 — ${res.message}`);
        reload();
        return res;
      }
      done += 1;
    }
    toast(`${done}건을 저장했습니다. 이미 가입된 계정의 부서는 바뀌지 않습니다.`);
    setSelectedMaps([]);
    reload();
    return { ok: true };
  };

  const removeMap = async (gwDeptNm) => after(await repo.deleteGwDeptMap(gwDeptNm));

  /** 미배정 계정을 지금 매핑대로 옮깁니다 — 고른 계정이 없으면 옮길 수 있는 계정 전체 */
  const reassign = async (empNos = []) => {
    const res = after(await repo.reassignUnassigned(empNos));
    if (res.ok) setSelectedUsers([]);
    return res;
  };

  /** 한 명을 직접 고른 부서로 옮깁니다 — 계정 관리의 부서 이동과 같은 API */
  const moveUser = async (empNo, deptId) => after(await repo.moveUserDept(empNo, deptId));

  const exportExcel = useCallback(() => {
    if (tab === 'users') {
      downloadXls({
        name: '미배정 계정',
        head: ['사번', '이름', '그룹웨어 부서', '직위', '상태', '가입 일시', '최근 로그인', '매핑대로 옮길 부서'],
        rows: users.map((u) => [u.empNo, u.name, u.gwDeptNm, u.posNm || u.pos, u.stateNm || u.state, u.joinedAt, u.lastLoginAt, u.suggestDeptNm || '']),
      });
      return;
    }
    downloadXls({
      name: '그룹웨어 부서 매핑',
      head: ['그룹웨어 부서', '재직 인원', '가입 계정', '미배정 계정', 'AX 부서', '상태', '메모', '수정 일시', '수정자'],
      rows: maps.map((m) => [m.gwDeptNm, m.activeCnt, m.joinedCnt, m.unassignedCnt, m.deptNm || '', gwStateLabel(m.state), m.remark || '', m.updDate || '', m.updUser || '']),
    });
  }, [tab, maps, users]);

  return {
    loading,
    loadError,
    summary: data?.summary,
    maps,
    users,
    depts,
    tab,
    setTab,
    filters: { keyword, state, userKeyword },
    setKeyword,
    setState,
    setUserKeyword,
    selectedMaps,
    setSelectedMaps,
    selectedUsers,
    setSelectedUsers,
    /** 지금 매핑대로 옮길 수 있는 미배정 계정 수 */
    reassignableCnt: users.filter((u) => u.suggestDeptId != null).length,
    reload,
    exportExcel,
    saveMap,
    saveMapsBulk,
    removeMap,
    reassign,
    moveUser,
  };
}
