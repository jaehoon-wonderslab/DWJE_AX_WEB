const { suite, test, eq } = require('../lib/runner');
const smallTalkReply = require('../../src/domains/ai/model/smallTalk.cjs');

suite('AI 일반 대화 인사 응답', () => {
  test('단독 인사와 감사에는 짧은 로컬 답변을 준다', async () => {
    eq(smallTalkReply('안녕'), '안녕하세요! 무엇을 도와드릴까요?');
    eq(smallTalkReply('안녕하세요!'), '안녕하세요! 무엇을 도와드릴까요?');
    eq(smallTalkReply('감사합니다.'), '천만에요! 더 궁금한 점이 있으면 말씀해 주세요.');
  });

  test('업무 질문이나 인사 뒤에 사실 질문이 붙으면 가로채지 않는다', async () => {
    eq(smallTalkReply('안녕하세요, 오늘 생산량 알려줘'), null);
    eq(smallTalkReply('고마워요. 불량률은 얼마야?'), null);
    eq(smallTalkReply('수율 추이는 어때?'), null);
  });
});
