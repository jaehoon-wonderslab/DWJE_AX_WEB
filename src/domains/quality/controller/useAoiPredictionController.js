/**
 * [Controller] QC-02 AOI 판정 분석·예측
 *
 * [원칙] 예측은 확정 결과가 아니라 추정입니다.
 *        모든 추정치에 근거 구간과 신뢰도를 함께 내려 주고, 조치 여부는 담당자가 결정합니다.
 *
 * 서버(AoiPredictionService)는 온프레미스 모델 연동 전까지 **선형 추세 + 95% 밴드** 베이스라인을 씁니다.
 * 임계값(불량률 기준)은 SY-13 지표 기준(DEFECT_RATE)에서 읽으며, 등록되지 않으면 null 로 옵니다.
 * 그때는 위험 등급·임계 도달 예상을 계산할 수 없어 "기준 미등록" 으로 드러냅니다.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from '@shared/hooks/useAsync';
import { useUiStore } from '@shared/stores/useUiStore';
import { downloadXls } from '@shared/utils/exportUtil';
import { fixed } from '@shared/utils/formatUtil';
import { loadProcessOptions } from '@domains/common/model/dataRangeRepository';
import { loadAoiPrediction, recalculatePrediction } from '../model/qualityRepository';

/** 서버가 받는 값은 "8h" 처럼 시간 수입니다 — 라벨만 사람 말로 보여 줍니다 */
const HORIZON_BASE = [
  { value: '2h', label: '향후 2시간' },
  { value: '4h', label: '향후 4시간' },
  { value: '8h', label: '향후 8시간' },
];

/** 학습 구간 — 서버 상한이 720시간(30일)이라 주 단위 대신 시간·일 단위로 고릅니다 */
export const TRAIN_OPTIONS = [
  { value: '24h', label: '최근 24시간' },
  { value: '72h', label: '최근 72시간' },
  { value: '168h', label: '최근 7일' },
  { value: '720h', label: '최근 30일' },
];

/** 금일 잔여 시간 (최소 1시간) — "금일 잔여" 선택지 값 */
function remainingHoursToday() {
  const h = 24 - new Date().getHours();
  return Math.max(1, h);
}

/** "8h" → 8 */
const hoursOf = (v) => Number(String(v ?? '').replace(/\D/g, '')) || null;

/** 드리프트 상태 코드 → 표시명 (서버: NORMAL / WARNING / CRITICAL) */
export const DRIFT_STATE = {
  NORMAL: { label: '정상', tone: 'ok' },
  WARNING: { label: '주의', tone: 'warn' },
  CRITICAL: { label: '기준 이탈', tone: 'bad' },
};

/**
 * 임계값 대비 위험 등급
 * @returns {'risk'|'watch'|''} 임계 이상 → risk · 임계의 80% 이상 → watch · 그 외 · 임계 없음 → ''
 */
export function levelOf(rate, threshold) {
  const r = Number(rate);
  const th = Number(threshold);
  if (!Number.isFinite(r) || !Number.isFinite(th) || th <= 0) return '';
  if (r >= th) return 'risk';
  if (r >= th * 0.8) return 'watch';
  return '';
}

/** 임계 도달 예상(시간) → 문구 */
export function etaText(etaHours, { current, threshold }) {
  if (threshold === null || threshold === undefined) return '기준 미등록';
  if (etaHours === 0 || (Number.isFinite(Number(current)) && Number(current) >= Number(threshold))) return '이미 초과';
  if (etaHours === null || etaHours === undefined) return '미도달 (상승 추세 없음)';
  const h = Number(etaHours);
  if (h < 1) return `약 ${Math.max(1, Math.round(h * 60))}분 후`;
  return `약 ${fixed(h, 1)}시간 후`;
}

