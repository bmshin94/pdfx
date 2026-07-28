import type { DocBridge } from '../../ai/doc-bridge'
import { extractPageSegments } from '../../ai/page-segments'
import { scanSegments } from '../../ai/scan-segments'
import { MIN_CONDENSE } from '../../pdfx/translate-fit'
import { getFormFields } from '../../forms/extract'
import { awaitOcrWords } from './ocr'
import type { BridgeCtx } from './ctx'

type ReadOps = Pick<DocBridge, 'listDocuments' | 'readPage' | 'listFormFields'>

const toSegmentInfo = (segment: { index: number; text: string }) => ({
  segment: segment.index,
  text: segment.text,
  budget: Math.ceil(segment.text.length / MIN_CONDENSE)
})

export const buildReadOps = (ctx: BridgeCtx): ReadOps => ({
  listDocuments: () =>
    ctx.docs().map((doc) => ({
      docId: doc.id,
      name: doc.name,
      pages: doc.pages.map((page, i) => ({
        pageId: page.id,
        number: i + 1,
        width: page.width,
        height: page.height
      }))
    })),

  readPage: async (pageId) => {
    const found = ctx.findPage(pageId)
    if (!found) return []
    const segments = await extractPageSegments(found.page)
    if (segments.length > 0) return segments.map(toSegmentInfo)
    const words = await awaitOcrWords(ctx.ocr, found.page)
    if (!words || words.length === 0) return []
    return scanSegments(words, found.page.width, found.page.height).map(toSegmentInfo)
  },

  listFormFields: async (pageId) => {
    const found = ctx.findPage(pageId)
    if (!found) return []
    const { page } = found
    const fields = await getFormFields(page.source.pdf, page.pageIndex + 1)
    const values = ctx.forms.valuesRef.current[page.source.id] ?? {}
    return fields.map((f) => ({ name: f.name, kind: f.kind, value: values[f.name] ?? null }))
  }
})
