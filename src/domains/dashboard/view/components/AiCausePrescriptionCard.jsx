/**
 * [Component] AI 공정 원인 분석 및 처방 권고 (XAI & Prescription)
 *
 * 공정·설비를 고르면 **왜 나빠졌는지**(기여도)와 **무엇을 할지**(처방)를 보여 줍니다.
 *
 * ■ 근거가 붙은 것만 그립니다
 * 서버 계약 — `contributions[{factor,weight,direction,evidence[]}]` ·
 * `prescriptions[{action,expect,basis[],confidence}]`.
 *
 * 2026-09-05 이전에는 여기에 **없는 설비 PR-01~PR-10** 과 수집조차 하지 않는 값
 * (타발 압력 편차 ±14% · 금형 온도 48.5℃)이 그려졌습니다. 설비 마스터 1,511대 중
 * `PR-` 로 시작하는 코드는 한 대도 없습니다. 지어낸 처방은 없는 것만 못합니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, EmptyState, SelectField } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { fixed } from '@shared/utils/formatUtil';
import { NotReady, formatEvidence } from './AiBriefingCard';

const RISK = { NORMAL: { tone: 'green', label: '정상' }, WARN: { tone: 'amber', label: '주의' }, CRIT: { tone: 'red', label: '위험' }, CRITICAL: { tone: 'red', label: '위험' } };

export default function AiCausePrescriptionCard({ causePrescription, loading, eqptOptions = [], selectedEqptCd, onSelectEqpt }) {
  const s = useCommonStyles();
  const theme = useTheme();

  const cp = causePrescription;
  /**
   * **서버가 검증한 것만** 씁니다
   *
   * 근거가 붙어 있는지만 보면 부족합니다 — 모델은 그럴듯한 근거를 지어냅니다.
   * 서버가 값을 다시 계산해 대조하고(`qty`·`defect_rate`·`yield`·`defect`·`anomaly`)
   * FACA 문서는 청크 실재와 인용문 포함으로 확인한 뒤 `verified` 를 붙여 줍니다.
   */
  const contributions = (cp?.contributions || []).filter((c) => c?.factor && c.verified !== false && (c.evidence || []).length);
  const prescriptions = (cp?.prescriptions || []).filter((p) => p?.action && p.verified !== false && (p.basis || []).length);
  const dropped = cp?.droppedCnt || 0;
  const ready = !!cp?.modelVer && (contributions.length || prescriptions.length);
  const risk = RISK[cp?.target?.riskLevel] || null;

  return (
    <Card
      title="AI 공정 원인 분석 및 처방 권고"
      sub="XAI & Prescription · 파인튜닝 sLLM"
      right={ready && risk ? <Badge tone={risk.tone}>{risk.label}</Badge> : null}
    >
      {/* 분석 결과가 있을 때만 대상 선택기를 냅니다 — 없는 설비를 고르게 두면 안 됩니다 */}
      {ready && eqptOptions.length ? (
        <SelectField
          label="대상 설비"
          value={selectedEqptCd}
          options={eqptOptions}
          onChange={onSelectEqpt}
          style={{ minWidth: 260, marginBottom: 12 }}
        />
      ) : null}

      {loading && !cp ? (
        <EmptyState text="분석 결과를 불러오는 중입니다." />
      ) : !ready ? (
        <NotReady reason={cp?.reason} />
      ) : (
        <View style={{ gap: 16 }}>
          {contributions.length ? (
            <View style={{ gap: 8 }}>
              <Text style={[s.textSm, { fontWeight: '700' }]}>원인 기여도</Text>
              {contributions.map((c, i) => (
                <Contribution key={i} item={c} />
              ))}
            </View>
          ) : null}

          {prescriptions.length ? (
            <View style={{ gap: 10 }}>
              <Text style={[s.textSm, { fontWeight: '700' }]}>처방 권고</Text>
              {prescriptions.map((p, i) => (
                <View
                  key={i}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: theme.color.primary,
                    paddingLeft: 10,
                    gap: 3,
                  }}
                >
                  <View style={[s.rowGap6, { flexWrap: 'wrap' }]}>
                    <Text style={[s.textSm, { fontWeight: '600', flex: 1, minWidth: 200 }]}>{p.action}</Text>
                    {p.confidence != null ? <Badge>{`확신도 ${fixed(p.confidence * 100, 0)}%`}</Badge> : null}
                  </View>
                  {p.expect ? <Text style={s.textXs}>{`기대 효과 — ${p.expect}`}</Text> : null}
                  <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
                    {`근거 — ${p.basis.map((b) => [b.label || b, formatEvidence(b.value, b.unit)].filter(Boolean).join(' ')).join(' · ')}`}
                  </Text>
                  {/* 문서 근거는 인용문이 근거의 실체라 그대로 보여 줍니다 */}
                  {p.basis.filter((b) => b.quote).map((b, j) => (
                    <Text key={j} style={[s.textXs, { color: theme.color.mutedForeground, fontStyle: 'italic' }]}>
                      {`"${b.quote}"`}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          <Text style={[s.sourceText, { marginTop: 2 }]}>
            {`${cp.modelVer}${cp.analyzedAt ? ` · ${cp.analyzedAt}` : ''} · 근거가 확인된 항목만 표시합니다`
              + (dropped ? ` · 근거가 확인되지 않아 뺀 항목 ${dropped}건` : '')}
          </Text>
        </View>
      )}
    </Card>
  );
}

/** 기여도 한 줄 — 요인 · 막대 · 근거 */
function Contribution({ item }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const pctVal = Math.max(0, Math.min(1, Number(item.weight) || 0)) * 100;
  const color = item.direction === 'down' ? theme.color.success : theme.color.destructive;

  return (
    <View style={{ gap: 3 }}>
      <View style={[s.rowGap6, { justifyContent: 'space-between' }]}>
        <Text style={[s.textXs, { flex: 1 }]}>{item.factor}</Text>
        <Text style={[s.textXs, { fontWeight: '700' }]}>{`${fixed(pctVal, 0)}%`}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.alpha('muted', 0.7), overflow: 'hidden' }}>
        <View style={{ width: `${pctVal}%`, height: '100%', backgroundColor: color }} />
      </View>
      {/* label · value 모두 서버가 마스터·DB 값으로 덮어써 준 것입니다 (모델이 쓴 값이 아닙니다) */}
      <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
        {item.evidence.map((e) => [e.label, formatEvidence(e.value, e.unit)].filter(Boolean).join(' ')).join(' · ')}
      </Text>
    </View>
  );
}
