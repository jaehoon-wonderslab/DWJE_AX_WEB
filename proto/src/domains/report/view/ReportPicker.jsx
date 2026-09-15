/**
 * [View] 보고서 — 드롭다운으로 보고서를 고르면 그 자리에서 만들어 보여 줍니다
 *
 * 사이드바의 「보고서」 한 줄이 이 화면(/menu/report)으로 옵니다. 구성은 위에서 아래로:
 *  1. 머리말 — 제목 · 설명
 *  2. 선택 패널 — "보고서 선택" 드롭다운(접근 권한이 있는 보고서만) + 선택한 보고서 설명
 *     그 아래 "자주 쓰는 보고서" 버튼(최대 5개) — 이 계정이 만든 횟수 순, DB(`/reports/usage`)에서 읽음
 *  3. 만든 보고서 — 고른 보고서의 컨트롤러·뷰가 그대로 렌더링 (필터·인쇄·다운로드 동작)
 *     아직 고르지 않았으면 안내 한 줄만
 *
 * 선택은 주소(`?report=rpt-press-morning`)에 남아 새로 고침·북마크에도 유지됩니다.
 * 보고서가 추가되면 REPORTS 에 { id → 컨트롤러·뷰 } 한 줄만 더하면 됩니다(메뉴 정의의 id 와 같아야 합니다).
 */
