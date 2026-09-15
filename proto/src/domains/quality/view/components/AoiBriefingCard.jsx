/**
 * [View] 「AI 브리핑」 카드 — AOI 판정 분석 화면 1층
 *
 * 기획: docs/requests/REQ_20260913_aoi_ai_briefing.md
 *
 * ■ 숫자는 규칙이 만들고, 문장만 AI 가 만듭니다
 * 어느 치수가 불량을 만들었는지(귀속)는 서버가 결정론적 규칙으로 계산합니다.
 * sLLM 은 그 결과를 문장으로 옮기고 조치를 제안하는 표현 계층만 맡습니다.
 * 그래서 이 카드에서 **수치 환각은 구조적으로 불가능**합니다 —
 * 근거 칩에 박히는 값은 전부 계산된 것이고, 문장은 그 값을 읽은 결과입니다.
 *
 * ■ 「추정」 은 조치 제안에만 붙입니다
 * 사실 요약은 계산된 값이라 표기가 필요 없습니다. 조치 제안만 해석이 섞이므로
 * 그 문단에만 배지를 답니다. 이 화면이 지켜 온 「근거 없는 값은 산출 불가」 원칙과
 * 충돌하지 않는 유일한 선입니다.
 *
 * ■ 설명률을 숨기지 않습니다
 * 확정된 한계가 전체 FAI 의 일부뿐이라 설비마다 설명률이 60~98% 로 벌어집니다.
 * 낮다고 원인 지목을 빼지는 않되(현업 결정 11), **얼마나 설명된 것인지 늘 함께 보입니다.**
 * 숨기면 과신을 부릅니다.
 *
 * ■ 두 단계로 나옵니다 — 규칙 문장은 바로, AI 문장은 눌러서
 * 서버 실측으로 **브리핑 생성이 95초(모델만 80초)** 걸립니다. 조회할 때마다 자동으로 부르면
 * 화면이 1분 반을 멈춰 있습니다. 그래서 이렇게 나눕니다.
 *  · `ruleLines` — 서버가 **규칙으로** 만든 사실 문장. 집계만 끝나면 바로 나오고 모델이 없어도 옵니다
 *  · `aiLines` · `actions` — sLLM 이 쓴 것. **버튼을 눌렀을 때만** 만듭니다
 * 규칙 문장만으로도 「불량 38,665건 중 FAI1 이 43.6%」 같은 핵심은 다 읽힙니다.
 * AI 문장은 그 위에 얹는 해석이라, 필요할 때만 기다리는 것이 맞습니다.
 *
 * ■ AI 문장은 서버가 한 번 걸러서 옵니다
 * sLLM 이 인용한 사실을 서버가 자기 `facts` 와 대조해, 키가 없거나 값이 다르면 버립니다.
 * 몇 개가 버려졌는지(`droppedCnt`)도 함께 오므로 화면에 드러냅니다 — 모델이 헛말을 하고 있다는
 * 신호라서 감추면 안 됩니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, Card, Chip, ChipRow, Loading } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma, fixed } from '@shared/utils/formatUtil';

/** 설명률이 이 아래면 색으로 주의를 줍니다 — 값을 감추지는 않습니다 */
const LOW_COVERAGE = 80;

