/**
 * [Controller] SY-09 보안 감사 로그
 *
 * 권한 변경·마스킹·출력·모델 전환 등 「공통 규약」 6절의 자동 기록 대상이 모입니다.
 *
 * ■ 2026-10-01 개편 (기획 09 AUD-05 · 09 · 12 · 15 · 17)
 * - 표 9열(시각·유형·계정·이름·부서·대상·처리 결과·비고·IP)과 행 상세(id·화면·데이터 항목·IP·접속 환경)
 * - 조회 조건: 결과·계정/검색어·IP·로그인 성공 제외. 입력칸은 Enter·「조회」 로만 반영하고,
 *   날짜·선택은 바꾸는 즉시 조회합니다.
 * - 엑셀은 옵션 패널 두 항목입니다(공통 10.6 CMN-07).
 *     조회 목록 = 지금 표의 **현재 쪽**을 표의 정렬·열 순서대로(브라우저 생성, 이력 범위 VIEW)
 *     전체      = 조건·쪽과 무관한 전체(서버 생성, 상한 50,000, 이력 범위 ALL — 서버가 기록)
 *   두 항목 모두 조회 권한이면 받습니다(R-10). 이 화면에는 쓰기 동작이 없습니다(R-06 대상 아님).
 * - 머리글 「보존 정책」(AUD-11): 원천별 보관·경과·아카이브 건수, 배치 일정, 감사 기록 실패 수(AUD-13)
 * - 2쪽부터는 1쪽 기준 시각(asOf)을 보내 쪽 경계를 고정합니다(4.7)
 * - 조회가 실패하면 이전 행을 지우고 오류를 돌려줍니다(View 가 「다시 시도」 를 그립니다).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { recentDays } from '@shared/stores/useAppStore';
import { downloadXls } from '@shared/utils/exportUtil';
import * as repo from '../model/systemRepository';
import { gridExport } from './gridExport';

/**
 * 유형·결과 코드의 기본 표시명 — 공통코드(LOG_AUDIT_TYPE · LOG_AUDIT_RESULT)를 못 받았을 때(목 모드 등)만 씁니다.
 * 정본은 서버 공통코드입니다.
 */
const TYPE_FALLBACK = [
  { value: 'LOGIN', label: '로그인' },
  { value: 'PERM_CHANGE', label: '권한 변경' },
  { value: 'MASK', label: '마스킹 처리' },
  { value: 'RAW_VIEW', label: '원본 조회' },
  { value: 'EXPORT', label: '내려받기 · 인쇄' },
  { value: 'CONFIG_CHANGE', label: '설정 변경' },
  { value: 'ACCOUNT_SEC', label: '계정 보안' },
  { value: 'ACCESS_DENIED', label: '접근 거부' },
  { value: 'AUDIT_VIEW', label: '감사 기록 조회' },
  { value: 'AUTO_GEN', label: '자동 생성' },
  { value: 'UNMASK_REQ', label: '마스킹 해제 요청 (제거됨)' },
];
const RESULT_FALLBACK = [
  { value: 'ALLOW', label: '허용' },
  { value: 'REJECT', label: '반려' },
  { value: 'BLIND', label: 'blind 처리' },
  { value: 'MASKED', label: '마스킹 후 제공' },
];

/** 과거 행 표시용으로만 남은 유형 — 선택지 끝으로 보냅니다 (AUD-09) */
const LEGACY_TYPES = ['UNMASK_REQ'];

/** 엑셀 「조회 목록」 열 — 화면 9열과 같은 순서, attr 는 응답 필드명(마스킹 판정, R-10) */
const exportCols = (typeLabel, resultLabel) => [
  { field: 'ts', head: '시각' },
  { field: 'type', head: '유형', value: (r) => typeLabel(r.type) },
  { field: 'empNo', head: '계정' },
  { field: 'name', head: '이름' },
  { field: 'dept', head: '부서' },
  { field: 'target', head: '대상' },
  { field: 'result', head: '처리 결과', value: (r) => (r.result ? resultLabel(r.result) : '') },
  { field: 'detail', head: '비고' },
  { field: 'ip', head: 'IP' },
];

