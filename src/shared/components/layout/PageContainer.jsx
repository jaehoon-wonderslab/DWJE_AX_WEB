/**
 * 화면 본문 컨테이너
 *
 * 라우트 파일이 화면 성격에 맞는 컨테이너를 골라 View 를 감쌉니다.
 *  · PageContainer     — 일반 화면 (세로 스크롤 + 여백 + 최대 폭)
 *  · FullPageContainer — 전체 영역을 쓰는 화면 (자연어 질의처럼 내부에서 스크롤을 직접 관리)
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function PageContainer({ children }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.background }} contentContainerStyle={s.content}>
      {children}
    </ScrollView>
  );
}

export function FullPageContainer({ children }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.color.background, padding: 22, maxWidth: theme.metrics.contentMaxWidth, width: '100%' }}>
      {children}
    </View>
  );
}
