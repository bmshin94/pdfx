import type { OcrWord } from '../ocr/types'
import type { PageSegment } from './page-segments'

const LINE_MERGE_FACTOR = 0.6
const BLOCK_PITCH_FACTOR = 1.8
const FONT_SIZE_FACTOR = 0.8
const BASELINE_DESCENT = 0.22
const COVER_PAD_Y_FACTOR = 0.14
const COVER_PAD_X_PTS = 2
const MIN_FONT_SIZE = 4

const centerY = (word: OcrWord): number => word.y + word.h / 2

function clusterWords(words: OcrWord[]): OcrWord[][] {
  const sorted = [...words]
    .filter((w) => w.text.trim().length > 0)
    .sort((a, b) => centerY(a) - centerY(b))
  const lines: OcrWord[][] = []
  for (const word of sorted) {
    const line = lines[lines.length - 1]
    const anchor = line?.[line.length - 1]
    const sameLine =
      anchor &&
      Math.abs(centerY(word) - centerY(anchor)) <= LINE_MERGE_FACTOR * Math.min(word.h, anchor.h)
    if (sameLine) line.push(word)
    else lines.push([word])
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x)
  return lines
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export function scanSegments(
  words: OcrWord[],
  pageWidth: number,
  pageHeight: number
): PageSegment[] {
  const lines = clusterWords(words)
  const segments: PageSegment[] = []
  for (const line of lines) {
    const text = line
      .map((w) => w.text.trim())
      .join(' ')
      .trim()
    if (text.length === 0) continue
    const x1 = Math.min(...line.map((w) => w.x))
    const x2 = Math.max(...line.map((w) => w.x + w.w))
    const y1 = Math.min(...line.map((w) => w.y))
    const y2 = Math.max(...line.map((w) => w.y + w.h))
    const fontSize = (y2 - y1) * pageHeight * FONT_SIZE_FACTOR
    if (fontSize < MIN_FONT_SIZE) continue
    const padX = COVER_PAD_X_PTS / pageWidth
    const padY = (y2 - y1) * COVER_PAD_Y_FACTOR
    segments.push({
      family: 'sans',
      bold: false,
      italic: false,
      condensed: false,
      index: segments.length,
      line: segments.length,
      block: 0,
      text,
      rect: {
        x: clamp01(x1 - padX),
        y: clamp01(y1 - padY),
        w: clamp01(x2 + padX) - clamp01(x1 - padX),
        h: clamp01(y2 + padY) - clamp01(y1 - padY)
      },
      fontSize,
      widthPts: (x2 - x1) * pageWidth,
      baselineX: x1,
      baselineY: y2 - (BASELINE_DESCENT * fontSize) / pageHeight
    })
  }
  let block = 0
  for (let i = 1; i < segments.length; i++) {
    const gapPts = (segments[i].baselineY - segments[i - 1].baselineY) * pageHeight
    if (gapPts > BLOCK_PITCH_FACTOR * Math.min(segments[i].fontSize, segments[i - 1].fontSize)) {
      block++
    }
    segments[i].block = block
  }
  return segments
}