export function useAuditLogController() {
  // 감사 로그는 시스템이 지금 남기는 기록이라 실적 기준일이 아니라 오늘이 기준입니다
  const [from, setFrom] = useState(recentDays(7).from);
  const [to, setTo] = useState(recentDays(7).to);
  const [type, setType] = useState('전체');
  const [group, setGroup] = useState('전체');
  const [result, setResult] = useState('전체');
  const [excludeLoginSuccess, setExcludeLoginSuccess] = useState(false);
  // 입력칸 — 치는 값과 조회에 쓰는 값을 나눕니다(Enter·「조회」 에서만 반영, AUD-12)
  const [keywordInput, setKeywordInput] = useState('');
  const [ipInput, setIpInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [ip, setIp] = useState('');

  /** 표 인스턴스 — 「조회 목록」 이 지금 정렬·열 순서를 읽습니다 */
  const gridRef = useRef(null);

  // 유형·처리 결과는 서버 공통코드가 정본입니다 (LOG_AUDIT_TYPE · LOG_AUDIT_RESULT).
  // 화면에 '로그인' 을 박아 두면 서버가 받는 코드(LOGIN)와 달라 조회가 0건이 됩니다
  const { data: codes } = useAsync(
    () => loadCodeGroups('LOG_AUDIT_TYPE', 'LOG_AUDIT_RESULT'),
    [],
    { silent: true, initialData: {} }
  );
  const typeCodes = useMemo(() => {
    const list = codes?.LOG_AUDIT_TYPE?.length ? codes.LOG_AUDIT_TYPE : TYPE_FALLBACK;
    return [...list.filter((c) => !LEGACY_TYPES.includes(c.value)), ...list.filter((c) => LEGACY_TYPES.includes(c.value))];
  }, [codes]);
  const resultCodes = codes?.LOG_AUDIT_RESULT?.length ? codes.LOG_AUDIT_RESULT : RESULT_FALLBACK;

  // 사용자 그룹 선택지는 서버 부서 목록에서 받습니다 (박아 두면 실제 부서명과 달라집니다)
  const { data: deptOptions } = useAsync(repo.loadDeptOptions, [], { silent: true, initialData: ['전체'] });

  // 감사 로그는 계속 쌓이므로 쪽 단위로 봅니다
  const condKey = `${from}|${to}|${type}|${group}|${result}|${keyword}|${ip}|${excludeLoginSuccess}`;
  const paging = usePaging({ resetKey: condKey });
  /**
   * 쪽 경계 고정(기획 09 4.7, 서버 `asOf`) — 1쪽에서 받은 가장 새 시각을 기억해 2쪽부터 `ts <= asOf` 로 받습니다.
   * 조회하는 사이 새 기록이 쌓여도 2쪽에서 1쪽 행이 밀려 다시 보이지 않습니다. 브라우저 시계는 쓰지 않습니다(서버 시각만).
   */
  const asOfRef = useRef({ key: '', ts: '' });
  const { data, loading, error, reload } = useAsync(
    async () => {
      const first = paging.page === 1;
      const asOf = !first && asOfRef.current.key === condKey ? asOfRef.current.ts : '';
      const res = await repo.loadAuditLogs({ from, to, type, group, result, keyword, ip, excludeLoginSuccess, ...paging.params, ...(asOf ? { asOf } : {}) });
      if (first) asOfRef.current = { key: condKey, ts: res?.items?.[0]?.ts || '' };
      return res;
    },
    [from, to, type, group, result, keyword, ip, excludeLoginSuccess, paging.page, paging.size],
    { silent: true }
  );
  // 실패하면 이전 행을 지웁니다 — 지난 조건의 행이 새 조건의 결과처럼 보이면 안 됩니다(AUD-15)
  const items = error ? [] : data?.items || [];
  const itemsMeta = error ? null : data?.meta;

  /** 유형 코드 → 표시명 (LOGIN → 로그인). 이미 표시명이면 그대로 */
  const typeLabel = useCallback((code) => labelOf(typeCodes, code) || code || '—', [typeCodes]);
  /** 처리 결과 코드 → 표시명 (ALLOW → 허용 · 열람) */
  const resultLabel = useCallback((code) => labelOf(resultCodes, code) || code || '—', [resultCodes]);

  /** 입력칸(계정·검색어 · IP)을 조회 조건에 반영합니다 */
  const search = useCallback(() => {
    const k = keywordInput.trim();
    const i = ipInput.trim();
    if (k === keyword && i === ip) {
      reload();
      return;
    }
    setKeyword(k);
    setIp(i);
  }, [keywordInput, ipInput, keyword, ip, reload]);

  /** 엑셀 이력의 조건 요약 — 「{from}~{to} · 유형 · 부서 · 검색어 · {page}쪽/{size}건」 */
  const condSummary = useMemo(() => [
    `${from}~${to}`,
    `유형 ${type === '전체' ? '전체' : typeLabel(type)}`,
    `결과 ${result === '전체' ? '전체' : resultLabel(result)}`,
    `부서 ${group}`,
    `검색어 ${keyword || '없음'}`,
    ...(ip ? [`IP ${ip}`] : []),
    ...(excludeLoginSuccess ? ['로그인 성공 제외'] : []),
    `${paging.page}쪽/${paging.size}건`,
  ].join(' · '), [from, to, type, result, group, keyword, ip, excludeLoginSuccess, paging.page, paging.size, typeLabel, resultLabel]);

  /** 조회 목록 다운로드 — 지금 표의 현재 쪽을 표의 정렬·열 순서 그대로 (AUD-17) */
  const exportView = useCallback(async () => {
    const t = gridExport(gridRef.current, exportCols(typeLabel, resultLabel), items);
    await downloadXls({
      name: '보안 감사 로그',
      head: t.head,
      attrs: t.attrs,
      rows: t.rows,
      scope: 'VIEW',
      condSummary,
      menuId: 'sys-audit',
    });
  }, [items, typeLabel, resultLabel, condSummary]);

  /** 전체 다운로드 — 서버 생성(조건·쪽 무관, 상한 50,000). 이력은 서버가 남깁니다 (AUD-07) */
  const exportAll = useCallback(async () => {
    await repo.exportAuditLogsAll();
  }, []);

  return {
    loading,
    loadError: error ? { code: error.code, message: error.message } : null,
    items,
    paging,
    itemsMeta,
    gridRef,
    filters: { from, to, type, group, result, keyword: keywordInput, ip: ipInput, excludeLoginSuccess },
    deptOptions,
    typeCodes,
    resultCodes,
    typeLabel,
    resultLabel,
    setFrom,
    setTo,
    setType,
    setGroup,
    setResult,
    setKeyword: setKeywordInput,
    setIp: setIpInput,
    toggleExcludeLoginSuccess: () => setExcludeLoginSuccess((v) => !v),
    search,
    reload,
    exportView,
    exportAll,
    /** 보존 정책 (AUD-11) — 서버 API 가 없으면 null */
    loadRetention: repo.fetchAuditRetention,
  };
}
