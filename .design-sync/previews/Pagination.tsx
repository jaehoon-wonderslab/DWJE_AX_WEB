import './_rnw';
import React from 'react';
import { Pagination } from 'dwje-ax-web';

const META = { page: 1, size: 50, total: 1331, totalPages: 27 };
const noop = () => {};

/** 첫 쪽 — 이전·첫 쪽 화살표 비활성, 1–50 / 1,331건 */
export const FirstPage = () => (
  <div style={{ width: 720 }}>
    <Pagination meta={META} page={1} size={50} onPage={noop} onSize={noop} />
  </div>
);

/** 가운데 쪽 — 앞뒤 2쪽 + 양끝, 사이는 … */
export const MiddlePage = () => (
  <div style={{ width: 840 }}>
    <Pagination meta={{ ...META, page: 13 }} page={13} size={50} onPage={noop} onSize={noop} />
  </div>
);

/** 마지막 쪽 — 다음·마지막 화살표 비활성, 1,301–1,331 */
export const LastPage = () => (
  <div style={{ width: 720 }}>
    <Pagination meta={{ ...META, page: 27 }} page={27} size={50} onPage={noop} onSize={noop} />
  </div>
);

/** 한 쪽에 다 들어감 — 쪽 이동 없이 건수와 페이지당 선택만 */
export const SinglePage = () => (
  <div style={{ width: 720 }}>
    <Pagination meta={{ page: 1, size: 50, total: 38, totalPages: 1 }} page={1} size={50} onPage={noop} onSize={noop} />
  </div>
);

/** 페이지당 선택 숨김 — showSize=false, 좁은 카드 하단용 */
export const NoSizePicker = () => (
  <div style={{ width: 620 }}>
    <Pagination meta={{ ...META, page: 5 }} page={5} size={50} onPage={noop} showSize={false} />
  </div>
);
