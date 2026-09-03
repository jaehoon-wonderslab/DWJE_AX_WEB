/**
 * 차트 입력값 정리 (CM-06 공용)
 *
 * 실 데이터에는 아직 적재되지 않은 지표가 `null` 로 옵니다
 * (설비 가동률 등 — 측정값 테이블이 비어 있는 항목).
 * 차트가 그대로 계산에 넣으면 `undefined.toFixed()` 로 화면 전체가 죽으므로
 * 모든 차트가 이 헬퍼를 거쳐 값을 받습니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

/**
 * 숫자면 숫자로, 아니면 null 로 바꿉니다. (null · undefined · '' · NaN · Infinity)
 * @param {*} v
 * @returns {number|null}
 */
export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 값이 숫자인지 확인합니다 */
export const isNum = (v) => num(v) !== null;

/**
 * 값이 없는 항목을 걸러 냅니다.
 * @param {Array} list 항목 배열
 * @param {string} [field] 값이 담긴 키 (기본 'v')
 */
export function withValues(list = [], field = 'v') {
  return list.filter((d) => isNum(d?.[field])).map((d) => ({ ...d, [field]: num(d[field]) }));
}

/**
 * 값이 아직 없을 때 차트 자리에 놓는 안내.
 * 빈 자리를 그냥 두면 로딩 중인지 데이터가 없는지 구분되지 않습니다.
 */
export function ChartEmpty({ height = 120, text = '데이터 없음' }) {
  const s = useCommonStyles();
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}
