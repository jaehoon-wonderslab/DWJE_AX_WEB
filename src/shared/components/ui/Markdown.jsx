/**
 * 마크다운 렌더러 — LLM 답변(굵게 · 목록 · 제목 · 코드 · 표 · 근거 번호 `[1]`)
 *
 * ## XSS 를 구조로 막습니다
 * HTML 로 바꿔 `innerHTML` 에 넣지 않습니다. 글을 줄·구간으로 나눠 React Native `<Text>` 로만 그리므로
 * 모델이 `<script>`·`<img onerror>` 를 써도 **글자 그대로** 보일 뿐 실행될 길이 없습니다.
 * 링크 `[글](주소)` 도 글만 남깁니다 — `javascript:` 주소를 누를 수 있게 만들지 않습니다.
 *
 * 스트리밍 중에는 닫히지 않은 `**` 같은 것이 잠깐 글자로 보이다가 짝이 오면 굵게 바뀝니다.
 * 지원 범위는 사내 모델이 실제로 쓰는 만큼입니다. 새 문법이 필요하면 여기서 늘립니다.
 */
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { FONT_FAMILY, useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export default function Markdown({ text, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  const blocks = useMemo(() => parseBlocks(String(text ?? '')), [text]);
  const base = [s.bubbleText, style];

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <Text key={i} style={[base, { fontWeight: '700', fontSize: b.level <= 2 ? 19 : 17, marginTop: i ? 4 : 0 }]}>
              <Inline text={b.text} theme={theme} />
            </Text>
          );
        }
        if (b.type === 'list') {
          return (
            <View key={i} style={{ gap: 4 }}>
              {b.items.map((it, j) => (
                <View key={j} style={{ flexDirection: 'row', paddingLeft: 4 + it.indent * 16 }}>
                  <Text style={[base, { width: b.ordered ? 26 : 16, color: theme.color.mutedForeground }]}>
                    {b.ordered ? `${it.no}.` : '•'}
                  </Text>
                  <Text style={[base, { flex: 1 }]}>
                    <Inline text={it.text} theme={theme} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.type === 'code') {
          return (
            <ScrollView key={i} horizontal style={{ backgroundColor: theme.surface, borderRadius: theme.metrics.radiusXs }}>
              <Text style={[base, { fontFamily: MONO, fontSize: 14.5, padding: 10 }]}>{b.text}</Text>
            </ScrollView>
          );
        }
        if (b.type === 'quote') {
          return (
            <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: theme.divider, paddingLeft: 10 }}>
              <Text style={[base, { color: theme.color.mutedForeground }]}>
                <Inline text={b.text} theme={theme} />
              </Text>
            </View>
          );
        }
        if (b.type === 'rule') {
          return <View key={i} style={{ height: 1, backgroundColor: theme.divider, marginVertical: 4 }} />;
        }
        if (b.type === 'table') {
          return <MdTable key={i} rows={b.rows} base={base} theme={theme} />;
        }
        return (
          <Text key={i} style={base}>
            <Inline text={b.text} theme={theme} />
          </Text>
        );
      })}
    </View>
  );
}

/** 표 — 열이 많으면 가로로 스크롤합니다(열을 줄이지 않습니다) */
function MdTable({ rows, base, theme }) {
  const [head, ...body] = rows;
  const cell = { minWidth: 96, paddingVertical: 6, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: theme.divider };
  return (
    <ScrollView horizontal style={{ borderWidth: 1, borderColor: theme.divider, borderRadius: theme.metrics.radiusXs }}>
      <View>
        {[head, ...body].map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', borderTopWidth: i ? 1 : 0, borderTopColor: theme.divider, backgroundColor: i ? 'transparent' : theme.surface }}>
            {head.map((_, j) => (
              <View key={j} style={cell}>
                <Text style={[base, { fontSize: 15, fontWeight: i ? '400' : '600' }]}>
                  <Inline text={r[j] ?? ''} theme={theme} />
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * 한 줄 안의 꾸밈 — `**굵게**` · `*기울임*` · `` `코드` `` · `[1]` 근거 번호 · `[글](주소)`
 * 중첩은 굵게 안의 근거 번호 정도만 풉니다.
 */
function Inline({ text, theme }) {
  return tokenize(text).map((t, i) => {
    if (t.type === 'bold') return <Text key={i} style={{ fontWeight: '700' }}><Inline text={t.text} theme={theme} /></Text>;
    if (t.type === 'italic') return <Text key={i} style={{ fontStyle: 'italic' }}>{t.text}</Text>;
    if (t.type === 'code') {
      return <Text key={i} style={{ fontFamily: MONO, fontSize: 14.5, backgroundColor: theme.surface }}>{` ${t.text} `}</Text>;
    }
    if (t.type === 'cite') {
      return (
        <Text key={i} style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: theme.color.info }}>
          {`[${t.text}]`}
        </Text>
      );
    }
    return <Text key={i}>{t.text}</Text>;
  });
}

// 굵게(** · __) · 코드 · 근거 번호([1] · [1, 2] · [1-3]) · 링크 · 기울임(*글*, 여는 * 뒤에 공백이 없을 때만 — 곱셈 기호와 구분)
const INLINE = /\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\[(\d+(?:\s*[,\-–]\s*\d+)*)\]|\[([^\]]+)\]\((?:[^()\s]|\([^()\s]*\))+\)|\*([^*\s][^*]*)\*/g;

function tokenize(text) {
  const src = String(text);
  const out = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    if (m.index > last) out.push({ type: 'text', text: src.slice(last, m.index) });
    const [, bold, bold2, code, cite, linkText, italic] = m;
    if (bold !== undefined || bold2 !== undefined) out.push({ type: 'bold', text: bold ?? bold2 });
    else if (code !== undefined) out.push({ type: 'code', text: code });
    else if (cite !== undefined) out.push({ type: 'cite', text: cite });
    else if (linkText !== undefined) out.push({ type: 'text', text: linkText });
    else out.push({ type: 'italic', text: italic });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ type: 'text', text: src.slice(last) });
  return out;
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** 글 → 블록 목록 (문단 · 제목 · 목록 · 코드 · 인용 · 구분선 · 표) */
export function parseBlocks(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'para', text: para.join('\n') });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ type: 'heading', level: h[1].length, text: h[2] });
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      flush();
      blocks.push({ type: 'rule' });
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      flush();
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]));
      i--;
      blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flush();
      const q = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
      i--;
      blocks.push({ type: 'quote', text: q.join('\n') });
      continue;
    }
    const li = LIST_ITEM.exec(line);
    if (li) {
      flush();
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i]);
        if (m && /\d/.test(m[2]) === ordered) {
          items.push({ indent: Math.min(3, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), no: parseInt(m[2], 10) || items.length + 1, text: m[3] });
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          // 들여 쓴 이어지는 줄은 앞 항목에 붙입니다
          items[items.length - 1].text += `\n${lines[i].trim()}`;
        } else {
          break;
        }
        i++;
      }
      i--;
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}
