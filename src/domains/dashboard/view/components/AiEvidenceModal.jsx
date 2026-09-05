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
import { Text, TouchableOpacity, View } from 'react-native';
import { Badge, Icon } from '@shared/components/ui';
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
    <View style={{ gap: 20 }}>
      <View style={{ padding: 11, borderRadius: 6, backgroundColor: theme.alpha('info', 0.08) }}>
        <Text style={[s.textXs, { lineHeight: 19 }]}>
          <Text style={{ fontWeight: '700' }}>지표 근거</Text>는 서버가 값을 다시 구해 대조한 것이고,{' '}
          <Text style={{ fontWeight: '700' }}>문서 근거</Text>는 과거 불량분석 문서의 원문입니다.
          대조를 통과하지 못한 문장은 표시하지 않습니다.
        </Text>
      </View>

      {sections.map((sec) => (
        <View key={sec.heading} style={{ gap: 12 }}>
          <View style={[s.rowGap6, { flexWrap: 'wrap' }]}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.color.foreground }}>{sec.heading}</Text>
            <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{`${(sec.lines || []).length}건`}</Text>
          </View>
          {(sec.lines || []).length ? (
            sec.lines.map((line, i) => (
              // 문장 한 덩이를 상자로 묶습니다 — 어느 근거가 어느 문장 것인지 눈으로 갈립니다
              <View
                key={i}
                style={{
                  gap: 9,
                  padding: 12,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  backgroundColor: theme.color.card,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  <View
                    style={{
                      width: 20, height: 20, borderRadius: 10, marginTop: 1,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: theme.alpha('primary', 0.12),
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.color.primary }}>{i + 1}</Text>
                  </View>
                  <Text style={[s.textSm, { flex: 1, lineHeight: 23, fontSize: 14 }]}>{line.text}</Text>
                </View>
                <View style={{ gap: 7, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.color.border }}>
                  {(line.evidence || []).map((e, j) => (
                    <EvidenceRow key={j} item={e} />
                  ))}
                </View>
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
    const where = [item.fileName, item.page ? `${item.page}쪽` : null].filter(Boolean).join(' · ');
    return (
      <View style={{ gap: 2 }}>
        <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{`문서 · ${where || item.label || ''}`}</Text>
        {item.quote ? (
          <Text style={[s.textXs, { fontStyle: 'italic' }]}>{`"${item.quote}"`}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
      <View style={{ width: 84, paddingVertical: 1 }}>
        <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{KIND_LABEL[item.kind] || item.kind}</Text>
      </View>
      <Text style={[s.textXs, { flex: 1, minWidth: 150 }]}>
        {item.label || item.key}
        {item.key ? <Text style={{ color: theme.color.mutedForeground }}>{`  ${item.key}`}</Text> : null}
      </Text>
      {shown ? (
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.color.foreground }}>{shown}</Text>
      ) : null}
    </View>
  );
}

/**
 * 참고 문서 한 건 — 파일명 · 위치 · 쪽 · 전체 경로 · 인용문
 *
 * 사용자가 원본을 찾아 열어 볼 수 있어야 합니다. 그래서 **파일명과 전체 경로를 그대로** 적습니다.
 * 경로는 길어서 눈에 덜 띄게 두되 선택·복사는 되도록 합니다.
 * 서버가 주지 않는 값은 적지 않습니다 — 경로를 지어내지 않습니다.
 */
function DocRow({ doc }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const where = [doc.location, doc.page ? `${doc.page}쪽` : null].filter(Boolean).join(' · ');

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
      <Text style={[s.textXs, { fontWeight: '700' }]}>{doc.fileName || doc.label || doc.ref || doc.key}</Text>
      {where ? <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>{where}</Text> : null}
      {/*
        경로는 **상대경로**를 보여 줍니다. 절대경로(`path`)는 적재한 PC 의 마운트 지점이 붙어 있어
        다른 PC 에서는 열리지 않습니다. 상대경로 앞에 각자의 NAS 루트를 붙이면 됩니다.
      */}
      {doc.relativePath || doc.path ? (
        <Text selectable style={[s.textXs, { color: theme.color.mutedForeground, fontSize: 10.5 }]}>
          {doc.relativePath || doc.path}
        </Text>
      ) : null}
      {/* 압축 안에서 뽑은 문서는 그 경로를 그대로 열 수 없습니다 — 압축 파일까지만 열고 안쪽은 안내로 둡니다 */}
      {doc.innerPath ? (
        <Text style={[s.textXs, { color: theme.color.mutedForeground }]}>
          {`압축 파일 안의 문서입니다 — 압축을 열고 「${doc.innerPath}」 를 찾으세요.`}
        </Text>
      ) : null}
      {(doc.quotes || []).map((q, i) => (
        <Text key={i} style={[s.textXs, { fontStyle: 'italic' }]}>{`"${q}"`}</Text>
      ))}
    </View>
  );
}

/**
 * 카드 머리에 다는 근거 보기 버튼
 *
 * 이 화면에서 제일 중요한 동작이라 눈에 띄어야 합니다 — 사람이 "그 말 어디서 났나" 를
 * 물을 수 있어야 AI 가 낸 문장을 믿고 쓸 수 있습니다. 테두리와 아이콘을 줘 다른 버튼과 구분합니다.
 */
export function EvidenceButton({ onPress, disabled, count }) {
  const s = useCommonStyles();
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 11,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.alpha('primary', 0.45),
        backgroundColor: theme.alpha('primary', 0.08),
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name="search" size={13} color={theme.color.primary} />
      <Text style={[s.textXs, { fontWeight: '700', color: theme.color.primary }]}>판단 근거</Text>
      {count ? (
        <View style={{ paddingHorizontal: 5, borderRadius: 8, backgroundColor: theme.alpha('primary', 0.16) }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.color.primary }}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
