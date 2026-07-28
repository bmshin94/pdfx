import { StandardFonts } from 'pdf-lib'
import type { PDFDocument, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { PageElement, TextElement } from '../../elements/types'

const UNICODE_FONT_URL = import.meta.env.VITE_PDFX_WEB
  ? new URL('/pdf/DejaVuSans.ttf', location.href).href
  : 'pdfx-assets://pdf/DejaVuSans.ttf'

export interface ElementFonts {
  base: PDFFont
  unicode: PDFFont | null
}

let unicodeFontBytes: Promise<ArrayBuffer> | null = null

const loadUnicodeFontBytes = (): Promise<ArrayBuffer> => {
  if (!unicodeFontBytes) {
    unicodeFontBytes = fetch(UNICODE_FONT_URL).then((response) => {
      if (!response.ok) throw new Error(`Unicode font fetch failed: ${response.status}`)
      return response.arrayBuffer()
    })
  }
  return unicodeFontBytes
}

const fontCovers = (font: PDFFont, text: string): boolean => {
  const charset = new Set(font.getCharacterSet())
  for (const ch of text) {
    if (ch !== '\n' && !charset.has(ch.codePointAt(0) as number)) return false
  }
  return true
}

const needsUnicode = (elements: PageElement[] | undefined, base: PDFFont): boolean =>
  !!elements?.some((e) => e.kind === 'text' && !fontCovers(base, e.text))

export async function embedElementFonts(
  doc: PDFDocument,
  elements: PageElement[] | undefined,
  cached: ElementFonts | null
): Promise<ElementFonts> {
  const base = cached?.base ?? (await doc.embedFont(StandardFonts.Helvetica))
  let unicode = cached?.unicode ?? null
  if (!unicode && needsUnicode(elements, base)) {
    doc.registerFontkit(fontkit)
    unicode = await doc.embedFont(await loadUnicodeFontBytes(), { subset: true })
  }
  return { base, unicode }
}

export const fontForElement = (element: TextElement, fonts: ElementFonts): PDFFont =>
  fonts.unicode && !fontCovers(fonts.base, element.text) ? fonts.unicode : fonts.base
