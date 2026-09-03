/**
 * 반응형 그리드 — CSS 의 `.grid.g2 / .g3 / .g4 / .g23` 대응
 *
 * React Native 에는 CSS Grid 가 없어 Flexbox 로 열을 나눕니다.
 * 창 너비가 좁아지면 자동으로 열 수를 줄입니다 (프로토타입의 @media 규칙과 동일).
 *
 * 사용 예)
 *   <Grid cols={4}><StatCard … /><StatCard … /></Grid>
 *   <Grid cols={[2, 1]}>…</Grid>   // 2:1 비율 두 칸
 */
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

const GAP = 14;

export default function Grid({ cols = 3, children, gap = GAP, style }) {
  const { width } = useWindowDimensions();
  const items = React.Children.toArray(children).filter(Boolean);

  // 비율 배열(예: [2,1])이면 각 칸의 flex 를 그대로 씁니다
  if (Array.isArray(cols)) {
    const stack = width < 1100;
    return (
      <View style={[{ flexDirection: stack ? 'column' : 'row', gap }, style]}>
        {items.map((child, i) => (
          <View key={i} style={{ flex: stack ? undefined : cols[i] || 1, minWidth: 0 }}>
            {child}
          </View>
        ))}
      </View>
    );
  }

  // 숫자면 균등 분할 — 화면 폭에 따라 열 수를 줄입니다
  let n = cols;
  if (width < 1100) n = cols >= 4 ? 2 : 1;
  if (width < 860) n = 1;

  const rows = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));

  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap }}>
          {row.map((child, ci) => (
            <View key={ci} style={{ flex: 1, minWidth: 0 }}>
              {child}
            </View>
          ))}
          {/* 마지막 줄이 덜 찼을 때 빈 칸으로 폭을 맞춥니다 */}
          {row.length < n
            ? Array.from({ length: n - row.length }).map((_, k) => <View key={`e${k}`} style={{ flex: 1 }} />)
            : null}
        </View>
      ))}
    </View>
  );
}

/** 세로 간격 */
export function Gap({ size = 14 }) {
  return <View style={{ height: size }} />;
}
