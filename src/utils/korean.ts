/** 마지막 글자에 받침이 있는지. 한글이 아니면 null */
function hasFinalConsonant(word: string): boolean | null {
  const last = word.charCodeAt(word.length - 1)
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return null
  return (last - 0xac00) % 28 !== 0
}

/** 낱말 뒤에 붙는 조사 '을/를'을 받침에 맞게 고릅니다. 마지막 글자가 한글이 아니면 '을(를)'을 씁니다. */
export function objectParticle(word: string): string {
  const final = hasFinalConsonant(word)
  return final === null ? '을(를)' : final ? '을' : '를'
}

/** 조사 '이/가' */
export function subjectParticle(word: string): string {
  const final = hasFinalConsonant(word)
  return final === null ? '이(가)' : final ? '이' : '가'
}
