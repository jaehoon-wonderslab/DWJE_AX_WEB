/** react-native-safe-area-context 대체 — 웹 미리보기에는 안전 영역이 없으므로 통과 컨테이너만 제공 */
import React, { createContext, useContext } from 'react';
import { View } from 'react-native';
const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };
const Ctx = createContext(ZERO);
export const SafeAreaProvider = ({ children, style }) => (
  <Ctx.Provider value={ZERO}><View style={[{ flex: 1 }, style]}>{children}</View></Ctx.Provider>
);
export const SafeAreaView = ({ children, style }) => <View style={style}>{children}</View>;
export const useSafeAreaInsets = () => useContext(Ctx);
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: typeof window !== 'undefined' ? window.innerWidth : 1440, height: typeof window !== 'undefined' ? window.innerHeight : 900 });
export const SafeAreaInsetsContext = Ctx;
export const initialWindowMetrics = null;
