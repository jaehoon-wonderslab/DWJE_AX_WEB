/**
 * [Controller] SY-11 AI 모델 버전 관리
 *
 * 서비스 버전(릴리스) = 벡터 인덱스 + 파인튜닝 체크포인트 조합입니다.
 * 버전을 전환하면 자연어 질의가 그 버전으로 응답하므로, 사이드바 표기도 함께 갱신합니다.
 */
import { useCallback, useState } from 'react';
import { fetchMe } from '@domains/auth/model/authRepository';
import { loadCodeGroups } from '@domains/common/model/codeRepository';
import { useAsync } from '@shared/hooks/useAsync';
import { usePaging } from '@shared/hooks/usePaging';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useUiStore } from '@shared/stores/useUiStore';
import * as repo from '../model/systemRepository';

export function useModelVersionController() {
  const toast = useUiStore((state) => state.toast);
  const setMe = useAuthStore((state) => state.setMe);

  const [tab, setTab] = useState('릴리스');
  // 대상 문서 종류는 공통코드에서 받습니다.
  // 임베딩 모델·학습 데이터셋은 아직 목록 API 가 없어 비어 있습니다 (API 세션에 요청해 둠).
  const { data: codes } = useAsync(() => loadCodeGroups('VEC_DOC_TYPE'), [], { silent: true, initialData: {} });

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

  return {
    paging,
    itemsMeta: data?.releasesMeta,
    docTypes: codes?.VEC_DOC_TYPE || [],
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
    summary: data?.summary,
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
