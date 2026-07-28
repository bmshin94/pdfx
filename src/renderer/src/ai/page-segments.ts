import type { MarkRect } from '../edit/types'
import type { PageEntry } from '../types'
import {
  clusterLines,
  extractPageFragments,
  GLYPH_ASCENT,
  GLYPH_DESCENT,
  LINE_MERGE_FACTOR
} from './page-fragments'
import type { PageFragment, SegmentStyle } from './page-fragments'

export type { FontFamily, SegmentStyle } from './page-fragments'

export interface PageSegment extends SegmentStyle {
  index: number
  line: number
  block: number
  text: string
  rect: MarkRect
  fontSize: number
  widthPts: number
  baselineX: number
  baselineY: number
}

const RECT_PAD_PX = 1
const WORD_GAP_FACTOR = 0.36
const BLOCK_PITCH_FACTOR = 1.8

const sameStyle = (a: PageFragment, b: PageFragment): boolean =>
  a.family === b.family &&
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.condensed === b.condensed &&
  Math.abs(a.fontSize - b.fontSize) < 0.25

function toSegment(
  parts: PageFragment[],
  index: number,
  line: number,
  block: number,
  vw: number,
  vh: number
): PageSegment {
  const fontSize = Math.max(...parts.map((f) => f.fontSize))
  const baselineY = parts.reduce((sum, f) => sum + f.baselineY, 0) / parts.length
  let text = parts[0].text
  for (let i = 1; i < parts.length; i++) {
    const gap = parts[i].x1 - parts[i - 1].x2
    text += (gap > 0.13 * fontSize ? ' ' : '') + parts[i].text
  }
  const x1 = parts[0].x1 - RECT_PAD_PX
  const x2 = parts[parts.length - 1].x2 + RECT_PAD_PX
  const top = baselineY - GLYPH_ASCENT * fontSize - RECT_PAD_PX
  const bottom = baselineY + GLYPH_DESCENT * fontSize + RECT_PAD_PX
  const clamp = (v: number): number => Math.min(1, Math.max(0, v))
  return {
    family: parts[0].family,
    bold: parts[0].bold,
    italic: parts[0].italic,
    condensed: parts[0].condensed,
    index,
    line,
    block,
    text: text.trim(),
    rect: {
      x: clamp(x1 / vw),
      y: clamp(top / vh),
      w: clamp(x2 / vw) - clamp(x1 / vw),
      h: clamp(bottom / vh) - clamp(top / vh)
    },
    fontSize,
    widthPts: x2 - x1 - RECT_PAD_PX * 2,
    baselineX: clamp(parts[0].x1 / vw),
    baselineY: clamp(baselineY / vh)
  }
}

export async function extractPageSegments(entry: PageEntry): Promise<PageSegment[]> {
  const { fragments, width, height } = await extractPageFragments(entry)
  const lines = clusterLines(fragments)

  const lineBaseline = lines.map(
    (line) => line.reduce((sum, f) => sum + f.baselineY, 0) / line.length
  )
  const lineSize = lines.map((line) => Math.max(...line.map((f) => f.fontSize)))
  const blockOf: number[] = []
  let blockId = 0
  for (let i = 0; i < lines.length; i++) {
    if (
      i > 0 &&
      lineBaseline[i] - lineBaseline[i - 1] >
        BLOCK_PITCH_FACTOR * Math.min(lineSize[i], lineSize[i - 1])
    ) {
      blockId++
    }
    blockOf.push(blockId)
  }

  const segments: PageSegment[] = []
  for (const [lineIndex, line] of lines.entries()) {
    line.sort((a, b) => a.x1 - b.x1)
    let current: PageFragment[] = []
    const flush = (): void => {
      if (current.length === 0) return
      segments.push(
        toSegment(current, segments.length, lineIndex, blockOf[lineIndex], width, height)
      )
      current = []
    }
    for (const fragment of line) {
      const anchor = current[current.length - 1]
      const gap = anchor ? fragment.x1 - anchor.x2 : 0
      const joinable =
        anchor &&
        sameStyle(fragment, anchor) &&
        gap <= WORD_GAP_FACTOR * anchor.fontSize &&
        gap >= -LINE_MERGE_FACTOR * anchor.fontSize
      if (joinable) {
        current.push(fragment)
      } else {
        flush()
        current = [fragment]
      }
    }
    flush()
  }
  return segments.filter((s) => s.text.length > 0)
}
