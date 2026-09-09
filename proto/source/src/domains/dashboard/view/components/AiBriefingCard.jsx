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
import { Card, EmptyState, Icon } from '@shared/components/ui';
import { EvidenceButton, collectDocs, openEvidenceModal } from './AiEvidenceModal';
import { downloadBriefingReport } from '../../model/aiReportExport';
import { Button } from '@shared/components/ui';
import { useCommonStyles } from '@shared/theme/styles';
import { comma, fixed, shiftDate } from '@shared/utils/formatUtil';
import { useTheme } from '@shared/theme/useTheme';

/**
 * 근거 한 조각의 계약 — `{ kind, key, label, value, ref }` (+ `kind:'doc'` 이면 `quote`)
 *
 * 서버 검증기가 **대조할 수 있는 종류만** 옵니다(2026-09-05 합의).
 *   `qty` · `defect_rate` · `yield`(별칭 `metric`) · `defect` · `anomaly`
 *        → 서버가 DB 에서 값을 다시 구해 모델이 말한 `value` 와 비교합니다.
 *   `doc` → 청크 실재 · is_current · 열람 권한 · 보존기한 · `chunk_text` 에 `quote` 포함까지 봅니다.
 *
 * **`key` 가 대조 대상을 가리킵니다** — yield/metric 은 공정코드, defect 는 불량코드,
 * anomaly 는 설비코드, doc 은 청크 id. 없으면 서버가 NOT_FOUND 로 그 문장을 버립니다.
 *
 * 모델이 쓴 `ref` 는 화면 링크로만 씁니다. 검증 근거로 삼지 않습니다 — 그것도 지어낼 수 있습니다.
 *
 * **`label` 과 `value` 는 서버가 덮어써 내려 줍니다**(2026-09-05). 모델이 쓴 값이 아니라
 * 서버가 마스터·DB 에서 구한 값입니다 — 허용 오차 안에서 통과시키면 모델이 쓴 98.4 가 그대로 나가
 * 실제 98.36 과 달라지기 때문입니다. **검증한 값과 보여 준 값이 같아야 합니다.**
 *
 * 그래서 `value` 는 숫자(98.36)로 오고 단위는 `unit`('%' · 'EA')으로 따로 옵니다 —
 * 표기는 화면이 만듭니다. 이제 모델이 화면에 직접 기여하는 것은 `text` 문장 하나뿐입니다.
 */
const KIND_ICON = { doc: 'file', qty: 'chart', defect_rate: 'chart', yield: 'chart', metric: 'chart', defect: 'alert', anomaly: 'activity' };

export default function AiBriefingCard({ briefing, loading, period }) {
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
      right={
        ready ? (
          <>
            <EvidenceButton
              count={lines.length}
              onPress={() => openEvidenceModal({
                title: 'AI 일일 품질·생산 종합 브리핑',
                sections: [{ heading: '브리핑 문장과 근거', lines }],
                droppedCnt: dropped,
                analyzedAt: briefing.generatedAt,
              })}
            />
            <Button
              label="엑셀 다운로드"
              size="sm"
              icon="download"
              onPress={() => downloadBriefingReport({
                lines,
                docs: collectDocs([{ lines }]),
                droppedCnt: dropped,
                analyzedAt: briefing.generatedAt,
                targetDate: briefing.targetDate || briefing.date,
              })}
            />
          </>
        ) : null
      }
    >
      {loading ? (
        /*
          다시 분석하는 동안에는 **앞선 결과를 지웁니다**.
          예전에는 `loading && !briefing` 이라 새 구간을 부르는 90초 동안 앞 구간의
          브리핑이 그대로 남았습니다. 위 필터는 7월~9월인데 카드는 "8월 29일 ~ 9월 4일 분석"
          이라 적혀 있어, 집계 단위를 바꿔도 안 바뀌는 것처럼 보였습니다.
          모델 추론이라 수십 초 걸리므로 무엇을 보고 있는지 함께 적습니다.
        */
        <EmptyState text={`${rangeText(period)}을 분석하고 있습니다. 수십 초 걸릴 수 있습니다.`} />
      ) : !ready ? (
        <NotReady reason={briefing?.reason} />
      ) : (
        <View style={{ gap: 10 }}>
          {/*
            어느 구간을 본 것인지 밝힙니다 — 서버가 준 구간을 그대로 적습니다.
            2026-09-05 이전에는 집계 단위를 월로 바꿔도 종료일 하루만 분석됐습니다.
            지금은 구간 전체를 봅니다(일별 7일 · 주별 4주 · 월별 3개월).
            적어 두지 않으면 며칠치를 보고 있는지 화면만으로는 알 수 없습니다.
          */}
          <Text style={s.textXs}>{periodText(briefing)}</Text>
          <VerifiedLines lines={lines} dropped={dropped} />
        </View>
      )}
    </Card>
  );
}

/**
 * 검증을 통과한 문장 목록 — 브리핑 · 원인 · 처방이 같은 모양입니다
 *
 * 서버가 세 절 모두 `{ text, evidence[], verified }` 로 통일해 내려 줍니다.
 * 원인에 가중치, 처방에 확신도 같은 값을 따로 두지 않습니다 —
 * 모델이 지어낼 수 있는 숫자를 늘리지 않는 편이 낫습니다.
 */
