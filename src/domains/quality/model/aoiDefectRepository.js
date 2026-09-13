/**
 * [Model] QC-03 AOI 불량 상세 · 이미지 (REQ_20260910 A-9 · API 회신 2026-09-10)
 *
 * MES 의 AOI 라벨 이력을 id·날짜로 분류해 목록으로 받고, 한 건을 고르면
 * NAS 에 저장된 불량 사진 목록(상대 경로 + 서명된 프록시 URL)을 받습니다.
 *
 * ■ 2026-09-14 — 원천을 **DIMENSION(MSSQL)** 으로 옮겼습니다
 * 그동안 쓰던 `/quality/aoi/defects` 는 **MES 라벨 이력**이고, 거기 있는 AOI 설비(VNA-*)는
 * DIMENSION 설비(GP-*·MQ-*)와 **다른 집합**입니다. 화면이 읽던 `seqCnt·failSeqCnt·items[{seq,passed}]`
 * 는 실제로 오지 않는 값이었습니다(9/11 문서 계약의 mock).
 * AOI 치수 판정의 원천은 `EDGE.dbo.TB_SAMSUN_DIMENSION` 이고, 그것을 읽는 API 가
 * `/quality/aoi/dimension/serials` 입니다. MES 목록 API 는 서버에 그대로 남아 있습니다.
 *
 * 서버 규약
 *  · GET /quality/aoi/defects            — **하루치**: date(=from=to) · page · size → { items[] } + meta
 *    지금 API 는 from·to 를, 앞으로 올 MSSQL(DIMENSION) API 는 date 를 읽습니다 — **셋을 함께 보냅니다**(추가 파라미터는 무시됨을 확인).
 *    defectId 는 지금 `plant-wc-lot-serial`(예 PL01-V140-20260803-00316), MSSQL 전환 후에는 `wc~eqpt~lot~serial` 입니다 — 화면은 문자열로만 다룹니다.
 *  · GET /quality/aoi/defects/{defectId} — 목록 항목 + measurements[](DIMENSION 검사 항목) + imageUrlTtlSec + images[{imageId,seq,nasPath,capturedAt,sizeBytes,available,url,thumbUrl}]
 *    `url`·`thumbUrl` 은 /files/aoi-images/{imageId}?token=… 서명 주소(15분) — 그대로 <img src> 에 넣습니다.
 *  · '전체' 선택은 client 가 요청에서 걸러 냅니다 (조건 없음).
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
