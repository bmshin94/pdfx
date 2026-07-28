import type { DocBridge } from '../../ai/doc-bridge'
import { extractPageSegments } from '../../ai/page-segments'
import { scanSegments } from '../../ai/scan-segments'
import { signaturePoints, SIGNATURE_DEFAULT_WIDTH } from '../../ai/signature'
import { getFormFields } from '../../forms/extract'
import { rewritePageSegments } from '../../pdfx/translate'
import type { SegmentReplacement } from '../../pdfx/translate'
import { loadSource } from '../../pdfx/source'
import { awaitOcrWords } from './ocr'
import type { BridgeCtx } from './ctx'

type EditOps = Pick<DocBridge, 'replaceText' | 'addText' | 'sign' | 'fillFormField'>

export const buildEditOps = (ctx: BridgeCtx): EditOps => ({
  replaceText: (pageId, replacements) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      if (!found) return { replaced: 0, unknownSegments: replacements.map((r) => r.segment) }
      const { page } = found
      let all = await extractPageSegments(page)
      let coverOnly = false
      if (all.length === 0) {
        const words = await awaitOcrWords(ctx.ocr, page)
        if (words && words.length > 0) {
          all = scanSegments(words, page.width, page.height)
          coverOnly = true
        }
      }
      const byIndex = new Map(all.map((s) => [s.index, s]))
      const valid: SegmentReplacement[] = []
      const unknownSegments: number[] = []
      for (const r of replacements) {
        const segment = byIndex.get(r.segment)
        if (segment && r.text.trim().length > 0) valid.push({ segment, text: r.text })
        else if (!segment) unknownSegments.push(r.segment)
      }
      if (valid.length === 0) return { replaced: 0, unknownSegments }
      const bytes = await rewritePageSegments(page, valid, all, { coverOnly })
      const { source } = await loadSource(bytes)
      ctx.collection.replacePageSource(pageId, source, 0)
      return { replaced: valid.length, unknownSegments }
    }),

  addText: (pageId, text, x, y, fontSize) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      if (!found) return false
      const items = [{ text, origin: { x, y }, fontSize }]
      return ctx.elements.addTexts(pageId, items, found.page.width, found.page.height).length > 0
    }),

  sign: (pageId, x, y, width = SIGNATURE_DEFAULT_WIDTH) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      if (!found) return false
      const { page } = found
      const points = signaturePoints(x, y, width, page.width, page.height)
      return ctx.elements.addInk(pageId, points, page.width, page.height) !== null
    }),

  fillFormField: (pageId, fieldName, value) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      if (!found) return false
      const { page } = found
      const fields = await getFormFields(page.source.pdf, page.pageIndex + 1)
      if (!fields.some((f) => f.name === fieldName)) return false
      ctx.forms.setFieldValue(page.source.id, fieldName, value)
      return true
    })
})
