import type { Collection } from '../useCollection'
import type { ElementState } from '../useElements'
import type { FormState } from '../useFormValues'
import type { MarkState } from '../useMarks'
import type { OcrAccess } from './ocr'
import type { DocEntry, PageEntry } from '../../types'
import type { MutationQueue } from './queue'

export interface PageHit {
  doc: DocEntry
  page: PageEntry
}

export interface BridgeCtx {
  collection: Collection
  elements: ElementState
  forms: FormState
  marks: MarkState
  ocr: OcrAccess
  docs(): DocEntry[]
  findPage(pageId: string): PageHit | null
  mutate: MutationQueue['mutate']
}

export function createBridgeCtx(
  collection: Collection,
  elements: ElementState,
  forms: FormState,
  marks: MarkState,
  ocr: OcrAccess,
  queue: MutationQueue
): BridgeCtx {
  const docs = (): DocEntry[] => collection.docsRef.current
  return {
    collection,
    elements,
    forms,
    marks,
    ocr,
    docs,
    findPage: (pageId) => {
      for (const doc of docs()) {
        const page = doc.pages.find((p) => p.id === pageId)
        if (page) return { doc, page }
      }
      return null
    },
    mutate: queue.mutate
  }
}
