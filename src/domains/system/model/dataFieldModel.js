/**
 * [Model] SY-03 데이터 종류 표기 계산 (기획 04 DTP-07)
 *
 * 응답 필드명(값 이름)을 사람이 보는 화면 열 제목으로 바꾸는 계산을 한곳에 둡니다.
 * 바깥 표(부서 × 종류)의 「포함 데이터」 와 항목 관리 모달의 「가리는 값」 이 같은 규칙을 씁니다.
 *  · 열 제목 ↔ 값 이름 짝은 화면 코드에서 자동으로 모은 목록입니다(screenColumns.generated.js)
 *  · 필드명의 메모는 서버 `attrDetails[{attrName, remark}]` 로 옵니다(`attrs` 는 문자열 배열 그대로).
 *    매핑 화면이 남기는 메모 형식은 「{화면명} · {열 이름}」 입니다(API 2단계 계약)
 */
import { SCREEN_COLUMNS } from './screenColumns.generated';

/** 값 이름 → 화면 열 제목(여러 화면의 제목 중 처음 것) */
export const TITLE_OF = (() => {
  const m = {};
  SCREEN_COLUMNS.forEach((x) => x.columns.forEach((c) => { if (c.field && !m[c.field]) m[c.field] = c.title; }));
  return m;
})();

/** 종류의 응답 필드명 목록 (문자열 배열 · 객체 배열 모두 받습니다) */
export function attrNamesOf(field) {
  return (field?.attrs || []).map((a) => (typeof a === 'string' ? a : a?.attrName)).filter(Boolean);
}

/** 필드명의 메모 — attrDetails 에서 찾습니다 */
export function remarkOf(field, attrName) {
  const d = (field?.attrDetails || []).find((x) => x?.attrName === attrName);
  return d?.remark || '';
}

/**
 * 필드명 하나를 사람이 읽는 이름으로 — 화면 열 제목 → 메모의 열 이름(「화면명 · 열 이름」 의 뒤쪽) → 필드명
 */
export function attrTitleOf(field, attrName) {
  if (TITLE_OF[attrName]) return TITLE_OF[attrName];
  const remark = remarkOf(field, attrName);
  if (remark) return remark.includes(' · ') ? remark.split(' · ').slice(-1)[0] : remark;
  return attrName;
}

/**
 * 「포함 데이터」 — 설명(desc)이 있으면 그대로, 없으면 가리는 값을 열 제목으로 요약합니다.
 * @param {object} field 종류
 * @param {number} [max] 보여 줄 개수
 */
export function includedSummary(field, max = 6) {
  if (field?.desc) return field.desc;
  const titles = [...new Set(attrNamesOf(field).map((a) => attrTitleOf(field, a)))];
  if (!titles.length) return '가리는 값 없음';
  return `${titles.slice(0, max).join(' · ')}${titles.length > max ? ` 외 ${titles.length - max}개` : ''}`;
}
