import { Util } from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { PageEntry } from '../types'

export type FontFamily = 'sans' | 'serif' | 'mono'

export interface SegmentStyle {
  family: FontFamily
  bold: boolean
  italic: boolean
  condensed: boolean
}

export interface PageFragment extends SegmentStyle {
  text: string
  x1: number
  x2: number
  baselineY: number
  fontSize: number
}

export interface PageGeometry {
  fragments: PageFragment[]
  width: number
  height: number
}

export const GLYPH_ASCENT = 0.9
export const GLYPH_DESCENT = 0.22
export const LINE_MERGE_FACTOR = 0.5
export const WORD_SPACE_FACTOR = 0.13
const MIN_FONT_SIZE = 4

function resolveStyle(page: PDFPageProxy, fontName: string, cssFamily: string): SegmentStyle {
  let name = ''
  try {
    name = (page.commonObjs.get(fontName) as { name?: string })?.name?.toLowerCase() ?? ''
  } catch {
    name = ''
  }
  const family: FontFamily =
    cssFamily === 'serif' ? 'serif' : cssFamily === 'monospace' ? 'mono' : 'sans'
  const bold = /bold|demi|black|heavy|blk|-bd/.test(name)
  const italic = /italic|oblique/.test(name) || name.endsWith('it')
  const condensed = /cond|narrow|cn$|cn-|cnit$/.test(name)
  return { family, bold, italic, condensed }
}

function toFragment(
  item: TextItem,
  style: SegmentStyle,
  viewTransform: number[]
): PageFragment | null {
  if (item.str.trim().length === 0) return null
  const tx = Util.transform(viewTransform, item.transform)
  const fontSize = Math.hypot(tx[2], tx[3])
  if (fontSize < MIN_FONT_SIZE) return null
  const unit = Math.hypot(item.transform[0], item.transform[1]) || 1
  const end = [
    item.transform[4] + (item.width * item.transform[0]) / unit,
    item.transform[5] + (item.width * item.transform[1]) / unit
  ]
  Util.applyTransform(end, viewTransform)
  return {
    ...style,
    text: item.str,
    x1: Math.min(tx[4], end[0]),
    x2: Math.max(tx[4], end[0]),
    baselineY: tx[5],
    fontSize
  }
}

export async function extractPageFragments(entry: PageEntry): Promise<PageGeometry> {
  const page = await entry.source.pdf.getPage(entry.pageIndex + 1)
  const viewport = page.getViewport({ scale: 1 })
  await page.getOperatorList()
  const content = await page.getTextContent({ includeMarkedContent: false })
  const fragments: PageFragment[] = []
  for (const item of content.items) {
    if (!('str' in item)) continue
    const cssFamily = content.styles[item.fontName]?.fontFamily ?? 'sans-serif'
    const fragment = toFragment(
      item,
      resolveStyle(page, item.fontName, cssFamily),
      viewport.transform
    )
    if (fragment) fragments.push(fragment)
  }
  fragments.sort((a, b) => a.baselineY - b.baselineY)
  return { fragments, width: viewport.width, height: viewport.height }
}

export function clusterLines(fragments: PageFragment[]): PageFragment[][] {
  const lines: PageFragment[][] = []
  for (const fragment of fragments) {
    const line = lines[lines.length - 1]
    const anchor = line?.[line.length - 1]
    const sameLine =
      anchor &&
      Math.abs(fragment.baselineY - anchor.baselineY) <=
        LINE_MERGE_FACTOR * Math.min(fragment.fontSize, anchor.fontSize)
    if (sameLine) line.push(fragment)
    else lines.push([fragment])
  }
  return lines
}
