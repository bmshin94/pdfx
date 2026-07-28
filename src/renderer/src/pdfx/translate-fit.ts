import type { PDFFont } from 'pdf-lib'
import type { PageSegment } from '../ai/page-segments'
import type { RemovedGlyphInfo } from './redact/scrub'
import type { Box } from './redact/geometry'
import type { FillColor } from './redact/text-state'
import type { PickedFont } from './translate-fonts'
import { rewrapMembers } from './translate-wrap'

export const MIN_LEGIBLE_RATIO = 0.6
export const MIN_CONDENSE = 0.85
const FALLBACK_GLYPH_WIDTH = 0.55
const DEFAULT_TEXT: FillColor = [0.075, 0.075, 0.086]

export interface FitInput {
  segment: PageSegment
  text: string
  picked: PickedFont
  inkRect: Box
}

export interface FittedSegment {
  segment: PageSegment
  text: string
  font: PDFFont
  size: number
  scale: number
  color: FillColor
}

export function safeWidth(font: PDFFont, text: string, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size)
  } catch {
    return text.length * size * FALLBACK_GLYPH_WIDTH
  }
}

const inRect = (glyph: RemovedGlyphInfo, rect: Box): boolean => {
  const cx = glyph.box.x + glyph.box.w / 2
  const cy = glyph.box.y + glyph.box.h / 2
  return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h
}

interface SegmentInk {
  widthPts: number | null
  capHeightPts: number | null
  color: FillColor
  x1: number | null
  x2: number | null
  y1: number | null
  y2: number | null
}

const EMPTY_INK: SegmentInk = {
  widthPts: null,
  capHeightPts: null,
  color: DEFAULT_TEXT,
  x1: null,
  x2: null,
  y1: null,
  y2: null
}

function segmentInk(glyphs: RemovedGlyphInfo[], rect: Box): SegmentInk {
  const inside = glyphs.filter((g) => inRect(g, rect))
  if (inside.length === 0) return EMPTY_INK
  const x1 = Math.min(...inside.map((g) => g.box.x))
  const x2 = Math.max(...inside.map((g) => g.box.x + g.box.w))
  const y1 = Math.min(...inside.map((g) => g.box.y))
  const y2 = Math.max(...inside.map((g) => g.box.y + g.box.h))
  const caps = inside.map((g) => g.capHeightPts).filter((c): c is number => c !== null)
  const counts = new Map<string, { color: FillColor; count: number }>()
  for (const glyph of inside) {
    const color = glyph.color ?? DEFAULT_TEXT
    const key = color.map((c) => c.toFixed(2)).join(',')
    const entry = counts.get(key)
    if (entry) entry.count++
    else counts.set(key, { color, count: 1 })
  }
  let color = DEFAULT_TEXT
  let best = 0
  for (const entry of counts.values()) {
    if (entry.count > best) {
      color = entry.color
      best = entry.count
    }
  }
  return {
    widthPts: x2 - x1,
    capHeightPts: caps.length > 0 ? Math.max(...caps) : null,
    color,
    x1,
    x2,
    y1,
    y2
  }
}

function opticalSize(input: FitInput, ink: SegmentInk): number {
  const { segment, picked } = input
  if (ink.capHeightPts !== null && picked.capHeightEm !== null && picked.capHeightEm > 0) {
    const ratio = ink.capHeightPts / (picked.capHeightEm * segment.fontSize)
    return segment.fontSize * Math.min(1, Math.max(MIN_LEGIBLE_RATIO, ratio))
  }
  if (segment.widthPts > 0) {
    const substituteWidth = safeWidth(picked.font, segment.text, segment.fontSize)
    if (substituteWidth > 0) {
      const ratio = segment.widthPts / substituteWidth
      return segment.fontSize * Math.min(1, Math.max(MIN_LEGIBLE_RATIO, ratio))
    }
  }
  return segment.fontSize
}

const groupKey = (s: PageSegment): string => String(s.block)

const styleKeyOf = (s: PageSegment): string => `${s.family}|${s.bold}|${s.italic}|${s.condensed}`

export interface FitContext {
  freeSpanRight?: (fromX: number, yLow: number, yHigh: number) => number
  nextReplacedStart?: Map<number, number>
  contentRight?: number
  lineSegmentCount?: Map<number, number>
}

