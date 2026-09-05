/**
 * [Component] AI 판단 근거 보기
 *
 * 브리핑·원인 분석이 **무엇을 보고 그렇게 말했는지**를 한자리에 펴 놓습니다.
 * 카드에는 문장 옆에 근거 칩만 짧게 보이므로, 따져 봐야 할 때 이 창을 엽니다.
 *
 * ■ 두 가지를 구분해 보여 줍니다
 *   지표 근거 — 서버가 DB 에서 **값을 다시 구해 모델이 말한 값과 대조**한 것입니다.
 *              대조 대상(`key`)과 확인된 값을 함께 적습니다.
 *   문서 근거 — 과거 불량분석 문서의 원문입니다. 문서명·경로·쪽과 인용문을 그대로 적습니다.
 *
 * ■ 버린 문장도 셉니다
 * 근거가 확인되지 않아 뺀 문장 수(`droppedCnt`)를 밝힙니다. 조용히 버리면
 * 사람이 "모델이 그것밖에 말 안 했나" 로 잘못 읽습니다.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Button } from '@shared/components/ui';
import { useUiStore } from '@shared/stores/useUiStore';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';
import { comma } from '@shared/utils/formatUtil';
import { formatEvidence } from './AiBriefingCard';

/** 근거 종류 → 사람이 읽는 이름 */
const KIND_LABEL = {
  qty: '생산 수량', defect_rate: '불량률', yield: '수율', metric: '수율',
  defect: '불량 유형별 수량', anomaly: '설비 불량률', doc: '문서',
};

/** 문서 근거만 모아 중복 없이 (같은 문서가 여러 문장에 인용됩니다) */
export function collectDocs(sections = []) {
  const seen = new Map();
  sections.forEach(({ lines }) => (lines || []).forEach((l) => (l.evidence || []).forEach((e) => {
    if (e.kind !== 'doc') return;
    const id = e.ref || e.key;
    if (!seen.has(id)) seen.set(id, { ...e, quotes: [] });
    const q = String(e.quote || '').replace(/[\s.,·:;]/g, '');
    const cur = seen.get(id);
    if (e.quote && !cur.quotes.some((x) => String(x).replace(/[\s.,·:;]/g, '') === q)) cur.quotes.push(e.quote);
  })));
  return [...seen.values()];
}

/**
 * 근거 창을 엽니다.
 * @param {object} p title · sections[{ heading, lines }] · droppedCnt · modelVer · analyzedAt
 */
export function openEvidenceModal({ title, sections = [], droppedCnt = 0, modelVer, analyzedAt }) {
  useUiStore.getState().openModal({
    title: `${title} — 판단 근거`,
    sub: [modelVer, analyzedAt].filter(Boolean).join(' · '),
    wide: true,
    render: () => <EvidenceBody sections={sections} droppedCnt={droppedCnt} />,
  });
}

function EvidenceBody({ sections, droppedCnt }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const docs = collectDocs(sections);

  return (
    <View style={{ gap: 18 }}>
      <Text style={s.textXs}>
        지표 근거는 서버가 <Text style={{ fontWeight: '700' }}>값을 다시 구해 대조한 것</Text>이고,
        문서 근거는 과거 불량분석 문서의 원문입니다. 대조를 통과하지 못한 문장은 표시하지 않습니다.
      </Text>

      {sections.map((sec) => (
        <View key={sec.heading} style={{ gap: 10 }}>
          <Text style={[s.textSm, { fontWeight: '700' }]}>{sec.heading}</Text>
          {(sec.lines || []).length ? (
            sec.lines.map((line, i) => (
              <View
                key={i}
                style={{ gap: 6, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: theme.color.border }}
              >
                <Text style={[s.textSm, { lineHeight: 21 }]}>{line.text}</Text>
                {(line.evidence || []).map((e, j) => (
                  <EvidenceRow key={j} item={e} />
                ))}
              </View>
            ))
          ) : (
            <Text style={s.textXs}>근거가 확인된 문장이 없습니다.</Text>
          )}
        </View>
      ))}

      {docs.length ? (
        <View style={{ gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.color.border }}>
          <Text style={[s.textSm, { fontWeight: '700' }]}>{`참고 문서 ${comma(docs.length)}건`}</Text>
          <Text style={s.textXs}>처방 권고가 인용한 과거 불량분석 문서입니다. 원본을 열어 확인하실 수 있습니다.</Text>
          {docs.map((d, i) => (
            <DocRow key={i} doc={d} />
          ))}
        </View>
      ) : null}

      {droppedCnt ? (
        <View style={[s.rowGap6, { flexWrap: 'wrap' }]}>
          <Badge tone="amber">{`제외 ${comma(droppedCnt)}건`}</Badge>
          <Text style={[s.textXs, { flex: 1, minWidth: 240 }]}>
            모델이 낸 문장 중 근거가 확인되지 않아 뺀 것입니다. 값이 실제와 다르거나, 없는 대상을 가리키거나,
            열람 권한이 없는 자료를 근거로 든 경우입니다.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** 근거 한 줄 — 종류 · 대조 대상 · 확인된 값 */
function EvidenceRow({ item }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const shown = formatEvidence(item.value, item.unit, item);

  if (item.kind === 'doc') {
    return (
      <View style={{ gap: 2 }}>
        <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{`문서 · ${item.label || ''}`}</Text>
        {item.quote ? (
          <Text style={[s.textXs, { fontStyle: 'italic' }]}>{`"${item.quote}"`}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[s.rowGap6, { flexWrap: 'wrap' }]}>
      <Text style={[s.textXs, { color: theme.color.mutedForeground, minWidth: 96 }]}>
        {KIND_LABEL[item.kind] || item.kind}
      </Text>
      <Text style={s.textXs}>{item.label || item.key}</Text>
      {shown ? <Text style={[s.textXs, { fontWeight: '700' }]}>{shown}</Text> : null}
      {item.key ? <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{`(${item.key})`}</Text> : null}
    </View>
  );
}

/** 참고 문서 한 건 — 문서명 · 경로 · 쪽 · 인용문 */
function DocRow({ doc }) {
  const s = useCommonStyles();
  const theme = useTheme();
  // 서버가 경로·쪽을 주면 함께 적습니다. 없으면 문서명만 — 지어내지 않습니다.
  const where = [doc.path || doc.filePath, doc.fileName, doc.page ? `${doc.page}쪽` : null].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        gap: 3,
        padding: 9,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: theme.color.border,
        backgroundColor: theme.alpha('muted', 0.3),
      }}
    >
      <Text style={[s.textXs, { fontWeight: '600' }]}>{doc.label || doc.ref || doc.key}</Text>
      {where ? <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{where}</Text> : null}
      {(doc.quotes || []).map((q, i) => (
        <Text key={i} style={[s.textXs, { fontStyle: 'italic' }]}>{`"${q}"`}</Text>
      ))}
    </View>
  );
}

/** 카드 머리에 다는 근거 보기 버튼 */
export function EvidenceButton({ onPress, disabled }) {
  return <Button label="판단 근거" size="sm" icon="file" onPress={onPress} disabled={disabled} />;
}
