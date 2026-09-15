/**
 * 정의되지 않은 경로
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { HOME_PATH } from '@shared/constants/menu';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function NotFound() {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.background, padding: 16 }}>
      <View style={[s.panel, { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 32, maxWidth: 480, width: '100%' }]}>
        <Text style={s.eyebrow}>404 · Not found</Text>
        <Text style={s.pageTitle}>화면을 찾을 수 없습니다</Text>
        <Text style={[s.body, { textAlign: 'center', color: theme.color.mutedForeground }]}>주소를 확인하십시오. 메뉴에서 다시 고르거나 기본 화면으로 돌아갈 수 있습니다.</Text>
        <Link href={HOME_PATH} asChild>
          <Pressable style={({ hovered }) => ({ marginTop: 12, height: 36, paddingHorizontal: 16, borderRadius: theme.metrics.radiusAction, backgroundColor: theme.color.primary, alignItems: 'center', justifyContent: 'center', opacity: hovered ? 0.92 : 1 })}>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16.5, fontWeight: '600', color: '#fff' }}>자연어 질의로 돌아가기</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
