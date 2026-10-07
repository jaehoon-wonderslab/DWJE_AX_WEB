/**
 * 데이터 마스킹 표시 (CM-04)
 *
 * 데이터 접근 권한이 없는 항목은 값 대신 '●●●● 비공개' 배지를 그립니다.
 * 값 자체를 화면에 남기지 않는 것이 원칙이므로, 권한이 없으면 value 를 아예 렌더링하지 않습니다.
 *
 * 사용 예) <BlindValue field="price" value="12,400원" />
 *        <BlindValue attr="ngQty" value="120" />  — 응답 필드명으로 판정(표 · 보고서 표와 같은 기준, 2026-10-07)
 *
 * field(종류 key)와 attr(응답 필드명, 문자열 또는 배열)을 같이 주면 둘 중 하나라도 막히면 가립니다.
 */
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { fieldName } from '@shared/utils/maskUtil';

/** 종류 key · 응답 필드명 기준으로 가려야 하는지 — StatCard 도 같은 판정을 씁니다 */
export function useBlinded(field, attr) {
  const canData = useAuthStore((state) => state.canData);
  const canAttr = useAuthStore((state) => state.canAttr);
  useAuthStore((state) => state.attrIndex);
  const attrs = Array.isArray(attr) ? attr : attr ? [attr] : [];
  return (!!field && !canData(field)) || attrs.some((a) => a && !canAttr(a));
}

export default function BlindValue({ field, attr, value, textStyle, style, numberOfLines }) {
  const s = useCommonStyles();
  const dept = useAuthStore((state) => state.userInfo?.dept);
  const blinded = useBlinded(field, attr);

  // 데이터 항목 지정이 없으면 마스킹 대상이 아닙니다
  if (!blinded) {
    return (
      <Text style={textStyle} numberOfLines={numberOfLines}>
        {value}
      </Text>
    );
  }

  // 인쇄·CSV 에서 비공개 건수를 세기 위한 표식 (웹 전용 data 속성)
  const marker = Platform.OS === 'web' ? { dataSet: { blind: '1' } } : {};

  return (
    <View
      style={[s.blind, style]}
      {...marker}
      accessibilityLabel={`${dept || ''} 비공개 항목 — ${field ? fieldName(field) : [].concat(attr).join(', ')}`}
    >
      <Text style={[s.blindText, { opacity: 0.55 }]}>●●●●</Text>
      <Text style={s.blindText}>비공개</Text>
    </View>
  );
}

/** 비공개 안내 한 줄 (표 하단 등) */
export function BlindNote({ fields = [] }) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);
  const blocked = fields.filter((f) => !canData(f));
  if (!blocked.length) return null;
  return (
    <Text style={s.sourceText}>
      {blocked.map(fieldName).join(' · ')} 항목은 소속 부서 데이터 접근 권한이 없어 비공개로 표시됩니다.
    </Text>
  );
}
