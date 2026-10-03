/**
 * [View] 쓰기 권한 버튼 (R-06 · CMN-06) — 계정 관리 · 그룹웨어 부서 매핑 공용
 *
 * 쓰기 권한이 없으면 버튼을 **숨기지 않고** 비활성으로 그리고, 마우스를 올리면 이유를 보여 줍니다.
 * 숨기면 「버튼이 없어졌다」 로 읽히고, 누가 무엇을 요청해야 하는지 알 수 없습니다.
 * 이유 문구는 정책상 비활성(시스템 부서 삭제 등)에도 그대로 씁니다 — `reason` 으로 바꿉니다.
 *
 * 공통 Button 에는 툴팁 속성이 없어(react-native-web 이 title 을 넘기지 않습니다) 감싸는 상자의
 * DOM 에 title 을 직접 붙입니다. 엑셀 내려받기는 쓰기가 아니므로 이것을 쓰지 않습니다(R-10).
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Button } from '@shared/components/ui';

/** 쓰기 권한 없음 안내 (공통 지침 문구) */
export const WRITE_DENIED = '미배정 계정은 이 동작을 할 수 없습니다. 전산팀에 부서 배정을 요청하세요.';

/**
 * 웹에서 DOM title(툴팁)을 붙입니다.
 * @param {string} [title] 비우면 지웁니다
 */
export function useDomTitle(title) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (Platform.OS !== 'web' || !el || typeof el.setAttribute !== 'function') return;
    if (title) el.setAttribute('title', title);
    else el.removeAttribute('title');
  }, [title]);
  return ref;
}

/**
 * @param {object} props Button 속성 + 아래
 * @param {boolean} [props.allowed] 쓰기 권한이 있는지 (false 면 비활성 + WRITE_DENIED 툴팁)
 * @param {string} [props.reason] 비활성 이유 — 주면 권한과 무관하게 비활성 + 이 문구
 */
export function GuardedButton({ allowed = true, reason, disabled, ...props }) {
  const why = reason || (!allowed ? WRITE_DENIED : '');
  const ref = useDomTitle(why);
  return (
    <View ref={ref} accessibilityHint={why || undefined} style={{ alignSelf: 'flex-start' }}>
      <Button {...props} disabled={!!why || disabled} />
    </View>
  );
}
