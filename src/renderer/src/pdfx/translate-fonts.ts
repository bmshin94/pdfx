import { StandardFonts } from 'pdf-lib'
import type { PDFDocument, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { SegmentStyle } from '../ai/page-segments'

const ASSET_BASE = import.meta.env.VITE_PDFX_WEB
  ? new URL('/pdf/', location.href).href
  : 'pdfx-assets://pdf/'

const STANDARD: Record<string, StandardFonts> = {
  sans: StandardFonts.Helvetica,
  'sans-bold': StandardFonts.HelveticaBold,
  'sans-italic': StandardFonts.HelveticaOblique,
  'sans-bold-italic': StandardFonts.HelveticaBoldOblique,
  serif: StandardFonts.TimesRoman,
  'serif-bold': StandardFonts.TimesRomanBold,
  'serif-italic': StandardFonts.TimesRomanItalic,
  'serif-bold-italic': StandardFonts.TimesRomanBoldItalic,
  mono: StandardFonts.Courier,
  'mono-bold': StandardFonts.CourierBold,
  'mono-italic': StandardFonts.CourierOblique,
  'mono-bold-italic': StandardFonts.CourierBoldOblique
}

function unicodeFile(style: SegmentStyle): string {
  if (style.family === 'mono') return 'DejaVuSansMono.ttf'
  if (style.family === 'serif') return style.bold ? 'DejaVuSerif-Bold.ttf' : 'DejaVuSerif.ttf'
  if (style.condensed) {
    return style.bold ? 'DejaVuSansCondensed-Bold.ttf' : 'DejaVuSansCondensed.ttf'
  }
  if (style.bold) return 'DejaVuSans-Bold.ttf'
  if (style.italic) return 'DejaVuSans-Oblique.ttf'
  return 'DejaVuSans.ttf'
}

const styleKey = (style: SegmentStyle): string =>
  style.family + (style.bold ? '-bold' : '') + (style.italic ? '-italic' : '')

const fileBytes = new Map<string, Promise<ArrayBuffer>>()

const loadFileBytes = (file: string): Promise<ArrayBuffer> => {
  let bytes = fileBytes.get(file)
  if (!bytes) {
    bytes = fetch(ASSET_BASE + file).then((response) => {
      if (!response.ok) throw new Error(`Font fetch failed: ${file} (${response.status})`)
      return response.arrayBuffer()
    })
    fileBytes.set(file, bytes)
  }
  return bytes
}

export const fontCovers = (font: PDFFont, text: string): boolean => {
  const charset = new Set(font.getCharacterSet())
  for (const ch of text) {
    if (ch !== '\n' && !charset.has(ch.codePointAt(0) as number)) return false
  }
  return true
}

export interface PickedFont {
  font: PDFFont
  capHeightEm: number | null
}

export interface FontPicker {
  pick(style: SegmentStyle, text: string): Promise<PickedFont>
}

function measuredCapHeightEm(bytes: ArrayBuffer): number | null {
  try {
    const parsed = fontkit.create(new Uint8Array(bytes) as Buffer)
    const glyph = parsed.layout('H').glyphs[0]
    if (!glyph) return null
    return glyph.bbox.maxY / parsed.unitsPerEm
  } catch {
    return null
  }
}

function standardCapHeightEm(font: PDFFont): number | null {
  const embedded = font as unknown as { embedder?: { font?: { CapHeight?: number } } }
  const capHeight = embedded.embedder?.font?.CapHeight
  return typeof capHeight === 'number' ? capHeight / 1000 : null
}

export function createFontPicker(doc: PDFDocument): FontPicker {
  const standard = new Map<string, PickedFont>()
  const unicode = new Map<string, PickedFont>()
  let fontkitRegistered = false

  const standardFor = async (key: string): Promise<PickedFont> => {
    let picked = standard.get(key)
    if (!picked) {
      const font = await doc.embedFont(STANDARD[key] ?? StandardFonts.Helvetica)
      picked = { font, capHeightEm: standardCapHeightEm(font) }
      standard.set(key, picked)
    }
    return picked
  }

  const unicodeFor = async (style: SegmentStyle): Promise<PickedFont> => {
    const file = unicodeFile(style)
    let picked = unicode.get(file)
    if (!picked) {
      if (!fontkitRegistered) {
        doc.registerFontkit(fontkit)
        fontkitRegistered = true
      }
      const bytes = await loadFileBytes(file)
      const font = await doc.embedFont(bytes, { subset: true })
      picked = { font, capHeightEm: measuredCapHeightEm(bytes) }
      unicode.set(file, picked)
    }
    return picked
  }

  return {
    async pick(style, text) {
      const base = await standardFor(styleKey(style))
      return fontCovers(base.font, text) && !style.condensed ? base : unicodeFor(style)
    }
  }
}