export function VerifiedLines({ lines = [], dropped = 0, emptyText }) {
  const s = useCommonStyles();
  const theme = useTheme();

  if (!lines.length) return emptyText ? <Text style={s.textXs}>{emptyText}</Text> : null;


  return (
    <View style={{ gap: 14 }}>
      {lines.map((line, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {/* 번호를 달아 몇 가지 이야기인지 한눈에 보이게 합니다 */}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              marginTop: 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.alpha('primary', 0.12),
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.color.primary }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={[s.textSm, { lineHeight: 23, fontSize: 14 }]}>{line.text}</Text>
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {(line.evidence || []).map((e, j) => (
                  <Evidence key={j} item={e} />
                ))}
              </View>
              {/*
                문서 근거는 인용문을 그대로 보여 줍니다 — 그 문장이 근거의 실체입니다.
                같은 대책이 여러 청크에 걸쳐 있으면 표기만 다른 같은 문장이 여러 번 옵니다
                (공백·오탈자 차이). 사람이 읽기에는 한 번이면 충분해 눌러 줍니다.
              */}
              {dedupeQuotes(line.evidence).map((q, j) => (
                <Text key={`q${j}`} style={[s.textXs, { color: theme.color.mutedForeground, fontStyle: 'italic' }]}>
                  {/* 카드에서는 줄여 보여 줍니다 — 표가 통째로 들어 있는 청크도 있습니다. 전문은 「판단 근거」에서 봅니다 */}
                  {`"${q.length > 140 ? `${q.slice(0, 140)}…` : q}"`}
                </Text>
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
  );
}

/**
 * 인용문 중복 제거
 *
 * 같은 대책이 여러 청크에 걸쳐 있으면 공백·오탈자만 다른 같은 문장이 두세 번 옵니다
 * ("...취약점이 있음." / "...취약점이있음."). 공백과 문장부호를 지운 뒤 비교합니다.
 */
function dedupeQuotes(evidence = []) {
  const seen = new Set();
  const out = [];
  evidence.forEach((e) => {
    if (!e?.quote) return;
    const norm = String(e.quote).replace(/[\s.,·:;]/g, '');
    if (seen.has(norm)) return;
    seen.add(norm);
    out.push(e.quote);
  });
  return out;
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
  const shownValue = formatEvidence(item.value, item.unit, item);

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
      <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{item.label}</Text>
      {shownValue !== null ? (
        <Text style={[s.textXs, { fontWeight: '700', color: theme.color.foreground }]}>{shownValue}</Text>
      ) : null}
    </View>
  );
}

/**
 * 근거 값 표기 — 서버가 준 숫자 + 단위
 *
 * 율은 소수 2자리로 둡니다. 98.36 을 98.4 로 줄여 적으면 서버가 대조한 값과 화면 값이 달라집니다.
 *
 * **불량률에는 분모를 함께 적습니다.** "100.0%" 만 보면 1개 중 1개인지 3,570개 중 3,570개인지
 * 알 수 없습니다. 크기를 보여 줘야 사람이 이슈의 무게를 판단할 수 있습니다.
 */
export function formatEvidence(value, unit, item) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (unit === '%') {
    const { numerator: a, denominator: b } = item || {};
    const frac = a !== null && a !== undefined && b ? ` (${comma(a)}/${comma(b)})` : '';
    return `${fixed(n, 2)}%${frac}`;
  }
  if (unit === 'EA') return `${comma(n)} EA`;
  return unit ? `${comma(n)} ${unit}` : comma(n);
}

/** 모델이 아직 붙지 않았을 때 — 지어낸 값 대신 상태를 밝힙니다 */
export function NotReady({ reason }) {
  const s = useCommonStyles();
  const idle = reason === 'NOT_REQUESTED';
  const busy = reason === 'MODEL_BUSY';
  return (
    <View style={{ gap: 6, paddingVertical: 10 }}>
      <Text style={[s.textSm, { fontWeight: '600' }]}>
        {idle ? 'AI 분석을 요청하지 않았습니다.' : busy ? '다른 AI 분석이 진행 중입니다.' : '현재 AI 분석 결과가 없습니다.'}
      </Text>
      <Text style={s.textXs}>
        {idle ? '필요할 때 「AI 분석 요청」을 눌러 조회된 기간을 분석할 수 있습니다.'
          : 'AI 분석 서비스가 꺼져 있거나 결과가 준비되지 않은 상태일 수 있습니다. 생산·품질 실적은 계속 확인할 수 있으며, 서비스가 준비되면 「AI 분석 다시 요청」을 눌러 주세요.'}
      </Text>
    </View>
  );
}

/**
 * 조회 중인 구간을 사람이 읽는 말로 — "분석하고 있습니다" 앞에 붙습니다
 *
 * 구간을 못 받았으면 빈 문자열이 아니라 '이 기간' 이라고 적습니다.
 * 문장이 "을 분석하고 있습니다" 로 시작하면 무엇을 분석하는지 알 수 없습니다.
 */
export function rangeText(period) {
  if (!period?.from || !period?.to) return '이 기간';
  return period.from === period.to ? period.from : `${period.from} ~ ${period.to}`;
}

/**
 * 분석 구간 표기
 *
 * 서버가 `periodFrom`·`periodTo` 를 주면 구간으로, `targetDate` 만 주면 그 하루로 적습니다.
 * 화면이 날짜를 지어내지 않습니다 — 서버가 실제로 본 구간만 적습니다.
 */
export function periodText(data) {
  if (!data?.periodFrom || !data?.periodTo) return '';
  // 서버는 "2026-08-01 00:00:00" 처럼 시각까지 줍니다. 끝은 다음 날 0시라 하루를 빼서 적습니다
  const from = String(data.periodFrom).slice(0, 10);
  const to = String(data.periodTo).slice(0, 10);
  const last = to > from ? shiftDate(to, -1) : to;
  return from === last ? `${from} 분석` : `${from} ~ ${last} 분석`;
}
