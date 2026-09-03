/**
 * 정의되지 않은 경로
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { HOME_PATH } from '@shared/constants/menu';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function NotFound() {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.color.background }}>
      <Text style={[s.pageTitle, { fontSize: 18 }]}>화면을 찾을 수 없습니다</Text>
      <Text style={s.textMuted}>주소를 확인해 주세요.</Text>
      <Link href={HOME_PATH} style={{ marginTop: 8 }}>
        <Text style={[s.textSm, { color: theme.color.primary, fontWeight: '600' }]}>AI 통합 대시보드로 이동</Text>
      </Link>
    </View>
  );
}
