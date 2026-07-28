import type { MarkRect } from '../edit/types'
import type { PageEntry } from '../types'
import {
  clusterLines,
  extractPageFragments,
  GLYPH_ASCENT,
  GLYPH_DESCENT,
  WORD_SPACE_FACTOR
} from './page-fragments'
import type { PageFragment } from './page-fragments'

export interface LocatedText {
  rects: MarkRect[]
  matches: number
}

interface CharRef {
  fragment: PageFragment
  index: number
}

interface Haystack {
  chars: string
  refs: (CharRef | null)[]
}

const fold = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()

function buildHaystack(lines: PageFragment[][]): Haystack {
  let chars = ''
  const refs: (CharRef | null)[] = []
  const separator = (): void => {
    if (chars.length > 0 && chars[chars.length - 1] !== ' ') {
      chars += ' '
      refs.push(null)
    }
  }
  for (const line of lines) {
    const ordered = [...line].sort((a, b) => a.x1 - b.x1)
    let previous: PageFragment | null = null
    for (const fragment of ordered) {
      const gap = previous ? fragment.x1 - previous.x2 : Infinity
      if (gap > WORD_SPACE_FACTOR * Math.max(fragment.fontSize, previous?.fontSize ?? 0)) {
        separator()
      }
      for (let i = 0; i < fragment.text.length; i++) {
        const folded = fold(fragment.text[i])
        if (folded.trim().length === 0) {
          separator()
          continue
        }
        for (const c of folded) {
          chars += c
          refs.push({ fragment, index: i })
        }
      }
      previous = fragment
    }
  }
  return { chars, refs }
}

const EDGE_BLEED_CHARS = 0.1
const ROW_EPSILON = 0.004

function sliceRect(
  fragment: PageFragment,
  from: number,
  to: number,
  width: number,
  height: number
): MarkRect {
  const length = Math.max(fragment.text.length, 1)
  const perChar = (fragment.x2 - fragment.x1) / length
  const x1 = Math.max(fragment.x1, fragment.x1 + perChar * (from - EDGE_BLEED_CHARS))
  const x2 = Math.min(fragment.x2, fragment.x1 + perChar * (to + 1 + EDGE_BLEED_CHARS))
  const top = fragment.baselineY - GLYPH_ASCENT * fragment.fontSize
  const bottom = fragment.baselineY + GLYPH_DESCENT * fragment.fontSize
  const clamp = (v: number): number => Math.min(1, Math.max(0, v))
  return {
    x: clamp(x1 / width),
    y: clamp(top / height),
    w: clamp(x2 / width) - clamp(x1 / width),
    h: clamp(bottom / height) - clamp(top / height)
  }
}

function mergeRows(rects: MarkRect[]): MarkRect[] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const merged: MarkRect[] = []
  for (const rect of sorted) {
    const last = merged[merged.length - 1]
    if (
      last &&
      Math.abs(last.y - rect.y) < ROW_EPSILON &&
      Math.abs(last.h - rect.h) < ROW_EPSILON
    ) {
      const right = Math.max(last.x + last.w, rect.x + rect.w)
      last.x = Math.min(last.x, rect.x)
      last.w = right - last.x
    } else {
      merged.push({ ...rect })
    }
  }
  return merged
}

export async function locateText(entry: PageEntry, query: string): Promise<LocatedText> {
  const needle = fold(query).replace(/\s+/g, ' ').trim()
  if (needle.length === 0) return { rects: [], matches: 0 }
  const { fragments, width, height } = await extractPageFragments(entry)
  const { chars, refs } = buildHaystack(clusterLines(fragments))
  const rects: MarkRect[] = []
  let matches = 0
  for (let at = chars.indexOf(needle); at !== -1; at = chars.indexOf(needle, at + 1)) {
    matches++
    const matchRects: MarkRect[] = []
    let start: CharRef | null = null
    let end: CharRef | null = null
    const flush = (): void => {
      if (start && end)
        matchRects.push(sliceRect(start.fragment, start.index, end.index, width, height))
      start = end = null
    }
    for (let i = at; i < at + needle.length; i++) {
      const ref = refs[i]
      if (!ref) continue
      if (start && ref.fragment === start.fragment) {
        end = ref
      } else {
        flush()
        start = end = ref
      }
    }
    flush()
    rects.push(...mergeRows(matchRects))
  }
  return { rects, matches }
}
