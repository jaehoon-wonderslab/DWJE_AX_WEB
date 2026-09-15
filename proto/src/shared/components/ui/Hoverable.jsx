/**
 * 호버 상태를 스스로 관리하는 Pressable
 *
 * `<Link asChild>` (Radix Slot) 는 자식의 `style` 을 객체 스프레드로 합치기 때문에
 * **함수형 style 이 빈 객체가 됩니다** (`style={({ hovered }) => …}` 가 사라져 flexDirection 까지 잃습니다).
 * 그래서 함수는 `hoverStyle` 이라는 별도 prop 으로 받습니다 — Slot 이 건드리지 않는 이름입니다.
 * hovered · pressed 를 직접 계산해 정적 객체로 Pressable 에 넘깁니다.
 *
 * 사용 예)
 *   <Link href="/x" asChild>
 *     <Hoverable hoverStyle={({ hovered }) => ({ backgroundColor: hovered ? '#111' : 'transparent' })}>…</Hoverable>
 *   </Link>
 */
import React, { forwardRef, useState } from 'react';
import { Pressable } from 'react-native';

const Hoverable = forwardRef(function Hoverable({ style, hoverStyle, onHoverIn, onHoverOut, onPressIn, onPressOut, children, ...rest }, ref) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const dynamic = typeof hoverStyle === 'function' ? hoverStyle({ hovered, pressed }) : hoverStyle;
  const resolved = [style, dynamic];

  return (
    <Pressable
      ref={ref}
      {...rest}
      style={resolved}
      onHoverIn={(e) => {
        setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        onHoverOut?.(e);
      }}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      {typeof children === 'function' ? children({ hovered, pressed }) : children}
    </Pressable>
  );
});

export default Hoverable;
