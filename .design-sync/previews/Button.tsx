import './_rnw';
import React from 'react';
import { Button } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</div>
);

/** 변형 4종 — primary(화면에 하나) · outline(보조) · ghost(3차) · danger(되돌리기 어려운 동작) */
export const Variants = () => (
  <Row>
    <Button label="조회" variant="primary" />
    <Button label="초기화" variant="outline" />
    <Button label="상세 보기" variant="ghost" />
    <Button label="LOT 폐기" variant="danger" />
  </Row>
);

/** 크기 — md 34px(기본) · sm 28px(카드 머리말·표 안) */
export const Sizes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <Row>
      <Button label="조회" variant="primary" />
      <Button label="엑셀 내려받기" icon="download" />
      <Button label="취소" variant="ghost" />
    </Row>
    <Row>
      <Button label="조회" variant="primary" size="sm" />
      <Button label="엑셀 내려받기" icon="download" size="sm" />
      <Button label="취소" variant="ghost" size="sm" />
    </Row>
  </div>
);

/** 왼쪽 아이콘 — 이름만 넘기면 변형 색을 따라갑니다 */
export const WithIcon = () => (
  <Row>
    <Button label="작업지시 추가" icon="plus" variant="primary" />
    <Button label="새로고침" icon="refresh" />
    <Button label="인쇄" icon="printer" />
    <Button label="열기" icon="external" variant="ghost" />
    <Button label="삭제" icon="trash" variant="danger" />
  </Row>
);

/** 비활성 — opacity .45, onPress 무시 */
export const Disabled = () => (
  <Row>
    <Button label="승인" variant="primary" disabled />
    <Button label="반려" variant="outline" disabled />
    <Button label="삭제" variant="danger" disabled />
  </Row>
);

/** 폼 하단 관례 — 오른쪽 정렬, ghost 취소 + primary 확정 */
export const FormFooter = () => (
  <div style={{ width: 300, background: '#FFFFFF', border: '1px solid #DFE1E7', borderRadius: 16, padding: 14 }}>
    <div style={{ fontSize: 12, color: '#787878', marginBottom: 12, lineHeight: '17px' }}>
      PR-03 금형 교체 완료를 등록합니다. LOT L260909-0412 부터 새 금형 기준으로 집계됩니다.
    </div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <Button label="취소" variant="ghost" />
      <Button label="교체 등록" variant="primary" icon="check" />
    </div>
  </div>
);
