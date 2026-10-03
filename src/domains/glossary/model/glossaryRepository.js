/**
 * [Model] 용어 사전 조회 (GL-01 · 화면 ID gloss-view · 2026-10-01 결정 R-09)
 *
 * 조회·검색만 하는 화면입니다. 등록·수정·삭제는 시스템관리 > 용어 사전 관리(sys-gloss)에서 합니다.
 * 조회 API 는 관리 화면과 같은 것을 씁니다 — 서버가 sys-gloss 또는 gloss-view 권한으로 통과시킵니다(GLV-02).
 */
import * as systemService from '@services/api/systemService';
import { unwrap, unwrapAll, fetchAllPages } from '@services/api/request';

/**
 * 요약 · 용어 목록을 한 번에 받습니다.
 * 제거됨(2026-10-03, 분류 삭제): 분류 목록(GET /glossary/domains)과 목록의 분류 필터(domainCd). API 에서 없앴습니다.
 *
 * @param {object} p { keyword, page, size }
 * @returns {Promise<object>} { summary, terms:{items}, termsMeta, errors }
 */
export async function loadGlossaryRead({ keyword }) {
  const data = await unwrapAll({
    summary: systemService.getGlossarySummary({}),
    // 전부 받아 표가 쪽을 나눕니다 — 머리글 필터가 모든 용어에서 찾도록(2026-10-04)
    terms: fetchAllPages(systemService.getGlossaryTerms, { keyword }),
  });
  return { ...data, termsMeta: data.metas?.terms };
}

/**
 * 전체 내려받기용 — 조회 조건과 관계없이 사전 전체를 받습니다(쪽을 돌며 모음 — 서버는 size=0 을 받지 않음).
 * 서버 생성 내려받기(POST /glossary/terms/export)가 없을 때의 대체 경로이며, 상한은 컨트롤러가 정합니다.
 */
export async function loadAllTerms() {
  const data = await unwrap(fetchAllPages(systemService.getGlossaryTerms, {}), { items: [] });
  return data?.items || [];
}

/**
 * 용어 상세 — 관련 용어를 함께 받습니다.
 * @param {number|string} termId
 */
export const fetchTermDetail = (termId) => unwrap(systemService.getGlossaryTermsByTermId({ termId }));
