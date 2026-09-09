import './_rnw';
import React from 'react';
import { FullPageContainer, Card } from 'dwje-ax-web';

/** 전체 영역 화면 — 스크롤 없이 24px(위 16px) 여백만 두고 내용이 높이를 채웁니다 */
export const Basic = () => (
  <div style={{ width: 720, height: 300, border: '1px dashed #C9CCD3', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#F5F6F8' }}>
    <FullPageContainer>
      <Card title="자연어 질의" sub="내부에서 스크롤을 직접 관리" style={{ flex: 1 }} bodyStyle={{ flex: 1, justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 12.5, lineHeight: '19px', color: '#3C3C3C' }}>
          <div style={{ color: '#787878', marginBottom: 6 }}>Q. PR-03 최근 3일 불량률 알려줘</div>
          <div>PR-03 불량률은 9/6 1.4% → 9/7 1.5% → 9/8 1.8% 로 상승 추세입니다. 금형 교체(9/8 08:12) 이후 치수 불량이 집중됩니다.</div>
        </div>
      </Card>
    </FullPageContainer>
  </div>
);
