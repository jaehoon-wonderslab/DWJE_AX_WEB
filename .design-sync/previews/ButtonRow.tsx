import './_rnw';
import React from 'react';
import { Button, ButtonRow, IconButton } from 'dwje-ax-web';

/** 조회 조건 아래의 기본 동작 줄 — primary 하나 + outline 보조 */
export const Basic = () => (
  <ButtonRow>
    <Button label="조회" variant="primary" />
    <Button label="초기화" />
    <Button label="엑셀" icon="download" />
  </ButtonRow>
);

/** 좁은 폭에서는 자동 줄바꿈(flexWrap) */
export const Wrapping = () => (
  <div style={{ width: 240, border: '1px dashed #DFE1E7', borderRadius: 12, padding: 8 }}>
    <ButtonRow>
      <Button label="조회" variant="primary" size="sm" />
      <Button label="초기화" size="sm" />
      <Button label="엑셀 내려받기" icon="download" size="sm" />
      <Button label="인쇄" icon="printer" size="sm" />
      <Button label="조건 저장" icon="save" size="sm" />
    </ButtonRow>
  </div>
);

/** Button 과 IconButton 을 섞고 style 로 오른쪽 정렬 */
export const MixedRightAligned = () => (
  <div style={{ width: 300 }}>
    <ButtonRow style={{ justifyContent: 'flex-end' }}>
      <IconButton name="refresh" title="새로고침" />
      <IconButton name="printer" title="인쇄" />
      <Button label="점검 요청" variant="primary" icon="send" />
    </ButtonRow>
  </div>
);
