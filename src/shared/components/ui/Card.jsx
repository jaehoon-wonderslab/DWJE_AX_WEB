/**
 * 카드 (CM-05)
 *
 * 기존 웹의 `<div class="card"><div class="card-head">…</div><div class="card-body">…</div></div>` 구조입니다.
 *
 * 사용 예)
 *   <Card title="공정별 수율" sub="오늘 · 목표 97.0%" right={<Button label="상세" size="sm" />}>
 *     <CardBody>…</CardBody>
 *   </Card>
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';

export default function Card({ title, sub, right, children, style, bodyStyle, tight }) {
  const s = useCommonStyles();
  return (
    <View style={[s.card, style]}>
      {title ? (
        <View style={s.cardHead}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.cardHeadTitle}>{title}</Text>
            {sub ? <Text style={s.cardHeadSub}>{sub}</Text> : null}
          </View>
          {right ? <View style={s.cardHeadRight}>{right}</View> : null}
        </View>
      ) : null}
      {children !== undefined ? (
        tight ? (
          <View style={bodyStyle}>{children}</View>
        ) : (
          <View style={[s.cardBody, bodyStyle]}>{children}</View>
        )
      ) : null}
    </View>
  );
}

/** 카드 본문 — Card 에 children 을 직접 넣지 않고 여러 구역으로 나눌 때 씁니다 */
export function CardBody({ children, style, tight }) {
  const s = useCommonStyles();
  return <View style={[tight ? s.cardBodyTight : s.cardBody, style]}>{children}</View>;
}

/**
 * 카드 하단의 근거·주석 문구 (점선 구분선 + 작은 회색 글씨)
 *
 * 서버가 주석을 주지 않는 응답도 있어서, 내용이 없으면 아예 그리지 않습니다.
 * (그리면 빈 점선만 남아 구분선처럼 보입니다)
 */
export function SourceNote({ children, style }) {
  const s = useCommonStyles();
  const empty = children === null || children === undefined || children === '' ||
    (Array.isArray(children) && !children.filter((c) => c !== null && c !== undefined && c !== '').length);
  if (empty) return null;
  return (
    <View style={[s.source, style]}>
      <Text style={s.sourceText}>{children}</Text>
    </View>
  );
}
