import { useMemo } from 'react';
import { useThemeStore } from '@shared/stores/useThemeStore';
import { createTheme } from './theme';

/**
 * 현재 테마 객체를 반환합니다.
 *
 * 사용 예)
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.color.card }} />
 */
export function useTheme() {
  const mode = useThemeStore((state) => state.mode);
  return useMemo(() => createTheme(mode), [mode]);
}

/**
 * 테마 의존 StyleSheet 를 만들어 주는 헬퍼.
 *
 * 사용 예)
 *   const useStyles = makeStyles((theme) => ({ box: { backgroundColor: theme.color.card } }));
 *   ...
 *   const styles = useStyles();
 */
export function makeStyles(factory) {
  const cache = new Map();
  return function useMadeStyles() {
    const theme = useTheme();
    return useMemo(() => {
      if (!cache.has(theme.mode)) cache.set(theme.mode, factory(theme));
      return cache.get(theme.mode);
    }, [theme]);
  };
}
