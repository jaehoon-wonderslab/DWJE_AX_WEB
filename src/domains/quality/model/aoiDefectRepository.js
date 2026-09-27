/**
 * [Model] QC-03 AOI 불량 상세 — DIMENSION(MSSQL) 시리얼 목록과 회차 상세
 *
 * ■ 2026-09-14 — 원천을 **DIMENSION(MSSQL)** 으로 옮겼습니다
 * 그동안 쓰던 `/quality/aoi/defects` 는 **MES 라벨 이력**이고, 거기 있는 AOI 설비(VNA-*)는
 * DIMENSION 설비(GP-*·MQ-*)와 **다른 집합**입니다. 화면이 읽던 `seqCnt·failSeqCnt·items[{seq,passed}]`
 * 는 실제로 오지 않는 값이었습니다(9/11 문서 계약의 mock).
 * AOI 치수 판정의 원천은 `EDGE.dbo.TB_SAMSUN_DIMENSION` 이고, 그것을 읽는 API 가
 * `/quality/aoi/dimension/serials` 입니다. MES 목록·상세·사진 API(`/quality/aoi/defects`, `/files/aoi-images`)와
 * 사진 표(ax.tb_aoi_defect_image)는 2026-09-23 V42 에서 제거했습니다.
 *
 * '전체' 선택은 client 가 요청에서 걸러 냅니다 (조건 없음).
 */
import * as qualityService from '@services/api/qualityService';
import { unwrap, unwrapPaged } from '@services/api/request';

/**
 * 불량 목록 — 검사일 하루치 (쪽 단위)
 * @param {{date:string, page:number, size:number}} p
 * @returns {Promise<{items:Array, meta:{page,size,total,totalPages}}>}
 */
export function loadAoiDefects({ date, page, size }) {
  return unwrapPaged(qualityService.getQualityAoiDimensionSerials({
    date,
    // 회차 번호는 화면에서 「5, 12~14 외 N회차」 로 접으므로 앞쪽 20개면 넉넉합니다
    failSeqsTop: 20,
    page,
    size,
  }));
}

/**
 * 시리얼 한 건의 회차 상세.
 *
 * 기본은 **불량 회차만** 옵니다(`only=ng`). 한 시리얼의 회차가 2,000~3,800개라
 * 전부 받으면 모달이 감당하지 못합니다. 전체가 필요하면 `only: 'all'` 로 부릅니다.
 *
 * @param {string} serialKey `wc~eqpt~lot~serial`
 */
export function loadAoiDefect(serialKey, { only = 'ng', page = 1, size = 100 } = {}) {
  return unwrap(qualityService.getQualityAoiDimensionSerialByKey({ serialKey, only, page, size }));
}

/* 설비 선택지(loadAoiEquipmentOptions)는 2026-09-11 조회 조건 정리(요구 4)로 화면에서 없어졌습니다.
   엔드포인트·서비스(getQualityAoiDefectsEquipments)는 남아 있어 필터를 되살릴 때 다시 쓸 수 있습니다. */
