/** 낱말 뒤에 붙는 조사 '을/를'을 받침에 맞게 고릅니다. 마지막 글자가 한글이 아니면 '을(를)'을 씁니다. */
export function objectParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1)
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return '을(를)'
  return (last - 0xac00) % 28 === 0 ? '를' : '을'
}
