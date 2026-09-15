/**
 * 화면 본문 컨테이너 — 본문 패널 안에서 스크롤하는 영역
 *
 * 라우트 파일이 화면 성격에 맞는 컨테이너를 골라 View 를 감쌉니다.
 *  · PageContainer     — 일반 화면 (세로 스크롤 + 24px 여백 + 최대 폭)
 *  · FullPageContainer — 전체 영역을 쓰는 화면 (자연어 질의처럼 내부에서 스크롤을 직접 관리)
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function PageContainer({ children, fluid = false, maxWidth, contentContainerStyle, style }) {
  const s = useCommonStyles();
  return (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[
        s.content,
        fluid && { maxWidth: '100%' },
        maxWidth !== undefined && { maxWidth },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function FullPageContainer({ children, style }) {
  const theme = useTheme();
  return <View style={[{ flex: 1, minHeight: 0, padding: 24, paddingTop: 16, width: '100%' }, style]}>{children}</View>;
}
