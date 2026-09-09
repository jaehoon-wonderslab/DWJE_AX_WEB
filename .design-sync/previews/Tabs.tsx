import './_rnw';
import React from 'react';
import { Tabs } from 'dwje-ax-web';

/** 문자열 항목 — value 와 label 이 같습니다 */
export const Basic = () => (
  <div style={{ display: 'flex' }}>
    <Tabs items={['전체', '미확인', '확인']} value="미확인" onChange={() => {}} />
  </div>
);

/** 객체 항목 — value 는 코드, label 은 건수까지 붙인 표시 문구 */
export const Objects = () => (
  <div style={{ display: 'flex' }}>
  <Tabs
    items={[
      { value: 'all', label: '전체 128' },
      { value: 'open', label: '미확인 4' },
      { value: 'done', label: '확인 124' },
    ]}
    value="all"
    onChange={() => {}}
  />
  </div>
);

/** 공정 전환 — 4개 이상은 폭이 좁으면 알약 트랙 안에서 줄바꿈 */
export const Processes = () => (
  <div style={{ width: 280, display: 'flex' }}>
    <Tabs items={['PRESS', 'Plating', 'Coating', 'AOI', '출하']} value="Plating" onChange={() => {}} />
  </div>
);

/** 두 개짜리 — 보기 방식 전환 */
export const Pair = () => (
  <div style={{ display: 'flex' }}>
    <Tabs items={['표', '차트']} value="차트" onChange={() => {}} />
  </div>
);
