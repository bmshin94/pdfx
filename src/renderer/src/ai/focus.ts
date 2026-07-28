import type { DocEntry } from '../types'
import type { PageRef } from '../app/types'

export type AiFocusKind = 'viewing' | 'selected' | 'single'

export interface AiFocus {
  kind: AiFocusKind
  docId: string
  docName: string
  pageId: string | null
  pageNumber: number | null
}

interface PageHit {
  doc: DocEntry
  pageNumber: number
}

const findByPageId = (docs: DocEntry[], pageId: string): PageHit | null => {
  for (const doc of docs) {
    const index = doc.pages.findIndex((p) => p.id === pageId)
    if (index !== -1) return { doc, pageNumber: index + 1 }
  }
  return null
}

const pageFocus = (kind: AiFocusKind, hit: PageHit, pageId: string): AiFocus => ({
  kind,
  docId: hit.doc.id,
  docName: hit.doc.name,
  pageId,
  pageNumber: hit.pageNumber
})

export function computeAiFocus(
  docs: DocEntry[],
  selected: PageRef | null,
  viewingPageId: string | null
): AiFocus | null {
  if (viewingPageId) {
    const hit = findByPageId(docs, viewingPageId)
    if (hit) return pageFocus('viewing', hit, viewingPageId)
  }
  if (selected) {
    const hit = findByPageId(docs, selected.pageId)
    if (hit) return pageFocus('selected', hit, selected.pageId)
  }
  if (docs.length === 1) {
    return {
      kind: 'single',
      docId: docs[0].id,
      docName: docs[0].name,
      pageId: null,
      pageNumber: null
    }
  }
  return null
}
