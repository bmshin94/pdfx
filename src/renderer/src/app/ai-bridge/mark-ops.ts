import type { DocBridge } from '../../ai/doc-bridge'
import { locateText } from '../../ai/locate-text'
import type { BridgeCtx } from './ctx'

type MarkOps = Pick<DocBridge, 'markText' | 'clearMarks'>

export const buildMarkOps = (ctx: BridgeCtx): MarkOps => ({
  markText: (pageId, kind, text) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      if (!found) return 0
      const { rects, matches } = await locateText(found.page, text)
      if (matches > 0) ctx.marks.addMark(pageId, kind, rects)
      return matches
    }),

  clearMarks: (pageId, kind) =>
    ctx.mutate(async () => {
      if (!ctx.findPage(pageId)) return 0
      return ctx.marks.clearMarks(pageId, kind)
    })
})
