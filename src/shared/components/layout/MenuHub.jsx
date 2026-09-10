/**
 * 대메뉴 허브 — 그룹을 눌렀을 때 접근 가능한 하위 화면을 고르는 화면입니다.
 *
 * 왼쪽에 페이지 헤더(소제목 · 21px 제목 · 설명), 오른쪽에 화면 목록.
 * 목록 행은 흰 카드 안에서 #DFE1E7 헤어라인으로만 나뉩니다 — 두 자리 번호 · 13px 600 화면명 · 12px 설명.
 */
import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { MENU } from '@shared/constants/menu';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { NUM_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import PageContainer from './PageContainer';
import Hoverable from '../ui/Hoverable';
import Icon from '../ui/Icon';

const GROUP_DESCRIPTIONS = {
  대시보드: '생산·품질 지표와 설비 가동 현황을 한눈에 확인할 대시보드를 선택하십시오.',
  '생산 및 품질 관리': '생산 실적 집계와 불량 현황, AOI 판정 품질을 다루는 화면을 선택하십시오.',
  보고서: '일일 보고와 회의 자료, 계획·수율·LRR·폐기 보고서를 선택하십시오.',
  '이상 알림': '임계값 초과와 패턴 이상을 확인할 화면을 선택하십시오.',
  시스템관리: '계정·권한·기준값·연동 이력 등 운영 설정 화면을 선택하십시오.',
};

const GROUP_EYEBROW = {
  대시보드: 'Dashboard',
  '생산 및 품질 관리': 'Production & Quality',
  보고서: 'Reports',
  '이상 알림': 'Alerts',
  시스템관리: 'System',
};

export default function MenuHub({ groupName }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const can = useAuthStore((state) => state.can);
  const group = MENU.find((entry) => entry.group === groupName);
  const items = group?.items.filter((item) => can(item.id)) || [];
  const wide = width >= 1100;

  return (
    <PageContainer>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 40 : 20, alignItems: 'flex-start' }}>
        {/* 페이지 헤더 */}
        <View style={{ flex: wide ? 0.8 : undefined, maxWidth: 420 }}>
          <Text style={[s.eyebrow, { marginBottom: 10 }]}>{GROUP_EYEBROW[groupName] || 'Menu'}</Text>
          <Text style={s.pageTitle}>{groupName}</Text>
          <Text style={[s.pageDesc, { marginTop: 8 }]}>{GROUP_DESCRIPTIONS[groupName]}</Text>
          <Text style={[s.caption, { marginTop: 16 }]}>{`접근 가능한 화면 ${items.length}개`}</Text>
        </View>

        {/* 화면 목록 */}
        <View style={[s.card, { flex: 1, width: '100%', maxWidth: 760 }]}>
          {items.map((item, i) => (
            <Link key={item.id} href={item.path} asChild>
              <Hoverable
                hoverStyle={({ hovered, pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderBottomWidth: i === items.length - 1 ? 0 : 1,
                  borderBottomColor: theme.divider,
                  backgroundColor: hovered || pressed ? theme.surface : 'transparent',
                })}
              >
                <Text style={{ fontFamily: NUM_FAMILY, fontSize: 15, fontWeight: '600', letterSpacing: 0.2, color: theme.color.mutedForeground, width: 22, fontVariant: ['tabular-nums'] }}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={s.heading2xs}>{item.name}</Text>
                    {item.tag ? <Text style={[s.caption, { fontSize: 14 }]}>{item.tag}</Text> : null}
                  </View>
                  {item.description ? <Text style={[s.bodySm, { marginTop: 3 }]}>{item.description}</Text> : null}
                </View>
                <Icon name="chevronRight" size={16} color={theme.color.mutedForeground} />
              </Hoverable>
            </Link>
          ))}
          {!items.length ? <Text style={[s.emptyText, { paddingVertical: 24 }]}>이 그룹에서 접근 가능한 화면이 없습니다.</Text> : null}
        </View>
      </View>
    </PageContainer>
  );
}
