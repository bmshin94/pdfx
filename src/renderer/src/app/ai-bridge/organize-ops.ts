import type { DocBridge } from '../../ai/doc-bridge'
import { blankPageBytes } from '../../pdfx/blank-page'
import { loadSource, pagesFromSource } from '../../pdfx/source'
import type { BridgeCtx } from './ctx'

const FALLBACK_PAGE_WIDTH = 612
const FALLBACK_PAGE_HEIGHT = 792

type OrganizeOps = Pick<DocBridge, 'movePage' | 'insertPage' | 'deletePage' | 'renameDocument'>

export const buildOrganizeOps = (ctx: BridgeCtx): OrganizeOps => ({
  movePage: (pageId, targetDocId, position) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      const target = ctx.docs().find((d) => d.id === targetDocId)
      if (!found || !target) return false
      ctx.collection.movePageInto({ docId: found.doc.id, pageId }, targetDocId, position - 1)
      return true
    }),

  insertPage: (docId, position) =>
    ctx.mutate(async () => {
      const doc = ctx.docs().find((d) => d.id === docId)
      if (!doc) return null
      const reference = doc.pages[0]
      const width = reference?.width ?? FALLBACK_PAGE_WIDTH
      const height = reference?.height ?? FALLBACK_PAGE_HEIGHT
      const { source, sizes } = await loadSource(await blankPageBytes(width, height))
      const entries = pagesFromSource(source, sizes, [0])
      ctx.collection.insertPagesIntoDoc(docId, position - 1, entries)
      return entries[0]?.id ?? null
    }),

  deletePage: (pageId) =>
    ctx.mutate(async () => {
      const found = ctx.findPage(pageId)
      if (!found) return false
      ctx.collection.deletePage({ docId: found.doc.id, pageId })
      return true
    }),

  renameDocument: (docId, name) => {
    if (!ctx.docs().some((d) => d.id === docId) || name.trim().length === 0) return false
    ctx.collection.renameDoc(docId, name.trim())
    return true
  }
})
