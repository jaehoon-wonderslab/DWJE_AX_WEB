/**
 * 데이터 마스킹(blind) 유틸 (CM-04)
 *
 * 데이터 접근 권한이 없는 항목은 화면·다운로드·AI 응답 전 구간에서 '비공개'로 치환합니다.
 *
 * [원칙] 서버는 DB 값을 그대로 내려주고, 가리는 일은 표출 단계(화면·엑셀·인쇄물)에서 합니다.
 *        어느 값이 어느 항목인지는 **API 응답 필드명**으로 판정합니다 — 그 대응표를 서버가
 *        `/auth/me` 의 `dataFields` 로 내려주므로, 관리자가 항목을 추가하면 배포 없이
 *        다음 로그인부터 전 화면·전 엑셀에 반영됩니다.
 *
 *        화면 코드에는 항목 key 를 적지 않는 것이 원칙입니다. 적어 두면 항목이 늘 때마다
 *        코드를 고쳐야 해서 자동 반영이 깨집니다.
 */
import { DATA_FIELDS } from '@shared/constants/dataFields';
import { useAuthStore } from '@shared/stores/useAuthStore';

/**
 * 데이터 항목 key → 항목명
 *
 * 서버가 내려준 정의를 먼저 보고, 없으면 내장 상수로 돌아갑니다.
 * (항목은 운영 중에 늘어나므로 상수만 보면 새 항목의 이름을 모릅니다)
 */
export function fieldName(key) {
  const served = useAuthStore.getState().dataFields.find((x) => x.key === key);
  if (served) return served.name;
  const f = DATA_FIELDS.find((x) => x.key === key);
  return f ? f.name : key;
}

/**
 * 응답 필드명이 속한 데이터 항목 key. 등록되지 않았으면 null 입니다.
 * @param {string} attrName 응답 JSON 필드명 (예: 'unitPrice')
 */
export function fieldOfAttr(attrName) {
  return useAuthStore.getState().fieldOfAttr(attrName);
}

/**
 * 응답 필드명 기준 열람 가능 여부. 등록되지 않은 필드명은 통제 대상이 아니라 true 입니다.
 * @param {string} attrName 응답 JSON 필드명
 */
export function canAttr(attrName) {
  return useAuthStore.getState().canAttr(attrName);
}

/** 가려진 자리에 넣는 글자 — 화면 배지(●●●● 비공개)와 짝을 맞춥니다 */
export const BLIND_TEXT = '비공개';

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

/**
 * 내보내기 표를 응답 필드명 기준으로 가립니다.
 *
 * 열마다 그 값이 어디서 온 것인지(`attrs[i]`)만 알려 주면, 어느 항목인지·가려야 하는지는
 * 서버가 내려준 대응표가 판정합니다. 화면이 항목 key 를 알 필요가 없습니다.
 *
 * @param {(string|number)[][]} rows 원본 표 (행 = 값 배열)
 * @param {string[]} attrs 열 순서대로의 응답 필드명. 빈 칸은 통제 대상 아님
 * @returns {{rows:(string|number)[][], blindCount:number}} 가린 표와 가려진 칸 수
 */
export function maskRows(rows, attrs) {
  const list = Array.isArray(rows) ? rows : [];
  if (!Array.isArray(attrs) || !attrs.length) return { rows: list, blindCount: 0 };

  // 열마다 한 번만 판정합니다 — 행이 수천 개일 때 칸마다 스토어를 읽으면 느려집니다
  const blocked = attrs.map((a) => !!a && !canAttr(a));
  if (!blocked.some(Boolean)) return { rows: list, blindCount: 0 };

  let blindCount = 0;
  const masked = list.map((row) =>
    row.map((cell, i) => {
      if (!blocked[i]) return cell;
      blindCount += 1;
      return BLIND_TEXT;
    })
  );
  return { rows: masked, blindCount };
}
