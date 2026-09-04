/**
 * [Component] AI 일일 품질·생산 종합 브리핑
 *
 * 파인튜닝한 sLLM 이 당일 지표를 읽고 "오늘 무엇을 봐야 하는지" 를 몇 문장으로 씁니다.
 *
 * ■ 문장마다 근거를 함께 그립니다
 * 서버 계약이 `lines[{ text, evidence[{kind,label,value,ref}] }]` 입니다.
 * **근거가 없는 문장은 그리지 않습니다.** 2026-09-05 이전에는 여기에
 * 없는 설비(PR-03)·수집하지 않는 값(타발 압력 ±14% · 금형 온도 48.5℃)·
 * 상수 계획 수량(150,000 → 달성률 14,642%)이 그려지고 있었습니다.
 * 판단을 돕는 화면에서 근거 없는 문장은 없는 것만 못합니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, EmptyState, Icon } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

/**
 * 근거 종류 → 아이콘
 *
 * 서버 검증기가 대조할 수 있는 종류만 옵니다(2026-09-05 합의) —
 * `qty` · `defect_rate` · `yield` · `defect` · `anomaly` 는 서버가 값을 **다시 계산해 대조**하고,
 * `doc` 은 FACA 문서 청크가 실재하고 인용문이 그 안에 있는지로 확인합니다.
 * 모델이 쓴 `ref` 는 화면 링크로만 쓰고 검증 근거로 삼지 않습니다 — 그것도 모델이 지어낼 수 있습니다.
 */
const KIND_ICON = { doc: 'file', qty: 'chart', defect_rate: 'chart', yield: 'chart', defect: 'alert', anomaly: 'activity' };

/** 상태 → 배지 색 */
const TONE = { NORMAL: 'green', WARN: 'amber', CRIT: 'red', CRITICAL: 'red' };
const LABEL = { NORMAL: '정상', WARN: '주의', CRIT: '위험', CRITICAL: '위험' };

export default function AiBriefingCard({ briefing, loading }) {
  const s = useCommonStyles();
  const theme = useTheme();

  /**
   * **서버가 검증한 문장만** 그립니다
   *
   * 근거가 붙어 있는지만 보면 부족합니다 — 모델은 그럴듯한 근거를 지어냅니다.
   * 서버가 값을 다시 계산해 대조하고 `verified` 를 붙여 주므로 그것만 신뢰합니다.
   */
  const lines = (briefing?.lines || []).filter((l) => l?.text && l.verified !== false && (l.evidence || []).length);
  const dropped = briefing?.droppedCnt || 0;
  const ready = !!briefing?.modelVer && lines.length > 0;

  return (
    <Card
      title="AI 일일 품질·생산 종합 브리핑"
      sub={ready ? `${briefing.modelVer} · ${briefing.generatedAt || ''}` : '파인튜닝 sLLM'}
      right={ready && briefing.status ? <Badge tone={TONE[briefing.status] || ''}>{LABEL[briefing.status] || briefing.status}</Badge> : null}
    >
      {loading && !briefing ? (
        <EmptyState text="브리핑을 불러오는 중입니다." />
      ) : !ready ? (
        <NotReady reason={briefing?.reason} />
      ) : (
        <View style={{ gap: 12 }}>
          {lines.map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: theme.color.primary }} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[s.textSm, { lineHeight: 21 }]}>{line.text}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {line.evidence.map((e, j) => (
                    <Evidence key={j} item={e} />
                  ))}
                </View>
              </View>
            </View>
          ))}
          {dropped ? (
            <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
              {`모델이 낸 문장 중 ${dropped}건은 근거가 확인되지 않아 뺐습니다.`}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

/**
 * 근거 한 조각 — 지표 값 · 문서 · LOT
 *
 * 사람이 "그 숫자 어디서 났나" 를 바로 확인할 수 있어야 합니다.
 */
function Evidence({ item }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const icon = KIND_ICON[item.kind] || 'chart';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
        paddingHorizontal: 7,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.color.border,
        backgroundColor: theme.alpha('muted', 0.45),
      }}
    >
      <Icon name={icon} size={11} color={theme.color.mutedForeground} />
      <Text style={s.textXs}>{item.label}</Text>
      {item.value ? <Text style={[s.textXs, { fontWeight: '700' }]}>{item.value}</Text> : null}
    </View>
  );
}

/** 모델이 아직 붙지 않았을 때 — 지어낸 값 대신 상태를 밝힙니다 */
export function NotReady({ reason }) {
  const s = useCommonStyles();
  return (
    <View style={{ gap: 6, paddingVertical: 10 }}>
      <Text style={[s.textSm, { fontWeight: '600' }]}>모델 준비 중입니다.</Text>
      <Text style={s.textXs}>
        {reason === 'MODEL_NOT_READY'
          ? '파인튜닝한 sLLM 이 아직 연결되지 않았습니다. 붙는 대로 이 자리에 근거와 함께 표시됩니다.'
          : '아직 근거를 갖춘 분석 결과가 없습니다. 근거 없는 문장은 표시하지 않습니다.'}
      </Text>
    </View>
  );
}