import React, { useEffect, useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import { Icon, SelectField } from '@shared/components/ui';
import { reportItems } from '@shared/constants/menu';
import { useAppNavigation } from '@shared/hooks/useAppNavigation';
import { useAuthStore } from '@shared/stores/useAuthStore';
import { USAGE_TOP, useReportUsageStore } from '@shared/stores/useReportUsageStore';
import { FONT_FAMILY, NUM_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { useDailyReportController } from '@domains/production/controller/useDailyReportController';
import DailyReportView from '@domains/production/view/DailyReportView';
import { usePressMorningController } from '../controller/usePressMorningController';
import { usePlatingMorningController } from '../controller/usePlatingMorningController';
import { useShipPlanController } from '../controller/useShipPlanController';
import { useYieldByModelController } from '../controller/useYieldByModelController';
import { useLrrByCustomerController } from '../controller/useLrrByCustomerController';
import { useScrapReportController } from '../controller/useScrapReportController';
import PressMorningView from './PressMorningView';
import PlatingMorningView from './PlatingMorningView';
import ShipPlanView from './ShipPlanView';
import YieldByModelView from './YieldByModelView';
import LrrByCustomerView from './LrrByCustomerView';
import ScrapReportView from './ScrapReportView';

/** 보고서 id → 그 보고서를 만드는 컴포넌트 (컨트롤러 + 뷰) */
const REPORTS = {
  'prod-daily': () => <DailyReportView {...useDailyReportController()} />,
  'rpt-press-morning': () => <PressMorningView {...usePressMorningController()} />,
  'rpt-plating-morning': () => <PlatingMorningView {...usePlatingMorningController()} />,
  'rpt-ship-plan': () => <ShipPlanView {...useShipPlanController()} />,
  'rpt-yield-model': () => <YieldByModelView {...useYieldByModelController()} />,
  'rpt-lrr-customer': () => <LrrByCustomerView {...useLrrByCustomerController()} />,
  'rpt-scrap': () => <ScrapReportView {...useScrapReportController()} />,
};

export default function ReportPicker() {
  const s = useCommonStyles();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const can = useAuthStore((state) => state.can);
  const empNo = useAuthStore((state) => state.userInfo?.empNo);
  const params = useGlobalSearchParams();
  const { goToPath } = useAppNavigation();

  const usageItems = useReportUsageStore((state) => state.items);
  const usageAvailable = useReportUsageStore((state) => state.available);
  const loadUsage = useReportUsageStore((state) => state.load);
  const record = useReportUsageStore((state) => state.record);

  // 계정별 사용 기록(DB) — 계정이 바뀌면 다시 읽습니다
  useEffect(() => {
    loadUsage(empNo);
  }, [empNo, loadUsage]);

  const items = useMemo(() => reportItems().filter((it) => can(it.id) && REPORTS[it.id]), [can]);
  const byId = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it])), [items]);
  const selectedId = typeof params?.report === 'string' && byId[params.report] ? params.report : '';
  const selected = byId[selectedId] || null;
  const Report = selected ? REPORTS[selected.id] : null;

  // 자주 쓰는 보고서 — 서버가 횟수 순으로 준 목록 중 이 화면에서 만들 수 있는 것만, 최대 USAGE_TOP
  const quick = useMemo(() => {
    const rows = usageItems.filter((u) => byId[u.screenId]).slice(0, USAGE_TOP);
    const lastId = [...rows].sort((a, b) => String(b.lastUsedAt || '').localeCompare(String(a.lastUsedAt || '')))[0]?.screenId || null;
    return { rows, lastId };
  }, [usageItems, byId]);

  const choose = (id) => {
    if (id) record(id);
    goToPath('/menu/report', id ? { report: id } : undefined);
  };

  const wide = width >= 1000;

  return (
    <View>
      {/* 1. 머리말 */}
      <View style={[s.pageHead, { marginBottom: 16 }]}>
        <View style={{ flexShrink: 1, minWidth: 260 }}>
          <Text style={s.pageTitle}>보고서</Text>
          <Text style={s.pageDesc}>만들 보고서를 고르면 이 자리에서 바로 만들어 조회·인쇄·다운로드할 수 있습니다. 자주 쓰는 보고서는 아래 버튼으로 바로 열립니다.</Text>
        </View>
      </View>

      {/* 2. 선택 패널 */}
      {/* 드롭다운 목록이 카드 밖까지 내려오므로 카드는 자르지 않고, 선택 줄은 아래 줄보다 위에 쌓습니다 */}
      <View style={[s.card, { marginBottom: 18, overflow: 'visible', zIndex: 20 }]}>
        <View style={{ padding: 18, flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'flex-end' : 'stretch', gap: 14, zIndex: 10 }}>
          <SelectField
            label="보고서 선택"
            value={selectedId}
            options={items.map((it) => ({ value: it.id, label: it.name }))}
            onChange={choose}
            placeholder="만들 보고서를 선택하십시오"
            style={{ minWidth: 340, flexGrow: wide ? 0 : 1 }}
          />
          {/* 설명 문구 없음 — 드롭다운과 해제 단추만. 가운데는 비워 둡니다 */}
          <View style={{ flex: 1 }} />
          {selected ? (
            <Pressable
              onPress={() => choose('')}
              accessibilityRole="button"
              accessibilityLabel="선택 해제"
              style={({ hovered }) => ({ height: 36, paddingHorizontal: 12, borderRadius: theme.metrics.radiusSm, borderWidth: 1, borderColor: theme.hairlineStrong, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: hovered ? theme.surface : theme.color.card })}
            >
              <Icon name="close" size={13} color={theme.color.secondaryForeground} />
              <Text style={s.textSm}>다른 보고서</Text>
            </Pressable>
          ) : null}
        </View>

        {/* 자주 쓰는 보고서 — 계정별 만든 횟수 순, 최대 USAGE_TOP 개 (DB) */}
        {/* 카드가 overflow visible 이라 아래 모서리를 카드 라운드(보더 1px 안쪽)에 맞춰 직접 깎습니다 */}
        <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.divider, backgroundColor: theme.surface, borderBottomLeftRadius: theme.metrics.radius - 1, borderBottomRightRadius: theme.metrics.radius - 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[s.label, { marginRight: 4 }]}>자주 쓰는 보고서</Text>
          {quick.rows.length ? (
            quick.rows.map((u) => {
              const id = u.screenId;
              const it = byId[id];
              const on = id === selectedId;
              const last = id === quick.lastId;
              return (
                <Pressable
                  key={id}
                  onPress={() => choose(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.name} 만들기`}
                  style={({ hovered }) => ({
                    height: 32,
                    paddingLeft: 12,
                    paddingRight: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? theme.color.primary : 'rgba(0,0,0,0.07)',
                    backgroundColor: on ? theme.color.primary : hovered ? theme.surfaceHover : theme.color.card,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                  })}
                >
                  {last ? <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: on ? theme.color.primaryForeground : theme.color.warning }} /> : null}
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: on ? '600' : '500', color: on ? theme.color.primaryForeground : theme.color.secondaryForeground }}>{it.name}</Text>
                  <View style={{ minWidth: 20, height: 18, paddingHorizontal: 6, borderRadius: 99, backgroundColor: on ? 'rgba(255,255,255,0.18)' : theme.surfaceHover, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: NUM_FAMILY, fontSize: 14.5, fontWeight: '600', color: on ? theme.color.primaryForeground : theme.color.mutedForeground }}>{u.useCount}</Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text style={s.caption}>
              {usageAvailable ? '아직 만든 보고서가 없습니다. 보고서를 고르면 만든 횟수 순으로 여기에 버튼이 생깁니다.' : '사용 기록을 불러오지 못했습니다. 위 목록에서 보고서를 고르십시오.'}
            </Text>
          )}
        </View>
      </View>

      {/* 3. 만든 보고서 — 고르지 않았으면 안내 한 줄 */}
      {Report ? (
        // key 로 보고서가 바뀔 때 컨트롤러 상태를 새로 시작합니다
        <Report key={selected.id} />
      ) : (
        <View style={[s.card, { paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center', gap: 8 }]}>
          <Icon name="file" size={22} color={theme.color.mutedForeground} />
          <Text style={s.heading2xs}>보고서를 선택하십시오</Text>
          <Text style={[s.bodySm, { textAlign: 'center' }]}>
            {items.length ? '위 목록에서 고르면 이 자리에 보고서가 만들어집니다.' : '접근 가능한 보고서가 없습니다.'}
          </Text>
        </View>
      )}
    </View>
  );
}
