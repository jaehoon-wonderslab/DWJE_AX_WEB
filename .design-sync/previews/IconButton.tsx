import './_rnw';
import React from 'react';
import { IconButton } from 'dwje-ax-web';

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</div>
);

/** 헤더·카드 동작용 34×34 아이콘 버튼 — 흰 배경 · 옅은 테두리 · 12px 반지름 */
export const Basic = () => (
  <Row>
    <IconButton name="bell" title="알림" />
    <IconButton name="refresh" title="새로고침" />
    <IconButton name="download" title="엑셀 내려받기" />
    <IconButton name="printer" title="인쇄" />
    <IconButton name="settings" title="설정" />
    <IconButton name="close" title="닫기" />
  </Row>
);

/** active — 선택된 보기(표/차트 토글 등)는 #F4F5F6 채움 + 잉크 아이콘 */
export const Active = () => (
  <Row>
    <IconButton name="grid" title="카드 보기" active />
    <IconButton name="menu" title="목록 보기" />
    <span style={{ width: 8 }} />
    <IconButton name="chart" title="차트" active />
    <IconButton name="database" title="원본 데이터" />
  </Row>
);

/** 크기 — size 28 / 34(기본) / 40, iconSize 는 따로 맞춥니다 */
export const Sizes = () => (
  <Row>
    <IconButton name="search" size={28} iconSize={14} title="검색" />
    <IconButton name="search" title="검색" />
    <IconButton name="search" size={40} iconSize={18} title="검색" />
  </Row>
);

/** color — 파괴적 동작이나 상태색을 아이콘에만 입힙니다 */
export const Colored = () => (
  <Row>
    <IconButton name="trash" title="삭제" color="rgb(229, 72, 45)" />
    <IconButton name="alert" title="경고 3건" color="rgb(176, 133, 31)" />
    <IconButton name="check" title="승인" color="rgb(46, 158, 87)" />
    <IconButton name="sparkles" title="AI 요약" color="rgb(30, 42, 120)" />
  </Row>
);
