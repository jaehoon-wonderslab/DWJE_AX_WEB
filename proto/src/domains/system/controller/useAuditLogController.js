/**
 * [Controller] SY-09 보안 감사 로그
 *
 * 권한 변경·마스킹·출력·모델 전환 등 「공통 규약」 6절의 자동 기록 대상이 모입니다.
 */
import { useCallback, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentDays } from '@shared/stores/useAppStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';

export function useAuditLogController() {
  // 감사 로그는 시스템이 지금 남기는 기록이라 실적 기준일이 아니라 오늘이 기준입니다
  const [from, setFrom] = useState(recentDays(7).from);
  const [to, setTo] = useState(recentDays(7).to);
  const [type, setType] = useState('전체');
  const [group, setGroup] = useState('전체');

  // 유형·처리 결과는 서버 공통코드가 정본입니다 (LOG_AUDIT_TYPE · LOG_AUDIT_RESULT).
  // 화면에 '로그인' 을 박아 두면 서버가 받는 코드(LOGIN)와 달라 조회가 0건이 됩니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('LOG_AUDIT_TYPE', 'LOG_AUDIT_RESULT'),
    [],
    { silent: true, initialData: {} }
  );
  const typeCodes = codes?.LOG_AUDIT_TYPE || [];
  const resultCodes = codes?.LOG_AUDIT_RESULT || [];

  // 사용자 그룹 선택지는 서버 부서 목록에서 받습니다 (박아 두면 실제 부서명과 달라집니다)
  const { data: deptOptions } = useAsync(repo.loadDeptOptions, [], { silent: true, initialData: ['전체'] });

  // 감사 로그는 계속 쌓이므로 쪽 단위로 봅니다
  const paging = usePaging({ resetKey: `${from}|${to}|${type}|${group}` });
  const { data, loading, reload } = useAsync(
    () => repo.loadAuditLogs({ from, to, type, group, ...paging.params }),
    [from, to, type, group, paging.page, paging.size]
  );
  const items = data?.items || [];

  /** 유형 코드 → 표시명 (LOGIN → 로그인). 이미 표시명이면 그대로 */
  const typeLabel = useCallback((code) => labelOf(typeCodes, code) || code || '—', [typeCodes]);
  /** 처리 결과 코드 → 표시명 (ALLOW → 허용 · 열람) */
  const resultLabel = useCallback((code) => labelOf(resultCodes, code) || code || '—', [resultCodes]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: '보안 감사 로그',
      head: ['시각', '유형', '대상', '사용자 그룹', '처리 결과', '비고'],
      rows: items.map((r) => [r.ts, typeLabel(r.type), r.target, r.dept, resultLabel(r.result), r.detail]),
    });
  }, [items, typeLabel, resultLabel]);

  return {
    loading,
    items,
    paging,
    itemsMeta: data?.meta,
    filters: { from, to, type, group },
    deptOptions,
    typeCodes,
    typeLabel,
    resultLabel,
    setFrom,
    setTo,
    setType,
    setGroup,
    reload,
    exportExcel,
  };
}