interface Measured {
  input: FitInput
  ink: SegmentInk
  optical: number
  envelope: number | null
  compression: number
  override: { text: string; size: number } | null
}

export function fitSegments(
  inputs: FitInput[],
  glyphs: RemovedGlyphInfo[],
  context: FitContext = {}
): FittedSegment[] {
  const measured: Measured[] = inputs.map((input) => {
    const ink = segmentInk(glyphs, input.inkRect)
    const optical = opticalSize(input, ink)
    let envelope = ink.widthPts ?? (input.segment.widthPts > 0 ? input.segment.widthPts : null)
    const natural = safeWidth(input.picked.font, input.text, optical)
    if (
      envelope !== null &&
      natural > envelope &&
      context.freeSpanRight &&
      ink.x1 !== null &&
      ink.x2 !== null &&
      ink.y1 !== null &&
      ink.y2 !== null
    ) {
      let bound = context.freeSpanRight(ink.x2, ink.y1, ink.y2)
      const next = context.nextReplacedStart?.get(input.segment.index)
      if (next !== undefined) {
        bound = Math.min(bound, next - safeWidth(input.picked.font, ' ', optical))
      }
      if (context.contentRight !== undefined) {
        bound = Math.min(bound, Math.max(context.contentRight, ink.x2))
      }
      envelope = Math.max(envelope, Math.min(bound - ink.x1, natural))
    }
    const compression = envelope !== null && natural > 0 ? Math.min(1, envelope / natural) : 1
    const override: { text: string; size: number } | null = null
    return { input, ink, optical, envelope, compression, override }
  })

  rewrapParagraphBlocks(measured, context)

  const groupFactor = new Map<string, number>()
  for (const m of measured) {
    if (m.override) continue
    const key = groupKey(m.input.segment)
    groupFactor.set(key, Math.min(groupFactor.get(key) ?? 1, m.compression))
  }
  for (const [key, worst] of groupFactor) {
    groupFactor.set(key, Math.min(1, worst / MIN_CONDENSE))
  }

  return measured.map(({ input, ink, optical, envelope, override }) => {
    const factor = groupFactor.get(groupKey(input.segment)) ?? 1
    const size = override
      ? override.size
      : Math.max(input.segment.fontSize * MIN_LEGIBLE_RATIO, optical * factor)
    const text = override ? override.text : input.text
    const scale =
      envelope !== null && text.length > 0
        ? Math.min(1, envelope / safeWidth(input.picked.font, text, size))
        : 1
    return {
      segment: input.segment,
      text,
      font: input.picked.font,
      size,
      scale,
      color: ink.color
    }
  })
}

function rewrapParagraphBlocks(measured: Measured[], context: FitContext): void {
  const counts = context.lineSegmentCount
  if (!counts) return
  const byBlock = new Map<string, Measured[]>()
  for (const m of measured) {
    const key = groupKey(m.input.segment)
    const list = byBlock.get(key) ?? []
    list.push(m)
    byBlock.set(key, list)
  }
  for (const members of byBlock.values()) {
    if (members.length < 2) continue
    if (!members.some((m) => m.compression < MIN_CONDENSE)) continue
    const lines = new Set(members.map((m) => m.input.segment.line))
    if (lines.size !== members.length) continue
    if (members.some((m) => counts.get(m.input.segment.line) !== 1)) continue
    if (new Set(members.map((m) => styleKeyOf(m.input.segment))).size !== 1) continue
    if (members.some((m) => m.envelope === null)) continue
    members.sort((a, b) => a.input.segment.line - b.input.segment.line)
    const minFactor = Math.min(
      1,
      Math.max(...members.map((m) => (MIN_LEGIBLE_RATIO * m.input.segment.fontSize) / m.optical))
    )
    const wrapped = rewrapMembers(
      members.map((m) => ({
        envelope: m.envelope as number,
        optical: m.optical,
        font: m.input.picked.font,
        text: m.input.text
      })),
      minFactor,
      FALLBACK_GLYPH_WIDTH
    )
    for (const [i, m] of members.entries()) {
      m.override = wrapped[i]
      m.compression = 1
    }
  }
}
