/**
 * [Model] 품질관리 리포지토리 (QC-01 ~ QC-04)
 */
import * as qualityService from '@services/api/qualityService';
import { command, unwrap, unwrapAll } from '@services/api/request';
import { lastDataDate, recentRange } from '@shared/stores/useAppStore';

/* ───────── QC-01 불량 현황 조회 ───────── */

export function loadDefectStatus({ from, to, processId, defectTypeCd }) {
  const params = { from, to, processId, defectTypeCd };
  return unwrapAll({
    summary: qualityService.getQualityDefectsSummary(params),
    byType: qualityService.getQualityDefectsByType(params),
  });
}

/**
 * 라인별 불량률 — 따로 조회합니다.
 *
 * 이 조회만 유독 느립니다(기간에 따라 60초를 넘고 500 으로 끝나기도 합니다).
 * 같은 묶음에 두면 요약·유형 표가 다 왔는데도 화면 전체가 로딩에 멈춰
 * 사용자는 고장으로 봅니다. 카드 하나만 늦게 채우도록 떼어 냈습니다.
 */
export function loadDefectByLine({ from, to, processId, defectTypeCd }) {
  return unwrap(qualityService.getQualityDefectsByLine({ from, to, processId, defectTypeCd, topN: 5 }), { items: [] });
}

/* ───────── QC-02 AOI 판정 분석·예측 ───────── */

/**
 * AOI 예측 화면 한 벌
 *
 * 서버 규약(AoiPredictionService)
 *  · target      — 공정 코드. '전체' 는 보내지 않습니다(전 공정)
 *  · horizon     — "8h" 처럼 숫자만 뽑아 시간으로 씁니다 (기본 8h)
 *  · trainPeriod — "72h" 처럼 숫자만 뽑아 시간으로 씁니다 (기본 72h · 최대 720h)
 *  · 드리프트는 from/to 를 안 주면 오늘 기준 14일이라 실적이 없는 날이 섞입니다 → 마지막 실적일 기준 14일
 *  · 유형 구성 변화의 date 를 안 주면 오늘(실적 없음)이라 전부 -100% 가 됩니다 → 마지막 실적일
 */
export function loadAoiPrediction({ target, horizon, trainPeriod }) {
  const scope = target && target !== '전체' ? target : undefined;
  const params = { target: scope, horizon, trainPeriod };
  const drift = recentRange(14);
  return unwrapAll({
    summary: qualityService.getQualityAoiPredictionSummary(params),
    band: qualityService.getQualityAoiPredictionTrendBand({ target: scope, horizon }),
    equipRisk: qualityService.getQualityAoiPredictionEquipmentRisk({ target: scope, horizon }),
    lotRisk: qualityService.getQualityAoiPredictionLotRisk({ target: scope }),
    remaining: qualityService.getQualityAoiPredictionRemainingEstimate({ target: scope, horizon }),
    drift: qualityService.getQualityAoiInspectorDrift({ from: drift.from, to: drift.to }),
    shift: qualityService.getQualityAoiDefectTypeShift({ date: lastDataDate(), baseWeeks: 4 }),
    basis: qualityService.getQualityAoiPredictionBasis({}),
  });
}

export const recalculatePrediction = ({ target, horizon, trainPeriod }) =>
  command(qualityService.postQualityAoiPredictionRecalculate({
    target: target && target !== '전체' ? target : undefined,
    horizon,
    trainPeriod,
  }));

/* ───────── QC-03 품질 보고서 · QC-04 보고서 양식 관리 — 화면 제거됨 ─────────
 *
 * 2026-09-04 — 고객이 준 보고서 자료(`Web 프로토타입/보고서 스크린샷`)에 품질 보고서가 없습니다.
 * 만들기로 한 보고서 6종은 아침회의 자료 2종 · 출하계획 · 제품별 수율 · 고객사별 LRR · 폐기 보고서이고,
 * 품질 보고서는 그 어디에도 해당하지 않아 화면·메뉴를 걷어냈습니다(사용자 확인).
 *
 * 보고서 양식 관리(QC-04)는 품질 보고서의 하위 화면이고 그 양식만 다루므로 함께 걷어냈습니다.
 * 서버 API 도 제거 요청했습니다.
 */
