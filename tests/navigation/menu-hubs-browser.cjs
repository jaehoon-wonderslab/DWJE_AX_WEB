const assert = require('node:assert/strict');
const { open, WEB } = require('../lib/browser');

const groups = [
  ['dashboard', '대시보드', '3', ['AI 통합 대시보드', '공정 및 제품 대시보드', '생산 모니터링']],
  ['operation', '생산 및 품질 관리', '3', ['실적 집계·조회', '불량 현황 조회', 'AOI 판정 분석']],
  // 보고서는 사이드바에 한 줄만 있고(건수 없음) 보고서 목록은 허브의 "보고서 선택" 드롭다운에만 있습니다
  ['report', '보고서', null, ['일일 생산현황 보고', '아침회의 자료 (PRESS)', '아침회의 자료 (Plating·Coating)', '연간 출하계획', '제품별 수율', '고객사별 LRR', '폐기 보고서']],
  // 2026-10-03 — menu.js 시스템관리 12화면(끝에 전사 자연어 질의 이력). 자연어 질의 이력(본인)은 별도 대그룹입니다
  ['system', '시스템관리', '12', ['계정 관리', '부서 매핑', '메뉴 접근 권한', '데이터 접근 권한', '이상 알림 발송 조건 관리', '알림 수신자 관리', '용어 사전 관리', '보안 감사 로그', '보고서 다운로드 이력', '업로드 문서 목록', '데이터 연동 이력', '전사 자연어 질의 이력']],
];

(async () => {
  const { browser, page } = await open('admin');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${WEB}/ai/chat`);
    for (const [slug, groupName, count, items] of groups) {
      const groupLink = page.locator(`a[href="/menu/${slug}"]`);
      await groupLink.getByText(groupName, { exact: true }).waitFor();
      if (count !== null) assert.equal(await groupLink.getByText(count, { exact: true }).count(), 1, `${groupName} 메뉴 개수`);
      await groupLink.click();
      await page.waitForURL(`**/menu/${slug}`);
      assert.equal(await page.getByText('해당 화면으로 이동합니다.', { exact: true }).count(), 0, `${groupName}에 공통 안내 문구가 남아 있습니다`);
      if (slug === 'report') {
        // 전체 보고서 카드가 없으므로 드롭다운을 열어 목록을 확인합니다
        await page.getByText('만들 보고서를 선택하십시오', { exact: true }).click();
        for (const item of items) await page.getByText(item, { exact: true }).last().waitFor();
        await page.keyboard.press('Escape');
        // 드롭다운 바깥 덮개가 Escape 로 닫히지 않으면 다음 그룹 링크 클릭을 가로챕니다 — 바깥을 눌러 닫습니다
        const backdrop = page.locator('div[tabindex="0"].r-cursor-1loqt21:empty').last();
        if (await backdrop.isVisible().catch(() => false)) await backdrop.click({ position: { x: 5, y: 5 } });
        await page.getByText('자주 쓰는 보고서', { exact: true }).waitFor();
        assert.equal(await page.getByText('전체 보고서', { exact: true }).count(), 0, '전체 보고서 카드가 남아 있습니다');
      } else {
        for (const item of items) await page.getByText(item, { exact: true }).last().waitFor();
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, groups: groups.length, countsKept: true }));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
