/**
 * [Component] 설비 매트릭스 — 공정 × 설비, 불량률로 칠하기
 *
 * 설비가 1,300대를 넘어 목록으로는 볼 수 없습니다. 쪽을 넘겨 가며 읽을 표가 아니라
 * **"어느 공정의 어느 설비가 나쁜가" 를 한눈에 봐야 하는 자료**입니다.
 *
 * ■ 가동률이 아니라 불량률입니다
 * 가동률 수집값이 이 시스템에 없습니다(`uptimeRate` 가 전 설비 null).
 * 없는 값으로 색을 칠할 수는 없어 불량률로 칠하고, 그 사실을 각주에 적습니다.
 *
 * ■ 생산이 없는 설비는 뺍니다
 * 불량률 0% 로 칠하면 잘 돌아간 설비처럼 보입니다. 안 돌린 것과 잘 돌린 것은 다릅니다.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

/** 불량률 구간 — 아침회의 자료와 같은 기준선(3%)을 씁니다 */
const STEPS = [
  { max: 0.5, alpha: 0.10 },
  { max: 1.5, alpha: 0.24 },
  { max: 3, alpha: 0.42 },
  { max: 6, alpha: 0.62 },
  { max: Infinity, alpha: 0.85 },
];

export default function EquipmentMatrix({ data, loading }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const [hover, setHover] = useState(null);

  const groups = data?.groups || [];
  const alphaOf = (rate) => STEPS.find((x) => (rate || 0) <= x.max).alpha;

  if (loading && !groups.length) return <Text style={s.textXs}>설비 현황을 불러오는 중입니다.</Text>;
  if (!groups.length) return <Text style={s.textXs}>이 기간에 생산한 설비가 없습니다.</Text>;

  return (
    <View style={{ gap: 10 }}>
      <View style={[s.rowGap6, { flexWrap: 'wrap' }]}>
        <Text style={s.textXs}>{`생산한 설비 ${comma(data.total)}대 · 공정 ${comma(groups.length)}곳 — 불량률이 높은 공정 순입니다.`}</Text>
        <View style={[s.rowGap6, { marginLeft: 'auto', flexWrap: 'wrap' }]}>
          <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>낮음</Text>
          {STEPS.map((x) => (
            <View
              key={x.max}
              style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: theme.alpha('destructive', x.alpha) }}
            />
          ))}
          <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>높음</Text>
        </View>
      </View>

      {groups.map((g) => (
        <View key={g.processId} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ width: 168 }}>
            <Text style={[s.textXs, { fontWeight: '700' }]} numberOfLines={2}>{g.processNm}</Text>
            <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
              {`${comma(g.items.length)}대 · ${fixed(g.defectRate, 2)}%`}
            </Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
            {g.items.map((e) => (
              <View
                key={e.eqptCd}
                // 웹에서만 도는 화면이라 마우스 이벤트를 그대로 씁니다
                onMouseEnter={() => setHover({ ...e, processNm: g.processNm })}
                onMouseLeave={() => setHover(null)}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: theme.alpha('destructive', alphaOf(e.defectRate)),
                  borderWidth: hover?.eqptCd === e.eqptCd ? 1.5 : 0,
                  borderColor: theme.color.foreground,
                }}
              />
            ))}
          </View>
        </View>
      ))}

      {/* 칸이 작아 이름을 못 적으므로 짚은 것만 아래에 풀어 보여 줍니다 */}
      <View
        style={{
          minHeight: 40,
          padding: 9,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: theme.color.border,
          backgroundColor: theme.alpha('muted', 0.35),
          justifyContent: 'center',
        }}
      >
        {hover ? (
          <View style={[s.rowGap6, { flexWrap: 'wrap' }]}>
            <Text style={[s.textXs, { fontWeight: '700' }]}>{hover.eqptNm || hover.eqptCd}</Text>
            <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{`${hover.eqptCd} · ${hover.processNm}`}</Text>
            <Text style={[s.textXs, { marginLeft: 'auto' }]}>{`생산 ${comma(hover.qty)} EA · 불량 ${comma(hover.ngQty)} EA`}</Text>
            <Text style={[s.textXs, { fontWeight: '700' }]}>{`불량률 ${fixed(hover.defectRate, 2)}%`}</Text>
          </View>
        ) : (
          <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>칸에 마우스를 올리면 설비 이름과 수량이 나옵니다.</Text>
        )}
      </View>
    </View>
  );
}
