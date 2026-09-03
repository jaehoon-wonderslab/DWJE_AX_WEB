/**
 * 데이터 마스킹(blind) 유틸 (CM-04)
 *
 * 데이터 접근 권한이 없는 항목은 화면·다운로드·AI 응답 전 구간에서 '비공개'로 치환합니다.
 *
 * [원칙] 마스킹은 API 응답 생성 단계에서 수행하며, 서버는 값을 null 로 내리고
 *        masked 배열에 항목 key 를 담아 알려 줍니다. 프론트는 그 결과를 배지로 렌더링할 뿐
 *        원본 값을 들고 있지 않습니다. 아래 함수들은 그 판정을 돕는 보조 도구입니다.
 */
import { DATA_FIELDS } from '@shared/constants/dataFields';
import { useAuthStore } from '@shared/stores/useAuthStore';

/** 데이터 항목 key → 항목명 */
export function fieldName(key) {
  const f = DATA_FIELDS.find((x) => x.key === key);
  return f ? f.name : key;
}

/**
 * 지금 로그인한 계정이 해당 데이터 항목을 볼 수 있는지 판정합니다.
 * (컴포넌트 밖에서도 쓸 수 있도록 스토어를 직접 읽습니다)
 *
 * @param {string} fieldKey qty · yield · price · customer · plan · mold · worker
 */
export function canData(fieldKey) {
  return useAuthStore.getState().canData(fieldKey);
}

/**
 * API 응답의 masked 배열에 특정 항목이 포함되어 있는지 확인합니다.
 *
 * @param {object} response ApiResponse
 * @param {string} fieldKey 데이터 항목 key
 */
export function isMasked(response, fieldKey) {
  const masked = response?.masked;
  return Array.isArray(masked) && masked.indexOf(fieldKey) >= 0;
}

/**
 * 표·다운로드처럼 문자열이 필요한 곳에서 쓰는 마스킹 변환.
 *
 * @param {string} fieldKey 데이터 항목 key
 * @param {*} value 원본 값
 * @returns {string} 권한이 있으면 값, 없으면 '비공개'
 */
export function maskText(fieldKey, value) {
  return canData(fieldKey) ? String(value ?? '—') : '비공개';
}

/**
 * 응답 객체에서 마스킹된 항목 수를 셉니다. (다운로드 이력의 blind 건수 기록용)
 *
 * @param {object[]} rows 표 데이터
 * @param {string[]} fieldKeys 표에 포함된 데이터 항목 key 목록
 */
export function countMasked(rows, fieldKeys) {
  const blocked = fieldKeys.filter((k) => !canData(k));
  return blocked.length * (rows?.length || 0);
}