export default function AoiBriefingCard({
  /** 집계 중 */
  loading,
  /** 못 만들었을 때의 사유 (서버 문구를 그대로 씁니다) */
  error,
  /** 조회 기간 — `{ from, to }` */
  period,
  /** 서버가 규칙으로 만든 사실 문장 — 집계만 되면 바로 옵니다 */
  ruleLines = [],
  /** sLLM 이 쓴 문장 — 버튼을 눌러야 옵니다 */
  aiLines = [],
  /** sLLM 이 쓴 조치 제안 — 「추정」 배지가 붙습니다 */
  actions = [],
  /** 서버가 사실 대조로 버린 AI 문장 수 */
  droppedCnt = 0,
  /** AI 문장 생성 상태 — `idle` · `generating` · `done` · 서버 사유(MODEL_NOT_READY 등) */
  aiState = 'idle',
  /** 규칙이 계산한 근거 — `[{ label, value }]` 형태로 칩에 그대로 박힙니다 */
  evidence = [],
  /** 귀속된 불량의 비율(%) */
  coverage,
  /** 집계 기준 시각 */
  updatedAt,
  /** 보관값을 보여 주는 중인지 */
  fromCache,
  /** AI 문장 만들기 */
  onGenerate,
}) {
  const s = useCommonStyles();
  const theme = useTheme();

  const rangeText = period?.from && period?.to
    ? (period.from === period.to ? period.from : `${period.from} ~ ${period.to}`)
    : '';
  const lowCoverage = Number.isFinite(Number(coverage)) && Number(coverage) < LOW_COVERAGE;

  return (
    <Card
      title="AI 브리핑"
      sub={rangeText}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {updatedAt ? (
            <Text style={s.caption}>{`${updatedAt} 기준${fromCache ? ' · 보관값' : ''}`}</Text>
          ) : null}
        </View>
      }
    >
      {loading ? (
        // 원천을 직접 읽어 수십 초가 걸립니다 — 무엇을 기다리는지 밝혀 둡니다
        <Loading compact text="판정 기록을 집계하는 중입니다…" />
      ) : error ? (
        <Text style={s.emptyText}>{error}</Text>
      ) : !ruleLines.length ? (
        <Text style={s.emptyText}>이 기간에는 브리핑할 판정 기록이 없습니다.</Text>
      ) : (
        <View style={{ gap: 14 }}>
          {/* 1. 규칙이 만든 사실 — 계산된 값을 읽은 문장이라 별도 표기가 없습니다 */}
          {ruleLines.map((line, i) => (
            <Text key={`r-${i}`} style={s.body}>{line}</Text>
          ))}

          {/* 2. AI 문장 — 눌러야 만듭니다(95초). 규칙 문장만으로도 핵심은 읽힙니다 */}
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.divider, gap: 10 }}>
            {aiState === 'generating' ? (
              <Loading compact text="AI 가 문장을 쓰는 중입니다 — 1분 30초쯤 걸립니다…" />
            ) : aiLines.length || actions.length ? (
              <>
                {aiLines.map((line, i) => (
                  <Text key={`a-${i}`} style={s.body}>{line}</Text>
                ))}
                {actions.length ? (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Badge tone="amber">추정</Badge>
                      <Text style={s.heading2xs}>조치 제안</Text>
                    </View>
                    {actions.map((line, i) => (
                      <Text key={`ac-${i}`} style={s.body}>{line}</Text>
                    ))}
                  </View>
                ) : null}
                {/* 버려진 문장 수는 감추지 않습니다 — 모델이 헛말을 하고 있다는 신호입니다 */}
                {droppedCnt > 0 ? (
                  <Text style={[s.caption, { color: theme.color.warningText }]}>
                    {`AI 문장 ${droppedCnt}개는 서버가 사실과 대조해 버렸습니다.`}
                  </Text>
                ) : null}
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Button label="AI 해석 만들기" size="sm" icon="sparkles" onPress={onGenerate} disabled={!onGenerate} />
                <Text style={s.caption}>
                  {aiState === 'MODEL_NOT_READY' ? '모델이 준비되지 않았습니다 — 위 사실 요약은 그대로 쓰실 수 있습니다.'
                    : aiState === 'MODEL_BUSY' ? '모델이 다른 요청을 처리 중입니다 — 잠시 후 다시 눌러 주십시오.'
                    : '원인 해석과 조치 제안을 문장으로 만듭니다. 1분 30초쯤 걸립니다.'}
                </Text>
              </View>
            )}
          </View>

          {/* 3. 근거 — 규칙이 계산한 값. 문장이 이 값을 읽은 것입니다 */}
          {evidence.length ? (
            <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.divider }}>
              <Text style={[s.caption, { marginBottom: 8 }]}>근거</Text>
              <ChipRow>
                {evidence.map((e) => (
                  <Chip key={e.label} label={`${e.label} ${e.value}`} />
                ))}
              </ChipRow>
            </View>
          ) : null}

          {/* 4. 설명률 — 낮아도 감추지 않습니다 */}
          {Number.isFinite(Number(coverage)) ? (
            <Text style={[s.caption, lowCoverage && { color: theme.color.warningText }]}>
              {`불량의 ${fixed(coverage)}% 를 원인 항목으로 설명했습니다.`}
              {lowCoverage ? ' 나머지는 한계가 확정되지 않은 항목의 이탈이라 원인을 짚지 못했습니다.' : ''}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

/**
 * 집계 결과를 근거 칩으로 옮깁니다.
 *
 * 칩에 들어가는 값은 **서버가 계산한 것 그대로**입니다 — 화면에서 다시 셈하지 않습니다.
 * 화면과 문장이 같은 수를 말해야 브리핑을 믿을 수 있습니다.
 *
 * @param {object} stats 집계 조회 응답
 * @returns {{label: string, value: string}[]}
 */
export function evidenceOf(total) {
  if (!total) return [];
  const out = [];
  if (Number.isFinite(Number(total.failCnt))) out.push({ label: '불량', value: `${comma(total.failCnt)}건` });

  // fais[] 는 서버가 `violSingleCnt` 내림차순으로 줍니다 — 상위 몇 개만 칩으로 답니다
  (total.fais || []).slice(0, 4).forEach((v) => {
    // 상한·하한 둘 다 있을 수 있습니다. S110 은 하한 미달이 62% 라 하한을 빼면 절반을 놓칩니다
    const parts = [];
    if (v.usl !== null && v.usl !== undefined) parts.push(`상한 ${v.usl}`);
    if (v.lsl !== null && v.lsl !== undefined) parts.push(`하한 ${v.lsl}`);
    out.push({
      label: `FAI${v.fai}`,
      value: `${comma(v.violCnt)}건 · ${parts.join(' · ') || '한계 없음'}${
        Number.isFinite(Number(v.sharePct)) ? ` · ${fixed(v.sharePct)}%` : ''}`,
    });
  });

  // 귀속되지 못한 몫도 드러냅니다 — 없으면 설명률이 100% 인 줄 오해합니다
  const at = total.attribution || {};
  if (Number(at.unconfirmed) > 0) out.push({ label: '미확정 항목 이탈', value: `${comma(at.unconfirmed)}건` });
  if (Number(at.zero) > 0) out.push({ label: '측정 실패', value: `${comma(at.zero)}건` });
  return out;
}
