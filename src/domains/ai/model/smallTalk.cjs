const replies = new Map([
  ['안녕', '안녕하세요! 무엇을 도와드릴까요?'],
  ['안녕하세요', '안녕하세요! 무엇을 도와드릴까요?'],
  ['안녕하십니까', '안녕하세요! 무엇을 도와드릴까요?'],
  ['반가워요', '저도 반가워요! 무엇을 도와드릴까요?'],
  ['고마워', '천만에요! 더 궁금한 점이 있으면 말씀해 주세요.'],
  ['고마워요', '천만에요! 더 궁금한 점이 있으면 말씀해 주세요.'],
  ['감사합니다', '천만에요! 더 궁금한 점이 있으면 말씀해 주세요.'],
  ['고맙습니다', '천만에요! 더 궁금한 점이 있으면 말씀해 주세요.'],
]);

/** 사실 확인이 필요 없는 단독 인사·감사에만 답합니다. */
function smallTalkReply(input) {
  const phrase = String(input ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(/[.!?,~…。？！]+$/u, '')
    .replace(/\s+/gu, ' ');
  return replies.get(phrase) || null;
}

module.exports = smallTalkReply;
