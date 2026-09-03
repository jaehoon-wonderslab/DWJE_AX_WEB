/**
 * [Controller] SY-11 AI 모델 버전 관리
 *
 * 서비스 버전(릴리스) = 벡터 인덱스 + 파인튜닝 체크포인트 조합입니다.
 * 버전을 전환하면 자연어 질의가 그 버전으로 응답하므로, 사이드바 표기도 함께 갱신합니다.
 *
 * 파인튜닝·재색인 **실행 자체**는 이 화면의 범위 밖입니다 — 폼과 호출만 정리해 둡니다.
 */
import { useCallback, useState } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { labelOf, loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import * as repo from '../model/systemRepository';

/** 빌드 완료 여부 — 서버는 코드(DONE)로, 예전 목 응답은 표시명('완료')으로 줍니다 */
export const isBuildDone = (state) => state === 'DONE' || state === '완료';

/**
 * 빌드 상태 표시명 — 벡터·파인튜닝 빌드 상태는 공통코드 그룹이 없어 여기서 보완합니다.
 * (릴리스 상태는 AI_SERVING_STATE, 배포 이력 구분은 AI_DEPLOY_ACTION 공통코드를 씁니다)
 */
const BUILD_STATE_LABEL = { DONE: '완료', RUNNING: '진행 중', PENDING: '대기', FAIL: '실패', FAILED: '실패', ABORTED: '중단' };
export const buildStateLabel = (state) => BUILD_STATE_LABEL[state] || state || '—';
export const buildStateTone = (state) => {
  if (isBuildDone(state)) return 'green';
  if (state === 'FAIL' || state === 'FAILED' || state === '실패' || state === 'ABORTED') return 'red';
  return 'blue';
};

/** 릴리스 상태 색 — 서비스 중(ACTIVE) 초록 · 폐기/롤백 기본 · 그 외(작성 중·카나리) 파랑 */
export const releaseTone = (state) => {
  if (state === 'ACTIVE' || state === '서비스 중') return 'green';
  if (state === 'RETIRED' || state === 'ROLLED_BACK' || state === '보관') return '';
  return 'blue';
};

/** 배포·학습 이력 구분 색 — 전량 배포 초록 · 롤백 주황 · 카나리 파랑 · 폐기 기본 */
export const deployTone = (type) => {
  if (type === 'PROMOTE' || type === '서비스 전환') return 'green';
  if (type === 'ROLLBACK' || type === '롤백') return 'amber';
  if (type === 'CANARY') return 'blue';
  return '';
};

/** 소요 시간 — 서버는 초 단위 숫자, 예전 목 응답은 문자열 */
export const durationText = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'number') return String(v);
  if (v < 60) return `${v}초`;
  const m = Math.floor(v / 60);
  return m < 60 ? `${m}분 ${v % 60}초` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
};

/** 평가 지표 라벨과 방향 — 거절률·환각률은 낮을수록 좋습니다 */
export const EVAL_METRICS = [
  { key: 'intent', label: '의도 파악 정확도', lowerIsBetter: false },
  { key: 'cite', label: '근거 인용률', lowerIsBetter: false },
  { key: 'refuse', label: '거절률', lowerIsBetter: true },
  { key: 'halluc', label: '환각률', lowerIsBetter: true },
];

export function useModelVersionController() {
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);

  const [tab, setTab] = useState('릴리스');
  // 대상 문서 종류·릴리스 상태·배포 구분·거리 함수 표시명은 공통코드에서 받습니다.
  const { data: codes } = useAsync(
    () => loadCodeGroups('VEC_DOC_TYPE', 'AI_SERVING_STATE', 'AI_DEPLOY_ACTION', 'VEC_DISTANCE', 'VEC_JOB_TYPE'),
    [],
    { silent: true, initialData: {} }
  );
  const servingStates = codes?.AI_SERVING_STATE || [];
  const deployActions = codes?.AI_DEPLOY_ACTION || [];
  const distances = codes?.VEC_DISTANCE || [];
  const jobTypes = codes?.VEC_JOB_TYPE || [];

  const paging = usePaging();

  const { data, loading, reload } = useAsync(
    () => repo.loadModelVersions(paging.params),
    [paging.page, paging.size]
  );

  /** 버전이 바뀌면 사이드바의 '서비스 모델' 표기도 갱신합니다 */
  const run = useCallback(
    async (fn) => {
      const res = await fn();
      toast(res.message);
      if (res.ok) {
        reload();
        const me = await fetchMe();
        if (me.ok) setMe(me.me);
      }
      return res;
    },
    [toast, reload, setMe]
  );

  /**
   * 요약 카드 — 서버 필드(serving{ver,appliedAt} · vecCompletedCnt · ftCompletedCnt)를 화면 이름으로 맞춥니다.
   * 의도 파악 정확도·환각률은 요약 응답에 없어(보고서 API 요청) 비어 있으면 '—' 로 그립니다.
   */
  const raw = data?.summary;
  const summary = raw
    ? {
        servingVer: raw.serving?.ver ?? raw.servingVer ?? null,
        servingSince: raw.serving?.appliedAt ?? raw.servingSince ?? null,
        servingMode: raw.serving?.mode ?? null,
        releaseCnt: raw.releaseCnt,
        vectorCnt: raw.vecCompletedCnt ?? raw.vectorCnt ?? 0,
        finetuneCnt: raw.ftCompletedCnt ?? raw.finetuneCnt ?? 0,
        evaluation: raw.evaluation || null,
      }
    : null;

  return {
    paging,
    itemsMeta: data?.releasesMeta,
    docTypes: codes?.VEC_DOC_TYPE || [],
    /** 코드 → 표시명 (릴리스 상태 · 배포 구분 · 거리 함수 · 색인 작업 종류) */
    stateLabel: (code) => (code ? labelOf(servingStates, code) : '—'),
    deployLabel: (code) => (code ? labelOf(deployActions, code) : '—'),
    distanceLabel: (code) => (code ? labelOf(distances, code) : '—'),
    jobTypeLabel: (code) => (code ? labelOf(jobTypes, code) : '—'),
    // 외부 API 모델은 기밀 문서를 보낼 수 없어 선택지에 표시해 둡니다
    embedOptions: (data?.embedModels?.items || []).map((m) => ({
      value: m.embedModelId,
      label: `${m.name} · ${m.dim}차원${m.onPrem ? '' : ' · 외부 API (기밀 문서 금지)'}${m.current ? ' · 현재' : ''}`,
    })),
    // 사내에서 서빙하는 베이스 모델 자산. 아직 등록된 것이 없으면 비어 있습니다
    baseOptions: (data?.assets?.items || []).map((a) => ({ value: a.baseModel || a.assetKey, label: a.name || a.assetKey })),
    loading,
    tab,
    setTab,
    summary,
    releases: data?.releases?.items || [],
    vectors: data?.vectors?.items || [],
    finetunes: data?.finetunes?.items || [],
    trend: data?.trend,
    logs: data?.logs?.items || [],
    loadApplyPreview: repo.fetchApplyPreview,
    loadVectorBuild: repo.fetchVectorBuild,
    loadFinetuneBuild: repo.fetchFinetuneBuild,
    applyRelease: (ver, mode) => run(() => repo.applyRelease(ver, mode)),
    rollback: () => run(() => repo.rollbackRelease()),
    archive: (ver) => run(() => repo.archiveRelease(ver)),
    createRelease: (v) => run(() => repo.createRelease(v)),
    runVectorBuild: (v) => run(() => repo.runVectorBuild(v)),
    runFinetune: (v) => run(() => repo.runFinetune(v)),
  };
}
