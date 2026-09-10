/**
 * [Model] QC-03 AOI 불량 상세 · 이미지 (REQ_20260910 A-9 · API 회신 2026-09-10)
 *
 * MES 의 AOI 라벨 이력을 id·날짜로 분류해 목록으로 받고, 한 건을 고르면
 * NAS 에 저장된 불량 사진 목록(상대 경로 + 서명된 프록시 URL)을 받습니다.
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
  return unwrapPaged(qualityService.getQualityAoiDefects({ date, from: date, to: date, page, size }));
}

/** 불량 한 건 상세 + 사진 목록 */
export function loadAoiDefect(defectId) {
  return unwrap(qualityService.getQualityAoiDefectsByDefectId({ defectId }));
}

/* 설비 선택지(loadAoiEquipmentOptions)는 2026-09-11 조회 조건 정리(요구 4)로 화면에서 없어졌습니다.
   엔드포인트·서비스(getQualityAoiDefectsEquipments)는 남아 있어 필터를 되살릴 때 다시 쓸 수 있습니다. */
