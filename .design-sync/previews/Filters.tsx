import './_rnw';
import React from 'react';
import { Filters, TextField, SelectField, DateField, Button, CheckRow } from 'dwje-ax-web';

/** 기본 조회 줄 — 공정 · 설비 · 기간 · 조회 버튼 (아래 정렬) */
export const Basic = () => (
  <div style={{ width: 760 }}>
    <Filters>
      <SelectField label="공정" value="PRESS" options={['PRESS', 'Plating', 'Coating', 'AOI']} />
      <SelectField label="설비" value="PR-03" options={['PR-01', 'PR-02', 'PR-03', 'PL-01']} />
      <DateField label="시작일" value="2026-09-01" />
      <DateField label="종료일" value="2026-09-09" />
      <Button label="조회" variant="primary" />
    </Filters>
  </div>
);

/** 검색어 · 모델 · 상태 — 텍스트 입력과 보조 버튼 */
export const WithSearch = () => (
  <div style={{ width: 760 }}>
    <Filters>
      <TextField label="LOT 번호" value="L260909-0412" placeholder="LOT 번호 입력" style={{ minWidth: 180 }} />
      <SelectField label="모델" value="Krios_s" options={['Krios_s', 'Krios_m', 'Atlas_x']} />
      <SelectField label="판정" value="" options={['양품', '불량', '재검']} placeholder="전체" />
      <Button label="조회" variant="primary" />
      <Button label="초기화" />
    </Filters>
  </div>
);

/** 좁은 폭에서는 자동으로 다음 줄로 접힙니다 · 체크 옵션도 함께 */
export const Wrapping = () => (
  <div style={{ width: 420 }}>
    <Filters>
      <SelectField label="공정" value="Plating" options={['PRESS', 'Plating', 'Coating', 'AOI']} />
      <DateField label="기준일" value="2026-09-09" />
      <SelectField label="교대조" value="야간" options={['주간', '야간']} />
      <div style={{ paddingBottom: 10 }}>
        <CheckRow label="불량 로트만" checked />
      </div>
      <Button label="조회" variant="primary" />
    </Filters>
  </div>
);
