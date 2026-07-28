import type { PDFFont } from 'pdf-lib'

export interface WrapMember {
  envelope: number
  optical: number
  font: PDFFont
  text: string
}

export interface WrappedMember {
  text: string
  size: number
}

const SIZE_STEP = 0.94

function measure(font: PDFFont, text: string, size: number, fallback: number): number {
  try {
    return font.widthOfTextAtSize(text, size)
  } catch {
    return text.length * size * fallback
  }
}

function distribute(
  members: WrapMember[],
  words: string[],
  factor: number,
  fallback: number
): string[] | null {
  const lines: string[] = []
  let index = 0
  for (const [i, member] of members.entries()) {
    const size = member.optical * factor
    let line = ''
    while (index < words.length) {
      const candidate = line.length === 0 ? words[index] : `${line} ${words[index]}`
      if (
        measure(member.font, candidate, size, fallback) > member.envelope &&
        line.length > 0 &&
        i < members.length - 1
      ) {
        break
      }
      if (
        measure(member.font, candidate, size, fallback) > member.envelope &&
        line.length > 0 &&
        i === members.length - 1
      ) {
        return null
      }
      line = candidate
      index++
    }
    lines.push(line)
  }
  return index >= words.length ? lines : null
}

export function rewrapMembers(
  members: WrapMember[],
  minFactor: number,
  fallback: number
): WrappedMember[] {
  const words = members
    .map((m) => m.text)
    .join(' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
  for (let factor = 1; factor >= minFactor; factor *= SIZE_STEP) {
    const lines = distribute(members, words, factor, fallback)
    if (lines) {
      return members.map((m, i) => ({ text: lines[i], size: m.optical * factor }))
    }
  }
  const forced: string[] = members.map(() => '')
  const perLine = Math.ceil(words.length / members.length)
  for (const [i] of members.entries()) {
    forced[i] = words.slice(i * perLine, (i + 1) * perLine).join(' ')
  }
  return members.map((m, i) => ({ text: forced[i], size: m.optical * minFactor }))
}