export function useAoiPredictionController() {
  const toast = useUiStore((state) => state.toast);

  const [target, setTarget] = useState('전체');
  const [horizon, setHorizon] = useState('8h');
  const [trainPeriod, setTrainPeriod] = useState('72h');

  // 대상(공정) 선택지는 서버 기준정보에서 받습니다
  const { data: processOptions } = useAsync(loadProcessOptions, [], { silent: true, initialData: [{ value: '전체', label: '전체' }] });

  const horizonOptions = useMemo(() => {
    const today = `${remainingHoursToday()}h`;
    const base = HORIZON_BASE.some((o) => o.value === today) ? HORIZON_BASE : [...HORIZON_BASE, { value: today, label: `금일 잔여 (${today})` }];
    return base;
  }, []);

  const { data, loading, reload } = useAsync(
    () => loadAoiPrediction({ target, horizon, trainPeriod }),
    [target, horizon, trainPeriod]
  );

  const summary = data?.summary || {};
  // 임계값은 요약·밴드·설비 응답 어디서든 같은 값입니다 — 하나만 있어도 씁니다
  const threshold = summary.threshold ?? data?.band?.threshold ?? data?.equipRisk?.threshold ?? null;
  const horizonHours = summary.horizonHours ?? hoursOf(horizon);

  /** 설비별 위험 — 위험 등급을 붙이고 위험한 것부터 정렬합니다 */
  const equipRisk = useMemo(() => {
    const rank = { risk: 0, watch: 1, '': 2 };
    return (data?.equipRisk?.items || [])
      .map((r) => {
        const level = levelOf(Math.max(Number(r.currentRate) || 0, Number(r.plus8h) || 0), threshold);
        return { ...r, level, etaLabel: etaText(r.thresholdEta, { current: r.currentRate, threshold }) };
      })
      .sort((a, b) => rank[a.level] - rank[b.level] || (Number(b.plus8h) || 0) - (Number(a.plus8h) || 0));
  }, [data, threshold]);

  /** 출하 전 위험 LOT — LRR 확률(%)로 등급을 매깁니다 (임계 이상이면 50% 이상으로 옵니다) */
  const lotRisk = useMemo(
    () => (data?.lotRisk?.items || []).map((r) => {
      const p = Number(r.lrrProbability);
      const level = !Number.isFinite(p) ? null : p >= 50 ? 'risk' : p >= 25 ? 'watch' : '';
      return { ...r, level };
    }),
    [data]
  );

  /** 드리프트 — 상태 코드를 표시명으로, 이탈 건수를 셉니다 */
  const driftRange = data?.drift?.borderlineRange ?? null;
  const drift = useMemo(
    () => (data?.drift?.items || []).map((r) => ({ ...r, stateInfo: DRIFT_STATE[r.state] || { label: r.state || '—', tone: '' } })),
    [data]
  );
  const driftOutCnt = drift.filter((d) => d.state && d.state !== 'NORMAL').length;

  /** 예측 밴드 차트 계열 — 실측 / 추정 중앙값 / 95% 상한 / 95% 하한 */
  const band = data?.band;
  const bandSeries = useMemo(() => {
    if (!band?.labels?.length) return [];
    return [
      { name: '실측 불량률 (%)', data: band.actual || [] },
      { name: '추정 중앙값 (%)', data: band.estimated || [], dashed: true },
      { name: '95% 밴드 상한 (%)', data: band.bandHigh || [], dashed: true },
      { name: '95% 밴드 하한 (%)', data: band.bandLow || [], dashed: true },
    ];
  }, [band]);

  /** x축 라벨 — 시간 단위 58개를 전부 쓰면 겹칩니다. 분기점과 6칸마다 한 개만 남깁니다 */
  const bandLabels = useMemo(() => {
    const labels = band?.labels || [];
    const split = band?.splitIndex ?? labels.length;
    return labels.map((l, i) => (i === split - 1 || i === labels.length - 1 || i % 6 === 0 ? l : ''));
  }, [band]);

  const recalc = useCallback(async () => {
    const res = await recalculatePrediction({ target, horizon, trainPeriod });
    toast(res.message || (res.ok ? '예측을 재산출했습니다' : '예측 재산출에 실패했습니다'));
    if (res.ok) reload();
  }, [target, horizon, trainPeriod, toast, reload]);

  const exportExcel = useCallback(() => {
    downloadXls({
      name: 'AOI 설비별 위험 예측',
      head: ['설비', '설비명', '현재 불량률(%)', '+2h 예측(%)', `+${horizonHours ?? 8}h 예측(%)`, '임계 도달 예상', '주 요인', '권고 조치', '신뢰도'],
      rows: equipRisk.map((r) => [
        r.eqptCd, r.eqptNm ?? '', r.currentRate, r.plus2h, r.plus8h, r.etaLabel, r.mainFactor ?? '', r.recommendation ?? '', r.confidence,
      ]),
    });
  }, [equipRisk, horizonHours]);

  return {
    loading,
    summary,
    threshold,
    horizonHours,
    band,
    bandSeries,
    bandLabels,
    equipRisk,
    lotRisk,
    remaining: data?.remaining || {},
    drift,
    driftRange,
    driftOutCnt,
    shift: data?.shift?.items || [],
    baseWeeks: data?.shift?.baseWeeks ?? 4,
    basis: data?.basis,
    filters: { target, horizon, trainPeriod },
    processOptions,
    horizonOptions,
    trainOptions: TRAIN_OPTIONS,
    setTarget,
    setHorizon,
    setTrainPeriod,
    reload,
    recalc,
    exportExcel,
  };
}
