/**
 * 데이터 마스킹 표시 (CM-04)
 *
 * 데이터 접근 권한이 없는 항목은 값 대신 '●●●● 비공개' 배지를 그립니다.
 * 값 자체를 화면에 남기지 않는 것이 원칙이므로, 권한이 없으면 value 를 아예 렌더링하지 않습니다.
 *
 * 사용 예) <BlindValue field="price" value="12,400원" />
 */
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { fieldName } from '@shared/utils/maskUtil';

export default function BlindValue({ field, value, textStyle, style, numberOfLines }) {
  const s = useCommonStyles();
  const canData = useAuthStore((state) => state.canData);
  const dept = useAuthStore((state) => state.userInfo?.dept);

  // 데이터 항목 지정이 없으면 마스킹 대상이 아닙니다
  if (!field || canData(field)) {
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
      accessibilityLabel={`${dept || ''} 비공개 항목 — ${fieldName(field)}`}
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
