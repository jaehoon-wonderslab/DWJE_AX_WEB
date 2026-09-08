/** 대메뉴를 눌렀을 때 해당 그룹의 접근 가능한 하위 메뉴를 보여 주는 허브 화면입니다. */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { MENU } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import PageContainer from './PageContainer';
import PageHead from './PageHead';
import Icon from '../ui/Icon';

const GROUP_DESCRIPTIONS = {
  대시보드: '생산·품질 지표를 한눈에 확인할 대시보드를 선택합니다.',
  생산관리: '생산 실적과 설비 가동 상태를 다루는 화면을 선택합니다.',
  품질관리: '불량 발생 현황과 AOI 판정 품질을 확인할 화면을 선택합니다.',
  보고서: '조회하고 작성할 보고서 유형을 선택합니다.',
  '이상 알림': '임계값 초과와 패턴 이상을 확인할 화면을 선택합니다.',
  시스템관리: '계정·권한·기준값·연동 이력 등 운영 설정 화면을 선택합니다.',
};

export default function MenuHub({ groupName }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const can = useAuthStore((state) => state.can);
  const group = MENU.find((entry) => entry.group === groupName);
  const items = group?.items.filter((item) => can(item.id)) || [];

  return (
    <PageContainer>
      <PageHead title={groupName} desc={GROUP_DESCRIPTIONS[groupName]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {items.map((item) => (
          <Link key={item.id} href={item.path} asChild>
            <TouchableOpacity
              activeOpacity={0.72}
              style={StyleSheet.flatten([
                s.card,
                {
                  width: '100%',
                  minWidth: 260,
                  maxWidth: 430,
                  flexBasis: 320,
                  flexGrow: 1,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                },
              ])}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: theme.color.secondary, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="grid" size={18} color={theme.color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <Text style={[s.text, s.bold]}>{item.name}</Text>
                  {item.tag ? (
                    <View style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={s.textXs}>{item.tag}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.textMuted, { marginTop: 5 }]}>{item.description}</Text>
              </View>
              <Icon name="chevronRight" size={17} color={theme.color.mutedForeground} />
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </PageContainer>
  );
}
