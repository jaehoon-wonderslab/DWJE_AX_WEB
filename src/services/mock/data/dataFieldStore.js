/**
 * 데이터 접근 항목 저장소 (목)
 *
 * 관리자가 화면에서 항목·응답 필드명을 추가하면 배포 없이 반영되는 구조라, 목도 같은 모양으로
 * 상태를 들고 있어야 합니다. 상수(DATA_FIELDS)는 씨앗일 뿐이고 이후 변경은 여기에 쌓입니다.
 *
 * `applyFlg` 는 2단계 스위치입니다 — 등록만 해서는 아무것도 가려지지 않고,
 * 부서 체크를 마치고 「적용」을 켜야 마스킹이 걸립니다. 실수로 전 화면이 비공개가 되는 것을
 * 막는 장치라 목에서도 그대로 지킵니다.
 */
import { DATA_FIELDS } from '@shared/constants/dataFields';
import { mockState } from '../state';

function store() {
  if (!mockState.store.dataFields) {
    mockState.store.dataFields = DATA_FIELDS.map((f) => ({
      key: f.key,
      name: f.name,
      desc: f.desc,
      category: f.category || '',
      attrs: [...(f.attrs || [])],
      applyFlg: 'Y', // 기존 7개는 이미 운영 중입니다
    }));
  }
  return mockState.store.dataFields;
}

/** 전체 항목 (관리 화면용 — 미적용 항목까지 보여 줍니다) */
export const allDataFields = () => store();

/** 적용 중인 항목만 (/auth/me 용 — 이것만 실제로 가려집니다) */
export const appliedDataFields = () =>
  store()
    .filter((f) => f.applyFlg === 'Y')
    .map(({ key, name, category, attrs }) => ({ key, name, category, attrs: [...attrs] }));

/** 응답 필드명이 이미 다른 항목에 등록돼 있는지 — 전역 UNIQUE 를 목에서도 지킵니다 */
export function ownerOfAttr(attrName, exceptKey) {
  return store().find((f) => f.key !== exceptKey && f.attrs.includes(attrName)) || null;
}
