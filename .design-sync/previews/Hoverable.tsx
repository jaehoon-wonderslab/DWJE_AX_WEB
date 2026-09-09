import './_rnw';
import React from 'react';
import { Hoverable, Icon, Dot } from 'dwje-ax-web';

const rowBase = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  height: 38,
  paddingHorizontal: 12,
  borderRadius: 12,
};
const label = { fontSize: 12.5, fontWeight: 500, color: '#3C3C3C', lineHeight: '17px' } as const;

/** 내비 행 — hoverStyle 함수로 hovered 때 #F4F5F6 채움. 두 번째 행은 호버 상태를 정적으로 보여 줍니다 */
export const NavRows = () => (
  <div style={{ width: 228, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Hoverable style={rowBase} hoverStyle={({ hovered }) => ({ backgroundColor: hovered ? '#F4F5F6' : 'transparent' })}>
      <Icon name="activity" size={15} color="#3C3C3C" />
      <span style={label}>공정 모니터링</span>
    </Hoverable>
    <Hoverable style={rowBase} hoverStyle={{ backgroundColor: '#F4F5F6' }}>
      <Icon name="chart" size={15} color="#0B1440" />
      <span style={{ ...label, color: '#0B1440' }}>수율 분석</span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#787878' }}>hover</span>
    </Hoverable>
    <Hoverable style={rowBase} hoverStyle={({ hovered }) => ({ backgroundColor: hovered ? '#F4F5F6' : 'transparent' })}>
      <Icon name="alert" size={15} color="#3C3C3C" />
      <span style={label}>이상 알림</span>
    </Hoverable>
  </div>
);

/** 설비 카드 링크 — 기본 · 호버(테두리 진해짐 + #FAFAFA) 를 나란히 */
export const CardLink = () => (
  <div style={{ display: 'flex', gap: 10 }}>
    {[false, true].map((hovered) => (
      <Hoverable
        key={String(hovered)}
        style={{ width: 140, padding: 12, borderRadius: 16, borderWidth: 1, gap: 6 }}
        hoverStyle={{ backgroundColor: hovered ? '#FAFAFA' : '#FFFFFF', borderColor: hovered ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dot tone={hovered ? 'amber' : ''} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0B1440' }}>PR-03</span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#787878' }}>{hovered ? 'hover' : '기본'}</span>
        </div>
        <div style={{ fontSize: 11, color: '#787878', lineHeight: '15px' }}>PRESS · Krios_s · 가동률 91.2%</div>
      </Hoverable>
    ))}
  </div>
);

/** children 을 함수로 — hovered/pressed 를 받아 내용을 바꿉니다(정적 렌더는 기본 상태) */
export const RenderProp = () => (
  <div style={{ width: 300 }}>
    <Hoverable
      style={{ ...rowBase, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', backgroundColor: '#FFFFFF' }}
      hoverStyle={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {({ hovered }) => (
        <>
          <Icon name="file" size={15} color="#3C3C3C" />
          <span style={label}>L260909-0412 검사 성적서</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
            <Icon name={hovered ? 'external' : 'chevronRight'} size={14} color="#787878" />
          </span>
        </>
      )}
    </Hoverable>
  </div>
);
