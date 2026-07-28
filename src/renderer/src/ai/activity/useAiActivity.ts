import { useCallback, useMemo, useRef, useState } from 'react'
import type { AiActivityTracker } from './tracker'

interface PageTouch {
  pageId: string
  pending: number
}

const FLASH_MS = 800

export function useAiActivity() {
  const [activePageIds, setActivePageIds] = useState<ReadonlySet<string>>(() => new Set())
  const [flashPageIds, setFlashPageIds] = useState<ReadonlySet<string>>(() => new Set())
  const touchesRef = useRef<PageTouch[]>([])
  const mutatedRef = useRef(new Set<string>())

  const begin = useCallback((pageId: string) => {
    const kept = touchesRef.current.filter((t) => t.pending > 0 || t.pageId === pageId)
    const entry = kept.find((t) => t.pageId === pageId)
    if (entry) entry.pending += 1
    else kept.push({ pageId, pending: 1 })
    touchesRef.current = kept
    setActivePageIds(new Set(kept.map((t) => t.pageId)))
  }, [])

  const end = useCallback((pageId: string) => {
    const entry = touchesRef.current.find((t) => t.pageId === pageId)
    if (entry && entry.pending > 0) entry.pending -= 1
  }, [])

  const tracker: AiActivityTracker = useMemo(
    () => ({
      run: async (pageId, task, mutates) => {
        begin(pageId)
        try {
          const result = await task()
          if (mutates) mutatedRef.current.add(pageId)
          return result
        } finally {
          end(pageId)
        }
      },
      touch: (pageId) => {
        begin(pageId)
        end(pageId)
        mutatedRef.current.add(pageId)
      }
    }),
    [begin, end]
  )

  const clear = useCallback(() => {
    const flash = mutatedRef.current
    mutatedRef.current = new Set()
    if (touchesRef.current.length > 0) {
      touchesRef.current = []
      setActivePageIds(new Set())
    }
    if (flash.size === 0) return
    setFlashPageIds(flash)
    setTimeout(() => setFlashPageIds(new Set()), FLASH_MS)
  }, [])

  const view = useMemo(
    () => ({ active: activePageIds, flash: flashPageIds }),
    [activePageIds, flashPageIds]
  )

  return { view, tracker, clear }
}
