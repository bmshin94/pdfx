import { useMemo, useRef, useState } from 'react'
import type { Collection } from '../useCollection'
import type { ElementState } from '../useElements'
import type { FormState } from '../useFormValues'
import type { MarkState } from '../useMarks'
import type { DocBridge } from '../../ai/doc-bridge'
import type { AiFocus } from '../../ai/focus'
import { createMutationQueue } from './queue'
import { createBridgeCtx } from './ctx'
import type { OcrAccess } from './ocr'
import { buildReadOps } from './read-ops'
import { buildEditOps } from './edit-ops'
import { buildMarkOps } from './mark-ops'
import { buildOrganizeOps } from './organize-ops'

export function useAiBridge(
  collection: Collection,
  elements: ElementState,
  forms: FormState,
  marks: MarkState,
  ocr: OcrAccess,
  focus: AiFocus | null
): DocBridge {
  const [queue] = useState(createMutationQueue)
  const focusRef = useRef(focus)
  focusRef.current = focus
  return useMemo(() => {
    const ctx = createBridgeCtx(collection, elements, forms, marks, ocr, queue)
    return {
      focus: () => focusRef.current,
      ...buildReadOps(ctx),
      ...buildEditOps(ctx),
      ...buildMarkOps(ctx),
      ...buildOrganizeOps(ctx)
    }
  }, [collection, elements, forms, marks, ocr, queue])
}
