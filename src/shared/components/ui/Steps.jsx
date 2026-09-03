/**
 * 단계형 작성 마법사 헤더 (RP-07 폐기 보고서 작성 등)
 *
 * 사용 예)
 *   <Steps step={2} items={[{title:'전표 조회', sub:'MES'}, …]} onPick={setStep} />
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCommonStyles } from '@shared/theme/styles';
import { useTheme } from '@shared/theme/useTheme';

export default function Steps({ items = [], step = 1, onPick, style }) {
  const s = useCommonStyles();
  const theme = useTheme();
  return (
    <View style={[s.steps, style]}>
      {items.map((it, i) => {
        const no = i + 1;
        const on = no === step;
        const done = no < step;
        return (
          <TouchableOpacity
            key={it.title}
            style={[
              s.step,
              on && s.stepOn,
              i === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
              i === items.length - 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
              i > 0 && { borderLeftWidth: 0 },
            ]}
            onPress={() => onPick?.(no)}
            activeOpacity={0.75}
          >
            <View style={[s.stepNo, on && s.stepOnNo, done && s.stepDoneNo]}>
              <Text style={[s.stepNoText, on && s.stepOnNoText, done && s.stepDoneNoText]}>{done ? '✓' : no}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.stepTitle, (on || done) && { color: theme.color.foreground }]} numberOfLines={1}>
                {it.title}
              </Text>
              {it.sub ? <Text style={s.stepSub} numberOfLines={1}>{it.sub}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
